import { createInitialState } from './initialState';
import type { GameState } from './types';

const STORAGE_KEY = 'corner-shop-save-v1';
const SESSION_KEY = 'corner-shop-session-v1';
const LOCAL_USERS_KEY = 'corner-shop-local-users-v1';

export interface UserSession {
  id: number;
  username: string;
}

interface LocalUserRecord {
  id: number;
  password: string;
  username: string;
}

function getBrowserStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function gameKey(userId?: number) {
  return userId ? `${STORAGE_KEY}:user:${userId}` : STORAGE_KEY;
}

function loadLocalUsers(storage: Storage | null = getBrowserStorage()): LocalUserRecord[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUserRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUserRecord[], storage: Storage | null = getBrowserStorage()) {
  storage?.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function toSession(user: LocalUserRecord): UserSession {
  return { id: user.id, username: user.username };
}

function localRegister(username: string, password: string, storage: Storage | null = getBrowserStorage()): UserSession {
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 2) {
    throw new Error('用户名至少需要 2 个字符');
  }
  if (password.length < 4) {
    throw new Error('密码至少需要 4 个字符');
  }

  const users = loadLocalUsers(storage);
  if (users.some((user) => user.username === trimmedUsername)) {
    throw new Error('用户名已存在');
  }

  const nextId = users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1_000_000;
  const user = { id: nextId, password, username: trimmedUsername };
  saveLocalUsers([...users, user], storage);
  return toSession(user);
}

function localLogin(username: string, password: string, storage: Storage | null = getBrowserStorage()): UserSession {
  const trimmedUsername = username.trim();
  const user = loadLocalUsers(storage).find((item) => item.username === trimmedUsername);
  if (!user || user.password !== password) {
    throw new Error('用户名或密码错误');
  }
  return toSession(user);
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const state = value as Partial<GameState>;
  return (
    typeof state.day === 'number' &&
    typeof state.cash === 'number' &&
    typeof state.reputation === 'number' &&
    typeof state.satisfaction === 'number' &&
    typeof state.shopLevel === 'number' &&
    Boolean(state.inventory) &&
    Boolean(state.upgrades) &&
    Boolean(state.employee)
  );
}

export function migrateGameState(saved: GameState): GameState {
  const initial = createInitialState();
  return {
    ...initial,
    ...saved,
    inventory: {
      ...initial.inventory,
      ...saved.inventory,
    },
    supplierStock: {
      ...initial.supplierStock,
      ...saved.supplierStock,
    },
    market: {
      ...initial.market,
      ...saved.market,
      products: {
        ...initial.market.products,
        ...saved.market?.products,
      },
    },
    upgrades: {
      ...initial.upgrades,
      ...saved.upgrades,
    },
    employee: {
      ...initial.employee,
      ...saved.employee,
      skills: {
        ...initial.employee.skills,
        ...saved.employee?.skills,
      },
    },
    lastDailyReport: saved.lastDailyReport
      ? {
          ...saved.lastDailyReport,
          customerTypeId: saved.lastDailyReport.customerTypeId ?? 'neighbor',
          eventId: saved.lastDailyReport.eventId ?? null,
          insight: saved.lastDailyReport.insight ?? '旧存档的结算记录已保留，新的经营观察会从下一天开始生成。',
        }
      : null,
  };
}

export function parseGameState(value: unknown): GameState | null {
  return isGameState(value) ? migrateGameState(value) : null;
}

export function loadSession(storage: Storage | null = getBrowserStorage()): UserSession | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession, storage: Storage | null = getBrowserStorage()) {
  storage?.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage: Storage | null = getBrowserStorage()) {
  storage?.removeItem(SESSION_KEY);
}

export function loadGame(storage: Storage | null = getBrowserStorage()): GameState {
  return loadGameByKey(gameKey(), storage);
}

export function saveGame(state: GameState, storage: Storage | null = getBrowserStorage()) {
  saveGameByKey(gameKey(), state, storage);
}

export function loadGameForUser(user: UserSession, storage: Storage | null = getBrowserStorage()): GameState {
  return loadGameByKey(gameKey(user.id), storage);
}

export function saveGameForUser(user: UserSession, state: GameState, storage: Storage | null = getBrowserStorage()) {
  saveGameByKey(gameKey(user.id), state, storage);
}

export function clearGame(storage: Storage | null = getBrowserStorage()) {
  storage?.removeItem(gameKey());
}

function loadGameByKey(key: string, storage: Storage | null): GameState {
  if (!storage) {
    return createInitialState();
  }
  try {
    const raw = storage.getItem(key);
    return raw ? parseGameState(JSON.parse(raw) as unknown) ?? createInitialState() : createInitialState();
  } catch {
    return createInitialState();
  }
}

function saveGameByKey(key: string, state: GameState, storage: Storage | null) {
  storage?.setItem(key, JSON.stringify(state));
}

export async function registerUser(
  username: string,
  password: string,
  storage: Storage | null = getBrowserStorage(),
): Promise<UserSession> {
  return localRegister(username, password, storage);
}

export async function loginUser(
  username: string,
  password: string,
  storage: Storage | null = getBrowserStorage(),
): Promise<UserSession> {
  return localLogin(username, password, storage);
}
