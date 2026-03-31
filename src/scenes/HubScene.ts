import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { sessionState } from '../core/sessionState';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

export class HubScene extends Phaser.Scene {
  private feedbackText!: Phaser.GameObjects.Text;

  public constructor() {
    super('HubScene');
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    const state = sessionState.getState();
    const meta = state.activeMeta;

    if (!meta) {
      this.scene.start('StartScreenScene');
      return;
    }

    sessionState.touchActiveSave();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1220);
    this.add.text(GAME_WIDTH / 2, 72, 'Hub', lightTextStyle({
      fontSize: '36px',
      resolution: 2
    })).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 220, 760, 180, 0x13213c).setStrokeStyle(2, 0x475569);
    this.add.text(300, 150, `Active Save: Slot ${meta.slotId}`, lightTextStyle({
      fontSize: '24px',
      resolution: 2
    }));
    this.add.text(300, 196, `Level: ${meta.playerLevel}`, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));
    this.add.text(300, 228, `XP: ${meta.playerXp}`, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));
    this.add.text(300, 260, `Essence: ${meta.essence}`, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));
    this.add.text(300, 292, `Shards: ${meta.shards}`, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));
    this.add.text(700, 196, `Deck Size: ${meta.currentDeck.length}`, lightTextSoftStyle({
      fontSize: '20px',
      resolution: 2
    }));

    this.createButton(GAME_WIDTH / 2, 400, 260, 56, 'Start Run', () => {
      sessionState.startRun();
      this.scene.start('CombatScene');
    });
    this.createButton(GAME_WIDTH / 2, 476, 260, 56, 'Deckbuilder', () => {
      this.scene.start('DeckbuilderScene');
    });
    this.createButton(GAME_WIDTH / 2, 552, 260, 56, 'Card Upgrades', () => {
      this.scene.start('UpgradeScene');
    });
    this.createButton(GAME_WIDTH / 2, 628, 260, 56, 'Permanent Upgrades', () => {
      this.feedbackText.setText('Permanent Upgrades are a placeholder for now.');
    });
    this.createButton(180, 650, 220, 48, 'Back to Save Select', () => {
      sessionState.clearActiveSave();
      this.scene.start('StartScreenScene');
    });

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 680, '', lightTextSoftStyle({
      color: '#cbd5e1',
      fontSize: '18px',
      align: 'center',
      resolution: 2
    })).setOrigin(0.5);
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, width, height, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    this.add.text(x, y, label, lightTextStyle({
      fontSize: '22px',
      resolution: 2
    })).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => onClick());
  }
}
