import { restockCapacity, STARTING_CASH, STARTING_REPUTATION, STARTING_SATISFACTION } from './balance';
import { products, suppliers } from './catalog';
import type { GameState, Inventory, MarketState, SupplierStock } from './types';

function createInventory(): Inventory {
  const capacity = restockCapacity(0);
  return Object.fromEntries(
    Object.keys(products).map((productId) => {
      const startingStock = productId === 'bread' ? 8 : productId === 'drink' ? 10 : productId === 'daily' ? 4 : 0;
      return [productId, { stock: startingStock, capacity }];
    }),
  ) as Inventory;
}

function createMarket(): MarketState {
  return {
    products: Object.fromEntries(
      Object.values(products).map((product) => [
        product.id,
        {
          currentPrice: product.unitCost,
          previousPrice: product.unitCost,
          history: [{ day: 1, price: product.unitCost }],
        },
      ]),
    ) as MarketState['products'],
  };
}

function createSupplierStock(): SupplierStock {
  return Object.fromEntries(
    Object.values(suppliers).map((supplier) => [
      supplier.id,
      Object.fromEntries(
        Object.values(products)
          .filter((product) => supplier.suppliedCategories.includes(product.categoryId))
          .map((product) => [product.id, 30]),
      ),
    ]),
  ) as SupplierStock;
}

export function createInitialState(): GameState {
  return {
    day: 1,
    cash: STARTING_CASH,
    reputation: STARTING_REPUTATION,
    satisfaction: STARTING_SATISFACTION,
    shopLevel: 1,
    inventory: createInventory(),
    supplierStock: createSupplierStock(),
    market: createMarket(),
    upgrades: {
      shelf: 0,
      checkout: 0,
      decor: 0,
    },
    employee: {
      hired: false,
      name: '小林',
      wage: 38,
      serviceBonus: 10,
      level: 1,
      experience: 0,
      skills: {
        service: 0,
        restock: 0,
        charm: 0,
      },
    },
    lastDailyReport: null,
  };
}
