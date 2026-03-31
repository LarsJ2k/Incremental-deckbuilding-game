import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { sessionState } from '../core/sessionState';
import type { CardDefinition, CardInstance } from '../core/types';
import { CARD_DEFINITIONS, getCardDefinitionForLevel } from '../data/cards';
import { CardView } from '../ui/CardView';
import { TopBar } from '../ui/TopBar';
import { getCardTypeLevel, getUpgradeCost } from '../utils/cardUpgrades';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

interface ButtonParts {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class UpgradeScene extends Phaser.Scene {
  private readonly cardViews: CardView[] = [];
  private readonly cardFrames = new Map<string, Phaser.GameObjects.Rectangle>();
  private leftContent!: Phaser.GameObjects.Container;
  private leftMaskGraphics!: Phaser.GameObjects.Graphics;
  private selectedCardId: string | null = null;
  private selectedTargetLevel: number | null = null;
  private scrollOffset = 0;
  private currentPreviewCard: CardView | null = null;
  private targetPreviewCard: CardView | null = null;
  private essenceText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private detailTitle!: Phaser.GameObjects.Text;
  private levelFlowText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private maxLevelText!: Phaser.GameObjects.Text;
  private arrowText!: Phaser.GameObjects.Text;
  private minusButton!: ButtonParts;
  private plusButton!: ButtonParts;
  private upgradeButton!: ButtonParts;

  public constructor() {
    super('UpgradeScene');
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    const meta = sessionState.getActiveMeta();
    if (!meta) {
      this.scene.start('StartScreenScene');
      return;
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1220);
    new TopBar(this, GAME_WIDTH, 'Card Upgrades');

    this.add.rectangle(370, 404, 620, 540, 0x13213c).setStrokeStyle(2, 0x475569);
    this.add.rectangle(970, 404, 500, 540, 0x13213c).setStrokeStyle(2, 0x475569);
    this.add.text(80, 90, 'Card Types', lightTextStyle({
      fontSize: '28px',
      resolution: 2
    }));
    this.add.text(700, 90, 'Upgrade Preview', lightTextStyle({
      fontSize: '28px',
      resolution: 2
    }));

    this.leftContent = this.add.container(0, 0);
    this.leftMaskGraphics = this.add.graphics();
    this.leftMaskGraphics.fillStyle(0xffffff, 1);
    this.leftMaskGraphics.fillRect(60, 134, 620, 540);
    this.leftMaskGraphics.setVisible(false);
    this.leftContent.setMask(this.leftMaskGraphics.createGeometryMask());

    this.essenceText = this.add.text(GAME_WIDTH / 2, 36, '', lightTextSoftStyle({
      fontSize: '22px',
      resolution: 2
    })).setOrigin(0.5);
    this.detailTitle = this.add.text(970, 174, '', lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0.5);
    this.levelFlowText = this.add.text(970, 210, '', lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    })).setOrigin(0.5);
    this.costText = this.add.text(1188, 598, '', lightTextStyle({
      fontSize: '22px',
      resolution: 2
    })).setOrigin(1, 0.5);
    this.arrowText = this.add.text(970, 364, '→', lightTextStyle({
      fontSize: '58px',
      resolution: 2
    })).setOrigin(0.5);
    this.maxLevelText = this.add.text(970, 360, 'Max level reached', lightTextStyle({
      fontSize: '24px',
      resolution: 2
    })).setOrigin(0.5).setVisible(false);
    this.infoText = this.add.text(GAME_WIDTH / 2, 700, '', lightTextSoftStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);

    this.minusButton = this.createCircleButton(1028, 496, 20, '-', () => {
      const minTargetLevel = this.getMinimumTargetLevel();
      if (this.selectedTargetLevel === null || minTargetLevel === null) {
        return;
      }

      this.selectedTargetLevel = Math.max(minTargetLevel, this.selectedTargetLevel - 1);
      this.refreshRightPanel();
    });
    this.plusButton = this.createCircleButton(1100, 496, 20, '+', () => {
      const maxTargetLevel = this.getMaximumTargetLevel();
      if (this.selectedTargetLevel === null || maxTargetLevel === null) {
        return;
      }

      this.selectedTargetLevel = Math.min(maxTargetLevel, this.selectedTargetLevel + 1);
      this.refreshRightPanel();
    });
    this.upgradeButton = this.createButton(1090, 640, 180, 48, 'Upgrade', () => {
      this.handleUpgrade();
    }, '20px');
    this.createButton(1180, 36, 120, 40, 'Back', () => {
      this.scene.start('HubScene');
    }, '18px');

    this.bindWheelScrolling();
    this.renderCardGrid();

    const cardIds = this.getDisplayCardIds();
    this.selectedCardId = cardIds[0] ?? null;
    this.resetTargetLevel();
    this.refreshRightPanel();
  }

  private getDisplayCardIds(): string[] {
    const meta = sessionState.getActiveMeta();
    if (!meta) {
      return [];
    }

    return [...meta.unlockedCardIds]
      .filter((cardId) => CARD_DEFINITIONS[cardId])
      .sort((left, right) => CARD_DEFINITIONS[left].name.localeCompare(CARD_DEFINITIONS[right].name));
  }

  private bindWheelScrolling(): void {
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const leftBounds = new Phaser.Geom.Rectangle(60, 134, 520, 540);
      if (!leftBounds.contains(pointer.worldX, pointer.worldY)) {
        return;
      }

      this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + deltaY * 0.6, 0, this.getMaxScroll());
      this.renderCardGrid();
    });
  }

  private renderCardGrid(): void {
    this.cardViews.forEach((view) => view.destroy());
    this.cardViews.length = 0;
    this.cardFrames.forEach((frame) => frame.destroy());
    this.cardFrames.clear();

    const meta = sessionState.getActiveMeta();
    if (!meta) {
      return;
    }

    const cardIds = this.getDisplayCardIds();
    const columns = 4;
    const spacingX = 144;
    const spacingY = 230;
    const startX = 142;
    const startY = 244;

    cardIds.forEach((cardId, index) => {
      const definition = CARD_DEFINITIONS[cardId];
      if (!definition) {
        return;
      }

      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY - this.scrollOffset;
      if (y < 90 || y > 720) {
        return;
      }

      const frame = this.add.rectangle(x, y, 136, 188, 0x000000, 0).setStrokeStyle(
        this.selectedCardId === cardId ? 3 : 1,
        this.selectedCardId === cardId ? 0xfbbf24 : 0x475569
      );
      this.leftContent.add(frame);
      this.cardFrames.set(cardId, frame);

      const card: CardInstance = {
        instanceId: `upgrade-${cardId}`,
        cardId,
        level: getCardTypeLevel(cardId, meta.cardLevels)
      };

      const view = new CardView(this, card, definition);
      view.setPosition(x, y);
      view.setCardState(true);
      view.setInteractionEnabled(false);
      view.setHoverScaleMultiplier(1);
      view.setHoverLift(0);
      this.leftContent.add(view);
      this.cardViews.push(view);

      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerup', () => {
        this.selectedCardId = cardId;
        this.resetTargetLevel();
        this.renderCardGrid();
        this.refreshRightPanel();
      });
    });

    this.essenceText.setText(`Essence: ${meta.essence}`);
  }

  private refreshRightPanel(): void {
    this.currentPreviewCard?.destroy();
    this.currentPreviewCard = null;
    this.targetPreviewCard?.destroy();
    this.targetPreviewCard = null;

    const meta = sessionState.getActiveMeta();
    const selectedCardId = this.selectedCardId;
    if (!meta || !selectedCardId) {
      return;
    }

    const definition = CARD_DEFINITIONS[selectedCardId];
    const currentLevel = getCardTypeLevel(selectedCardId, meta.cardLevels);
    const maxLevel = definition.maxLevel;

    this.detailTitle.setText(definition.name);

    this.currentPreviewCard = new CardView(this, {
      instanceId: `current-${selectedCardId}`,
      cardId: selectedCardId,
      level: currentLevel
    }, definition);
    this.currentPreviewCard.setPosition(866, 364);
    this.currentPreviewCard.setCardState(true);
    this.currentPreviewCard.setInteractionEnabled(false);
    this.currentPreviewCard.setHoverScaleMultiplier(1);
    this.currentPreviewCard.setHoverLift(0);

    if (currentLevel >= maxLevel) {
      this.levelFlowText.setText(`Lv.${currentLevel}`);
      this.costText.setText('');
      this.arrowText.setVisible(false);
      this.maxLevelText.setVisible(true);
      this.minusButton.container.setVisible(false);
      this.plusButton.container.setVisible(false);
      this.upgradeButton.container.setVisible(false);
      return;
    }

    const minTargetLevel = currentLevel + 1;
    const targetLevel = Phaser.Math.Clamp(this.selectedTargetLevel ?? minTargetLevel, minTargetLevel, maxLevel);
    this.selectedTargetLevel = targetLevel;
    const targetDefinition = getCardDefinitionForLevel(definition, targetLevel);
    const currentDefinition = getCardDefinitionForLevel(definition, currentLevel);
    const totalCost = getUpgradeCost(selectedCardId, currentLevel, targetLevel);
    const canAfford = meta.essence >= totalCost;

    this.targetPreviewCard = new CardView(this, {
      instanceId: `target-${selectedCardId}`,
      cardId: selectedCardId,
      level: targetLevel
    }, definition);
    this.targetPreviewCard.setPosition(1074, 364);
    this.targetPreviewCard.setCardState(true);
    this.targetPreviewCard.setInteractionEnabled(false);
    this.targetPreviewCard.setHoverScaleMultiplier(1);
    this.targetPreviewCard.setHoverLift(0);

    this.levelFlowText.setText(`Lv.${currentLevel} -> Lv.${targetLevel}`);
    this.costText.setText(`Cost: ${totalCost} Essence`);
    this.arrowText.setVisible(true);
    this.maxLevelText.setVisible(false);
    this.minusButton.container.setVisible(true);
    this.plusButton.container.setVisible(true);
    this.upgradeButton.container.setVisible(true);
    this.updateButtonState(this.minusButton, targetLevel > minTargetLevel);
    this.updateButtonState(this.plusButton, targetLevel < maxLevel);
    this.updateButtonState(this.upgradeButton, canAfford);
  }

  private getMinimumTargetLevel(): number | null {
    const meta = sessionState.getActiveMeta();
    const selectedCardId = this.selectedCardId;
    if (!meta || !selectedCardId) {
      return null;
    }

    const currentLevel = getCardTypeLevel(selectedCardId, meta.cardLevels);
    const maxLevel = CARD_DEFINITIONS[selectedCardId]?.maxLevel ?? 3;
    if (currentLevel >= maxLevel) {
      return null;
    }

    return currentLevel + 1;
  }

  private getMaximumTargetLevel(): number | null {
    const selectedCardId = this.selectedCardId;
    if (!selectedCardId) {
      return null;
    }

    return CARD_DEFINITIONS[selectedCardId]?.maxLevel ?? 3;
  }

  private resetTargetLevel(): void {
    const minTargetLevel = this.getMinimumTargetLevel();
    this.selectedTargetLevel = minTargetLevel;
  }

  private handleUpgrade(): void {
    const meta = sessionState.getActiveMeta();
    const selectedCardId = this.selectedCardId;
    if (!meta || !selectedCardId || this.selectedTargetLevel === null) {
      return;
    }

    const currentLevel = getCardTypeLevel(selectedCardId, meta.cardLevels);
    const targetLevel = this.selectedTargetLevel;
    const totalCost = getUpgradeCost(selectedCardId, currentLevel, targetLevel);
    const success = sessionState.upgradeCardType(selectedCardId, targetLevel, totalCost);
    if (!success) {
      this.infoText.setText('Not enough Essence or invalid upgrade.');
      return;
    }

    this.infoText.setText(`${CARD_DEFINITIONS[selectedCardId].name} upgraded to Lv.${targetLevel}.`);
    this.resetTargetLevel();
    this.renderCardGrid();
    this.refreshRightPanel();
  }

  private getMaxScroll(): number {
    const rowCount = Math.ceil(this.getDisplayCardIds().length / 4);
    return Math.max(0, rowCount * 230 - 420);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    fontSize: string = '20px'
  ): ButtonParts {
    const background = this.add.rectangle(0, 0, width, height, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    const text = this.add.text(0, 0, label, lightTextStyle({
      fontSize,
      resolution: 2
    })).setOrigin(0.5);
    const container = this.add.container(x, y, [background, text]);
    container.setSize(width, height);
    background.setInteractive({ useHandCursor: true });
    background.on('pointerup', () => onClick());
    return { container, background, label: text };
  }

  private createCircleButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    onClick: () => void
  ): ButtonParts {
    const background = this.add.circle(0, 0, radius, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    const text = this.add.text(0, 0, label, lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0.5);
    const container = this.add.container(x, y, [background, text]);
    container.setSize(radius * 2, radius * 2);
    background.setInteractive({ useHandCursor: true });
    background.on('pointerup', () => onClick());
    return { container, background: background as unknown as Phaser.GameObjects.Rectangle, label: text };
  }

  private updateButtonState(button: ButtonParts, enabled: boolean): void {
    button.background.setFillStyle(enabled ? 0x2563eb : 0x475569, 1);
    button.background.disableInteractive();
    if (enabled) {
      button.background.setInteractive({ useHandCursor: true });
    }
  }
}
