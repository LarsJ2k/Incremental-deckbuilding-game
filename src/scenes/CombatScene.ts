import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { sessionState } from '../core/sessionState';
import type { CombatSnapshot, RewardBundle } from '../core/types';
import { CARD_DEFINITIONS, getCardDefinitionForLevel } from '../data/cards';
import { createEnemyStates } from '../data/enemies';
import { CombatEngine } from '../systems/CombatEngine';
import { CombatLogView } from '../ui/CombatLogView';
import { CardView } from '../ui/CardView';
import { EnemyView } from '../ui/EnemyView';
import { HandLayout } from '../ui/HandLayout';
import { CardPreviewPopup } from '../ui/CardPreviewPopup';
import { PilePopup } from '../ui/PilePopup';
import { PlayerPanel } from '../ui/PlayerPanel';
import { StatusTooltip } from '../ui/StatusTooltip';
import { SynergyPopup } from '../ui/SynergyPopup';
import { TopBar } from '../ui/TopBar';
import { groupCardInstancesForDisplay } from '../utils/helpers';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

interface RewardSceneData {
  outcome: 'victory' | 'defeat';
  currentHp: number;
  maxHp: number;
  payout?: RewardBundle;
}

interface ButtonParts {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Rectangle;
}

export class CombatScene extends Phaser.Scene {
  private static readonly HAND_ZONE_RATIO = 0.3;
  private engine!: CombatEngine;
  private unsubscribe: (() => void) | null = null;
  private latestSnapshot!: CombatSnapshot;
  private readonly enemyViews = new Map<string, EnemyView>();
  private readonly cardViews = new Map<string, CardView>();
  private playerPanel!: PlayerPanel;
  private combatLog!: CombatLogView;
  private deckCounterText!: Phaser.GameObjects.Text;
  private drawPileCounterText!: Phaser.GameObjects.Text;
  private discardPileCounterText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private synergiesButton!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private endTurnButton!: ButtonParts;
  private overlayContainer!: Phaser.GameObjects.Container;
  private overlayText!: Phaser.GameObjects.Text;
  private overlayButton!: ButtonParts;
  private pilePopup!: PilePopup;
  private cardPreviewPopup!: CardPreviewPopup;
  private synergyPopup!: SynergyPopup;
  private statusTooltip!: StatusTooltip;
  private settingsButton!: ButtonParts;
  private settingsPopup!: Phaser.GameObjects.Container;
  private transitioning = false;
  private readonly dragOffsets = new Map<string, { x: number; y: number }>();

  public constructor() {
    super('CombatScene');
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    this.transitioning = false;
    this.enemyViews.clear();
    this.cardViews.clear();
    this.createBackground();
    this.createStaticUi();
    this.startCombat();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    });
  }

  private startCombat(): void {
    const state = sessionState.getState();
    const activeMeta = state.activeMeta;
    if (!activeMeta) {
      this.scene.start('StartScreenScene');
      return;
    }

    const deck = [...sessionState.getCombatDeck(), ...sessionState.consumeTemporaryCards()];
    this.engine = new CombatEngine(
      deck,
      createEnemyStates(state.run.difficultyMultiplier),
      CARD_DEFINITIONS,
      state.carryOverHp ?? undefined
    );
    this.unsubscribe?.();
    this.unsubscribe = this.engine.subscribe((snapshot) => this.renderSnapshot(snapshot));
    this.engine.startBattle();
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a);
  }

  private createStaticUi(): void {
    this.statusTooltip = new StatusTooltip(this);
    new TopBar(this, GAME_WIDTH, 'Combat Prototype');
    this.playerPanel = new PlayerPanel(this, 36, 280, this.statusTooltip);
    this.combatLog = new CombatLogView(this, 340, 84, 410, 150);
    this.synergiesButton = this.createPileCounter(1032, 36, 'Synergies', () => {
      this.synergyPopup.show(this.latestSnapshot.activeSynergies);
    });
    this.synergiesButton.setText('Synergies').setOrigin(1, 0.5);
    this.deckCounterText = this.createPileCounter(1162, 36, 'Deck', () => {
      this.openPilePopup('Deck', this.latestSnapshot.deckCards);
    }).setOrigin(1, 0.5);
    this.drawPileCounterText = this.createPileCounter(36, 684, 'Draw', () => {
      this.openPilePopup('Draw Pile', this.latestSnapshot.drawPile);
    }).setOrigin(0, 1);
    this.energyText = this.add.text(36, 640, '', lightTextStyle({
      color: '#fde68a',
      fontSize: '22px',
      resolution: 2
    })).setOrigin(0, 1);
    this.discardPileCounterText = this.createPileCounter(1244, 684, 'Discard', () => {
      this.openPilePopup('Discard Pile', this.latestSnapshot.discardPile);
    }).setOrigin(1, 1);
    this.infoText = this.add.text(36, 325, '', lightTextSoftStyle({
      color: '#cbd5e1',
      fontSize: '15px',
      resolution: 2
    }));
    this.settingsButton = this.createButton(1238, 36, 52, 40, '⚙', () => {
      this.settingsPopup.setVisible(true);
    }, '18px');

    this.endTurnButton = this.createButton(1190, 605, 150, 52, 'End Turn', () => {
      this.engine.endPlayerTurn();
    });

    this.overlayText = this.add.text(0, -50, '', lightTextStyle({
      fontSize: '30px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);
    this.overlayButton = this.createButton(0, 40, 220, 54, 'Restart Combat', () => {
      sessionState.startRun();
      this.scene.start('CombatScene');
    });
    this.overlayContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.add.rectangle(0, 0, 420, 220, 0x0f172a, 0.95).setStrokeStyle(2, 0xf8fafc),
      this.overlayText,
      this.overlayButton.container
    ]);
    this.overlayContainer.setVisible(false);
    const settingsBackdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.55);
    settingsBackdrop.setInteractive();
    settingsBackdrop.on('pointerup', () => {
      this.settingsPopup.setVisible(false);
    });
    const settingsPanel = this.add.rectangle(0, 0, 340, 180, 0x0f172a, 0.96).setStrokeStyle(2, 0x94a3b8);
    const settingsTitle = this.add.text(0, -42, 'Settings', lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0.5);
    const settingsText = this.add.text(0, 0, 'Settings placeholder.\nMore options can be added here later.', lightTextSoftStyle({
      color: '#cbd5e1',
      fontSize: '18px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);
    const closeSettings = this.createButton(0, 54, 120, 42, 'Close', () => {
      this.settingsPopup.setVisible(false);
    }, '18px');
    this.settingsPopup = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      settingsBackdrop,
      settingsPanel,
      settingsTitle,
      settingsText,
      closeSettings.container
    ]);
    this.settingsPopup.setDepth(5000);
    this.settingsPopup.setVisible(false);
    this.pilePopup = new PilePopup(
      this,
      GAME_WIDTH,
      GAME_HEIGHT,
      () => {
        this.pilePopup.hide();
      },
      (groupedCard) => {
        const definition = CARD_DEFINITIONS[groupedCard.cardId];
        if (!definition) {
          return;
        }

        this.cardPreviewPopup.show(definition, groupedCard.level);
      }
    );
    this.synergyPopup = new SynergyPopup(this, GAME_WIDTH, GAME_HEIGHT, this.statusTooltip, () => {
      this.synergyPopup.hide();
    });
    this.cardPreviewPopup = new CardPreviewPopup(this, GAME_WIDTH, GAME_HEIGHT, () => {
      this.cardPreviewPopup.hide();
    });
  }

  private renderSnapshot(snapshot: CombatSnapshot): void {
    this.latestSnapshot = snapshot;
    this.playerPanel.update(snapshot);
    this.combatLog.update(snapshot.logs);
    this.deckCounterText.setText(`Deck: ${snapshot.deckCount}`);
    this.energyText.setText(`Energy: ${snapshot.player.energy}`);
    this.drawPileCounterText.setText(`Draw: ${snapshot.drawPileCount}`);
    this.discardPileCounterText.setText(`Discard: ${snapshot.discardPileCount}`);
    this.infoText.setText(
      snapshot.phase === 'player'
        ? ''
        : snapshot.phase === 'enemy'
          ? 'Enemies are acting...'
          : snapshot.phase === 'victory'
            ? 'Victory secured.'
            : 'The player has been defeated.'
    );

    this.renderEnemies(snapshot);
    this.renderHand(snapshot);
    this.updateButtonState(this.endTurnButton, snapshot.phase === 'player');

    if (snapshot.phase === 'victory' && !this.transitioning) {
      this.transitioning = true;
      sessionState.setCarryOverHp(snapshot.player.hp);
      sessionState.recordFightVictory();
      this.time.delayedCall(600, () => {
        this.scene.start('RewardScene', {
          outcome: 'victory',
          currentHp: snapshot.player.hp,
          maxHp: snapshot.player.maxHp
        } satisfies RewardSceneData);
      });
      return;
    }

    if (snapshot.phase === 'defeat' && !this.transitioning) {
      this.transitioning = true;
      const result = sessionState.resolveDefeat();
      this.time.delayedCall(600, () => {
        this.scene.start('RewardScene', {
          outcome: 'defeat',
          currentHp: snapshot.player.hp,
          maxHp: snapshot.player.maxHp,
          payout: result.payout
        } satisfies RewardSceneData);
      });
    } else {
      this.overlayContainer.setVisible(false);
    }
  }

  private renderEnemies(snapshot: CombatSnapshot): void {
    const spacing = 260;
    const centerX = 920;
    const startX = centerX - ((snapshot.enemies.length - 1) * spacing) / 2;
    const positions = snapshot.enemies.map((_, index) => startX + index * spacing);
    const enemyY = 360;

    snapshot.enemies.forEach((enemy, index) => {
      const existing = this.enemyViews.get(enemy.id);
      if (existing) {
        existing.setPosition(positions[index] ?? centerX, enemyY);
        existing.update(enemy, false);
        return;
      }

      const view = new EnemyView(this, positions[index] ?? centerX, enemyY, enemy, this.statusTooltip);
      this.enemyViews.set(enemy.id, view);
    });
  }

  private renderHand(snapshot: CombatSnapshot): void {
    for (const [instanceId, view] of this.cardViews.entries()) {
      if (!snapshot.hand.some((card) => card.instanceId === instanceId)) {
        view.destroy();
        this.cardViews.delete(instanceId);
      }
    }

    const slots = HandLayout.getSlots(snapshot.hand.length, GAME_WIDTH, 635);

    snapshot.hand.forEach((card, index) => {
      const definition = CARD_DEFINITIONS[card.cardId];
      let view = this.cardViews.get(card.instanceId);
      if (!view) {
        view = new CardView(this, card, definition);
        this.cardViews.set(card.instanceId, view);
        this.bindCardInteractions(view);
      }

      const slot = slots[index];
      const resolvedDefinition = getCardDefinitionForLevel(definition, card.level);
      view.setBaseScale(1);
      view.setPlayerStrength(snapshot.player.strength);
      view.setPlayerStatuses(snapshot.player.statuses);
      view.setSynergyState(snapshot.activeSynergies.some((synergy) => synergy.id === 'fire-5') ? 1 : 0);
      view.setHomeTransform(slot.x, slot.y, slot.rotation);
      view.snapHome();
      view.setHomeDepth(index);
      view.setCardState(snapshot.player.energy >= resolvedDefinition.cost && snapshot.phase === 'player');
    });
  }

  private bindCardInteractions(view: CardView): void {
    const interactiveTarget = view.getInteractiveTarget();

    interactiveTarget.on('pointerover', () => {
      view.setHoverActive(true);
      view.setHoveredTarget(null);
      view.setDepth(1000);
    });

    interactiveTarget.on('pointerout', () => {
      view.setHoverActive(false);
      view.setHoveredTarget(null);
      view.restoreHomeDepth();
    });

    this.input.setDraggable(interactiveTarget);
    interactiveTarget.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.dragOffsets.set(view.card.instanceId, {
        x: pointer.worldX - view.x,
        y: pointer.worldY - view.y
      });
      view.setDragging(true);
      view.setHoveredTarget(null);
      view.rotation = 0;
      view.setDepth(2000);
    });

    interactiveTarget.on('drag', (pointer: Phaser.Input.Pointer) => {
      const offset = this.dragOffsets.get(view.card.instanceId) ?? { x: 0, y: 0 };
      const dragX = pointer.worldX - offset.x;
      const dragY = pointer.worldY - offset.y;
      view.setPosition(dragX, dragY);
      const hoveredEnemy = this.highlightEnemyUnderPoint(pointer.worldX, pointer.worldY);
      view.setHoveredTarget(hoveredEnemy ? hoveredEnemy : null);
    });

    interactiveTarget.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.dragOffsets.delete(view.card.instanceId);
      this.clearEnemyHighlights();
      view.setDragging(false);
      view.setHoveredTarget(null);
      view.restoreHomeDepth();
      this.handleCardDrop(view, pointer.worldX, pointer.worldY);
    });
  }

  private highlightEnemyUnderPoint(x: number, y: number): CombatSnapshot['enemies'][number] | null {
    let hoveredEnemy: CombatSnapshot['enemies'][number] | null = null;

    for (const enemy of this.latestSnapshot.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view) {
        continue;
      }

      const isHovered = view.containsPoint(x, y);
      if (isHovered && enemy.alive) {
        hoveredEnemy = enemy;
      }

      view.update(enemy, isHovered);
    }

    return hoveredEnemy;
  }

  private clearEnemyHighlights(): void {
    for (const enemy of this.latestSnapshot.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (view) {
        view.update(enemy, false);
      }
    }
  }

  private getEnemyAt(x: number, y: number): EnemyView | null {
    for (const enemy of this.latestSnapshot.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view || !enemy.alive) {
        continue;
      }

      if (view.containsPoint(x, y)) {
        return view;
      }
    }

    return null;
  }

  private handleCardDrop(view: CardView, dropX: number, dropY: number): void {
    if (
      this.pilePopup.isVisible() ||
      this.cardPreviewPopup.isVisible() ||
      this.synergyPopup.isVisible() ||
      this.settingsPopup.visible
    ) {
      view.snapHome();
      return;
    }

    const definition = view.definition;

    if (definition.targetType === 'enemy') {
      const target = this.getEnemyAt(dropX, dropY);
      if (!target) {
        view.snapHome();
        return;
      }

      const result = this.engine.playCard(view.card.instanceId, target.enemyId);
      if (!result.success) {
        this.showError(result.reason ?? 'Invalid target.');
        view.snapHome();
      }
      return;
    }

    if (!this.isInPlayZone(dropY)) {
      view.snapHome();
      return;
    }

    const result = this.engine.playCard(view.card.instanceId);
    if (!result.success) {
      this.showError(result.reason ?? 'Card could not be played.');
      view.snapHome();
    }
  }

  private isInPlayZone(worldY: number): boolean {
    const playZoneHeight = this.scale.height * (1 - CombatScene.HAND_ZONE_RATIO);
    return worldY < playZoneHeight;
  }

  private openPilePopup(title: string, cards: CombatSnapshot['deckCards']): void {
    if (!this.latestSnapshot) {
      return;
    }

    this.pilePopup.show(title, groupCardInstancesForDisplay(cards, CARD_DEFINITIONS));
  }

  private showError(message: string): void {
    this.infoText.setText(message);
    this.time.delayedCall(1400, () => {
      if (this.latestSnapshot) {
        this.infoText.setText(
          this.latestSnapshot.phase === 'player'
            ? ''
            : this.latestSnapshot.phase === 'enemy'
              ? 'Enemies are acting...'
              : this.latestSnapshot.phase === 'victory'
                ? 'Victory secured.'
                : 'The player has been defeated.'
        );
      }
    });
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

    return { container, label: text, background };
  }

  private createPileCounter(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, `${label}: 0`, lightTextStyle({
      fontSize: '20px',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 },
      resolution: 2
    }));
    text.setInteractive({ useHandCursor: true });
    text.on('pointerup', () => onClick());
    return text;
  }

  private updateButtonState(button: ButtonParts, enabled: boolean): void {
    button.background.setFillStyle(enabled ? 0x2563eb : 0x475569, 1);
    button.background.disableInteractive();

    if (enabled) {
      button.background.setInteractive({ useHandCursor: true });
    }
  }
}
