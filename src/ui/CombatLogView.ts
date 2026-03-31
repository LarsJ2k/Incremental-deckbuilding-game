import Phaser from 'phaser';
import type { CombatLogEntry } from '../core/types';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

export class CombatLogView extends Phaser.GameObjects.Container {
  private readonly bodyText: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);
    const panel = scene.add.rectangle(0, 0, width, height, 0x111827).setOrigin(0, 0).setStrokeStyle(2, 0x475569);
    const title = scene.add.text(12, 10, 'Combat Log', lightTextStyle({
      fontSize: '18px',
      resolution: 2
    }));
    this.bodyText = scene.add.text(12, 40, '', lightTextSoftStyle({
      fontSize: '14px',
      wordWrap: { width: width - 24 },
      resolution: 2
    }));

    this.add([panel, title, this.bodyText]);
    scene.add.existing(this);
  }

  public update(entries: CombatLogEntry[]): void {
    this.bodyText.setText(entries.map((entry) => `• ${entry.text}`).join('\n'));
  }
}
