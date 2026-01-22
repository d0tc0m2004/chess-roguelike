// Chess Roguelike - Prototype

// ============================================
// CONSTANTS & CONFIG
// ============================================

const BOARD_ROWS = 8;

const PIECES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

const PIECE_SYMBOLS = {
    king: { player: '♔', enemy: '♚' },
    queen: { player: '♕', enemy: '♛' },
    rook: { player: '♖', enemy: '♜' },
    bishop: { player: '♗', enemy: '♝' },
    knight: { player: '♘', enemy: '♞' },
    pawn: { player: '♙', enemy: '♟' }
};

const CARDS = {
    divineShield: {
        name: 'Diamond Form',
        effect: 'Target piece becomes Invulnerable but Cannot Move for 1 round.',
        rarity: 'rare',
        action: 'selectPlayerPiece'
    },
    knightJump: {
        name: "Knight's Jump",
        effect: 'All your pieces can move like Knights this turn.',
        rarity: 'uncommon',
        action: 'instant'
    },
    snipe: {
        name: 'Snipe',
        effect: 'Ranged pieces can capture through one obstacle (Cannot target King).',
        rarity: 'rare',
        action: 'instant'
    },
    caltrops: {
        name: 'Caltrops',
        effect: 'Place a lethal trap on an empty square.',
        rarity: 'uncommon',
        action: 'selectEmpty'
    },
    shieldBash: {
        name: 'Shield Bash',
        effect: 'Push an adjacent enemy 1 tile back. Captures if they hit a wall.',
        rarity: 'rare',
        action: 'selectEnemy'
    }
};

// Piece material values for AI evaluation
const PIECE_VALUES = {
    king: 10000,
    queen: 900,
    rook: 500,
    bishop: 330,
    knight: 320,
    pawn: 100
};

// Position bonus tables for AI (knights prefer center, pawns prefer advancing)
const POSITION_BONUS = {
    knight: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    pawn: [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ]
};

// ============================================
// GAME STATE
// ============================================

class ChessRoguelike {
    constructor() {
        this.board = [];
        this.playerPieces = [];
        this.enemyPieces = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.gameOver = false;

        // Loadout system
        this.playerLoadout = ['queen', 'rook', 'knight']; // Default loadout
        this.gameStarted = false;

        // Card system - tactical cards
        this.hand = ['divineShield', 'knightJump', 'snipe', 'caltrops', 'shieldBash'];
        this.selectedCard = null;
        this.cardState = null;
        this.cardsPlayedThisBattle = 0;
        this.maxCardsPerBattle = 3;

        // Status effects
        this.frozenPieces = new Map(); // piece id -> turns remaining
        this.traitorPieces = new Map(); // piece id -> turns remaining
        this.invulnerablePieces = new Map(); // piece id -> turns remaining

        // Traps (Caltrops)
        this.traps = new Map(); // "row,col" -> true

        // Special turn modifiers
        this.knightJumpActive = false;
        this.snipeActive = false;

        // History for Time Warp
        this.boardHistory = [];

        // Enemy AI
        this.enemyIntent = null;
        this.skipEnemyTurn = false;

        // Game analysis
        this.moveCount = 0;
        this.enemyMoveCount = 0;
        this.piecesLost = 0;
        this.piecesCaptures = 0;

        // Stockfish AI engine
        this.stockfish = null;
        this.stockfishReady = false;
        this.stockfishPending = null;
        this.initStockfish();

        this.initLoadout();
    }

    // ============================================
    // STOCKFISH INTEGRATION
    // ============================================

    initStockfish() {
        try {
            // Try to initialize Stockfish as a Web Worker
            if (typeof STOCKFISH === 'function') {
                this.stockfish = STOCKFISH();
                this.setupStockfishHandlers();
            } else {
                console.warn('Stockfish not available, falling back to minimax');
            }
        } catch (e) {
            console.warn('Failed to initialize Stockfish:', e);
            this.stockfish = null;
        }
    }

    setupStockfishHandlers() {
        if (!this.stockfish) return;

        this.stockfish.onmessage = (event) => {
            const message = typeof event === 'string' ? event : event.data;

            if (message === 'uciok') {
                this.stockfishReady = true;
                // Set Stockfish options for faster play
                this.stockfish.postMessage('setoption name Skill Level value 20');
                this.stockfish.postMessage('isready');
            } else if (message === 'readyok') {
                this.stockfishReady = true;
            } else if (message.startsWith('bestmove')) {
                this.handleStockfishBestMove(message);
            } else if (message.startsWith('info') && message.includes('pv')) {
                this.handleStockfishInfo(message);
            }
        };

        // Initialize UCI protocol
        this.stockfish.postMessage('uci');
    }

    // Convert board state to FEN string
    boardToFEN() {
        const pieceToFEN = {
            king: { player: 'K', enemy: 'k' },
            queen: { player: 'Q', enemy: 'q' },
            rook: { player: 'R', enemy: 'r' },
            bishop: { player: 'B', enemy: 'b' },
            knight: { player: 'N', enemy: 'n' },
            pawn: { player: 'P', enemy: 'p' }
        };

        let fen = '';

        // Board position
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += pieceToFEN[piece.type][piece.owner];
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row < 7) {
                fen += '/';
            }
        }

        // Active color: 'b' for black (enemy's turn when we query Stockfish)
        // We query Stockfish for the enemy's move, so it's always black's turn
        fen += ' b';

        // Castling availability (simplified - no castling in our game)
        fen += ' -';

        // En passant target square (simplified - none)
        fen += ' -';

        // Halfmove clock and fullmove number
        fen += ' 0 1';

        return fen;
    }

    // Parse algebraic move notation (e.g., "e2e4") to row/col
    parseStockfishMove(moveStr) {
        if (!moveStr || moveStr.length < 4) return null;

        const files = 'abcdefgh';
        const fromCol = files.indexOf(moveStr[0]);
        const fromRow = 8 - parseInt(moveStr[1]);
        const toCol = files.indexOf(moveStr[2]);
        const toRow = 8 - parseInt(moveStr[3]);

        if (fromCol < 0 || toCol < 0 || fromRow < 0 || fromRow > 7 || toRow < 0 || toRow > 7) {
            return null;
        }

        return {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };
    }

    // Handle bestmove response from Stockfish
    handleStockfishBestMove(message) {
        const parts = message.split(' ');
        const bestMoveIdx = parts.indexOf('bestmove');
        if (bestMoveIdx >= 0 && parts[bestMoveIdx + 1]) {
            const moveStr = parts[bestMoveIdx + 1];
            const parsedMove = this.parseStockfishMove(moveStr);

            if (this.stockfishPending) {
                this.stockfishPending.bestMove = parsedMove;
                this.stockfishPending.resolve(this.stockfishPending.candidates);
            }
        }
    }

    // Handle info lines with principal variations
    handleStockfishInfo(message) {
        if (!this.stockfishPending) return;

        // Extract multipv number and pv moves
        const multipvMatch = message.match(/multipv (\d+)/);
        const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8])/);

        if (multipvMatch && pvMatch) {
            const pvNum = parseInt(multipvMatch[1]);
            const moveStr = pvMatch[1];
            const parsedMove = this.parseStockfishMove(moveStr);

            if (parsedMove && pvNum <= 5) {
                this.stockfishPending.candidates[pvNum - 1] = parsedMove;
            }
        }
    }

    // Get top candidate moves from Stockfish
    async getStockfishCandidates(depth = 10, multiPV = 5) {
        if (!this.stockfish || !this.stockfishReady) {
            return null;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.stockfishPending = null;
                resolve(null); // Timeout - fall back to minimax
            }, 3000);

            this.stockfishPending = {
                candidates: [],
                bestMove: null,
                resolve: (candidates) => {
                    clearTimeout(timeout);
                    this.stockfishPending = null;
                    resolve(candidates);
                }
            };

            const fen = this.boardToFEN();
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth} multipv ${multiPV}`);
        });
    }

    // Filter Stockfish moves through safety layer
    filterStockfishMoves(candidates) {
        if (!candidates || candidates.length === 0) return null;

        for (const move of candidates) {
            if (!move) continue;

            const piece = this.board[move.from.row]?.[move.from.col];
            if (!piece || piece.owner !== 'enemy') continue;

            // Check 1: Reject moves to trapped squares
            const trapKey = `${move.to.row},${move.to.col}`;
            if (this.traps.has(trapKey)) {
                continue; // REJECT - trap
            }

            // Check 2: Reject moves from frozen pieces
            if (this.frozenPieces.has(piece.id)) {
                continue; // REJECT - frozen
            }

            // Check 3: Reject moves from traitor pieces
            if (this.traitorPieces.has(piece.id)) {
                continue; // REJECT - traitor
            }

            // Check 4: Reject captures of invulnerable pieces
            const targetPiece = this.board[move.to.row]?.[move.to.col];
            if (targetPiece && this.invulnerablePieces.has(targetPiece.id)) {
                continue; // REJECT - divine shield
            }

            // Check 5: Verify move is actually valid
            const validMoves = this.getValidMoves(piece, true);
            const isValid = validMoves.some(m => m.row === move.to.row && m.col === move.to.col);
            if (!isValid) {
                continue; // REJECT - not a valid move
            }

            // This move passes all checks!
            return {
                piece,
                from: move.from,
                to: { row: move.to.row, col: move.to.col }
            };
        }

        return null; // All moves rejected
    }

    // Get best move using Stockfish with safety filter, falling back to minimax
    async getBestHybridMove() {
        // Try Stockfish first
        const candidates = await this.getStockfishCandidates(10, 5);

        if (candidates && candidates.length > 0) {
            const safeMove = this.filterStockfishMoves(candidates);
            if (safeMove) {
                console.log('Using Stockfish move');
                return safeMove;
            }
        }

        // Fallback to minimax
        console.log('Falling back to minimax');
        return this.findBestEnemyMove();
    }

    initLoadout() {
        this.bindLoadoutEvents();
        this.updateLoadoutDisplay();
    }

    bindLoadoutEvents() {
        // Piece selection dropdowns
        const slot1 = document.getElementById('slot1-select');
        const slot2 = document.getElementById('slot2-select');
        const slot3 = document.getElementById('slot3-select');

        const updateSlot = (slotNum, value) => {
            this.playerLoadout[slotNum - 1] = value;
            this.updateLoadoutDisplay();
        };

        slot1.addEventListener('change', (e) => updateSlot(1, e.target.value));
        slot2.addEventListener('change', (e) => updateSlot(2, e.target.value));
        slot3.addEventListener('change', (e) => updateSlot(3, e.target.value));

        // Start battle button
        document.getElementById('start-battle-btn').addEventListener('click', () => {
            this.startGame();
        });
    }

    updateLoadoutDisplay() {
        const pieceSymbols = {
            queen: '♕',
            rook: '♖',
            bishop: '♗',
            knight: '♘'
        };

        document.getElementById('slot1-piece').textContent = pieceSymbols[this.playerLoadout[0]];
        document.getElementById('slot2-piece').textContent = pieceSymbols[this.playerLoadout[1]];
        document.getElementById('slot3-piece').textContent = pieceSymbols[this.playerLoadout[2]];
    }

    startGame() {
        // Hide loadout, show game
        document.getElementById('loadout-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';

        this.gameStarted = true;
        this.init();
    }

    init() {
        this.createBoard();
        this.setupBattle();
        this.saveBoardState(); // Save initial state for Time Warp
        this.render();
        this.bindEvents();
    }

    // ============================================
    // BOARD SETUP
    // ============================================

    createBoard() {
        this.board = [];
        for (let row = 0; row < BOARD_ROWS; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                this.board[row][col] = null;
            }
        }
    }

    setupBattle() {
        // Clear previous
        this.playerPieces = [];
        this.enemyPieces = [];
        this.frozenPieces.clear();
        this.traitorPieces.clear();
        this.invulnerablePieces.clear();
        this.traps.clear();
        this.boardHistory = [];
        this.moveCount = 0;
        this.enemyMoveCount = 0;
        this.piecesLost = 0;
        this.piecesCaptures = 0;

        // === PLAYER ARMY (4 pieces) ===
        // King at e1 (row 7, col 4) - bottom row center (standard 8x8 board)
        this.placePiece(7, 4, PIECES.KING, 'player');

        // 3 chosen pieces in guard formation around the king
        // Position: d1 (7,3), f1 (7,5), e2 (6,4)
        this.placePiece(7, 3, this.playerLoadout[0], 'player'); // Left of king
        this.placePiece(7, 5, this.playerLoadout[1], 'player'); // Right of king
        this.placePiece(6, 4, this.playerLoadout[2], 'player'); // In front of king

        // === ENEMY ARMY (16 pieces - Full Chess Army) ===
        // Back row: R N B Q K B N R
        this.placePiece(0, 0, PIECES.ROOK, 'enemy');
        this.placePiece(0, 1, PIECES.KNIGHT, 'enemy');
        this.placePiece(0, 2, PIECES.BISHOP, 'enemy');
        this.placePiece(0, 3, PIECES.QUEEN, 'enemy');
        this.placePiece(0, 4, PIECES.KING, 'enemy');
        this.placePiece(0, 5, PIECES.BISHOP, 'enemy');
        this.placePiece(0, 6, PIECES.KNIGHT, 'enemy');
        this.placePiece(0, 7, PIECES.ROOK, 'enemy');

        // Pawn row: 8 pawns
        for (let col = 0; col < 8; col++) {
            this.placePiece(1, col, PIECES.PAWN, 'enemy');
        }

        // Calculate initial enemy intent
        this.calculateEnemyIntent();
    }

    placePiece(row, col, type, owner) {
        const piece = { type, owner, row, col, id: `${owner}-${type}-${Date.now()}-${Math.random()}` };
        this.board[row][col] = piece;
        if (owner === 'player') {
            this.playerPieces.push(piece);
        } else {
            this.enemyPieces.push(piece);
        }
        return piece;
    }

    // ============================================
    // BOARD HISTORY (for Time Warp)
    // ============================================

    saveBoardState() {
        const state = {
            board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            playerPieces: this.playerPieces.map(p => ({ ...p })),
            enemyPieces: this.enemyPieces.map(p => ({ ...p })),
            frozenPieces: new Map(this.frozenPieces),
            traitorPieces: new Map(this.traitorPieces),
            invulnerablePieces: new Map(this.invulnerablePieces),
            traps: new Map(this.traps),
            cardsPlayedThisBattle: this.cardsPlayedThisBattle
        };
        this.boardHistory.push(state);

        // Keep only last 5 states to prevent memory issues
        if (this.boardHistory.length > 5) {
            this.boardHistory.shift();
        }
    }

    restoreBoardState() {
        if (this.boardHistory.length < 2) {
            this.showCardInstructions('No previous state to restore!');
            setTimeout(() => this.clearCardInstructions(), 1500);
            return false;
        }

        // Pop current state, then pop previous state to restore
        this.boardHistory.pop();
        const state = this.boardHistory.pop();

        // Restore board
        this.board = state.board.map(row => row.map(cell => cell ? { ...cell } : null));

        // Restore pieces with proper references
        this.playerPieces = [];
        this.enemyPieces = [];
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.owner === 'player') {
                        this.playerPieces.push(piece);
                    } else {
                        this.enemyPieces.push(piece);
                    }
                }
            }
        }

        // Restore status effects
        this.frozenPieces = new Map(state.frozenPieces);
        this.traitorPieces = new Map(state.traitorPieces);
        this.invulnerablePieces = new Map(state.invulnerablePieces);
        this.traps = new Map(state.traps);
        this.cardsPlayedThisBattle = state.cardsPlayedThisBattle;

        // Save the restored state as current
        this.saveBoardState();

        return true;
    }

    // ============================================
    // RENDERING
    // ============================================

    render() {
        this.renderBoard();
        this.renderCards();
        this.renderInfo();
        this.renderEnemyIntent();
    }

    renderBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';

        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;

                // Add tile label
                const label = document.createElement('span');
                label.className = 'cell-label';
                label.textContent = this.toChessNotation(row, col);
                cell.appendChild(label);

                const piece = this.board[row][col];
                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.className = `piece ${piece.owner}`;
                    pieceEl.textContent = PIECE_SYMBOLS[piece.type][piece.owner];

                    // Status effect indicators
                    if (this.frozenPieces.has(piece.id)) {
                        pieceEl.classList.add('frozen');
                    }
                    if (this.traitorPieces.has(piece.id)) {
                        pieceEl.classList.add('traitor');
                    }
                    if (this.invulnerablePieces.has(piece.id)) {
                        pieceEl.classList.add('diamond-form');
                        cell.classList.add('diamond-highlight');
                    }
                    if (this.knightJumpActive && piece.owner === 'player') {
                        pieceEl.classList.add('knight-jump-active');
                    }
                    if (this.snipeActive && piece.owner === 'player' &&
                        (piece.type === PIECES.ROOK || piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
                        pieceEl.classList.add('snipe-active');
                    }

                    cell.appendChild(pieceEl);
                }

                // Render traps (Caltrops)
                const trapKey = `${row},${col}`;
                if (this.traps.has(trapKey)) {
                    const trapEl = document.createElement('span');
                    trapEl.className = 'trap';
                    trapEl.textContent = '✕';
                    cell.appendChild(trapEl);
                    cell.classList.add('has-trap');
                }

                // Selected piece highlight
                if (this.selectedPiece && 
                    this.selectedPiece.row === row && 
                    this.selectedPiece.col === col) {
                    cell.classList.add('selected');
                }

                // Valid moves highlight
                const validMove = this.validMoves.find(m => m.row === row && m.col === col);
                if (validMove) {
                    if (this.board[row][col] && this.board[row][col].owner === 'enemy') {
                        if (validMove.piercing) {
                            cell.classList.add('piercing-capture');
                        } else {
                            cell.classList.add('valid-capture');
                        }
                    } else {
                        cell.classList.add('valid-move');
                    }
                }

                // Enemy intent highlight
                if (this.enemyIntent && this.enemyIntent.to.row === row && this.enemyIntent.to.col === col) {
                    cell.classList.add('enemy-intent');
                }

                boardEl.appendChild(cell);
            }
        }
    }

    renderCards() {
        const handEl = document.getElementById('card-hand');
        handEl.innerHTML = '';

        this.hand.forEach(cardId => {
            const card = CARDS[cardId];
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.card = cardId;
            
            if (this.selectedCard === cardId) {
                cardEl.classList.add('selected');
            }
            
            if (this.cardsPlayedThisBattle >= this.maxCardsPerBattle || !this.isPlayerTurn) {
                cardEl.classList.add('disabled');
            }

            cardEl.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div class="card-effect">${card.effect}</div>
                <div class="card-rarity ${card.rarity}">${card.rarity}</div>
            `;

            handEl.appendChild(cardEl);
        });
    }

    renderInfo() {
        document.getElementById('player-piece-count').textContent = `${this.playerPieces.length} pieces`;
        document.getElementById('enemy-piece-count').textContent = `${this.enemyPieces.length} pieces`;
        document.getElementById('battle-number').textContent = `${this.playerPieces.length} vs ${this.enemyPieces.length}`;

        const turnIndicator = document.getElementById('turn-indicator');
        if (this.knightJumpActive) {
            turnIndicator.textContent = 'Knight Jump Active!';
        } else if (this.snipeActive) {
            turnIndicator.textContent = 'Snipe Active!';
        } else {
            turnIndicator.textContent = this.isPlayerTurn ? 'Your Turn' : 'Enemy Turn';
        }
        turnIndicator.classList.toggle('enemy-turn', !this.isPlayerTurn);
    }

    renderEnemyIntent() {
        const intentText = document.getElementById('intent-text');
        if (this.enemyIntent) {
            const piece = this.enemyIntent.piece;
            const from = this.toChessNotation(this.enemyIntent.from.row, this.enemyIntent.from.col);
            const to = this.toChessNotation(this.enemyIntent.to.row, this.enemyIntent.to.col);
            const isCapture = this.board[this.enemyIntent.to.row][this.enemyIntent.to.col] !== null;
            intentText.textContent = `${piece.type} ${from} ${isCapture ? 'captures' : 'to'} ${to}`;
        } else {
            intentText.textContent = '-';
        }
    }

    toChessNotation(row, col) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        return files[col] + ranks[row];
    }

    showCardInstructions(text) {
        document.getElementById('card-instructions').textContent = text;
    }

    clearCardInstructions() {
        document.getElementById('card-instructions').textContent = '';
    }

    // ============================================
    // EVENT HANDLING
    // ============================================

    bindEvents() {
        // Board clicks
        document.getElementById('board').addEventListener('click', (e) => {
            if (this.gameOver) return;
            
            const cell = e.target.closest('.cell');
            if (!cell) return;

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            this.handleCellClick(row, col);
        });

        // Card clicks
        document.getElementById('card-hand').addEventListener('click', (e) => {
            if (this.gameOver || !this.isPlayerTurn) return;
            
            const card = e.target.closest('.card');
            if (!card || card.classList.contains('disabled')) return;

            const cardId = card.dataset.card;
            this.handleCardClick(cardId);
        });

        // Restart button
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        // Change squad button
        document.getElementById('change-squad-btn').addEventListener('click', () => {
            this.returnToLoadout();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').classList.add('active');
        });

        // Close help
        document.getElementById('close-help').addEventListener('click', () => {
            document.getElementById('help-overlay').classList.remove('active');
        });

        // Start game button (in help overlay)
        document.getElementById('start-game-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').classList.remove('active');
        });

        // Close help when clicking outside
        document.getElementById('help-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('help-overlay')) {
                document.getElementById('help-overlay').classList.remove('active');
            }
        });

        // Show help on first visit
        if (!localStorage.getItem('chessRoguelikePlayed')) {
            document.getElementById('help-overlay').classList.add('active');
            localStorage.setItem('chessRoguelikePlayed', 'true');
        }
    }

    handleCellClick(row, col) {
        // If we're in a card action state that needs target selection, handle that
        // (instant cards allow normal piece movement)
        if (this.cardState && this.cardState.type !== 'instant') {
            this.handleCardAction(row, col);
            return;
        }

        if (!this.isPlayerTurn) return;

        const piece = this.board[row][col];

        // Clicking on a valid move -> execute move
        const validMove = this.validMoves.find(m => m.row === row && m.col === col);
        if (this.selectedPiece && validMove) {
            // If an instant card was active, consume it now
            if (this.cardState && this.cardState.type === 'instant') {
                this.cardsPlayedThisBattle++;
                this.selectedCard = null;
                this.cardState = null;
                this.clearCardInstructions();
            }
            this.movePiece(this.selectedPiece, row, col, validMove.piercing || false);
            this.selectedPiece = null;
            this.validMoves = [];
            this.endPlayerTurn();
            return;
        }

        // Clicking on own piece -> select it
        if (piece && piece.owner === 'player') {
            this.selectedPiece = piece;
            this.validMoves = this.getValidMoves(piece);
            this.render();
            return;
        }

        // Clicking elsewhere -> deselect
        this.selectedPiece = null;
        this.validMoves = [];
        this.render();
    }

    handleCardClick(cardId) {
        if (this.cardsPlayedThisBattle >= this.maxCardsPerBattle) return;

        const card = CARDS[cardId];
        
        // If clicking same card, deselect
        if (this.selectedCard === cardId) {
            // Deactivate instant card effects if they were previewing
            this.knightJumpActive = false;
            this.snipeActive = false;
            this.selectedCard = null;
            this.cardState = null;
            this.clearCardInstructions();
            this.render();
            return;
        }

        // Deactivate any previously active instant card effects
        this.knightJumpActive = false;
        this.snipeActive = false;

        this.selectedCard = cardId;

        // Clear any piece selection when using a card
        this.selectedPiece = null;
        this.validMoves = [];

        switch (card.action) {
            case 'instant':
                // Don't execute immediately - let player preview and cancel if needed
                this.cardState = { type: 'instant', card: cardId };
                this.activateInstantCard(cardId);
                break;
            case 'selectEnemy':
                this.cardState = { type: 'selectEnemy', card: cardId };
                if (cardId === 'shieldBash') {
                    this.showCardInstructions('Select an adjacent enemy piece to push back.');
                }
                break;
            case 'selectPlayerPiece':
                this.cardState = { type: 'selectPlayerPiece', card: cardId };
                if (cardId === 'divineShield') {
                    this.showCardInstructions('Select a piece to enter Diamond Form (Invulnerable + Immobile).');
                }
                break;
            case 'selectEmpty':
                this.cardState = { type: 'selectEmpty', card: cardId };
                if (cardId === 'caltrops') {
                    this.showCardInstructions('Select an empty square to place a lethal trap.');
                }
                break;
        }

        this.render();
    }

    handleCardAction(row, col) {
        const piece = this.board[row][col];

        switch (this.cardState.type) {
            case 'selectEnemy': // Shield Bash - select adjacent enemy piece
                if (piece && piece.owner === 'enemy') {
                    if (this.cardState.card === 'shieldBash') {
                        this.executeShieldBash(piece);
                    }
                }
                break;

            case 'selectPlayerPiece': // Divine Shield - select your piece
                if (piece && piece.owner === 'player') {
                    if (this.cardState.card === 'divineShield') {
                        this.executeDivineShield(piece);
                    }
                }
                break;

            case 'selectEmpty': // Caltrops - select empty square
                if (!piece) {
                    if (this.cardState.card === 'caltrops') {
                        this.executeCaltrops(row, col);
                    }
                }
                break;
        }

        this.render();
    }

    // ============================================
    // CARD EXECUTION
    // ============================================

    // Activate instant card effect for preview (doesn't consume the card yet)
    activateInstantCard(cardId) {
        switch (cardId) {
            case 'knightJump':
                this.knightJumpActive = true;
                this.showCardInstructions("Knight's Jump active! Make a move or click card again to cancel.");
                break;
            case 'snipe':
                this.snipeActive = true;
                this.showCardInstructions("Snipe active! Make a move or click card again to cancel.");
                break;
        }
    }

    // Caltrops: Place a lethal trap on an empty square
    executeCaltrops(row, col) {
        const key = `${row},${col}`;
        this.traps.set(key, true);
        this.showCardInstructions(`Caltrops placed at ${this.toChessNotation(row, col)}!`);
        setTimeout(() => this.clearCardInstructions(), 1500);

        // Recalculate enemy intent (AI should avoid traps)
        this.calculateEnemyIntent();

        this.finishCardPlay();
    }

    // Shield Bash: Push an adjacent enemy 1 tile back. Captures if they hit a wall.
    executeShieldBash(enemyPiece) {
        // Find if any player piece is adjacent to this enemy
        let pusherPiece = null;
        for (const playerPiece of this.playerPieces) {
            const rowDist = Math.abs(playerPiece.row - enemyPiece.row);
            const colDist = Math.abs(playerPiece.col - enemyPiece.col);
            // Adjacent means distance <= 1 in both directions (including diagonals)
            if (rowDist <= 1 && colDist <= 1 && (rowDist > 0 || colDist > 0)) {
                pusherPiece = playerPiece;
                break;
            }
        }

        if (!pusherPiece) {
            this.showCardInstructions("No adjacent player piece to push from!");
            setTimeout(() => this.clearCardInstructions(), 1500);
            return;
        }

        // Calculate push direction (away from the player piece)
        const pushDirRow = Math.sign(enemyPiece.row - pusherPiece.row);
        const pushDirCol = Math.sign(enemyPiece.col - pusherPiece.col);

        // If no direction (same position), can't push
        if (pushDirRow === 0 && pushDirCol === 0) {
            this.showCardInstructions("Cannot determine push direction!");
            setTimeout(() => this.clearCardInstructions(), 1500);
            return;
        }

        const targetRow = enemyPiece.row + pushDirRow;
        const targetCol = enemyPiece.col + pushDirCol;

        // Check if target is out of bounds or occupied -> instant kill
        const isOutOfBounds = targetRow < 0 || targetRow >= BOARD_ROWS || targetCol < 0 || targetCol > 7;
        const isOccupied = !isOutOfBounds && this.board[targetRow][targetCol] !== null;

        if (isOutOfBounds || isOccupied) {
            // Instant kill - enemy is crushed against wall/piece
            this.showCardInstructions(`${enemyPiece.type} crushed against ${isOutOfBounds ? 'the wall' : 'another piece'}!`);
            this.board[enemyPiece.row][enemyPiece.col] = null;
            this.capturePiece(enemyPiece);
        } else {
            // Move enemy to target tile
            this.board[enemyPiece.row][enemyPiece.col] = null;
            enemyPiece.row = targetRow;
            enemyPiece.col = targetCol;
            this.board[targetRow][targetCol] = enemyPiece;

            // Check if enemy lands on a trap (Caltrops)
            const trapKey = `${targetRow},${targetCol}`;
            if (this.traps.has(trapKey)) {
                this.traps.delete(trapKey);
                this.showCardInstructions(`${enemyPiece.type} pushed into caltrops and destroyed!`);
                this.board[targetRow][targetCol] = null;
                this.capturePiece(enemyPiece);
            } else {
                this.showCardInstructions(`${enemyPiece.type} pushed to ${this.toChessNotation(targetRow, targetCol)}!`);
            }
        }

        setTimeout(() => this.clearCardInstructions(), 1500);

        // Recalculate enemy intent
        this.calculateEnemyIntent();

        // Check game end in case we captured the king
        this.checkGameEnd();

        this.finishCardPlay();
    }

    // Diamond Form: Piece becomes invulnerable but cannot move for 1 round
    executeDivineShield(piece) {
        this.invulnerablePieces.set(piece.id, 2); // 2 = lasts through enemy turn + next player turn
        this.showCardInstructions(`${piece.type} enters Diamond Form - Invulnerable but immobile!`);
        setTimeout(() => this.clearCardInstructions(), 1500);

        // Recalculate enemy intent since they can't capture this piece
        this.calculateEnemyIntent();

        this.finishCardPlay();
    }

    finishCardPlay() {
        this.cardsPlayedThisBattle++;
        this.selectedCard = null;
        this.cardState = null;

        // Playing a card ENDS your turn - no free move + card combo
        this.endPlayerTurn();
    }

    // ============================================
    // MOVEMENT LOGIC
    // ============================================

    getValidMoves(piece, forAI = false) {
        // Traitor pieces cannot move
        if (this.traitorPieces.has(piece.id)) {
            return [];
        }

        // Diamond Form (invulnerable) pieces cannot move - they are in stasis
        if (this.invulnerablePieces.has(piece.id)) {
            return [];
        }

        const moves = [];

        // Normal moves based on piece type
        switch (piece.type) {
            case PIECES.KING:
                this.addKingMoves(piece, moves, forAI);
                break;
            case PIECES.QUEEN:
                this.addQueenMoves(piece, moves, forAI);
                break;
            case PIECES.ROOK:
                this.addRookMoves(piece, moves, forAI);
                break;
            case PIECES.BISHOP:
                this.addBishopMoves(piece, moves, forAI);
                break;
            case PIECES.KNIGHT:
                this.addKnightMoves(piece, moves, forAI);
                break;
            case PIECES.PAWN:
                this.addPawnMoves(piece, moves, forAI);
                break;
        }

        // Knight's Jump: All player pieces can also move like knights
        if (this.knightJumpActive && piece.owner === 'player' && piece.type !== PIECES.KNIGHT) {
            this.addKnightMoves(piece, moves, forAI);
        }

        // Snipe: Ranged pieces get piercing captures
        if (this.snipeActive && piece.owner === 'player' &&
            (piece.type === PIECES.ROOK || piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN)) {
            this.addPiercingMoves(piece, moves, forAI);
        }

        return moves;
    }

    addKingMoves(piece, moves, forAI = false) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1],  [1, 0], [1, 1]
        ];
        for (const [dr, dc] of directions) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves, forAI);
        }
    }

    addQueenMoves(piece, moves, forAI = false) {
        this.addRookMoves(piece, moves, forAI);
        this.addBishopMoves(piece, moves, forAI);
    }

    addRookMoves(piece, moves, forAI = false) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr * i, piece.col + dc * i, moves, forAI)) {
                    break;
                }
                // Stop if we hit a piece (can capture but not go through)
                if (this.board[piece.row + dr * i]?.[piece.col + dc * i]) break;
            }
        }
    }

    addBishopMoves(piece, moves, forAI = false) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr * i, piece.col + dc * i, moves, forAI)) {
                    break;
                }
                if (this.board[piece.row + dr * i]?.[piece.col + dc * i]) break;
            }
        }
    }

    addKnightMoves(piece, moves, forAI = false) {
        const jumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of jumps) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves, forAI);
        }
    }

    addPawnMoves(piece, moves, forAI = false) {
        const direction = piece.owner === 'player' ? -1 : 1;
        const startRow = piece.owner === 'player' ? 6 : 1;

        // Forward move
        const newRow = piece.row + direction;
        if (newRow >= 0 && newRow < BOARD_ROWS && !this.board[newRow][piece.col]) {
            // AI avoids traps
            const trapKey = `${newRow},${piece.col}`;
            if (!forAI || !this.traps.has(trapKey)) {
                moves.push({ row: newRow, col: piece.col });
            }

            // Double move from start
            const doubleRow = piece.row + direction * 2;
            if (piece.row === startRow && doubleRow >= 0 && doubleRow < BOARD_ROWS && !this.board[doubleRow][piece.col]) {
                const doubleTrapKey = `${doubleRow},${piece.col}`;
                if (!forAI || !this.traps.has(doubleTrapKey)) {
                    moves.push({ row: doubleRow, col: piece.col });
                }
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const captureCol = piece.col + dc;
            if (captureCol >= 0 && captureCol < 8 && newRow >= 0 && newRow < BOARD_ROWS) {
                const target = this.board[newRow][captureCol];
                if (target && target.owner !== piece.owner) {
                    // Check if target is invulnerable (for AI)
                    if (forAI && this.invulnerablePieces.has(target.id)) {
                        continue; // AI can't capture invulnerable pieces
                    }
                    // AI avoids traps
                    const captureTrapKey = `${newRow},${captureCol}`;
                    if (forAI && this.traps.has(captureTrapKey)) {
                        continue;
                    }
                    moves.push({ row: newRow, col: captureCol });
                }
            }
        }
    }

    // Piercing moves for Snipe card - can capture through one obstacle
    addPiercingMoves(piece, moves, forAI = false) {
        const directions = piece.type === PIECES.ROOK ?
            [[-1, 0], [1, 0], [0, -1], [0, 1]] :
            piece.type === PIECES.BISHOP ?
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
            [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]; // Queen

        for (const [dr, dc] of directions) {
            let obstacleCount = 0;
            for (let i = 1; i < 8; i++) {
                const row = piece.row + dr * i;
                const col = piece.col + dc * i;

                if (row < 0 || row >= BOARD_ROWS || col < 0 || col > 7) break;

                const target = this.board[row][col];
                if (target) {
                    obstacleCount++;
                    if (obstacleCount === 1) {
                        // First obstacle - continue to look for capture behind it
                        continue;
                    } else if (obstacleCount === 2 && target.owner !== piece.owner) {
                        // Second piece behind first obstacle - can capture with piercing
                        // King's armor is too thick - cannot be targeted by piercing shots
                        if (target.type === PIECES.KING) {
                            break;
                        }
                        if (!this.invulnerablePieces.has(target.id)) {
                            // Check if this move isn't already in moves
                            if (!moves.some(m => m.row === row && m.col === col)) {
                                moves.push({ row, col, piercing: true });
                            }
                        }
                        break;
                    } else {
                        break; // Too many obstacles or same owner
                    }
                }
            }
        }
    }

    addMoveIfValid(piece, row, col, moves, forAI = false) {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col > 7) return false;

        // AI avoids traps
        if (forAI) {
            const trapKey = `${row},${col}`;
            if (this.traps.has(trapKey)) {
                return false;
            }
        }

        const target = this.board[row][col];

        if (!target) {
            moves.push({ row, col });
            return true;
        }

        if (target.owner !== piece.owner) {
            // Check if target is invulnerable (AI respects this, player might not need to)
            if (forAI && this.invulnerablePieces.has(target.id)) {
                return false; // AI can't capture invulnerable pieces, and line is blocked
            }
            // Can't capture invulnerable pieces
            if (this.invulnerablePieces.has(target.id)) {
                return false;
            }
            moves.push({ row, col });
            return true;
        }

        return false; // Own piece blocking
    }

    movePiece(piece, toRow, toCol, isPiercing = false) {
        // For piercing captures, remove the piece in between too
        if (isPiercing) {
            // Find and remove the obstacle piece
            const dr = Math.sign(toRow - piece.row);
            const dc = Math.sign(toCol - piece.col);
            for (let i = 1; i < 8; i++) {
                const midRow = piece.row + dr * i;
                const midCol = piece.col + dc * i;
                if (midRow === toRow && midCol === toCol) break;
                const midPiece = this.board[midRow][midCol];
                if (midPiece) {
                    // This is the obstacle - leave it alone for piercing
                    break;
                }
            }
        }

        // Check for trap BEFORE moving
        const trapKey = `${toRow},${toCol}`;
        const steppedOnTrap = this.traps.has(trapKey);

        if (steppedOnTrap) {
            // Remove the trap
            this.traps.delete(trapKey);
            // Remove the moving piece from its current position
            this.board[piece.row][piece.col] = null;
            // Destroy the piece (it stepped on a trap)
            this.capturePiece(piece);
            if (piece.owner === 'player') {
                this.piecesLost++;
            } else {
                this.piecesCaptures++;
            }
            // Check win/lose conditions
            this.checkGameEnd();
            return; // Don't continue with normal move
        }

        const capturedPiece = this.board[toRow][toCol];

        // Handle capture
        if (capturedPiece) {
            this.capturePiece(capturedPiece);
            if (piece.owner === 'player') {
                this.piecesCaptures++;
            } else {
                this.piecesLost++;
            }
        }

        // Move piece
        this.board[piece.row][piece.col] = null;
        piece.row = toRow;
        piece.col = toCol;
        this.board[toRow][toCol] = piece;

        // Track moves
        if (piece.owner === 'player') {
            this.moveCount++;
        }

        // Pawn promotion (auto to queen)
        if (piece.type === PIECES.PAWN) {
            const promotionRow = piece.owner === 'player' ? 0 : BOARD_ROWS - 1;
            if (toRow === promotionRow) {
                piece.type = PIECES.QUEEN;
            }
        }

        // Check win/lose conditions
        this.checkGameEnd();
    }

    capturePiece(piece) {
        if (piece.owner === 'player') {
            this.playerPieces = this.playerPieces.filter(p => p !== piece);
            this.invulnerablePieces.delete(piece.id);
        } else {
            this.enemyPieces = this.enemyPieces.filter(p => p !== piece);
            this.frozenPieces.delete(piece.id);
            this.traitorPieces.delete(piece.id);
        }
    }

    // ============================================
    // TURN MANAGEMENT
    // ============================================

    endPlayerTurn() {
        this.isPlayerTurn = false;

        // Reset turn-based card effects
        this.knightJumpActive = false;
        this.snipeActive = false;

        this.render();

        if (this.gameOver) return;

        // Delay for enemy turn
        setTimeout(() => {
            this.doEnemyTurn();
        }, 800);
    }

    async doEnemyTurn() {
        if (this.skipEnemyTurn) {
            this.skipEnemyTurn = false;
            this.showCardInstructions('Enemy turn skipped!');
            setTimeout(() => {
                this.clearCardInstructions();
                this.startPlayerTurn();
            }, 1000);
            return;
        }

        // DYNAMIC INTENT: Discard old intent and fully re-evaluate the board
        // The AI "rethinks" based on the player's actual move, not the projected one
        this.enemyIntent = null;

        // Show "thinking" indicator - Stockfish is analyzing
        const intentText = document.getElementById('intent-text');
        if (intentText) {
            intentText.textContent = 'Analyzing...';
        }

        // Use Stockfish hybrid move system with safety filter
        // Falls back to minimax if Stockfish fails
        const bestMove = await this.getBestHybridMove();

        if (bestMove) {
            this.enemyIntent = bestMove; // Update intent for display
            this.movePiece(bestMove.piece, bestMove.to.row, bestMove.to.col);
            this.enemyMoveCount++;
        }

        // Decrement status effect counters
        this.updateStatusEffects();

        if (!this.gameOver) {
            this.startPlayerTurn();
        }
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.saveBoardState(); // Save state for Time Warp
        this.calculateEnemyIntent();
        this.render();
    }

    updateStatusEffects() {
        // Update freeze counters
        for (const [pieceId, turns] of this.frozenPieces) {
            if (turns <= 1) {
                this.frozenPieces.delete(pieceId);
            } else {
                this.frozenPieces.set(pieceId, turns - 1);
            }
        }

        // Update traitor counters
        for (const [pieceId, turns] of this.traitorPieces) {
            if (turns <= 1) {
                this.traitorPieces.delete(pieceId);
            } else {
                this.traitorPieces.set(pieceId, turns - 1);
            }
        }

        // Update invulnerable counters
        for (const [pieceId, turns] of this.invulnerablePieces) {
            if (turns <= 1) {
                this.invulnerablePieces.delete(pieceId);
            } else {
                this.invulnerablePieces.set(pieceId, turns - 1);
            }
        }
    }

    // ============================================
    // ENEMY AI - MINIMAX WITH ALPHA-BETA
    // ============================================

    calculateEnemyIntent() {
        const move = this.findBestEnemyMove();
        this.enemyIntent = move;
    }

    findBestEnemyMove(excludePiece = null) {
        let bestMove = null;
        let bestScore = -Infinity;

        // Get all possible moves for enemy
        const allMoves = [];
        for (const piece of this.enemyPieces) {
            if (excludePiece && piece === excludePiece) continue;
            if (this.frozenPieces.has(piece.id)) continue;
            if (this.traitorPieces.has(piece.id)) continue;

            const moves = this.getValidMoves(piece, true);
            for (const move of moves) {
                allMoves.push({ piece, move });
            }
        }

        // Use minimax to evaluate each move
        for (const { piece, move } of allMoves) {
            // Simulate the move
            const capturedPiece = this.board[move.row][move.col];
            const fromRow = piece.row;
            const fromCol = piece.col;

            // Make the move
            this.board[fromRow][fromCol] = null;
            this.board[move.row][move.col] = piece;
            piece.row = move.row;
            piece.col = move.col;
            if (capturedPiece) {
                if (capturedPiece.owner === 'player') {
                    this.playerPieces = this.playerPieces.filter(p => p !== capturedPiece);
                }
            }

            // Evaluate with minimax (depth 3, player's turn next)
            const score = this.minimax(2, false, -Infinity, Infinity);

            // Undo the move
            piece.row = fromRow;
            piece.col = fromCol;
            this.board[fromRow][fromCol] = piece;
            this.board[move.row][move.col] = capturedPiece;
            if (capturedPiece && capturedPiece.owner === 'player') {
                this.playerPieces.push(capturedPiece);
            }

            // Add small randomness to prevent predictable play
            const finalScore = score + Math.random() * 5;

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMove = { piece, from: { row: fromRow, col: fromCol }, to: move };
            }
        }

        return bestMove;
    }

    // Minimax with alpha-beta pruning
    minimax(depth, isMaximizing, alpha, beta) {
        // Check for terminal states
        const playerKing = this.playerPieces.find(p => p.type === PIECES.KING);
        const enemyKing = this.enemyPieces.find(p => p.type === PIECES.KING);

        if (!playerKing) return 100000; // Enemy wins
        if (!enemyKing) return -100000; // Player wins

        // Depth limit reached - use quiescence search to avoid horizon effect
        if (depth === 0) {
            return this.quiescence(-Infinity, Infinity, isMaximizing);
        }

        if (isMaximizing) {
            // Enemy's turn (maximizing)
            let maxScore = -Infinity;

            for (const piece of this.enemyPieces) {
                if (this.frozenPieces.has(piece.id)) continue;
                if (this.traitorPieces.has(piece.id)) continue;

                const moves = this.getValidMoves(piece, true);
                for (const move of moves) {
                    // Simulate move
                    const capturedPiece = this.board[move.row][move.col];
                    const fromRow = piece.row;
                    const fromCol = piece.col;

                    this.board[fromRow][fromCol] = null;
                    this.board[move.row][move.col] = piece;
                    piece.row = move.row;
                    piece.col = move.col;
                    if (capturedPiece && capturedPiece.owner === 'player') {
                        this.playerPieces = this.playerPieces.filter(p => p !== capturedPiece);
                    }

                    const score = this.minimax(depth - 1, false, alpha, beta);

                    // Undo move
                    piece.row = fromRow;
                    piece.col = fromCol;
                    this.board[fromRow][fromCol] = piece;
                    this.board[move.row][move.col] = capturedPiece;
                    if (capturedPiece && capturedPiece.owner === 'player') {
                        this.playerPieces.push(capturedPiece);
                    }

                    maxScore = Math.max(maxScore, score);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break; // Pruning
                }
                if (beta <= alpha) break;
            }

            return maxScore;
        } else {
            // Player's turn (minimizing from enemy perspective)
            let minScore = Infinity;

            for (const piece of this.playerPieces) {
                const moves = this.getValidMoves(piece, false);
                for (const move of moves) {
                    // Simulate move
                    const capturedPiece = this.board[move.row][move.col];
                    const fromRow = piece.row;
                    const fromCol = piece.col;

                    this.board[fromRow][fromCol] = null;
                    this.board[move.row][move.col] = piece;
                    piece.row = move.row;
                    piece.col = move.col;
                    if (capturedPiece && capturedPiece.owner === 'enemy') {
                        this.enemyPieces = this.enemyPieces.filter(p => p !== capturedPiece);
                    }

                    const score = this.minimax(depth - 1, true, alpha, beta);

                    // Undo move
                    piece.row = fromRow;
                    piece.col = fromCol;
                    this.board[fromRow][fromCol] = piece;
                    this.board[move.row][move.col] = capturedPiece;
                    if (capturedPiece && capturedPiece.owner === 'enemy') {
                        this.enemyPieces.push(capturedPiece);
                    }

                    minScore = Math.min(minScore, score);
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break; // Pruning
                }
                if (beta <= alpha) break;
            }

            return minScore;
        }
    }

    // Evaluate board position (positive = good for enemy)
    evaluateBoard() {
        let score = 0;

        // Trade logic multipliers - enemy values player pieces higher (1.2x)
        // to encourage trading when the player has fewer pieces
        const ENEMY_VALUE_MULT = 1.0;
        const PLAYER_VALUE_MULT = 1.2;

        // Material evaluation
        for (const piece of this.enemyPieces) {
            score += PIECE_VALUES[piece.type] * ENEMY_VALUE_MULT;

            // Position bonus for knights
            if (piece.type === PIECES.KNIGHT && POSITION_BONUS.knight) {
                score += POSITION_BONUS.knight[piece.row][piece.col];
            }
            // Position bonus for pawns (advancing is good)
            if (piece.type === PIECES.PAWN && POSITION_BONUS.pawn) {
                score += POSITION_BONUS.pawn[piece.row][piece.col];
            }
        }

        for (const piece of this.playerPieces) {
            // Player pieces valued 1.2x - encourages AI to trade
            score -= PIECE_VALUES[piece.type] * PLAYER_VALUE_MULT;

            // Player position bonuses (mirrored)
            if (piece.type === PIECES.KNIGHT && POSITION_BONUS.knight) {
                const mirroredRow = BOARD_ROWS - 1 - piece.row;
                if (mirroredRow >= 0 && mirroredRow < 8) {
                    score -= POSITION_BONUS.knight[mirroredRow][piece.col];
                }
            }
            if (piece.type === PIECES.PAWN && POSITION_BONUS.pawn) {
                const mirroredRow = BOARD_ROWS - 1 - piece.row;
                if (mirroredRow >= 0 && mirroredRow < 8) {
                    score -= POSITION_BONUS.pawn[mirroredRow][piece.col];
                }
            }
        }

        // Mobility bonus - more moves = better position
        let enemyMobility = 0;
        let playerMobility = 0;

        for (const piece of this.enemyPieces) {
            if (!this.frozenPieces.has(piece.id) && !this.traitorPieces.has(piece.id)) {
                enemyMobility += this.getValidMoves(piece, true).length;
            }
        }

        for (const piece of this.playerPieces) {
            playerMobility += this.getValidMoves(piece, false).length;
        }

        score += (enemyMobility - playerMobility) * 5;

        // King pressure - check if player king is under attack (in "check")
        const playerKing = this.playerPieces.find(p => p.type === PIECES.KING);
        if (playerKing) {
            // Massive bonus if the player king can be captured (in check)
            const kingInCheck = this.isSquareAttackedByEnemy(playerKing.row, playerKing.col);
            if (kingInCheck) {
                score += 500; // Huge bonus for putting king in check
            }

            // Proximity bonus - reward enemy pieces close to player king
            for (const enemyPiece of this.enemyPieces) {
                const dist = Math.abs(playerKing.row - enemyPiece.row) + Math.abs(playerKing.col - enemyPiece.col);
                if (dist <= 2) {
                    score += 40; // Bonus for threatening the king
                } else if (dist <= 4) {
                    score += 15; // Smaller bonus for being nearby
                }
            }
        }

        return score;
    }

    // Check if a square is attacked by any enemy piece
    isSquareAttackedByEnemy(row, col) {
        for (const enemyPiece of this.enemyPieces) {
            if (this.frozenPieces.has(enemyPiece.id)) continue;
            if (this.traitorPieces.has(enemyPiece.id)) continue;

            const moves = this.getValidMoves(enemyPiece, true);
            if (moves.some(m => m.row === row && m.col === col)) {
                return true;
            }
        }
        return false;
    }

    // Quiescence search - extends search on capture moves to avoid horizon effect
    // Max depth of 4 captures to prevent excessive computation
    quiescence(alpha, beta, isMaximizing, depth = 4) {
        // Stand pat score - what we get if we do nothing
        const standPat = this.evaluateBoard();

        // Check for terminal states
        const playerKing = this.playerPieces.find(p => p.type === PIECES.KING);
        const enemyKing = this.enemyPieces.find(p => p.type === PIECES.KING);
        if (!playerKing) return 100000;
        if (!enemyKing) return -100000;

        // Depth limit - return stand pat if we've searched deep enough
        if (depth === 0) return standPat;

        if (isMaximizing) {
            // Enemy's turn (maximizing)
            // Stand pat acts as a floor - don't force bad captures
            if (standPat >= beta) return beta;
            if (standPat > alpha) alpha = standPat;

            // Only look at capture moves
            for (const piece of this.enemyPieces) {
                if (this.frozenPieces.has(piece.id)) continue;
                if (this.traitorPieces.has(piece.id)) continue;

                const moves = this.getValidMoves(piece, true);
                for (const move of moves) {
                    const capturedPiece = this.board[move.row][move.col];
                    // Only consider captures
                    if (!capturedPiece || capturedPiece.owner !== 'player') continue;

                    // Delta pruning - skip if capture can't improve alpha
                    const captureValue = PIECE_VALUES[capturedPiece.type];
                    if (standPat + captureValue + 200 < alpha) continue;

                    const fromRow = piece.row;
                    const fromCol = piece.col;

                    // Make the move
                    this.board[fromRow][fromCol] = null;
                    this.board[move.row][move.col] = piece;
                    piece.row = move.row;
                    piece.col = move.col;
                    this.playerPieces = this.playerPieces.filter(p => p !== capturedPiece);

                    const score = this.quiescence(alpha, beta, false, depth - 1);

                    // Undo move
                    piece.row = fromRow;
                    piece.col = fromCol;
                    this.board[fromRow][fromCol] = piece;
                    this.board[move.row][move.col] = capturedPiece;
                    this.playerPieces.push(capturedPiece);

                    if (score >= beta) return beta;
                    if (score > alpha) alpha = score;
                }
            }
            return alpha;
        } else {
            // Player's turn (minimizing)
            // Stand pat acts as a ceiling - don't force bad captures
            if (standPat <= alpha) return alpha;
            if (standPat < beta) beta = standPat;

            // Only look at capture moves
            for (const piece of this.playerPieces) {
                const moves = this.getValidMoves(piece, false);
                for (const move of moves) {
                    const capturedPiece = this.board[move.row][move.col];
                    // Only consider captures
                    if (!capturedPiece || capturedPiece.owner !== 'enemy') continue;

                    // Delta pruning - skip if capture can't improve beta
                    const captureValue = PIECE_VALUES[capturedPiece.type];
                    if (standPat - captureValue - 200 > beta) continue;

                    const fromRow = piece.row;
                    const fromCol = piece.col;

                    // Make the move
                    this.board[fromRow][fromCol] = null;
                    this.board[move.row][move.col] = piece;
                    piece.row = move.row;
                    piece.col = move.col;
                    this.enemyPieces = this.enemyPieces.filter(p => p !== capturedPiece);

                    const score = this.quiescence(alpha, beta, true, depth - 1);

                    // Undo move
                    piece.row = fromRow;
                    piece.col = fromCol;
                    this.board[fromRow][fromCol] = piece;
                    this.board[move.row][move.col] = capturedPiece;
                    this.enemyPieces.push(capturedPiece);

                    if (score <= alpha) return alpha;
                    if (score < beta) beta = score;
                }
            }
            return beta;
        }
    }

    findClosestPlayerPiece(row, col) {
        let closest = null;
        let minDist = Infinity;

        for (const piece of this.playerPieces) {
            const dist = Math.abs(row - piece.row) + Math.abs(col - piece.col);
            if (dist < minDist) {
                minDist = dist;
                closest = piece;
            }
        }

        return closest;
    }

    // ============================================
    // WIN/LOSE CONDITIONS
    // ============================================

    checkGameEnd() {
        // Check if player king is captured
        const playerKing = this.playerPieces.find(p => p.type === PIECES.KING);
        if (!playerKing) {
            this.endGame(false);
            return;
        }

        // Check if enemy king is captured (or all enemies defeated)
        const enemyKing = this.enemyPieces.find(p => p.type === PIECES.KING);
        if (!enemyKing || this.enemyPieces.length === 0) {
            this.endGame(true);
            return;
        }
    }

    endGame(victory) {
        this.gameOver = true;

        const overlay = document.getElementById('game-over-overlay');
        const text = document.getElementById('game-over-text');
        const subtext = document.getElementById('game-over-subtext');
        const content = overlay.querySelector('.overlay-content');

        if (victory) {
            text.textContent = 'GRANDMASTER SLAYER!';
            subtext.innerHTML = this.getVictoryAnalysis();
            content.classList.add('victory');
            content.classList.remove('defeat');
        } else {
            text.textContent = this.getDefeatTitle();
            subtext.innerHTML = this.getDefeatAnalysis();
            content.classList.add('defeat');
            content.classList.remove('victory');
        }

        overlay.classList.add('active');
    }

    getVictoryAnalysis() {
        const remainingPieces = this.playerPieces.length;
        const enemiesKilled = 16 - this.enemyPieces.length;
        const cardsUsed = this.cardsPlayedThisBattle;

        let analysis = `You defeated the enemy army!<br><br>`;
        analysis += `<span class="analysis-text">`;
        analysis += `Pieces remaining: ${remainingPieces}/4<br>`;
        analysis += `Enemies defeated: ${enemiesKilled}/16<br>`;
        analysis += `Cards used: ${cardsUsed}/3<br><br>`;

        if (remainingPieces === 4 && cardsUsed === 0) {
            analysis += `PERFECT! No casualties, no cards needed!`;
        } else if (remainingPieces === 4) {
            analysis += `Flawless Victory! All pieces survived.`;
        } else if (cardsUsed === 0) {
            analysis += `Pure Skill! Won without using any cards.`;
        } else if (enemiesKilled >= 14) {
            analysis += `Domination! Almost a clean sweep.`;
        } else {
            analysis += `Hard-fought victory against overwhelming odds.`;
        }
        analysis += `</span>`;

        return analysis;
    }

    getDefeatTitle() {
        const remainingEnemies = this.enemyPieces.length;

        if (remainingEnemies >= 14) {
            return 'BLUNDER!';
        } else if (remainingEnemies >= 10) {
            return 'OVERWHELMED';
        } else if (remainingEnemies >= 6) {
            return 'DEFEAT';
        } else {
            return 'SO CLOSE...';
        }
    }

    getDefeatAnalysis() {
        const remainingEnemies = this.enemyPieces.length;
        const enemiesKilled = 16 - remainingEnemies;
        const cardsUsed = this.cardsPlayedThisBattle;

        let analysis = `Your King has fallen...<br><br>`;
        analysis += `<span class="analysis-text">`;
        analysis += `Enemies defeated: ${enemiesKilled}/16<br>`;
        analysis += `Cards used: ${cardsUsed}/3<br><br>`;

        if (remainingEnemies >= 14) {
            analysis += `Tip: Focus on using your cards strategically!`;
        } else if (remainingEnemies >= 10) {
            analysis += `Tip: Try using Diamond Form to block enemy attacks.`;
        } else if (remainingEnemies >= 6) {
            analysis += `Tip: Time Warp can undo critical mistakes.`;
        } else {
            analysis += `So close! You almost had them. Try again!`;
        }
        analysis += `</span>`;

        return analysis;
    }

    restart() {
        document.getElementById('game-over-overlay').classList.remove('active');

        // Reset game state
        this.createBoard();
        this.playerPieces = [];
        this.enemyPieces = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.selectedCard = null;
        this.cardState = null;
        this.cardsPlayedThisBattle = 0;
        this.frozenPieces.clear();
        this.traitorPieces.clear();
        this.invulnerablePieces.clear();
        this.traps.clear();
        this.knightJumpActive = false;
        this.snipeActive = false;
        this.boardHistory = [];
        this.skipEnemyTurn = false;
        this.enemyIntent = null;
        this.moveCount = 0;
        this.enemyMoveCount = 0;
        this.piecesLost = 0;
        this.piecesCaptures = 0;

        this.setupBattle();
        this.saveBoardState();
        this.render();
    }

    // Return to loadout screen for new loadout selection
    returnToLoadout() {
        document.getElementById('game-over-overlay').classList.remove('active');
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('loadout-screen').style.display = 'flex';
        this.gameStarted = false;
    }
}

// ============================================
// START GAME
// ============================================

const game = new ChessRoguelike();
