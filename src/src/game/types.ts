export type ProductCategoryId = 'bakery' | 'drink' | 'daily' | 'meal' | 'stationery' | 'lifestyle';
export type ProductId =
  | 'bread'
  | 'redBeanBun'
  | 'croissant'
  | 'drink'
  | 'milk'
  | 'juice'
  | 'daily'
  | 'tissue'
  | 'umbrella'
  | 'lunch'
  | 'riceBall'
  | 'oden'
  | 'stationery'
  | 'notebook'
  | 'pen'
  | 'flower'
  | 'postcard'
  | 'plant';
export type UpgradeId = 'shelf' | 'checkout' | 'decor';
export type CustomerTypeId = 'student' | 'office' | 'neighbor' | 'night';
export type EventId = 'rainy' | 'schoolRush' | 'supplierDiscount' | 'neighborRecommend' | 'queueComplaint';
export type EmployeeSkillId = 'service' | 'restock' | 'charm';
export type SupplierId = 'directMarket' | 'morningBakery' | 'communityWholesale' | 'nightDepot';
export type TutorialStepId = 'welcome' | 'status' | 'supplier' | 'buyStock' | 'runDay' | 'readReport' | 'growth';

export interface UnlockCondition {
  reputation?: number;
  shopLevel?: number;
  decorLevel?: number;
}

export interface ProductCategory {
  id: ProductCategoryId;
  name: string;
  description: string;
}

export interface Product {
  id: ProductId;
  categoryId: ProductCategoryId;
  name: string;
  description: string;
  unitCost: number;
  unitPrice: number;
  baseDemand: number;
  comfortBonus: number;
  unlockCondition?: UnlockCondition;
}

export interface Supplier {
  id: SupplierId;
  name: string;
  description: string;
  suppliedCategories: ProductCategoryId[];
  generalDiscount: number;
  categoryDiscounts: Partial<Record<ProductCategoryId, number>>;
  unlockCondition?: UnlockCondition;
}

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

export interface Employee {
  hired: boolean;
  name: string;
  wage: number;
  serviceBonus: number;
  level: number;
  experience: number;
  skills: Record<EmployeeSkillId, number>;
}

export interface CustomerType {
  id: CustomerTypeId;
  name: string;
  description: string;
  demandMultipliers: Partial<Record<ProductId, number>>;
  categoryMultipliers: Partial<Record<ProductCategoryId, number>>;
  serviceSensitivity: number;
  comfortSensitivity: number;
  stockoutSensitivity: number;
}

export interface DailyEvent {
  id: EventId;
  name: string;
  description: string;
  demandMultipliers: Partial<Record<ProductId, number>>;
  categoryMultipliers?: Partial<Record<ProductCategoryId, number>>;
  customerBias?: CustomerTypeId;
  satisfactionBonus: number;
  reputationMultiplier: number;
}

export interface ShopStage {
  level: number;
  name: string;
  description: string;
  requiredCash: number;
  requiredReputation: number;
}

export interface InventoryItem {
  stock: number;
  capacity: number;
}

export type Inventory = Record<ProductId, InventoryItem>;
export type UpgradeLevels = Record<UpgradeId, number>;
export type SupplierStock = Record<SupplierId, Partial<Record<ProductId, number>>>;

export interface MarketPoint {
  day: number;
  price: number;
}

export interface ProductMarketState {
  currentPrice: number;
  previousPrice: number;
  history: MarketPoint[];
}

export interface MarketState {
  products: Record<ProductId, ProductMarketState>;
}

export interface DailyProductResult {
  productId: ProductId;
  demand: number;
  sold: number;
  missed: number;
  revenue: number;
}

export interface DailyReport {
  day: number;
  revenue: number;
  wages: number;
  profit: number;
  satisfactionChange: number;
  reputationChange: number;
  products: DailyProductResult[];
  messages: string[];
  customerTypeId: CustomerTypeId;
  eventId: EventId | null;
  categoryDiversity: number;
  insight: string;
}

export interface GameState {
  day: number;
  cash: number;
  reputation: number;
  satisfaction: number;
  shopLevel: number;
  inventory: Inventory;
  supplierStock: SupplierStock;
  market: MarketState;
  upgrades: UpgradeLevels;
  employee: Employee;
  lastDailyReport: DailyReport | null;
}

export interface TutorialState {
  currentStepId: TutorialStepId;
  completedStepIds: TutorialStepId[];
  dismissed: boolean;
  collapsed: boolean;
}

export interface ActionResult {
  ok: boolean;
  state: GameState;
  message: string;
}

export interface BusinessDayOptions {
  customerTypeId?: CustomerTypeId;
  eventId?: EventId | null;
}
