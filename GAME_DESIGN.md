# CHESS ROGUELIKE - Game Design Document

## Game Identity
**Title:** TBD
**Genre:** Turn-based Tactical Roguelike
**Core Fantasy:** You're a rebel King with forbidden CHEAT cards vs an OVERWHELMING enemy army.

---

## Core Mechanics

### The Board
- **Size:** 8x8 grid.
- **Dynamic Compositions:** Enemy armies can exceed the standard 16 pieces (up to 20-30). "The board feels full because THEY fill it."

### AI System: "The Tactician" (Custom Priority AI)
*Replaces Stockfish*
- **Archetypes:** Different personalities (Swarm, Hunter, Wall, Tactician, Aggressor).
- **Intent Preview:** Player sees the enemy's plan *before* moving.
- **Card Awareness:** AI knows your hand and plays around generic threats (e.g., won't stand next to you if you have 'Swap').
- **Difficulty:** Scales by awareness accuracy and "mistake" probability.

### Formations (The Puzzle)
Battles are not fixed; they are drawn from weighted pools.
- **The Horde:** King + 16-20 Pawns.
- **The Legion:** No Pawns, all heavy pieces.
- **Knight Nightmare:** King + 8 Knights.
- **Three Queens:** King + 3 Queens.
- **Bosses:** Unique gimmicks (e.g., "The Mirror" copies your loadout x3).

---

## CHEAT Cards

### Card Philosophy
- **Broken but specific:** "Teleport King" or "Delete Pawn".
- **Interaction:** Cards solve specific board states (e.g., "Exile" is great vs "Three Queens").

### Card Rarity & Pools
*See card_ideas.md for full list*
- **Common:** Small shifts (Backstep, Nudge).
- **Uncommon:** Solid tactics (Knight's Tour, Illegal Castle).
- **Rare:** Strong effects (Mind Control, Clone).
- **Legendary:** Game-breaking (Parallel Play, Exile).

---

## Progression
- **Run:** 5 Battles + Boss.
- **Rewards:** Draft 1 of 3 cards after victory.
- **Meta:** Unlocks new starting Loadouts and Card Pools.

## MVP Scope V2
1.  **Custom AI:** Priority-based, no engine lag.
2.  **Formation System:** Support >16 pieces.
3.  **Expanded Hand:** 25+ implemented cards.
4.  **Polish:** Intent arrows, clean UI (Vertical + Fan).
