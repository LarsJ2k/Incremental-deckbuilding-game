import Phaser from 'phaser';
import type { CombatSnapshot } from '../core/types';
import { buildPlayerStatusDisplay } from '../utils/statusDisplay';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';
import { StatusRow } from './StatusRow';
import { StatusTooltip } from './StatusTooltip';

export class PlayerPanel extends Phaser.GameObjects.Container {
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly blockText: Phaser.GameObjects.Text;
  private readonly turnText: Phaser.GameObjects.Text;
  private readonly statusRow: StatusRow;

  public constructor(scene: Phaser.Scene, x: number, y: number, tooltip: StatusTooltip) {
    super(scene, x, y);
    const panel = scene.add.rectangle(0, 0, 280, 170, 0x172033).setOrigin(0, 0).setStrokeStyle(2, 0x94a3b8);
    const hpBg = scene.add.rectangle(140, 52, 180, 16, 0x334155).setOrigin(0.5);
    this.hpFill = scene.add.rectangle(50, 52, 180, 16, 0xef4444).setOrigin(0, 0.5);
    const title = scene.add.text(16, 10, 'Pilot', lightTextStyle({
      fontSize: '22px',
      resolution: 2
    }));
    this.hpText = scene.add.text(140, 52, '', lightTextSoftStyle({ color: '#f8fafc', fontSize: '12px', resolution: 2 })).setOrigin(0.5);
    this.blockText = scene.add.text(16, 74, '', lightTextSoftStyle({ color: '#bfdbfe', fontSize: '18px', resolution: 2 }));
    this.turnText = scene.add.text(190, 18, '', lightTextSoftStyle({ color: '#cbd5e1', fontSize: '16px', resolution: 2 }));
    this.statusRow = new StatusRow(scene, 16, 132, 245, tooltip);

    this.add([panel, title, hpBg, this.hpFill, this.hpText, this.blockText, this.turnText, this.statusRow]);
    scene.add.existing(this);
  }

  public update(snapshot: CombatSnapshot): void {
    const hpRatio = snapshot.player.maxHp > 0 ? snapshot.player.hp / snapshot.player.maxHp : 0;
    this.hpFill.width = Math.max(0, 180 * hpRatio);
    this.hpText.setText(`HP ${snapshot.player.hp} / ${snapshot.player.maxHp}`);
    this.blockText.setText(`Block ${snapshot.player.block}`);
    this.turnText.setText(`Turn ${snapshot.turn}`);
    this.statusRow.setItems(buildPlayerStatusDisplay(snapshot.player));
  }
}
