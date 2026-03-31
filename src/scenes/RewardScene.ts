import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { sessionState } from '../core/sessionState';
import type { RewardBundle } from '../core/types';
import { lightTextSoftStyle, lightTextStyle } from '../utils/textStyles';

interface RewardSceneData {
  outcome: 'victory' | 'defeat' | 'suspended';
  currentHp: number;
  maxHp: number;
  payout?: RewardBundle;
}

function formatMultiplier(multiplier: number): string {
  return multiplier.toFixed(2);
}

function formatRewards(bundle: RewardBundle): string[] {
  return [
    `XP: ${bundle.xp}`,
    `Essence: ${bundle.essence}`,
    `Shards: ${bundle.shards}`
  ];
}

export class RewardScene extends Phaser.Scene {
  private outcome: 'victory' | 'defeat' | 'suspended' = 'victory';
  private currentHp = 0;
  private maxHp = 0;
  private payout: RewardBundle = { xp: 0, essence: 0, shards: 0 };

  public constructor() {
    super('RewardScene');
  }

  public init(data: RewardSceneData): void {
    this.outcome = data.outcome;
    this.currentHp = data.currentHp;
    this.maxHp = data.maxHp;
    this.payout = data.payout ?? { xp: 0, essence: 0, shards: 0 };
  }

  public create(): void {
    this.cameras.main.roundPixels = true;
    if (this.outcome === 'suspended') {
      sessionState.resumeSuspendedRun();
    }

    const state = sessionState.getState();
    const displayRun = state.run;

    if (this.outcome === 'victory') {
      sessionState.saveSuspendedRun(this.currentHp);
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1220);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 500, 0x111827, 0.96).setStrokeStyle(2, 0x94a3b8);

    const title = this.outcome === 'defeat' ? 'Run Lost' : 'Between Fights';
    this.add.text(GAME_WIDTH / 2, 120, title, lightTextStyle({
      fontSize: '34px',
      resolution: 2
    })).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 164, `HP: ${this.currentHp} / ${this.maxHp}`, lightTextSoftStyle({
      color: '#cbd5e1',
      fontSize: '18px',
      resolution: 2
    })).setOrigin(0.5);

    if (this.outcome === 'victory' || this.outcome === 'suspended') {
      this.add.text(330, 220, 'Current Unclaimed Rewards', lightTextStyle({
        fontSize: '24px',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(330, 300, formatRewards(displayRun.unclaimedRewards).join('\n'), lightTextSoftStyle({
        color: '#f8fafc',
        fontSize: '22px',
        lineSpacing: 12,
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(840, 230, `Enemy stats: x${formatMultiplier(displayRun.difficultyMultiplier)}`, lightTextStyle({
        fontSize: '24px',
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(840, 290, `Rewards: x${formatMultiplier(displayRun.difficultyMultiplier)}`, lightTextSoftStyle({
        color: '#86efac',
        fontSize: '22px',
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(840, 350, `Next fight: ${displayRun.fightIndex + 1}`, lightTextSoftStyle({
        color: '#cbd5e1',
        fontSize: '18px',
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.createButton(GAME_WIDTH / 2 - 220, 530, 180, 56, 'Cash Out', () => {
        sessionState.cashOutRun();
        this.scene.start('HubScene');
      });

      this.createButton(GAME_WIDTH / 2, 530, 220, 56, this.outcome === 'suspended' ? 'Resume Run' : 'Continue', () => {
        if (this.outcome === 'suspended') {
          sessionState.resumeSuspendedRun();
        }
        this.scene.start('CombatScene');
      });

      this.createButton(GAME_WIDTH / 2 + 230, 530, 260, 56, 'Save & Return to Main Menu', () => {
        sessionState.saveSuspendedRun(this.currentHp);
        sessionState.clearActiveSave();
        this.scene.start('StartScreenScene');
      }, '18px');
    } else {
      this.add.text(GAME_WIDTH / 2, 250, 'You banked 50% of your unclaimed rewards.', lightTextStyle({
        fontSize: '24px',
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 340, formatRewards(this.payout).join('\n'), lightTextSoftStyle({
        color: '#f8fafc',
        fontSize: '24px',
        lineSpacing: 12,
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 430, 'The rewards were saved to this slot. Return to the hub to start again.', lightTextSoftStyle({
        color: '#cbd5e1',
        fontSize: '18px',
        align: 'center',
        resolution: 2
      })).setOrigin(0.5);

      this.createButton(GAME_WIDTH / 2, 530, 260, 56, 'Return to Hub', () => {
        this.scene.start('HubScene');
      });
    }

    panel.setDepth(-1);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    fontSize: string = '22px'
  ): void {
    const bg = this.add.rectangle(x, y, width, height, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
    this.add.text(x, y, label, lightTextStyle({
      fontSize,
      resolution: 2
    })).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => onClick());
  }
}
