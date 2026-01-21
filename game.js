// Chess Roguelike - Prototype

// ============================================
// CONSTANTS & CONFIG
// ============================================

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
    stall: {
        name: 'Stall',
        effect: 'Enemy skips their next turn.',
        rarity: 'common',
        action: 'instant'
    },
    teleport: {
        name: 'Teleport',
        effect: 'Move any of your pieces to any empty square.',
        rarity: 'uncommon',
        action: 'selectPiece'
    },
    freeze: {
        name: 'Freeze',
        effect: 'Enemy piece cannot move for 2 turns.',
        rarity: 'uncommon',
        action: 'selectEnemy'
    },
    swap: {
        name: 'Swap',
        effect: 'Exchange positions of any two pieces.',
        rarity: 'uncommon',
        action: 'selectTwo'
    },
    promote: {
        name: 'Promote',
        effect: 'Your Pawn instantly becomes a Queen.',
        rarity: 'rare',
        action: 'selectPawn'
    }
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
        
        // Card system
        this.hand = ['stall', 'teleport', 'freeze', 'swap', 'promote'];
        this.selectedCard = null;
        this.cardState = null; // For multi-step card actions
        this.cardsPlayedThisBattle = 0;
        this.maxCardsPerBattle = 3;
        
        // Status effects
        this.frozenPieces = new Map(); // piece -> turns remaining
        
        // Enemy AI
        this.enemyIntent = null; // { piece, from, to }
        this.skipEnemyTurn = false;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.setupBattle();
        this.render();
        this.bindEvents();
    }

    // ============================================
    // BOARD SETUP
    // ============================================

    createBoard() {
        this.board = [];
        for (let row = 0; row < 8; row++) {
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
        
        // Player: King + 4 Pawns (bottom)
        this.placePiece(7, 4, PIECES.KING, 'player');    // King at e1
        this.placePiece(6, 2, PIECES.PAWN, 'player');    // Pawns
        this.placePiece(6, 3, PIECES.PAWN, 'player');
        this.placePiece(6, 4, PIECES.PAWN, 'player');
        this.placePiece(6, 5, PIECES.PAWN, 'player');
        
        // Enemy: King + Queen + 2 Rooks + 4 Pawns (top)
        this.placePiece(0, 4, PIECES.KING, 'enemy');     // King at e8
        this.placePiece(0, 3, PIECES.QUEEN, 'enemy');    // Queen at d8
        this.placePiece(0, 0, PIECES.ROOK, 'enemy');     // Rooks
        this.placePiece(0, 7, PIECES.ROOK, 'enemy');
        this.placePiece(1, 2, PIECES.PAWN, 'enemy');     // Pawns
        this.placePiece(1, 3, PIECES.PAWN, 'enemy');
        this.placePiece(1, 4, PIECES.PAWN, 'enemy');
        this.placePiece(1, 5, PIECES.PAWN, 'enemy');
        
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

        for (let row = 0; row < 8; row++) {
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
                    
                    // Frozen indicator
                    if (this.frozenPieces.has(piece.id)) {
                        pieceEl.classList.add('frozen');
                    }
                    
                    cell.appendChild(pieceEl);
                }

                // Selected piece highlight
                if (this.selectedPiece && 
                    this.selectedPiece.row === row && 
                    this.selectedPiece.col === col) {
                    cell.classList.add('selected');
                }

                // Valid moves highlight
                const isValidMove = this.validMoves.some(m => m.row === row && m.col === col);
                if (isValidMove) {
                    if (this.board[row][col] && this.board[row][col].owner === 'enemy') {
                        cell.classList.add('valid-capture');
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
        
        const turnIndicator = document.getElementById('turn-indicator');
        turnIndicator.textContent = this.isPlayerTurn ? 'Your Turn' : 'Enemy Turn';
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
        // If we're in a card action state, handle that
        if (this.cardState) {
            this.handleCardAction(row, col);
            return;
        }

        if (!this.isPlayerTurn) return;

        const piece = this.board[row][col];

        // Clicking on a valid move -> execute move
        if (this.selectedPiece && this.validMoves.some(m => m.row === row && m.col === col)) {
            this.movePiece(this.selectedPiece, row, col);
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
            this.selectedCard = null;
            this.cardState = null;
            this.clearCardInstructions();
            this.render();
            return;
        }

        this.selectedCard = cardId;
        
        // Clear any piece selection when using a card
        this.selectedPiece = null;
        this.validMoves = [];

        switch (card.action) {
            case 'instant':
                this.executeCard(cardId);
                break;
            case 'selectPiece':
                this.cardState = { type: 'selectPiece', card: cardId };
                this.showCardInstructions('Select one of your pieces to teleport.');
                break;
            case 'selectEnemy':
                this.cardState = { type: 'selectEnemy', card: cardId };
                this.showCardInstructions('Select an enemy piece to freeze.');
                break;
            case 'selectTwo':
                this.cardState = { type: 'selectFirst', card: cardId, first: null };
                this.showCardInstructions('Select the first piece to swap.');
                break;
            case 'selectPawn':
                this.cardState = { type: 'selectPawn', card: cardId };
                this.showCardInstructions('Select one of your Pawns to promote.');
                break;
        }

        this.render();
    }

    handleCardAction(row, col) {
        const piece = this.board[row][col];

        switch (this.cardState.type) {
            case 'selectPiece': // Teleport - select your piece
                if (piece && piece.owner === 'player') {
                    this.cardState = { 
                        type: 'selectDestination', 
                        card: this.cardState.card, 
                        piece: piece 
                    };
                    this.showCardInstructions('Select an empty square to teleport to.');
                }
                break;

            case 'selectDestination': // Teleport - select empty square
                if (!piece) {
                    this.executeTeleport(this.cardState.piece, row, col);
                }
                break;

            case 'selectEnemy': // Freeze - select enemy piece
                if (piece && piece.owner === 'enemy') {
                    this.executeFreeze(piece);
                }
                break;

            case 'selectFirst': // Swap - select first piece
                if (piece) {
                    this.cardState = { 
                        type: 'selectSecond', 
                        card: this.cardState.card, 
                        first: piece 
                    };
                    this.showCardInstructions('Select the second piece to swap with.');
                }
                break;

            case 'selectSecond': // Swap - select second piece
                if (piece && piece !== this.cardState.first) {
                    this.executeSwap(this.cardState.first, piece);
                }
                break;

            case 'selectPawn': // Promote - select your pawn
                if (piece && piece.owner === 'player' && piece.type === PIECES.PAWN) {
                    this.executePromote(piece);
                }
                break;
        }

        this.render();
    }

    // ============================================
    // CARD EXECUTION
    // ============================================

    executeCard(cardId) {
        switch (cardId) {
            case 'stall':
                this.skipEnemyTurn = true;
                this.showCardInstructions('Enemy turn will be skipped!');
                setTimeout(() => this.clearCardInstructions(), 1500);
                break;
        }

        this.finishCardPlay();
    }

    executeTeleport(piece, toRow, toCol) {
        // Remove from old position
        this.board[piece.row][piece.col] = null;
        
        // Place at new position
        piece.row = toRow;
        piece.col = toCol;
        this.board[toRow][toCol] = piece;

        this.finishCardPlay();
    }

    executeFreeze(piece) {
        this.frozenPieces.set(piece.id, 2); // Frozen for 2 turns
        this.showCardInstructions(`${piece.type} frozen for 2 turns!`);
        setTimeout(() => this.clearCardInstructions(), 1500);
        
        // Recalculate enemy intent since frozen piece can't move
        this.calculateEnemyIntent();
        
        this.finishCardPlay();
    }

    executeSwap(piece1, piece2) {
        const row1 = piece1.row, col1 = piece1.col;
        const row2 = piece2.row, col2 = piece2.col;

        // Swap positions
        this.board[row1][col1] = piece2;
        this.board[row2][col2] = piece1;
        
        piece1.row = row2;
        piece1.col = col2;
        piece2.row = row1;
        piece2.col = col1;

        // Recalculate enemy intent
        this.calculateEnemyIntent();

        this.finishCardPlay();
    }

    executePromote(pawn) {
        // Change pawn to queen permanently
        pawn.type = PIECES.QUEEN;
        
        // Make sure no piece is selected after promotion
        this.selectedPiece = null;
        this.validMoves = [];
        
        this.showCardInstructions('Pawn promoted to Queen!');
        setTimeout(() => this.clearCardInstructions(), 1500);

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

    getValidMoves(piece) {
        const moves = [];
        
        switch (piece.type) {
            case PIECES.KING:
                this.addKingMoves(piece, moves);
                break;
            case PIECES.QUEEN:
                this.addQueenMoves(piece, moves);
                break;
            case PIECES.ROOK:
                this.addRookMoves(piece, moves);
                break;
            case PIECES.BISHOP:
                this.addBishopMoves(piece, moves);
                break;
            case PIECES.KNIGHT:
                this.addKnightMoves(piece, moves);
                break;
            case PIECES.PAWN:
                this.addPawnMoves(piece, moves);
                break;
        }

        return moves;
    }

    addKingMoves(piece, moves) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1],  [1, 0], [1, 1]
        ];
        for (const [dr, dc] of directions) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves);
        }
    }

    addQueenMoves(piece, moves) {
        this.addRookMoves(piece, moves);
        this.addBishopMoves(piece, moves);
    }

    addRookMoves(piece, moves) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr * i, piece.col + dc * i, moves)) {
                    break;
                }
                // Stop if we hit a piece (can capture but not go through)
                if (this.board[piece.row + dr * i]?.[piece.col + dc * i]) break;
            }
        }
    }

    addBishopMoves(piece, moves) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr * i, piece.col + dc * i, moves)) {
                    break;
                }
                if (this.board[piece.row + dr * i]?.[piece.col + dc * i]) break;
            }
        }
    }

    addKnightMoves(piece, moves) {
        const jumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of jumps) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves);
        }
    }

    addPawnMoves(piece, moves) {
        const direction = piece.owner === 'player' ? -1 : 1;
        const startRow = piece.owner === 'player' ? 6 : 1;

        // Forward move
        const newRow = piece.row + direction;
        if (newRow >= 0 && newRow < 8 && !this.board[newRow][piece.col]) {
            moves.push({ row: newRow, col: piece.col });
            
            // Double move from start
            if (piece.row === startRow && !this.board[piece.row + direction * 2][piece.col]) {
                moves.push({ row: piece.row + direction * 2, col: piece.col });
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const captureCol = piece.col + dc;
            if (captureCol >= 0 && captureCol < 8 && newRow >= 0 && newRow < 8) {
                const target = this.board[newRow][captureCol];
                if (target && target.owner !== piece.owner) {
                    moves.push({ row: newRow, col: captureCol });
                }
            }
        }
    }

    addMoveIfValid(piece, row, col, moves) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return false;
        
        const target = this.board[row][col];
        
        if (!target) {
            moves.push({ row, col });
            return true;
        }
        
        if (target.owner !== piece.owner) {
            moves.push({ row, col });
            return true;
        }
        
        return false; // Own piece blocking
    }

    movePiece(piece, toRow, toCol) {
        const capturedPiece = this.board[toRow][toCol];
        
        console.log('Moving:', piece.type, piece.owner, 'from', piece.row, piece.col, 'to', toRow, toCol);
        console.log('Captured piece:', capturedPiece ? `${capturedPiece.type} ${capturedPiece.owner}` : 'none');
        
        // Handle capture
        if (capturedPiece) {
            this.capturePiece(capturedPiece);
        }

        // Move piece
        this.board[piece.row][piece.col] = null;
        piece.row = toRow;
        piece.col = toCol;
        this.board[toRow][toCol] = piece;
        
        console.log('After move - playerPieces:', this.playerPieces.length, 'enemyPieces:', this.enemyPieces.length);

        // Pawn promotion (auto to queen for now)
        if (piece.type === PIECES.PAWN) {
            const promotionRow = piece.owner === 'player' ? 0 : 7;
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
        } else {
            this.enemyPieces = this.enemyPieces.filter(p => p !== piece);
            this.frozenPieces.delete(piece.id);
        }
    }

    // ============================================
    // TURN MANAGEMENT
    // ============================================

    endPlayerTurn() {
        this.isPlayerTurn = false;
        this.render();

        if (this.gameOver) return;

        // Delay for enemy turn
        setTimeout(() => {
            this.doEnemyTurn();
        }, 800);
    }

    doEnemyTurn() {
        if (this.skipEnemyTurn) {
            this.skipEnemyTurn = false;
            this.showCardInstructions('Enemy turn skipped!');
            setTimeout(() => {
                this.clearCardInstructions();
                this.startPlayerTurn();
            }, 1000);
            return;
        }

        // Recalculate enemy move based on CURRENT board state
        // (the old intent may no longer be valid after player's move)
        this.calculateEnemyIntent();

        // Execute the intended move
        if (this.enemyIntent) {
            const { piece, to } = this.enemyIntent;
            
            // Verify the piece still exists and move is valid
            const pieceStillExists = this.enemyPieces.includes(piece);
            const validMoves = pieceStillExists ? this.getValidMoves(piece) : [];
            const moveStillValid = validMoves.some(m => m.row === to.row && m.col === to.col);
            
            if (!pieceStillExists || this.frozenPieces.has(piece.id) || !moveStillValid) {
                // Pick a different move
                const altMove = this.findBestEnemyMove(piece);
                if (altMove) {
                    this.movePiece(altMove.piece, altMove.to.row, altMove.to.col);
                }
            } else {
                this.movePiece(piece, to.row, to.col);
            }
        }

        // Decrement freeze counters
        this.updateFreezeCounters();

        if (!this.gameOver) {
            this.startPlayerTurn();
        }
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.calculateEnemyIntent();
        this.render();
    }

    updateFreezeCounters() {
        for (const [pieceId, turns] of this.frozenPieces) {
            if (turns <= 1) {
                this.frozenPieces.delete(pieceId);
            } else {
                this.frozenPieces.set(pieceId, turns - 1);
            }
        }
    }

    // ============================================
    // ENEMY AI
    // ============================================

    calculateEnemyIntent() {
        const move = this.findBestEnemyMove();
        this.enemyIntent = move;
    }

    findBestEnemyMove(excludePiece = null) {
        let bestMove = null;
        let bestScore = -Infinity;

        for (const piece of this.enemyPieces) {
            if (excludePiece && piece === excludePiece) continue;
            if (this.frozenPieces.has(piece.id)) continue;

            const moves = this.getValidMoves(piece);
            
            for (const move of moves) {
                const score = this.scoreMove(piece, move);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { piece, from: { row: piece.row, col: piece.col }, to: move };
                }
            }
        }

        return bestMove;
    }

    scoreMove(piece, move) {
        let score = 0;
        const target = this.board[move.row][move.col];

        // Capturing player pieces is high priority
        if (target && target.owner === 'player') {
            const pieceValues = {
                [PIECES.KING]: 1000,   // Capturing king = win
                [PIECES.QUEEN]: 90,
                [PIECES.ROOK]: 50,
                [PIECES.BISHOP]: 30,
                [PIECES.KNIGHT]: 30,
                [PIECES.PAWN]: 10
            };
            score += pieceValues[target.type];
        }

        // Moving toward player pieces
        const closestPlayerPiece = this.findClosestPlayerPiece(move.row, move.col);
        if (closestPlayerPiece) {
            const currentDist = Math.abs(piece.row - closestPlayerPiece.row) + Math.abs(piece.col - closestPlayerPiece.col);
            const newDist = Math.abs(move.row - closestPlayerPiece.row) + Math.abs(move.col - closestPlayerPiece.col);
            score += (currentDist - newDist) * 2; // Reward getting closer
        }

        // Small bonus for central control
        const centerDist = Math.abs(move.row - 3.5) + Math.abs(move.col - 3.5);
        score += (7 - centerDist) * 0.5;

        // Add some randomness to prevent predictable play
        score += Math.random() * 3;

        return score;
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
            text.textContent = 'Victory!';
            subtext.textContent = 'You defeated the enemy army!';
            content.classList.add('victory');
            content.classList.remove('defeat');
        } else {
            text.textContent = 'Defeat';
            subtext.textContent = 'Your King has fallen...';
            content.classList.add('defeat');
            content.classList.remove('victory');
        }

        overlay.classList.add('active');
    }

    restart() {
        document.getElementById('game-over-overlay').classList.remove('active');
        
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
        this.skipEnemyTurn = false;
        this.enemyIntent = null;
        
        this.setupBattle();
        this.render();
    }
}

// ============================================
// START GAME
// ============================================

const game = new ChessRoguelike();
