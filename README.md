# Deckbuilder Roguelite Combat Prototype

Single-player vertical-slice combat prototype built with Vite, TypeScript in strict mode, and Phaser 3.

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`
3. Run `npm run dev`
4. Open the local Vite URL in your browser.

## What is included

- Phaser scene-based combat prototype
- Player deck, draw pile, discard pile, hand, HP, block, and energy
- Drag-and-drop targeting for enemy-target cards
- Click-to-play support for self and no-target cards
- Three enemies with distinct mechanics and visible intents
- Turn flow, status effects, deck-size scaling, reward loop, and defeat restart
- Lightweight deck-tag synergy system with Fire synergy tiers

## Architecture

- `src/scenes`
  - Phaser scene orchestration (`BootScene`, `CombatScene`, `RewardScene`)
- `src/systems`
  - Rules and combat logic (`CombatEngine`, `DeckSystem`, `CardResolver`, `EnemyAI`, `SynergySystem`)
- `src/data`
  - Card and enemy definition data plus starting deck creation
- `src/ui`
  - Reusable Phaser UI components for cards, enemies, player panel, hand layout, and combat log
- `src/core`
  - Shared types, constants, and prototype session state
- `src/utils`
  - Helper utilities like ID creation, clamping, and deck-size scaling

The scene layer is mostly responsible for rendering and player interaction, while the systems layer owns combat state and rules.

## Known limitations

- This is a combat-only prototype with no hub, map, save system, permanent progression, or multi-fight run structure.
- UI uses placeholder rectangles and text only.
- Reward effects are intentionally lightweight and stored only in memory for the next combat loop.
- Combat balance is prototype-level and not tuned.
- Audio, polished animation, and card upgrade flows are not implemented yet.
