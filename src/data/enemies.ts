import type { EnemyCombatState, EnemyDefinition } from '../core/types';
import { scaleEnemyValue } from '../utils/runProgression';

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  {
    id: 'mirror-mite',
    name: 'Mirror Mite',
    maxHp: 46,
    passiveLabel: 'Deflect 3 debuffs',
    mechanicType: 'deflect',
    behavior: {
      type: 'weightedRandom',
      intents: [
        {
          weight: 4,
          intent: {
            id: 'mirror-mite-attack',
            actions: [{ type: 'attack', value: 9 }]
          }
        },
        {
          weight: 3,
          intent: {
            id: 'mirror-mite-defend',
            actions: [{ type: 'defend', value: 8 }]
          }
        },
        {
          weight: 3,
          intent: {
            id: 'mirror-mite-debuff',
            actions: [{ type: 'debuff', value: 2, statusType: 'weak', target: 'player' }]
          }
        }
      ]
    }
  },
  {
    id: 'ember-brute',
    name: 'Ember Brute',
    maxHp: 34,
    passiveLabel: 'Builds Strength through actions',
    mechanicType: 'scaling',
    behavior: {
      type: 'weightedRandom',
      intents: [
        {
          weight: 7,
          intent: {
            id: 'ember-brute-attack-buff',
            actions: [
              { type: 'attack', value: 7 },
              { type: 'buff', value: 2, statType: 'strength', target: 'self' }
            ]
          }
        },
        {
          weight: 3,
          intent: {
            id: 'ember-brute-defend-buff',
            actions: [
              { type: 'defend', value: 8 },
              { type: 'buff', value: 2, statType: 'strength', target: 'self' }
            ]
          }
        }
      ]
    }
  },
  {
    id: 'breaker-drone',
    name: 'Breaker Drone',
    maxHp: 30,
    passiveLabel: 'Applies anti-block debuffs',
    mechanicType: 'antiBlock',
    behavior: {
      type: 'cycle',
      intents: [
        {
          id: 'breaker-drone-debuff',
          actions: [{ type: 'debuff', value: 2, statusType: 'frailBlock', target: 'player' }]
        },
        {
          id: 'breaker-drone-attack',
          actions: [{ type: 'attack', value: 5 }]
        },
        {
          id: 'breaker-drone-defend',
          actions: [{ type: 'defend', value: 10 }]
        }
      ]
    }
  }
];

const ENCOUNTER_DEFINITIONS: ReadonlyArray<ReadonlyArray<string>> = [
  ['mirror-mite'],
  ['breaker-drone', 'ember-brute']
];

export function createEnemyStates(difficultyMultiplier: number = 1): EnemyCombatState[] {
  const definitionById = new Map(ENEMY_DEFINITIONS.map((definition) => [definition.id, definition] as const));
  const encounter = ENCOUNTER_DEFINITIONS[Math.floor(Math.random() * ENCOUNTER_DEFINITIONS.length)] ?? ENCOUNTER_DEFINITIONS[0];
  const definitions = encounter
    .map((enemyId) => definitionById.get(enemyId))
    .filter((definition): definition is EnemyDefinition => definition !== undefined);

  return definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    maxHp: scaleEnemyValue(definition.maxHp, difficultyMultiplier),
    hp: scaleEnemyValue(definition.maxHp, difficultyMultiplier),
    block: 0,
    statuses: {},
    passiveLabel: definition.passiveLabel,
    intentText: '',
    intentActions: [],
    mechanicType: definition.mechanicType,
    behavior: definition.behavior,
    intentStep: 0,
    difficultyMultiplier,
    debuffGuardRemaining: definition.mechanicType === 'deflect' ? 3 : 0,
    strength: 0,
    alive: true
  }));
}
