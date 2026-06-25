import { create } from 'zustand';
import { customerTypes, dailyEvents } from './catalog';
import { createInitialState } from './initialState';
import { buyStock, buyUpgrade, hireEmployee, refreshMarket, resetReport, runBusinessDay, sellStock, trainEmployee } from './rules';
import {
  clearSession,
  loadGame,
  loadGameForUser,
  loadSession,
  loginUser,
  registerUser,
  saveGame,
  saveGameForUser,
  saveSession,
  type UserSession,
} from './storage';
import type { EmployeeSkillId, GameState, ProductId, SupplierId, UpgradeId } from './types';

interface GameStore {
  game: GameState;
  toast: string;
  isAutoRunning: boolean;
  currentUser: UserSession | null;
  selectedSupplierId: SupplierId;
  selectedMarketProductId: ProductId;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  selectSupplier: (supplierId: SupplierId) => void;
  selectMarketProduct: (productId: ProductId) => void;
  refreshMarket: () => void;
  reloadLocalSave: () => Promise<void>;
  buyStock: (productId: ProductId, quantity: number) => void;
  sellStock: (productId: ProductId, quantity: number) => void;
  buyUpgrade: (upgradeId: UpgradeId) => void;
  hireEmployee: () => void;
  trainEmployee: (skillId: EmployeeSkillId) => void;
  runDay: () => void;
  runAutoDay: () => void;
  toggleAutoRun: () => void;
  closeReport: () => void;
  resetGame: () => void;
}

function totalStock(state: GameState) {
  return Object.values(state.inventory).reduce((total, item) => total + item.stock, 0);
}

function persist(user: UserSession | null, state: GameState) {
  if (user) {
    saveGameForUser(user, state);
  } else {
    saveGame(state);
  }
  return state;
}

function loadUserGame(user: UserSession | null) {
  return user ? loadGameForUser(user) : loadGame();
}

const initialUser = loadSession();

export const useGameStore = create<GameStore>((set, get) => ({
  game: loadUserGame(initialUser),
  toast: initialUser ? `欢迎回来，${initialUser.username}。` : '请先登录，打开属于你的街角小店。',
  isAutoRunning: false,
  currentUser: initialUser,
  selectedSupplierId: 'directMarket',
  selectedMarketProductId: 'bread',
  login: async (username, password) => {
    const user = await loginUser(username, password);
    saveSession(user);
    const game = loadGameForUser(user);
    set({ currentUser: user, game, toast: `欢迎回来，${user.username}。` });
  },
  register: async (username, password) => {
    const user = await registerUser(username, password);
    saveSession(user);
    const game = createInitialState();
    saveGameForUser(user, game);
    set({ currentUser: user, game, toast: `欢迎开店，${user.username}。` });
  },
  logout: () => {
    clearSession();
    set({
      currentUser: null,
      game: createInitialState(),
      isAutoRunning: false,
      selectedSupplierId: 'directMarket',
      selectedMarketProductId: 'bread',
      toast: '已退出登录。',
    });
  },
  selectSupplier: (supplierId) =>
    set(() => ({
      selectedSupplierId: supplierId,
      toast: '采购渠道已切换。',
    })),
  selectMarketProduct: (productId) =>
    set(() => ({
      selectedMarketProductId: productId,
    })),
  refreshMarket: () =>
    set(({ currentUser, game }) => {
      const next = refreshMarket(game);
      return {
        game: persist(currentUser, next),
        toast: '今日行情刷新了，货架价格又有了新变化。',
      };
    }),
  reloadLocalSave: async () => {
    const user = get().currentUser;
    if (!user) {
      return;
    }
    set({ game: loadGameForUser(user), toast: `已读取 ${user.username} 的本地存档。` });
  },
  buyStock: (productId, quantity) =>
    set(({ currentUser, game, selectedSupplierId }) => {
      const result = buyStock(game, productId, quantity, selectedSupplierId);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        toast: result.message,
      };
    }),
  sellStock: (productId, quantity) =>
    set(({ currentUser, game }) => {
      const result = sellStock(game, productId, quantity);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        toast: result.message,
      };
    }),
  buyUpgrade: (upgradeId) =>
    set(({ currentUser, game }) => {
      const result = buyUpgrade(game, upgradeId);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        toast: result.message,
      };
    }),
  hireEmployee: () =>
    set(({ currentUser, game }) => {
      const result = hireEmployee(game);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        toast: result.message,
      };
    }),
  trainEmployee: (skillId) =>
    set(({ currentUser, game }) => {
      const result = trainEmployee(game, skillId);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        toast: result.message,
      };
    }),
  runDay: () =>
    set(({ currentUser, game }) => {
      const result = runBusinessDay(game);
      return {
        game: persist(currentUser, result.state),
        toast: result.message,
      };
    }),
  runAutoDay: () =>
    set(({ currentUser, game }) => {
      if (totalStock(game) === 0) {
        return {
          game,
          isAutoRunning: false,
          toast: '货架已经空了，自动营业已停止。先补货再继续开店。',
        };
      }

      const result = runBusinessDay(game);
      const report = result.state.lastDailyReport;
      const next = {
        ...result.state,
        lastDailyReport: null,
      };
      const stockAfterBusiness = totalStock(next);
      const context = report
        ? `客群：${customerTypes[report.customerTypeId].name}${report.eventId ? `，事件：${dailyEvents[report.eventId].name}` : ''}`
        : '';

      return {
        game: persist(currentUser, next),
        isAutoRunning: stockAfterBusiness > 0,
        toast:
          stockAfterBusiness === 0
            ? '今天卖完了最后一批货，自动营业已停止。'
            : report
              ? `自动营业：第 ${report.day} 天利润 ${report.profit} 元，满意度 ${report.satisfactionChange > 0 ? '+' : ''}${report.satisfactionChange}。${context}`
              : result.message,
      };
    }),
  toggleAutoRun: () =>
    set(({ game, isAutoRunning }) => {
      if (!isAutoRunning && totalStock(game) === 0) {
        return {
          isAutoRunning: false,
          toast: '货架为空，无法开启自动营业。先补货吧。',
        };
      }

      return {
        isAutoRunning: !isAutoRunning,
        toast: isAutoRunning ? '自动营业已暂停，门口的木牌翻回了准备中。' : '自动营业已开启，小店会按日连续结算。',
      };
    }),
  closeReport: () =>
    set(({ currentUser, game }) => {
      const next = resetReport(game);
      return {
        game: persist(currentUser, next),
      };
    }),
  resetGame: () =>
    set(({ currentUser }) => {
      const game = createInitialState();
      persist(currentUser, game);
      return {
        game,
        isAutoRunning: false,
        selectedSupplierId: 'directMarket',
        selectedMarketProductId: 'bread',
        toast: '小店重新开张，木门铃又响了起来。',
      };
    }),
}));
