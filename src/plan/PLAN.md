# 街角小店 V0.1 模块化执行计划

## 目标

构建一个“温馨治愈为外壳，商业策略为骨架”的单店模拟养成经营游戏。

玩家可以进货、升级设施、雇佣店员、开始一天营业，并通过每日结算看到收入、工资、利润、满意度、声望和顾客留言。第一版目标是形成完整可玩闭环，而不是一次性做复杂多店铺系统。

## 第一版范围

### Building

- React + TypeScript + Vite 单页游戏
- 单店经营循环
- 商品库存与进货
- 每日营业结算
- 设施升级
- 店员雇佣
- 满意度、声望、店铺阶段成长
- 顾客留言反馈
- 本地存档和重置

### Not Building

- 多分店
- 自由摆放家具
- 地图探索
- 复杂剧情任务链
- 多员工排班
- 真实时间挂机收益
- 后端账号系统
- 联机或排行榜

## 模块 1：项目骨架

职责：

- 补齐 Vite + React + TypeScript 基础结构
- 建立应用入口、全局样式、基础布局
- 保持 Java 空入口不参与游戏逻辑

主要文件：

- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `vite.config.ts`
- `tsconfig.json`

验收标准：

- React 应用能正常渲染
- `npm.cmd run check` 可执行
- 页面首屏就是游戏主界面

## 模块 2：领域模型

职责：

- 定义游戏核心概念
- 不处理 UI
- 不读写浏览器存储
- 集中表达“游戏有什么”

主要文件：

- `src/game/types.ts`
- `src/game/initialState.ts`
- `src/game/catalog.ts`
- `src/game/balance.ts`

核心模型：

- `GameState`
- `Product`
- `Inventory`
- `Upgrade`
- `Employee`
- `DailyReport`
- `ShopStage`
- `ActionResult`

验收标准：

- 初始游戏状态完整
- 商品、升级、店铺阶段数据集中定义
- UI 不需要自己拼业务常量

## 模块 3：经营规则引擎

职责：

- 处理所有经营计算
- 保证规则可测试
- React 只调用规则，不直接改复杂数值

主要文件：

- `src/game/rules.ts`

核心行为：

- `buyStock`
- `buyUpgrade`
- `hireEmployee`
- `runBusinessDay`
- `resetReport`

验收标准：

- 输入旧状态和玩家操作，输出新状态
- 现金不足时操作失败
- 库存不足会影响收入和满意度
- 员工提高服务效率但增加工资成本
- 装饰提升舒适度相关收益
- 满足条件后店铺阶段升级

## 模块 4：存档模块

职责：

- 保存和恢复游戏状态
- 隔离 `localStorage`
- 提供重置游戏能力

主要文件：

- `src/game/storage.ts`

验收标准：

- 刷新页面后恢复游戏
- 无存档时使用初始状态
- 存档损坏时回退到初始状态
- 可以清除存档并重新开始

## 模块 5：应用状态层

职责：

- 连接 React UI 和游戏规则
- 暴露用户动作
- 管理当前游戏状态和操作反馈

主要文件：

- `src/game/useGameStore.ts`

动作：

- 进货
- 升级设施
- 雇佣员工
- 营业一天
- 关闭每日结算
- 重置游戏

验收标准：

- UI 不直接调用 `localStorage`
- UI 不直接写复杂业务计算
- 所有玩家操作都从状态层进入规则引擎

## 模块 6：主界面布局

职责：

- 呈现完整游戏体验
- 让玩家一眼看到店铺状态和下一步可做什么

主要文件：

- `src/components/StatusBar.tsx`
- `src/components/ShopOverview.tsx`
- `src/components/InventoryPanel.tsx`
- `src/components/UpgradePanel.tsx`
- `src/components/EmployeePanel.tsx`
- `src/components/ReportPanel.tsx`

界面区块：

- 顶部状态栏：现金、天数、声望、满意度、店铺阶段
- 店铺概览：当前氛围、库存摘要、今日经营建议
- 商品进货区：面包、饮料、日用品
- 升级区：货架、收银台、装饰
- 员工区：雇佣店员、显示工资和效果
- 营业区：开始一天营业
- 每日结算：收入、成本、利润、满意度变化、留言

验收标准：

- 玩家不用看说明也能完成第一天经营
- 每个按钮都有明确反馈
- 不可执行操作显示禁用状态或原因
- 每日结算能解释收益变化

## 模块 7：视觉与体验风格

职责：

- 做出温馨治愈的小店外壳
- 避免像普通后台表格
- 保持经营信息清晰

主要文件：

- `src/styles.css`

设计方向：

- 暖色街角账本
- 手账式温暖界面
- 信息密度足够支撑经营决策
- 使用 CSS variables 管理颜色、间距、字体和圆角
- 使用 lucide 图标增强按钮和面板识别

验收标准：

- 首屏就是游戏，不是介绍页
- 经营数据清楚
- 没有文字重叠
- 手机和桌面都能操作

## 模块 8：测试

职责：

- 保护核心经营规则
- 防止后续调数值时破坏闭环

主要文件：

- `src/game/rules.test.ts`
- `src/game/storage.test.ts`

测试路径：

- 有库存时营业产生收入并减少库存
- 库存不足时满意度下降
- 现金不足不能进货
- 升级会扣现金并提升对应能力
- 员工增加效率并产生工资成本
- 店铺满足条件后升级阶段
- 存档恢复正常
- 存档损坏时回退初始状态

验收标准：

- `npm.cmd test -- --run` 通过
- `npm.cmd run check` 通过

## 模块依赖图

```text
UI Components
  -> useGameStore
    -> rules engine
      -> types / catalog / balance

useGameStore
  -> storage

storage
  -> types / initialState

tests
  -> rules engine
  -> storage
```

## 当前验证结果

```text
npm.cmd test -- --run
Test Files  2 passed
Tests       10 passed

npm.cmd run check
tsc && vite build -> passed
```

## 下一阶段建议

1. 增加随机事件：雨天、节日、熟客推荐、供应商打折。
2. 增加顾客类型：学生、上班族、老人、夜归人，不同顾客偏好不同商品。
3. 增加商品解锁：牛奶、便当、文具、鲜花等。
4. 增加员工成长：服务、补货、亲和力三个方向。
5. 增加装修主题：木质、绿植、暖灯、节日布置。

## V0.2 更新：营业自动化

目标：

- 玩家可以开启自动营业，让小店按固定节奏连续推进营业日。
- 玩家可以随时暂停自动营业。
- 重置游戏时自动营业会停止，避免新存档立即继续推进。

实现内容：

- `src/App.tsx` 使用 `useEffect` 挂载自动营业定时器。
- `src/game/useGameStore.ts` 增加 `isAutoRunning` 和 `toggleAutoRun`。
- `src/styles.css` 增加自动营业按钮样式。
- `src/game/useGameStore.test.ts` 覆盖自动营业开关和重置停止自动营业。
- `src/game/storage.ts` 兼容无 `localStorage` 的测试环境。

验收标准：

- 点击“自动营业”后，系统每 2.4 秒自动完成一天营业。
- 点击“暂停自动”后停止自动推进。
- 自动营业不弹出每日结算弹窗，只在顶部提示最近一天的利润和满意度变化。
- 手动点击“开始营业”仍弹出每日结算。
- `npm.cmd test -- --run` 通过。
- `npm.cmd run check` 通过。

## V0.3 更新：动态界面

目标：

- 让店铺界面从静态面板变成有营业状态反馈的动态橱窗。
- 自动营业时能看到店铺“正在运转”的视觉变化。
- 动态效果不影响经营数据读取，也不引入新的动画依赖。

实现内容：

- `src/App.tsx` 在自动营业时为应用根节点增加 `shop-live` 状态类。
- `src/components/ShopOverview.tsx` 增加动态橱窗元素：OPEN/READY 招牌、门铃、顾客、热气、收银灯和带库存数字的货架。
- `src/styles.css` 增加 CSS 动画：营业光效、按钮脉冲、招牌摆动、门铃晃动、顾客经过、热气上升、货架状态变化。
- 保留 `prefers-reduced-motion` 降级处理，减少动态效果对敏感用户的影响。

验收标准：

- 自动营业时橱窗进入动态状态。
- 非自动营业时界面保持安静的准备状态。
- 库存少时货架视觉变弱，库存多时货架更饱满。
- `npm.cmd test -- --run` 通过。
- `npm.cmd run check` 通过。

## V0.4 更新：货架为空自动停业

目标：

- 自动营业不应在库存为 0 时继续推进。
- 如果自动营业过程中卖空最后库存，应立即停止自动营业。

实现内容：

- `src/game/useGameStore.ts` 增加自动营业前后的库存检查。
- 开启自动营业时，如果总库存为 0，会拒绝开启并提示补货。
- 自动营业结算后，如果总库存变为 0，会关闭 `isAutoRunning` 并提示货架已空。
- 手动营业仍保留原有结算逻辑。
- `src/game/useGameStore.test.ts` 增加空货架拒绝自动营业、卖空后停止自动营业测试。

验收标准：

- 空货架时点击“自动营业”不会启动。
- 自动营业卖完最后库存后自动停止。
- `npm.cmd test -- --run` 通过。
- `npm.cmd run check` 通过。
