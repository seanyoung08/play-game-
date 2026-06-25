import { ShoppingBasket } from 'lucide-react';
import { productCategories, products, suppliers } from '../game/catalog';
import { canSupplierSupplyProduct, isProductUnlocked, isSupplierUnlocked, stockCost } from '../game/rules';
import type { GameState, Product } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface InventoryPanelProps {
  game: GameState;
}

const tradeAmount = 5;

function unlockText(product: Product) {
  const condition = product.unlockCondition;
  if (!condition) {
    return '已解锁';
  }
  if (condition.reputation !== undefined) {
    return `声望 ${condition.reputation} 解锁`;
  }
  if (condition.shopLevel !== undefined) {
    return `店铺等级 ${condition.shopLevel} 解锁`;
  }
  if (condition.decorLevel !== undefined) {
    return `装修等级 ${condition.decorLevel} 解锁`;
  }
  return '等待解锁';
}

function buyStatus(game: GameState, product: Product, supplier = suppliers.directMarket) {
  const item = game.inventory[product.id];
  if (!isSupplierUnlocked(game, supplier)) {
    return '供应商未解锁';
  }
  if (!isProductUnlocked(game, product)) {
    return '商品未解锁';
  }
  if (!canSupplierSupplyProduct(supplier, product)) {
    return '该供应商不供货';
  }
  if (item.stock >= item.capacity) {
    return '货架已满';
  }
  const supplierStock = game.supplierStock[supplier.id]?.[product.id] ?? 0;
  if (supplierStock <= 0) {
    return '供应商缺货';
  }
  const quantity = Math.min(tradeAmount, item.capacity - item.stock, supplierStock);
  const cost = stockCost(product, quantity, game, supplier);
  if (game.cash < cost) {
    return `现金不足，需要 ${cost} 元`;
  }
  return `可在曲线图买进 ${quantity} 件，需要 ${cost} 元`;
}

export function InventoryPanel({ game }: InventoryPanelProps) {
  const selectedSupplierId = useGameStore((store) => store.selectedSupplierId);
  const supplier = suppliers[selectedSupplierId];

  return (
    <section className="panel">
      <div className="panel-heading">
        <span>
          <ShoppingBasket size={18} />
          库存观察
        </span>
        <small>{supplier.name}</small>
      </div>
      <div className="item-list">
        {Object.values(products).map((product) => {
          const item = game.inventory[product.id];
          const market = game.market.products[product.id];
          const marketUp = market.currentPrice >= market.previousPrice;
          const supplierStock = game.supplierStock[supplier.id]?.[product.id] ?? 0;

          return (
            <article className="shop-row inventory-readonly-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p>{product.description}</p>
                <small>
                  {productCategories[product.categoryId].name} · 库存 {item.stock}/{item.capacity} · 供应商库存 {supplierStock}
                </small>
                <span className={marketUp ? 'purchase-status market-up' : 'purchase-status market-down'}>
                  行情 {market.currentPrice.toFixed(2)} 元 · {marketUp ? '上涨' : '下跌'}
                </span>
                <span className="purchase-status muted">
                  {buyStatus(game, product, supplier)} · {unlockText(product)}
                </span>
              </div>
              <div className="readonly-badge">曲线图交易</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
