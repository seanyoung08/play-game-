import { BadgePercent, CheckCircle2, Lock, Truck } from 'lucide-react';
import { productCategories, suppliers } from '../game/catalog';
import { isSupplierUnlocked } from '../game/rules';
import type { GameState, Supplier } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface SupplierPanelProps {
  game: GameState;
}

function unlockText(supplier: Supplier) {
  const condition = supplier.unlockCondition;
  if (!condition) {
    return '默认开放';
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

function discountText(supplier: Supplier) {
  const parts: string[] = [];
  if (supplier.generalDiscount > 0) {
    parts.push(`全品类 -${Math.round(supplier.generalDiscount * 100)}%`);
  }
  for (const [categoryId, discount] of Object.entries(supplier.categoryDiscounts)) {
    if (discount) {
      parts.push(`${productCategories[categoryId as keyof typeof productCategories].name} -${Math.round(discount * 100)}%`);
    }
  }
  return parts.length > 0 ? parts.join(' / ') : '无折扣';
}

export function SupplierPanel({ game }: SupplierPanelProps) {
  const selectedSupplierId = useGameStore((store) => store.selectedSupplierId);
  const selectSupplier = useGameStore((store) => store.selectSupplier);

  return (
    <section className="panel supplier-panel">
      <div className="panel-heading">
        <span>
          <Truck size={18} />
          供应商店铺
        </span>
      </div>
      <div className="supplier-list">
        {Object.values(suppliers).map((supplier) => {
          const unlocked = isSupplierUnlocked(game, supplier);
          const selected = selectedSupplierId === supplier.id;
          return (
            <button
              className={selected ? 'supplier-card selected' : 'supplier-card'}
              disabled={!unlocked}
              key={supplier.id}
              onClick={() => selectSupplier(supplier.id)}
              type="button"
            >
              <span className="supplier-title">
                <strong>{supplier.name}</strong>
                {selected ? <CheckCircle2 size={17} /> : unlocked ? <Truck size={17} /> : <Lock size={17} />}
              </span>
              <span className="supplier-description">{supplier.description}</span>
              <span className="supplier-tags">
                {supplier.suppliedCategories.map((categoryId) => (
                  <span key={categoryId}>{productCategories[categoryId].name}</span>
                ))}
              </span>
              <span className="supplier-meta">
                <BadgePercent size={15} />
                {discountText(supplier)} · {unlockText(supplier)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
