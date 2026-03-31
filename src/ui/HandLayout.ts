import Phaser from 'phaser';

export interface HandSlot {
  x: number;
  y: number;
  rotation: number;
}

export class HandLayout {
  public static getSlots(cardCount: number, width: number, y: number): HandSlot[] {
    if (cardCount === 0) {
      return [];
    }

    const maxHandWidth = Math.min(width - 260, 760);
    const spacing = cardCount === 1 ? 0 : Math.min(118, Math.max(64, maxHandWidth / (cardCount - 1)));
    const startX = width / 2 - ((cardCount - 1) * spacing) / 2;
    const midPoint = (cardCount - 1) / 2;

    return Array.from({ length: cardCount }, (_, index) => ({
      x: startX + index * spacing,
      y: y + Math.abs(index - midPoint) * 6,
      rotation: Phaser.Math.DegToRad((index - midPoint) * 1.4)
    }));
  }
}
