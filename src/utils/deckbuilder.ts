import { SYNERGY_TIERS } from '../core/constants';
import type { CardDefinition, CardInstance, GroupedCardDisplayItem } from '../core/types';
import type { TooltipLine } from '../ui/StatusTooltip';

export interface GroupedDeckEntry extends GroupedCardDisplayItem {
  representativeCard: CardInstance;
}

export interface GroupedCollectionEntry extends GroupedCardDisplayItem {
  representativeCard: CardInstance;
}

export interface SynergyProgressDisplayItem {
  key: string;
  label: string;
  displayText: string;
  tooltipLines: TooltipLine[];
}

export function getAvailableOwnedCards(ownedCards: CardInstance[], currentDeck: CardInstance[]): CardInstance[] {
  const deckCounts = new Map<string, number>();

  for (const card of currentDeck) {
    const key = `${card.cardId}:${card.level}`;
    deckCounts.set(key, (deckCounts.get(key) ?? 0) + 1);
  }

  const available: CardInstance[] = [];
  for (const card of ownedCards) {
    const key = `${card.cardId}:${card.level}`;
    const remainingInDeck = deckCounts.get(key) ?? 0;
    if (remainingInDeck > 0) {
      deckCounts.set(key, remainingInDeck - 1);
      continue;
    }

    available.push({ ...card });
  }

  return available;
}

export function groupAvailableOwnedCards(
  ownedCards: CardInstance[],
  currentDeck: CardInstance[],
  definitions: Record<string, CardDefinition>
): GroupedCollectionEntry[] {
  const available = getAvailableOwnedCards(ownedCards, currentDeck);
  const grouped = new Map<string, GroupedCollectionEntry>();

  for (const card of available) {
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
      name: definition.name,
      representativeCard: { ...card }
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

export function groupDeckEntries(cards: CardInstance[], definitions: Record<string, CardDefinition>): GroupedDeckEntry[] {
  const grouped = new Map<string, GroupedDeckEntry>();

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
      name: definition.name,
      representativeCard: { ...card }
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

export function isDeckSaveValid(cards: CardInstance[]): { valid: boolean; message: string | null } {
  if (cards.length < 20) {
    return {
      valid: false,
      message: 'Deck must contain at least 20 cards.'
    };
  }

  return {
    valid: true,
    message: null
  };
}

export function haveDecksChanged(left: CardInstance[], right: CardInstance[]): boolean {
  if (left.length !== right.length) {
    return true;
  }

  const leftIds = left.map((card) => card.instanceId).sort();
  const rightIds = right.map((card) => card.instanceId).sort();
  return leftIds.some((id, index) => id !== rightIds[index]);
}

export function buildSynergyProgress(
  cards: CardInstance[],
  definitions: Record<string, CardDefinition>
): SynergyProgressDisplayItem[] {
  const tagCounts = new Map<string, number>();
  for (const card of cards) {
    const definition = definitions[card.cardId];
    if (!definition) {
      continue;
    }

    for (const tag of definition.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const tiersByTag = new Map<string, typeof SYNERGY_TIERS>();
  for (const tier of SYNERGY_TIERS) {
    const existing = tiersByTag.get(tier.tag) ?? [];
    tiersByTag.set(tier.tag, [...existing, tier]);
  }

  return [...tiersByTag.entries()].map(([tag, tiers]) => {
    const count = tagCounts.get(tag) ?? 0;
    const tagLabel = `${tag[0]?.toUpperCase() ?? ''}${tag.slice(1)}`;
    const nextTier = tiers.find((tier) => count < tier.threshold);
    const displayThreshold = nextTier?.threshold ?? tiers[tiers.length - 1]?.threshold ?? count;
    const tooltipLines: TooltipLine[] = [
      { text: `${tagLabel} cards in deck: ${count}` },
      ...tiers.flatMap((tier, index) => {
        const achieved = count >= tier.threshold;
        return [
          {
            text: `Tier ${index + 1} (${count}/${tier.threshold})`,
            color: achieved ? '#22c55e' : '#e2e8f0'
          },
          {
            text: tier.description,
            color: achieved ? '#22c55e' : '#e2e8f0'
          }
        ];
      })
    ];

    return {
      key: tag,
      label: tagLabel,
      displayText: `${tagLabel} ${count}/${displayThreshold}`,
      tooltipLines
    };
  });
}
