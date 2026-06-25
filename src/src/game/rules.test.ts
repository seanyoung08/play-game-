import { describe, expect, it } from 'vitest';
import { createInitialState } from './initialState';
import { buyStock, buyUpgrade, hireEmployee, refreshMarket, sellStock, trainEmployee, runBusinessDay } from './rules';

describe('game rules', () => {
  it('sells inventory and earns cash during a business day', () => {
    const initial = createInitialState();
    const result = runBusinessDay(initial);

    expect(result.ok).toBe(true);
    expect(result.state.cash).toBeGreaterThan(initial.cash);
    expect(result.state.inventory.bread.stock).toBeLessThan(initial.inventory.bread.stock);
    expect(result.state.lastDailyReport?.revenue).toBeGreaterThan(0);
  });

  it('low inventory reduces satisfaction', () => {
    const initial = createInitialState();
    initial.inventory.bread.stock = 0;
    initial.inventory.drink.stock = 0;
    initial.inventory.daily.stock = 0;

    const result = runBusinessDay(initial);

    expect(result.state.satisfaction).toBeLessThan(initial.satisfaction);
    expect(result.state.lastDailyReport?.messages.length).toBeGreaterThan(0);
  });

  it('student customers increase bread demand', () => {
    const initial = createInitialState();
    initial.inventory.bread.stock = 18;
    initial.inventory.drink.stock = 18;
    initial.inventory.daily.stock = 18;

    const studentDay = runBusinessDay(initial, { customerTypeId: 'student', eventId: null });
    const neighborDay = runBusinessDay(initial, { customerTypeId: 'neighbor', eventId: null });

    const studentBread = studentDay.state.lastDailyReport?.products.find((item) => item.productId === 'bread');
    const neighborBread = neighborDay.state.lastDailyReport?.products.find((item) => item.productId === 'bread');

    expect(studentDay.state.lastDailyReport?.customerTypeId).toBe('student');
    expect(studentBread?.demand).toBeGreaterThan(neighborBread?.demand ?? 0);
  });

  it('student customers increase stationery category demand', () => {
    const initial = createInitialState();
    initial.reputation = 20;
    initial.inventory.stationery.stock = 18;
    initial.inventory.notebook.stock = 18;
    initial.inventory.pen.stock = 18;

    const studentDay = runBusinessDay(initial, { customerTypeId: 'student', eventId: null });
    const officeDay = runBusinessDay(initial, { customerTypeId: 'office', eventId: null });

    const studentPen = studentDay.state.lastDailyReport?.products.find((item) => item.productId === 'pen');
    const officePen = officeDay.state.lastDailyReport?.products.find((item) => item.productId === 'pen');

    expect(studentPen?.demand).toBeGreaterThan(officePen?.demand ?? 0);
    expect(studentDay.state.lastDailyReport?.categoryDiversity).toBeGreaterThan(0);
  });

  it('reports higher category diversity for a broader shelf', () => {
    const narrow = createInitialState();
    narrow.cash = 1000;
    narrow.reputation = 30;
    narrow.upgrades.checkout = 5;
    for (const item of Object.values(narrow.inventory)) {
      item.stock = 0;
    }
    narrow.inventory.bread.stock = 80;
    narrow.inventory.bread.capacity = 100;

    const diverse = createInitialState();
    diverse.cash = 1000;
    diverse.reputation = 30;
    diverse.shopLevel = 2;
    diverse.upgrades.decor = 3;
    diverse.upgrades.checkout = 5;
    for (const item of Object.values(diverse.inventory)) {
      item.stock = 0;
      item.capacity = 100;
    }
    diverse.inventory.bread.stock = 80;
    diverse.inventory.drink.stock = 80;
    diverse.inventory.daily.stock = 80;
    diverse.inventory.lunch.stock = 80;
    diverse.inventory.stationery.stock = 80;

    const narrowDay = runBusinessDay(narrow, { customerTypeId: 'neighbor', eventId: null });
    const diverseDay = runBusinessDay(diverse, { customerTypeId: 'neighbor', eventId: null });

    expect(diverseDay.state.lastDailyReport?.categoryDiversity).toBeGreaterThan(narrowDay.state.lastDailyReport?.categoryDiversity ?? 0);
    expect(diverseDay.state.lastDailyReport?.insight.length).toBeGreaterThan(0);
  });

  it('rainy event increases drink demand and appears in the report', () => {
    const initial = createInitialState();
    initial.inventory.bread.stock = 18;
    initial.inventory.drink.stock = 18;
    initial.inventory.daily.stock = 18;

    const rainyDay = runBusinessDay(initial, { customerTypeId: 'student', eventId: 'rainy' });
    const normalDay = runBusinessDay(initial, { customerTypeId: 'student', eventId: null });

    const rainyDrink = rainyDay.state.lastDailyReport?.products.find((item) => item.productId === 'drink');
    const normalDrink = normalDay.state.lastDailyReport?.products.find((item) => item.productId === 'drink');

    expect(rainyDay.state.lastDailyReport?.eventId).toBe('rainy');
    expect(rainyDay.state.lastDailyReport?.messages.length).toBeGreaterThan(0);
    expect(rainyDrink?.demand).toBeGreaterThan(normalDrink?.demand ?? 0);
  });

  it('neighbor recommendation increases reputation gain', () => {
    const initial = createInitialState();
    initial.inventory.bread.stock = 18;
    initial.inventory.drink.stock = 18;
    initial.inventory.daily.stock = 18;

    const recommended = runBusinessDay(initial, { customerTypeId: 'neighbor', eventId: 'neighborRecommend' });
    const normal = runBusinessDay(initial, { customerTypeId: 'neighbor', eventId: null });

    expect(recommended.state.lastDailyReport?.reputationChange).toBeGreaterThanOrEqual(
      normal.state.lastDailyReport?.reputationChange ?? 0,
    );
  });

  it('prevents restocking when cash is insufficient', () => {
    const initial = createInitialState();
    initial.cash = 1;

    const result = buyStock(initial, 'daily', 3);

    expect(result.ok).toBe(false);
    expect(result.state.cash).toBe(1);
  });

  it('prevents restocking locked products', () => {
    const initial = createInitialState();
    initial.cash = 500;

    const result = buyStock(initial, 'milk', 3);

    expect(result.ok).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.state.inventory.milk.stock).toBe(0);
  });

  it('allows restocking unlocked products', () => {
    const initial = createInitialState();
    initial.cash = 500;
    initial.reputation = 8;

    const result = buyStock(initial, 'milk', 3);

    expect(result.ok).toBe(true);
    expect(result.state.inventory.milk.stock).toBe(3);
  });

  it('applies supplier discount when buying from a matching supplier', () => {
    const direct = createInitialState();
    direct.cash = 1000;
    const discounted = createInitialState();
    discounted.cash = 1000;

    const directResult = buyStock(direct, 'bread', 5);
    const discountedResult = buyStock(discounted, 'bread', 5, 'morningBakery');

    expect(directResult.ok).toBe(true);
    expect(discountedResult.ok).toBe(true);
    expect(discountedResult.state.cash).toBeGreaterThan(directResult.state.cash);
  });

  it('prevents buying from a supplier that does not supply the product category', () => {
    const initial = createInitialState();
    initial.cash = 500;

    const result = buyStock(initial, 'daily', 3, 'morningBakery');

    expect(result.ok).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.state.inventory.daily.stock).toBe(initial.inventory.daily.stock);
  });

  it('prevents buying from locked suppliers', () => {
    const initial = createInitialState();
    initial.cash = 500;

    const community = buyStock(initial, 'daily', 3, 'communityWholesale');
    const night = buyStock(initial, 'lunch', 3, 'nightDepot');

    expect(community.ok).toBe(false);
    expect(community.ok).toBe(false);
    expect(night.ok).toBe(false);
    expect(night.ok).toBe(false);
  });

  it('prevents buying when supplier stock is insufficient', () => {
    const initial = createInitialState();
    initial.cash = 1000;
    initial.supplierStock.directMarket.bread = 2;

    const result = buyStock(initial, 'bread', 5, 'directMarket');

    expect(result.ok).toBe(false);
    expect(result.state.inventory.bread.stock).toBe(initial.inventory.bread.stock);
  });

  it('decreases supplier stock after buying', () => {
    const initial = createInitialState();
    initial.cash = 1000;
    initial.supplierStock.directMarket.bread = 10;

    const result = buyStock(initial, 'bread', 5, 'directMarket');

    expect(result.ok).toBe(true);
    expect(result.state.supplierStock.directMarket.bread).toBe(5);
  });

  it('restocks suppliers after a business day', () => {
    const initial = createInitialState();
    initial.supplierStock.directMarket.bread = 0;

    const result = runBusinessDay(initial);

    expect(result.state.supplierStock.directMarket.bread).toBeGreaterThan(0);
  });
  it('caps combined supplier and employee restock discounts', () => {
    const initial = createInitialState();
    initial.cash = 1000;
    initial.employee.hired = true;
    initial.employee.skills.restock = 20;

    const result = buyStock(initial, 'bread', 5, 'morningBakery');

    expect(result.ok).toBe(true);
    expect(result.state.cash).toBe(1000 - Math.ceil(5 * 4 * 0.65));
  });

  it('advances product market prices after a business day', () => {
    const initial = createInitialState();
    const before = initial.market.products.bread;

    const result = runBusinessDay(initial);
    const after = result.state.market.products.bread;

    expect(after.history.length).toBe(before.history.length + 1);
    expect(after.previousPrice).toBe(before.currentPrice);
    expect(after.currentPrice).not.toBe(before.currentPrice);
  });

  it('uses market price when restocking', () => {
    const initial = createInitialState();
    initial.cash = 1000;
    initial.market.products.bread.currentPrice = 6;

    const result = buyStock(initial, 'bread', 5);

    expect(result.ok).toBe(true);
    expect(result.state.cash).toBe(1000 - 30);
  });

  it('sells stock at the current market buyback price', () => {
    const initial = createInitialState();
    initial.cash = 100;
    initial.inventory.bread.stock = 10;
    initial.market.products.bread.currentPrice = 10;

    const result = sellStock(initial, 'bread', 4);

    expect(result.ok).toBe(true);
    expect(result.state.inventory.bread.stock).toBe(6);
    expect(result.state.cash).toBe(100 + Math.floor(4 * 10 * 0.85));
  });

  it('prevents selling more stock than available', () => {
    const initial = createInitialState();
    initial.inventory.bread.stock = 1;

    const result = sellStock(initial, 'bread', 2);

    expect(result.ok).toBe(false);
    expect(result.state.inventory.bread.stock).toBe(1);
  });

  it('can refresh market prices without running a business day', () => {
    const initial = createInitialState();

    const result = refreshMarket(initial);

    expect(result.market.products.bread.history.length).toBe(2);
    expect(result.day).toBe(initial.day);
  });

  it('raises market price when stock is low and lowers it when stock is high', () => {
    const lowStock = createInitialState();
    lowStock.inventory.bread.stock = 0;
    lowStock.inventory.bread.capacity = 20;

    const highStock = createInitialState();
    highStock.inventory.bread.stock = 20;
    highStock.inventory.bread.capacity = 20;

    const lowStockMarket = refreshMarket(lowStock);
    const highStockMarket = refreshMarket(highStock);

    expect(lowStockMarket.market.products.bread.currentPrice).toBeGreaterThan(highStockMarket.market.products.bread.currentPrice);
  });

  it('upgrades shelves and increases capacity', () => {
    const initial = createInitialState();
    initial.cash = 1200;

    const result = buyUpgrade(initial, 'shelf');

    expect(result.ok).toBe(true);
    expect(result.state.cash).toBeLessThan(initial.cash);
    expect(result.state.inventory.bread.capacity).toBeGreaterThan(initial.inventory.bread.capacity);
  });

  it('employee improves service but adds wages', () => {
    const initial = createInitialState();
    initial.cash = 500;
    initial.inventory.bread.stock = 18;
    initial.inventory.drink.stock = 18;
    initial.inventory.daily.stock = 18;
    const hired = hireEmployee(initial).state;

    const result = runBusinessDay(hired);

    expect(result.state.employee.hired).toBe(true);
    expect(result.state.lastDailyReport?.wages).toBeGreaterThan(0);
  });

  it('employee gains experience after a business day', () => {
    const initial = createInitialState();
    initial.cash = 500;
    initial.inventory.bread.stock = 18;
    initial.inventory.drink.stock = 18;
    initial.inventory.daily.stock = 18;
    const hired = hireEmployee(initial).state;

    const result = runBusinessDay(hired);

    expect(result.state.employee.experience).toBeGreaterThan(hired.employee.experience);
  });

  it('trains employee service when enough experience is available', () => {
    const initial = createInitialState();
    initial.cash = 500;
    const hired = hireEmployee(initial).state;
    hired.employee.experience = 30;

    const result = trainEmployee(hired, 'service');

    expect(result.ok).toBe(true);
    expect(result.state.employee.skills.service).toBe(1);
    expect(result.state.employee.level).toBe(2);
    expect(result.state.employee.experience).toBeLessThan(30);
  });

  it('raises shop level when cash and reputation meet the next stage', () => {
    const initial = createInitialState();
    initial.cash = 1200;
    initial.reputation = 50;

    const result = runBusinessDay(initial);

    expect(result.state.shopLevel).toBeGreaterThan(1);
  });
});

