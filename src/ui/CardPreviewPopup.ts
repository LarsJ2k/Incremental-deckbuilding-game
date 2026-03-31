import Phaser from 'phaser';
import type { CardDefinition, CardInstance } from '../core/types';
import { getCardDefinitionForLevel } from '../data/cards';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';
import { CardView } from './CardView';

export class CardPreviewPopup {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Container;
  private cardView: CardView | null = null;

  public constructor(scene: Phaser.Scene, width: number, height: number, onClose: () => void) {
    this.backdrop = scene.add
      .rectangle(0, 0, width, height, 0x020617, 0.78)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.backdrop.on('pointerup', () => onClose());

    const panelBg = scene.add.rectangle(0, 0, 420, 520, 0x111827, 0.98).setStrokeStyle(2, 0x94a3b8);
    this.titleText = scene.add.text(0, -220, '', lightTextStyle({
      fontSize: '28px',
      resolution: 2
    })).setOrigin(0.5);
    this.subtitleText = scene.add.text(0, -188, '', lightTextSoftStyle({
      fontSize: '16px',
      resolution: 2
    })).setOrigin(0.5);

    const closeBg = scene.add.rectangle(0, 0, 100, 40, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    const closeLabel = scene.add.text(0, 0, 'Close', lightTextStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);
    this.closeButton = scene.add.container(0, 220, [closeBg, closeLabel]);
    this.closeButton.setSize(100, 40);
    closeBg.setInteractive({ useHandCursor: true });
    closeBg.on('pointerup', () => onClose());

    this.panel = scene.add.container(width / 2, height / 2, [panelBg, this.titleText, this.subtitleText, this.closeButton]);
    this.container = scene.add.container(0, 0, [this.backdrop, this.panel]);
    this.container.setDepth(6000);
    this.container.setVisible(false);
  }

  public show(definition: CardDefinition, level: number): void {
    this.hideCardView();
    const resolvedDefinition = getCardDefinitionForLevel(definition, level);
    this.titleText.setText(definition.name);
    this.subtitleText.setText(`Lv.${level} ${definition.type.toUpperCase()} | Cost ${resolvedDefinition.cost}`);

    const previewInstance: CardInstance = {
      instanceId: `preview-${definition.id}-${level}`,
      cardId: definition.id,
      level
    };

    this.cardView = new CardView(this.panel.scene, previewInstance, definition);
    this.cardView.setPosition(0, 30);
    this.cardView.setBaseScale(1.9);
    this.cardView.setCardState(true);
    this.cardView.setInteractionEnabled(false);
    this.panel.add(this.cardView);
    this.container.setVisible(true);
  }

  public hide(): void {
    this.hideCardView();
    this.container.setVisible(false);
  }

  public isVisible(): boolean {
    return this.container.visible;
  }

  private hideCardView(): void {
    this.cardView?.destroy();
    this.cardView = null;
  }
}
