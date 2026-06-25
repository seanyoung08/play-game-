# 第六阶段计划：用户登录、多用户存档与供应商出货

## 目标

把游戏从单个本地存档扩展为多用户游戏：

- 用户通过登录进入游戏。
- 每个用户拥有独立店铺存档。
- 供应商拥有独立出货库存。
- 用户只能通过价格曲线图下方的“买进 / 卖出”进行交易。
- 商品库存列表只展示信息，不再提供单独买入。

## 第一版范围

- 本地 SQLite 用户系统。
- 用户名 + 密码注册/登录。
- 每个用户一份 `GameState` 存档。
- 每个用户一份供应商库存，避免不同用户之间互相抢货。
- 买进时检查供应商是否解锁、是否供货、是否有库存、用户现金和货架空间。
- 买进成功后扣供应商库存。
- 营业结束后供应商自动补货。
- 交易记录写入 SQLite，便于后续查看流水。
- `InventoryPanel` 移除买入/卖出按钮。
- `MarketPanel` 成为唯一买卖入口。

## 不做

- 不做公网 JWT / OAuth。
- 不做管理员后台。
- 不做真实多人竞争市场。
- 不做复杂物流、合同履约和到货时间。
- 不把密码明文存储。

## SQLite 表

### users

- `id`
- `username`
- `password_hash`
- `created_at`

### game_save

- `user_id`
- `state_json`
- `updated_at`

### supplier_stock

- `user_id`
- `supplier_id`
- `product_id`
- `stock`
- `updated_at`

### trade_log

- `id`
- `user_id`
- `type`
- `product_id`
- `supplier_id`
- `quantity`
- `unit_price`
- `total`
- `created_at`

## 数据流

```text
LoginScreen
  -> POST /api/login or /api/register
    -> user
      -> GET /api/save?userId=...
        -> GameStore

MarketPanel 买进
  -> buyStock(game, productId, qty, supplierId, supplierStock)
    -> 更新用户库存
    -> 扣供应商库存
    -> PUT /api/save?userId=...
    -> POST /api/trades

MarketPanel 卖出
  -> sellStock(game, productId, qty)
    -> 更新用户库存和现金
    -> PUT /api/save?userId=...
    -> POST /api/trades
```

## 执行步骤

1. 扩展 SQLite API：用户注册、登录、按用户读写存档、供应商库存和交易记录。
2. 扩展前端存储层：带 `userId` 读写 `shop.db`。
3. 增加认证状态：当前用户、登录、注册、退出。
4. 新增登录界面：未登录时只显示登录/注册。
5. 扩展领域类型：供应商库存。
6. 改买入规则：检查并扣除供应商库存。
7. 营业结束后供应商自动补货。
8. `MarketPanel` 显示当前供应商库存，并作为唯一买卖入口。
9. `InventoryPanel` 移除买卖按钮，只展示库存、行情和状态。
10. 增加测试：多用户存档隔离、供应商库存扣减、库存不足失败、入口收敛。
11. 更新 README。
12. 运行 `npm.cmd test -- --run` 和 `npm.cmd run check`。

## 验收标准

- 用户可以注册并登录。
- 不同用户看到不同游戏存档。
- 登录后从 `shop.db` 加载当前用户存档。
- 游戏操作后写入当前用户的 `game_save`。
- 供应商库存不足时不能买进。
- 买进成功后供应商库存减少。
- 每天营业后供应商库存恢复。
- 商品列表没有独立买入/卖出按钮。
- 曲线图下方的买进/卖出可用。
- 测试与构建通过。

## 执行结果

已完成：

- SQLite API 增加 `users`、按用户的 `game_save`、`supplier_stock`、`trade_log`。
- 旧版 `game_save` 会自动迁移为 `game_save_legacy`，再创建新的多用户表。
- 增加用户注册和登录接口。
- 前端增加 `LoginScreen`，未登录时不能进入游戏主界面。
- 前端保存当前登录用户，并按用户读取 `shop.db` 存档。
- `GameState` 增加 `supplierStock`。
- 买进时会检查供应商库存，库存不足会失败。
- 买进成功后会扣除当前供应商对应商品库存。
- 每天营业后供应商自动补货。
- 买进/卖出交易会写入 `trade_log`。
- `InventoryPanel` 已移除独立买入/卖出按钮，只保留库存观察。
- `MarketPanel` 是唯一买进/卖出入口，并显示当前供应商可出货数量。
- README 已更新登录、多用户存档和 SQLite 表说明。

验证通过：

```powershell
npm.cmd test -- --run
npm.cmd run check
```

当前结果：3 个测试文件、44 个测试全部通过，生产构建通过。SQLite API 已验证能创建用户、写入按用户存档。
