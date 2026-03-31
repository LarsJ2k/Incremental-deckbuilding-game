import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { BootScene } from '../scenes/BootScene';
import { CombatScene } from '../scenes/CombatScene';
import { DeckbuilderScene } from '../scenes/DeckbuilderScene';
import { HubScene } from '../scenes/HubScene';
import { RewardScene } from '../scenes/RewardScene';
import { StartScreenScene } from '../scenes/StartScreenScene';
import { UpgradeScene } from '../scenes/UpgradeScene';

export function createGame(parent: string): Phaser.Game {
  const config = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    resolution: window.devicePixelRatio || 1,
    backgroundColor: '#10151f',
    scene: [BootScene, StartScreenScene, HubScene, DeckbuilderScene, UpgradeScene, CombatScene, RewardScene],
    render: {
      roundPixels: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  } as Phaser.Types.Core.GameConfig & { resolution: number };

  return new Phaser.Game(config as Phaser.Types.Core.GameConfig);
}
