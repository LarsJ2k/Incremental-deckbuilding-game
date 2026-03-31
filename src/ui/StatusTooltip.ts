import Phaser from 'phaser';
import { lightTextSoftStyle } from '../utils/textStyles';

export interface TooltipLine {
  text: string;
  color?: string;
}

export class StatusTooltip {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly lineTexts: Phaser.GameObjects.Text[] = [];
  private readonly maxWidth = 260;

  public constructor(scene: Phaser.Scene) {
    this.background = scene.add.rectangle(0, 0, 280, 60, 0x020617, 0.96).setOrigin(0).setStrokeStyle(1, 0x94a3b8);
    this.container = scene.add.container(0, 0, [this.background]);
    this.container.setDepth(7000);
    this.container.setVisible(false);
  }

  public show(x: number, y: number, content: string | TooltipLine[]): void {
    this.lineTexts.forEach((line) => line.destroy());
    this.lineTexts.length = 0;

    const lines: TooltipLine[] = typeof content === 'string'
      ? content.split('\n').map((line) => ({ text: line }))
      : content;

    let maxLineWidth = 0;
    let currentY = 8;

    lines.forEach((line) => {
      const text = this.background.scene.add.text(10, currentY, line.text, lightTextSoftStyle({
        color: line.color ?? '#e2e8f0',
        fontSize: '14px',
        wordWrap: { width: this.maxWidth },
        resolution: 2
      }));
      this.container.add(text);
      this.lineTexts.push(text);

      const bounds = text.getBounds();
      maxLineWidth = Math.max(maxLineWidth, bounds.width);
      currentY += bounds.height + 4;
    });

    const tooltipWidth = Math.max(220, maxLineWidth + 20);
    const tooltipHeight = Math.max(44, currentY + 4);
    this.background.setSize(tooltipWidth, tooltipHeight);
    this.background.setDisplaySize(tooltipWidth, tooltipHeight);
    this.container.setPosition(x + 12, y + 12);
    this.container.setVisible(true);
  }

  public hide(): void {
    this.lineTexts.forEach((line) => line.destroy());
    this.lineTexts.length = 0;
    this.container.setVisible(false);
  }
}
