import { BadgeCheck, Banknote, Heart, Sparkles } from 'lucide-react';
import { shopStages } from '../game/catalog';
import type { GameState } from '../game/types';

interface StatusBarProps {
  game: GameState;
}

export function StatusBar({ game }: StatusBarProps) {
  const stage = shopStages.find((item) => item.level === game.shopLevel) ?? shopStages[0];

  return (
    <section className="status-strip" aria-label="店铺状态">
      <div>
        <Banknote size={18} />
        <span>现金</span>
        <strong>{game.cash} 元</strong>
      </div>
      <div>
        <Sparkles size={18} />
        <span>声望</span>
        <strong>{game.reputation}</strong>
      </div>
      <div>
        <Heart size={18} />
        <span>满意度</span>
        <strong>{game.satisfaction}</strong>
      </div>
      <div>
        <BadgeCheck size={18} />
        <span>阶段</span>
        <strong>{stage.name}</strong>
      </div>
    </section>
  );
}
