import { create } from 'zustand';
import { customerTypes, dailyEvents } from './catalog';
import { createInitialState } from './initialState';
import { buyStock, buyUpgrade, hireEmployee, refreshMarket, resetReport, runBusinessDay, sellStock, trainEmployee } from './rules';
import {
  clearSession,
  loadGame,
  loadGameForUser,
  loadSession,
  loadTutorialForUser,
  loginUser,
  registerUser,
  saveGame,
  saveGameForUser,
  saveSession,
  saveTutorialForUser,
  type UserSession,
} from './storage';
import type { EmployeeSkillId, GameState, ProductId, SupplierId, TutorialState, TutorialStepId, UpgradeId } from './types';

const tutorialFlow: TutorialStepId[] = ['welcome', 'status', 'supplier', 'buyStock', 'runDay', 'readReport', 'growth'];

interface GameStore {
  game: GameState;
  tutorial: TutorialState;
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
  completeTutorialStep: (stepId: TutorialStepId) => void;
  dismissTutorial: () => void;
  restartTutorial: () => void;
  toggleTutorialCollapsed: () => void;
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

function persistTutorial(user: UserSession | null, tutorial: TutorialState) {
  saveTutorialForUser(user, tutorial);
  return tutorial;
}

function advanceTutorial(tutorial: TutorialState, stepId: TutorialStepId): TutorialState {
  if (tutorial.dismissed || tutorial.completedStepIds.includes(stepId)) {
    return tutorial;
  }

  const completedStepIds = [...tutorial.completedStepIds, stepId];
  const currentIndex = tutorialFlow.indexOf(tutorial.currentStepId);
  const completedIndex = tutorialFlow.indexOf(stepId);
  const nextStepId = tutorialFlow.find((candidate, index) => index > Math.max(currentIndex, completedIndex) && !completedStepIds.includes(candidate));

  return {
    ...tutorial,
    currentStepId: nextStepId ?? 'growth',
    completedStepIds,
  };
}

const initialUser = loadSession();

export const useGameStore = create<GameStore>((set, get) => ({
  game: loadUserGame(initialUser),
  tutorial: loadTutorialForUser(initialUser),
  toast: initialUser ? `欢迎回来，${initialUser.username}。` : '请先登录，打开属于你的街角小店。',
  isAutoRunning: false,
  currentUser: initialUser,
  selectedSupplierId: 'directMarket',
  selectedMarketProductId: 'bread',
  login: async (username, password) => {
    const user = await loginUser(username, password);
    saveSession(user);
    const game = loadGameForUser(user);
    set({ currentUser: user, game, tutorial: loadTutorialForUser(user), toast: `欢迎回来，${user.username}。` });
  },
  register: async (username, password) => {
    const user = await registerUser(username, password);
    saveSession(user);
    const game = createInitialState();
    saveGameForUser(user, game);
    set({ currentUser: user, game, tutorial: loadTutorialForUser(user), toast: `欢迎开店，${user.username}。` });
  },
  logout: () => {
    clearSession();
    set({
      currentUser: null,
      game: createInitialState(),
      tutorial: loadTutorialForUser(null),
      isAutoRunning: false,
      selectedSupplierId: 'directMarket',
      selectedMarketProductId: 'bread',
      toast: '已退出登录。',
    });
  },
  selectSupplier: (supplierId) =>
    set(({ currentUser, tutorial }) => ({
      selectedSupplierId: supplierId,
      tutorial: persistTutorial(currentUser, advanceTutorial(tutorial, 'supplier')),
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
    set(({ currentUser, game, selectedSupplierId, tutorial }) => {
      const result = buyStock(game, productId, quantity, selectedSupplierId);
      return {
        game: result.ok ? persist(currentUser, result.state) : game,
        tutorial: result.ok ? persistTutorial(currentUser, advanceTutorial(tutorial, 'buyStock')) : tutorial,
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
    set(({ currentUser, game, tutorial }) => {
      const result = runBusinessDay(game);
      return {
        game: persist(currentUser, result.state),
        tutorial: persistTutorial(currentUser, advanceTutorial(tutorial, 'runDay')),
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
    set(({ currentUser, game, tutorial }) => {
      const next = resetReport(game);
      return {
        game: persist(currentUser, next),
        tutorial: persistTutorial(currentUser, advanceTutorial(tutorial, 'readReport')),
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
  completeTutorialStep: (stepId) =>
    set(({ currentUser, tutorial }) => ({
      tutorial: persistTutorial(currentUser, advanceTutorial(tutorial, stepId)),
    })),
  dismissTutorial: () =>
    set(({ currentUser, tutorial }) => ({
      tutorial: persistTutorial(currentUser, { ...tutorial, dismissed: true }),
    })),
  restartTutorial: () =>
    set(({ currentUser }) => {
      const tutorial: TutorialState = {
        currentStepId: 'welcome',
        completedStepIds: [],
        dismissed: false,
        collapsed: false,
      };
      return {
        tutorial: persistTutorial(currentUser, tutorial),
      };
    }),
  toggleTutorialCollapsed: () =>
    set(({ currentUser, tutorial }) => ({
      tutorial: persistTutorial(currentUser, { ...tutorial, collapsed: !tutorial.collapsed }),
    })),
}));
