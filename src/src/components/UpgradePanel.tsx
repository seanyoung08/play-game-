import { BadgePlus, Hammer } from 'lucide-react';
import { upgradeCost } from '../game/balance';
import { upgrades } from '../game/catalog';
import type { GameState, UpgradeId } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface UpgradePanelProps {
  game: GameState;
}

export function UpgradePanel({ game }: UpgradePanelProps) {
  const buyUpgrade = useGameStore((store) => store.buyUpgrade);

  return (
    <section className="panel">
      <div className="panel-heading">
        <span>
          <Hammer size={18} />
          升级与装修
        </span>
      </div>
      <div className="item-list">
        {Object.values(upgrades).map((upgrade) => {
          const level = game.upgrades[upgrade.id];
          const maxed = level >= upgrade.maxLevel;
          const cost = upgradeCost(upgrade.id, level);
          const disabled = maxed || game.cash < cost;
          return (
            <article className="shop-row" key={upgrade.id}>
              <div>
                <strong>{upgrade.name}</strong>
                <p>{upgrade.description}</p>
                <small>
                  等级 {level}/{upgrade.maxLevel} · {maxed ? '已满级' : `升级 ${cost} 元`}
                </small>
              </div>
              <button type="button" disabled={disabled} onClick={() => buyUpgrade(upgrade.id as UpgradeId)}>
                <BadgePlus size={17} />
                升级
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
