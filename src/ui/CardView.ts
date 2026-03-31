import Phaser from 'phaser';
import type { CardDefinition, CardInstance, EnemyCombatState, PlayerCombatState } from '../core/types';
import { getCardDefinitionForLevel } from '../data/cards';
import { getCardPreviewValues } from '../utils/combatMath';
import { darkTextStyle, lightTextStyle } from '../utils/textStyles';

export class CardView extends Phaser.GameObjects.Container {
  public static readonly WIDTH = 124;
  public static readonly HEIGHT = 176;
  public readonly card: CardInstance;
  public readonly definition: CardDefinition;
  private readonly resolvedDefinition: CardDefinition;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly costBadge: Phaser.GameObjects.Arc;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly costText: Phaser.GameObjects.Text;
  private readonly stackBadge: Phaser.GameObjects.Rectangle;
  private readonly stackText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly previewPrefixText: Phaser.GameObjects.Text;
  private readonly previewValueText: Phaser.GameObjects.Text;
  private readonly previewSuffixText: Phaser.GameObjects.Text;
  private readonly typeText: Phaser.GameObjects.Text;
  private readonly tagText: Phaser.GameObjects.Text;
  private homeX = 0;
  private homeY = 0;
  private homeRotation = 0;
  private homeDepth = 0;
  private baseScale = 1;
  private isDragging = false;
  private isHovered = false;
  private previewActive = false;
  private playerStrength = 0;
  private playerStatuses: Pick<PlayerCombatState, 'statuses'>['statuses'] = {};
  private hoveredTarget: Pick<EnemyCombatState, 'statuses'> | null = null;
  private fireTier = 0;
  private hoverScaleMultiplier = 1.1;
  private hoverLift = 24;

  public constructor(scene: Phaser.Scene, card: CardInstance, definition: CardDefinition) {
    super(scene, 0, 0);
    this.card = card;
    this.definition = definition;
    this.resolvedDefinition = getCardDefinitionForLevel(definition, card.level);

    this.background = scene.add
      .rectangle(0, 0, CardView.WIDTH, CardView.HEIGHT, 0xf5e6c8)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x2f3542);
    this.costBadge = scene.add.circle(-50, -76, 18, 0x1d4ed8).setStrokeStyle(2, 0xdbeafe);
    this.costText = scene.add.text(-50, -76, String(this.resolvedDefinition.cost), lightTextStyle({
      fontSize: '24px',
      resolution: 2
    })).setOrigin(0.5);
    this.stackBadge = scene.add.rectangle(40, -72, 30, 20, 0x0f172a, 0.92).setStrokeStyle(2, 0x94a3b8).setVisible(false);
    this.stackText = scene.add.text(40, -72, '', lightTextStyle({
      fontSize: '12px',
      resolution: 2
    })).setOrigin(0.5).setVisible(false);
    this.titleText = scene.add.text(0, -74, definition.name, darkTextStyle({
      fontSize: '16px',
      align: 'center',
      wordWrap: { width: 82 },
      resolution: 2
    })).setOrigin(0.5, 0);
    this.typeText = scene.add.text(0, -28, definition.type.toUpperCase(), darkTextStyle({
      color: '#4b5563',
      fontSize: '12px',
      resolution: 2
    })).setOrigin(0.5, 0.5);
    this.previewPrefixText = scene.add.text(-44, -2, '', darkTextStyle({
      fontSize: '13px',
      resolution: 2
    })).setOrigin(0, 0.5);
    this.previewValueText = scene.add.text(0, -2, '', darkTextStyle({
      color: '#16a34a',
      fontSize: '13px',
      resolution: 2
    })).setOrigin(0, 0.5);
    this.previewSuffixText = scene.add.text(14, -2, '', darkTextStyle({
      fontSize: '13px',
      wordWrap: { width: 82 },
      resolution: 2
    })).setOrigin(0, 0.5);
    this.bodyText = scene.add.text(0, 10, this.resolvedDefinition.description, darkTextStyle({
      fontSize: '13px',
      align: 'center',
      wordWrap: { width: 100 },
      resolution: 2
    })).setOrigin(0.5, 0.5);
    this.tagText = scene.add.text(0, 66, definition.tags.join(', '), darkTextStyle({
      color: '#7c2d12',
      fontSize: '11px',
      align: 'center',
      wordWrap: { width: 104 },
      resolution: 2
    })).setOrigin(0.5, 0.5);

    this.add([
      this.background,
      this.costBadge,
      this.costText,
      this.stackBadge,
      this.stackText,
      this.titleText,
      this.typeText,
      this.previewPrefixText,
      this.previewValueText,
      this.previewSuffixText,
      this.bodyText,
      this.tagText
    ]);
    this.setSize(CardView.WIDTH, CardView.HEIGHT);
    this.background.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
    this.refreshDescription();
  }

  public getInteractiveTarget(): Phaser.GameObjects.Rectangle {
    return this.background;
  }

  public setInteractionEnabled(enabled: boolean): void {
    if (enabled) {
      this.background.setInteractive({ useHandCursor: true });
      return;
    }

    this.background.disableInteractive();
  }

  public setHomeTransform(x: number, y: number, rotation: number): void {
    this.homeX = x;
    this.homeY = y;
    this.homeRotation = rotation;
  }

  public snapHome(): void {
    this.setPosition(this.homeX, this.homeY);
    this.rotation = this.homeRotation;
  }

  public setHomeDepth(depth: number): void {
    this.homeDepth = depth;
    if (!this.isDragging && !this.isHovered) {
      this.setDepth(depth);
    }
  }

  public restoreHomeDepth(): void {
    if (!this.isDragging && !this.isHovered) {
      this.setDepth(this.homeDepth);
    }
  }

  public setCardState(isAffordable: boolean): void {
    const fillColor = this.definition.tags.includes('fire') ? 0xf5d0a9 : 0xf5e6c8;
    this.background.setFillStyle(fillColor, isAffordable ? 1 : 0.45);
    this.costBadge.setFillStyle(isAffordable ? 0x1d4ed8 : 0x64748b, 1);
    this.alpha = isAffordable ? 1 : 0.65;
  }

  public setStackCount(count: number): void {
    const visible = count > 1;
    this.stackBadge.setVisible(visible);
    this.stackText.setVisible(visible);
    if (!visible) {
      return;
    }

    this.stackText.setText(`${count}x`);
  }

  public setHoverActive(active: boolean): void {
    if (this.isDragging) {
      return;
    }

    this.isHovered = active;
    this.previewActive = active;
    this.refreshDescription();

    this.scene.tweens.add({
      targets: this,
      y: active ? this.homeY - this.hoverLift : this.homeY,
      scaleX: active ? this.baseScale * this.hoverScaleMultiplier : this.baseScale,
      scaleY: active ? this.baseScale * this.hoverScaleMultiplier : this.baseScale,
      duration: 120
    });
  }

  public setBaseScale(scale: number): void {
    this.baseScale = scale;
    this.setScale(scale);
  }

  public setHoverScaleMultiplier(multiplier: number): void {
    this.hoverScaleMultiplier = multiplier;
  }

  public setHoverLift(value: number): void {
    this.hoverLift = value;
  }

  public setDragging(isDragging: boolean): void {
    this.isDragging = isDragging;
    this.previewActive = isDragging || this.previewActive;
    if (!isDragging) {
      this.setScale(this.baseScale);
      this.y = this.isHovered ? this.homeY - this.hoverLift : this.homeY;
      this.previewActive = this.isHovered;
      if (!this.isHovered) {
        this.setDepth(this.homeDepth);
      }
    }
    this.refreshDescription();
  }

  public setPlayerStrength(strength: number): void {
    this.playerStrength = strength;
    this.refreshDescription();
  }

  public setPlayerStatuses(statuses: Pick<PlayerCombatState, 'statuses'>['statuses']): void {
    this.playerStatuses = { ...statuses };
    this.refreshDescription();
  }

  public setHoveredTarget(target: Pick<EnemyCombatState, 'statuses'> | null): void {
    this.hoveredTarget = target;
    this.refreshDescription();
  }

  public setSynergyState(fireTier: number): void {
    this.fireTier = fireTier;
    this.refreshDescription();
  }

  private refreshDescription(): void {
    const preview = getCardPreviewValues(
      this.definition,
      this.card.level,
      { strength: this.playerStrength, statuses: this.playerStatuses },
      this.hoveredTarget ?? undefined,
      this.fireTier
    );
    const shouldShowModifiedBase = Boolean(preview?.alwaysShowModifiedValue);
    if (!preview || (!this.previewActive && !shouldShowModifiedBase)) {
      this.previewPrefixText.setVisible(false);
      this.previewValueText.setVisible(false);
      this.previewSuffixText.setVisible(false);
      this.bodyText.setVisible(true);
      this.bodyText.setText(this.resolvedDefinition.description);
      return;
    }

    const baseValue = String(preview.baseValue);
    const splitIndex = this.resolvedDefinition.description.indexOf(baseValue);
    const prefix = splitIndex >= 0 ? this.resolvedDefinition.description.slice(0, splitIndex) : '';
    const suffix = splitIndex >= 0
      ? this.resolvedDefinition.description.slice(splitIndex + baseValue.length)
      : this.resolvedDefinition.description;

    this.previewPrefixText.setText(prefix);
    this.previewValueText.setText(String(preview.modifiedValue));
    this.previewValueText.setColor(preview.modifiedValue !== preview.baseValue ? '#16a34a' : '#10151f');
    this.previewSuffixText.setText(suffix);

    const totalWidth =
      this.previewPrefixText.width + this.previewValueText.width + this.previewSuffixText.width;
    const startX = -totalWidth / 2;
    this.previewPrefixText.setPosition(startX, -2);
    this.previewValueText.setPosition(startX + this.previewPrefixText.width, -2);
    this.previewSuffixText.setPosition(startX + this.previewPrefixText.width + this.previewValueText.width, -2);

    this.previewPrefixText.setVisible(true);
    this.previewValueText.setVisible(true);
    this.previewSuffixText.setVisible(true);
    this.bodyText.setVisible(false);
  }
}
