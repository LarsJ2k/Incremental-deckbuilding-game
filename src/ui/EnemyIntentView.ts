import Phaser from 'phaser';
import type { EnemyCombatState, EnemyIntentAction } from '../core/types';
import { getResolvedEnemyActionValue, getResolvedEnemyAttackValue } from '../utils/combatMath';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

interface IntentBadgeConfig {
  iconLabel: string;
  color: number;
  value?: number;
  iconFontSize?: string;
  iconColor?: string;
  iconStrokeColor?: string;
  iconStrokeThickness?: number;
}

function getBadgeConfig(enemy: EnemyCombatState, action: EnemyIntentAction): IntentBadgeConfig | null {
  if (action.type === 'attack') {
    return {
      iconLabel: 'ATK',
      color: 0xef4444,
      value: getResolvedEnemyAttackValue(action.value, enemy.strength, enemy.statuses.weak ?? 0, enemy.difficultyMultiplier)
    };
  }

  if (action.type === 'defend') {
    return {
      iconLabel: 'DEF',
      color: 0x3b82f6,
      value: getResolvedEnemyActionValue(action.value, enemy.difficultyMultiplier)
    };
  }

  if (action.type === 'buff') {
    return {
      iconLabel: '↑',
      color: 0x22c55e,
      iconFontSize: '16px',
      iconColor: '#000000',
      iconStrokeColor: '#000000',
      iconStrokeThickness: 0
    };
  }

  if (action.type === 'debuff') {
    return {
      iconLabel: '↓',
      color: 0xa855f7,
      iconFontSize: '16px',
      iconColor: '#000000',
      iconStrokeColor: '#000000',
      iconStrokeThickness: 0
    };
  }

  return null;
}

export class EnemyIntentView extends Phaser.GameObjects.Container {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  public setIntent(enemy: EnemyCombatState): void {
    this.removeAll(true);

    if (!enemy.alive || enemy.intentActions.length === 0) {
      this.setVisible(false);
      return;
    }

    const badgeConfigs = enemy.intentActions
      .map((action) => getBadgeConfig(enemy, action))
      .filter((badge): badge is IntentBadgeConfig => badge !== null);

    if (badgeConfigs.length === 0) {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);

    const badgeWidths = badgeConfigs.map((badge) => (badge.value === undefined ? 36 : 72));
    const gap = 8;
    const totalWidth = badgeWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, badgeWidths.length - 1);
    let currentX = -totalWidth / 2;

    badgeConfigs.forEach((badge, index) => {
      const badgeWidth = badgeWidths[index] ?? 36;
      const badgeView = this.createBadge(currentX + badgeWidth / 2, 0, badgeWidth, badge);
      this.add(badgeView);
      currentX += badgeWidth + gap;
    });
  }

  private createBadge(x: number, y: number, width: number, badge: IntentBadgeConfig): Phaser.GameObjects.Container {
    const background = this.scene.add.rectangle(0, 0, width, 28, 0x0f172a, 0.95).setStrokeStyle(2, badge.color);
    const iconBg = this.scene.add.rectangle(-(width / 2) + 14, 0, 20, 20, badge.color).setStrokeStyle(1, 0xf8fafc);
    const iconText = this.scene.add.text(iconBg.x, 0, badge.iconLabel, lightTextStyle({
      color: badge.iconColor ?? '#f8fafc',
      fontSize: badge.iconFontSize ?? '10px',
      stroke: badge.iconStrokeColor ?? '#000000',
      strokeThickness: badge.iconStrokeThickness ?? 3,
      resolution: 2
    })).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [background, iconBg, iconText];

    if (badge.value !== undefined) {
      const valueText = this.scene.add.text(8, 0, `${badge.value}`, lightTextSoftStyle({
        color: '#f8fafc',
        fontSize: '14px',
        resolution: 2
      })).setOrigin(0.5);
      children.push(valueText);
    }

    return this.scene.add.container(x, y, children);
  }
}
