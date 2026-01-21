# CHESS ROGUELIKE - Game Design Document

## Game Identity

**Title:** TBD (Working title: "Cheat the Crown" / "King's Gambit" / "Rogue Chess")

**Genre:** Turn-based Tactical Roguelike

**Core Fantasy:** You're a rebel King who found forbidden CHEAT cards that break the rules of chess. The enemy plays fair. You don't.

**Core Loop:** Broken tools + Skill to use them = Satisfying victories

---

## Core Mechanics

### The Board
- **Size:** 8x8 grid (standard chess board)
- **Why:** Enemy has full/near-full army. You're the underdog with few pieces. The board feels full because THEY fill it.

### Your Army (Loadouts)
You choose a starting loadout before each run:

| Loadout | Pieces | Playstyle | Unlock |
|---------|--------|-----------|--------|
| **The Peasant Revolt** | King + 4 Pawns | Swarm, promotion | Starter |
| **The Balanced** | King + Knight + Rook + Pawn | Flexible | Starter |
| **The Cavalry** | King + 3 Knights | Forks, mobility | Win 1 run |
| **The Fortress** | King + 2 Rooks | Line control | Win with no pieces lost |
| **The Church** | King + 2 Bishops | Diagonals | Win in under 20 moves |
| **The Fallen Royals** | King + 2 Queens | Raw power, fragile | Win on Hard mode |
| **The Horde** | King + 6 Pawns | Bodies everywhere | Promote 5 pawns total |
| **The Lonely King** | King only | Pure card reliance | Beat final boss |

### Enemy Armies
**Core Principle:** You have CHEATS because the enemy is OVERWHELMING. Every battle is David vs Goliath.

Each battle has a pre-designed enemy formation (full or near-full army):

| Battle | Enemy Army | Piece Count |
|--------|------------|-------------|
| **Battle 1** | King + Queen + 2 Rooks + 4 Pawns | 8 pieces |
| **Battle 2** | King + Queen + 2 Bishops + 2 Knights + 4 Pawns | 10 pieces |
| **Battle 3** | King + Queen + 2 Rooks + 2 Knights + 6 Pawns | 12 pieces |
| **Battle 4** | King + Queen + 2 Rooks + 2 Bishops + 2 Knights + 4 Pawns | 14 pieces |
| **Battle 5** | Full army (King + Queen + 2 Rooks + 2 Bishops + 2 Knights + 8 Pawns) | 16 pieces |
| **Boss** | The Ivory King - Full army with aggressive perfect positioning | 16 pieces |

**You:** Start with 3-5 pieces, maybe grow to 6-8 by endgame.
**Enemy:** Always 8-16 pieces.

**Enemy AI Behavior:**
- NOT a chess engine
- **Aggressive:** Prioritizes attacking your pieces
- **Predictable:** Shows intended move before executing (you can see what they'll do)
- **Escalating:** Later battles have smarter patterns
- **Exploitable:** Good card play + tactics can dismantle them

### Win/Lose Conditions

**You Lose:**
- Your King is captured = Run Over

**You Win (per battle):**
- Enemy has King? Checkmate or capture King.
- Enemy has no King? Eliminate all enemy pieces.

---

## CHEAT Cards

### Card Philosophy
- Cards are BROKEN
- But they don't auto-win
- They CREATE OPPORTUNITIES
- You must EXECUTE the tactic

### Card Limit
- **Hand size:** Max 7 cards
- **Per battle:** Can play up to 3 cards
- **Cards are NOT consumed** (keep them for future battles)
- **Exception:** Some powerful cards are "Burn" - single use per run

### Card Rarity

| Rarity | Drop Rate | Power Level |
|--------|-----------|-------------|
| Common | 60% | Small advantage |
| Uncommon | 25% | Solid ability |
| Rare | 12% | Strong effect |
| Legendary | 3% | Game-changing |

### Card List (Initial Set - 20 Cards)

**COMMON:**
1. **Nudge** - Move any piece 1 square in any direction (ignoring normal rules)
2. **Stall** - Enemy skips their next move
3. **Scout** - See enemy's next 2 planned moves
4. **Shield** - One piece cannot be captured this turn
5. **Dash** - One piece can move twice this turn

**UNCOMMON:**
6. **Freeze** - Enemy piece cannot move for 2 turns
7. **Teleport** - Move any of your pieces to any empty square
8. **Swap** - Exchange positions of any two pieces (yours or enemy)
9. **Promote** - Pawn instantly becomes any piece (Queen/Rook/Bishop/Knight)
10. **Rally** - All your Pawns move forward 1 square (if able)

**RARE:**
11. **Clone** - Duplicate one of your pieces to an adjacent empty square
12. **Kidnap** - Move any enemy piece to any empty square
13. **Resurrect** - Bring back one captured piece to your back row
14. **Queen's Gambit** - Your King moves like a Queen this turn
15. **Sabotage** - Enemy piece moves like a Pawn for 2 turns

**LEGENDARY:**
16. **Mind Control** - Take control of enemy piece for 1 turn (moves as yours)
17. **Checkmate Denied** [BURN] - If your King would be captured, survive with 1 "life"
18. **Demotion** - Enemy Queen becomes a Pawn permanently
19. **Army of One** - Your King can capture without being in danger this turn
20. **Rewind** [BURN] - Undo the last 3 moves (yours and enemy's)

---

## Progression Systems

### Per Run Progression
After each battle victory:
1. **Card Reward:** Pick 1 of 3 random cards
2. **Recruitment (optional):** Chance to add a Pawn to your army
3. **Heal (if implemented):** Restore a captured piece? (TBD)

### Meta Progression (Between Runs)
**Currency:** Crowns (earned per battle won, bonus for full run clear)

**Unlocks:**
- New Loadouts
- Card pool expansions
- Starting bonuses (e.g., "Start with 4 cards instead of 3")

**Achievements:** Unlock specific rewards for challenges

---

## Run Structure

```
START
  │
  ├── Choose Loadout
  ├── Receive 3 random starter cards
  │
BATTLE 1 (Tutorial-ish)
  ├── Win → Pick 1 of 3 cards
  │
BATTLE 2
  ├── Win → Pick 1 of 3 cards + possible Pawn recruit
  │
BATTLE 3
  ├── Win → Pick 1 of 3 cards
  │
BATTLE 4 (Mini-boss: tougher formation)
  ├── Win → Pick 1 of 3 cards (guaranteed Rare+)
  │
BATTLE 5
  ├── Win → Pick 1 of 3 cards
  │
FINAL BOSS: The Ivory King
  ├── Win → Run Complete! Crowns + Unlock progress
  │
END
```

Total run time target: **20-30 minutes**

---

## Difficulty & Balance

### Balance Levers
- Number of cards allowed per battle
- Enemy army strength
- Card rarity distribution
- Starting loadout power

---

## Visual & Tone

### Art Style
TBD - Options:
- Clean minimalist (like chess.com)
- Pixel art (roguelike aesthetic)
- Stylized 3D (like Shotgun King)

### Tone
- Not too serious
- Meme-friendly card names allowed
- "Rebellion against the rules" theme
- Satisfying when you pull off a combo

### Audio
- Satisfying SFX for card plays
- Impact sounds for captures
- Escalating music per battle

---

## Open Questions

1. **Piece permadeath:** If a piece dies, is it gone for the whole run? 
   - Current answer: YES for major pieces, Pawns can be re-recruited

2. **Turn timer:** Should there be time pressure?
   - Current answer: No, it's a thinking game

3. **Multiple save slots / run saving:** Can you quit mid-run?
   - TBD

4. **Mobile support:** Touch controls?
   - TBD, design for desktop first

---

## MVP Scope (Prototype)

For the first playable build:
- 8x8 board
- 1 loadout (King + 4 Pawns)
- 1 battle only (vs King + Queen + 2 Rooks + 4 Pawns)
- 5 cards to test:
  - Stall (skip enemy turn)
  - Teleport (move piece anywhere)
  - Freeze (lock enemy piece 2 turns)
  - Swap (exchange two pieces)
  - Promote (pawn becomes queen)
- Basic enemy AI (aggressive, shows intent)
- No meta-progression yet
- Browser-based

**Goal:** Test if "small army + broken cards vs full army" feels fun and strategic.
