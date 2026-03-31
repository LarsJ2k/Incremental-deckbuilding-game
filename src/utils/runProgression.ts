import { BASE_FIGHT_REWARDS } from '../core/constants';
import type { RewardBundle, RunState } from '../core/types';

export function createEmptyRewardBundle(): RewardBundle {
  return {
    xp: 0,
    essence: 0,
    shards: 0
  };
}

export function cloneRewardBundle(bundle: RewardBundle): RewardBundle {
  return {
    xp: bundle.xp,
    essence: bundle.essence,
    shards: bundle.shards
  };
}

export function getDifficultyMultiplier(fightIndex: number): number {
  return 1 + 0.1 * (fightIndex ** 1.5);
}

export function scaleEnemyValue(baseValue: number, multiplier: number): number {
  return Math.max(0, Math.floor(baseValue * multiplier));
}

export function scaleRewardBundle(baseRewards: RewardBundle, multiplier: number): RewardBundle {
  return {
    xp: Math.floor(baseRewards.xp * multiplier),
    essence: Math.floor(baseRewards.essence * multiplier),
    shards: Math.floor(baseRewards.shards * multiplier)
  };
}

export function addRewardBundles(left: RewardBundle, right: RewardBundle): RewardBundle {
  return {
    xp: left.xp + right.xp,
    essence: left.essence + right.essence,
    shards: left.shards + right.shards
  };
}

export function halveRewardBundle(bundle: RewardBundle): RewardBundle {
  return {
    xp: Math.floor(bundle.xp * 0.5),
    essence: Math.floor(bundle.essence * 0.5),
    shards: Math.floor(bundle.shards * 0.5)
  };
}

export function createInitialRunState(): RunState {
  return {
    fightIndex: 0,
    difficultyMultiplier: getDifficultyMultiplier(0),
    unclaimedRewards: createEmptyRewardBundle()
  };
}

export function getScaledFightRewards(multiplier: number): RewardBundle {
  return scaleRewardBundle(BASE_FIGHT_REWARDS, multiplier);
}
