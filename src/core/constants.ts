import type { RewardBundle, RewardOption, SynergyTier } from './types';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_MAX_HP = 70;
export const HAND_LIMIT = 10;
export const MAX_LOG_ENTRIES = 8;

export const REWARD_OPTIONS: RewardOption[] = [
  {
    id: 'gold',
    label: 'Gain 50 Gold',
    description: 'Adds 50 mock gold to the in-memory prototype state.'
  },
  {
    id: 'spark',
    label: 'Add Spark Surge',
    description: 'Adds a temporary fire attack to the next combat.'
  },
  {
    id: 'heal',
    label: 'Heal 10 HP',
    description: 'Heals the player before the next combat begins.'
  }
];

export const BASE_FIGHT_REWARDS: RewardBundle = {
  xp: 100,
  essence: 40,
  shards: 10
};

export const SYNERGY_TIERS: SynergyTier[] = [
  {
    id: 'fire-5',
    tag: 'fire',
    threshold: 5,
    label: 'Fire I',
    description: '+33% damage from fire-tagged attacks.'
  },
  {
    id: 'fire-10',
    tag: 'fire',
    threshold: 10,
    label: 'Fire II',
    description: 'Fire cards also apply Burn 2.'
  },
  {
    id: 'fire-15',
    tag: 'fire',
    threshold: 15,
    label: 'Fire III',
    description: 'Fire attacks splash 3 damage to all enemies.'
  }
];
