import { useEffect } from 'react';
import { Coffee, LogOut, Pause, Play, RotateCcw, Store, SunMedium } from 'lucide-react';
import { EmployeePanel } from './components/EmployeePanel';
import { InventoryPanel } from './components/InventoryPanel';
import { LoginScreen } from './components/LoginScreen';
import { MarketPanel } from './components/MarketPanel';
import { ReportPanel } from './components/ReportPanel';
import { ShopOverview } from './components/ShopOverview';
import { StatusBar } from './components/StatusBar';
import { SupplierPanel } from './components/SupplierPanel';
import { UpgradePanel } from './components/UpgradePanel';
import { useGameStore } from './game/useGameStore';

export function App() {
  const { currentUser, game, toast, isAutoRunning, logout, runDay, runAutoDay, refreshMarket, resetGame, reloadLocalSave, toggleAutoRun } =
    useGameStore();

  useEffect(() => {
    if (currentUser) {
      void reloadLocalSave();
    }
  }, [currentUser, reloadLocalSave]);

  useEffect(() => {
    if (!isAutoRunning) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      runAutoDay();
    }, 2400);

    return () => window.clearInterval(timerId);
  }, [isAutoRunning, runAutoDay]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }
    const timerId = window.setInterval(() => {
      refreshMarket();
    }, 30000);

    return () => window.clearInterval(timerId);
  }, [currentUser, refreshMarket]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <main className={isAutoRunning ? 'app-shell shop-live' : 'app-shell'}>
      <section className="hero-band" aria-label="街角小店">
        <div className="hero-copy">
          <span className="eyebrow">
            <Store size={16} />
            第 {game.day} 天 · {currentUser.username}
          </span>
          <h1>街角小店</h1>
          <p>{toast}</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={resetGame}>
            <RotateCcw size={18} />
            重新开店
          </button>
          <button className="day-button" type="button" onClick={runDay}>
            <SunMedium size={20} />
            开始营业
          </button>
          <button className={isAutoRunning ? 'auto-button active' : 'auto-button'} type="button" onClick={toggleAutoRun}>
            {isAutoRunning ? <Pause size={18} /> : <Play size={18} />}
            {isAutoRunning ? '暂停自动' : '自动营业'}
          </button>
          <button className="secondary-button" type="button" onClick={logout}>
            <LogOut size={18} />
            退出
          </button>
        </div>
      </section>

      <StatusBar game={game} />

      <section className="game-grid">
        <ShopOverview game={game} isAutoRunning={isAutoRunning} />
        <MarketPanel game={game} />
        <SupplierPanel game={game} />
        <InventoryPanel game={game} />
        <UpgradePanel game={game} />
        <EmployeePanel game={game} />
      </section>

      <footer className="shop-note">
        <Coffee size={18} />
        街坊们会记住货架是否充足、排队是否顺利，也会记住这间店是不是越来越舒服。
      </footer>

      {game.lastDailyReport ? <ReportPanel game={game} report={game.lastDailyReport} /> : null}
    </main>
  );
}
