import { SYNERGY_TIERS } from '../core/constants';
import type { ActiveSynergy, CardDefinition, CardInstance, SynergyTierId } from '../core/types';

export class SynergySystem {
  public static evaluate(deck: CardInstance[], cardDefinitions: Record<string, CardDefinition>): ActiveSynergy[] {
    const tagCounts = new Map<string, number>();

    for (const card of deck) {
      const definition = cardDefinitions[card.cardId];
      if (!definition) {
        continue;
      }

      for (const tag of definition.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return SYNERGY_TIERS
      .filter((tier) => (tagCounts.get(tier.tag) ?? 0) >= tier.threshold)
      .map((tier) => ({
        id: tier.id,
        tag: tier.tag,
        label: tier.label,
        description: tier.description
      }));
  }

  public static hasTier(active: ActiveSynergy[], tierId: SynergyTierId): boolean {
    return active.some((synergy) => synergy.id === tierId);
  }
}
