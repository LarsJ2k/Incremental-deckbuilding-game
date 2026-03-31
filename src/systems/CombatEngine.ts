import { MAX_LOG_ENTRIES, PLAYER_MAX_HP } from '../core/constants';
import type {
  ActiveSynergy,
  CardDefinition,
  CardInstance,
  CombatLogEntry,
  CombatPhase,
  CombatSnapshot,
  EnemyCombatState,
  EnemyIntentAction,
  PlayCardResult,
  PlayerCombatState,
  StatusEffectType
} from '../core/types';
import { getCardDefinitionForLevel } from '../data/cards';
import { EnemyAI } from './EnemyAI';
import { DeckSystem } from './DeckSystem';
import { SynergySystem } from './SynergySystem';
import { CardResolver } from './CardResolver';
import { applyVulnerableModifier, getResolvedEnemyActionValue, getResolvedEnemyAttackValue, getResolvedOutgoingAttackValue } from '../utils/combatMath';
import { createId, getDeckMetrics } from '../utils/helpers';

type SnapshotListener = (snapshot: CombatSnapshot) => void;

function getStatusLogLabel(statusType: StatusEffectType): string {
  switch (statusType) {
    case 'frailBlock':
      return 'Shatter';
    case 'burn':
      return 'Burn';
    case 'poison':
      return 'Poison';
    case 'weak':
      return 'Weak';
    case 'vulnerable':
      return 'Vulnerable';
    default:
      return statusType;
  }
}

export class CombatEngine {
  private readonly listeners = new Set<SnapshotListener>();
  private readonly deckSystem: DeckSystem;
  private readonly resolver: CardResolver;
  private readonly cardDefinitions: Record<string, CardDefinition>;
  private readonly activeSynergies: ActiveSynergy[];
  private phase: CombatPhase = 'player';
  private turn = 0;
  private readonly player: PlayerCombatState;
  private readonly enemies: EnemyCombatState[];
  private logs: CombatLogEntry[] = [];
  private selectedCardId: string | null = null;

  public constructor(
    deck: CardInstance[],
    enemies: EnemyCombatState[],
    cardDefinitions: Record<string, CardDefinition>,
    initialHp: number = PLAYER_MAX_HP
  ) {
    this.cardDefinitions = cardDefinitions;
    this.deckSystem = new DeckSystem(deck);
    this.enemies = enemies.map((enemy) => ({
      ...enemy,
      statuses: { ...enemy.statuses },
      intentActions: enemy.intentActions.map((action) => ({ ...action }))
    }));
    this.activeSynergies = SynergySystem.evaluate(deck, cardDefinitions);
    this.player = {
      maxHp: PLAYER_MAX_HP,
      hp: Math.max(1, Math.min(initialHp, PLAYER_MAX_HP)),
      block: 0,
      energy: 0,
      strength: 0,
      statuses: {}
    };
    this.resolver = new CardResolver({
      getEnemyById: (enemyId) => this.getEnemyById(enemyId),
      damageEnemy: (enemyId, amount, card) => this.damageEnemy(enemyId, amount, card),
      damageAllOtherEnemies: (primaryEnemyId, amount) => this.damageAllOtherEnemies(primaryEnemyId, amount),
      damagePlayer: (amount) => this.damagePlayer(amount),
      gainPlayerBlock: (amount) => this.gainPlayerBlock(amount),
      drawCards: (amount) => this.drawCards(amount),
      gainStrength: (amount) => this.gainStrength(amount),
      gainEnergy: (amount) => this.gainEnergy(amount),
      applyStatusToEnemy: (enemyId, statusType, amount) => this.applyStatusToEnemy(enemyId, statusType, amount),
      applyStatusToPlayer: (statusType, amount) => this.applyStatusToPlayer(statusType, amount),
      hasSynergy: (tierId) => SynergySystem.hasTier(this.activeSynergies, tierId)
    });
  }

  public startBattle(): void {
    this.addLog('Combat begins.');
    this.startPlayerTurn();
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.createSnapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  public playCard(instanceId: string, targetEnemyId?: string): PlayCardResult {
    if (this.phase !== 'player') {
      return { success: false, reason: 'It is not the player turn.' };
    }

    const card = this.deckSystem.findHandCard(instanceId);
    if (!card) {
      return { success: false, reason: 'Card is not in hand.' };
    }

    const baseDefinition = this.cardDefinitions[card.cardId];
    if (!baseDefinition) {
      return { success: false, reason: 'Card definition missing.' };
    }
    const definition = getCardDefinitionForLevel(baseDefinition, card.level);

    if (this.player.energy < definition.cost) {
      return { success: false, reason: 'Not enough energy.' };
    }

    this.addLog(`Played ${definition.name}.`);
    const result = this.resolver.resolve(definition, targetEnemyId);
    if (!result.success) {
      this.removeLastLog();
      return result;
    }

    const removed = this.deckSystem.removeFromHand(instanceId);
    if (!removed) {
      return { success: false, reason: 'Card could not be removed from hand.' };
    }

    this.player.energy -= definition.cost;
    this.deckSystem.discard(removed);
    this.selectedCardId = null;
    this.checkBattleOutcome();
    this.emit();
    return { success: true };
  }

  public endPlayerTurn(): void {
    if (this.phase !== 'player') {
      return;
    }

    this.clearEnemyBlockAtEndOfPlayerTurn();
    this.deckSystem.discardHand();
    this.player.strength = 0;
    this.applyEndTurnStatusesToPlayer();
    if (this.checkBattleOutcome()) {
      this.emit();
      return;
    }

    this.phase = 'enemy';
    this.emit();
    this.runEnemyTurn();
  }

  public setSelectedCard(instanceId: string | null): void {
    this.selectedCardId = instanceId;
    this.emit();
  }

  public getSnapshot(): CombatSnapshot {
    return this.createSnapshot();
  }

  private runEnemyTurn(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      this.applyStartTurnPassivesToEnemy(enemy);
      this.applyStartTurnStatusesToEnemy(enemy);
      if (this.checkBattleOutcome()) {
        this.emit();
        return;
      }

      if (!enemy.alive) {
        continue;
      }

      this.executeEnemyIntent(enemy);
      if (this.checkBattleOutcome()) {
        this.emit();
        return;
      }

      this.applyEndTurnStatusesToEnemy(enemy);
      if (this.checkBattleOutcome()) {
        this.emit();
        return;
      }
    }

    if (this.checkBattleOutcome()) {
      this.emit();
      return;
    }

    this.clearPlayerBlockAtEndOfEnemyTurn();
    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    this.phase = 'player';
    this.turn += 1;
    this.player.strength = 0;

    this.applyStartTurnStatusesToPlayer();
    if (this.checkBattleOutcome()) {
      this.emit();
      return;
    }

    const metrics = getDeckMetrics(this.deckSystem.getDeckSize());
    this.player.energy = metrics.baseEnergy;
    this.prepareEnemyIntents();
    this.drawCards(metrics.cardsToDraw);
    this.addLog(`Turn ${this.turn} begins. ${metrics.cardsToDraw} cards drawn, ${metrics.baseEnergy} energy.`);
    this.emit();
  }

  private drawCards(amount: number): void {
    const drawn = this.deckSystem.draw(amount);
    if (drawn.length > 0) {
      this.addLog(`Drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`);
    }
  }

  private gainPlayerBlock(amount: number): void {
    const effectiveAmount = this.player.statuses.frailBlock && this.player.statuses.frailBlock > 0 ? Math.floor(amount * 0.5) : amount;
    this.player.block += effectiveAmount;
    this.addLog(`Player gains ${effectiveAmount} block.`);
  }

  private gainStrength(amount: number): void {
    this.player.strength += amount;
    this.addLog(`Player gains ${amount} strength for this turn.`);
  }

  private gainEnergy(amount: number): void {
    this.player.energy += amount;
    this.addLog(`Player gains ${amount} energy.`);
  }

  private damageEnemy(enemyId: string, amount: number, card: CardDefinition): void {
    const enemy = this.getEnemyById(enemyId);
    if (!enemy || !enemy.alive) {
      return;
    }

    let modifiedAmount = amount;

    if (card.tags.includes('fire') && SynergySystem.hasTier(this.activeSynergies, 'fire-5')) {
      modifiedAmount = Math.ceil(modifiedAmount * 1.33);
    }

    modifiedAmount += this.player.strength;
    modifiedAmount = this.applyWeakModifier(modifiedAmount, this.player.statuses.weak ?? 0);
    modifiedAmount = applyVulnerableModifier(modifiedAmount, enemy.statuses.vulnerable ?? 0);

    const damageDealt = this.applyDamageToEnemy(enemy, modifiedAmount);
    this.addLog(`${enemy.name} takes ${damageDealt} damage.`);
  }

  private damageAllOtherEnemies(primaryEnemyId: string, amount: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.id === primaryEnemyId) {
        continue;
      }

      const dealt = this.applyDamageToEnemy(enemy, amount);
      this.addLog(`${enemy.name} takes ${dealt} splash damage.`);
    }
  }

  private damagePlayer(amount: number): void {
    let modifiedAmount = this.applyWeakModifier(amount, 0);
    modifiedAmount = applyVulnerableModifier(modifiedAmount, this.player.statuses.vulnerable ?? 0);
    const absorbed = Math.min(this.player.block, modifiedAmount);
    this.player.block -= absorbed;
    const hpLoss = Math.max(0, modifiedAmount - absorbed);
    this.player.hp = Math.max(0, this.player.hp - hpLoss);
  }

  private executeEnemyIntent(enemy: EnemyCombatState): void {
    for (const action of enemy.intentActions) {
      if (action.type === 'attack') {
        const amount = getResolvedEnemyAttackValue(action.value, enemy.strength, enemy.statuses.weak ?? 0, enemy.difficultyMultiplier);
        const beforeHp = this.player.hp;
        const beforeBlock = this.player.block;
        this.damagePlayer(amount);
        const totalLoss = beforeHp - this.player.hp + (beforeBlock - this.player.block);
        this.addLog(`${enemy.name} attacks for ${totalLoss}.`);
      }

      if (action.type === 'defend') {
        const resolvedBlock = getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier);
        enemy.block += resolvedBlock;
        this.addLog(`${enemy.name} gains ${resolvedBlock} block.`);
      }

      if (action.type === 'buff' && action.statType === 'strength') {
        const resolvedStrength = getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier);
        enemy.strength += resolvedStrength;
        this.addLog(`${enemy.name} gains ${resolvedStrength} Strength.`);
      }

      if (action.type === 'debuff' && action.target === 'player' && action.statusType) {
        const resolvedStatus = getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier);
        this.applyStatusToPlayer(action.statusType, resolvedStatus);
      }
    }
  }

  private applyStatusToEnemy(enemyId: string, statusType: StatusEffectType, amount: number): void {
    const enemy = this.getEnemyById(enemyId);
    if (!enemy || !enemy.alive) {
      return;
    }

    if (enemy.mechanicType === 'deflect' && enemy.debuffGuardRemaining > 0) {
      enemy.debuffGuardRemaining -= 1;
      this.addLog(`${enemy.name} deflects ${getStatusLogLabel(statusType)}. ${enemy.debuffGuardRemaining} deflects left.`);
      return;
    }

    enemy.statuses[statusType] = (enemy.statuses[statusType] ?? 0) + amount;
    this.addLog(`${enemy.name} gains ${getStatusLogLabel(statusType)} ${amount}.`);
    this.refreshEnemyIntent(enemy);
  }

  private applyStatusToPlayer(statusType: StatusEffectType, amount: number): void {
    this.player.statuses[statusType] = (this.player.statuses[statusType] ?? 0) + amount;
    this.addLog(`Player gains ${getStatusLogLabel(statusType)} ${amount}.`);
  }

  private applyStartTurnStatusesToPlayer(): void {
    return;
  }

  private applyStartTurnStatusesToEnemy(enemy: EnemyCombatState): void {
    return;
  }

  private applyStartTurnPassivesToEnemy(enemy: EnemyCombatState): void {
    return;
  }

  private applyEndTurnStatusesToPlayer(): void {
    const poison = this.player.statuses.poison ?? 0;
    if (poison > 0) {
      this.applyDirectDamageToPlayer(poison);
      this.player.statuses.poison = Math.max(0, poison - 1);
      this.addLog(`Player takes ${poison} poison damage.`);
    }

    const burn = this.player.statuses.burn ?? 0;
    if (burn > 0) {
      this.applyDirectDamageToPlayer(burn);
      this.player.statuses.burn = Math.max(0, burn - 1);
      this.addLog(`Player takes ${burn} burn damage.`);
    }

    this.tickDurationStatus(this.player.statuses, 'weak');
    this.tickDurationStatus(this.player.statuses, 'vulnerable');
    this.tickDurationStatus(this.player.statuses, 'frailBlock');
  }

  private applyEndTurnStatusesToEnemy(enemy: EnemyCombatState): void {
    const poison = enemy.statuses.poison ?? 0;
    if (poison > 0) {
      const damage = this.applyDamageToEnemy(enemy, poison);
      enemy.statuses.poison = Math.max(0, poison - 1);
      this.addLog(`${enemy.name} takes ${damage} poison damage.`);
    }

    const burn = enemy.statuses.burn ?? 0;
    if (burn > 0) {
      const damage = this.applyDamageToEnemy(enemy, burn);
      enemy.statuses.burn = Math.max(0, burn - 1);
      this.addLog(`${enemy.name} takes ${damage} burn damage.`);
    }

    this.tickDurationStatus(enemy.statuses, 'weak');
    this.tickDurationStatus(enemy.statuses, 'vulnerable');
    this.refreshEnemyIntent(enemy);
  }

  private tickDurationStatus(statuses: PlayerCombatState['statuses'], statusType: 'weak' | 'vulnerable' | 'frailBlock'): void {
    const currentValue = statuses[statusType] ?? 0;
    if (currentValue > 0) {
      statuses[statusType] = currentValue - 1;
    }
  }

  private applyDamageToEnemy(enemy: EnemyCombatState, amount: number): number {
    const absorbed = Math.min(enemy.block, amount);
    enemy.block -= absorbed;
    const hpLoss = Math.max(0, amount - absorbed);
    enemy.hp = Math.max(0, enemy.hp - hpLoss);

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.intentText = 'Defeated';
      enemy.intentActions = [];
      this.addLog(`${enemy.name} is defeated.`);
    }

    return hpLoss;
  }

  private applyDirectDamageToPlayer(amount: number): void {
    this.player.hp = Math.max(0, this.player.hp - amount);
  }

  private applyWeakModifier(amount: number, weakStacks: number): number {
    return getResolvedOutgoingAttackValue(amount, 0, weakStacks);
  }

  private prepareEnemyIntents(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        enemy.intentText = 'Defeated';
        enemy.intentActions = [];
        continue;
      }

      const intent = EnemyAI.chooseNextIntent(enemy);
      enemy.intentText = intent.text;
      enemy.intentActions = intent.actions;
      enemy.intentStep = intent.nextIntentStep;
    }
  }

  private refreshEnemyIntent(enemy: EnemyCombatState): void {
    if (!enemy.alive) {
      enemy.intentText = 'Defeated';
      enemy.intentActions = [];
      return;
    }

    enemy.intentText = EnemyAI.getIntentText(enemy, enemy.intentActions);
  }

  private checkBattleOutcome(): boolean {
    if (this.player.hp <= 0) {
      this.phase = 'defeat';
      return true;
    }

    if (this.enemies.every((enemy) => !enemy.alive)) {
      this.phase = 'victory';
      return true;
    }

    return false;
  }

  private getEnemyById(enemyId: string): EnemyCombatState | undefined {
    return this.enemies.find((enemy) => enemy.id === enemyId);
  }

  private clearPlayerBlockAtEndOfEnemyTurn(): void {
    this.player.block = 0;
  }

  private clearEnemyBlockAtEndOfPlayerTurn(): void {
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        enemy.block = 0;
      }
    }
  }

  private addLog(text: string): void {
    this.logs = [...this.logs, { id: createId('log'), text }].slice(-MAX_LOG_ENTRIES);
  }

  private removeLastLog(): void {
    this.logs = this.logs.slice(0, -1);
  }

  private emit(): void {
    const snapshot = this.createSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private createSnapshot(): CombatSnapshot {
    return {
      phase: this.phase,
      turn: this.turn,
      player: {
        ...this.player,
        statuses: { ...this.player.statuses }
      },
      enemies: this.enemies.map((enemy) => ({
        ...enemy,
        statuses: { ...enemy.statuses },
        intentActions: enemy.intentActions.map((action: EnemyIntentAction) => ({ ...action }))
      })),
      hand: this.deckSystem.getHand(),
      deckCards: this.deckSystem.getAllCards(),
      drawPile: this.deckSystem.getDrawPile(),
      discardPile: this.deckSystem.getDiscardPile(),
      drawPileCount: this.deckSystem.getDrawPileCount(),
      discardPileCount: this.deckSystem.getDiscardPileCount(),
      deckCount: this.deckSystem.getDeckSize(),
      activeSynergies: this.activeSynergies.map((synergy) => ({ ...synergy })),
      logs: this.logs.map((entry) => ({ ...entry })),
      selectedCardId: this.selectedCardId,
      canEndTurn: this.phase === 'player'
    };
  }
}
