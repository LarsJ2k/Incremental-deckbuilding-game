import type { CardDefinition, CardInstance, EffectDescriptor } from '../core/types';
import { createId } from '../utils/helpers';

function cloneEffects(effects: EffectDescriptor[]): EffectDescriptor[] {
  return effects.map((effect) => ({ ...effect }));
}

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  strike: {
    id: 'strike',
    name: 'Strike',
    type: 'attack',
    targetType: 'enemy',
    cost: 1,
    tags: ['physical'],
    maxLevel: 3,
    description: 'Deal 6 damage.',
    effects: [{ type: 'damage', value: 6, target: 'enemy' }],
    levelData: {
      1: {
        description: 'Deal 6 damage.',
        effects: [{ type: 'damage', value: 6, target: 'enemy' }]
      },
      2: {
        description: 'Deal 8 damage.',
        effects: [{ type: 'damage', value: 8, target: 'enemy' }]
      },
      3: {
        description: 'Deal 10 damage.',
        effects: [{ type: 'damage', value: 10, target: 'enemy' }]
      }
    }
  },
  defend: {
    id: 'defend',
    name: 'Defend',
    type: 'defense',
    targetType: 'self',
    cost: 1,
    tags: ['guard'],
    maxLevel: 3,
    description: 'Gain 6 block.',
    effects: [{ type: 'block', value: 6, target: 'self' }],
    levelData: {
      1: {
        description: 'Gain 6 block.',
        effects: [{ type: 'block', value: 6, target: 'self' }]
      },
      2: {
        description: 'Gain 8 block.',
        effects: [{ type: 'block', value: 8, target: 'self' }]
      },
      3: {
        description: 'Gain 11 block.',
        effects: [{ type: 'block', value: 11, target: 'self' }]
      }
    }
  },
  emberSlash: {
    id: 'emberSlash',
    name: 'Ember Slash',
    type: 'attack',
    targetType: 'enemy',
    cost: 1,
    tags: ['fire'],
    maxLevel: 3,
    description: 'Deal 6 damage.',
    effects: [{ type: 'damage', value: 6, target: 'enemy' }],
    levelData: {
      1: {
        description: 'Deal 6 damage.',
        effects: [{ type: 'damage', value: 6, target: 'enemy' }]
      },
      2: {
        description: 'Deal 8 damage. Apply Burn 2.',
        effects: [
          { type: 'damage', value: 8, target: 'enemy' },
          { type: 'status', value: 2, statusType: 'burn', target: 'enemy' }
        ]
      },
      3: {
        description: 'Deal 10 damage. Apply Burn 4.',
        effects: [
          { type: 'damage', value: 10, target: 'enemy' },
          { type: 'status', value: 4, statusType: 'burn', target: 'enemy' }
        ]
      }
    }
  },
  toxinFlask: {
    id: 'toxinFlask',
    name: 'Toxin Flask',
    type: 'skill',
    targetType: 'enemy',
    cost: 1,
    tags: ['poison', 'debuff'],
    maxLevel: 3,
    description: 'Apply Poison 4.',
    effects: [{ type: 'status', value: 4, statusType: 'poison', target: 'enemy' }],
    levelData: {
      1: {
        description: 'Apply Poison 4.',
        effects: [{ type: 'status', value: 4, statusType: 'poison', target: 'enemy' }]
      },
      2: {
        description: 'Apply Poison 6.',
        effects: [{ type: 'status', value: 6, statusType: 'poison', target: 'enemy' }]
      },
      3: {
        description: 'Apply Poison 9.',
        effects: [{ type: 'status', value: 9, statusType: 'poison', target: 'enemy' }]
      }
    }
  },
  weakenShot: {
    id: 'weakenShot',
    name: 'Weakening Shot',
    type: 'skill',
    targetType: 'enemy',
    cost: 1,
    tags: ['debuff'],
    maxLevel: 3,
    description: 'Deal 3 damage and apply Weak 2.',
    effects: [
      { type: 'damage', value: 3, target: 'enemy' },
      { type: 'status', value: 2, statusType: 'weak', target: 'enemy' }
    ],
    levelData: {
      1: {
        description: 'Deal 3 damage and apply Weak 2.',
        effects: [
          { type: 'damage', value: 3, target: 'enemy' },
          { type: 'status', value: 2, statusType: 'weak', target: 'enemy' }
        ]
      },
      2: {
        description: 'Deal 5 damage and apply Weak 2.',
        effects: [
          { type: 'damage', value: 5, target: 'enemy' },
          { type: 'status', value: 2, statusType: 'weak', target: 'enemy' }
        ]
      },
      3: {
        description: 'Deal 6 damage and apply Weak 3.',
        effects: [
          { type: 'damage', value: 6, target: 'enemy' },
          { type: 'status', value: 3, statusType: 'weak', target: 'enemy' }
        ]
      }
    }
  },
  exposeWeakness: {
    id: 'exposeWeakness',
    name: 'Expose Weakness',
    type: 'attack',
    targetType: 'enemy',
    cost: 2,
    tags: ['physical', 'debuff'],
    maxLevel: 3,
    description: 'Deal 8 damage. Apply 2 Vulnerable.',
    effects: [
      { type: 'damage', value: 8, target: 'enemy' },
      { type: 'status', value: 2, statusType: 'vulnerable', target: 'enemy' }
    ],
    levelData: {
      1: {
        description: 'Deal 8 damage. Apply 2 Vulnerable.',
        effects: [
          { type: 'damage', value: 8, target: 'enemy' },
          { type: 'status', value: 2, statusType: 'vulnerable', target: 'enemy' }
        ]
      },
      2: {
        description: 'Deal 10 damage. Apply 2 Vulnerable.',
        effects: [
          { type: 'damage', value: 10, target: 'enemy' },
          { type: 'status', value: 2, statusType: 'vulnerable', target: 'enemy' }
        ]
      },
      3: {
        description: 'Deal 12 damage. Apply 3 Vulnerable.',
        effects: [
          { type: 'damage', value: 12, target: 'enemy' },
          { type: 'status', value: 3, statusType: 'vulnerable', target: 'enemy' }
        ]
      }
    }
  },
  quickStudy: {
    id: 'quickStudy',
    name: 'Quick Study',
    type: 'skill',
    targetType: 'none',
    cost: 0,
    tags: ['utility'],
    maxLevel: 3,
    description: 'Draw 2 cards.',
    effects: [{ type: 'draw', value: 2, target: 'self' }],
    levelData: {
      1: {
        description: 'Draw 2 cards.',
        effects: [{ type: 'draw', value: 2, target: 'self' }]
      },
      2: {
        description: 'Draw 3 cards.',
        effects: [{ type: 'draw', value: 3, target: 'self' }]
      },
      3: {
        description: 'Draw 3 cards. Gain 1 energy.',
        effects: [
          { type: 'draw', value: 3, target: 'self' },
          { type: 'energy', value: 1, target: 'self' }
        ]
      }
    }
  },
  battleFocus: {
    id: 'battleFocus',
    name: 'Battle Focus',
    type: 'skill',
    targetType: 'self',
    cost: 0,
    tags: ['utility'],
    maxLevel: 3,
    description: 'Gain 2 temporary strength this turn.',
    effects: [{ type: 'strength', value: 2, target: 'self' }],
    levelData: {
      1: {
        description: 'Gain 2 temporary strength this turn.',
        effects: [{ type: 'strength', value: 2, target: 'self' }]
      },
      2: {
        description: 'Gain 3 temporary strength this turn.',
        effects: [{ type: 'strength', value: 3, target: 'self' }]
      },
      3: {
        description: 'Gain 4 temporary strength this turn. Draw 1 card.',
        effects: [
          { type: 'strength', value: 4, target: 'self' },
          { type: 'draw', value: 1, target: 'self' }
        ]
      }
    }
  }
};

export function getCardDefinitionForLevel(definition: CardDefinition, level: number): CardDefinition {
  const normalizedLevel = Math.max(1, Math.min(level || 1, definition.maxLevel));
  const levelDefinition = definition.levelData?.[normalizedLevel] ?? definition.levelData?.[1];
  if (!levelDefinition) {
    return {
      ...definition,
      effects: cloneEffects(definition.effects)
    };
  }

  return {
    ...definition,
    cost: levelDefinition.cost ?? definition.cost,
    description: levelDefinition.description,
    effects: cloneEffects(levelDefinition.effects)
  };
}

function createCardInstance(cardId: string): CardInstance {
  return {
    instanceId: createId(cardId),
    cardId,
    level: 1
  };
}

export function createStartingDeck(): CardInstance[] {
  const deck: CardInstance[] = [];

  for (let index = 0; index < 5; index += 1) {
    deck.push(createCardInstance('strike'));
  }

  deck.push(createCardInstance('exposeWeakness'));

  for (let index = 0; index < 5; index += 1) {
    deck.push(createCardInstance('defend'));
  }

  for (let index = 0; index < 5; index += 1) {
    deck.push(createCardInstance('emberSlash'));
  }

  deck.push(createCardInstance('toxinFlask'));
  deck.push(createCardInstance('weakenShot'));
  deck.push(createCardInstance('quickStudy'));
  deck.push(createCardInstance('battleFocus'));

  return deck;
}

export function createRewardCardInstance(): CardInstance {
  return createCardInstance('sparkSurge');
}
