import type {
  EnemyCombatState,
  PlayerCombatState,
  StatusDisplayItem,
  StatusDisplayVariant,
  StatusMap
} from '../core/types';

function createStatusItem(
  id: string,
  label: string,
  shortLabel: string,
  value: number,
  tooltipText: string,
  variant: StatusDisplayVariant
): StatusDisplayItem {
  return { id, label, shortLabel, value, tooltipText, variant };
}

function statusItemsFromMap(statuses: StatusMap): StatusDisplayItem[] {
  const items: StatusDisplayItem[] = [];

  const burn = statuses.burn ?? 0;
  if (burn > 0) {
    items.push(
      createStatusItem('burn', 'Burn', 'BRN', burn, `Burn ${burn}: Takes ${burn} damage at end of turn, then Burn decreases by 1.`, 'burn')
    );
  }

  const poison = statuses.poison ?? 0;
  if (poison > 0) {
    items.push(
      createStatusItem(
        'poison',
        'Poison',
        'PSN',
        poison,
        `Poison ${poison}: Takes ${poison} damage at end of turn, then Poison decreases by 1.`,
        'poison'
      )
    );
  }

  const weak = statuses.weak ?? 0;
  if (weak > 0) {
    items.push(
      createStatusItem('weak', 'Weak', 'WK', weak, `Weak ${weak}: Attacks deal reduced damage for ${weak} turns.`, 'weak')
    );
  }

  const vulnerable = statuses.vulnerable ?? 0;
  if (vulnerable > 0) {
    items.push(
      createStatusItem(
        'vulnerable',
        'Vulnerable',
        'VUL',
        vulnerable,
        `Vulnerable ${vulnerable}: Takes 50% increased damage from attacks for ${vulnerable} turns.`,
        'vulnerable'
      )
    );
  }

  const frailBlock = statuses.frailBlock ?? 0;
  if (frailBlock > 0) {
    items.push(
      createStatusItem(
        'frail-block',
        'Shatter',
        'SHR',
        frailBlock,
        `Shatter ${frailBlock}: Gain 50% less Block for ${frailBlock} turns.`,
        'blockDown'
      )
    );
  }

  return items;
}

export function buildPlayerStatusDisplay(player: PlayerCombatState): StatusDisplayItem[] {
  const items: StatusDisplayItem[] = [];

  if (player.strength > 0) {
    items.push(
      createStatusItem(
        'strength',
        'Strength',
        'STR',
        player.strength,
        `Strength ${player.strength}: Increases attack damage by ${player.strength}.`,
        'strength'
      )
    );
  }

  items.push(...statusItemsFromMap(player.statuses));
  return items;
}

export function buildEnemyStatusDisplay(enemy: EnemyCombatState): StatusDisplayItem[] {
  const items: StatusDisplayItem[] = [];

  if (enemy.debuffGuardRemaining > 0) {
    items.push(
      createStatusItem(
        'deflect',
        'Deflect',
        'DF',
        enemy.debuffGuardRemaining,
        `Deflect ${enemy.debuffGuardRemaining}: Negates the next ${enemy.debuffGuardRemaining} debuff applications.`,
        'deflect'
      )
    );
  }

  if (enemy.strength > 0) {
    items.push(
      createStatusItem(
        'strength',
        'Strength',
        'STR',
        enemy.strength,
        `Strength ${enemy.strength}: Increases attack damage by ${enemy.strength}.`,
        'strength'
      )
    );
  }

  items.push(...statusItemsFromMap(enemy.statuses));
  return items;
}
