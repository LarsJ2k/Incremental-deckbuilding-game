import type { CardDefinition, CardInstance, CardLevelMap } from '../core/types';

const LEVEL_UP_COSTS: Record<number, number> = {
  2: 50,
  3: 100
};

export function getDefaultCardLevels(definitions: Record<string, CardDefinition>): CardLevelMap {
  const levels: CardLevelMap = {};
  for (const definition of Object.values(definitions)) {
    levels[definition.id] = 1;
  }
  return levels;
}

export function getCardTypeLevel(cardId: string, cardLevels: CardLevelMap | undefined): number {
  const level = cardLevels?.[cardId] ?? 1;
  return Math.max(1, Math.min(level, 3));
}

export function applyCardLevelsToCards(cards: CardInstance[], cardLevels: CardLevelMap | undefined): CardInstance[] {
  return cards.map((card) => ({
    ...card,
    level: getCardTypeLevel(card.cardId, cardLevels)
  }));
}

export function getUpgradeCost(cardId: string, fromLevel: number, toLevel: number): number {
  if (toLevel <= fromLevel) {
    return 0;
  }

  let totalCost = 0;
  for (let nextLevel = fromLevel + 1; nextLevel <= toLevel; nextLevel += 1) {
    totalCost += LEVEL_UP_COSTS[nextLevel] ?? 0;
  }

  return totalCost;
}
