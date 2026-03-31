import type { CardDefinition, EnemyCombatState, PlayerCombatState } from '../core/types';
import { getCardDefinitionForLevel } from '../data/cards';
import { scaleEnemyValue } from './runProgression';

export function getResolvedEnemyActionValue(baseValue: number, difficultyMultiplier: number = 1): number {
  return scaleEnemyValue(baseValue, difficultyMultiplier);
}

export function getResolvedOutgoingAttackValue(baseDamage: number, strength: number, weakStacks: number): number {
  const boostedDamage = Math.max(0, baseDamage + strength);
  if (weakStacks <= 0) {
    return boostedDamage;
  }

  return Math.max(0, Math.floor(boostedDamage * 0.5));
}

export function applyVulnerableModifier(amount: number, vulnerableStacks: number): number {
  if (vulnerableStacks <= 0) {
    return amount;
  }

  return Math.max(0, Math.ceil(amount * 1.5));
}

export function getResolvedEnemyAttackValue(
  baseDamage: number,
  strength: number,
  weakStacks: number,
  difficultyMultiplier: number = 1
): number {
  const scaledBaseDamage = getResolvedEnemyActionValue(baseDamage, difficultyMultiplier);
  return getResolvedOutgoingAttackValue(scaledBaseDamage, strength, weakStacks);
}

export interface CardPreviewValues {
  baseValue: number;
  modifiedValue: number;
  alwaysShowModifiedValue?: boolean;
}

export function getResolvedPlayerBlockGain(baseBlock: number, frailBlockStacks: number): number {
  if (frailBlockStacks <= 0) {
    return Math.max(0, baseBlock);
  }

  return Math.max(0, Math.floor(baseBlock * 0.5));
}

export function getCardPreviewValues(
  definition: CardDefinition,
  level: number,
  playerState: Pick<PlayerCombatState, 'strength' | 'statuses'>,
  targetState?: Pick<EnemyCombatState, 'statuses'>,
  fireTier: number = 0
): CardPreviewValues | null {
  const resolvedDefinition = getCardDefinitionForLevel(definition, level);
  const damageEffect = resolvedDefinition.effects.find((effect) => effect.type === 'damage' && effect.target === 'enemy');
  if (damageEffect) {
    let modifiedDamage = damageEffect.value;
    if (fireTier >= 1 && resolvedDefinition.tags.includes('fire')) {
      modifiedDamage = Math.ceil(modifiedDamage * 1.33);
    }
    modifiedDamage = Math.max(0, modifiedDamage + playerState.strength);
    const vulnerableStacks = targetState?.statuses.vulnerable ?? 0;
    modifiedDamage = applyVulnerableModifier(modifiedDamage, vulnerableStacks);

    return {
      baseValue: damageEffect.value,
      modifiedValue: modifiedDamage,
      alwaysShowModifiedValue: fireTier >= 1 && resolvedDefinition.tags.includes('fire')
    };
  }

  const blockEffect = resolvedDefinition.effects.find((effect) => effect.type === 'block' && effect.target === 'self');
  if (!blockEffect) {
    return null;
  }

  const modifiedBlock = getResolvedPlayerBlockGain(blockEffect.value, playerState.statuses.frailBlock ?? 0);

  return {
    baseValue: blockEffect.value,
    modifiedValue: modifiedBlock
  };
}
