// ============================================
// HYBRID AI SYSTEM - Stockfish + Card Awareness
// Chess Roguelike
// ============================================

// ============================================
// STOCKFISH INTEGRATION
// ============================================

class StockfishEngine {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.pendingResolve = null;
        this.analysisResults = [];
        this.useStockfish = true;
        this.initAttempted = false;
    }

    async init() {
        if (this.initAttempted) return this.isReady;
        this.initAttempted = true;

        return new Promise((resolve) => {
            try {
                this.worker = new Worker('js/stockfish-worker.js');

                const timeout = setTimeout(() => {
                    console.warn('Stockfish init timeout, using fallback AI');
                    this.useStockfish = false;
                    resolve(false);
                }, 5000);

                this.worker.onmessage = (e) => {
                    const { type, move, scoreType, scoreValue, pv, depth, bestMove, message } = e.data;

                    if (type === 'ready') {
                        clearTimeout(timeout);
                        this.isReady = true;
                        console.log('Stockfish ready');
                        resolve(true);
                    }

                    if (type === 'error') {
                        clearTimeout(timeout);
                        console.warn('Stockfish error:', message);
                        this.useStockfish = false;
                        resolve(false);
                    }

                    if (type === 'analysis') {
                        this.analysisResults.push({
                            move: bestMove,
                            scoreType,
                            scoreValue,
                            pv,
                            depth
                        });
                    }

                    if (type === 'bestmove') {
                        if (this.pendingResolve) {
                            this.pendingResolve({
                                bestMove: move,
                                analysis: [...this.analysisResults]
                            });
                            this.pendingResolve = null;
                            this.analysisResults = [];
                        }
                    }
                };

                this.worker.onerror = (err) => {
                    clearTimeout(timeout);
                    console.warn('Stockfish worker error:', err);
                    this.useStockfish = false;
                    resolve(false);
                };
            } catch (err) {
                console.warn('Failed to create Stockfish worker:', err);
                this.useStockfish = false;
                resolve(false);
            }
        });
    }

    async analyze(fen, depth = 12) {
        if (!this.isReady || !this.useStockfish) return null;

        this.analysisResults = [];

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.worker.postMessage({ type: 'stop' });
                resolve({
                    bestMove: null,
                    analysis: [...this.analysisResults]
                });
            }, 3000);

            this.pendingResolve = (result) => {
                clearTimeout(timeout);
                resolve(result);
            };

            this.worker.postMessage({ type: 'analyze', fen, depth });
        });
    }

    stop() {
        if (this.worker && this.isReady) {
            this.worker.postMessage({ type: 'stop' });
        }
    }
}

// Global Stockfish instance
const stockfishEngine = new StockfishEngine();

// Initialize Stockfish on load
stockfishEngine.init();

// ============================================
// AI ARCHETYPES
// ============================================
const AI_ARCHETYPES = {
    PASSIVE: {
        name: "Passive",
        modifiers: {
            captureBonus: -30,          // Rarely initiates captures
            defendKingBonus: +50,       // Prioritizes King safety
            advanceBonus: -40           // Stays back
        }
    },
    SWARM: {
        name: "The Swarm",
        modifiers: {
            pawnAdvanceBonus: +50,      // Prioritize pushing pawns
            kingAggressionPenalty: -60, // Keep King back
            queenAggressionPenalty: -30 // Queen plays safer
        }
    },
    HUNTER: {
        name: "The Hunter",
        modifiers: {
            queenAggressionBonus: +50,  // Queen actively chases
            captureBonus: +40,          // Extra reward for captures
            defensePenalty: -25         // Less interested in defense
        }
    },
    WALL: {
        name: "The Wall",
        modifiers: {
            advanceBonus: -50,          // Doesn't want to advance
            defendKingBonus: +70,       // Prioritizes King safety
            captureBonus: -30           // Only captures if safe
        }
    },
    TACTICIAN: {
        name: "The Tactician",
        modifiers: {
            forkBonus: +80,             // Loves forks
            pinBonus: +70,              // Loves pins
            knightBishopBonus: +30,     // Prefers using Knights/Bishops
            positionBonus: +40          // Positional play
        }
    },
    AGGRESSOR: {
        name: "The Aggressor",
        modifiers: {
            advanceBonus: +60,          // All pieces push forward
            captureBonus: +60,          // Very capture-happy
            safetyPenaltyReduction: 0.4 // Ignores 60% of safety concerns
        }
    }
};

// ============================================
// DIFFICULTY SETTINGS
// ============================================
const DIFFICULTY_SETTINGS = {
    EASY: {
        topMoves: 5,           // Pick from top 5 moves
        cardPenaltyMultiplier: 0.5,  // Apply 50% of card penalties
        ignoreSafetyChance: 0.2,     // 20% chance to ignore safety
        forkPinBonus: 0
    },
    MEDIUM: {
        topMoves: 3,           // Pick from top 3 moves
        cardPenaltyMultiplier: 0.75, // Apply 75% of card penalties
        ignoreSafetyChance: 0.1,     // 10% chance to ignore safety
        forkPinBonus: 0
    },
    HARD: {
        topMoves: 1,           // Pick top 1 move
        cardPenaltyMultiplier: 1.0,  // Apply 100% of card penalties
        ignoreSafetyChance: 0.0,     // Never ignore safety
        forkPinBonus: 30             // Bonus for forks/pins
    }
};

// ============================================
// BASE PRIORITY SCORES
// ============================================
const BASE_SCORES = {
    CAPTURE_KING: 1000,
    CAPTURE_BASE: 100,
    CAPTURE_QUEEN_VALUE: 90,
    CAPTURE_ROOK_VALUE: 50,
    CAPTURE_KNIGHT_VALUE: 30,
    CAPTURE_BISHOP_VALUE: 30,
    CAPTURE_PAWN_VALUE: 10,
    CHECK_PLAYER_KING: 80,
    THREATEN_PIECE: 50,
    ADVANCE_PIECE: 20,
    DEVELOP_PIECE: 10,
    ANY_LEGAL_MOVE: 5
};

// ============================================
// SAFETY PENALTIES
// ============================================
const SAFETY_PENALTIES = {
    MOVE_TO_ATTACKED_SQUARE: -60,
    MOVE_TO_UNDEFENDED_ATTACKED: -100,
    EXPOSE_KING_TO_CHECK: -500,
    REMOVE_KING_DEFENDER: -80
};

// ============================================
// CARD DANGER PENALTIES - All 45 Cards
// ============================================
const CARD_DANGERS = {
    // ============================================
    // COMMON CARDS
    // ============================================
    nudge: {
        condition: 'anyPosition',
        penalty: -10,
        description: 'Piece can be nudged 1 square'
    },
    stall: {
        condition: 'anyPiece',
        penalty: -15,
        description: 'Can be frozen for 1 turn'
    },
    scout: {
        condition: 'none',
        penalty: 0,
        description: 'No direct danger'
    },
    shield: {
        condition: 'nearHighValueTarget',
        penalty: -20,
        description: 'Target may become shielded'
    },
    dash: {
        condition: 'inExtendedRange',
        penalty: -15,
        description: 'Player pieces have extended range'
    },
    backstep: {
        condition: 'none',
        penalty: -5,
        description: 'Player can retreat'
    },
    stumble: {
        condition: 'nearEdge',
        penalty: -20,
        description: 'Can be randomly moved'
    },
    feint: {
        condition: 'none',
        penalty: -5,
        description: 'Friendly pieces can swap'
    },
    brace: {
        condition: 'nearKing',
        penalty: -25,
        description: 'King gets defensive bonus'
    },
    sidestep: {
        condition: 'none',
        penalty: -5,
        description: 'Can dodge sideways'
    },
    iDidntSeeThat: {
        condition: 'none',
        penalty: -10,
        description: 'Move can be undone'
    },

    // ============================================
    // UNCOMMON CARDS
    // ============================================
    freeze: {
        condition: 'anyPiece',
        penalty: -30,
        description: 'Can be frozen for 2 turns'
    },
    teleport: {
        condition: 'anyPosition',
        penalty: -25,
        description: 'Player can teleport anywhere'
    },
    swap: {
        condition: 'anyPosition',
        penalty: -20,
        description: 'Positions can be swapped'
    },
    promote: {
        condition: 'none',
        penalty: -15,
        description: 'Pawns can promote early'
    },
    rally: {
        condition: 'inExtendedRange',
        penalty: -25,
        description: 'All pieces have extended range'
    },
    illegalCastle: {
        condition: 'nearKing',
        penalty: -30,
        description: 'King can castle anywhere'
    },
    ghostWalk: {
        condition: 'blocking',
        penalty: -35,
        description: 'Can pass through pieces'
    },
    knightsTour: {
        condition: 'inKnightRange',
        penalty: -40,
        description: 'All pieces move like knights'
    },
    decoy: {
        condition: 'nearEmptySquares',
        penalty: -15,
        description: 'Fake pieces can appear'
    },
    ricochet: {
        condition: 'inRangedLine',
        penalty: -30,
        description: 'Captures can chain'
    },
    loadedDice: {
        condition: 'anyMove',
        penalty: -20,
        description: 'Move may fail'
    },
    paparazzi: {
        condition: 'none',
        penalty: 0,
        description: 'Moves revealed (no danger)'
    },
    caltrops: {
        condition: 'nearEmptySquares',
        penalty: -25,
        description: 'Traps can be placed'
    },

    // ============================================
    // RARE CARDS
    // ============================================
    clone: {
        condition: 'nearHighValueTarget',
        penalty: -35,
        description: 'Pieces can be duplicated'
    },
    kidnap: {
        condition: 'anyPiece',
        penalty: -40,
        description: 'Can be teleported away'
    },
    resurrect: {
        condition: 'none',
        penalty: -30,
        description: 'Captured pieces return'
    },
    queensGambit: {
        condition: 'nearHighValueTarget',
        penalty: -35,
        description: 'Sacrifice enables multi-move'
    },
    sabotage: {
        condition: 'nearSamePiece',
        penalty: -45,
        description: 'All same-type pieces freeze'
    },
    zugzwang: {
        condition: 'kingExposed',
        penalty: -50,
        description: 'King must move'
    },
    phantomQueen: {
        condition: 'anyPosition',
        penalty: -40,
        description: 'Temporary queen appears'
    },
    doubleAgent: {
        condition: 'pawnNearby',
        penalty: -30,
        description: 'Pawns can be converted'
    },
    chainReaction: {
        condition: 'clustered',
        penalty: -45,
        description: 'Captures explode'
    },
    traitorsMark: {
        condition: 'anyPiece',
        penalty: -35,
        description: 'Capturing causes betrayal'
    },
    unionStrike: {
        condition: 'multipleThreats',
        penalty: -40,
        description: 'Multi-piece attack'
    },
    divineShield: {
        condition: 'nearHighValueTarget',
        penalty: -40,
        description: 'Target becomes invulnerable'
    },
    snipe: {
        condition: 'behindObstacle',
        penalty: -45,
        description: 'Can shoot through pieces'
    },
    shieldBash: {
        condition: 'adjacentToPlayer',
        penalty: -35,
        description: 'Can be pushed into walls'
    },

    // ============================================
    // LEGENDARY CARDS
    // ============================================
    mindControl: {
        condition: 'anyPiece',
        penalty: -60,
        description: 'Can be controlled by enemy'
    },
    checkmateDenied: {
        condition: 'nearKing',
        penalty: -30,
        description: 'King survives one hit'
    },
    demotion: {
        condition: 'isQueen',
        penalty: -70,
        description: 'Queen becomes pawn'
    },
    armyOfOne: {
        condition: 'nearKing',
        penalty: -50,
        description: 'King moves like queen'
    },
    rewind: {
        condition: 'none',
        penalty: -40,
        description: 'Turns can be undone'
    },
    parallelPlay: {
        condition: 'anyPosition',
        penalty: -55,
        description: 'Two moves in one turn'
    },
    exile: {
        condition: 'anyPiece',
        penalty: -70,
        description: 'Permanent removal'
    },
    usurper: {
        condition: 'none',
        penalty: -30,
        description: 'King role changes'
    },
    pocketDimension: {
        condition: 'none',
        penalty: -25,
        description: 'Pieces can be stored'
    },
    theBluff: {
        condition: 'none',
        penalty: -20,
        description: 'Intent is hidden'
    },
    actuallyImTheKing: {
        condition: 'kingExposed',
        penalty: -80,
        description: 'Kings can swap'
    }
};

// ============================================
// ENEMY AI CLASS
// ============================================
class EnemyAI {

    // ============================================
    // MAIN ENTRY POINT
    // ============================================

    /**
     * Calculate the best move for the AI using Stockfish + Card Awareness
     * @param {Object} gameState - The current game state
     * @param {Array} playerCards - Cards in player's hand
     * @param {string} difficulty - 'EASY', 'MEDIUM', or 'HARD'
     * @param {string} archetype - AI personality archetype
     * @returns {Object} { piece, from, to, score, reasoning }
     */
    static async calculateBestMoveAsync(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.MEDIUM;
        const archetypeData = AI_ARCHETYPES[archetype] || AI_ARCHETYPES.HUNTER;

        // Try Stockfish first
        if (stockfishEngine.isReady && stockfishEngine.useStockfish) {
            const stockfishMove = await this.getStockfishMoveWithCardPenalties(gameState, playerCards, diffSettings, archetypeData);
            if (stockfishMove) {
                return stockfishMove;
            }
        }

        // Fallback to priority-based system
        return this.calculateBestMoveFallback(gameState, playerCards, difficulty, archetype);
    }

    /**
     * Synchronous version - uses cached result or fallback
     */
    static calculateBestMove(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        // For synchronous calls, use the fallback system
        // The async version should be preferred when possible
        return this.calculateBestMoveFallback(gameState, playerCards, difficulty, archetype);
    }

    /**
     * Get Stockfish's best move and apply card penalties
     */
    static async getStockfishMoveWithCardPenalties(gameState, playerCards, diffSettings, archetypeData) {
        try {
            // Convert to FEN (from Black's perspective since enemy is black)
            const fen = this.gameStateToFEN(gameState);

            // Get Stockfish analysis
            const depthByDifficulty = { EASY: 8, MEDIUM: 12, HARD: 16 };
            const depth = depthByDifficulty[diffSettings] || 12;

            const result = await stockfishEngine.analyze(fen, depth);

            if (!result || !result.bestMove) {
                return null;
            }

            // Convert Stockfish move (e.g., "e2e4") to our format
            const stockfishMoveStr = result.bestMove;
            const from = this.algebraicToCoords(stockfishMoveStr.substring(0, 2));
            const to = this.algebraicToCoords(stockfishMoveStr.substring(2, 4));

            if (!from || !to) return null;

            // Find the piece at the from square
            const piece = gameState.board[from.row]?.[from.col];
            if (!piece || piece.owner !== 'enemy') {
                // Stockfish might return a move for the wrong side, recalculate
                return null;
            }

            // Create the move object
            const move = {
                piece,
                from: { row: from.row, col: from.col },
                to: { row: to.row, col: to.col }
            };

            // Calculate card danger for this move
            const cardDanger = this.calculateCardDanger(move, gameState, playerCards) * diffSettings.cardPenaltyMultiplier;

            // Get Stockfish's score (convert to our scale)
            let stockfishScore = 100; // Base score for Stockfish's best move
            if (result.analysis && result.analysis.length > 0) {
                const lastAnalysis = result.analysis[result.analysis.length - 1];
                if (lastAnalysis.scoreType === 'cp') {
                    stockfishScore = lastAnalysis.scoreValue / 10 + 100;
                } else if (lastAnalysis.scoreType === 'mate') {
                    stockfishScore = lastAnalysis.scoreValue > 0 ? 1000 : -1000;
                }
            }

            // If card danger is very high, consider alternatives
            if (cardDanger > 50) {
                // Get all legal moves and find one with better card safety
                const allMoves = this.getAllLegalMoves(gameState);
                const scoredMoves = allMoves.map(m => {
                    const danger = this.calculateCardDanger(m, gameState, playerCards);
                    const baseScore = this.calculateBaseScore(m, gameState);
                    return { ...m, score: baseScore - danger, cardDanger: danger };
                });

                // Find moves with low card danger
                const safeMoves = scoredMoves.filter(m => m.cardDanger < cardDanger * 0.5);

                if (safeMoves.length > 0) {
                    // Check if any safe move is still decent
                    safeMoves.sort((a, b) => b.score - a.score);
                    const safeBest = safeMoves[0];

                    // If the safe move is still reasonably good, prefer it
                    if (safeBest.score > stockfishScore - cardDanger - 30) {
                        safeBest.reasoning = `Avoiding card danger, playing safe: ${safeBest.piece.type}`;
                        return safeBest;
                    }
                }
            }

            // Apply final score
            move.score = stockfishScore - cardDanger;
            move.reasoning = `Stockfish: ${stockfishMoveStr} (eval: ${stockfishScore.toFixed(0)}, card risk: -${cardDanger.toFixed(0)})`;
            move.stockfishMove = stockfishMoveStr;

            return move;
        } catch (err) {
            console.warn('Stockfish error:', err);
            return null;
        }
    }

    /**
     * Convert game state to FEN notation
     */
    static gameStateToFEN(gameState) {
        const board = gameState.board;
        let fen = '';

        // Board position
        for (let row = 0; row < 8; row++) {
            let empty = 0;
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (!piece) {
                    empty++;
                } else {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    // Player pieces are white (uppercase), enemy pieces are black (lowercase)
                    const pieceChar = this.pieceToFENChar(piece.type);
                    fen += piece.owner === 'player' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
                }
            }
            if (empty > 0) fen += empty;
            if (row < 7) fen += '/';
        }

        // It's black's turn (enemy)
        fen += ' b';

        // No castling (simplified)
        fen += ' -';

        // No en passant
        fen += ' -';

        // Halfmove clock and fullmove number
        fen += ' 0 1';

        return fen;
    }

    static pieceToFENChar(type) {
        const map = {
            king: 'k',
            queen: 'q',
            rook: 'r',
            bishop: 'b',
            knight: 'n',
            pawn: 'p'
        };
        return map[type] || 'p';
    }

    static algebraicToCoords(algebraic) {
        if (!algebraic || algebraic.length < 2) return null;
        const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - parseInt(algebraic[1]);
        if (col < 0 || col > 7 || row < 0 || row > 7) return null;
        return { row, col };
    }

    static coordsToAlgebraic(row, col) {
        return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
    }

    /**
     * Enhanced fallback AI with minimax look-ahead
     */
    static calculateBestMoveFallback(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.MEDIUM;
        const archetypeData = AI_ARCHETYPES[archetype] || AI_ARCHETYPES.HUNTER;

        // Get all possible moves
        const allMoves = this.getAllLegalMoves(gameState);

        if (allMoves.length === 0) {
            return null;
        }

        // Depth based on difficulty
        const searchDepth = { EASY: 1, MEDIUM: 2, HARD: 3 }[difficulty] || 2;

        // Score each move with look-ahead
        const scoredMoves = allMoves.map(move => {
            // Immediate evaluation
            let score = this.scoreMove(move, gameState, playerCards, archetypeData, diffSettings);

            // Look-ahead evaluation (minimax)
            if (searchDepth > 1) {
                const lookAheadScore = this.minimax(
                    move,
                    gameState,
                    searchDepth - 1,
                    -Infinity,
                    Infinity,
                    false, // Next is player's turn (minimizing for us)
                    playerCards
                );
                // Blend immediate score with look-ahead
                score = score * 0.4 + lookAheadScore * 0.6;
            }

            // Apply difficulty-based safety penalty reduction
            if (diffSettings.ignoreSafetyChance > 0 && Math.random() < diffSettings.ignoreSafetyChance) {
                const baseScore = this.calculateBaseScore(move, gameState);
                const cardDanger = this.calculateCardDanger(move, gameState, playerCards) * diffSettings.cardPenaltyMultiplier;
                score = this.applyArchetypeModifiers(baseScore - cardDanger, move, gameState, archetypeData);
            }

            // Add fork/pin bonus
            if (diffSettings.forkPinBonus > 0) {
                if (this.detectFork(move, gameState)) score += diffSettings.forkPinBonus;
                if (this.detectPin(move, gameState)) score += diffSettings.forkPinBonus;
            }

            return { ...move, score };
        });

        // Sort by score descending
        scoredMoves.sort((a, b) => b.score - a.score);

        // Pick from top N moves based on difficulty
        const topN = Math.min(diffSettings.topMoves, scoredMoves.length);
        const candidates = scoredMoves.slice(0, topN);

        // Random selection from candidates
        const selected = this.weightedRandomSelect(candidates);
        selected.reasoning = this.generateReasoning(selected, gameState);

        return selected;
    }

    /**
     * Minimax with alpha-beta pruning for look-ahead
     */
    static minimax(move, gameState, depth, alpha, beta, isMaximizing, playerCards) {
        // Simulate the move
        const simState = this.simulateMove(move, gameState);

        // Base case: depth 0 or game over
        if (depth === 0) {
            return this.evaluatePosition(simState, playerCards);
        }

        // Check for game-ending conditions
        const enemyKing = simState.enemyPieces.find(p => p.type === 'king');
        const playerKing = simState.playerPieces.find(p => p.type === 'king');

        if (!enemyKing) return -10000; // We lost our king
        if (!playerKing) return 10000;  // We captured player king

        if (isMaximizing) {
            // AI's turn - maximize score
            let maxEval = -Infinity;
            const moves = this.getAllLegalMoves(simState);

            for (const nextMove of moves.slice(0, 10)) { // Limit for performance
                const evalScore = this.minimax(nextMove, simState, depth - 1, alpha, beta, false, playerCards);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return maxEval;
        } else {
            // Player's turn - minimize score (simulate player making best counter-move)
            let minEval = Infinity;
            const playerMoves = this.getPlayerLegalMoves(simState);

            for (const playerMove of playerMoves.slice(0, 10)) { // Limit for performance
                const simAfterPlayer = this.simulatePlayerMove(playerMove, simState);
                const evalScore = this.evaluatePosition(simAfterPlayer, playerCards);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break; // Prune
            }
            return minEval;
        }
    }

    /**
     * Simulate an enemy move and return new game state
     */
    static simulateMove(move, gameState) {
        const newBoard = gameState.board.map(row => row ? [...row] : null);
        const newEnemyPieces = gameState.enemyPieces.map(p => ({ ...p }));
        const newPlayerPieces = gameState.playerPieces.map(p => ({ ...p }));

        // Find the piece in new arrays
        const pieceIndex = newEnemyPieces.findIndex(p => p.id === move.piece.id);
        if (pieceIndex === -1) return gameState;

        const piece = newEnemyPieces[pieceIndex];

        // Check for capture
        const target = newBoard[move.to.row]?.[move.to.col];
        if (target && target.owner === 'player') {
            const targetIndex = newPlayerPieces.findIndex(p => p.id === target.id);
            if (targetIndex !== -1) {
                newPlayerPieces.splice(targetIndex, 1);
            }
        }

        // Move the piece
        newBoard[move.from.row][move.from.col] = null;
        piece.row = move.to.row;
        piece.col = move.to.col;
        newBoard[move.to.row][move.to.col] = piece;

        return {
            board: newBoard,
            enemyPieces: newEnemyPieces,
            playerPieces: newPlayerPieces,
            frozenPieces: gameState.frozenPieces,
            invulnerablePieces: gameState.invulnerablePieces,
            traps: gameState.traps
        };
    }

    /**
     * Get all legal moves for player pieces
     */
    static getPlayerLegalMoves(gameState) {
        const moves = [];
        for (const piece of gameState.playerPieces) {
            if (gameState.frozenPieces?.has(piece.id)) continue;
            if (gameState.invulnerablePieces?.has(piece.id)) continue;

            const validMoves = this.getPlayerValidMoves(piece, gameState);
            for (const to of validMoves) {
                moves.push({ piece, from: { row: piece.row, col: piece.col }, to });
            }
        }
        return moves;
    }

    /**
     * Get valid moves for a player piece
     */
    static getPlayerValidMoves(piece, gameState) {
        const moves = [];
        const board = gameState.board;

        switch (piece.type) {
            case 'king':
                for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
                    this.addPlayerMoveIfValid(piece, piece.row + dr, piece.col + dc, board, moves, gameState);
                }
                break;
            case 'queen':
                this.addPlayerSlidingMoves(piece, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], board, moves, gameState);
                break;
            case 'rook':
                this.addPlayerSlidingMoves(piece, [[-1,0],[1,0],[0,-1],[0,1]], board, moves, gameState);
                break;
            case 'bishop':
                this.addPlayerSlidingMoves(piece, [[-1,-1],[-1,1],[1,-1],[1,1]], board, moves, gameState);
                break;
            case 'knight':
                for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                    this.addPlayerMoveIfValid(piece, piece.row + dr, piece.col + dc, board, moves, gameState);
                }
                break;
            case 'pawn':
                // Player pawns move up (negative direction)
                const newRow = piece.row - 1;
                if (newRow >= 0 && !board[newRow][piece.col]) {
                    moves.push({ row: newRow, col: piece.col });
                    if (piece.row === 6 && !board[piece.row - 2]?.[piece.col]) {
                        moves.push({ row: piece.row - 2, col: piece.col });
                    }
                }
                for (const dc of [-1, 1]) {
                    const captureCol = piece.col + dc;
                    if (captureCol >= 0 && captureCol < 8 && newRow >= 0) {
                        const target = board[newRow]?.[captureCol];
                        if (target && target.owner === 'enemy') {
                            moves.push({ row: newRow, col: captureCol });
                        }
                    }
                }
                break;
        }
        return moves;
    }

    static addPlayerMoveIfValid(piece, row, col, board, moves, gameState) {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return;
        const target = board[row]?.[col];
        if (!target || target.owner === 'enemy') {
            if (!gameState.invulnerablePieces?.has(target?.id)) {
                moves.push({ row, col });
            }
        }
    }

    static addPlayerSlidingMoves(piece, directions, board, moves, gameState) {
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const row = piece.row + dr * i;
                const col = piece.col + dc * i;
                if (row < 0 || row >= 8 || col < 0 || col >= 8) break;
                const target = board[row]?.[col];
                if (!target) {
                    moves.push({ row, col });
                } else if (target.owner === 'enemy' && !gameState.invulnerablePieces?.has(target.id)) {
                    moves.push({ row, col });
                    break;
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Simulate a player move
     */
    static simulatePlayerMove(move, gameState) {
        const newBoard = gameState.board.map(row => row ? [...row] : null);
        const newEnemyPieces = gameState.enemyPieces.map(p => ({ ...p }));
        const newPlayerPieces = gameState.playerPieces.map(p => ({ ...p }));

        const pieceIndex = newPlayerPieces.findIndex(p => p.id === move.piece.id);
        if (pieceIndex === -1) return gameState;

        const piece = newPlayerPieces[pieceIndex];

        // Check for capture
        const target = newBoard[move.to.row]?.[move.to.col];
        if (target && target.owner === 'enemy') {
            const targetIndex = newEnemyPieces.findIndex(p => p.id === target.id);
            if (targetIndex !== -1) {
                newEnemyPieces.splice(targetIndex, 1);
            }
        }

        // Move the piece
        newBoard[move.from.row][move.from.col] = null;
        piece.row = move.to.row;
        piece.col = move.to.col;
        newBoard[move.to.row][move.to.col] = piece;

        return {
            board: newBoard,
            enemyPieces: newEnemyPieces,
            playerPieces: newPlayerPieces,
            frozenPieces: gameState.frozenPieces,
            invulnerablePieces: gameState.invulnerablePieces,
            traps: gameState.traps
        };
    }

    /**
     * Evaluate position from enemy's perspective
     */
    static evaluatePosition(gameState, playerCards) {
        let score = 0;

        // Material count
        const pieceValues = { king: 10000, queen: 900, rook: 500, bishop: 330, knight: 320, pawn: 100 };

        for (const piece of gameState.enemyPieces) {
            score += pieceValues[piece.type] || 100;
        }

        for (const piece of gameState.playerPieces) {
            score -= pieceValues[piece.type] || 100;
        }

        // King safety
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        const playerKing = gameState.playerPieces.find(p => p.type === 'king');

        if (enemyKing) {
            // Penalty if our king is exposed (attacked)
            if (this.isSquareAttackedByPlayer(enemyKing.row, enemyKing.col, gameState)) {
                score -= 200;
            }
            // Bonus for defenders around king
            let defenders = 0;
            for (const piece of gameState.enemyPieces) {
                if (piece !== enemyKing) {
                    const dist = Math.abs(enemyKing.row - piece.row) + Math.abs(enemyKing.col - piece.col);
                    if (dist <= 2) defenders++;
                }
            }
            score += defenders * 30;
        }

        if (playerKing) {
            // Bonus if player king is in check
            if (this.isSquareAttackedByEnemy(playerKing.row, playerKing.col, gameState)) {
                score += 150;
            }
        }

        // Piece activity (center control, advanced pieces)
        for (const piece of gameState.enemyPieces) {
            // Center control bonus
            const centerDist = Math.abs(piece.col - 3.5) + Math.abs(piece.row - 3.5);
            score += (7 - centerDist) * 5;

            // Advanced piece bonus (pawns especially)
            if (piece.type === 'pawn') {
                score += piece.row * 10; // Pawns are better when advanced
            }
        }

        // Hanging pieces penalty (our pieces under attack that aren't defended)
        for (const piece of gameState.enemyPieces) {
            if (piece.type === 'king') continue;
            if (this.isSquareAttackedByPlayer(piece.row, piece.col, gameState)) {
                if (!this.isSquareDefendedByEnemy(piece.row, piece.col, gameState, piece)) {
                    score -= (pieceValues[piece.type] || 100) * 0.8;
                }
            }
        }

        return score;
    }

    /**
     * Check if a square is attacked by enemy pieces
     */
    static isSquareAttackedByEnemy(row, col, gameState) {
        for (const piece of gameState.enemyPieces) {
            const attacks = this.getAttackSquares(piece, { row: piece.row, col: piece.col }, gameState.board);
            if (attacks.some(sq => sq.row === row && sq.col === col)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Preview enemy intent (called at start of player turn)
     */
    static async previewEnemyIntentAsync(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        return this.calculateBestMoveAsync(gameState, playerCards, difficulty, archetype);
    }

    /**
     * Synchronous preview (fallback)
     */
    static previewEnemyIntent(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        return this.calculateBestMoveFallback(gameState, playerCards, difficulty, archetype);
    }

    // ============================================
    // MOVE GENERATION
    // ============================================

    static getAllLegalMoves(gameState) {
        const moves = [];

        for (const piece of gameState.enemyPieces) {
            // Skip frozen or traitor pieces
            if (gameState.frozenPieces && gameState.frozenPieces.has(piece.id)) continue;
            if (gameState.traitorPieces && gameState.traitorPieces.has(piece.id)) continue;
            if (gameState.invulnerablePieces && gameState.invulnerablePieces.has(piece.id)) continue;

            const validMoves = this.getValidMovesForPiece(piece, gameState);

            for (const to of validMoves) {
                moves.push({
                    piece,
                    from: { row: piece.row, col: piece.col },
                    to: { row: to.row, col: to.col }
                });
            }
        }

        return moves;
    }

    static getValidMovesForPiece(piece, gameState) {
        const moves = [];
        const board = gameState.board;

        switch (piece.type) {
            case 'king':
                this.addKingMoves(piece, board, moves, gameState);
                break;
            case 'queen':
                this.addQueenMoves(piece, board, moves, gameState);
                break;
            case 'rook':
                this.addRookMoves(piece, board, moves, gameState);
                break;
            case 'bishop':
                this.addBishopMoves(piece, board, moves, gameState);
                break;
            case 'knight':
                this.addKnightMoves(piece, board, moves, gameState);
                break;
            case 'pawn':
                this.addPawnMoves(piece, board, moves, gameState);
                break;
        }

        return moves;
    }

    static addKingMoves(piece, board, moves, gameState) {
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dr, dc] of directions) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, board, moves, gameState);
        }
    }

    static addQueenMoves(piece, board, moves, gameState) {
        this.addRookMoves(piece, board, moves, gameState);
        this.addBishopMoves(piece, board, moves, gameState);
    }

    static addRookMoves(piece, board, moves, gameState) {
        const directions = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const row = piece.row + dr * i;
                const col = piece.col + dc * i;
                if (!this.addMoveIfValid(piece, row, col, board, moves, gameState)) break;
                if (board[row] && board[row][col]) break;
            }
        }
    }

    static addBishopMoves(piece, board, moves, gameState) {
        const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const row = piece.row + dr * i;
                const col = piece.col + dc * i;
                if (!this.addMoveIfValid(piece, row, col, board, moves, gameState)) break;
                if (board[row] && board[row][col]) break;
            }
        }
    }

    static addKnightMoves(piece, board, moves, gameState) {
        const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of jumps) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, board, moves, gameState);
        }
    }

    static addPawnMoves(piece, board, moves, gameState) {
        const direction = 1; // Enemy pawns move down (positive row direction)
        const startRow = 1;

        // Forward move
        const newRow = piece.row + direction;
        if (newRow >= 0 && newRow < 8 && !board[newRow][piece.col]) {
            // Check for traps
            const trapKey = `${newRow},${piece.col}`;
            if (!gameState.traps || !gameState.traps.has(trapKey)) {
                moves.push({ row: newRow, col: piece.col });
            }

            // Double move from start
            if (piece.row === startRow) {
                const doubleRow = piece.row + direction * 2;
                if (doubleRow < 8 && !board[doubleRow][piece.col]) {
                    const doubleTrapKey = `${doubleRow},${piece.col}`;
                    if (!gameState.traps || !gameState.traps.has(doubleTrapKey)) {
                        moves.push({ row: doubleRow, col: piece.col });
                    }
                }
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const captureCol = piece.col + dc;
            if (captureCol >= 0 && captureCol < 8 && newRow >= 0 && newRow < 8) {
                const target = board[newRow][captureCol];
                if (target && target.owner === 'player') {
                    // Check for invulnerable
                    if (!gameState.invulnerablePieces || !gameState.invulnerablePieces.has(target.id)) {
                        // Check for traps
                        const captureTrapKey = `${newRow},${captureCol}`;
                        if (!gameState.traps || !gameState.traps.has(captureTrapKey)) {
                            moves.push({ row: newRow, col: captureCol });
                        }
                    }
                }
            }
        }
    }

    static addMoveIfValid(piece, row, col, board, moves, gameState) {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;

        // Check for traps
        const trapKey = `${row},${col}`;
        if (gameState.traps && gameState.traps.has(trapKey)) {
            return false;
        }

        const target = board[row] ? board[row][col] : null;

        if (!target) {
            moves.push({ row, col });
            return true;
        }

        if (target.owner === 'player') {
            // Check for invulnerable
            if (gameState.invulnerablePieces && gameState.invulnerablePieces.has(target.id)) {
                return false;
            }
            moves.push({ row, col });
            return true;
        }

        return false; // Own piece blocking
    }

    // ============================================
    // SCORING HELPERS
    // ============================================

    static scoreMove(move, gameState, playerCards, archetype, diffSettings) {
        let score = 0;

        // Calculate components
        const baseScore = this.calculateBaseScore(move, gameState);
        const safetyPenalty = this.calculateSafetyPenalty(move, gameState);
        const cardDanger = this.calculateCardDanger(move, gameState, playerCards) * diffSettings.cardPenaltyMultiplier;

        // Combine: MOVE SCORE = Base Score + Threat Bonus - Safety Penalty - Card Danger
        score = baseScore - safetyPenalty - cardDanger;

        // Apply archetype modifiers
        score = this.applyArchetypeModifiers(score, move, gameState, archetype);

        return score;
    }

    static calculateBaseScore(move, gameState) {
        let score = BASE_SCORES.ANY_LEGAL_MOVE;

        const board = gameState.board;
        const target = board[move.to.row] ? board[move.to.row][move.to.col] : null;

        // Capture scoring
        if (target && target.owner === 'player') {
            score += BASE_SCORES.CAPTURE_BASE;

            switch (target.type) {
                case 'king':
                    score += BASE_SCORES.CAPTURE_KING;
                    break;
                case 'queen':
                    score += BASE_SCORES.CAPTURE_QUEEN_VALUE;
                    break;
                case 'rook':
                    score += BASE_SCORES.CAPTURE_ROOK_VALUE;
                    break;
                case 'knight':
                    score += BASE_SCORES.CAPTURE_KNIGHT_VALUE;
                    break;
                case 'bishop':
                    score += BASE_SCORES.CAPTURE_BISHOP_VALUE;
                    break;
                case 'pawn':
                    score += BASE_SCORES.CAPTURE_PAWN_VALUE;
                    break;
            }
        }

        // *** ESCAPE DANGER BONUS ***
        // If piece is currently under attack, bonus for escaping
        const currentlyInDanger = this.isSquareAttackedByPlayer(move.from.row, move.from.col, gameState);
        const destinationSafe = !this.isSquareAttackedByPlayer(move.to.row, move.to.col, gameState);

        if (currentlyInDanger && destinationSafe) {
            // Huge bonus for escaping danger
            const pieceValue = this.getPieceValue(move.piece.type);
            score += pieceValue + 80; // Escape bonus scales with piece value
        }

        // *** DEFEND ATTACKED PIECE ***
        // Check if this move defends a friendly piece that's under attack
        const defendedPiece = this.getDefendedPieceAfterMove(move, gameState);
        if (defendedPiece) {
            const defendedValue = this.getPieceValue(defendedPiece.type);
            score += defendedValue * 0.5 + 30;
        }

        // *** RECAPTURE BONUS ***
        // If a piece was just captured, bonus for recapturing
        if (gameState.lastCapture && target && target.owner === 'player') {
            if (move.to.row === gameState.lastCapture.row && move.to.col === gameState.lastCapture.col) {
                score += 40; // Recapture bonus
            }
        }

        // Check if move puts player king in check
        if (this.wouldPutPlayerKingInCheck(move, gameState)) {
            score += BASE_SCORES.CHECK_PLAYER_KING;
        }

        // Threaten player piece bonus
        const threatenedPieces = this.getThreatenedPiecesAfterMove(move, gameState);
        score += threatenedPieces.length * BASE_SCORES.THREATEN_PIECE;

        // Advance piece bonus (moving towards player side)
        if (move.to.row > move.from.row) {
            score += BASE_SCORES.ADVANCE_PIECE;
        }

        // Development bonus (first move of a piece from back rank)
        if (move.from.row <= 1 && move.to.row > 1) {
            score += BASE_SCORES.DEVELOP_PIECE;
        }

        return score;
    }

    static getPieceValue(type) {
        switch (type) {
            case 'king': return 1000;
            case 'queen': return 90;
            case 'rook': return 50;
            case 'knight': return 30;
            case 'bishop': return 30;
            case 'pawn': return 10;
            default: return 10;
        }
    }

    static getDefendedPieceAfterMove(move, gameState) {
        // Check if after this move, we defend a friendly piece that's under attack
        for (const friendly of gameState.enemyPieces) {
            if (friendly.id === move.piece.id) continue;

            // Is this friendly piece under attack?
            if (!this.isSquareAttackedByPlayer(friendly.row, friendly.col, gameState)) continue;

            // Would our move defend it?
            const simBoard = this.cloneBoard(gameState.board);
            simBoard[move.from.row][move.from.col] = null;
            simBoard[move.to.row][move.to.col] = move.piece;

            const attacks = this.getAttackSquares(move.piece, move.to, simBoard);
            if (attacks.some(sq => sq.row === friendly.row && sq.col === friendly.col)) {
                return friendly;
            }
        }
        return null;
    }

    static calculateSafetyPenalty(move, gameState) {
        let penalty = 0;

        // Check if destination is attacked by player
        if (this.isSquareAttackedByPlayer(move.to.row, move.to.col, gameState)) {
            penalty += Math.abs(SAFETY_PENALTIES.MOVE_TO_ATTACKED_SQUARE);

            // Extra penalty if undefended
            if (!this.isSquareDefendedByEnemy(move.to.row, move.to.col, gameState, move.piece)) {
                penalty += Math.abs(SAFETY_PENALTIES.MOVE_TO_UNDEFENDED_ATTACKED) - Math.abs(SAFETY_PENALTIES.MOVE_TO_ATTACKED_SQUARE);
            }
        }

        // Check if moving this piece exposes our king
        if (this.wouldExposeEnemyKing(move, gameState)) {
            penalty += Math.abs(SAFETY_PENALTIES.EXPOSE_KING_TO_CHECK);
        }

        // Check if piece is a king defender
        if (this.isKingDefender(move.piece, gameState) && !this.stillDefendsKingAfterMove(move, gameState)) {
            penalty += Math.abs(SAFETY_PENALTIES.REMOVE_KING_DEFENDER);
        }

        return penalty;
    }

    static calculateCardDanger(move, gameState, playerCards) {
        let danger = 0;

        if (!playerCards || playerCards.length === 0) return danger;

        for (const cardId of playerCards) {
            const cardDanger = CARD_DANGERS[cardId];
            if (!cardDanger) continue;

            switch (cardDanger.condition) {
                case 'none':
                    // No position-based danger
                    break;

                case 'anyPosition':
                case 'anyPiece':
                case 'anyMove':
                    // Always applies - flat penalty
                    danger += Math.abs(cardDanger.penalty) * 0.3;
                    break;

                case 'nearHighValueTarget':
                    if (this.isNearHighValuePlayerPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'inKnightRange':
                    if (this.isInKnightRangeOfPlayer(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'behindObstacle':
                    if (this.isBehindObstacleFromRangedPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'nearEmptySquares':
                    if (this.hasEmptySquaresNearby(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty) * 0.5;
                    }
                    break;

                case 'adjacentToPlayer':
                    if (this.isAdjacentToPlayerPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                        if (this.isNearWall(move.to)) {
                            danger += 20;
                        }
                    }
                    break;

                case 'nearKing':
                    if (this.isNearPlayerKing(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'inExtendedRange':
                    if (this.isInExtendedRangeOfPlayer(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'nearEdge':
                    if (this.isNearEdge(move.to)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'blocking':
                    if (this.isBlockingPlayerPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'inRangedLine':
                    if (this.isInRangedLineOfPlayer(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'nearSamePiece':
                    if (this.hasNearbyAlliesOfSameType(move, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'kingExposed':
                    if (this.isEnemyKingExposed(gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'pawnNearby':
                    if (move.piece.type === 'pawn') {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'clustered':
                    if (this.isInCluster(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'multipleThreats':
                    if (this.canBeHitByMultiplePieces(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'isQueen':
                    if (move.piece.type === 'queen') {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;
            }
        }

        return danger;
    }

    static applyArchetypeModifiers(score, move, gameState, archetype) {
        const mods = archetype.modifiers;

        // Pawn advance bonus
        if (mods.pawnAdvanceBonus && move.piece.type === 'pawn' && move.to.row > move.from.row) {
            score += mods.pawnAdvanceBonus;
        }

        // King aggression penalty (keep king back)
        if (mods.kingAggressionPenalty && move.piece.type === 'king' && move.to.row > 2) {
            score += mods.kingAggressionPenalty;
        }

        // Queen aggression
        if (mods.queenAggressionPenalty && move.piece.type === 'queen') {
            const playerKing = gameState.playerPieces.find(p => p.type === 'king');
            if (playerKing) {
                const dist = Math.abs(move.to.row - playerKing.row) + Math.abs(move.to.col - playerKing.col);
                if (dist < 3) {
                    score += mods.queenAggressionPenalty;
                }
            }
        }

        if (mods.queenAggressionBonus && move.piece.type === 'queen') {
            const playerKing = gameState.playerPieces.find(p => p.type === 'king');
            if (playerKing) {
                const dist = Math.abs(move.to.row - playerKing.row) + Math.abs(move.to.col - playerKing.col);
                if (dist < 4) {
                    score += mods.queenAggressionBonus;
                }
            }
        }

        // Capture bonus
        if (mods.captureBonus) {
            const target = gameState.board[move.to.row][move.to.col];
            if (target && target.owner === 'player') {
                score += mods.captureBonus;
            }
        }

        // Defense penalty (less interested in defending)
        if (mods.defensePenalty) {
            // If move is purely defensive (not capturing, not advancing)
            const target = gameState.board[move.to.row][move.to.col];
            if (!target && move.to.row <= move.from.row) {
                score += mods.defensePenalty;
            }
        }

        // Advance bonus (all pieces push forward)
        if (mods.advanceBonus && move.to.row > move.from.row) {
            score += mods.advanceBonus;
        }

        // Defend king bonus
        if (mods.defendKingBonus) {
            const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
            if (enemyKing) {
                const distBefore = Math.abs(move.from.row - enemyKing.row) + Math.abs(move.from.col - enemyKing.col);
                const distAfter = Math.abs(move.to.row - enemyKing.row) + Math.abs(move.to.col - enemyKing.col);
                if (distAfter < distBefore && distAfter <= 2) {
                    score += mods.defendKingBonus;
                }
            }
        }

        // Safety penalty reduction
        if (mods.safetyPenaltyReduction && mods.safetyPenaltyReduction < 1) {
            // This is handled in the main scoring function
        }

        // Fork/Pin bonuses (Tactician)
        if (mods.forkBonus && this.detectFork(move, gameState)) {
            score += mods.forkBonus;
        }

        if (mods.pinBonus && this.detectPin(move, gameState)) {
            score += mods.pinBonus;
        }

        // Knight/Bishop bonus
        if (mods.knightBishopBonus && (move.piece.type === 'knight' || move.piece.type === 'bishop')) {
            score += mods.knightBishopBonus;
        }

        return score;
    }

    // ============================================
    // TACTICS DETECTION
    // ============================================

    static detectFork(move, gameState) {
        // A fork is when one piece attacks two or more valuable pieces
        const threatenedPieces = this.getThreatenedPiecesAfterMove(move, gameState);

        // Filter for valuable pieces (not pawns)
        const valuableThreats = threatenedPieces.filter(p =>
            p.type !== 'pawn' || p.type === 'king'
        );

        return valuableThreats.length >= 2;
    }

    static detectPin(move, gameState) {
        // A pin is when moving a piece would expose a more valuable piece behind it
        // For simplicity, check if after our move, a player piece is pinned to their king

        // Simulate the move
        const simBoard = this.cloneBoard(gameState.board);
        simBoard[move.from.row][move.from.col] = null;
        simBoard[move.to.row][move.to.col] = move.piece;

        const playerKing = gameState.playerPieces.find(p => p.type === 'king');
        if (!playerKing) return false;

        // Check if any of our pieces now pins a player piece to their king
        const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

        for (const [dr, dc] of directions) {
            let firstPiece = null;
            let secondPiece = null;

            for (let i = 1; i < 8; i++) {
                const row = move.to.row + dr * i;
                const col = move.to.col + dc * i;

                if (row < 0 || row >= 8 || col < 0 || col >= 8) break;

                const piece = simBoard[row][col];
                if (piece) {
                    if (!firstPiece) {
                        firstPiece = piece;
                    } else {
                        secondPiece = piece;
                        break;
                    }
                }
            }

            // Check if we have a pin situation
            if (firstPiece && secondPiece) {
                if (firstPiece.owner === 'player' && secondPiece.owner === 'player') {
                    if (secondPiece.type === 'king' && firstPiece.type !== 'pawn') {
                        // Check if our piece can actually attack in this direction
                        if (this.canAttackInDirection(move.piece.type, dr, dc)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    static canAttackInDirection(pieceType, dr, dc) {
        const isDiagonal = dr !== 0 && dc !== 0;
        const isStraight = dr === 0 || dc === 0;

        switch (pieceType) {
            case 'queen':
                return true;
            case 'rook':
                return isStraight;
            case 'bishop':
                return isDiagonal;
            default:
                return false;
        }
    }

    static isOverextended(piece, position, gameState) {
        // A piece is overextended if it's >3 squares from own king
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        if (!enemyKing) return false;

        const dist = Math.abs(position.row - enemyKing.row) + Math.abs(position.col - enemyKing.col);
        return dist > 3;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    static wouldPutPlayerKingInCheck(move, gameState) {
        const playerKing = gameState.playerPieces.find(p => p.type === 'king');
        if (!playerKing) return false;

        // Simulate the move
        const simBoard = this.cloneBoard(gameState.board);
        simBoard[move.from.row][move.from.col] = null;
        simBoard[move.to.row][move.to.col] = move.piece;

        // Check if the moved piece can now attack the king
        const attackingMoves = this.getAttackSquares(move.piece, move.to, simBoard);
        return attackingMoves.some(sq => sq.row === playerKing.row && sq.col === playerKing.col);
    }

    static getThreatenedPiecesAfterMove(move, gameState) {
        const simBoard = this.cloneBoard(gameState.board);
        simBoard[move.from.row][move.from.col] = null;
        simBoard[move.to.row][move.to.col] = move.piece;

        const attackSquares = this.getAttackSquares(move.piece, move.to, simBoard);
        const threatened = [];

        for (const sq of attackSquares) {
            const target = simBoard[sq.row][sq.col];
            if (target && target.owner === 'player') {
                threatened.push(target);
            }
        }

        return threatened;
    }

    static getAttackSquares(piece, position, board) {
        const squares = [];

        switch (piece.type) {
            case 'king':
                for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
                    const r = position.row + dr;
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
            case 'queen':
                this.addSlidingAttacks(position, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], board, squares);
                break;
            case 'rook':
                this.addSlidingAttacks(position, [[-1,0],[1,0],[0,-1],[0,1]], board, squares);
                break;
            case 'bishop':
                this.addSlidingAttacks(position, [[-1,-1],[-1,1],[1,-1],[1,1]], board, squares);
                break;
            case 'knight':
                for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                    const r = position.row + dr;
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
            case 'pawn':
                // Pawns attack diagonally forward
                for (const dc of [-1, 1]) {
                    const r = position.row + 1; // Enemy pawns attack downward
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
        }

        return squares;
    }

    static addSlidingAttacks(position, directions, board, squares) {
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const r = position.row + dr * i;
                const c = position.col + dc * i;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                squares.push({row: r, col: c});
                if (board[r][c]) break; // Stop at first piece
            }
        }
    }

    static isSquareAttackedByPlayer(row, col, gameState) {
        for (const piece of gameState.playerPieces) {
            const attacks = this.getPlayerAttackSquares(piece, gameState.board);
            if (attacks.some(sq => sq.row === row && sq.col === col)) {
                return true;
            }
        }
        return false;
    }

    static getPlayerAttackSquares(piece, board) {
        const squares = [];
        const position = { row: piece.row, col: piece.col };

        switch (piece.type) {
            case 'king':
                for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
                    const r = position.row + dr;
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
            case 'queen':
                this.addSlidingAttacks(position, [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], board, squares);
                break;
            case 'rook':
                this.addSlidingAttacks(position, [[-1,0],[1,0],[0,-1],[0,1]], board, squares);
                break;
            case 'bishop':
                this.addSlidingAttacks(position, [[-1,-1],[-1,1],[1,-1],[1,1]], board, squares);
                break;
            case 'knight':
                for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                    const r = position.row + dr;
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
            case 'pawn':
                // Player pawns attack diagonally upward
                for (const dc of [-1, 1]) {
                    const r = position.row - 1;
                    const c = position.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) squares.push({row: r, col: c});
                }
                break;
        }

        return squares;
    }

    static isSquareDefendedByEnemy(row, col, gameState, excludePiece) {
        for (const piece of gameState.enemyPieces) {
            if (piece === excludePiece) continue;
            if (gameState.frozenPieces && gameState.frozenPieces.has(piece.id)) continue;

            const attacks = this.getAttackSquares(piece, { row: piece.row, col: piece.col }, gameState.board);
            if (attacks.some(sq => sq.row === row && sq.col === col)) {
                return true;
            }
        }
        return false;
    }

    static wouldExposeEnemyKing(move, gameState) {
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        if (!enemyKing) return false;

        // Simulate the move
        const simBoard = this.cloneBoard(gameState.board);
        simBoard[move.from.row][move.from.col] = null;
        simBoard[move.to.row][move.to.col] = move.piece;

        // Check if any player piece can now attack the enemy king
        for (const playerPiece of gameState.playerPieces) {
            // Skip if we captured this piece
            if (playerPiece.row === move.to.row && playerPiece.col === move.to.col) continue;

            const attacks = this.getPlayerAttackSquares(playerPiece, simBoard);
            if (attacks.some(sq => sq.row === enemyKing.row && sq.col === enemyKing.col)) {
                return true;
            }
        }

        return false;
    }

    static isKingDefender(piece, gameState) {
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        if (!enemyKing || piece === enemyKing) return false;

        const dist = Math.abs(piece.row - enemyKing.row) + Math.abs(piece.col - enemyKing.col);
        return dist <= 2;
    }

    static stillDefendsKingAfterMove(move, gameState) {
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        if (!enemyKing) return true;

        const dist = Math.abs(move.to.row - enemyKing.row) + Math.abs(move.to.col - enemyKing.col);
        return dist <= 2;
    }

    // Card danger helpers
    static isNearHighValuePlayerPiece(position, gameState) {
        for (const piece of gameState.playerPieces) {
            if (piece.type === 'queen' || piece.type === 'rook' || piece.type === 'king') {
                const dist = Math.abs(position.row - piece.row) + Math.abs(position.col - piece.col);
                if (dist <= 2) return true;
            }
        }
        return false;
    }

    static isInKnightRangeOfPlayer(position, gameState) {
        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const piece of gameState.playerPieces) {
            for (const [dr, dc] of knightMoves) {
                if (position.row === piece.row + dr && position.col === piece.col + dc) {
                    return true;
                }
            }
        }
        return false;
    }

    static isBehindObstacleFromRangedPiece(position, gameState) {
        // Check if position is behind an obstacle from any ranged player piece
        for (const piece of gameState.playerPieces) {
            if (piece.type !== 'queen' && piece.type !== 'rook' && piece.type !== 'bishop') continue;

            const dr = Math.sign(position.row - piece.row);
            const dc = Math.sign(position.col - piece.col);

            // Check if it's a valid direction for this piece
            const isDiagonal = dr !== 0 && dc !== 0;
            const isStraight = dr === 0 || dc === 0;

            if (piece.type === 'rook' && !isStraight) continue;
            if (piece.type === 'bishop' && !isDiagonal) continue;

            // Count obstacles between piece and position
            let obstacles = 0;
            let r = piece.row + dr;
            let c = piece.col + dc;

            while (r !== position.row || c !== position.col) {
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (gameState.board[r][c]) obstacles++;
                r += dr;
                c += dc;
            }

            if (obstacles === 1) return true; // Exactly one obstacle = snipeable
        }
        return false;
    }

    static isAdjacentToPlayerPiece(position, gameState) {
        for (const piece of gameState.playerPieces) {
            const dist = Math.max(Math.abs(position.row - piece.row), Math.abs(position.col - piece.col));
            if (dist === 1) return true;
        }
        return false;
    }

    static isNearWall(position) {
        return position.row === 0 || position.row === 7 || position.col === 0 || position.col === 7;
    }

    // New card danger helpers
    static hasEmptySquaresNearby(position, gameState) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = position.row + dr;
                const c = position.col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8 && !gameState.board[r][c]) {
                    return true;
                }
            }
        }
        return false;
    }

    static isNearPlayerKing(position, gameState) {
        const playerKing = gameState.playerPieces.find(p => p.type === 'king');
        if (!playerKing) return false;
        const dist = Math.abs(position.row - playerKing.row) + Math.abs(position.col - playerKing.col);
        return dist <= 3;
    }

    static isInExtendedRangeOfPlayer(position, gameState) {
        for (const piece of gameState.playerPieces) {
            const dist = Math.abs(position.row - piece.row) + Math.abs(position.col - piece.col);
            if (dist <= 3) return true;
        }
        return false;
    }

    static isNearEdge(position) {
        return position.row <= 1 || position.row >= 6 || position.col <= 1 || position.col >= 6;
    }

    static isBlockingPlayerPiece(position, gameState) {
        const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        for (const piece of gameState.playerPieces) {
            for (const [dr, dc] of directions) {
                // Check if we're in line between player piece and a target
                let r = piece.row + dr;
                let c = piece.col + dc;
                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    if (r === position.row && c === position.col) {
                        return true;
                    }
                    if (gameState.board[r][c]) break;
                    r += dr;
                    c += dc;
                }
            }
        }
        return false;
    }

    static isInRangedLineOfPlayer(position, gameState) {
        for (const piece of gameState.playerPieces) {
            if (!['queen', 'rook', 'bishop'].includes(piece.type)) continue;
            const dr = Math.sign(position.row - piece.row);
            const dc = Math.sign(position.col - piece.col);
            const isDiagonal = dr !== 0 && dc !== 0;
            const isStraight = dr === 0 || dc === 0;
            if (piece.type === 'rook' && !isStraight) continue;
            if (piece.type === 'bishop' && !isDiagonal) continue;
            let r = piece.row + dr;
            let c = piece.col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (r === position.row && c === position.col) return true;
                if (gameState.board[r][c]) break;
                r += dr;
                c += dc;
            }
        }
        return false;
    }

    static hasNearbyAlliesOfSameType(move, gameState) {
        let count = 0;
        for (const piece of gameState.enemyPieces) {
            if (piece === move.piece) continue;
            if (piece.type === move.piece.type) {
                const dist = Math.abs(move.to.row - piece.row) + Math.abs(move.to.col - piece.col);
                if (dist <= 3) count++;
            }
        }
        return count >= 2;
    }

    static isEnemyKingExposed(gameState) {
        const enemyKing = gameState.enemyPieces.find(p => p.type === 'king');
        if (!enemyKing) return false;
        // Check if enemy king has few defenders nearby
        let defenders = 0;
        for (const piece of gameState.enemyPieces) {
            if (piece === enemyKing) continue;
            const dist = Math.abs(enemyKing.row - piece.row) + Math.abs(enemyKing.col - piece.col);
            if (dist <= 2) defenders++;
        }
        return defenders < 2;
    }

    static isInCluster(position, gameState) {
        let nearbyEnemies = 0;
        for (const piece of gameState.enemyPieces) {
            const dist = Math.max(Math.abs(position.row - piece.row), Math.abs(position.col - piece.col));
            if (dist <= 1) nearbyEnemies++;
        }
        return nearbyEnemies >= 3;
    }

    static canBeHitByMultiplePieces(position, gameState) {
        let threats = 0;
        for (const piece of gameState.playerPieces) {
            const attacks = this.getPlayerAttackSquares(piece, gameState.board);
            if (attacks.some(sq => sq.row === position.row && sq.col === position.col)) {
                threats++;
            }
        }
        return threats >= 2;
    }

    static cloneBoard(board) {
        return board.map(row => row ? [...row] : null);
    }

    static weightedRandomSelect(candidates) {
        if (candidates.length === 1) return candidates[0];

        // Weight towards higher scores
        const totalScore = candidates.reduce((sum, c) => sum + Math.max(c.score, 1), 0);
        let random = Math.random() * totalScore;

        for (const candidate of candidates) {
            random -= Math.max(candidate.score, 1);
            if (random <= 0) return candidate;
        }

        return candidates[0];
    }

    static generateReasoning(move, gameState) {
        const reasons = [];

        const target = gameState.board[move.to.row][move.to.col];
        if (target && target.owner === 'player') {
            reasons.push(`Captures ${target.type}`);
        }

        if (move.score > 200) {
            reasons.push('Strong tactical move');
        } else if (move.score > 100) {
            reasons.push('Good position');
        } else if (move.score > 50) {
            reasons.push('Development');
        } else {
            reasons.push('Safe move');
        }

        return reasons.join(', ');
    }

    // ============================================
    // MOVE VALIDATION (for re-checking intent)
    // ============================================

    static isMoveStillLegal(move, gameState) {
        // Check if piece still exists
        const piece = gameState.board[move.from.row]?.[move.from.col];
        if (!piece || piece.id !== move.piece.id) return false;

        // Check if piece is frozen/traitor
        if (gameState.frozenPieces && gameState.frozenPieces.has(piece.id)) return false;
        if (gameState.traitorPieces && gameState.traitorPieces.has(piece.id)) return false;
        if (gameState.invulnerablePieces && gameState.invulnerablePieces.has(piece.id)) return false;

        // Check if move is still valid
        const validMoves = this.getValidMovesForPiece(piece, gameState);
        return validMoves.some(m => m.row === move.to.row && m.col === move.to.col);
    }
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyAI, AI_ARCHETYPES, DIFFICULTY_SETTINGS };
}
