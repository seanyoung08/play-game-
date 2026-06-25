import { MessageSquareText, PackageCheck, ReceiptText } from 'lucide-react';
import { comfortScore, serviceCapacity } from '../game/balance';
import { customerTypes, dailyEvents, products, shopStages } from '../game/catalog';
import type { GameState } from '../game/types';

interface ShopOverviewProps {
  game: GameState;
  isAutoRunning: boolean;
}

export function ShopOverview({ game, isAutoRunning }: ShopOverviewProps) {
  const stage = shopStages.find((item) => item.level === game.shopLevel) ?? shopStages[0];
  const totalStock = Object.values(game.inventory).reduce((total, item) => total + item.stock, 0);
  const comfort = comfortScore(game.upgrades.decor, game.shopLevel);
  const service = serviceCapacity(game.upgrades.checkout, game.employee.hired ? game.employee.serviceBonus + game.employee.skills.service * 4 : 0);
  const lowestStock = Object.values(products).reduce((lowest, product) => {
    const stock = game.inventory[product.id].stock;
    return stock < game.inventory[lowest.id].stock ? product : lowest;
  }, products.bread);
  const stockMood = totalStock < 15 ? 'quiet' : totalStock > 45 ? 'full' : 'steady';
  const report = game.lastDailyReport;
  const event = report?.eventId ? dailyEvents[report.eventId] : null;

  return (
    <article className={`shop-overview feature-panel stock-${stockMood}`}>
      <div className="panel-heading">
        <span>
          <ReceiptText size={18} />
          店铺手账
        </span>
        <strong>Lv.{game.shopLevel}</strong>
      </div>
      <h2>{stage.name}</h2>
      <p>{stage.description}</p>

      <div className={isAutoRunning ? 'shop-window is-open' : 'shop-window'} aria-label="店铺橱窗">
        <div className="awning" />
        <div className="open-sign">{isAutoRunning ? 'OPEN' : 'READY'}</div>
        <div className="bell" aria-hidden="true" />
        <div className="window-shelves">
          <span data-stock={game.inventory.bread.stock} />
          <span data-stock={game.inventory.drink.stock} />
          <span data-stock={game.inventory.daily.stock} />
        </div>
        <div className="counter-light" aria-hidden="true" />
        <div className="door" />
        <div className="customer customer-one" aria-hidden="true" />
        <div className="customer customer-two" aria-hidden="true" />
        <div className="steam steam-one" aria-hidden="true" />
        <div className="steam steam-two" aria-hidden="true" />
      </div>

      <div className="mini-metrics">
        <div>
          <PackageCheck size={17} />
          <span>库存 {totalStock} 件</span>
        </div>
        <div>
          <MessageSquareText size={17} />
          <span>舒适 {comfort}</span>
        </div>
        <div>
          <ReceiptText size={17} />
          <span>服务 {service}</span>
        </div>
      </div>

      <div className="insight-box">
        <strong>今日观察</strong>
        {report ? (
          <>
            <span>客群：{customerTypes[report.customerTypeId].name}</span>
            <span>事件：{event ? event.name : '平稳营业'}</span>
            <p>{report.insight}</p>
          </>
        ) : (
          <p>今日建议：多留意 {lowestStock.name}，货架空下来时顾客会很快察觉。</p>
        )}
      </div>
    </article>
  );
}
