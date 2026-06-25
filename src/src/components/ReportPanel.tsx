import { X } from 'lucide-react';
import { customerTypes, dailyEvents, products } from '../game/catalog';
import type { DailyReport, GameState } from '../game/types';
import { useGameStore } from '../game/useGameStore';

interface ReportPanelProps {
  game: GameState;
  report: DailyReport;
}

export function ReportPanel({ game, report }: ReportPanelProps) {
  const closeReport = useGameStore((store) => store.closeReport);
  const event = report.eventId ? dailyEvents[report.eventId] : null;

  return (
    <div className="report-backdrop" role="presentation">
      <section className="report-panel" role="dialog" aria-modal="true" aria-label="每日结算">
        <div className="report-heading">
          <div>
            <span>第 {report.day} 天</span>
            <h2>营业结算</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭结算" onClick={closeReport}>
            <X size={20} />
          </button>
        </div>

        <div className="report-context">
          <span>主要客群：{customerTypes[report.customerTypeId].name}</span>
          <span>今日事件：{event ? event.name : '平稳营业'}</span>
        </div>

        <p className="report-insight">{report.insight}</p>

        <div className="report-totals">
          <div>
            <span>收入</span>
            <strong>{report.revenue}</strong>
          </div>
          <div>
            <span>工资</span>
            <strong>{report.wages}</strong>
          </div>
          <div>
            <span>利润</span>
            <strong>{report.profit}</strong>
          </div>
          <div>
            <span>满意</span>
            <strong>
              {report.satisfactionChange > 0 ? '+' : ''}
              {report.satisfactionChange}
            </strong>
          </div>
          <div>
            <span>声望</span>
            <strong>+{report.reputationChange}</strong>
          </div>
        </div>

        <div className="report-products">
          {report.products.map((item) => (
            <div key={item.productId}>
              <span>{products[item.productId].name}</span>
              <strong>售出 {item.sold}</strong>
              <small>
                错过 {item.missed} · 收入 {item.revenue}
              </small>
            </div>
          ))}
        </div>

        <div className="messages">
          {report.messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>

        <button className="wide-button" type="button" onClick={closeReport}>
          明天继续整理小店 · 当前现金 {game.cash} 元
        </button>
      </section>
    </div>
  );
}
