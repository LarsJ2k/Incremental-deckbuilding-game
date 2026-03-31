import type { CardDefinition, EnemyCombatState, PlayCardResult, StatusEffectType } from '../core/types';

interface ResolverContext {
  getEnemyById(enemyId: string): EnemyCombatState | undefined;
  damageEnemy(enemyId: string, amount: number, card: CardDefinition): void;
  damageAllOtherEnemies(primaryEnemyId: string, amount: number): void;
  damagePlayer(amount: number): void;
  gainPlayerBlock(amount: number): void;
  drawCards(amount: number): void;
  gainStrength(amount: number): void;
  gainEnergy(amount: number): void;
  applyStatusToEnemy(enemyId: string, statusType: StatusEffectType, amount: number): void;
  applyStatusToPlayer(statusType: StatusEffectType, amount: number): void;
  hasSynergy(tierId: 'fire-5' | 'fire-10' | 'fire-15'): boolean;
}

export class CardResolver {
  public constructor(private readonly context: ResolverContext) {}

  public resolve(definition: CardDefinition, targetEnemyId?: string): PlayCardResult {
    if (definition.targetType === 'enemy') {
      if (!targetEnemyId) {
        return { success: false, reason: 'This card needs an enemy target.' };
      }

      const enemy = this.context.getEnemyById(targetEnemyId);
      if (!enemy || !enemy.alive) {
        return { success: false, reason: 'Target enemy is no longer valid.' };
      }
    }

    for (const effect of definition.effects) {
      if (effect.type === 'damage') {
        if (effect.target === 'enemy' && targetEnemyId) {
          this.context.damageEnemy(targetEnemyId, effect.value, definition);
        }

        if (effect.target === 'self') {
          this.context.damagePlayer(effect.value);
        }
      }

      if (effect.type === 'block') {
        this.context.gainPlayerBlock(effect.value);
      }

      if (effect.type === 'draw') {
        this.context.drawCards(effect.value);
      }

      if (effect.type === 'strength') {
        this.context.gainStrength(effect.value);
      }

      if (effect.type === 'energy') {
        this.context.gainEnergy(effect.value);
      }

      if (effect.type === 'status' && effect.statusType) {
        if (effect.target === 'enemy' && targetEnemyId) {
          this.context.applyStatusToEnemy(targetEnemyId, effect.statusType, effect.value);
        }

        if (effect.target === 'self') {
          this.context.applyStatusToPlayer(effect.statusType, effect.value);
        }
      }
    }

    if (definition.tags.includes('fire') && targetEnemyId) {
      if (this.context.hasSynergy('fire-10')) {
        this.context.applyStatusToEnemy(targetEnemyId, 'burn', 2);
      }

      if (this.context.hasSynergy('fire-15')) {
        this.context.damageAllOtherEnemies(targetEnemyId, 3);
      }
    }

    return { success: true };
  }
}
