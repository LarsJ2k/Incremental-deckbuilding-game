import { PLAYER_MAX_HP } from './constants';
import { SaveManager } from './SaveManager';
import type { CardInstance, PlayerMetaState, PrototypeSessionState, RewardBundle, SaveSlotId, SuspendedRunState } from './types';
import {
  addRewardBundles,
  cloneRewardBundle,
  createInitialRunState,
  getDifficultyMultiplier,
  getScaledFightRewards,
  halveRewardBundle
} from '../utils/runProgression';
import { applyCardLevelsToCards, getCardTypeLevel } from '../utils/cardUpgrades';
import { CARD_DEFINITIONS } from '../data/cards';

const initialState: PrototypeSessionState = {
  activeSaveSlotId: null,
  activeMeta: null,
  run: createInitialRunState(),
  runDeck: [],
  nextCombatBonusCards: [],
  carryOverHp: PLAYER_MAX_HP
};

function cloneMeta(meta: PlayerMetaState | null): PlayerMetaState | null {
  if (!meta) {
    return null;
  }

  return {
    ...meta,
    unlockedCardIds: [...meta.unlockedCardIds],
    cardLevels: { ...meta.cardLevels },
    ownedCards: meta.ownedCards.map((card) => ({ ...card })),
    currentDeck: meta.currentDeck.map((card) => ({ ...card })),
    suspendedRun: meta.suspendedRun
      ? {
          ...meta.suspendedRun,
          unclaimedRewards: cloneRewardBundle(meta.suspendedRun.unclaimedRewards),
          runDeck: meta.suspendedRun.runDeck.map((card) => ({ ...card })),
          temporaryCards: meta.suspendedRun.temporaryCards.map((card) => ({ ...card }))
        }
      : null,
    permanentUpgrades: {
      nodes: [...meta.permanentUpgrades.nodes]
    }
  };
}

function getLevelFromXp(playerXp: number): number {
  return 1 + Math.floor(playerXp / 100);
}

export class SessionState {
  private state: PrototypeSessionState = {
    ...initialState
  };

  public resetRuntime(): void {
    this.state = {
      ...initialState,
      activeSaveSlotId: this.state.activeSaveSlotId,
      activeMeta: cloneMeta(this.state.activeMeta),
      runDeck: this.state.runDeck.map((card) => ({ ...card }))
    };
  }

  public getState(): PrototypeSessionState {
    return {
      activeSaveSlotId: this.state.activeSaveSlotId,
      activeMeta: cloneMeta(this.state.activeMeta),
      run: {
        fightIndex: this.state.run.fightIndex,
        difficultyMultiplier: this.state.run.difficultyMultiplier,
        unclaimedRewards: cloneRewardBundle(this.state.run.unclaimedRewards)
      },
      runDeck: this.state.runDeck.map((card) => ({ ...card })),
      carryOverHp: this.state.carryOverHp,
      nextCombatBonusCards: this.state.nextCombatBonusCards.map((card) => ({ ...card }))
    };
  }

  public activateSave(meta: PlayerMetaState): void {
    this.state.activeSaveSlotId = meta.slotId;
    this.state.activeMeta = cloneMeta(meta);
    this.resetRunOnly();
  }

  public loadSlot(slotId: SaveSlotId): PlayerMetaState {
    const meta = SaveManager.loadOrCreateSlot(slotId);
    this.activateSave(meta);
    return meta;
  }

  public clearActiveSave(): void {
    this.state = {
      ...initialState
    };
  }

  public getActiveMeta(): PlayerMetaState | null {
    return cloneMeta(this.state.activeMeta);
  }

  public getCombatDeck(): CardInstance[] {
    return this.state.runDeck.map((card) => ({ ...card }));
  }

  public getActiveSaveSlotId(): SaveSlotId | null {
    return this.state.activeSaveSlotId;
  }

  public startRun(): void {
    this.resetRunOnly();
  }

  public saveCurrentDeck(deck: CardInstance[]): void {
    if (!this.state.activeMeta) {
      return;
    }

    this.state.activeMeta = {
      ...this.state.activeMeta,
      currentDeck: deck.map((card) => ({ ...card })),
      lastPlayedAt: new Date().toISOString()
    };
    SaveManager.saveSlot(this.state.activeMeta);
    this.state.runDeck = deck.map((card) => ({ ...card }));
  }

  public upgradeCardType(cardId: string, targetLevel: number, cost: number): boolean {
    if (!this.state.activeMeta) {
      return false;
    }

    const currentLevel = getCardTypeLevel(cardId, this.state.activeMeta.cardLevels);
    if (targetLevel <= currentLevel || targetLevel > 3 || this.state.activeMeta.essence < cost) {
      return false;
    }

    const nextCardLevels = {
      ...this.state.activeMeta.cardLevels,
      [cardId]: targetLevel
    };

    this.state.activeMeta = {
      ...this.state.activeMeta,
      essence: this.state.activeMeta.essence - cost,
      cardLevels: nextCardLevels,
      ownedCards: applyCardLevelsToCards(this.state.activeMeta.ownedCards, nextCardLevels),
      currentDeck: applyCardLevelsToCards(this.state.activeMeta.currentDeck, nextCardLevels),
      suspendedRun: this.state.activeMeta.suspendedRun
        ? {
            ...this.state.activeMeta.suspendedRun,
            runDeck: applyCardLevelsToCards(this.state.activeMeta.suspendedRun.runDeck, nextCardLevels),
            temporaryCards: applyCardLevelsToCards(this.state.activeMeta.suspendedRun.temporaryCards, nextCardLevels)
          }
        : null,
      lastPlayedAt: new Date().toISOString()
    };

    SaveManager.saveSlot(this.state.activeMeta);
    this.state.runDeck = applyCardLevelsToCards(this.state.runDeck, nextCardLevels);
    this.state.nextCombatBonusCards = applyCardLevelsToCards(this.state.nextCombatBonusCards, nextCardLevels);
    return true;
  }

  public hasSuspendedRun(): boolean {
    return this.state.activeMeta?.suspendedRun !== null;
  }

  public getSuspendedRun(): SuspendedRunState | null {
    const suspendedRun = this.state.activeMeta?.suspendedRun;
    if (!suspendedRun) {
      return null;
    }

    return {
      ...suspendedRun,
      unclaimedRewards: cloneRewardBundle(suspendedRun.unclaimedRewards),
      runDeck: suspendedRun.runDeck.map((card) => ({ ...card })),
      temporaryCards: suspendedRun.temporaryCards.map((card) => ({ ...card }))
    };
  }

  public saveSuspendedRun(currentHp: number): void {
    if (!this.state.activeMeta) {
      return;
    }

    this.state.activeMeta = {
      ...this.state.activeMeta,
      suspendedRun: {
        fightIndex: this.state.run.fightIndex,
        difficultyMultiplier: this.state.run.difficultyMultiplier,
        unclaimedRewards: cloneRewardBundle(this.state.run.unclaimedRewards),
        currentHp,
        runDeck: this.state.runDeck.map((card) => ({ ...card })),
        temporaryCards: this.state.nextCombatBonusCards.map((card) => ({ ...card })),
        savedAt: new Date().toISOString()
      },
      lastPlayedAt: new Date().toISOString()
    };
    SaveManager.saveSlot(this.state.activeMeta);
  }

  public resumeSuspendedRun(): boolean {
    const suspendedRun = this.state.activeMeta?.suspendedRun;
    if (!suspendedRun) {
      return false;
    }

    this.state.run = {
      fightIndex: suspendedRun.fightIndex,
      difficultyMultiplier: suspendedRun.difficultyMultiplier,
      unclaimedRewards: cloneRewardBundle(suspendedRun.unclaimedRewards)
    };
    this.state.runDeck = suspendedRun.runDeck.map((card) => ({ ...card }));
    this.state.nextCombatBonusCards = suspendedRun.temporaryCards.map((card) => ({ ...card }));
    this.state.carryOverHp = suspendedRun.currentHp;
    return true;
  }

  public touchActiveSave(): void {
    if (!this.state.activeMeta) {
      return;
    }

    this.state.activeMeta = {
      ...this.state.activeMeta,
      lastPlayedAt: new Date().toISOString()
    };
    SaveManager.saveSlot(this.state.activeMeta);
  }

  public addTemporaryCard(card: CardInstance): void {
    this.state.nextCombatBonusCards = [...this.state.nextCombatBonusCards, card];
  }

  public consumeTemporaryCards(): CardInstance[] {
    const cards = this.state.nextCombatBonusCards.map((card) => ({ ...card }));
    this.state.nextCombatBonusCards = [];
    return cards;
  }

  public setCarryOverHp(value: number): void {
    this.state.carryOverHp = value;
  }

  public recordFightVictory(): void {
    const nextFightIndex = this.state.run.fightIndex + 1;
    const nextDifficultyMultiplier = getDifficultyMultiplier(nextFightIndex);
    const scaledRewards = getScaledFightRewards(nextDifficultyMultiplier);

    this.state.run = {
      fightIndex: nextFightIndex,
      difficultyMultiplier: nextDifficultyMultiplier,
      unclaimedRewards: addRewardBundles(this.state.run.unclaimedRewards, scaledRewards)
    };
  }

  public cashOutRun(): RewardBundle {
    const payout = cloneRewardBundle(this.state.run.unclaimedRewards);
    this.applyRewardsToActiveSave(payout);
    this.clearSuspendedRun();
    this.resetRunOnly();
    return payout;
  }

  public resolveDefeat(): { payout: RewardBundle } {
    const payout = halveRewardBundle(this.state.run.unclaimedRewards);
    this.applyRewardsToActiveSave(payout);
    this.clearSuspendedRun();
    this.resetRunOnly();
    return { payout };
  }

  private applyRewardsToActiveSave(rewards: RewardBundle): void {
    if (!this.state.activeMeta) {
      return;
    }

    this.state.activeMeta = {
      ...this.state.activeMeta,
      playerXp: this.state.activeMeta.playerXp + rewards.xp,
      playerLevel: getLevelFromXp(this.state.activeMeta.playerXp + rewards.xp),
      essence: this.state.activeMeta.essence + rewards.essence,
      shards: this.state.activeMeta.shards + rewards.shards,
      lastPlayedAt: new Date().toISOString()
    };
    SaveManager.saveSlot(this.state.activeMeta);
  }

  private resetRunOnly(): void {
    this.state.run = createInitialRunState();
    this.state.runDeck = this.state.activeMeta?.currentDeck.map((card) => ({ ...card })) ?? [];
    this.state.nextCombatBonusCards = [];
    this.state.carryOverHp = PLAYER_MAX_HP;
  }

  private clearSuspendedRun(): void {
    if (!this.state.activeMeta || this.state.activeMeta.suspendedRun === null) {
      return;
    }

    this.state.activeMeta = {
      ...this.state.activeMeta,
      suspendedRun: null,
      lastPlayedAt: new Date().toISOString()
    };
    SaveManager.saveSlot(this.state.activeMeta);
  }
}

export const sessionState = new SessionState();
