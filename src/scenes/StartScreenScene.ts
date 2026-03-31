import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_MAX_HP } from '../core/constants';
import { SaveManager } from '../core/SaveManager';
import { sessionState } from '../core/sessionState';
import type { SaveSlotSummary } from '../core/types';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

function formatLastPlayed(value: string | null): string {
  if (!value) {
    return 'Never played';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export class StartScreenScene extends Phaser.Scene {
  public constructor() {
    super('StartScreenScene');
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    sessionState.clearActiveSave();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1220);
    this.add.text(GAME_WIDTH / 2, 84, 'Save Select', lightTextStyle({
      fontSize: '36px',
      resolution: 2
    })).setOrigin(0.5);

    const summaries = SaveManager.getSlotSummaries();
    summaries.forEach((summary, index) => {
      const y = 190 + index * 160;
      this.createSlotPanel(summary, y);
    });
  }

  private createSlotPanel(summary: SaveSlotSummary, y: number): void {
    const onSelect = () => {
      const meta = sessionState.loadSlot(summary.slotId);
      if (meta.suspendedRun) {
        this.scene.start('RewardScene', {
          outcome: 'suspended',
          currentHp: meta.suspendedRun.currentHp,
          maxHp: PLAYER_MAX_HP
        });
        return;
      }

      this.scene.start('HubScene');
    };

    const panel = this.add.rectangle(GAME_WIDTH / 2, y, 760, 120, 0x13213c).setStrokeStyle(2, 0x475569);
    panel.setInteractive({ useHandCursor: true });
    panel.on('pointerup', onSelect);

    const leftX = GAME_WIDTH / 2 - 340;
    this.add.text(leftX, y - 34, `Slot ${summary.slotId}`, lightTextStyle({
      fontSize: '26px',
      resolution: 2
    })).setOrigin(0, 0.5);

    const lines = summary.isEmpty
      ? ['Empty Slot - Start New Game']
      : [
          `Level ${summary.playerLevel}  |  XP: ${summary.playerXp}`,
          `Essence: ${summary.essence}  |  Shards: ${summary.shards}`,
          `Last played: ${formatLastPlayed(summary.lastPlayedAt)}`
        ];

    this.add.text(leftX, y - (summary.isEmpty ? 4 : -12), lines.join('\n'), lightTextSoftStyle({
      color: summary.isEmpty ? '#cbd5e1' : '#e2e8f0',
      fontSize: '18px',
      lineSpacing: 8,
      resolution: 2
    })).setOrigin(0, 0.5);

    const actionLabel = summary.isEmpty ? 'Start New Game' : 'Load Save';
    const actionBg = this.add.rectangle(GAME_WIDTH / 2 + 280, y, 170, 48, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    actionBg.setInteractive({ useHandCursor: true });
    actionBg.on('pointerup', onSelect);
    const actionText = this.add.text(GAME_WIDTH / 2 + 280, y, actionLabel, lightTextStyle({
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);
  }
}
