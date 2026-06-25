# 第五阶段计划：商品行情与买卖

## 目标

给每个商品增加每日行情涨跌，让进货价格不再固定。玩家可以观察类似股市的线性图，根据价格走势选择买进库存或把已有库存卖出。

## 第一版范围

- 每个商品都有当前行情价格、昨日价格和历史价格。
- 每次营业日推进后，所有商品行情自动更新。
- 增加手动刷新行情能力，用于让左侧行情图实时变化。
- 进货成本使用当前行情价格，再叠加供应商折扣和店员补货折扣。
- 增加库存卖出能力，玩家可以把库存按当前行情回收价卖出。
- 左侧新增商品行情面板，展示选中商品的线性图、当前价格和涨跌幅。

## 不做

- 不接真实股票或商品交易 API。
- 不做 K 线、成交量、盘口、做空、杠杆。
- 不让行情直接改变顾客销售价，第一版只影响采购和库存转卖。
- 不新增图表依赖，使用 SVG 线性图。

## 核心规则

- 初始行情价等于商品基础成本。
- 每次行情更新时，价格按确定性波动公式变化，避免随机测试不稳定。
- 单日涨跌幅控制在约 -8% 到 +8%。
- 行情价格下限为基础成本的 60%，上限为基础成本的 160%。
- 进货价 = 当前行情价 × 数量 × 供应商/员工折扣。
- 卖出价 = 当前行情价 × 85% × 数量，避免无成本套利。

## 数据结构

- `MarketPoint`：记录某天价格。
- `ProductMarketState`：记录商品当前价格、上次价格、历史价格。
- `MarketState`：按商品 ID 保存所有商品行情。
- `GameState.market`：把行情纳入存档。

## 数据流

```text
runBusinessDay / refreshMarket
  -> updateMarket
    -> game.market.products[productId]
      -> MarketPanel 线性图
      -> InventoryPanel 当前进货价 / 卖出价
      -> buyStock / sellStock
```

## 执行步骤

1. 扩展类型和初始状态，给每个商品建立行情数据。
2. 增加行情价格计算、行情推进和卖出库存规则。
3. 让 `stockCost` 使用当前行情价格。
4. 状态层接入 `sellStock`、`refreshMarket`、`selectedMarketProductId`。
5. 新增 `MarketPanel`，用 SVG polyline 展示实时线性图。
6. 更新 `InventoryPanel`，展示行情进货价和卖出按钮。
7. 更新 `App.tsx` 和 CSS，把行情面板放到左侧区域。
8. 增加规则和 store 测试。
9. 更新 README，记录商品行情与买卖玩法。
10. 运行 `npm.cmd test -- --run` 和 `npm.cmd run check`。

## 验收标准

- 营业结束后商品行情会推进，价格历史增加。
- 手动刷新行情会让线性图变化。
- 进货成本随当前行情价格变化。
- 玩家可卖出库存，库存减少、现金增加。
- 库存不足时不能卖出。
- 行情图能展示选中商品的历史走势和涨跌状态。
- 全量测试与构建通过。

## 执行结果

已完成：

- `GameState` 增加 `market`，每个商品保存当前价、昨日价和历史价格。
- 初始状态为所有商品生成行情数据。
- 本地存档迁移会为旧存档补齐行情数据。
- `runBusinessDay` 后会自动推进商品行情。
- 新增 `refreshMarket`，可手动刷新行情。
- `stockCost` 改为使用当前行情价，再叠加供应商和店员折扣。
- 新增 `sellStock`，玩家可按当前行情回收价卖出库存。
- 状态层新增 `selectedMarketProductId`、`selectMarketProduct`、`refreshMarket`、`sellStock`。
- 新增 `MarketPanel`，使用 SVG 折线图展示选中商品的实时行情。
- `InventoryPanel` 增加行情价、买入成本、卖出回收价和买入/卖出按钮。
- README 已记录商品行情与买卖玩法。

验证通过：

```powershell
npm.cmd test -- --run
npm.cmd run check
```

当前结果：3 个测试文件、40 个测试全部通过，生产构建通过。
