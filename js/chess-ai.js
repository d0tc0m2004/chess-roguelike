// ============================================
// CHESS AI - Comprehensive AI System
// Stockfish + Fallback + Self-Preservation
// ============================================

// ============================================
// FEN CONVERTER
// ============================================
class FENConverter {
    constructor() {
        this.pieceToChar = {
            pawn: 'p',
            knight: 'n',
            bishop: 'b',
            rook: 'r',
            queen: 'q',
            king: 'k'
        };
    }

    boardToFEN(board, enemyToMove = true) {
        let fen = '';

        // 1. Piece placement
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;

            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];

                if (!piece) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }

                    let char = this.pieceToChar[piece.type] || 'p';

                    // Player pieces are white (uppercase)
                    // Enemy pieces are black (lowercase)
                    if (piece.owner === 'player') {
                        char = char.toUpperCase();
                    }

                    fen += char;
                }
            }

            if (emptyCount > 0) {
                fen += emptyCount;
            }

            if (row < 7) {
                fen += '/';
            }
        }

        // 2. Active color
        fen += enemyToMove ? ' b' : ' w';

        // 3. Castling availability (disabled for non-standard positions)
        fen += ' -';

        // 4. En passant target square
        fen += ' -';

        // 5. Halfmove clock
        fen += ' 0';

        // 6. Fullmove number
        fen += ' 1';

        return fen;
    }

    validateFEN(fen) {
        const parts = fen.split(' ');
        if (parts.length !== 6) {
            return { valid: false, error: 'FEN must have 6 parts' };
        }

        const position = parts[0];
        const rows = position.split('/');

        if (rows.length !== 8) {
            return { valid: false, error: 'Position must have 8 rows' };
        }

        for (let i = 0; i < 8; i++) {
            let count = 0;
            for (const char of rows[i]) {
                if (char >= '1' && char <= '8') {
                    count += parseInt(char);
                } else if ('pnbrqkPNBRQK'.includes(char)) {
                    count += 1;
                } else {
                    return { valid: false, error: `Invalid character: ${char}` };
                }
            }
            if (count !== 8) {
                return { valid: false, error: `Row ${i + 1} has ${count} squares, expected 8` };
            }
        }

        return { valid: true };
    }
}

// ============================================
// COMPLEXITY ANALYZER
// ============================================
class ComplexityAnalyzer {
    constructor() {
        this.mobilityFactors = {
            pawn: 2,
            knight: 8,
            bishop: 7,
            rook: 14,
            queen: 21,
            king: 8
        };

        this.thresholds = {
            simple: 80,
            moderate: 120,
            complex: 160,
            veryComplex: 200,
            extreme: 250
        };
    }

    analyze(board) {
        const pieces = this.getAllPieces(board);

        const analysis = {
            totalPieces: pieces.length,
            playerPieces: 0,
            enemyPieces: 0,
            queens: 0,
            rooks: 0,
            bishops: 0,
            knights: 0,
            pawns: 0,
            kings: 0,
            estimatedMobility: 0,
            complexityScore: 0
        };

        for (const piece of pieces) {
            if (piece.owner === 'player') {
                analysis.playerPieces++;
            } else {
                analysis.enemyPieces++;
            }

            switch (piece.type) {
                case 'queen': analysis.queens++; break;
                case 'rook': analysis.rooks++; break;
                case 'bishop': analysis.bishops++; break;
                case 'knight': analysis.knights++; break;
                case 'pawn': analysis.pawns++; break;
                case 'king': analysis.kings++; break;
            }

            const mobility = this.mobilityFactors[piece.type] || 4;
            analysis.estimatedMobility += mobility;
        }

        analysis.complexityScore = this.calculateComplexity(analysis);
        analysis.category = this.categorize(analysis.complexityScore);
        analysis.recommendedDepth = this.getRecommendedDepth(analysis.complexityScore);
        analysis.recommendedTimeLimit = this.getRecommendedTimeLimit(analysis.complexityScore);

        return analysis;
    }

    calculateComplexity(analysis) {
        let score = 0;
        score += analysis.totalPieces * 3;
        score += analysis.queens * 25;
        score += analysis.rooks * 12;
        score += analysis.bishops * 8;
        score += analysis.knights * 6;
        score += analysis.pawns * 2;

        const asymmetry = Math.abs(analysis.playerPieces - analysis.enemyPieces);
        score += asymmetry * 5;

        if (analysis.queens > 2) {
            score += (analysis.queens - 2) * 20;
        }

        if (analysis.knights > 4) {
            score += (analysis.knights - 4) * 10;
        }

        return score;
    }

    categorize(score) {
        if (score < this.thresholds.simple) return 'simple';
        if (score < this.thresholds.moderate) return 'moderate';
        if (score < this.thresholds.complex) return 'complex';
        if (score < this.thresholds.veryComplex) return 'veryComplex';
        if (score < this.thresholds.extreme) return 'extreme';
        return 'tooComplex';
    }

    getRecommendedDepth(score) {
        let depth = 14;
        if (score >= this.thresholds.extreme) depth = 6;
        else if (score >= this.thresholds.veryComplex) depth = 8;
        else if (score >= this.thresholds.complex) depth = 10;
        else if (score >= this.thresholds.moderate) depth = 12;
        return depth;
    }

    getRecommendedTimeLimit(score) {
        let timeLimit = 2000;
        if (score >= this.thresholds.extreme) timeLimit = 4000;
        else if (score >= this.thresholds.veryComplex) timeLimit = 3500;
        else if (score >= this.thresholds.complex) timeLimit = 3000;
        return timeLimit;
    }

    getAllPieces(board) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (piece) {
                    pieces.push({ ...piece, position: { row, col } });
                }
            }
        }
        return pieces;
    }
}

// ============================================
// SELF PRESERVATION
// ============================================
class SelfPreservation {
    constructor() {
        this.pieceValues = {
            pawn: 100,
            knight: 320,
            bishop: 330,
            rook: 500,
            queen: 900,
            king: 20000
        };
    }

    evaluateMoveSafety(move, board, gameState) {
        const piece = board[move.from.row]?.[move.from.col];
        if (!piece) return { safe: false, reason: 'no piece' };

        const simBoard = this.simulateMove(board, move);
        const canBeCaptured = this.isSquareAttacked(simBoard, move.to, 'player', gameState);

        if (!canBeCaptured) {
            return { safe: true };
        }

        const isDefended = this.isSquareAttacked(simBoard, move.to, 'enemy', gameState);
        const capturedPiece = board[move.to.row]?.[move.to.col];
        const capturedValue = capturedPiece ? this.pieceValues[capturedPiece.type] || 0 : 0;
        const pieceValue = this.pieceValues[piece.type] || 100;

        if (isDefended) {
            if (capturedValue > 0) {
                const netValue = capturedValue - pieceValue;
                if (netValue >= -50) {
                    return { safe: true, reason: 'acceptable trade' };
                }
            }

            const lowestAttackerValue = this.getLowestAttackerValue(simBoard, move.to, 'player', gameState);
            if (lowestAttackerValue >= pieceValue * 0.8) {
                return { safe: true, reason: 'defended, equal trade possible' };
            }

            return {
                safe: false,
                reason: 'bad trade',
                pieceValue: pieceValue,
                wouldLose: pieceValue - capturedValue
            };
        } else {
            if (capturedValue >= pieceValue * 0.7) {
                return { safe: true, reason: 'good capture even if lost' };
            }

            return {
                safe: false,
                reason: 'undefended capture',
                pieceValue: pieceValue,
                wouldLose: pieceValue - capturedValue
            };
        }
    }

    filterSafeMoves(moves, board, gameState, allowRisk = false) {
        const evaluated = moves.map(m => ({
            move: m,
            safety: this.evaluateMoveSafety(m, board, gameState),
            score: m.score || 0
        }));

        const safeMoves = evaluated.filter(e => e.safety.safe);
        const riskyMoves = evaluated.filter(e => !e.safety.safe);

        if (safeMoves.length > 0) {
            return safeMoves.map(e => e.move);
        }

        if (allowRisk) {
            riskyMoves.sort((a, b) => (a.safety.wouldLose || 0) - (b.safety.wouldLose || 0));
            return riskyMoves.map(e => e.move);
        }

        return moves;
    }

    getLowestAttackerValue(board, square, side, gameState) {
        const attackers = this.getAttackers(board, square, side, gameState);
        if (attackers.length === 0) return Infinity;

        let lowest = Infinity;
        for (const attacker of attackers) {
            const value = this.pieceValues[attacker.type] || 100;
            if (value < lowest) lowest = value;
        }

        return lowest;
    }

    getAttackers(board, square, side, gameState) {
        const attackers = [];
        const pieces = this.getAllPieces(board, side);

        for (const piece of pieces) {
            if (gameState?.frozenPieces?.has(piece.id)) continue;
            const threats = this.getThreatenedSquares(piece, piece.position, board);
            if (threats.some(t => t.row === square.row && t.col === square.col)) {
                attackers.push(piece);
            }
        }

        return attackers;
    }

    getAllPieces(board, side) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (piece && piece.owner === side) {
                    pieces.push({ ...piece, position: { row, col } });
                }
            }
        }
        return pieces;
    }

    simulateMove(board, move) {
        const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
        const piece = newBoard[move.from.row][move.from.col];
        newBoard[move.from.row][move.from.col] = null;
        newBoard[move.to.row][move.to.col] = piece;
        return newBoard;
    }

    isSquareAttacked(board, square, bySide, gameState) {
        const pieces = this.getAllPieces(board, bySide);

        for (const piece of pieces) {
            if (gameState?.frozenPieces?.has(piece.id)) continue;
            const threats = this.getThreatenedSquares(piece, piece.position, board);
            if (threats.some(t => t.row === square.row && t.col === square.col)) {
                return true;
            }
        }

        return false;
    }

    getThreatenedSquares(piece, from, board) {
        const threatened = [];

        switch (piece.type) {
            case 'pawn':
                const dir = piece.owner === 'enemy' ? 1 : -1;
                threatened.push({ row: from.row + dir, col: from.col - 1 });
                threatened.push({ row: from.row + dir, col: from.col + 1 });
                break;
            case 'knight':
                const kOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (const [dr, dc] of kOffsets) {
                    threatened.push({ row: from.row + dr, col: from.col + dc });
                }
                break;
            case 'bishop':
                threatened.push(...this.getSlidingThreats(from, board, [[1,1],[1,-1],[-1,1],[-1,-1]]));
                break;
            case 'rook':
                threatened.push(...this.getSlidingThreats(from, board, [[0,1],[0,-1],[1,0],[-1,0]]));
                break;
            case 'queen':
                threatened.push(...this.getSlidingThreats(from, board, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]));
                break;
            case 'king':
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr !== 0 || dc !== 0) {
                            threatened.push({ row: from.row + dr, col: from.col + dc });
                        }
                    }
                }
                break;
        }

        return threatened.filter(sq => sq.row >= 0 && sq.row < 8 && sq.col >= 0 && sq.col < 8);
    }

    getSlidingThreats(from, board, directions) {
        const threatened = [];

        for (const [dr, dc] of directions) {
            let pos = { row: from.row + dr, col: from.col + dc };

            while (pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8) {
                threatened.push({ ...pos });
                if (board[pos.row]?.[pos.col]) break;
                pos = { row: pos.row + dr, col: pos.col + dc };
            }
        }

        return threatened;
    }
}

// ============================================
// STOCKFISH MANAGER
// ============================================
class StockfishManager {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.isCalculating = false;
        this.pendingResolve = null;
        this.pendingMoves = [];
        this.currentSkillLevel = 10;
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
                    const msg = typeof e.data === 'string' ? e.data : e.data?.data;
                    if (!msg) return;

                    if (msg === 'uciok' || e.data?.type === 'ready') {
                        this.configureEngine();
                    }

                    if (msg === 'readyok') {
                        clearTimeout(timeout);
                        this.isReady = true;
                        console.log('Stockfish ready');
                        resolve(true);
                    }

                    if (e.data?.type === 'error') {
                        clearTimeout(timeout);
                        console.warn('Stockfish error:', e.data.message);
                        this.useStockfish = false;
                        resolve(false);
                    }

                    // Parse MultiPV info lines
                    if (typeof msg === 'string' && msg.startsWith('info') && msg.includes(' pv ')) {
                        const parsed = this.parseInfoLine(msg);
                        if (parsed) {
                            this.pendingMoves.push(parsed);
                        }
                    }

                    // Best move found
                    if (typeof msg === 'string' && msg.startsWith('bestmove')) {
                        this.isCalculating = false;
                        if (this.pendingResolve) {
                            this.pendingMoves.sort((a, b) => (a.rank || 1) - (b.rank || 1));
                            const seen = new Set();
                            const uniqueMoves = this.pendingMoves.filter(m => {
                                if (seen.has(m.uci)) return false;
                                seen.add(m.uci);
                                return true;
                            });
                            this.pendingResolve(uniqueMoves);
                            this.pendingResolve = null;
                            this.pendingMoves = [];
                        }
                    }
                };

                this.worker.onerror = (err) => {
                    clearTimeout(timeout);
                    console.warn('Stockfish worker error:', err);
                    this.useStockfish = false;
                    resolve(false);
                };

                // Initialize UCI
                this.sendCommand('uci');
            } catch (err) {
                console.warn('Failed to create Stockfish worker:', err);
                this.useStockfish = false;
                resolve(false);
            }
        });
    }

    sendCommand(command) {
        if (this.worker) {
            this.worker.postMessage(command);
        }
    }

    configureEngine() {
        this.sendCommand('setoption name Hash value 32');
        this.sendCommand('setoption name Threads value 1');
        this.sendCommand(`setoption name Skill Level value ${this.currentSkillLevel}`);
        this.sendCommand('setoption name Ponder value false');
        this.sendCommand('isready');
    }

    setSkillLevel(level) {
        level = Math.max(0, Math.min(20, level));
        this.currentSkillLevel = level;
        this.sendCommand(`setoption name Skill Level value ${level}`);
    }

    setMultiPV(count) {
        this.sendCommand(`setoption name MultiPV value ${count}`);
    }

    parseInfoLine(line) {
        try {
            const parts = line.split(' ');
            const depthIndex = parts.indexOf('depth');
            const multipvIndex = parts.indexOf('multipv');
            const scoreIndex = parts.indexOf('score');
            const pvIndex = parts.indexOf('pv');

            if (pvIndex === -1) return null;

            const rank = multipvIndex !== -1 ? parseInt(parts[multipvIndex + 1]) : 1;
            const depth = depthIndex !== -1 ? parseInt(parts[depthIndex + 1]) : 0;

            let score = 0;
            let isMate = false;
            let mateIn = 0;

            if (scoreIndex !== -1) {
                const scoreType = parts[scoreIndex + 1];
                if (scoreType === 'cp') {
                    score = parseInt(parts[scoreIndex + 2]);
                } else if (scoreType === 'mate') {
                    isMate = true;
                    mateIn = parseInt(parts[scoreIndex + 2]);
                    score = mateIn > 0 ? 100000 - mateIn * 100 : -100000 - mateIn * 100;
                }
            }

            const uciMove = parts[pvIndex + 1];
            if (!uciMove || uciMove.length < 4) return null;

            const move = this.parseUCIMove(uciMove);

            return { rank, depth, score, isMate, mateIn, uci: uciMove, move };
        } catch (error) {
            return null;
        }
    }

    parseUCIMove(uci) {
        const files = 'abcdefgh';
        const fromCol = files.indexOf(uci[0]);
        const fromRow = 8 - parseInt(uci[1]);
        const toCol = files.indexOf(uci[2]);
        const toRow = 8 - parseInt(uci[3]);
        const promotion = uci.length > 4 ? uci[4] : null;

        return {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            promotion: promotion
        };
    }

    async waitUntilReady(timeout = 5000) {
        if (this.isReady) return true;
        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = () => {
                if (this.isReady) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async getTopMoves(fen, numMoves = 5, depth = 12, timeLimit = 3000) {
        await this.waitUntilReady();

        if (!this.isReady || !this.useStockfish) {
            return [];
        }

        if (this.isCalculating) {
            this.sendCommand('stop');
            await new Promise(r => setTimeout(r, 100));
        }

        return new Promise((resolve) => {
            this.pendingMoves = [];
            this.pendingResolve = resolve;
            this.isCalculating = true;

            const timeout = setTimeout(() => {
                if (this.isCalculating) {
                    this.sendCommand('stop');
                }
            }, timeLimit);

            const originalResolve = this.pendingResolve;
            this.pendingResolve = (moves) => {
                clearTimeout(timeout);
                originalResolve(moves);
            };

            this.setMultiPV(numMoves);
            this.sendCommand('ucinewgame');
            this.sendCommand(`position fen ${fen}`);
            this.sendCommand(`go depth ${depth}`);
        });
    }

    stop() {
        this.sendCommand('stop');
        this.isCalculating = false;
    }

    destroy() {
        this.stop();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// ============================================
// MAIN CHESS AI CONTROLLER
// ============================================
class ChessAI {
    constructor() {
        this.stockfish = new StockfishManager();
        this.fenConverter = new FENConverter();
        this.complexityAnalyzer = new ComplexityAnalyzer();
        this.selfPreservation = new SelfPreservation();

        this.config = {
            difficulty: {
                EASY: {
                    baseDepth: 8,
                    skillLevel: 3,
                    topMoves: 5,
                    mistakeChance: 0.15,
                    useSelfPreservation: false
                },
                MEDIUM: {
                    baseDepth: 12,
                    skillLevel: 10,
                    topMoves: 3,
                    mistakeChance: 0.05,
                    useSelfPreservation: true
                },
                HARD: {
                    baseDepth: 14,
                    skillLevel: 15,
                    topMoves: 2,
                    mistakeChance: 0.02,
                    useSelfPreservation: true
                },
                BRUTAL: {
                    baseDepth: 16,
                    skillLevel: 20,
                    topMoves: 1,
                    mistakeChance: 0,
                    useSelfPreservation: true
                }
            },
            maxComplexityForStockfish: 250
        };

        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        await this.stockfish.init();
        this.isInitialized = true;
    }

    setDifficulty(difficulty) {
        const settings = this.config.difficulty[difficulty];
        if (settings) {
            this.stockfish.setSkillLevel(settings.skillLevel);
        }
    }

    async calculateBestMove(gameState, playerCards, difficulty = 'MEDIUM') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const board = gameState.board;
        const settings = this.config.difficulty[difficulty] || this.config.difficulty.MEDIUM;

        // Analyze complexity
        const complexity = this.complexityAnalyzer.analyze(board);

        // If too complex, use fallback
        if (complexity.complexityScore > this.config.maxComplexityForStockfish || !this.stockfish.useStockfish) {
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        try {
            return await this.useStockfish(gameState, playerCards, difficulty, complexity);
        } catch (error) {
            console.error('Stockfish error, using fallback:', error);
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }
    }

    async useStockfish(gameState, playerCards, difficulty, complexity) {
        const board = gameState.board;
        const settings = this.config.difficulty[difficulty] || this.config.difficulty.MEDIUM;

        const depth = Math.min(settings.baseDepth, complexity.recommendedDepth);
        const timeLimit = complexity.recommendedTimeLimit;

        // Convert board to FEN
        const fen = this.fenConverter.boardToFEN(board, true);
        const validation = this.fenConverter.validateFEN(fen);

        if (!validation.valid) {
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Get top moves from Stockfish
        const numMoves = Math.max(settings.topMoves, 5);
        const stockfishMoves = await this.stockfish.getTopMoves(fen, numMoves, depth, timeLimit);

        if (stockfishMoves.length === 0) {
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Convert to our format and filter valid enemy moves
        let validMoves = stockfishMoves
            .map(m => this.convertStockfishMove(m, board))
            .filter(m => m && m.piece && m.piece.owner === 'enemy');

        if (validMoves.length === 0) {
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Apply self-preservation filter
        if (settings.useSelfPreservation) {
            const safeMoves = this.selfPreservation.filterSafeMoves(validMoves, board, gameState);
            if (safeMoves.length > 0) {
                validMoves = safeMoves;
            }
        }

        // Apply card danger penalties
        validMoves = validMoves.map(move => {
            const cardDanger = this.calculateCardDanger(move, gameState, playerCards);
            return { ...move, score: (move.score || 100) - cardDanger };
        });

        // Sort by adjusted score
        validMoves.sort((a, b) => (b.score || 0) - (a.score || 0));

        // Random mistake chance
        if (Math.random() < settings.mistakeChance && validMoves.length > 1) {
            const randomIndex = Math.floor(Math.random() * validMoves.length);
            return validMoves[randomIndex];
        }

        // Select from top N moves
        const topN = Math.min(settings.topMoves, validMoves.length);
        const candidates = validMoves.slice(0, topN);
        const selected = candidates[Math.floor(Math.random() * candidates.length)];

        selected.reasoning = `Stockfish: ${selected.uci || 'best'} (score: ${selected.score?.toFixed(0) || '?'})`;
        return selected;
    }

    convertStockfishMove(stockfishMove, board) {
        const move = stockfishMove.move;
        const piece = board[move.from.row]?.[move.from.col];

        if (!piece) return null;

        return {
            piece: piece,
            from: move.from,
            to: move.to,
            score: stockfishMove.score,
            depth: stockfishMove.depth,
            uci: stockfishMove.uci,
            isMate: stockfishMove.isMate,
            mateIn: stockfishMove.mateIn
        };
    }

    calculateCardDanger(move, gameState, playerCards) {
        let danger = 0;

        // Check for threatening cards
        for (const cardId of playerCards) {
            const card = typeof CARD_DEFINITIONS !== 'undefined' ? CARD_DEFINITIONS[cardId] : null;
            if (!card) continue;

            // Freeze/Stall cards
            if (['freeze', 'stall', 'sabotage'].includes(cardId)) {
                danger += 10;
            }

            // Damage cards
            if (['shieldBash', 'chainReaction', 'exile'].includes(cardId)) {
                danger += 15;
            }

            // Control cards
            if (['mindControl', 'doubleAgent', 'traitorsMark'].includes(cardId)) {
                danger += 20;
            }
        }

        // Exposed position penalty
        if (this.selfPreservation.isSquareAttacked(gameState.board, move.to, 'player', gameState)) {
            const pieceValue = this.selfPreservation.pieceValues[move.piece.type] || 100;
            danger += pieceValue * 0.3;
        }

        return danger;
    }

    useFallbackAI(gameState, playerCards, difficulty) {
        // Use the existing EnemyAI fallback system
        if (typeof EnemyAI !== 'undefined') {
            return EnemyAI.calculateBestMoveFallback(gameState, playerCards, difficulty, 'HUNTER');
        }
        return null;
    }

    isMoveStillLegal(move, gameState) {
        const piece = gameState.board[move.from.row]?.[move.from.col];
        if (!piece) return false;
        if (piece.owner !== 'enemy') return false;
        if (gameState.frozenPieces?.has(piece.id)) return false;

        const destPiece = gameState.board[move.to.row]?.[move.to.col];
        if (destPiece && destPiece.owner === 'enemy') return false;

        return true;
    }

    destroy() {
        this.stockfish.destroy();
    }
}

// Global instance
const chessAI = new ChessAI();

// Initialize on load
chessAI.initialize();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessAI, chessAI, FENConverter, ComplexityAnalyzer, SelfPreservation, StockfishManager };
}
