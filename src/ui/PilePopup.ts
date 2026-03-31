import Phaser from 'phaser';
import type { GroupedCardDisplayItem } from '../core/types';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

export class PilePopup {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly listContainer: Phaser.GameObjects.Container;
  private readonly closeButton: Phaser.GameObjects.Container;
  private readonly onSelectCard: (card: GroupedCardDisplayItem) => void;

  public constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    onClose: () => void,
    onSelectCard: (card: GroupedCardDisplayItem) => void
  ) {
    this.onSelectCard = onSelectCard;
    this.backdrop = scene.add
      .rectangle(0, 0, width, height, 0x020617, 0.65)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.backdrop.on('pointerup', () => onClose());

    const panelBg = scene.add.rectangle(0, 0, 460, 420, 0x111827, 0.97).setStrokeStyle(2, 0x94a3b8);
    this.titleText = scene.add.text(0, -170, '', lightTextStyle({
      fontSize: '28px',
      resolution: 2
    })).setOrigin(0.5);
    this.bodyText = scene.add.text(-190, -120, '', lightTextSoftStyle({
      fontSize: '18px',
      wordWrap: { width: 380 },
      resolution: 2
    }));
    this.listContainer = scene.add.container(-190, -120);

    const closeBg = scene.add.rectangle(0, 0, 100, 40, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    const closeLabel = scene.add.text(0, 0, 'Close', lightTextStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);
    this.closeButton = scene.add.container(150, -170, [closeBg, closeLabel]);
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

  public show(title: string, cards: GroupedCardDisplayItem[]): void {
    this.titleText.setText(title);
    this.listContainer.removeAll(true);

    if (cards.length === 0) {
      this.bodyText.setVisible(true);
      this.bodyText.setText('Empty');
    } else {
      this.bodyText.setVisible(false);
      cards.forEach((card, index) => {
        const row = this.createCardRow(card, index);
        this.listContainer.add(row);
      });
    }

    this.container.setVisible(true);
  }

  public hide(): void {
    this.container.setVisible(false);
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  private createCardRow(card: GroupedCardDisplayItem, index: number): Phaser.GameObjects.Container {
    const y = index * 34;
    const hit = this.backdrop.scene.add
      .rectangle(190, y + 12, 390, 28, 0x1e293b, 0.9)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x475569);
    hit.setInteractive({ useHandCursor: true });
    const label = this.backdrop.scene.add.text(14, y + 26, `${card.count}x ${card.name} (Lv.${card.level})`, lightTextSoftStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0, 0.5);
    const container = this.backdrop.scene.add.container(0, 0, [hit, label]);
    hit.on('pointerover', () => {
      hit.setFillStyle(0x334155, 1);
    });
    hit.on('pointerout', () => {
      hit.setFillStyle(0x1e293b, 0.9);
    });
    hit.on('pointerup', () => {
      this.onSelectCard(card);
    });

    return container;
  }
}
