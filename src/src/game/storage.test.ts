import { describe, expect, it } from 'vitest';
import { createInitialState } from './initialState';
import { clearGame, loadGame, loadGameForUser, loginUser, registerUser, saveGame, saveGameForUser } from './storage';

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('game storage', () => {
  it('loads initial state when save is empty', () => {
    const storage = createMemoryStorage();

    expect(loadGame(storage).day).toBe(createInitialState().day);
  });

  it('restores a saved game', () => {
    const storage = createMemoryStorage();
    const state = createInitialState();
    state.cash = 777;

    saveGame(state, storage);

    expect(loadGame(storage).cash).toBe(777);
  });

  it('falls back to initial state when save is broken', () => {
    const storage = createMemoryStorage();
    storage.setItem('corner-shop-save-v1', '{broken');

    expect(loadGame(storage).cash).toBe(createInitialState().cash);
  });

  it('clears a saved game', () => {
    const storage = createMemoryStorage();
    const state = createInitialState();
    saveGame(state, storage);

    clearGame(storage);

    expect(storage.length).toBe(0);
  });

  it('uses local accounts without a backend api', async () => {
    const storage = createMemoryStorage();

    const user = await registerUser('mobile-user', '1234', storage);

    await expect(loginUser('mobile-user', '1234', storage)).resolves.toEqual(user);
  });

  it('keeps separate local saves per user', async () => {
    const storage = createMemoryStorage();
    const first = await registerUser('first-user', '1234', storage);
    const second = await registerUser('second-user', '1234', storage);
    const firstState = createInitialState();
    const secondState = createInitialState();
    firstState.cash = 111;
    secondState.cash = 222;

    saveGameForUser(first, firstState, storage);
    saveGameForUser(second, secondState, storage);

    expect(loadGameForUser(first, storage).cash).toBe(111);
    expect(loadGameForUser(second, storage).cash).toBe(222);
  });
});
