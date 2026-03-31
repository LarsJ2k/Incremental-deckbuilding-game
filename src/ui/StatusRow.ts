import Phaser from 'phaser';
import type { StatusDisplayItem, StatusDisplayVariant } from '../core/types';
import { lightTextStyle } from '../utils/textStyles';
import { StatusTooltip } from './StatusTooltip';

function getVariantColor(variant: StatusDisplayVariant): number {
  switch (variant) {
    case 'deflect':
      return 0x38bdf8;
    case 'strength':
      return 0xf97316;
    case 'poison':
      return 0x22c55e;
    case 'weak':
      return 0xa78bfa;
    case 'burn':
      return 0xef4444;
    case 'vulnerable':
      return 0xfb7185;
    case 'blockDown':
      return 0xeab308;
    default:
      return 0x94a3b8;
  }
}

export class StatusRow extends Phaser.GameObjects.Container {
  private readonly tooltip: StatusTooltip;
  private readonly widthLimit: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, widthLimit: number, tooltip: StatusTooltip) {
    super(scene, x, y);
    this.tooltip = tooltip;
    this.widthLimit = widthLimit;
    scene.add.existing(this);
  }

  public setItems(items: StatusDisplayItem[]): void {
    this.removeAll(true);

    let offsetX = 0;
    let offsetY = 0;
    const itemWidth = 54;
    const itemHeight = 42;
    const gap = 8;

    items.forEach((item) => {
      if (offsetX + itemWidth > this.widthLimit) {
        offsetX = 0;
        offsetY += itemHeight + 6;
      }

      const badge = this.createBadge(item, offsetX, offsetY);
      this.add(badge);
      offsetX += itemWidth + gap;
    });
  }

  private createBadge(item: StatusDisplayItem, x: number, y: number): Phaser.GameObjects.Container {
    const bg = this.scene.add.rectangle(0, 0, 38, 24, getVariantColor(item.variant)).setOrigin(0.5).setStrokeStyle(1, 0xf8fafc);
    const shortLabel = this.scene.add.text(0, 0, item.shortLabel, {
      color: '#0f172a',
      fontSize: '11px',
      fontStyle: 'bold',
      resolution: 2
    }).setOrigin(0.5);
    const valueLabel = this.scene.add.text(0, 20, `${item.value}`, lightTextStyle({
      fontSize: '12px',
      resolution: 2
    })).setOrigin(0.5, 0);

    const container = this.scene.add.container(x + 19, y + 12, [bg, shortLabel, valueLabel]);
    container.setSize(38, 38);
    container.setInteractive(new Phaser.Geom.Rectangle(-19, -12, 38, 38), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      this.tooltip.show(pointer.worldX, pointer.worldY, item.tooltipText);
    });
    container.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.tooltip.show(pointer.worldX, pointer.worldY, item.tooltipText);
    });
    container.on('pointerout', () => {
      this.tooltip.hide();
    });

    return container;
  }
}
