import type { PlayerMetaState, SaveSlotId, SaveSlotSummary } from './types';
import { createStartingDeck } from '../data/cards';
import { CARD_DEFINITIONS } from '../data/cards';
import { applyCardLevelsToCards, getDefaultCardLevels } from '../utils/cardUpgrades';

const STORAGE_PREFIX = 'deckbuilder-roguelite-save-slot';
const SAVE_SLOTS: SaveSlotId[] = [1, 2, 3];

function getStorageKey(slotId: SaveSlotId): string {
  return `${STORAGE_PREFIX}-${slotId}`;
}

function getNowIsoString(): string {
  return new Date().toISOString();
}

function cloneMeta(meta: PlayerMetaState): PlayerMetaState {
  return {
    ...meta,
    unlockedCardIds: [...meta.unlockedCardIds],
    cardLevels: { ...meta.cardLevels },
    ownedCards: meta.ownedCards.map((card) => ({ ...card })),
    currentDeck: meta.currentDeck.map((card) => ({ ...card })),
    suspendedRun: meta.suspendedRun
      ? {
          ...meta.suspendedRun,
          unclaimedRewards: { ...meta.suspendedRun.unclaimedRewards },
          runDeck: meta.suspendedRun.runDeck.map((card) => ({ ...card })),
          temporaryCards: meta.suspendedRun.temporaryCards.map((card) => ({ ...card }))
        }
      : null,
    permanentUpgrades: {
      nodes: [...meta.permanentUpgrades.nodes]
    }
  };
}

function getDefaultUnlockedCardIds(): string[] {
  return ['strike', 'defend', 'emberSlash', 'toxinFlask', 'weakenShot', 'exposeWeakness', 'quickStudy', 'battleFocus'];
}

function isPlayerMetaState(value: unknown): value is Omit<PlayerMetaState, 'suspendedRun'> & Partial<Pick<PlayerMetaState, 'suspendedRun'>> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PlayerMetaState>;
  return (
    typeof candidate.slotId === 'number' &&
    typeof candidate.playerLevel === 'number' &&
    typeof candidate.playerXp === 'number' &&
    typeof candidate.essence === 'number' &&
    typeof candidate.shards === 'number' &&
    Array.isArray(candidate.unlockedCardIds) &&
    (candidate.cardLevels === undefined || typeof candidate.cardLevels === 'object') &&
    Array.isArray(candidate.ownedCards) &&
    Array.isArray(candidate.currentDeck) &&
    typeof candidate.lastPlayedAt === 'string'
  );
}

function normalizeMeta(meta: PlayerMetaState): PlayerMetaState {
  const defaultCardLevels = getDefaultCardLevels(CARD_DEFINITIONS);
  const cardLevels = {
    ...defaultCardLevels,
    ...(meta.cardLevels ?? {})
  };

  return {
    ...meta,
    cardLevels,
    ownedCards: applyCardLevelsToCards(meta.ownedCards, cardLevels),
    currentDeck: applyCardLevelsToCards(meta.currentDeck, cardLevels),
    suspendedRun: meta.suspendedRun
      ? {
          ...meta.suspendedRun,
          runDeck: applyCardLevelsToCards(meta.suspendedRun.runDeck, cardLevels),
          temporaryCards: applyCardLevelsToCards(meta.suspendedRun.temporaryCards, cardLevels)
        }
      : null
  };
}

export class SaveManager {
  public static getSlotIds(): SaveSlotId[] {
    return [...SAVE_SLOTS];
  }

  public static createNewSave(slotId: SaveSlotId): PlayerMetaState {
    const startingDeck = createStartingDeck();
    return {
      slotId,
      playerLevel: 1,
      playerXp: 0,
      essence: 0,
      shards: 0,
      unlockedCardIds: getDefaultUnlockedCardIds(),
      cardLevels: getDefaultCardLevels(CARD_DEFINITIONS),
      ownedCards: startingDeck.map((card) => ({ ...card })),
      currentDeck: startingDeck.map((card) => ({ ...card })),
      suspendedRun: null,
      permanentUpgrades: {
        nodes: []
      },
      lastPlayedAt: getNowIsoString()
    };
  }

  public static loadSlot(slotId: SaveSlotId): PlayerMetaState | null {
    const raw = window.localStorage.getItem(getStorageKey(slotId));
    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPlayerMetaState(parsed)) {
        return null;
      }

      return cloneMeta(normalizeMeta({
        ...parsed,
        suspendedRun: parsed.suspendedRun ?? null
      }));
    } catch {
      return null;
    }
  }

  public static saveSlot(meta: PlayerMetaState): void {
    const payload = cloneMeta(normalizeMeta({
      ...meta,
      lastPlayedAt: getNowIsoString()
    }));
    window.localStorage.setItem(getStorageKey(meta.slotId), JSON.stringify(payload));
  }

  public static loadOrCreateSlot(slotId: SaveSlotId): PlayerMetaState {
    const existing = this.loadSlot(slotId);
    if (existing) {
      return existing;
    }

    const created = this.createNewSave(slotId);
    this.saveSlot(created);
    return created;
  }

  public static getSlotSummaries(): SaveSlotSummary[] {
    return SAVE_SLOTS.map((slotId) => {
      const save = this.loadSlot(slotId);
      if (!save) {
        return {
          slotId,
          isEmpty: true,
          playerLevel: null,
          playerXp: null,
          essence: null,
          shards: null,
          deckSize: null,
          lastPlayedAt: null
        };
      }

      return {
        slotId,
        isEmpty: false,
        playerLevel: save.playerLevel,
        playerXp: save.playerXp,
        essence: save.essence,
        shards: save.shards,
        deckSize: save.currentDeck.length,
        lastPlayedAt: save.lastPlayedAt
      };
    });
  }
}
