export type CardType = 'attack' | 'defense' | 'skill';
export type TargetType = 'enemy' | 'self' | 'none';
export type EffectType = 'damage' | 'block' | 'status' | 'draw' | 'strength' | 'energy';
export type StatusEffectType = 'burn' | 'poison' | 'weak' | 'vulnerable' | 'frailBlock';
export type CombatPhase = 'player' | 'enemy' | 'victory' | 'defeat';
export type EnemyActionType = 'attack' | 'defend' | 'buff' | 'debuff';
export type EnemyMechanicType = 'deflect' | 'scaling' | 'antiBlock';
export type SynergyTierId = 'fire-5' | 'fire-10' | 'fire-15';
export type StatusDisplayVariant =
  | 'deflect'
  | 'strength'
  | 'poison'
  | 'weak'
  | 'burn'
  | 'vulnerable'
  | 'blockDown';

export interface EffectDescriptor {
  type: EffectType;
  value: number;
  statusType?: StatusEffectType;
  target?: 'self' | 'enemy' | 'allEnemies';
}

export interface CardLevelDefinition {
  cost?: number;
  description: string;
  effects: EffectDescriptor[];
}

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  targetType: TargetType;
  cost: number;
  tags: string[];
  maxLevel: number;
  description: string;
  effects: EffectDescriptor[];
  levelData?: Partial<Record<number, CardLevelDefinition>>;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  level: number;
}

export type StatusMap = Partial<Record<StatusEffectType, number>>;

export interface PlayerCombatState {
  maxHp: number;
  hp: number;
  block: number;
  energy: number;
  strength: number;
  statuses: StatusMap;
}

export interface EnemyIntentAction {
  type: EnemyActionType;
  value: number;
  statusType?: StatusEffectType;
  statType?: 'strength';
  target?: 'self' | 'player';
}

export interface EnemyIntentDefinition {
  id: string;
  actions: EnemyIntentAction[];
}

export interface WeightedEnemyIntentOption {
  weight: number;
  intent: EnemyIntentDefinition;
}

export interface CycleEnemyBehaviorDefinition {
  type: 'cycle';
  intents: EnemyIntentDefinition[];
}

export interface WeightedEnemyBehaviorDefinition {
  type: 'weightedRandom';
  intents: WeightedEnemyIntentOption[];
}

export type EnemyBehaviorDefinition = CycleEnemyBehaviorDefinition | WeightedEnemyBehaviorDefinition;

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  passiveLabel: string;
  mechanicType: EnemyMechanicType;
  behavior: EnemyBehaviorDefinition;
}

export interface EnemyCombatState {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  block: number;
  statuses: StatusMap;
  passiveLabel: string;
  intentText: string;
  intentActions: EnemyIntentAction[];
  mechanicType: EnemyMechanicType;
  behavior: EnemyBehaviorDefinition;
  intentStep: number;
  difficultyMultiplier: number;
  debuffGuardRemaining: number;
  strength: number;
  alive: boolean;
}

export interface CombatLogEntry {
  id: string;
  text: string;
}

export interface SynergyTier {
  id: SynergyTierId;
  tag: string;
  threshold: number;
  label: string;
  description: string;
}

export interface ActiveSynergy {
  id: SynergyTierId;
  tag: string;
  label: string;
  description: string;
}

export interface DeckMetrics {
  deckSize: number;
  baseEnergy: number;
  cardsToDraw: number;
}

export interface CombatSnapshot {
  phase: CombatPhase;
  turn: number;
  player: PlayerCombatState;
  enemies: EnemyCombatState[];
  hand: CardInstance[];
  deckCards: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  drawPileCount: number;
  discardPileCount: number;
  deckCount: number;
  activeSynergies: ActiveSynergy[];
  logs: CombatLogEntry[];
  selectedCardId: string | null;
  canEndTurn: boolean;
}

export interface PlayCardResult {
  success: boolean;
  reason?: string;
}

export interface RewardOption {
  id: string;
  label: string;
  description: string;
}

export interface RewardBundle {
  xp: number;
  essence: number;
  shards: number;
}

export type SaveSlotId = 1 | 2 | 3;

export interface SuspendedRunState {
  fightIndex: number;
  difficultyMultiplier: number;
  unclaimedRewards: RewardBundle;
  currentHp: number;
  runDeck: CardInstance[];
  temporaryCards: CardInstance[];
  savedAt: string;
}

export interface PermanentUpgradeState {
  nodes: string[];
}

export type CardLevelMap = Record<string, number>;

export interface PlayerMetaState {
  slotId: SaveSlotId;
  playerLevel: number;
  playerXp: number;
  essence: number;
  shards: number;
  unlockedCardIds: string[];
  cardLevels: CardLevelMap;
  ownedCards: CardInstance[];
  currentDeck: CardInstance[];
  suspendedRun: SuspendedRunState | null;
  permanentUpgrades: PermanentUpgradeState;
  lastPlayedAt: string;
}

export interface SaveSlotSummary {
  slotId: SaveSlotId;
  isEmpty: boolean;
  playerLevel: number | null;
  playerXp: number | null;
  essence: number | null;
  shards: number | null;
  deckSize: number | null;
  lastPlayedAt: string | null;
}

export interface RunState {
  fightIndex: number;
  difficultyMultiplier: number;
  unclaimedRewards: RewardBundle;
}

export interface PrototypeSessionState {
  activeSaveSlotId: SaveSlotId | null;
  activeMeta: PlayerMetaState | null;
  run: RunState;
  runDeck: CardInstance[];
  nextCombatBonusCards: CardInstance[];
  carryOverHp: number | null;
}

export interface GroupedCardDisplayItem {
  cardId: string;
  level: number;
  count: number;
  name: string;
}

export interface StatusDisplayItem {
  id: string;
  label: string;
  shortLabel: string;
  value: number;
  tooltipText: string;
  variant: StatusDisplayVariant;
}
