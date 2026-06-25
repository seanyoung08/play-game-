import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from './initialState';
import { useGameStore } from './useGameStore';

describe('useGameStore automation', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: createInitialState(),
      isAutoRunning: false,
      selectedSupplierId: 'directMarket',
      selectedMarketProductId: 'bread',
      tutorial: {
        currentStepId: 'welcome',
        completedStepIds: [],
        dismissed: false,
        collapsed: false,
      },
      toast: '',
    });
  });

  it('toggles automatic business days', () => {
    useGameStore.getState().toggleAutoRun();

    expect(useGameStore.getState().isAutoRunning).toBe(true);

    useGameStore.getState().toggleAutoRun();

    expect(useGameStore.getState().isAutoRunning).toBe(false);
  });

  it('stops automation when the game resets', () => {
    useGameStore.setState({ isAutoRunning: true });

    useGameStore.getState().resetGame();

    expect(useGameStore.getState().isAutoRunning).toBe(false);
  });

  it('keeps manual business reports visible', () => {
    useGameStore.getState().runDay();

    expect(useGameStore.getState().game.lastDailyReport).not.toBeNull();
  });

  it('does not open a report after an automatic business day', () => {
    useGameStore.getState().runAutoDay();

    expect(useGameStore.getState().game.lastDailyReport).toBeNull();
    expect(useGameStore.getState().toast).toContain('自动');
  });

  it('does not start automation when shelves are empty', () => {
    const game = createInitialState();
    game.inventory.bread.stock = 0;
    game.inventory.drink.stock = 0;
    game.inventory.daily.stock = 0;
    useGameStore.setState({ game });

    useGameStore.getState().toggleAutoRun();

    expect(useGameStore.getState().isAutoRunning).toBe(false);
  });

  it('stops automation when automatic sales empty the shelves', () => {
    const game = createInitialState();
    game.inventory.bread.stock = 1;
    game.inventory.drink.stock = 0;
    game.inventory.daily.stock = 0;
    useGameStore.setState({ game, isAutoRunning: true });

    useGameStore.getState().runAutoDay();

    expect(useGameStore.getState().isAutoRunning).toBe(false);
    expect(useGameStore.getState().game.inventory.bread.stock).toBe(0);
  });

  it('trains the employee through the store action', () => {
    const game = createInitialState();
    game.cash = 500;
    useGameStore.setState({ game });
    useGameStore.getState().hireEmployee();
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        employee: {
          ...useGameStore.getState().game.employee,
          experience: 30,
        },
      },
    });

    useGameStore.getState().trainEmployee('service');

    expect(useGameStore.getState().game.employee.skills.service).toBe(1);
  });

  it('selects a supplier and uses it for purchasing', () => {
    const game = createInitialState();
    game.cash = 1000;
    useGameStore.setState({ game, selectedSupplierId: 'directMarket' });

    useGameStore.getState().selectSupplier('morningBakery');
    useGameStore.getState().buyStock('bread', 5);

    expect(useGameStore.getState().selectedSupplierId).toBe('morningBakery');
    expect(useGameStore.getState().game.cash).toBe(1000 - Math.ceil(5 * 4 * 0.9));
  });

  it('resets the selected supplier', () => {
    useGameStore.setState({ selectedSupplierId: 'morningBakery' });

    useGameStore.getState().resetGame();

    expect(useGameStore.getState().selectedSupplierId).toBe('directMarket');
  });

  it('selects and refreshes a market product', () => {
    useGameStore.getState().selectMarketProduct('drink');
    useGameStore.getState().refreshMarket();

    expect(useGameStore.getState().selectedMarketProductId).toBe('drink');
    expect(useGameStore.getState().game.market.products.drink.history.length).toBe(2);
  });

  it('sells stock through the store action', () => {
    const game = createInitialState();
    game.cash = 100;
    game.inventory.bread.stock = 10;
    game.market.products.bread.currentPrice = 10;
    useGameStore.setState({ game });

    useGameStore.getState().sellStock('bread', 4);

    expect(useGameStore.getState().game.inventory.bread.stock).toBe(6);
    expect(useGameStore.getState().game.cash).toBe(134);
  });

  it('resets selected market product', () => {
    useGameStore.setState({ selectedMarketProductId: 'drink' });

    useGameStore.getState().resetGame();

    expect(useGameStore.getState().selectedMarketProductId).toBe('bread');
  });

  it('starts the tutorial for new players', () => {
    expect(useGameStore.getState().tutorial.currentStepId).toBe('welcome');
    expect(useGameStore.getState().tutorial.dismissed).toBe(false);
  });

  it('advances the tutorial after buying stock', () => {
    const game = createInitialState();
    game.cash = 1000;
    useGameStore.setState({ game, tutorial: { currentStepId: 'buyStock', completedStepIds: [], dismissed: false, collapsed: false } });

    useGameStore.getState().buyStock('bread', 5);

    expect(useGameStore.getState().tutorial.completedStepIds).toContain('buyStock');
    expect(useGameStore.getState().tutorial.currentStepId).toBe('runDay');
  });

  it('advances the tutorial after running a business day', () => {
    useGameStore.setState({ tutorial: { currentStepId: 'runDay', completedStepIds: [], dismissed: false, collapsed: false } });

    useGameStore.getState().runDay();

    expect(useGameStore.getState().tutorial.completedStepIds).toContain('runDay');
    expect(useGameStore.getState().tutorial.currentStepId).toBe('readReport');
  });

  it('keeps the tutorial hidden after dismissal', () => {
    useGameStore.getState().dismissTutorial();
    useGameStore.getState().buyStock('bread', 5);

    expect(useGameStore.getState().tutorial.dismissed).toBe(true);
  });
});
