import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { sessionState } from '../core/sessionState';
import type { CardDefinition, CardInstance } from '../core/types';
import { CARD_DEFINITIONS } from '../data/cards';
import { SynergySystem } from '../systems/SynergySystem';
import { CardView } from '../ui/CardView';
import { StatusTooltip } from '../ui/StatusTooltip';
import { TopBar } from '../ui/TopBar';
import {
  buildSynergyProgress,
  groupAvailableOwnedCards,
  groupDeckEntries,
  haveDecksChanged,
  isDeckSaveValid,
  type GroupedCollectionEntry,
  type GroupedDeckEntry
} from '../utils/deckbuilder';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

interface ButtonParts {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class DeckbuilderScene extends Phaser.Scene {
  private readonly ownedCards: CardInstance[] = [];
  private savedDeck: CardInstance[] = [];
  private editedDeck: CardInstance[] = [];
  private availableCards: GroupedCollectionEntry[] = [];
  private collectionCardViews: CardView[] = [];
  private deckEntryViews: Phaser.GameObjects.Container[] = [];
  private synergyViews: Phaser.GameObjects.Text[] = [];
  private collectionScroll = 0;
  private deckScroll = 0;
  private collectionPanel!: Phaser.GameObjects.Rectangle;
  private deckPanel!: Phaser.GameObjects.Rectangle;
  private collectionContent!: Phaser.GameObjects.Container;
  private collectionMaskGraphics!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private deckCountText!: Phaser.GameObjects.Text;
  private statusTooltip!: StatusTooltip;
  private hoverPreviewPanel!: Phaser.GameObjects.Container;
  private hoverPreviewCard: CardView | null = null;
  private leaveWarningPopup!: Phaser.GameObjects.Container;
  private readonly dragOffsets = new Map<string, { x: number; y: number }>();
  private readonly recentlyDragged = new Set<string>();
  private fireTier = 0;

  public constructor() {
    super('DeckbuilderScene');
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    this.input.dragDistanceThreshold = 14;
    this.input.dragTimeThreshold = 120;
    this.ownedCards.length = 0;
    this.savedDeck = [];
    this.editedDeck = [];
    this.availableCards = [];
    this.collectionCardViews = [];
    this.deckEntryViews = [];
    this.synergyViews = [];
    this.collectionScroll = 0;
    this.deckScroll = 0;
    this.hoverPreviewCard = null;
    this.dragOffsets.clear();
    this.recentlyDragged.clear();
    const meta = sessionState.getActiveMeta();
    if (!meta) {
      this.scene.start('StartScreenScene');
      return;
    }

    this.ownedCards.push(...meta.ownedCards.map((card) => ({ ...card })));
    this.savedDeck = meta.currentDeck.map((card) => ({ ...card }));
    this.editedDeck = meta.currentDeck.map((card) => ({ ...card }));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1220);
    new TopBar(this, GAME_WIDTH, 'Deckbuilder');

    this.statusTooltip = new StatusTooltip(this);

    this.collectionPanel = this.add.rectangle(820, 396, 780, 500, 0x13213c).setStrokeStyle(2, 0x475569);
    this.deckPanel = this.add.rectangle(198, 396, 320, 500, 0x13213c).setStrokeStyle(2, 0x475569);
    this.collectionContent = this.add.container(0, 0);
    this.collectionMaskGraphics = this.add.graphics();
    this.collectionMaskGraphics.fillStyle(0xffffff, 1);
    this.collectionMaskGraphics.fillRect(430, 146, 780, 500);
    this.collectionMaskGraphics.setVisible(false);
    this.collectionContent.setMask(this.collectionMaskGraphics.createGeometryMask());

    this.add.text(64, 122, 'Current Deck', lightTextStyle({
      fontSize: '26px',
      resolution: 2
    }));
    this.add.text(430, 122, 'Available Owned Cards', lightTextStyle({
      fontSize: '26px',
      resolution: 2
    }));
    this.deckCountText = this.add.text(64, 156, '', lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));
    this.deckCountText.setInteractive({ useHandCursor: true });
    this.deckCountText.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      this.statusTooltip.show(pointer.worldX, pointer.worldY, this.getDeckSizeTooltipText());
    });
    this.deckCountText.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.statusTooltip.show(pointer.worldX, pointer.worldY, this.getDeckSizeTooltipText());
    });
    this.deckCountText.on('pointerout', () => {
      this.statusTooltip.hide();
    });
    this.infoText = this.add.text(GAME_WIDTH / 2, 684, '', lightTextSoftStyle({
      color: '#cbd5e1',
      fontSize: '18px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);

    this.createHoverPreviewPanel();
    this.createButtons();
    this.createLeaveWarning();
    this.bindWheelScrolling();
    this.refreshView();
  }

  private createButtons(): void {
    this.createButton(1180, 36, 120, 40, 'Back', () => {
      this.handleBack();
    }, '18px');
    this.createButton(198, 682, 150, 40, 'Save Deck', () => {
      const validation = isDeckSaveValid(this.editedDeck);
      if (!validation.valid) {
        this.infoText.setText(validation.message ?? 'Deck could not be saved.');
        return;
      }

      sessionState.saveCurrentDeck(this.editedDeck);
      this.savedDeck = this.editedDeck.map((card) => ({ ...card }));
      this.infoText.setText('Deck saved.');
    }, '18px');
  }

  private createHoverPreviewPanel(): void {
    const panelBg = this.add.rectangle(340, 570, 220, 280, 0x111827, 0.96).setStrokeStyle(2, 0x475569);
    const title = this.add.text(340, 446, 'Preview', lightTextStyle({
      fontSize: '20px',
      resolution: 2
    })).setOrigin(0.5);
    this.hoverPreviewPanel = this.add.container(0, 0, [panelBg, title]);
    this.hoverPreviewPanel.setDepth(5200);
    this.hoverPreviewPanel.setVisible(false);
  }

  private createLeaveWarning(): void {
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.65);
    backdrop.setInteractive();
    const panel = this.add.rectangle(0, 0, 420, 200, 0x111827, 0.98).setStrokeStyle(2, 0x94a3b8);
    const title = this.add.text(0, -46, 'Unsaved Changes', lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0.5);
    const body = this.add.text(0, 0, 'Any unsaved changes will be discarded.', lightTextSoftStyle({
      fontSize: '18px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);
    const confirm = this.createButton(-90, 58, 140, 42, 'Discard', () => {
      this.leaveWarningPopup.setVisible(false);
      this.scene.start('HubScene');
    }, '18px');
    const cancel = this.createButton(90, 58, 140, 42, 'Cancel', () => {
      this.leaveWarningPopup.setVisible(false);
    }, '18px');

    this.leaveWarningPopup = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      backdrop,
      panel,
      title,
      body,
      confirm.container,
      cancel.container
    ]);
    this.leaveWarningPopup.setDepth(6500);
    this.leaveWarningPopup.setVisible(false);
  }

  private bindWheelScrolling(): void {
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (this.leaveWarningPopup.visible) {
        return;
      }

      if (this.collectionPanel.getBounds().contains(pointer.worldX, pointer.worldY)) {
        const maxScroll = this.getCollectionMaxScroll();
        this.collectionScroll = Phaser.Math.Clamp(this.collectionScroll + deltaY * 0.6, 0, maxScroll);
        this.renderAvailableCards();
        return;
      }

      if (this.deckPanel.getBounds().contains(pointer.worldX, pointer.worldY)) {
        const maxScroll = this.getDeckMaxScroll();
        this.deckScroll = Phaser.Math.Clamp(this.deckScroll + deltaY * 0.6, 0, maxScroll);
        this.renderDeckEntries();
      }
    });
  }

  private refreshView(): void {
    this.availableCards = groupAvailableOwnedCards(this.ownedCards, this.editedDeck, CARD_DEFINITIONS);
    this.fireTier = SynergySystem.hasTier(SynergySystem.evaluate(this.editedDeck, CARD_DEFINITIONS), 'fire-5') ? 1 : 0;
    this.collectionScroll = Phaser.Math.Clamp(this.collectionScroll, 0, this.getCollectionMaxScroll());
    this.deckScroll = Phaser.Math.Clamp(this.deckScroll, 0, this.getDeckMaxScroll());
    this.deckCountText.setText(`Deck: ${this.editedDeck.length} cards`);
    this.renderSynergyInfo();
    this.renderAvailableCards();
    this.renderDeckEntries();
  }

  private renderAvailableCards(): void {
    this.collectionCardViews.forEach((view) => view.destroy());
    this.collectionCardViews = [];

    const columns = 5;
    const cardSpacingX = 142;
    const cardSpacingY = 214;
    const startX = 508;
    const startY = 250;
    const panelTop = 170;
    const panelBottom = 622;

    this.availableCards.forEach((cardGroup, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * cardSpacingX;
      const y = startY + row * cardSpacingY - this.collectionScroll;
      if (y < panelTop - 110 || y > panelBottom + 110) {
        return;
      }

      const definition = CARD_DEFINITIONS[cardGroup.cardId];
      if (!definition) {
        return;
      }

      const view = new CardView(this, cardGroup.representativeCard, definition);
      view.setBaseScale(1);
      view.setHoverScaleMultiplier(1);
      view.setHoverLift(0);
      view.setPlayerStrength(0);
      view.setPlayerStatuses({});
      view.setSynergyState(this.fireTier);
      view.setCardState(true);
      view.setStackCount(cardGroup.count);
      view.setHomeTransform(x, y, 0);
      view.snapHome();
      view.setHomeDepth(10 + index);
      this.bindAvailableCardInteractions(view);
      this.collectionCardViews.push(view);
      this.collectionContent.add(view);
    });
  }

  private renderDeckEntries(): void {
    this.deckEntryViews.forEach((view) => view.destroy());
    this.deckEntryViews = [];

    const entries = groupDeckEntries(this.editedDeck, CARD_DEFINITIONS);
    const startY = 206;
    const rowHeight = 40;
    const panelTop = 170;
    const panelBottom = 622;

    entries.forEach((entry, index) => {
      const y = startY + index * rowHeight - this.deckScroll;
      if (y < panelTop - 20 || y > panelBottom) {
        return;
      }

      const row = this.createDeckEntryView(entry, y);
      this.deckEntryViews.push(row);
    });
  }

  private renderSynergyInfo(): void {
    this.synergyViews.forEach((view) => view.destroy());
    this.synergyViews = [];

    const activeSynergies = SynergySystem.evaluate(this.editedDeck, CARD_DEFINITIONS);
    const progressItems = buildSynergyProgress(this.editedDeck, CARD_DEFINITIONS);
    this.infoText.setText('');

    progressItems.forEach((item, index) => {
      const text = this.add.text(420 + index * 160, 36, item.displayText, lightTextStyle({
        fontSize: '18px',
        resolution: 2
      })).setOrigin(0, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        this.statusTooltip.show(pointer.worldX, pointer.worldY, item.tooltipLines);
      });
      text.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        this.statusTooltip.show(pointer.worldX, pointer.worldY, item.tooltipLines);
      });
      text.on('pointerout', () => {
        this.statusTooltip.hide();
      });
      this.synergyViews.push(text);
    });
  }

  private bindAvailableCardInteractions(view: CardView): void {
    const interactiveTarget = view.getInteractiveTarget();

    interactiveTarget.on('pointerover', () => {
      view.setHoverActive(true);
      view.setDepth(4000);
    });
    interactiveTarget.on('pointerout', () => {
      view.setHoverActive(false);
      view.restoreHomeDepth();
    });
    interactiveTarget.on('pointerup', () => {
      if (this.recentlyDragged.has(view.card.instanceId)) {
        return;
      }

      this.editedDeck = [...this.editedDeck, { ...view.card }];
      this.refreshView();
    });

    this.input.setDraggable(interactiveTarget);
    interactiveTarget.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.collectionContent.remove(view);
      this.add.existing(view);
      this.dragOffsets.set(view.card.instanceId, {
        x: pointer.worldX - view.x,
        y: pointer.worldY - view.y
      });
      view.setDragging(true);
      view.setDepth(7000);
    });
    interactiveTarget.on('drag', (pointer: Phaser.Input.Pointer) => {
      const offset = this.dragOffsets.get(view.card.instanceId) ?? { x: 0, y: 0 };
      view.setPosition(pointer.worldX - offset.x, pointer.worldY - offset.y);
    });
    interactiveTarget.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.dragOffsets.delete(view.card.instanceId);
      view.setDragging(false);
      this.recentlyDragged.add(view.card.instanceId);
      this.time.delayedCall(60, () => this.recentlyDragged.delete(view.card.instanceId));

      if (this.deckPanel.getBounds().contains(pointer.worldX, pointer.worldY)) {
        this.editedDeck = [...this.editedDeck, { ...view.card }];
        this.refreshView();
        return;
      }

      this.collectionContent.add(view);
      view.snapHome();
      view.restoreHomeDepth();
    });
  }

  private createDeckEntryView(entry: GroupedDeckEntry, y: number): Phaser.GameObjects.Container {
    const x = 62;
    const background = this.add.rectangle(0, 0, 272, 30, 0x1e293b, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x475569);
    const label = this.add.text(14, 15, `${entry.count}x ${entry.name} (Lv.${entry.level})`, lightTextSoftStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0, 0.5);

    const row = this.add.container(x, y, [background, label]);
    row.setSize(272, 30);
    background.setInteractive(new Phaser.Geom.Rectangle(0, 0, 272, 30), Phaser.Geom.Rectangle.Contains);
    background.on('pointerover', () => {
      background.setFillStyle(0x334155, 1);
      this.showHoverPreview(entry.representativeCard);
    });
    background.on('pointerout', () => {
      background.setFillStyle(0x1e293b, 0.9);
      this.hideHoverPreview();
    });
    background.on('pointerup', () => {
      const dragKey = `deck:${entry.representativeCard.instanceId}`;
      if (this.recentlyDragged.has(dragKey)) {
        return;
      }

      this.editedDeck = this.editedDeck.filter((card) => card.instanceId !== entry.representativeCard.instanceId);
      this.refreshView();
    });

    this.input.setDraggable(background);
    background.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      const dragKey = `deck:${entry.representativeCard.instanceId}`;
      this.dragOffsets.set(dragKey, {
        x: pointer.worldX - row.x,
        y: pointer.worldY - row.y
      });
      row.setDepth(5000);
    });
    background.on('drag', (pointer: Phaser.Input.Pointer) => {
      const dragKey = `deck:${entry.representativeCard.instanceId}`;
      const offset = this.dragOffsets.get(dragKey) ?? { x: 0, y: 0 };
      row.setPosition(pointer.worldX - offset.x, pointer.worldY - offset.y);
    });
    background.on('dragend', (pointer: Phaser.Input.Pointer) => {
      const dragKey = `deck:${entry.representativeCard.instanceId}`;
      this.dragOffsets.delete(dragKey);
      this.recentlyDragged.add(dragKey);
      this.time.delayedCall(60, () => this.recentlyDragged.delete(dragKey));

      if (this.collectionPanel.getBounds().contains(pointer.worldX, pointer.worldY)) {
        this.editedDeck = this.editedDeck.filter((card) => card.instanceId !== entry.representativeCard.instanceId);
        this.refreshView();
        return;
      }

      this.renderDeckEntries();
    });

    return row;
  }

  private showHoverPreview(card: CardInstance): void {
    this.hideHoverPreview();
    const definition = CARD_DEFINITIONS[card.cardId];
    if (!definition) {
      return;
    }

    this.hoverPreviewCard = new CardView(this, card, definition);
    this.hoverPreviewCard.setPosition(340, 584);
    this.hoverPreviewCard.setBaseScale(1.15);
    this.hoverPreviewCard.setSynergyState(this.fireTier);
    this.hoverPreviewCard.setCardState(true);
    this.hoverPreviewCard.setInteractionEnabled(false);
    this.hoverPreviewPanel.add(this.hoverPreviewCard);
    this.children.bringToTop(this.hoverPreviewPanel);
    this.hoverPreviewPanel.setVisible(true);
  }

  private hideHoverPreview(): void {
    this.hoverPreviewCard?.destroy();
    this.hoverPreviewCard = null;
    this.hoverPreviewPanel.setVisible(false);
  }

  private getCollectionMaxScroll(): number {
    const rowCount = Math.ceil(this.availableCards.length / 5);
    return Math.max(0, rowCount * 214 - 428);
  }

  private getDeckMaxScroll(): number {
    const rowCount = groupDeckEntries(this.editedDeck, CARD_DEFINITIONS).length;
    return Math.max(0, rowCount * 40 - 420);
  }

  private handleBack(): void {
    if (haveDecksChanged(this.editedDeck, this.savedDeck)) {
      this.leaveWarningPopup.setVisible(true);
      return;
    }

    this.scene.start('HubScene');
  }

  private getDeckSizeTooltipText(): string {
    return [
      'Deck size rules:',
      '20+ cards: 3 energy, 5 draw',
      '25+ cards: 3 energy, 6 draw',
      '30+ cards: 4 energy, 6 draw',
      '35+ cards: 4 energy, 7 draw',
      '40+ cards: 5 energy, 7 draw'
    ].join('\n');
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
}
