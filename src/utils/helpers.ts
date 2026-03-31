import type { CardDefinition, CardInstance, DeckMetrics, GroupedCardDisplayItem } from '../core/types';

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getDeckMetrics(deckSize: number): DeckMetrics {
  if (deckSize >= 40) {
    return { deckSize, baseEnergy: 5, cardsToDraw: 7 };
  }

  if (deckSize >= 35) {
    return { deckSize, baseEnergy: 4, cardsToDraw: 7 };
  }

  if (deckSize >= 30) {
    return { deckSize, baseEnergy: 4, cardsToDraw: 6 };
  }

  if (deckSize >= 25) {
    return { deckSize, baseEnergy: 3, cardsToDraw: 6 };
  }

  return { deckSize, baseEnergy: 3, cardsToDraw: 5 };
}

export function formatStatusLabel(statuses: Partial<Record<string, number>>): string {
  const parts = Object.entries(statuses)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .map(([key, value]) => `${capitalize(key)} ${value}`);

  return parts.join(', ');
}

export function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function groupCardInstancesForDisplay(
  cards: CardInstance[],
  definitions: Record<string, CardDefinition>
): GroupedCardDisplayItem[] {
  const grouped = new Map<string, GroupedCardDisplayItem>();

  for (const card of cards) {
    const definition = definitions[card.cardId];
    if (!definition) {
      continue;
    }

    const key = `${card.cardId}:${card.level}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(key, {
      cardId: card.cardId,
      level: card.level,
      count: 1,
      name: definition.name
    });
  }

  return [...grouped.values()].sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.level - right.level;
  });
}
