import type { UpgradeId } from './types';

export const STARTING_CASH = 180;
export const STARTING_SATISFACTION = 62;
export const STARTING_REPUTATION = 0;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function upgradeCost(upgradeId: UpgradeId, currentLevel: number) {
  const base = upgradeId === 'checkout' ? 1200 : upgradeId === 'decor' ? 1000 : 900;
  return Math.round(base * (1 + currentLevel * 0.72));
}

export function restockCapacity(shelfLevel: number) {
  return 18 + shelfLevel * 8;
}

export function serviceCapacity(checkoutLevel: number, employeeBonus: number) {
  return 18 + checkoutLevel * 6 + employeeBonus;
}

export function comfortScore(decorLevel: number, shopLevel: number) {
  return 8 + decorLevel * 7 + shopLevel * 4;
}
