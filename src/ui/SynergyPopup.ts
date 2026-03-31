import Phaser from 'phaser';
import type { ActiveSynergy } from '../core/types';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';
import { StatusTooltip } from './StatusTooltip';

export class SynergyPopup {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly listContainer: Phaser.GameObjects.Container;
  private readonly closeButton: Phaser.GameObjects.Container;
  private readonly tooltip: StatusTooltip;

  public constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    tooltip: StatusTooltip,
    onClose: () => void
  ) {
    this.tooltip = tooltip;
    this.backdrop = scene.add
      .rectangle(0, 0, width, height, 0x020617, 0.65)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.backdrop.on('pointerup', () => onClose());

    const panelBg = scene.add.rectangle(0, 0, 400, 340, 0x111827, 0.97).setStrokeStyle(2, 0x94a3b8);
    this.titleText = scene.add.text(0, -130, 'Synergies', lightTextStyle({
      fontSize: '28px',
      resolution: 2
    })).setOrigin(0.5);
    this.bodyText = scene.add.text(0, -20, '', lightTextSoftStyle({
      fontSize: '20px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);
    this.listContainer = scene.add.container(-150, -80);

    const closeBg = scene.add.rectangle(0, 0, 100, 40, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    const closeLabel = scene.add.text(0, 0, 'Close', lightTextStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);
    this.closeButton = scene.add.container(120, -130, [closeBg, closeLabel]);
    this.closeButton.setSize(100, 40);
    closeBg.setInteractive({ useHandCursor: true });
    closeBg.on('pointerup', () => onClose());

    const panel = scene.add.container(width / 2, height / 2, [
      panelBg,
      this.titleText,
      this.bodyText,
      this.listContainer,
      this.closeButton
    ]);

    this.container = scene.add.container(0, 0, [this.backdrop, panel]);
    this.container.setDepth(5000);
    this.container.setVisible(false);
  }

  public show(activeSynergies: ActiveSynergy[]): void {
    this.listContainer.removeAll(true);
    this.tooltip.hide();

    if (activeSynergies.length === 0) {
      this.bodyText.setVisible(true);
      this.bodyText.setText('No active synergies');
    } else {
      this.bodyText.setVisible(false);
      activeSynergies.forEach((synergy, index) => {
        this.listContainer.add(this.createSynergyRow(synergy, index));
      });
    }

    this.container.setVisible(true);
  }

  public hide(): void {
    this.tooltip.hide();
    this.container.setVisible(false);
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  private createSynergyRow(synergy: ActiveSynergy, index: number): Phaser.GameObjects.Container {
    const y = index * 42;
    const rowBg = this.backdrop.scene.add
      .rectangle(150, y, 300, 34, 0x1e293b, 0.9)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x475569);
    rowBg.setInteractive({ useHandCursor: true });

    const label = this.backdrop.scene.add.text(16, y + 17, synergy.label, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    })).setOrigin(0, 0.5);

    rowBg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      rowBg.setFillStyle(0x334155, 1);
      this.tooltip.show(pointer.worldX, pointer.worldY, synergy.description);
    });
    rowBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.tooltip.show(pointer.worldX, pointer.worldY, synergy.description);
    });
    rowBg.on('pointerout', () => {
      rowBg.setFillStyle(0x1e293b, 0.9);
      this.tooltip.hide();
    });

    return this.backdrop.scene.add.container(0, 0, [rowBg, label]);
  }
}
