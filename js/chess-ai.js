// ============================================
// CHESS AI - DEBUG VERSION
// ============================================

// ============================================
// FEN CONVERTER - WITH DEBUG
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

        // Board orientation flag
        // true = row 0 is TOP of board (where enemy starts)
        // false = row 0 is BOTTOM of board (where player starts)
        this.row0IsTop = true;
        this.orientationDetected = false;
    }

    // Auto-detect board orientation based on king positions
    detectOrientation(board) {
        let playerKingRow = -1;
        let enemyKingRow = -1;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (piece?.type === 'king') {
                    if (piece.owner === 'player') {
                        playerKingRow = row;
                    } else if (piece.owner === 'enemy') {
                        enemyKingRow = row;
                    }
                }
            }
        }

        console.log(`[FEN] King detection: Player king at row ${playerKingRow}, Enemy king at row ${enemyKingRow}`);

        if (playerKingRow !== -1 && enemyKingRow !== -1) {
            // If player king is at higher row number, row 0 is at top (enemy side)
            this.row0IsTop = playerKingRow > enemyKingRow;
            this.orientationDetected = true;
            console.log(`[FEN] Board orientation: row0IsTop = ${this.row0IsTop}`);
        } else {
            console.warn('[FEN] Could not detect orientation - missing kings');
        }

        return this.row0IsTop;
    }

    boardToFEN(board, enemyToMove = true) {
        let fen = '';

        // Auto-detect orientation if not done
        if (!this.orientationDetected) {
            this.detectOrientation(board);
        }

        // FEN always starts with rank 8 (top of visual board)
        if (this.row0IsTop) {
            // Row 0 = rank 8 (top), Row 7 = rank 1 (bottom)
            for (let row = 0; row < 8; row++) {
                fen += this.rowToFEN(board, row);
                if (row < 7) fen += '/';
            }
        } else {
            // Row 0 = rank 1 (bottom), Row 7 = rank 8 (top) - need to flip
            for (let row = 7; row >= 0; row--) {
                fen += this.rowToFEN(board, row);
                if (row > 0) fen += '/';
            }
        }

        // Side to move: enemy = black = 'b'
        fen += enemyToMove ? ' b' : ' w';

        // Castling, en passant, halfmove, fullmove
        fen += ' - - 0 1';

        return fen;
    }

    rowToFEN(board, row) {
        let rowFen = '';
        let emptyCount = 0;

        for (let col = 0; col < 8; col++) {
            const piece = board[row]?.[col];

            if (!piece) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowFen += emptyCount;
                    emptyCount = 0;
                }

                let char = this.pieceToChar[piece.type] || 'p';

                // CRITICAL: Player = White = UPPERCASE
                //           Enemy = Black = lowercase
                if (piece.owner === 'player') {
                    char = char.toUpperCase();
                }
                // Enemy stays lowercase (default)

                rowFen += char;
            }
        }

        if (emptyCount > 0) {
            rowFen += emptyCount;
        }

        return rowFen;
    }

    // Parse UCI move back to internal coordinates
    parseUCIMove(uci) {
        const files = 'abcdefgh';
        const fromCol = files.indexOf(uci[0]);
        const fromRank = parseInt(uci[1]); // 1-8
        const toCol = files.indexOf(uci[2]);
        const toRank = parseInt(uci[3]); // 1-8
        const promotion = uci.length > 4 ? uci[4] : null;

        let fromRow, toRow;

        if (this.row0IsTop) {
            // Row 0 = rank 8, so row = 8 - rank
            fromRow = 8 - fromRank;
            toRow = 8 - toRank;
        } else {
            // Row 0 = rank 1, so row = rank - 1
            fromRow = fromRank - 1;
            toRow = toRank - 1;
        }

        return {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            promotion: promotion
        };
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
                const kOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
                for (const [dr, dc] of kOffsets) {
                    threatened.push({ row: from.row + dr, col: from.col + dc });
                }
                break;
            case 'bishop':
                threatened.push(...this.getSlidingThreats(from, board, [[1, 1], [1, -1], [-1, 1], [-1, -1]]));
                break;
            case 'rook':
                threatened.push(...this.getSlidingThreats(from, board, [[0, 1], [0, -1], [1, 0], [-1, 0]]));
                break;
            case 'queen':
                threatened.push(...this.getSlidingThreats(from, board, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]));
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
                console.log('[Stockfish] Creating worker...');
                this.worker = new Worker('js/stockfish-worker.js');

                const timeout = setTimeout(() => {
                    console.warn('[Stockfish] Init timeout (10s), using fallback AI');
                    this.useStockfish = false;
                    resolve(false);
                }, 10000);

                this.worker.onmessage = (e) => {
                    const msg = typeof e.data === 'string' ? e.data : e.data?.data;
                    if (!msg) return;

                    if (msg === 'uciok' || e.data?.type === 'ready') {
                        console.log('[Stockfish] UCI OK, configuring...');
                        this.configureEngine();
                    }

                    if (msg === 'readyok') {
                        clearTimeout(timeout);
                        this.isReady = true;
                        console.log('[Stockfish] Ready!');
                        resolve(true);
                    }

                    if (e.data?.type === 'error') {
                        clearTimeout(timeout);
                        console.warn('[Stockfish] Error:', e.data.message);
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
                    console.warn('[Stockfish] Worker error:', err);
                    this.useStockfish = false;
                    resolve(false);
                };

                this.sendCommand('uci');
            } catch (err) {
                console.warn('[Stockfish] Failed to create worker:', err);
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
        // this.sendCommand('setoption name Hash value 16');
        // this.sendCommand('setoption name Threads value 1');
        // this.sendCommand(`setoption name Skill Level value ${this.currentSkillLevel}`);
        // this.sendCommand('setoption name Ponder value false');
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

            return { rank, depth, score, isMate, mateIn, uci: uciMove };
        } catch (error) {
            return null;
        }
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
            console.log('[Stockfish] Not ready, returning empty');
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
// MAIN CHESS AI CONTROLLER - WITH DEBUG
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

        // DEBUG FLAG - Set to true to see all debug output
        this.DEBUG = false;
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

    // ==========================================
    // DEBUG METHODS
    // ==========================================

    debugLog(...args) {
        if (this.DEBUG) {
            console.log('[AI DEBUG]', ...args);
        }
    }

    logThinking(difficulty, settings, allValidMoves, candidates, selectedMove, gameState, isMistake = false) {
        console.group(`🤖 AI Thinking (${difficulty})`);
        console.log(`Setting: Top ${settings.topMoves} moves | Skill Level: ${settings.skillLevel} | Mistake Chance: ${(settings.mistakeChance * 100).toFixed(0)}%`);

        if (isMistake) {
            console.log(`⚠️ INTENTIONAL MISTAKE TRIGGERED! Picking random move.`);
        }

        console.table(allValidMoves.slice(0, 5).map((m, i) => ({
            Rank: i + 1,
            Move: m.uci,
            Score: m.score,
            Piece: m.piece.type,
            Capture: gameState.board[m.to.row][m.to.col] ? 'YES' : '-',
            Selected: m === selectedMove ? '✅' : (candidates && candidates.includes(m) ? 'Candidate' : '')
        })));

        console.log(`Selected: %c${selectedMove.uci}`, 'font-weight: bold; color: #4CAF50;', `(Score: ${selectedMove.score})`);
        console.groupEnd();
    }

    debugBoard(board, fen) {
        if (!this.DEBUG) return;

        console.log('\n========================================');
        console.log('           BOARD DEBUG OUTPUT           ');
        console.log('========================================\n');

        // Print internal board representation
        console.log('YOUR INTERNAL BOARD:');
        console.log('(P = Player piece, E = Enemy piece)');
        console.log('     0    1    2    3    4    5    6    7   <- COLUMNS');
        console.log('   +----+----+----+----+----+----+----+----+');

        for (let row = 0; row < 8; row++) {
            let line = ` ${row} |`;
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (!piece) {
                    line += ' .  |';
                } else {
                    let char = piece.type[0].toUpperCase();
                    if (piece.type === 'knight') char = 'N';
                    const owner = piece.owner === 'player' ? 'P' : 'E';
                    line += ` ${char}${owner} |`;
                }
            }
            console.log(line);
            console.log('   +----+----+----+----+----+----+----+----+');
        }
        console.log('   ^ ROWS');

        // Print FEN
        console.log('\n----------------------------------------');
        console.log('GENERATED FEN STRING:');
        console.log(fen);
        console.log('----------------------------------------\n');

        // Visualize what Stockfish sees
        console.log('WHAT STOCKFISH SEES:');
        console.log('(UPPERCASE = White pieces, lowercase = Black pieces)');
        console.log('     a    b    c    d    e    f    g    h');
        console.log('   +----+----+----+----+----+----+----+----+');

        const position = fen.split(' ')[0];
        const rows = position.split('/');

        for (let i = 0; i < 8; i++) {
            const rank = 8 - i;
            let line = ` ${rank} |`;

            for (const char of rows[i]) {
                if (char >= '1' && char <= '8') {
                    for (let j = 0; j < parseInt(char); j++) {
                        line += ' .  |';
                    }
                } else {
                    const isWhite = char === char.toUpperCase();
                    const colorMark = isWhite ? 'W' : 'B';
                    line += ` ${char}${colorMark} |`;
                }
            }
            console.log(line);
            console.log('   +----+----+----+----+----+----+----+----+');
        }

        const sideToMove = fen.split(' ')[1];
        console.log(`\nSide to move: ${sideToMove} (${sideToMove === 'b' ? 'Black = Enemy' : 'White = Player'})`);

        // Piece count verification
        console.log('\n----------------------------------------');
        console.log('PIECE COUNT VERIFICATION:');

        let internalPlayer = 0, internalEnemy = 0;
        let fenWhite = 0, fenBlack = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (piece) {
                    if (piece.owner === 'player') internalPlayer++;
                    else internalEnemy++;
                }
            }
        }

        for (const char of position.replace(/\//g, '')) {
            if ('PNBRQK'.includes(char)) fenWhite++;
            if ('pnbrqk'.includes(char)) fenBlack++;
        }

        console.log(`Your board:   Player pieces = ${internalPlayer}, Enemy pieces = ${internalEnemy}`);
        console.log(`FEN says:     White pieces = ${fenWhite}, Black pieces = ${fenBlack}`);

        if (internalPlayer === fenWhite && internalEnemy === fenBlack) {
            console.log('✅ MATCH! Piece counts are correct.');
        } else if (internalPlayer === fenBlack && internalEnemy === fenWhite) {
            console.log('❌ ERROR! Colors are SWAPPED! Player should be White (uppercase).');
        } else {
            console.log('❌ ERROR! Piece counts do not match!');
        }

        // Side to move check
        console.log('\n----------------------------------------');
        console.log('SIDE TO MOVE CHECK:');
        if (sideToMove === 'b') {
            console.log('✅ CORRECT! Black (Enemy) to move.');
        } else {
            console.log('❌ ERROR! White to move, but Enemy should move!');
        }

        console.log('\n========================================\n');
    }

    debugMoves(stockfishMoves, board) {
        if (!this.DEBUG) return;

        console.log('\n========================================');
        console.log('          STOCKFISH MOVES DEBUG         ');
        console.log('========================================\n');

        console.log(`Stockfish returned ${stockfishMoves.length} moves:\n`);

        for (let i = 0; i < stockfishMoves.length; i++) {
            const m = stockfishMoves[i];
            const move = this.fenConverter.parseUCIMove(m.uci);
            const pieceAtFrom = board[move.from.row]?.[move.from.col];
            const pieceAtTo = board[move.to.row]?.[move.to.col];

            console.log(`Move ${i + 1}: ${m.uci}`);
            console.log(`  UCI parsed -> from: (${move.from.row}, ${move.from.col}) to: (${move.to.row}, ${move.to.col})`);
            console.log(`  Piece at FROM: ${pieceAtFrom ? pieceAtFrom.type + ' (' + pieceAtFrom.owner + ')' : 'EMPTY!'}`);
            console.log(`  Piece at TO:   ${pieceAtTo ? pieceAtTo.type + ' (' + pieceAtTo.owner + ')' : 'empty'}`);
            console.log(`  Score: ${m.score}, Depth: ${m.depth}`);

            if (!pieceAtFrom) {
                console.log(`  ❌ ERROR: No piece at source square!`);
            } else if (pieceAtFrom.owner === 'player') {
                console.log(`  ❌ ERROR: This is a PLAYER piece, not enemy!`);
            } else {
                console.log(`  ✅ Valid enemy piece`);
                if (pieceAtTo && pieceAtTo.owner === 'player') {
                    console.log(`  🎯 CAPTURE: Would capture ${pieceAtTo.type}!`);
                }
            }
            console.log('');
        }

        console.log('========================================\n');
    }

    // ==========================================
    // MAIN CALCULATION METHOD
    // ==========================================

    async calculateBestMove(gameState, playerCards, difficulty = 'MEDIUM') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const board = gameState.board;
        const settings = this.config.difficulty[difficulty] || this.config.difficulty.MEDIUM;

        this.debugLog('Starting move calculation...');
        this.debugLog('Difficulty:', difficulty);

        // Analyze complexity
        const complexity = this.complexityAnalyzer.analyze(board);
        this.debugLog('Complexity:', complexity.complexityScore, complexity.category);

        // If too complex or Stockfish not available, use fallback
        if (complexity.complexityScore > this.config.maxComplexityForStockfish || !this.stockfish.useStockfish) {
            this.debugLog('Using fallback AI (complexity or Stockfish unavailable)');
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        try {
            return await this.useStockfish(gameState, playerCards, difficulty, complexity);
        } catch (error) {
            console.error('[AI] Stockfish error, using fallback:', error);
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }
    }

    async useStockfish(gameState, playerCards, difficulty, complexity) {
        const board = gameState.board;
        const settings = this.config.difficulty[difficulty] || this.config.difficulty.MEDIUM;

        const depth = Math.min(settings.baseDepth, complexity.recommendedDepth);
        const timeLimit = complexity.recommendedTimeLimit;

        this.debugLog('Using Stockfish with depth', depth, 'time limit', timeLimit);

        // Convert board to FEN
        const fen = this.fenConverter.boardToFEN(board, true);

        // DEBUG: Show board and FEN
        this.debugBoard(board, fen);

        const validation = this.fenConverter.validateFEN(fen);

        if (!validation.valid) {
            console.error('[AI] Invalid FEN:', validation.error);
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Get top moves from Stockfish
        const numMoves = Math.max(settings.topMoves, 5);
        const stockfishMoves = await this.stockfish.getTopMoves(fen, numMoves, depth, timeLimit);

        this.debugLog('Stockfish returned', stockfishMoves.length, 'moves');

        // DEBUG: Show all moves
        this.debugMoves(stockfishMoves, board);

        if (stockfishMoves.length === 0) {
            this.debugLog('No moves from Stockfish, using fallback');
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Convert to our format and filter valid enemy moves
        let validMoves = [];

        for (const m of stockfishMoves) {
            const move = this.fenConverter.parseUCIMove(m.uci);
            const piece = board[move.from.row]?.[move.from.col];

            if (!piece) {
                this.debugLog(`Move ${m.uci}: No piece at (${move.from.row}, ${move.from.col})`);
                continue;
            }

            if (piece.owner !== 'enemy') {
                this.debugLog(`Move ${m.uci}: Piece is ${piece.owner}, not enemy`);
                continue;
            }

            validMoves.push({
                piece: piece,
                from: move.from,
                to: move.to,
                score: m.score,
                depth: m.depth,
                uci: m.uci,
                isMate: m.isMate,
                mateIn: m.mateIn
            });
        }

        this.debugLog('Valid enemy moves:', validMoves.length);

        if (validMoves.length === 0) {
            this.debugLog('No valid enemy moves after filtering, using fallback');
            return this.useFallbackAI(gameState, playerCards, difficulty);
        }

        // Apply self-preservation filter
        if (settings.useSelfPreservation) {
            const safeMoves = this.selfPreservation.filterSafeMoves(validMoves, board, gameState);
            if (safeMoves.length > 0) {
                validMoves = safeMoves;
            }
        }

        // Sort by score
        validMoves.sort((a, b) => (b.score || 0) - (a.score || 0));

        // Random mistake chance
        if (Math.random() < settings.mistakeChance && validMoves.length > 1) {
            const randomIndex = Math.floor(Math.random() * validMoves.length);
            const selected = validMoves[randomIndex];
            this.debugLog('Making intentional mistake, choosing random move');
            this.logThinking(difficulty, settings, validMoves, null, selected, gameState, true);
            return selected;
        }

        // Select from top N moves
        const topN = Math.min(settings.topMoves, validMoves.length);
        const candidates = validMoves.slice(0, topN);
        const selected = candidates[Math.floor(Math.random() * candidates.length)];

        this.debugLog('Selected move:', selected.uci, 'Score:', selected.score);

        // Visualize thinking
        this.logThinking(difficulty, settings, validMoves, candidates, selected, gameState);

        selected.reasoning = `Stockfish: ${selected.uci} (score: ${selected.score?.toFixed(0) || '?'})`;
        return selected;
    }

    useFallbackAI(gameState, playerCards, difficulty) {
        this.debugLog('Using fallback AI');

        // Simple fallback: find best capture or random move
        const board = gameState.board;
        const enemyPieces = [];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row]?.[col];
                if (piece && piece.owner === 'enemy') {
                    enemyPieces.push({ piece, row, col });
                }
            }
        }

        // Try to find a capture
        for (const { piece, row, col } of enemyPieces) {
            const moves = this.selfPreservation.getThreatenedSquares(piece, { row, col }, board);
            for (const move of moves) {
                const target = board[move.row]?.[move.col];
                if (target && target.owner === 'player') {
                    this.debugLog('Fallback found capture:', piece.type, 'captures', target.type);
                    return {
                        piece: piece,
                        from: { row, col },
                        to: move,
                        score: this.selfPreservation.pieceValues[target.type] || 100,
                        reasoning: 'Fallback: capture'
                    };
                }
            }
        }

        // No capture found, return first legal move
        for (const { piece, row, col } of enemyPieces) {
            const moves = this.selfPreservation.getThreatenedSquares(piece, { row, col }, board);
            for (const move of moves) {
                const target = board[move.row]?.[move.col];
                if (!target || target.owner !== 'enemy') {
                    return {
                        piece: piece,
                        from: { row, col },
                        to: move,
                        score: 0,
                        reasoning: 'Fallback: first legal move'
                    };
                }
            }
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

// ============================================
// TEST FUNCTION - RUN THIS TO DEBUG
// ============================================
async function testAICapture() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         AI CAPTURE TEST STARTING          ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n');

    // Create test AI
    const testAI = new ChessAI();
    testAI.DEBUG = true;

    await testAI.initialize();

    // Create a simple board with an obvious capture
    // Array of 8 rows, each with 8 columns
    const testBoard = [];
    for (let i = 0; i < 8; i++) {
        testBoard.push([null, null, null, null, null, null, null, null]);
    }

    // Place pieces for the test
    // SETUP:
    //   Row 0: Enemy King at column 4 (e8 in chess notation)
    //   Row 3: Enemy Pawn at column 3 (d5 in chess notation)
    //   Row 4: Player Queen at column 4 (e4 in chess notation) - CAN BE CAPTURED!
    //   Row 7: Player King at column 4 (e1 in chess notation)

    testBoard[0][4] = { type: 'king', owner: 'enemy', id: 'enemy_king' };
    testBoard[3][3] = { type: 'pawn', owner: 'enemy', id: 'enemy_pawn' };
    testBoard[4][4] = { type: 'queen', owner: 'player', id: 'player_queen' };
    testBoard[7][4] = { type: 'king', owner: 'player', id: 'player_king' };

    const gameState = {
        board: testBoard,
        frozenPieces: new Set()
    };

    console.log('TEST SETUP:');
    console.log('═══════════════════════════════════════');
    console.log('• Enemy King at row 0, col 4 (e8)');
    console.log('• Enemy Pawn at row 3, col 3 (d5)');
    console.log('• Player Queen at row 4, col 4 (e4) <- CAN BE CAPTURED');
    console.log('• Player King at row 7, col 4 (e1)');
    console.log('');
    console.log('EXPECTED RESULT: Enemy pawn captures queen (d5xe4)');
    console.log('═══════════════════════════════════════\n');

    // Calculate move
    const move = await testAI.calculateBestMove(gameState, [], 'HARD');

    console.log('\n');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║              TEST RESULT                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('\n');

    if (!move) {
        console.log('❌ FAIL: AI returned no move!');
    } else {
        console.log('AI chose:');
        console.log('  Piece:', move.piece?.type);
        console.log('  From: row', move.from?.row, ', col', move.from?.col);
        console.log('  To:   row', move.to?.row, ', col', move.to?.col);
        console.log('  UCI:', move.uci);
        console.log('  Score:', move.score);
        console.log('');

        // Check if correct
        const capturedQueen =
            move.from?.row === 3 &&
            move.from?.col === 3 &&
            move.to?.row === 4 &&
            move.to?.col === 4;

        if (capturedQueen) {
            console.log('✅ SUCCESS! AI correctly captured the Queen!');
        } else {
            console.log('❌ FAIL! AI did NOT capture the Queen!');
            console.log('');
            console.log('DIAGNOSIS:');
            console.log('Check the debug output above to see:');
            console.log('1. Is the FEN correct?');
            console.log('2. Are piece colors correct (player=uppercase, enemy=lowercase)?');
            console.log('3. Is side to move "b" (black/enemy)?');
            console.log('4. Are the move coordinates being parsed correctly?');
        }
    }

    console.log('\n');

    // Cleanup
    testAI.destroy();
}

// ============================================
// GLOBAL INSTANCE
// ============================================
const chessAI = new ChessAI();

// Initialize on load
chessAI.initialize();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessAI, chessAI, FENConverter, ComplexityAnalyzer, SelfPreservation, StockfishManager, testAICapture };
}