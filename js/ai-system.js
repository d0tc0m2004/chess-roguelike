// ============================================
// CUSTOM AI SYSTEM - Priority-Based Scoring
// Chess Roguelike
// ============================================

// ============================================
// AI ARCHETYPES
// ============================================
const AI_ARCHETYPES = {
    SWARM: {
        name: "The Swarm",
        modifiers: {
            pawnAdvanceBonus: +30,      // Prioritize pushing pawns
            kingAggressionPenalty: -50, // Keep King back
            queenAggressionPenalty: -20 // Queen plays safer
        }
    },
    HUNTER: {
        name: "The Hunter",
        modifiers: {
            queenAggressionBonus: +40,  // Queen actively chases
            captureBonus: +30,          // Extra reward for captures
            defensePenalty: -20         // Less interested in defense
        }
    },
    WALL: {
        name: "The Wall",
        modifiers: {
            advanceBonus: -30,          // Doesn't want to advance
            defendKingBonus: +50,       // Prioritizes King safety
            captureBonus: -20           // Only captures if safe
        }
    },
    TACTICIAN: {
        name: "The Tactician",
        modifiers: {
            forkBonus: +60,             // Loves forks
            pinBonus: +50,              // Loves pins
            knightBishopBonus: +20      // Prefers using Knights/Bishops
        }
    },
    AGGRESSOR: {
        name: "The Aggressor",
        modifiers: {
            advanceBonus: +40,          // All pieces push forward
            captureBonus: +50,          // Very capture-happy
            safetyPenaltyReduction: 0.5 // Ignores 50% of safety concerns
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
// CARD DANGER PENALTIES (adapted to actual game cards)
// ============================================
const CARD_DANGERS = {
    // Diamond Form - can't capture invulnerable pieces
    divineShield: {
        condition: 'nearHighValueTarget',
        penalty: -40
    },
    // Knight's Jump - player can attack from unexpected angles
    knightJump: {
        condition: 'inKnightRange',
        penalty: -35
    },
    // Snipe - ranged pieces can shoot through obstacles
    snipe: {
        condition: 'behindObstacle',
        penalty: -45
    },
    // Caltrops - traps on the board
    caltrops: {
        condition: 'nearEmptySquares',
        penalty: -25
    },
    // Shield Bash - can be pushed into walls
    shieldBash: {
        condition: 'adjacentToPlayer',
        penalty: -30
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
     * Calculate the best move for the AI
     * @param {Object} gameState - The current game state
     * @param {Array} playerCards - Cards in player's hand
     * @param {string} difficulty - 'EASY', 'MEDIUM', or 'HARD'
     * @param {string} archetype - AI personality archetype
     * @returns {Object} { piece, from, to, score, reasoning }
     */
    static calculateBestMove(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        const diffSettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.MEDIUM;
        const archetypeData = AI_ARCHETYPES[archetype] || AI_ARCHETYPES.HUNTER;

        // Get all possible moves
        const allMoves = this.getAllLegalMoves(gameState);

        if (allMoves.length === 0) {
            return null;
        }

        // Score each move
        const scoredMoves = allMoves.map(move => {
            let score = this.scoreMove(move, gameState, playerCards, archetypeData, diffSettings);

            // Apply difficulty-based safety penalty reduction
            if (diffSettings.ignoreSafetyChance > 0 && Math.random() < diffSettings.ignoreSafetyChance) {
                // Recalculate without safety penalties
                const baseScore = this.calculateBaseScore(move, gameState);
                const cardDanger = this.calculateCardDanger(move, gameState, playerCards) * diffSettings.cardPenaltyMultiplier;
                score = this.applyArchetypeModifiers(baseScore - cardDanger, move, gameState, archetypeData);
            }

            // Add fork/pin bonus for HARD difficulty
            if (diffSettings.forkPinBonus > 0) {
                if (this.detectFork(move, gameState)) {
                    score += diffSettings.forkPinBonus;
                }
                if (this.detectPin(move, gameState)) {
                    score += diffSettings.forkPinBonus;
                }
            }

            return { ...move, score };
        });

        // Sort by score descending
        scoredMoves.sort((a, b) => b.score - a.score);

        // Pick from top N moves based on difficulty
        const topN = Math.min(diffSettings.topMoves, scoredMoves.length);
        const candidates = scoredMoves.slice(0, topN);

        // Random selection from candidates (with slight weight towards higher scores)
        const selected = this.weightedRandomSelect(candidates);

        // Generate reasoning
        selected.reasoning = this.generateReasoning(selected, gameState);

        return selected;
    }

    /**
     * Preview enemy intent (called at start of player turn)
     */
    static previewEnemyIntent(gameState, playerCards, difficulty = 'MEDIUM', archetype = 'HUNTER') {
        return this.calculateBestMove(gameState, playerCards, difficulty, archetype);
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
                case 'nearHighValueTarget':
                    // Divine Shield - be wary of high-value pieces becoming invulnerable
                    if (this.isNearHighValuePlayerPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'inKnightRange':
                    // Knight's Jump - player pieces can move like knights
                    if (this.isInKnightRangeOfPlayer(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'behindObstacle':
                    // Snipe - ranged pieces can shoot through obstacles
                    if (this.isBehindObstacleFromRangedPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                    }
                    break;

                case 'nearEmptySquares':
                    // Caltrops - traps can be placed on empty squares
                    // Less relevant for move scoring, but be cautious
                    break;

                case 'adjacentToPlayer':
                    // Shield Bash - can be pushed
                    if (this.isAdjacentToPlayerPiece(move.to, gameState)) {
                        danger += Math.abs(cardDanger.penalty);
                        // Extra danger if near wall
                        if (this.isNearWall(move.to)) {
                            danger += 20;
                        }
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
