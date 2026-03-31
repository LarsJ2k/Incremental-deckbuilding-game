import type { EnemyCombatState, EnemyIntentAction, WeightedEnemyIntentOption } from '../core/types';
import { getResolvedEnemyActionValue, getResolvedEnemyAttackValue } from '../utils/combatMath';

function chooseWeightedIntent(options: WeightedEnemyIntentOption[]): EnemyIntentAction[] {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  const roll = Math.random() * totalWeight;
  let runningWeight = 0;

  for (const option of options) {
    runningWeight += option.weight;
    if (roll < runningWeight) {
      return option.intent.actions.map((action) => ({ ...action }));
    }
  }

  const fallback = options[options.length - 1];
  return fallback ? fallback.intent.actions.map((action) => ({ ...action })) : [];
}

function formatActions(enemy: EnemyCombatState, actions: EnemyIntentAction[]): string {
  return actions
    .map((action) => {
      if (action.type === 'attack') {
        return `Attack ${getResolvedEnemyAttackValue(
          action.value,
          enemy.strength,
          enemy.statuses.weak ?? 0,
          enemy.difficultyMultiplier
        )}`;
      }

      if (action.type === 'defend') {
        return `Defend ${getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier)}`;
      }

      if (action.type === 'buff' && action.statType === 'strength') {
        return `Gain ${getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier)} Strength`;
      }

      if (action.type === 'debuff' && action.statusType === 'weak') {
        return `Apply Weak ${getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier)}`;
      }

      if (action.type === 'debuff' && action.statusType === 'frailBlock') {
        return `Apply Shatter ${getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier)}`;
      }

      return '';
    })
    .filter((text) => text.length > 0)
    .join(' + ');
}

export class EnemyAI {
  public static chooseNextIntent(enemy: EnemyCombatState): { text: string; actions: EnemyIntentAction[]; nextIntentStep: number } {
    let actions: EnemyIntentAction[] = [];
    let nextIntentStep = enemy.intentStep;

    if (enemy.behavior.type === 'cycle') {
      const intent = enemy.behavior.intents[enemy.intentStep % enemy.behavior.intents.length];
      actions = intent ? intent.actions.map((action) => ({ ...action })) : [];
      nextIntentStep += 1;
    } else {
      actions = chooseWeightedIntent(enemy.behavior.intents);
    }

    return {
      text: formatActions(enemy, actions),
      actions,
      nextIntentStep
    };
  }

  public static getIntentText(enemy: EnemyCombatState, actions: EnemyIntentAction[]): string {
    return formatActions(enemy, actions);
  }
}
