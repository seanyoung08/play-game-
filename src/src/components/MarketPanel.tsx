import { LineChart, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { products, suppliers } from '../game/catalog';
import type { GameState, MarketPoint, ProductId } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface MarketPanelProps {
  game: GameState;
}

interface ChartPoint {
  x: number;
  y: number;
}

const chartWidth = 260;
const chartHeight = 128;
const chartPadding = 14;
const tradeAmount = 5;

function chartPoints(history: MarketPoint[]): ChartPoint[] {
  const prices = history.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(0.01, max - min);

  return history.map((point, index) => ({
    x: chartPadding + (index / Math.max(1, history.length - 1)) * (chartWidth - chartPadding * 2),
    y: chartHeight - chartPadding - ((point.price - min) / range) * (chartHeight - chartPadding * 2),
  }));
}

function curvePath(points: ChartPoint[]) {
  if (points.length === 0) {
    return '';
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }
    const previous = points[index - 1];
    const controlOffset = (point.x - previous.x) / 2;
    return `${path} C ${(previous.x + controlOffset).toFixed(1)} ${previous.y.toFixed(1)}, ${(point.x - controlOffset).toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');
}

function areaPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return '';
  }
  const baseY = chartHeight - chartPadding;
  const first = points[0];
  const last = points[points.length - 1];
  return `${curvePath(points)} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`;
}

function changeText(current: number, previous: number) {
  const diff = current - previous;
  const percent = previous === 0 ? 0 : (diff / previous) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} / ${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

export function MarketPanel({ game }: MarketPanelProps) {
  const selectedProductId = useGameStore((store) => store.selectedMarketProductId);
  const selectedSupplierId = useGameStore((store) => store.selectedSupplierId);
  const selectMarketProduct = useGameStore((store) => store.selectMarketProduct);
  const refreshMarket = useGameStore((store) => store.refreshMarket);
  const buyStock = useGameStore((store) => store.buyStock);
  const sellStock = useGameStore((store) => store.sellStock);
  const selectedProduct = products[selectedProductId];
  const selectedSupplier = suppliers[selectedSupplierId];
  const market = game.market.products[selectedProductId];
  const inventory = game.inventory[selectedProductId];
  const supplierStock = game.supplierStock[selectedSupplierId]?.[selectedProductId] ?? 0;
  const points = chartPoints(market.history);
  const lastPoint = points[points.length - 1];
  const high = Math.max(...market.history.map((point) => point.price));
  const low = Math.min(...market.history.map((point) => point.price));
  const isUp = market.currentPrice >= market.previousPrice;
  const canSell = inventory.stock > 0;
  const canBuy = supplierStock > 0 && inventory.stock < inventory.capacity;

  return (
    <section className="panel market-panel">
      <div className="panel-heading">
        <span>
          <LineChart size={18} />
          价格曲线图
        </span>
        <button className="icon-button" type="button" aria-label="刷新行情" onClick={refreshMarket}>
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="market-summary">
        <div>
          <strong>{selectedProduct.name}</strong>
          <span>当前进货参考价</span>
        </div>
        <div className={isUp ? 'market-price up' : 'market-price down'}>
          {isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          {market.currentPrice.toFixed(2)}
        </div>
      </div>

      <svg className={isUp ? 'market-chart up' : 'market-chart down'} viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${selectedProduct.name}价格曲线`}>
        <defs>
          <linearGradient id="marketArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="14" y1="24" x2="246" y2="24" />
        <line x1="14" y1="64" x2="246" y2="64" />
        <line x1="14" y1="104" x2="246" y2="104" />
        <path className="market-area" d={areaPath(points)} />
        <path className="market-curve" d={curvePath(points)} />
        {lastPoint ? <circle className="market-dot" cx={lastPoint.x} cy={lastPoint.y} r="4.6" /> : null}
      </svg>

      <div className="market-change">
        <span>{changeText(market.currentPrice, market.previousPrice)}</span>
        <span>
          高 {high.toFixed(2)} / 低 {low.toFixed(2)}
        </span>
      </div>

      <div className="market-trade-bar">
        <div>
          <strong>
            库存 {inventory.stock}/{inventory.capacity}
          </strong>
          <span>
            {selectedSupplier.name} 可出货 {supplierStock} · 每次 {tradeAmount} 件
          </span>
        </div>
        <div className="market-trade-actions">
          <button type="button" disabled={!canBuy} onClick={() => buyStock(selectedProductId, tradeAmount)}>
            买进
          </button>
          <button type="button" disabled={!canSell} onClick={() => sellStock(selectedProductId, tradeAmount)}>
            卖出
          </button>
        </div>
      </div>

      <div className="market-selector">
        {Object.values(products).map((product) => (
          <button
            className={selectedProductId === product.id ? 'market-chip active' : 'market-chip'}
            key={product.id}
            type="button"
            onClick={() => selectMarketProduct(product.id as ProductId)}
          >
            {product.name}
          </button>
        ))}
      </div>
    </section>
  );
}
