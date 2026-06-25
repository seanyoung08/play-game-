import { clamp, comfortScore, restockCapacity, serviceCapacity, upgradeCost } from './balance';
import { customerTypes, dailyEvents, productCategories, products, shopStages, suppliers, upgrades } from './catalog';
import type {
  ActionResult,
  BusinessDayOptions,
  CustomerTypeId,
  DailyEvent,
  DailyProductResult,
  DailyReport,
  EmployeeSkillId,
  GameState,
  Product,
  ProductId,
  Supplier,
  SupplierId,
  UpgradeId,
} from './types';

function copyState(state: GameState): GameState {
  return structuredClone(state);
}

function refreshCapacities(state: GameState) {
  const capacity = restockCapacity(state.upgrades.shelf);
  for (const item of Object.values(state.inventory)) {
    item.capacity = capacity;
    item.stock = Math.min(item.stock, capacity);
  }
}

function refreshSupplierStock(state: GameState) {
  for (const supplier of Object.values(suppliers)) {
    const stock = state.supplierStock[supplier.id] ?? {};
    state.supplierStock[supplier.id] = stock;
    for (const product of Object.values(products)) {
      if (!supplier.suppliedCategories.includes(product.categoryId)) {
        continue;
      }
      const current = stock[product.id] ?? 0;
      stock[product.id] = Math.min(60, current + 12);
    }
  }
}

export function isProductUnlocked(state: GameState, product: Product) {
  const condition = product.unlockCondition;
  if (!condition) {
    return true;
  }
  if (condition.reputation !== undefined && state.reputation < condition.reputation) {
    return false;
  }
  if (condition.shopLevel !== undefined && state.shopLevel < condition.shopLevel) {
    return false;
  }
  if (condition.decorLevel !== undefined && state.upgrades.decor < condition.decorLevel) {
    return false;
  }
  return true;
}

export function isSupplierUnlocked(state: GameState, supplier: Supplier) {
  const condition = supplier.unlockCondition;
  if (!condition) {
    return true;
  }
  if (condition.reputation !== undefined && state.reputation < condition.reputation) {
    return false;
  }
  if (condition.shopLevel !== undefined && state.shopLevel < condition.shopLevel) {
    return false;
  }
  if (condition.decorLevel !== undefined && state.upgrades.decor < condition.decorLevel) {
    return false;
  }
  return true;
}

export function canSupplierSupplyProduct(supplier: Supplier, product: Product) {
  return supplier.suppliedCategories.includes(product.categoryId);
}

function marketPrice(state: GameState, product: Product) {
  return state.market?.products[product.id]?.currentPrice ?? product.unitCost;
}

export function stockCost(product: Product, quantity: number, state: GameState, supplier: Supplier) {
  const supplierDiscount = supplier.generalDiscount + (supplier.categoryDiscounts[product.categoryId] ?? 0);
  const restockDiscount = state.employee.hired ? state.employee.skills.restock * 0.03 : 0;
  const discount = Math.min(0.35, Math.max(0, supplierDiscount + restockDiscount));
  return Math.ceil(quantity * marketPrice(state, product) * (1 - discount));
}

function nextMarketPrice(product: Product, currentPrice: number, day: number, stockRatio: number) {
  const wave = Math.sin((day + product.baseDemand) * 1.17 + product.unitPrice * 0.41);
  const drift = (product.unitPrice - product.unitCost) / product.unitPrice > 0.52 ? 0.012 : -0.004;
  const inventoryPressure = (0.5 - stockRatio) * 0.16;
  const changeRate = clamp(wave * 0.025 + drift + inventoryPressure, -0.08, 0.08);
  const min = product.unitCost * 0.6;
  const max = product.unitCost * 1.6;
  return Math.round(clamp(currentPrice * (1 + changeRate), min, max) * 100) / 100;
}

export function refreshMarket(state: GameState): GameState {
  const next = copyState(state);
  for (const product of Object.values(products)) {
    const current = next.market.products[product.id] ?? {
      currentPrice: product.unitCost,
      previousPrice: product.unitCost,
      history: [{ day: next.day, price: product.unitCost }],
    };
    const item = next.inventory[product.id];
    const stockRatio = item.capacity <= 0 ? 0 : clamp(item.stock / item.capacity, 0, 1);
    const price = nextMarketPrice(product, current.currentPrice, next.day + current.history.length, stockRatio);
    next.market.products[product.id] = {
      currentPrice: price,
      previousPrice: current.currentPrice,
      history: [...current.history, { day: next.day, price }].slice(-18),
    };
  }
  return next;
}

export function sellStock(state: GameState, productId: ProductId, quantity: number): ActionResult {
  const next = copyState(state);
  const product = products[productId];
  const item = next.inventory[productId];
  const amount = Math.max(1, Math.floor(quantity));

  if (!isProductUnlocked(next, product)) {
    return { ok: false, state, message: `${product.name} 还没有解锁。` };
  }
  if (item.stock < amount) {
    return { ok: false, state, message: `${product.name} 库存不足，不能卖出 ${amount} 件。` };
  }

  const income = Math.floor(amount * marketPrice(next, product) * 0.85);
  item.stock -= amount;
  next.cash += income;
  return { ok: true, state: next, message: `卖出了 ${amount} 件${product.name}，回收 ${income} 元。` };
}

export function buyStock(
  state: GameState,
  productId: ProductId,
  quantity: number,
  supplierId: SupplierId = 'directMarket',
): ActionResult {
  const next = copyState(state);
  const product = products[productId];
  const supplier = suppliers[supplierId];

  if (!supplier) {
    return { ok: false, state, message: '没有找到这个供应商。' };
  }

  if (!isSupplierUnlocked(next, supplier)) {
    return { ok: false, state, message: `${supplier.name} 还没有解锁。` };
  }

  if (!isProductUnlocked(next, product)) {
    return { ok: false, state, message: `${product.name} 还没有解锁。` };
  }

  if (!canSupplierSupplyProduct(supplier, product)) {
    return { ok: false, state, message: `${supplier.name} 不供应 ${product.name} 所在品类。` };
  }

  const item = next.inventory[productId];
  const amount = Math.max(1, Math.floor(quantity));
  const room = item.capacity - item.stock;

  if (room <= 0) {
    return { ok: false, state, message: `${product.name} 的货架已经摆满了。` };
  }

  const actualQuantity = Math.min(amount, room);
  const supplierStock = next.supplierStock[supplier.id]?.[productId] ?? 0;
  if (supplierStock < actualQuantity) {
    return { ok: false, state, message: `${supplier.name} 的${product.name}库存不足。` };
  }
  const cost = stockCost(product, actualQuantity, next, supplier);
  if (next.cash < cost) {
    return { ok: false, state, message: `现金不足，进货需要 ${cost} 元。` };
  }

  next.cash -= cost;
  item.stock += actualQuantity;
  next.supplierStock[supplier.id][productId] = supplierStock - actualQuantity;
  return { ok: true, state: next, message: `从${supplier.name}补进了 ${actualQuantity} 件${product.name}。` };
}
export function buyUpgrade(state: GameState, upgradeId: UpgradeId): ActionResult {
  const upgrade = upgrades[upgradeId];
  const currentLevel = state.upgrades[upgradeId];
  if (currentLevel >= upgrade.maxLevel) {
    return { ok: false, state, message: `${upgrade.name} 已经升到最高级。` };
  }

  const cost = upgradeCost(upgradeId, currentLevel);
  if (state.cash < cost) {
    return { ok: false, state, message: `现金不足，升级需要 ${cost} 元。` };
  }

  const next = copyState(state);
  next.cash -= cost;
  next.upgrades[upgradeId] += 1;
  if (upgradeId === 'shelf') {
    refreshCapacities(next);
  }
  return { ok: true, state: next, message: `${upgrade.name} 升到了 ${next.upgrades[upgradeId]} 级。` };
}

export function hireEmployee(state: GameState): ActionResult {
  if (state.employee.hired) {
    return { ok: false, state, message: `${state.employee.name} 已经在店里帮忙。` };
  }
  if (state.cash < 120) {
    return { ok: false, state, message: '雇佣店员需要预留 120 元。' };
  }

  const next = copyState(state);
  next.cash -= 120;
  next.employee.hired = true;
  return { ok: true, state: next, message: `${next.employee.name} 加入了小店。` };
}

export function employeeTrainingCost(level: number) {
  return 20 + (level - 1) * 10;
}

export function trainEmployee(state: GameState, skillId: EmployeeSkillId): ActionResult {
  if (!state.employee.hired) {
    return { ok: false, state, message: '还没有雇佣店员。' };
  }

  const cost = employeeTrainingCost(state.employee.level);
  if (state.employee.experience < cost) {
    return { ok: false, state, message: `经验不足，培养需要 ${cost} 点经验。` };
  }

  const next = copyState(state);
  next.employee.experience -= cost;
  next.employee.level += 1;
  next.employee.skills[skillId] += 1;
  return { ok: true, state: next, message: `${next.employee.name} 的成长提升了。` };
}

function getNextShopLevel(state: GameState) {
  const currentIndex = shopStages.findIndex((stage) => stage.level === state.shopLevel);
  const nextStage = shopStages[currentIndex + 1];
  if (!nextStage) {
    return state.shopLevel;
  }
  if (state.cash >= nextStage.requiredCash && state.reputation >= nextStage.requiredReputation) {
    return nextStage.level;
  }
  return state.shopLevel;
}

function chooseCustomerType(day: number, event: DailyEvent | null): CustomerTypeId {
  if (event?.customerBias) {
    return event.customerBias;
  }
  const cycle: CustomerTypeId[] = ['student', 'office', 'neighbor', 'night'];
  return cycle[(day - 1) % cycle.length];
}

function chooseEvent(day: number, requestedEventId: BusinessDayOptions['eventId']): DailyEvent | null {
  if (requestedEventId === null) {
    return null;
  }
  if (requestedEventId) {
    return dailyEvents[requestedEventId];
  }
  const cycle = [null, dailyEvents.rainy, null, dailyEvents.schoolRush, null, dailyEvents.neighborRecommend, dailyEvents.queueComplaint];
  return cycle[(day - 1) % cycle.length];
}

function categoryDiversityScore(state: GameState) {
  return new Set(
    Object.values(products)
      .filter((product) => isProductUnlocked(state, product) && state.inventory[product.id]?.stock > 0)
      .map((product) => product.categoryId),
  ).size;
}

function productDemand(
  state: GameState,
  product: Product,
  customerTypeId: CustomerTypeId,
  event: DailyEvent | null,
  comfort: number,
) {
  const customerType = customerTypes[customerTypeId];
  const satisfactionDemand = Math.floor(state.satisfaction / 20);
  const baseDemand = product.baseDemand + state.shopLevel * 2 + satisfactionDemand + product.comfortBonus * Math.floor(comfort / 14);
  const customerMultiplier = customerType.demandMultipliers[product.id] ?? 1;
  const customerCategoryMultiplier = customerType.categoryMultipliers[product.categoryId] ?? 1;
  const eventMultiplier = event?.demandMultipliers[product.id] ?? 1;
  const eventCategoryMultiplier = event?.categoryMultipliers?.[product.categoryId] ?? 1;
  return Math.max(0, Math.round(baseDemand * customerMultiplier * customerCategoryMultiplier * eventMultiplier * eventCategoryMultiplier));
}

function buildMessages(report: Omit<DailyReport, 'messages'>, state: GameState) {
  const customerType = customerTypes[report.customerTypeId];
  const event = report.eventId ? dailyEvents[report.eventId] : null;
  const messages: string[] = [];
  const missed = report.products.reduce((total, product) => total + product.missed, 0);

  if (event) {
    messages.push(`${event.name}：${event.description}`);
  }

  messages.push(`今天主要来店的是${customerType.name}：${customerType.description}`);

  if (missed > 8) {
    messages.push('有几位熟客没买到想要的东西，临走前轻轻叹了口气。');
  } else if (report.profit > 120) {
    messages.push('傍晚的门铃响个不停，今天的小店比昨天更热闹。');
  } else {
    messages.push('今天节奏平稳，街坊们像往常一样顺路进来看看。');
  }

  if (report.categoryDiversity >= 4) {
    messages.push('货架选择变丰富了，顾客逛起来明显更从容。');
  }

  if (comfortScore(state.upgrades.decor, state.shopLevel) >= 28) {
    messages.push('有人夸新灯光很柔和，连挑面包都慢了下来。');
  }

  if (state.employee.hired) {
    messages.push(`${state.employee.name} 把排队的人招呼得很好，收银台前少了些焦急。`);
  }

  return messages;
}

function buildInsight(report: Omit<DailyReport, 'messages' | 'insight'>) {
  const topProduct = [...report.products].sort((a, b) => b.revenue - a.revenue)[0];
  const weakestProduct = [...report.products].sort((a, b) => b.missed - a.missed)[0];
  const topName = topProduct ? products[topProduct.productId].name : '商品';
  const weakName = weakestProduct ? products[weakestProduct.productId].name : '库存';
  const topCategory = topProduct ? productCategories[products[topProduct.productId].categoryId].name : '品类';
  const eventText = report.eventId ? `，事件是${dailyEvents[report.eventId].name}` : '';
  return `今日主力客群是${customerTypes[report.customerTypeId].name}${eventText}。${topName}贡献最高，${weakName}最需要留意；当前覆盖 ${report.categoryDiversity} 个品类，${topCategory}表现最好。`;
}
export function runBusinessDay(state: GameState, options: BusinessDayOptions = {}): ActionResult {
  const next = copyState(state);
  const event = chooseEvent(next.day, options.eventId);
  const customerTypeId = options.customerTypeId ?? chooseCustomerType(next.day, event);
  const customerType = customerTypes[customerTypeId];
  const comfort = comfortScore(next.upgrades.decor, next.shopLevel);
  const employeeService = next.employee.hired ? next.employee.serviceBonus + next.employee.skills.service * 4 : 0;
  const capacity = serviceCapacity(next.upgrades.checkout, employeeService);
  let remainingService = capacity;
  const productResults: DailyProductResult[] = [];

  for (const product of Object.values(products)) {
    if (!isProductUnlocked(next, product)) {
      continue;
    }

    const demand = productDemand(next, product, customerTypeId, event, comfort);
    const serviceLimitedDemand = Math.max(0, Math.min(demand, remainingService));
    const item = next.inventory[product.id];
    const sold = Math.min(item.stock, serviceLimitedDemand);
    const missed = Math.max(0, demand - sold);
    const revenue = sold * product.unitPrice;

    item.stock -= sold;
    remainingService -= sold;
    productResults.push({
      productId: product.id,
      demand,
      sold,
      missed,
      revenue,
    });
  }

  const revenue = productResults.reduce((total, product) => total + product.revenue, 0);
  const wages = next.employee.hired ? next.employee.wage : 0;
  const profit = revenue - wages;
  const categoryDiversity = categoryDiversityScore(next);
  const diversityBonus = Math.max(0, categoryDiversity - 2);
  const totalMissed = productResults.reduce((total, product) => total + product.missed, 0);
  const soldTotal = productResults.reduce((total, product) => total + product.sold, 0);
  const serviceGap = productResults.reduce((total, product) => total + product.demand, 0) - capacity;
  const charmBonus = next.employee.hired ? next.employee.skills.charm : 0;
  const comfortBonus = (comfort / 16) * customerType.comfortSensitivity;
  const stockoutPenalty = (totalMissed / 3) * customerType.stockoutSensitivity;
  const servicePenalty = Math.max(0, serviceGap / 8) * customerType.serviceSensitivity;
  const eventSatisfaction = event?.satisfactionBonus ?? 0;
  const satisfactionChange = clamp(
    Math.round(soldTotal / 6 + comfortBonus + charmBonus + eventSatisfaction + diversityBonus - stockoutPenalty - servicePenalty - wages / 80),
    -16,
    12,
  );
  const rawReputation = Math.floor((profit + Math.max(0, satisfactionChange) * 12 + charmBonus * 8 + diversityBonus * 10) / 80);
  const reputationChange = Math.max(0, Math.floor(rawReputation * (event?.reputationMultiplier ?? 1)));

  next.cash += profit;
  next.satisfaction = clamp(next.satisfaction + satisfactionChange, 0, 100);
  next.reputation += reputationChange;
  if (next.employee.hired) {
    next.employee.experience += Math.max(1, soldTotal);
  }
  next.day += 1;
  next.shopLevel = getNextShopLevel(next);
  refreshSupplierStock(next);
  const marketNext = refreshMarket(next);

  const reportBase = {
    day: state.day,
    revenue,
    wages,
    profit,
    satisfactionChange,
    reputationChange,
    products: productResults,
    customerTypeId,
    eventId: event?.id ?? null,
    categoryDiversity,
  };
  const report: DailyReport = {
    ...reportBase,
    messages: buildMessages({ ...reportBase, insight: '' }, marketNext),
    insight: buildInsight(reportBase),
  };
  marketNext.lastDailyReport = report;

  return { ok: true, state: marketNext, message: `第 ${state.day} 天营业结束。` };
}

export function resetReport(state: GameState): GameState {
  const next = copyState(state);
  next.lastDailyReport = null;
  return next;
}




