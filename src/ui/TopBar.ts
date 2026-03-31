import Phaser from 'phaser';
import { lightTextStyle } from '../utils/textStyles';

export class TopBar extends Phaser.GameObjects.Container {
  public constructor(scene: Phaser.Scene, width: number, title: string) {
    const background = scene.add.rectangle(width / 2, 32, width - 24, 52, 0x13213c, 0.96).setStrokeStyle(2, 0x334155);
    const titleText = scene.add.text(28, 32, title, lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0, 0.5);

    super(scene, 0, 0, [background, titleText]);
    scene.add.existing(this);
  }
}
