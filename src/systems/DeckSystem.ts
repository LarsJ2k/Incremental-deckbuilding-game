import type { CardInstance } from '../core/types';

export class DeckSystem {
  private readonly allCards: CardInstance[];
  private drawPile: CardInstance[];
  private discardPile: CardInstance[];
  private hand: CardInstance[];

  public constructor(cards: CardInstance[]) {
    this.allCards = cards.map((card) => ({ ...card }));
    this.drawPile = this.shuffle(cards.map((card) => ({ ...card })));
    this.discardPile = [];
    this.hand = [];
  }

  public getDeckSize(): number {
    return this.allCards.length;
  }

  public getHand(): CardInstance[] {
    return this.hand.map((card) => ({ ...card }));
  }

  public getAllCards(): CardInstance[] {
    return this.allCards.map((card) => ({ ...card }));
  }

  public getDrawPile(): CardInstance[] {
    return this.drawPile.map((card) => ({ ...card }));
  }

  public getDiscardPile(): CardInstance[] {
    return this.discardPile.map((card) => ({ ...card }));
  }

  public getDrawPileCount(): number {
    return this.drawPile.length;
  }

  public getDiscardPileCount(): number {
    return this.discardPile.length;
  }

  public draw(count: number): CardInstance[] {
    const drawn: CardInstance[] = [];

    while (drawn.length < count) {
      if (this.drawPile.length === 0 && this.discardPile.length > 0) {
        this.drawPile = this.shuffle(this.discardPile);
        this.discardPile = [];
      }

      const nextCard = this.drawPile.shift();
      if (!nextCard) {
        break;
      }

      this.hand.push(nextCard);
      drawn.push({ ...nextCard });
    }

    return drawn;
  }

  public findHandCard(instanceId: string): CardInstance | undefined {
    return this.hand.find((card) => card.instanceId === instanceId);
  }

  public removeFromHand(instanceId: string): CardInstance | null {
    const index = this.hand.findIndex((card) => card.instanceId === instanceId);
    if (index < 0) {
      return null;
    }

    const [card] = this.hand.splice(index, 1);
    return card ?? null;
  }

  public discard(card: CardInstance): void {
    this.discardPile.push(card);
  }

  public discardHand(): CardInstance[] {
    const cards = [...this.hand];
    this.discardPile.push(...cards);
    this.hand = [];
    return cards;
  }

  private shuffle(cards: CardInstance[]): CardInstance[] {
    const result = [...cards];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = result[index];
      result[index] = result[swapIndex] as CardInstance;
      result[swapIndex] = current as CardInstance;
    }

    return result;
  }
}
