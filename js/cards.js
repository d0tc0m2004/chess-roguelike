// ============================================
// CARD SYSTEM - Chess Roguelike
// 45 Cards across 4 Rarities
// ============================================

// ============================================
// CARD RARITIES & XP COSTS
// ============================================
const CARD_RARITIES = {
    COMMON: { name: 'Common', xpCost: 25, color: '#888888' },
    UNCOMMON: { name: 'Uncommon', xpCost: 40, color: '#1eff00' },
    RARE: { name: 'Rare', xpCost: 60, color: '#0070dd' },
    LEGENDARY: { name: 'Legendary', xpCost: 100, color: '#ff8000' }
};

// ============================================
// TARGETING TYPES
// ============================================
const TARGETING = {
    NONE: 'none',                    // Instant effect, no target needed
    OWN_PIECE: 'own_piece',          // Select one of your pieces
    ENEMY_PIECE: 'enemy_piece',      // Select an enemy piece
    ANY_PIECE: 'any_piece',          // Select any piece on board
    EMPTY_SQUARE: 'empty_square',    // Select an empty square
    TWO_PIECES: 'two_pieces',        // Select two pieces
    ADJACENT_ENEMY: 'adjacent_enemy', // Select adjacent enemy
    RANGED_TARGET: 'ranged_target',  // Select target for ranged attack
    CUSTOM: 'custom'                 // Special targeting logic
};

// ============================================
// EFFECT TYPES (for AI awareness)
// ============================================
const EFFECT_TYPES = {
    MOVEMENT: 'movement',
    PROTECTION: 'protection',
    DEBUFF: 'debuff',
    BUFF: 'buff',
    CONTROL: 'control',
    SUMMON: 'summon',
    TRANSFORMATION: 'transformation',
    TIME_MANIPULATION: 'time_manipulation',
    DAMAGE: 'damage',
    VISION: 'vision'
};

// ============================================
// CARD DEFINITIONS - ALL 45 CARDS
// ============================================
const CARD_DEFINITIONS = {
    // ============================================
    // COMMON CARDS (11 cards - 25 XP each)
    // ============================================

    nudge: {
        id: 'nudge',
        name: 'Nudge',
        description: 'Move any piece 1 square in any direction.',
        rarity: 'COMMON',
        targeting: TARGETING.ANY_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            game.cardState = {
                type: 'selectDirection',
                card: 'nudge',
                piece: target,
                directions: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
            };
            game.showCardInstructions('Select a direction to nudge the piece.');
        }
    },

    stall: {
        id: 'stall',
        name: 'Stall',
        description: 'Freeze an enemy piece for 1 turn.',
        rarity: 'COMMON',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DEBUFF,
        execute: function(game, target) {
            game.frozenPieces.set(target.id, 2);
            game.showCardInstructions(`${target.type} frozen for 1 turn!`);
            game.finishCardPlay();
        }
    },

    scout: {
        id: 'scout',
        name: 'Scout',
        description: 'Reveal enemy intent for next 2 moves.',
        rarity: 'COMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.VISION,
        execute: function(game) {
            game.extendedIntentTurns = 2;
            game.showCardInstructions('Enemy intent revealed for 2 turns!');
            game.calculateEnemyIntent();
            game.finishCardPlay();
        }
    },

    shield: {
        id: 'shield',
        name: 'Shield',
        description: 'Target piece cannot be captured this turn.',
        rarity: 'COMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.PROTECTION,
        execute: function(game, target) {
            game.shieldedPieces.set(target.id, 1);
            game.showCardInstructions(`${target.type} shielded for this turn!`);
            game.finishCardPlay();
        }
    },

    dash: {
        id: 'dash',
        name: 'Dash',
        description: 'Your piece moves 2 extra squares in its direction.',
        rarity: 'COMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            game.dashPiece = target;
            game.showCardInstructions(`${target.type} can dash! Make a move with extended range.`);
            // Don't finish - let player make the enhanced move
        }
    },

    backstep: {
        id: 'backstep',
        name: 'Backstep',
        description: 'Move one of your pieces 1 square backward.',
        rarity: 'COMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            const direction = 1; // Backward for player
            const newRow = target.row + direction;
            if (newRow >= 0 && newRow < game.board.length && !game.board[newRow][target.col]) {
                game.board[target.row][target.col] = null;
                target.row = newRow;
                game.board[newRow][target.col] = target;
                game.showCardInstructions(`${target.type} stepped back!`);
            } else {
                game.showCardInstructions('Cannot move there!');
            }
            game.finishCardPlay();
        }
    },

    stumble: {
        id: 'stumble',
        name: 'Stumble',
        description: 'Enemy piece moves 1 random square.',
        rarity: 'COMMON',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.CONTROL,
        execute: function(game, target) {
            const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
            const validDirs = directions.filter(([dr, dc]) => {
                const r = target.row + dr;
                const c = target.col + dc;
                return r >= 0 && r < game.board.length && c >= 0 && c < 8 && !game.board[r][c];
            });
            if (validDirs.length > 0) {
                const [dr, dc] = validDirs[Math.floor(Math.random() * validDirs.length)];
                game.board[target.row][target.col] = null;
                target.row += dr;
                target.col += dc;
                game.board[target.row][target.col] = target;
                game.showCardInstructions(`${target.type} stumbled!`);
            } else {
                game.showCardInstructions('Enemy cannot stumble anywhere!');
            }
            game.finishCardPlay();
        }
    },

    feint: {
        id: 'feint',
        name: 'Feint',
        description: 'Swap positions of two adjacent friendly pieces.',
        rarity: 'COMMON',
        targeting: TARGETING.TWO_PIECES,
        effectType: EFFECT_TYPES.MOVEMENT,
        requiresAdjacent: true,
        requiresFriendly: true,
        execute: function(game, piece1, piece2) {
            const tempRow = piece1.row;
            const tempCol = piece1.col;
            game.board[piece1.row][piece1.col] = piece2;
            game.board[piece2.row][piece2.col] = piece1;
            piece1.row = piece2.row;
            piece1.col = piece2.col;
            piece2.row = tempRow;
            piece2.col = tempCol;
            game.showCardInstructions('Pieces swapped positions!');
            game.finishCardPlay();
        }
    },

    brace: {
        id: 'brace',
        name: 'Brace',
        description: 'Your King cannot move but gains +1 defense (harder to check).',
        rarity: 'COMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.PROTECTION,
        execute: function(game) {
            const king = game.playerPieces.find(p => p.type === 'king');
            if (king) {
                game.bracedPieces.set(king.id, 2);
                game.frozenPieces.set(king.id, 2);
                game.showCardInstructions('King is braced and cannot be easily attacked!');
            }
            game.finishCardPlay();
        }
    },

    sidestep: {
        id: 'sidestep',
        name: 'Sidestep',
        description: 'Move your piece 1 square left or right.',
        rarity: 'COMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            game.cardState = {
                type: 'selectDirection',
                card: 'sidestep',
                piece: target,
                directions: [[0,-1],[0,1]]
            };
            game.showCardInstructions('Select left or right to sidestep.');
        }
    },

    iDidntSeeThat: {
        id: 'iDidntSeeThat',
        name: "I Didn't See That",
        description: 'Undo your last move (cannot undo captures).',
        rarity: 'COMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.TIME_MANIPULATION,
        execute: function(game) {
            if (game.lastPlayerMove && !game.lastPlayerMove.wasCapture) {
                const move = game.lastPlayerMove;
                game.board[move.to.row][move.to.col] = null;
                move.piece.row = move.from.row;
                move.piece.col = move.from.col;
                game.board[move.from.row][move.from.col] = move.piece;
                game.lastPlayerMove = null;
                game.showCardInstructions('Move undone!');
            } else {
                game.showCardInstructions('Cannot undo this move!');
            }
            game.finishCardPlay();
        }
    },

    // ============================================
    // UNCOMMON CARDS (12 cards - 40 XP each)
    // ============================================

    freeze: {
        id: 'freeze',
        name: 'Freeze',
        description: 'Freeze an enemy piece for 2 turns.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DEBUFF,
        execute: function(game, target) {
            game.frozenPieces.set(target.id, 3);
            game.showCardInstructions(`${target.type} frozen for 2 turns!`);
            game.finishCardPlay();
        }
    },

    teleport: {
        id: 'teleport',
        name: 'Teleport',
        description: 'Move your piece to any empty square.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            game.cardState = {
                type: 'selectEmpty',
                card: 'teleport',
                piece: target
            };
            game.showCardInstructions('Select an empty square to teleport to.');
        }
    },

    swap: {
        id: 'swap',
        name: 'Swap',
        description: 'Swap positions of any two pieces on the board.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.TWO_PIECES,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, piece1, piece2) {
            const tempRow = piece1.row;
            const tempCol = piece1.col;
            game.board[piece1.row][piece1.col] = piece2;
            game.board[piece2.row][piece2.col] = piece1;
            piece1.row = piece2.row;
            piece1.col = piece2.col;
            piece2.row = tempRow;
            piece2.col = tempCol;
            game.showCardInstructions('Pieces swapped!');
            game.finishCardPlay();
        }
    },

    promote: {
        id: 'promote',
        name: 'Promote',
        description: 'Upgrade a Pawn to a Knight or Bishop.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.TRANSFORMATION,
        pieceFilter: (piece) => piece.type === 'pawn',
        execute: function(game, target) {
            game.cardState = {
                type: 'selectPromotion',
                card: 'promote',
                piece: target,
                options: ['knight', 'bishop']
            };
            game.showCardInstructions('Choose: Knight or Bishop?');
        }
    },

    rally: {
        id: 'rally',
        name: 'Rally',
        description: 'All your pieces gain +1 movement range this turn.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.rallyActive = true;
            game.showCardInstructions('All pieces have extended movement this turn!');
            game.finishCardPlay();
        }
    },

    illegalCastle: {
        id: 'illegalCastle',
        name: 'Illegal Castle',
        description: 'Swap King with any friendly piece regardless of position.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        pieceFilter: (piece) => piece.type !== 'king',
        execute: function(game, target) {
            const king = game.playerPieces.find(p => p.type === 'king');
            if (king) {
                const tempRow = king.row;
                const tempCol = king.col;
                game.board[king.row][king.col] = target;
                game.board[target.row][target.col] = king;
                king.row = target.row;
                king.col = target.col;
                target.row = tempRow;
                target.col = tempCol;
                game.showCardInstructions('Illegal castle performed!');
            }
            game.finishCardPlay();
        }
    },

    ghostWalk: {
        id: 'ghostWalk',
        name: 'Ghost Walk',
        description: 'Your piece can move through enemies this turn.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        execute: function(game, target) {
            game.ghostWalkPiece = target.id;
            game.showCardInstructions(`${target.type} can pass through enemies! Make a move.`);
            // Don't finish - let player make the enhanced move
        }
    },

    knightsTour: {
        id: 'knightsTour',
        name: "Knight's Tour",
        description: 'All pieces can move like Knights this turn.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.knightJumpActive = true;
            game.showCardInstructions("Knight's Tour active! All pieces can move like Knights.");
            game.finishCardPlay(false); // Count card but don't end turn
        }
    },

    decoy: {
        id: 'decoy',
        name: 'Decoy',
        description: 'Place a fake piece that enemies will target.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.EMPTY_SQUARE,
        effectType: EFFECT_TYPES.SUMMON,
        execute: function(game, row, col) {
            const decoy = {
                type: 'pawn',
                owner: 'player',
                row, col,
                id: `decoy-${Date.now()}`,
                isDecoy: true
            };
            game.board[row][col] = decoy;
            game.playerPieces.push(decoy);
            game.decoys.add(decoy.id);
            game.showCardInstructions('Decoy placed! Enemies will be drawn to it.');
            game.finishCardPlay();
        }
    },

    ricochet: {
        id: 'ricochet',
        name: 'Ricochet',
        description: 'Ranged piece captures, then can capture again if in range.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.BUFF,
        pieceFilter: (piece) => ['queen', 'rook', 'bishop'].includes(piece.type),
        execute: function(game, target) {
            game.ricochetPiece = target.id;
            game.showCardInstructions(`${target.type} can ricochet! Capture to trigger second attack.`);
            game.finishCardPlay(false); // Count card but don't end turn
        }
    },

    loadedDice: {
        id: 'loadedDice',
        name: 'Loaded Dice',
        description: 'Next enemy move has 50% chance to fail.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.DEBUFF,
        execute: function(game) {
            game.loadedDiceActive = true;
            game.showCardInstructions('Loaded Dice active! Next enemy move may fail.');
            game.finishCardPlay();
        }
    },

    paparazzi: {
        id: 'paparazzi',
        name: 'Paparazzi',
        description: 'Reveal all enemy piece move ranges for 1 turn.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.VISION,
        execute: function(game) {
            game.showAllEnemyMoves = true;
            game.showCardInstructions('All enemy moves revealed!');
            game.finishCardPlay();
        }
    },

    // ============================================
    // RARE CARDS (11 cards - 60 XP each)
    // ============================================

    clone: {
        id: 'clone',
        name: 'Clone',
        description: 'Create a copy of one of your pieces (not King).',
        rarity: 'RARE',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.SUMMON,
        pieceFilter: (piece) => piece.type !== 'king',
        execute: function(game, target) {
            game.cardState = {
                type: 'selectEmpty',
                card: 'clone',
                piece: target
            };
            game.showCardInstructions('Select an empty square adjacent to the piece to place the clone.');
        }
    },

    kidnap: {
        id: 'kidnap',
        name: 'Kidnap',
        description: 'Move an enemy piece to any empty square.',
        rarity: 'RARE',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.CONTROL,
        pieceFilter: (piece) => piece.type !== 'king',
        execute: function(game, target) {
            game.cardState = {
                type: 'selectEmpty',
                card: 'kidnap',
                piece: target
            };
            game.showCardInstructions('Select where to move the enemy piece.');
        }
    },

    resurrect: {
        id: 'resurrect',
        name: 'Resurrect',
        description: 'Bring back a captured piece to an empty square.',
        rarity: 'RARE',
        targeting: TARGETING.CUSTOM,
        effectType: EFFECT_TYPES.SUMMON,
        execute: function(game) {
            if (game.capturedPlayerPieces.length === 0) {
                game.showCardInstructions('No pieces to resurrect!');
                game.finishCardPlay();
                return;
            }
            game.cardState = {
                type: 'selectCaptured',
                card: 'resurrect'
            };
            game.showCardInstructions('Select a captured piece to resurrect.');
        }
    },

    queensGambit: {
        id: 'queensGambit',
        name: "Queen's Gambit",
        description: 'Sacrifice a piece to give another piece 2 extra moves.',
        rarity: 'RARE',
        targeting: TARGETING.TWO_PIECES,
        effectType: EFFECT_TYPES.BUFF,
        requiresFriendly: true,
        execute: function(game, sacrifice, recipient) {
            if (sacrifice.type === 'king') {
                game.showCardInstructions("Cannot sacrifice the King!");
                return;
            }
            game.board[sacrifice.row][sacrifice.col] = null;
            game.playerPieces = game.playerPieces.filter(p => p !== sacrifice);
            game.extraMoves = { piece: recipient.id, count: 2 };
            game.showCardInstructions(`${sacrifice.type} sacrificed! ${recipient.type} has 2 extra moves!`);
            game.finishCardPlay();
        }
    },

    sabotage: {
        id: 'sabotage',
        name: 'Sabotage',
        description: 'Disable an enemy piece type for 1 turn (all pieces of that type freeze).',
        rarity: 'RARE',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DEBUFF,
        execute: function(game, target) {
            const pieceType = target.type;
            for (const enemy of game.enemyPieces) {
                if (enemy.type === pieceType) {
                    game.frozenPieces.set(enemy.id, 2);
                }
            }
            game.showCardInstructions(`All enemy ${pieceType}s frozen!`);
            game.finishCardPlay();
        }
    },

    zugzwang: {
        id: 'zugzwang',
        name: 'Zugzwang',
        description: 'Enemy must move their King next turn.',
        rarity: 'RARE',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.CONTROL,
        execute: function(game) {
            game.zugzwangActive = true;
            game.showCardInstructions('Zugzwang! Enemy King must move next turn.');
            game.finishCardPlay();
        }
    },

    phantomQueen: {
        id: 'phantomQueen',
        name: 'Phantom Queen',
        description: 'Summon a Queen that lasts 3 turns then vanishes.',
        rarity: 'RARE',
        targeting: TARGETING.EMPTY_SQUARE,
        effectType: EFFECT_TYPES.SUMMON,
        execute: function(game, row, col) {
            const phantom = {
                type: 'queen',
                owner: 'player',
                row, col,
                id: `phantom-queen-${Date.now()}`,
                isPhantom: true,
                turnsRemaining: 3
            };
            game.board[row][col] = phantom;
            game.playerPieces.push(phantom);
            game.phantomPieces.set(phantom.id, 3);
            game.showCardInstructions('Phantom Queen summoned! She vanishes in 3 turns.');
            game.finishCardPlay();
        }
    },

    doubleAgent: {
        id: 'doubleAgent',
        name: 'Double Agent',
        description: 'Convert an enemy Pawn to your side.',
        rarity: 'RARE',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.CONTROL,
        pieceFilter: (piece) => piece.type === 'pawn',
        execute: function(game, target) {
            // Remove from enemy
            game.enemyPieces = game.enemyPieces.filter(p => p !== target);
            // Add to player
            target.owner = 'player';
            target.id = `converted-${Date.now()}`;
            game.playerPieces.push(target);
            game.showCardInstructions('Enemy pawn converted to your side!');
            game.finishCardPlay();
        }
    },

    chainReaction: {
        id: 'chainReaction',
        name: 'Chain Reaction',
        description: 'Capture triggers explosion - adjacent enemies take damage.',
        rarity: 'RARE',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.chainReactionActive = true;
            game.showCardInstructions('Chain Reaction active! Your next capture explodes!');
            game.finishCardPlay(false); // Count card but don't end turn
        }
    },

    traitorsMark: {
        id: 'traitorsMark',
        name: "Traitor's Mark",
        description: 'Mark an enemy - if it captures, it joins your side.',
        rarity: 'RARE',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DEBUFF,
        execute: function(game, target) {
            game.traitorMarked.add(target.id);
            game.showCardInstructions(`${target.type} marked! If it captures, it betrays.`);
            game.finishCardPlay();
        }
    },

    unionStrike: {
        id: 'unionStrike',
        name: 'Union Strike',
        description: 'All your pieces attack the same square simultaneously.',
        rarity: 'RARE',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DAMAGE,
        execute: function(game, target) {
            // Check if multiple pieces can reach the target
            let attackers = 0;
            for (const piece of game.playerPieces) {
                const moves = game.getValidMoves(piece);
                if (moves.some(m => m.row === target.row && m.col === target.col)) {
                    attackers++;
                }
            }
            if (attackers >= 2) {
                game.board[target.row][target.col] = null;
                game.capturePiece(target);
                game.showCardInstructions(`Union Strike! ${target.type} captured by ${attackers} pieces!`);
            } else {
                game.showCardInstructions('Need 2+ pieces that can reach the target!');
            }
            game.finishCardPlay();
        }
    },

    // ============================================
    // LEGENDARY CARDS (11 cards - 100 XP each)
    // ============================================

    mindControl: {
        id: 'mindControl',
        name: 'Mind Control',
        description: 'Take control of an enemy piece for 1 turn.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.CONTROL,
        pieceFilter: (piece) => piece.type !== 'king',
        execute: function(game, target) {
            game.controlledEnemies.set(target.id, { originalOwner: 'enemy', turnsLeft: 1 });
            target.owner = 'player';
            game.enemyPieces = game.enemyPieces.filter(p => p !== target);
            game.playerPieces.push(target);
            game.showCardInstructions(`${target.type} is under your control!`);
            game.finishCardPlay();
        }
    },

    checkmateDenied: {
        id: 'checkmateDenied',
        name: 'Checkmate Denied',
        description: 'If your King would be captured this turn, survive with 1 HP.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.PROTECTION,
        isBurn: true, // Consumed after use
        execute: function(game) {
            game.checkmateDeniedActive = true;
            game.showCardInstructions('Checkmate Denied! Your King survives one lethal hit.');
            game.finishCardPlay();
        }
    },

    demotion: {
        id: 'demotion',
        name: 'Demotion',
        description: 'Demote an enemy Queen to a Pawn.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.TRANSFORMATION,
        pieceFilter: (piece) => piece.type === 'queen',
        execute: function(game, target) {
            target.type = 'pawn';
            game.showCardInstructions('Enemy Queen demoted to Pawn!');
            game.finishCardPlay();
        }
    },

    armyOfOne: {
        id: 'armyOfOne',
        name: 'Army of One',
        description: 'Your King moves like a Queen for 3 turns.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.kingQueenMoves = 3;
            game.showCardInstructions('Your King now moves like a Queen for 3 turns!');
            game.finishCardPlay();
        }
    },

    rewind: {
        id: 'rewind',
        name: 'Rewind',
        description: 'Undo the last 2 complete turns.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.TIME_MANIPULATION,
        isBurn: true,
        execute: function(game) {
            if (game.boardHistory.length >= 3) {
                // Pop current and 2 previous states
                game.boardHistory.pop();
                game.boardHistory.pop();
                game.restoreBoardState();
                game.showCardInstructions('Time rewound! 2 turns undone.');
            } else {
                game.showCardInstructions('Not enough history to rewind!');
            }
            game.finishCardPlay();
        }
    },

    parallelPlay: {
        id: 'parallelPlay',
        name: 'Parallel Play',
        description: 'Move two pieces this turn.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.parallelPlayActive = true;
            game.movesThisTurn = 0;
            game.showCardInstructions('Parallel Play! Move two pieces this turn.');
            game.finishCardPlay(false); // Don't end turn
        }
    },

    exile: {
        id: 'exile',
        name: 'Exile',
        description: 'Remove an enemy piece from the game permanently (not King).',
        rarity: 'LEGENDARY',
        targeting: TARGETING.ENEMY_PIECE,
        effectType: EFFECT_TYPES.DAMAGE,
        pieceFilter: (piece) => piece.type !== 'king',
        isBurn: true,
        execute: function(game, target) {
            game.board[target.row][target.col] = null;
            game.enemyPieces = game.enemyPieces.filter(p => p !== target);
            game.showCardInstructions(`${target.type} exiled from the game!`);
            game.finishCardPlay();
        }
    },

    usurper: {
        id: 'usurper',
        name: 'Usurper',
        description: 'Your strongest piece becomes a King. Original King demotes.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.TRANSFORMATION,
        execute: function(game) {
            const pieceValues = { queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1 };
            let strongest = null;
            let highestValue = 0;

            for (const piece of game.playerPieces) {
                if (piece.type !== 'king' && pieceValues[piece.type] > highestValue) {
                    highestValue = pieceValues[piece.type];
                    strongest = piece;
                }
            }

            if (strongest) {
                const king = game.playerPieces.find(p => p.type === 'king');
                if (king) {
                    king.type = 'pawn';
                }
                strongest.type = 'king';
                game.showCardInstructions(`${strongest.type} is now the King! Old King demoted.`);
            }
            game.finishCardPlay();
        }
    },

    pocketDimension: {
        id: 'pocketDimension',
        name: 'Pocket Dimension',
        description: 'Store a piece safely. Redeploy it anywhere next turn.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.MOVEMENT,
        pieceFilter: (piece) => piece.type !== 'king',
        execute: function(game, target) {
            game.board[target.row][target.col] = null;
            game.pocketedPiece = { ...target };
            game.playerPieces = game.playerPieces.filter(p => p !== target);
            game.showCardInstructions(`${target.type} stored in pocket dimension!`);
            game.finishCardPlay();
        }
    },

    theBluff: {
        id: 'theBluff',
        name: 'The Bluff',
        description: 'Enemy sees fake intent - real move is hidden.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.VISION,
        execute: function(game) {
            game.bluffActive = true;
            game.showCardInstructions('The Bluff active! Enemy sees false intent.');
            game.finishCardPlay();
        }
    },

    actuallyImTheKing: {
        id: 'actuallyImTheKing',
        name: "Actually I'm the King Now",
        description: 'Swap your King with enemy King positions.',
        rarity: 'LEGENDARY',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.MOVEMENT,
        isBurn: true,
        execute: function(game) {
            const playerKing = game.playerPieces.find(p => p.type === 'king');
            const enemyKing = game.enemyPieces.find(p => p.type === 'king');

            if (playerKing && enemyKing) {
                const tempRow = playerKing.row;
                const tempCol = playerKing.col;

                game.board[playerKing.row][playerKing.col] = enemyKing;
                game.board[enemyKing.row][enemyKing.col] = playerKing;

                playerKing.row = enemyKing.row;
                playerKing.col = enemyKing.col;
                enemyKing.row = tempRow;
                enemyKing.col = tempCol;

                game.showCardInstructions('Kings swapped positions!');
            }
            game.finishCardPlay();
        }
    },

    // ============================================
    // ADDITIONAL TACTICAL CARDS (from original)
    // ============================================

    divineShield: {
        id: 'divineShield',
        name: 'Diamond Form',
        description: 'Target piece becomes Invulnerable but Cannot Move for 1 round.',
        rarity: 'RARE',
        targeting: TARGETING.OWN_PIECE,
        effectType: EFFECT_TYPES.PROTECTION,
        execute: function(game, target) {
            game.invulnerablePieces.set(target.id, 2);
            game.showCardInstructions(`${target.type} enters Diamond Form!`);
            game.finishCardPlay();
        }
    },

    snipe: {
        id: 'snipe',
        name: 'Snipe',
        description: 'Ranged pieces can capture through one obstacle (not King).',
        rarity: 'RARE',
        targeting: TARGETING.NONE,
        effectType: EFFECT_TYPES.BUFF,
        execute: function(game) {
            game.snipeActive = true;
            game.showCardInstructions('Snipe active! Ranged pieces can shoot through obstacles.');
            game.finishCardPlay(false); // Count card but don't end turn
        }
    },

    caltrops: {
        id: 'caltrops',
        name: 'Caltrops',
        description: 'Place a lethal trap on an empty square.',
        rarity: 'UNCOMMON',
        targeting: TARGETING.EMPTY_SQUARE,
        effectType: EFFECT_TYPES.DAMAGE,
        execute: function(game, row, col) {
            game.traps.set(`${row},${col}`, true);
            game.showCardInstructions(`Caltrops placed at ${game.toChessNotation(row, col)}!`);
            game.calculateEnemyIntent();
            game.finishCardPlay();
        }
    },

    shieldBash: {
        id: 'shieldBash',
        name: 'Shield Bash',
        description: 'Push an adjacent enemy 1 tile back. Kills if they hit a wall.',
        rarity: 'RARE',
        targeting: TARGETING.ADJACENT_ENEMY,
        effectType: EFFECT_TYPES.DAMAGE,
        execute: function(game, target) {
            // Find pusher piece
            let pusher = null;
            for (const piece of game.playerPieces) {
                const dist = Math.max(Math.abs(piece.row - target.row), Math.abs(piece.col - target.col));
                if (dist === 1) {
                    pusher = piece;
                    break;
                }
            }

            if (!pusher) {
                game.showCardInstructions('No adjacent piece to push from!');
                return;
            }

            const pushDir = {
                row: Math.sign(target.row - pusher.row),
                col: Math.sign(target.col - pusher.col)
            };

            const newRow = target.row + pushDir.row;
            const newCol = target.col + pushDir.col;

            const isWall = newRow < 0 || newRow >= game.board.length || newCol < 0 || newCol >= 8;
            const isBlocked = !isWall && game.board[newRow][newCol] !== null;

            game.board[target.row][target.col] = null;

            if (isWall || isBlocked) {
                game.capturePiece(target);
                game.showCardInstructions(`${target.type} crushed!`);
            } else {
                target.row = newRow;
                target.col = newCol;
                game.board[newRow][newCol] = target;

                // Check for trap
                const trapKey = `${newRow},${newCol}`;
                if (game.traps.has(trapKey)) {
                    game.traps.delete(trapKey);
                    game.board[newRow][newCol] = null;
                    game.capturePiece(target);
                    game.showCardInstructions(`${target.type} pushed into trap!`);
                } else {
                    game.showCardInstructions(`${target.type} pushed back!`);
                }
            }

            game.finishCardPlay();
        }
    }
};

// ============================================
// CARD POOLS BY RARITY
// ============================================
const CARD_POOLS = {
    COMMON: Object.values(CARD_DEFINITIONS).filter(c => c.rarity === 'COMMON').map(c => c.id),
    UNCOMMON: Object.values(CARD_DEFINITIONS).filter(c => c.rarity === 'UNCOMMON').map(c => c.id),
    RARE: Object.values(CARD_DEFINITIONS).filter(c => c.rarity === 'RARE').map(c => c.id),
    LEGENDARY: Object.values(CARD_DEFINITIONS).filter(c => c.rarity === 'LEGENDARY').map(c => c.id)
};

// ============================================
// STARTER DECK
// ============================================
const STARTER_DECK = ['shield', 'nudge', 'stall', 'sidestep', 'backstep'];

// ============================================
// CARD SYSTEM HELPER FUNCTIONS
// ============================================

function getCardById(cardId) {
    return CARD_DEFINITIONS[cardId] || null;
}

function getRandomCards(count, rarity = null) {
    let pool;
    if (rarity) {
        pool = CARD_POOLS[rarity] || [];
    } else {
        // Weighted random from all pools
        pool = [];
        pool.push(...CARD_POOLS.COMMON);
        pool.push(...CARD_POOLS.COMMON); // Double common
        pool.push(...CARD_POOLS.UNCOMMON);
        pool.push(...CARD_POOLS.RARE);
    }

    const result = [];
    const available = [...pool];

    for (let i = 0; i < count && available.length > 0; i++) {
        const index = Math.floor(Math.random() * available.length);
        result.push(available.splice(index, 1)[0]);
    }

    return result;
}

function getCardRewards(battleDifficulty) {
    // Higher difficulty = better card pool
    if (battleDifficulty >= 8) {
        return getRandomCards(3, 'LEGENDARY');
    } else if (battleDifficulty >= 6) {
        return getRandomCards(3, 'RARE');
    } else if (battleDifficulty >= 4) {
        return getRandomCards(3, 'UNCOMMON');
    } else {
        return getRandomCards(3, 'COMMON');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CARD_DEFINITIONS,
        CARD_POOLS,
        CARD_RARITIES,
        TARGETING,
        EFFECT_TYPES,
        STARTER_DECK,
        getCardById,
        getRandomCards,
        getCardRewards
    };
}
