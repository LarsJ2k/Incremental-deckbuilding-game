import Phaser from 'phaser';
import type { EnemyCombatState } from '../core/types';
import { buildEnemyStatusDisplay } from '../utils/statusDisplay';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';
import { EnemyIntentView } from './EnemyIntentView';
import { StatusRow } from './StatusRow';
import { StatusTooltip } from './StatusTooltip';

export class EnemyView extends Phaser.GameObjects.Container {
  public readonly enemyId: string;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly blockText: Phaser.GameObjects.Text;
  private readonly intentView: EnemyIntentView;
  private readonly statusRow: StatusRow;

  public constructor(scene: Phaser.Scene, x: number, y: number, enemy: EnemyCombatState, tooltip: StatusTooltip) {
    super(scene, x, y);
    this.enemyId = enemy.id;

    const panel = scene.add.rectangle(0, 0, 250, 170, 0x1f2937).setStrokeStyle(2, 0x94a3b8);
    const hpBg = scene.add.rectangle(0, -35, 180, 16, 0x334155).setOrigin(0.5);
    this.hpFill = scene.add.rectangle(-90, -35, 180, 16, 0xef4444).setOrigin(0, 0.5);
    this.background = panel;
    this.nameText = scene.add.text(0, -64, enemy.name, lightTextStyle({
      fontSize: '20px',
      resolution: 2
    })).setOrigin(0.5);
    this.hpText = scene.add.text(0, -34, '', lightTextSoftStyle({
      fontSize: '12px',
      resolution: 2
    })).setOrigin(0.5);
    this.blockText = scene.add.text(0, -8, '', lightTextSoftStyle({
      color: '#bfdbfe',
      fontSize: '15px',
      resolution: 2
    })).setOrigin(0.5);
    this.intentView = new EnemyIntentView(scene, 0, -114);
    this.statusRow = new StatusRow(scene, -104, 46, 208, tooltip);

    this.add([panel, hpBg, this.hpFill, this.nameText, this.hpText, this.blockText, this.intentView, this.statusRow]);
    this.setSize(250, 170);
    scene.add.existing(this);
    this.update(enemy, false);
  }

  public update(enemy: EnemyCombatState, highlighted: boolean): void {
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    this.hpFill.width = Math.max(0, 180 * hpRatio);
    this.hpText.setText(`${enemy.hp} / ${enemy.maxHp} HP`);
    this.blockText.setText(`Block ${enemy.block}`);
    this.intentView.setIntent(enemy);
    this.statusRow.setItems(buildEnemyStatusDisplay(enemy));
    this.background.setStrokeStyle(3, highlighted ? 0xfbbf24 : enemy.alive ? 0x94a3b8 : 0x475569);
    this.alpha = enemy.alive ? 1 : 0.45;
  }

  public containsPoint(x: number, y: number): boolean {
    return this.background.getBounds().contains(x, y);
  }
}
