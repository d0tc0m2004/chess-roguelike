# SESSION HANDOFF DOCUMENT
> This document contains everything needed to continue development in a new session.
> **Last Updated:** Session 1 - PROTOTYPE COMPLETE

---

## Project Overview

**Game:** Chess Roguelike (untitled)
**Location:** `C:\Users\nellu\OneDrive\Desktop\Chess rougelike`
**Tech Stack:** TBD (likely browser-based HTML/CSS/JS like Throne)

**Core Concept:** 
Chess roguelike where player has CHEAT cards that break rules. Cards are overpowered but still require skill/strategy to use effectively. Choose a starting loadout (piece composition), battle through increasingly difficult enemy formations, collect cards, beat the final boss.

---

## Key Documents

| File | Purpose |
|------|---------|
| `GAME_DESIGN.md` | Full game design document |
| `SESSION_HANDOFF.md` | This file - context for new sessions |
| `CHANGELOG.md` | Track all changes made (create when dev starts) |

---

## Current State

### Phase: PROTOTYPE COMPLETE (Playable)

**Done:**
- [x] Core concept finalized
- [x] Card system designed (20 cards across 4 rarities)
- [x] Loadout system designed (8 army compositions)
- [x] Run structure defined (5 battles + boss)
- [x] Win/lose conditions defined
- [x] Game design document written
- [x] **Project setup (HTML/CSS/JS)**
- [x] **8x8 board rendering**
- [x] **All piece movement logic (King, Queen, Rook, Bishop, Knight, Pawn)**
- [x] **Turn system with piece selection**
- [x] **Capture mechanics**
- [x] **Win/lose detection (King capture)**
- [x] **Enemy AI (aggressive, shows intent)**
- [x] **5 working cards (Stall, Teleport, Freeze, Swap, Promote)**
- [x] **Single battle playable**

**Not Started:**
- [ ] Multiple battles per run
- [ ] Card reward screen after battles
- [ ] Loadout selection screen
- [ ] Meta-progression (unlocks, currency)
- [ ] More cards (15 more planned)
- [ ] Sound/music
- [ ] Polish and juice

---

## Design Decisions (Summary)

### Board
- 8x8 grid (standard chess board)
- Enemy has FULL army, you have few pieces
- Board feels full because THEY fill it, not you

### Your Army
- Choose loadout before run
- Examples: King + 4 Pawns, King + 3 Knights, King + 2 Queens
- Pieces lost in battle are GONE for the run (permadeath)
- Can recruit Pawns between battles

### CHEAT Cards
- Start with 3 random cards
- Hand limit: 7 cards
- Can play up to 3 cards per battle
- Cards are NOT consumed (keep them)
- Exception: "BURN" cards are single-use per run
- Cards create OPPORTUNITIES, not auto-wins

### Enemy
- **FULL OR NEAR-FULL ARMY every battle** (8-16 pieces)
- You're always massively outnumbered (that's why you have cheats!)
- AI is aggressive but predictable (not chess engine)
- Shows intended move before executing
- Final boss: The Ivory King (full 16-piece army)

### Run Structure
- 5 battles + 1 boss
- After each win: Pick 1 of 3 cards
- Target run time: 20-30 minutes

---

## MVP Scope (First Prototype)

Build order for playable prototype:

1. **Board & Rendering**
   - 8x8 grid
   - Piece display (your pieces vs enemy pieces)
   - Click to select, click to move

2. **Basic Chess Logic**
   - Piece movement rules (King, Queen, Rook, Bishop, Knight, Pawn)
   - Capture logic
   - Check/checkmate detection (simplified - just King capture)

3. **Enemy AI (Simple)**
   - Looks at all possible moves
   - Prioritizes captures (especially your King)
   - Shows intended move before executing
   - Falls back to aggressive positioning if no captures

4. **Card System**
   - Hand display (bottom of screen)
   - Click card to activate
   - Implement 5 cards for testing:
     - Stall (skip enemy turn)
     - Teleport (move piece anywhere)
     - Freeze (lock enemy piece 2 turns)
     - Swap (exchange two pieces)
     - Promote (pawn becomes queen)

5. **Single Battle Flow**
   - Your army: King + 4 Pawns (5 pieces)
   - Enemy army: King + Queen + 2 Rooks + 4 Pawns (8 pieces)
   - Take turns until win/lose
   - Test if underdog + cheats feels fun

---

## Open Questions (For User Decision)

1. **Game name?** - Need a title
2. **Art style?** - Minimalist / Pixel / Stylized?
3. **Sound/music?** - Priority or later?
4. **Save system?** - Can quit mid-run?

---

## Technical Notes

### File Structure
```
Chess rougelike/
├── index.html      # Main HTML
├── style.css       # All styles
├── game.js         # All game logic (~600 lines)
├── GAME_DESIGN.md  # Design document
├── SESSION_HANDOFF.md  # This file
```

### Code Architecture (game.js)
- `ChessRoguelike` class contains all game state and logic
- Key methods:
  - `setupBattle()` - Sets up player and enemy pieces
  - `getValidMoves(piece)` - Returns valid moves for any piece
  - `movePiece(piece, row, col)` - Executes a move
  - `handleCardClick(cardId)` - Card selection
  - `handleCardAction(row, col)` - Card targeting
  - `calculateEnemyIntent()` - AI move selection
  - `doEnemyTurn()` - Executes enemy turn

### How Cards Work
- Cards have an `action` type: `instant`, `selectPiece`, `selectEnemy`, `selectTwo`, `selectPawn`
- `cardState` tracks multi-step card actions
- `finishCardPlay()` called after any card completes

### Enemy AI
- Scores all possible moves
- Prioritizes: captures > moving toward player > center control
- Shows intent before executing (player can see and counter)
- Frozen pieces are skipped

---

## Next Session Should

1. Read `GAME_DESIGN.md` for full context
2. Read this file for current state
3. **Test the prototype:** Open `index.html` in browser
4. **Gather feedback:** Is the core loop fun?
5. **Next features to add (in order):**
   - Multiple battles per run (Battle 1 → reward → Battle 2...)
   - Card reward screen (pick 1 of 3)
   - Loadout selection at start
   - More cards
6. Update this document after making progress

---

## Reference: Card List (Quick)

**Common:** Nudge, Stall, Scout, Shield, Dash
**Uncommon:** Freeze, Teleport, Swap, Promote, Rally
**Rare:** Clone, Kidnap, Resurrect, Queen's Gambit, Sabotage
**Legendary:** Mind Control, Checkmate Denied [BURN], Demotion, Army of One, Rewind [BURN]

---

## Reference: Loadouts (Quick)

| Name | Pieces |
|------|--------|
| The Peasant Revolt | King + 4 Pawns |
| The Balanced | King + Knight + Rook + Pawn |
| The Cavalry | King + 3 Knights |
| The Fortress | King + 2 Rooks |
| The Church | King + 2 Bishops |
| The Fallen Royals | King + 2 Queens |
| The Horde | King + 6 Pawns |
| The Lonely King | King only |
