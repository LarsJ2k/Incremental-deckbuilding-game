import Phaser from 'phaser';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function lightTextStyle(overrides: TextStyle = {}): TextStyle {
  return {
    color: '#f8fafc',
    fontStyle: 'bold',
    stroke: '#020617',
    strokeThickness: 3,
    shadow: {
      offsetX: 0,
      offsetY: 1,
      color: '#020617',
      blur: 0,
      stroke: false,
      fill: true
    },
    ...overrides
  };
}

export function lightTextSoftStyle(overrides: TextStyle = {}): TextStyle {
  return {
    color: '#e2e8f0',
    fontStyle: 'bold',
    stroke: '#020617',
    strokeThickness: 2,
    shadow: {
      offsetX: 0,
      offsetY: 1,
      color: '#020617',
      blur: 0,
      stroke: false,
      fill: true
    },
    ...overrides
  };
}

export function darkTextStyle(overrides: TextStyle = {}): TextStyle {
  return {
    color: '#10151f',
    fontStyle: 'bold',
    stroke: '#f8fafc',
    strokeThickness: 1,
    ...overrides
  };
}
