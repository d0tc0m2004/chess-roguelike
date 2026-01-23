// Chess Roguelike - Full Roguelike Game Loop
// Features: 10-battle runs, deck building, formations, card rewards

// ============================================
// CONSTANTS & CONFIG
// ============================================

const BOARD_ROWS = 8;
const TOTAL_BATTLES = 10;
const HAND_SIZE = 5;
const MAX_CARDS_PER_BATTLE = 3;

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

const PIECE_VALUES = {
    king: 10000,
    queen: 900,
    rook: 500,
    bishop: 330,
    knight: 320,
    pawn: 100
};

// ============================================
// GAME CLASS
// ============================================

class ChessRoguelike {
    constructor() {
        // Board state
        this.board = [];
        this.playerPieces = [];
        this.enemyPieces = [];
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.gameOver = false;

        // Loadout
        this.playerLoadout = ['queen', 'rook', 'knight'];

        // Run state
        this.currentBattle = 1;
        this.totalBattles = TOTAL_BATTLES;
        this.runActive = false;

        // Deck & Hand
        this.deck = [];
        this.hand = [];
        this.selectedCard = null;
        this.cardState = null;
        this.cardsPlayedThisBattle = 0;
        this.selectedBattleCards = []; // Cards selected for upcoming battle
        this.maxBattleCards = HAND_SIZE; // Max cards player can select

        // Current formation
        this.currentFormation = null;

        // Status effects
        this.frozenPieces = new Map();
        this.traitorPieces = new Map();
        this.invulnerablePieces = new Map();
        this.shieldedPieces = new Map();
        this.bracedPieces = new Map();
        this.phantomPieces = new Map();
        this.controlledEnemies = new Map();
        this.traps = new Map();
        this.decoys = new Set();
        this.traitorMarked = new Set();

        // Turn modifiers
        this.knightJumpActive = false;
        this.snipeActive = false;
        this.rallyActive = false;
        this.chainReactionActive = false;
        this.loadedDiceActive = false;
        this.checkmateDeniedActive = false;
        this.zugzwangActive = false;
        this.bluffActive = false;
        this.parallelPlayActive = false;
        this.showAllEnemyMoves = false;

        // Card state
        this.dashPiece = null;
        this.ghostWalkPiece = null;
        this.ricochetPiece = null;
        this.extraMoves = null;
        this.kingQueenMoves = 0;
        this.extendedIntentTurns = 0;
        this.pocketedPiece = null;
        this.lastPlayerMove = null;
        this.movesThisTurn = 0;

        // Tracking
        this.capturedPlayerPieces = [];
        this.capturedEnemyPieces = [];
        this.boardHistory = [];

        // AI
        this.enemyIntent = null;
        this.skipEnemyTurn = false;
        this.aiDifficulty = 'EASY';
        this.aiArchetype = 'PASSIVE';

        // Stats
        this.runStats = {
            battlesWon: 0,
            totalEnemiesKilled: 0,
            totalCardsPlayed: 0,
            piecesLost: 0
        };

        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.bindLoadoutEvents();
        this.updateLoadoutDisplay();
        this.renderStarterDeckPreview();
    }

    bindLoadoutEvents() {
        // Piece selection
        ['slot1', 'slot2', 'slot3'].forEach((slot, i) => {
            const select = document.getElementById(`${slot}-select`);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.playerLoadout[i] = e.target.value;
                    this.updateLoadoutDisplay();
                });
            }
        });

        // Start run button
        const startRunBtn = document.getElementById('start-run-btn');
        if (startRunBtn) {
            startRunBtn.addEventListener('click', () => this.startNewRun());
        }

        // Start battle button - now shows card selection
        const startBattleBtn = document.getElementById('start-battle-btn');
        if (startBattleBtn) {
            startBattleBtn.addEventListener('click', () => this.showCardSelectScreen());
        }

        // Confirm cards button
        const confirmCardsBtn = document.getElementById('confirm-cards-btn');
        if (confirmCardsBtn) {
            confirmCardsBtn.addEventListener('click', () => this.confirmCardSelection());
        }

        // Help buttons
        document.getElementById('help-btn')?.addEventListener('click', () => {
            document.getElementById('help-overlay').classList.add('active');
        });
        document.getElementById('close-help')?.addEventListener('click', () => {
            document.getElementById('help-overlay').classList.remove('active');
        });
        document.getElementById('start-game-btn')?.addEventListener('click', () => {
            document.getElementById('help-overlay').classList.remove('active');
        });

        // Deck view
        document.getElementById('deck-btn')?.addEventListener('click', () => this.showDeckView());
        document.getElementById('close-deck')?.addEventListener('click', () => this.hideDeckView());

        // Game over buttons
        document.getElementById('restart-btn')?.addEventListener('click', () => this.retryBattle());
        document.getElementById('new-run-btn')?.addEventListener('click', () => this.returnToLoadout());
        document.getElementById('new-run-from-complete-btn')?.addEventListener('click', () => this.returnToLoadout());

        // Card reward
        document.getElementById('skip-reward-btn')?.addEventListener('click', () => this.skipCardReward());

        // Help overlay close on outside click
        document.getElementById('help-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'help-overlay') {
                document.getElementById('help-overlay').classList.remove('active');
            }
        });

        // Deck overlay close on outside click
        document.getElementById('deck-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'deck-overlay') {
                this.hideDeckView();
            }
        });
    }

    updateLoadoutDisplay() {
        const symbols = { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' };
        this.playerLoadout.forEach((piece, i) => {
            const el = document.getElementById(`slot${i + 1}-piece`);
            if (el) el.textContent = symbols[piece];
        });
    }

    renderStarterDeckPreview() {
        const container = document.getElementById('starter-cards-preview');
        if (!container || typeof STARTER_DECK === 'undefined') return;

        container.innerHTML = '';
        STARTER_DECK.forEach(cardId => {
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = 'mini-card';
            cardEl.innerHTML = `<span class="mini-card-name">${card.name}</span>`;
            container.appendChild(cardEl);
        });
    }

    // ============================================
    // RUN MANAGEMENT
    // ============================================

    startNewRun() {
        // Initialize run state
        this.currentBattle = 1;
        this.runActive = true;
        this.deck = [...STARTER_DECK];
        this.runStats = {
            battlesWon: 0,
            totalEnemiesKilled: 0,
            totalCardsPlayed: 0,
            piecesLost: 0
        };

        // Hide loadout, show pre-battle
        document.getElementById('loadout-screen').style.display = 'none';
        this.showPreBattleScreen();
    }

    showPreBattleScreen() {
        // Get formation for this battle
        const battleInfo = this.getBattleInfo(this.currentBattle);
        this.currentFormation = battleInfo.formation;
        this.aiDifficulty = battleInfo.difficulty;
        this.aiArchetype = this.currentFormation.archetype;

        // Update pre-battle UI
        document.getElementById('pre-battle-num').textContent = this.currentBattle;
        document.getElementById('formation-name').textContent = this.currentFormation.name;
        document.getElementById('formation-desc').textContent = this.currentFormation.description;
        document.getElementById('formation-diff').textContent = this.currentFormation.difficulty;
        document.getElementById('formation-arch').textContent = this.aiArchetype;

        // Show formation preview
        this.renderFormationPreview();

        // Show deck preview
        this.renderDeckPreview();

        document.getElementById('pre-battle-screen').style.display = 'flex';
    }

    // ============================================
    // CARD SELECTION SCREEN
    // ============================================

    showCardSelectScreen() {
        document.getElementById('pre-battle-screen').style.display = 'none';
        document.getElementById('card-select-screen').style.display = 'flex';

        // Calculate max cards to select (can't select more than deck has)
        this.maxBattleCards = Math.min(HAND_SIZE, this.deck.length);

        // Update hand size display
        const handSizeEl = document.getElementById('hand-size');
        if (handSizeEl) handSizeEl.textContent = this.maxBattleCards;

        // Reset selection
        this.selectedBattleCards = [];
        this.updateCardSelectUI();
    }

    updateCardSelectUI() {
        const availableContainer = document.getElementById('available-cards');
        const selectedContainer = document.getElementById('selected-cards');
        const countEl = document.getElementById('selected-count');
        const confirmBtn = document.getElementById('confirm-cards-btn');

        if (!availableContainer || !selectedContainer) return;

        // Update count
        if (countEl) countEl.textContent = this.selectedBattleCards.length;

        // Update the "/5" part in the header
        const headerEl = document.querySelector('.selected-cards-area h3');
        if (headerEl) headerEl.textContent = `SELECTED (${this.selectedBattleCards.length}/${this.maxBattleCards})`;

        // Enable/disable confirm button
        if (confirmBtn) {
            confirmBtn.disabled = this.selectedBattleCards.length !== this.maxBattleCards;
        }

        // Render available cards (cards in deck not yet selected)
        availableContainer.innerHTML = '';
        this.deck.forEach(cardId => {
            if (this.selectedBattleCards.includes(cardId)) return;

            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = `select-card ${card.rarity.toLowerCase()}`;
            cardEl.dataset.card = cardId;

            cardEl.innerHTML = `
                <div class="select-card-name">${card.name}</div>
                <div class="select-card-desc">${card.description}</div>
                <div class="select-card-rarity ${card.rarity.toLowerCase()}"></div>
            `;

            cardEl.addEventListener('click', () => this.selectCardForBattle(cardId));
            availableContainer.appendChild(cardEl);
        });

        // Render selected cards
        selectedContainer.innerHTML = '';
        this.selectedBattleCards.forEach(cardId => {
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = `select-card selected ${card.rarity.toLowerCase()}`;
            cardEl.dataset.card = cardId;

            cardEl.innerHTML = `
                <div class="select-card-name">${card.name}</div>
                <div class="select-card-desc">${card.description}</div>
                <div class="select-card-rarity ${card.rarity.toLowerCase()}"></div>
            `;

            cardEl.addEventListener('click', () => this.deselectCardForBattle(cardId));
            selectedContainer.appendChild(cardEl);
        });
    }

    selectCardForBattle(cardId) {
        if (this.selectedBattleCards.length >= this.maxBattleCards) return;
        if (this.selectedBattleCards.includes(cardId)) return;

        this.selectedBattleCards.push(cardId);
        this.updateCardSelectUI();
    }

    deselectCardForBattle(cardId) {
        this.selectedBattleCards = this.selectedBattleCards.filter(id => id !== cardId);
        this.updateCardSelectUI();
    }

    confirmCardSelection() {
        if (this.selectedBattleCards.length !== this.maxBattleCards) return;

        // Set hand to selected cards
        this.hand = [...this.selectedBattleCards];

        // Hide card select, start battle
        document.getElementById('card-select-screen').style.display = 'none';
        this.startBattleWithSelectedCards();
    }

    async startBattleWithSelectedCards() {
        document.getElementById('game-container').style.display = 'flex';

        // Hand is already set from card selection
        // Setup the battle
        this.createBoard();
        this.setupPlayerPieces();
        this.setupEnemyFormation();
        this.resetBattleState();

        this.saveBoardState();
        this.render();
        this.bindBattleEvents();

        // Calculate enemy intent asynchronously (Stockfish)
        await this.calculateEnemyIntent();
    }

    getBattleInfo(battleNum) {
        // Determine formation pool based on battle number
        let pool, difficulty;

        if (battleNum <= 2) {
            pool = 'TUTORIAL';
            difficulty = 'EASY';
        } else if (battleNum <= 4) {
            pool = 'EASY';
            difficulty = 'EASY';
        } else if (battleNum <= 6) {
            pool = 'MEDIUM';
            difficulty = 'MEDIUM';
        } else if (battleNum <= 8) {
            pool = 'HARD';
            difficulty = 'MEDIUM';
        } else {
            pool = 'EXPERT';
            difficulty = 'HARD';
        }

        // Battle 10 is always a boss
        if (battleNum === 10) {
            pool = 'BOSS';
            difficulty = 'HARD';
        }

        // Get random formation from pool
        const formationIds = FORMATION_POOLS[pool] || FORMATION_POOLS.MEDIUM;
        const randomId = formationIds[Math.floor(Math.random() * formationIds.length)];
        const formation = FORMATIONS[randomId];

        return { formation, difficulty };
    }

    renderFormationPreview() {
        const container = document.getElementById('formation-preview');
        if (!container || !this.currentFormation) return;

        // Create mini board preview
        container.innerHTML = '';
        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-board';

        // Only show top 4 rows for preview
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = `mini-cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;

                // Check if there's a piece here
                const piece = this.currentFormation.pieces.find(p => p.row === row && p.col === col);
                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.className = 'mini-piece enemy';
                    pieceEl.textContent = PIECE_SYMBOLS[piece.type].enemy;
                    cell.appendChild(pieceEl);
                }

                miniBoard.appendChild(cell);
            }
        }

        container.appendChild(miniBoard);
    }

    renderDeckPreview() {
        const container = document.getElementById('deck-preview');
        const countEl = document.getElementById('deck-count');
        if (!container) return;

        if (countEl) countEl.textContent = this.deck.length;

        container.innerHTML = '';
        this.deck.forEach(cardId => {
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = `mini-card ${card.rarity.toLowerCase()}`;
            cardEl.innerHTML = `<span class="mini-card-name">${card.name}</span>`;
            container.appendChild(cardEl);
        });
    }

    // ============================================
    // BATTLE MANAGEMENT
    // ============================================

    async startBattle() {
        document.getElementById('pre-battle-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';

        // Draw hand from deck
        this.drawHand();

        // Setup the battle
        this.createBoard();
        this.setupPlayerPieces();
        this.setupEnemyFormation();
        this.resetBattleState();

        this.saveBoardState();
        this.render();
        this.bindBattleEvents();

        // Calculate enemy intent asynchronously (Stockfish)
        await this.calculateEnemyIntent();
    }

    drawHand() {
        // Shuffle deck and draw HAND_SIZE cards
        const shuffled = [...this.deck].sort(() => Math.random() - 0.5);
        this.hand = shuffled.slice(0, Math.min(HAND_SIZE, shuffled.length));
    }

    createBoard() {
        this.board = [];
        for (let row = 0; row < BOARD_ROWS; row++) {
            this.board[row] = [];
            for (let col = 0; col < 8; col++) {
                this.board[row][col] = null;
            }
        }
    }

    setupPlayerPieces() {
        this.playerPieces = [];

        // King at e1
        this.placePiece(7, 4, PIECES.KING, 'player');

        // 3 chosen pieces
        this.placePiece(7, 3, this.playerLoadout[0], 'player');
        this.placePiece(7, 5, this.playerLoadout[1], 'player');
        this.placePiece(6, 4, this.playerLoadout[2], 'player');
    }

    setupEnemyFormation() {
        this.enemyPieces = [];

        if (!this.currentFormation) return;

        for (const pieceData of this.currentFormation.pieces) {
            this.placePiece(pieceData.row, pieceData.col, pieceData.type, 'enemy');
        }

        // Update UI with formation name
        const nameEl = document.getElementById('enemy-formation-name');
        if (nameEl) nameEl.textContent = this.currentFormation.name;
    }

    placePiece(row, col, type, owner) {
        const piece = {
            type,
            owner,
            row,
            col,
            id: `${owner}-${type}-${Date.now()}-${Math.random()}`
        };
        this.board[row][col] = piece;
        if (owner === 'player') {
            this.playerPieces.push(piece);
        } else {
            this.enemyPieces.push(piece);
        }
        return piece;
    }

    resetBattleState() {
        this.selectedPiece = null;
        this.validMoves = [];
        this.isPlayerTurn = true;
        this.gameOver = false;
        this.selectedCard = null;
        this.cardState = null;
        this.cardsPlayedThisBattle = 0;

        // Clear status effects
        this.frozenPieces.clear();
        this.traitorPieces.clear();
        this.invulnerablePieces.clear();
        this.shieldedPieces.clear();
        this.bracedPieces.clear();
        this.phantomPieces.clear();
        this.controlledEnemies.clear();
        this.traps.clear();
        this.decoys.clear();
        this.traitorMarked.clear();

        // Reset modifiers
        this.knightJumpActive = false;
        this.snipeActive = false;
        this.rallyActive = false;
        this.chainReactionActive = false;
        this.loadedDiceActive = false;
        this.checkmateDeniedActive = false;
        this.zugzwangActive = false;
        this.bluffActive = false;
        this.parallelPlayActive = false;
        this.showAllEnemyMoves = false;

        this.dashPiece = null;
        this.ghostWalkPiece = null;
        this.ricochetPiece = null;
        this.extraMoves = null;
        this.kingQueenMoves = 0;
        this.extendedIntentTurns = 0;
        this.pocketedPiece = null;
        this.lastPlayerMove = null;
        this.movesThisTurn = 0;

        this.capturedPlayerPieces = [];
        this.capturedEnemyPieces = [];
        this.boardHistory = [];
        this.skipEnemyTurn = false;
        this.enemyIntent = null;
    }

    bindBattleEvents() {
        const board = document.getElementById('board');
        const cardHand = document.getElementById('card-hand');

        // Remove old listeners by cloning
        const newBoard = board.cloneNode(true);
        board.parentNode.replaceChild(newBoard, board);

        const newCardHand = cardHand.cloneNode(true);
        cardHand.parentNode.replaceChild(newCardHand, cardHand);

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

            this.handleCardClick(card.dataset.card);
        });
    }

    // ============================================
    // VICTORY & REWARDS
    // ============================================

    onBattleVictory() {
        this.gameOver = true;
        this.runStats.battlesWon++;
        this.runStats.totalEnemiesKilled += this.capturedEnemyPieces.length;
        this.runStats.totalCardsPlayed += this.cardsPlayedThisBattle;

        if (this.currentBattle >= this.totalBattles) {
            // Run complete!
            this.showRunComplete();
        } else {
            // Show card reward
            this.showCardReward();
        }
    }

    showCardReward() {
        const container = document.getElementById('reward-cards');
        if (!container) return;

        // Generate 3 reward cards based on battle difficulty
        const rewardPool = this.getRewardPool();
        const rewards = this.getRandomCardsFromPool(rewardPool, 3);

        container.innerHTML = '';
        rewards.forEach(cardId => {
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = `reward-card ${card.rarity.toLowerCase()}`;
            cardEl.dataset.card = cardId;

            cardEl.innerHTML = `
                <div class="reward-card-name">${card.name}</div>
                <div class="reward-card-desc">${card.description}</div>
                <div class="reward-card-rarity ${card.rarity.toLowerCase()}">${card.isBurn ? 'BURN' : ''}</div>
            `;

            cardEl.addEventListener('click', () => this.selectCardReward(cardId));
            container.appendChild(cardEl);
        });

        document.getElementById('reward-overlay').style.display = 'flex';
    }

    getRewardPool() {
        // Better rewards as battles progress
        if (this.currentBattle >= 8) {
            return [...CARD_POOLS.RARE, ...CARD_POOLS.LEGENDARY];
        } else if (this.currentBattle >= 5) {
            return [...CARD_POOLS.UNCOMMON, ...CARD_POOLS.RARE];
        } else if (this.currentBattle >= 3) {
            return [...CARD_POOLS.COMMON, ...CARD_POOLS.UNCOMMON];
        }
        return [...CARD_POOLS.COMMON];
    }

    getRandomCardsFromPool(pool, count) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        // Filter out cards already in deck
        const available = shuffled.filter(id => !this.deck.includes(id));
        return available.slice(0, count);
    }

    selectCardReward(cardId) {
        // Add card to deck
        this.deck.push(cardId);

        const card = CARD_DEFINITIONS[cardId];
        console.log(`Added ${card.name} to deck!`);

        this.hideCardReward();
        this.proceedToNextBattle();
    }

    skipCardReward() {
        this.hideCardReward();
        this.proceedToNextBattle();
    }

    hideCardReward() {
        document.getElementById('reward-overlay').style.display = 'none';
    }

    proceedToNextBattle() {
        this.currentBattle++;
        document.getElementById('game-container').style.display = 'none';
        this.showPreBattleScreen();
    }

    showRunComplete() {
        const statsEl = document.getElementById('run-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-row">Battles Won: ${this.runStats.battlesWon}/${this.totalBattles}</div>
                <div class="stat-row">Enemies Defeated: ${this.runStats.totalEnemiesKilled}</div>
                <div class="stat-row">Cards Played: ${this.runStats.totalCardsPlayed}</div>
                <div class="stat-row">Final Deck Size: ${this.deck.length}</div>
            `;
        }

        document.getElementById('game-container').style.display = 'none';
        document.getElementById('run-complete-overlay').style.display = 'flex';
    }

    // ============================================
    // DEFEAT
    // ============================================

    onBattleDefeat() {
        this.gameOver = true;

        const overlay = document.getElementById('game-over-overlay');
        const text = document.getElementById('game-over-text');
        const subtext = document.getElementById('game-over-subtext');

        text.textContent = this.getDefeatTitle();
        subtext.innerHTML = `
            Battle ${this.currentBattle}/${this.totalBattles}<br>
            Your King has fallen.<br><br>
            Enemies remaining: ${this.enemyPieces.length}
        `;

        overlay.classList.add('active');
    }

    getDefeatTitle() {
        const remaining = this.enemyPieces.length;
        const total = this.currentFormation?.pieces?.length || 16;

        if (remaining >= total * 0.8) return 'CRUSHED';
        if (remaining >= total * 0.5) return 'OVERWHELMED';
        if (remaining >= total * 0.3) return 'DEFEAT';
        return 'SO CLOSE...';
    }

    retryBattle() {
        document.getElementById('game-over-overlay').classList.remove('active');
        document.getElementById('game-container').style.display = 'none';
        this.showCardSelectScreen();
    }

    returnToLoadout() {
        document.getElementById('game-over-overlay').classList.remove('active');
        document.getElementById('run-complete-overlay').style.display = 'none';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('pre-battle-screen').style.display = 'none';
        document.getElementById('loadout-screen').style.display = 'flex';
        this.runActive = false;
    }

    // ============================================
    // DECK VIEW
    // ============================================

    showDeckView() {
        const container = document.getElementById('deck-full-view');
        if (!container) return;

        container.innerHTML = '';

        // Sort by rarity
        const rarityOrder = { COMMON: 0, UNCOMMON: 1, RARE: 2, LEGENDARY: 3 };
        const sorted = [...this.deck].sort((a, b) => {
            const cardA = CARD_DEFINITIONS[a];
            const cardB = CARD_DEFINITIONS[b];
            return (rarityOrder[cardA?.rarity] || 0) - (rarityOrder[cardB?.rarity] || 0);
        });

        sorted.forEach(cardId => {
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = `deck-card ${card.rarity.toLowerCase()}`;
            cardEl.innerHTML = `
                <div class="deck-card-name">${card.name}</div>
                <div class="deck-card-desc">${card.description}</div>
                <div class="deck-card-rarity ${card.rarity.toLowerCase()}"></div>
            `;
            container.appendChild(cardEl);
        });

        document.getElementById('deck-overlay').style.display = 'flex';
    }

    hideDeckView() {
        document.getElementById('deck-overlay').style.display = 'none';
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

                const piece = this.board[row][col];
                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.className = `piece ${piece.owner}`;
                    pieceEl.textContent = PIECE_SYMBOLS[piece.type][piece.owner];

                    // Status indicators
                    if (this.frozenPieces.has(piece.id)) pieceEl.classList.add('frozen');
                    if (this.invulnerablePieces.has(piece.id)) {
                        pieceEl.classList.add('diamond-form');
                        cell.classList.add('diamond-highlight');
                    }
                    if (this.knightJumpActive && piece.owner === 'player') {
                        pieceEl.classList.add('knight-jump-active');
                    }

                    cell.appendChild(pieceEl);
                }

                // Traps
                if (this.traps.has(`${row},${col}`)) {
                    const trapEl = document.createElement('span');
                    trapEl.className = 'trap';
                    trapEl.textContent = '✕';
                    cell.appendChild(trapEl);
                    cell.classList.add('has-trap');
                }

                // Selection
                if (this.selectedPiece?.row === row && this.selectedPiece?.col === col) {
                    cell.classList.add('selected');
                }

                // Valid moves
                const validMove = this.validMoves.find(m => m.row === row && m.col === col);
                if (validMove) {
                    if (this.board[row][col]?.owner === 'enemy') {
                        cell.classList.add(validMove.piercing ? 'piercing-capture' : 'valid-capture');
                    } else {
                        cell.classList.add('valid-move');
                    }
                }

                // Enemy intent
                if (this.enemyIntent?.to.row === row && this.enemyIntent?.to.col === col) {
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
            const card = CARD_DEFINITIONS[cardId];
            if (!card) return;

            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.dataset.card = cardId;

            if (this.selectedCard === cardId) cardEl.classList.add('selected');
            if (this.cardsPlayedThisBattle >= MAX_CARDS_PER_BATTLE || !this.isPlayerTurn) {
                cardEl.classList.add('disabled');
            }

            const rarityClass = card.rarity.toLowerCase();
            cardEl.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div class="card-effect">${card.description}</div>
                <div class="card-rarity ${rarityClass}"></div>
            `;

            handEl.appendChild(cardEl);
        });
    }

    renderInfo() {
        const battleEl = document.getElementById('current-battle');
        if (battleEl) battleEl.textContent = this.currentBattle;

        const playerCount = document.getElementById('player-piece-count');
        if (playerCount) playerCount.textContent = `${this.playerPieces.length} pieces`;

        const enemyCount = document.getElementById('enemy-piece-count');
        if (enemyCount) enemyCount.textContent = `${this.enemyPieces.length} pieces`;

        const cardsPlayed = document.getElementById('cards-played');
        if (cardsPlayed) cardsPlayed.textContent = this.cardsPlayedThisBattle;

        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            turnIndicator.textContent = this.isPlayerTurn ? 'Your Turn' : 'Enemy Turn';
            turnIndicator.classList.toggle('enemy-turn', !this.isPlayerTurn);
        }
    }

    renderEnemyIntent() {
        const intentText = document.getElementById('intent-text');
        if (!intentText) return;

        if (this.enemyIntent) {
            const piece = this.enemyIntent.piece;
            const to = this.toChessNotation(this.enemyIntent.to.row, this.enemyIntent.to.col);
            const isCapture = this.board[this.enemyIntent.to.row]?.[this.enemyIntent.to.col] !== null;
            intentText.textContent = `${piece.type} ${isCapture ? 'captures' : '→'} ${to}`;
        } else {
            intentText.textContent = '-';
        }
    }

    toChessNotation(row, col) {
        return 'abcdefgh'[col] + '87654321'[row];
    }

    showCardInstructions(text) {
        const el = document.getElementById('card-instructions');
        if (el) el.textContent = text;
    }

    clearCardInstructions() {
        const el = document.getElementById('card-instructions');
        if (el) el.textContent = '';
    }

    // ============================================
    // INPUT HANDLING
    // ============================================

    handleCellClick(row, col) {
        if (this.cardState && this.cardState.type !== 'instant') {
            this.handleCardAction(row, col);
            return;
        }

        if (!this.isPlayerTurn) return;

        const piece = this.board[row][col];
        const validMove = this.validMoves.find(m => m.row === row && m.col === col);

        if (this.selectedPiece && validMove) {
            if (this.cardState?.type === 'instant') {
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

        if (piece?.owner === 'player') {
            this.selectedPiece = piece;
            this.validMoves = this.getValidMoves(piece);
            this.render();
            return;
        }

        this.selectedPiece = null;
        this.validMoves = [];
        this.render();
    }

    handleCardClick(cardId) {
        if (this.cardsPlayedThisBattle >= MAX_CARDS_PER_BATTLE) return;

        const card = CARD_DEFINITIONS[cardId];
        if (!card) return;

        if (this.selectedCard === cardId) {
            this.deactivateCardEffects();
            this.selectedCard = null;
            this.cardState = null;
            this.clearCardInstructions();
            this.render();
            return;
        }

        this.deactivateCardEffects();
        this.selectedCard = cardId;
        this.selectedPiece = null;
        this.validMoves = [];

        switch (card.targeting) {
            case 'none':
                this.cardState = { type: 'instant', card: cardId };
                if (card.execute) card.execute(this);
                break;
            case 'own_piece':
                this.cardState = { type: 'selectPlayerPiece', card: cardId, filter: card.pieceFilter };
                this.showCardInstructions(`Select one of your pieces for ${card.name}.`);
                break;
            case 'enemy_piece':
                this.cardState = { type: 'selectEnemy', card: cardId, filter: card.pieceFilter };
                this.showCardInstructions(`Select an enemy piece for ${card.name}.`);
                break;
            case 'any_piece':
                this.cardState = { type: 'selectAny', card: cardId };
                this.showCardInstructions(`Select any piece for ${card.name}.`);
                break;
            case 'empty_square':
                this.cardState = { type: 'selectEmpty', card: cardId };
                this.showCardInstructions(`Select an empty square for ${card.name}.`);
                break;
            case 'two_pieces':
                this.cardState = { type: 'selectTwoPieces', card: cardId, firstPiece: null, requiresAdjacent: card.requiresAdjacent, requiresFriendly: card.requiresFriendly };
                this.showCardInstructions(`Select the first piece for ${card.name}.`);
                break;
            case 'adjacent_enemy':
                this.cardState = { type: 'selectAdjacentEnemy', card: cardId };
                this.showCardInstructions(`Select an adjacent enemy for ${card.name}.`);
                break;
            default:
                this.cardState = { type: 'instant', card: cardId };
                if (card.execute) card.execute(this);
        }

        this.render();
    }

    deactivateCardEffects() {
        this.knightJumpActive = false;
        this.snipeActive = false;
        this.rallyActive = false;
        this.dashPiece = null;
        this.ghostWalkPiece = null;
        this.ricochetPiece = null;
    }

    handleCardAction(row, col) {
        const piece = this.board[row][col];
        const card = CARD_DEFINITIONS[this.cardState?.card];

        switch (this.cardState?.type) {
            case 'selectEnemy':
                if (piece?.owner === 'enemy') {
                    if (this.cardState.filter && !this.cardState.filter(piece)) {
                        this.showCardInstructions('Invalid target.');
                        return;
                    }
                    if (card?.execute) card.execute(this, piece);
                }
                break;
            case 'selectPlayerPiece':
                if (piece?.owner === 'player') {
                    if (this.cardState.filter && !this.cardState.filter(piece)) {
                        this.showCardInstructions('Invalid target.');
                        return;
                    }
                    if (card?.execute) card.execute(this, piece);
                }
                break;
            case 'selectAny':
                if (piece && card?.execute) card.execute(this, piece);
                break;
            case 'selectEmpty':
                if (!piece) {
                    if (card?.execute) {
                        card.execute(this, row, col);
                    } else if (this.cardState.piece) {
                        this.executeEmptySquareAction(row, col);
                    }
                }
                break;
            case 'selectTwoPieces':
                if (piece) {
                    if (!this.cardState.firstPiece) {
                        if (this.cardState.requiresFriendly && piece.owner !== 'player') {
                            this.showCardInstructions('Select your piece first.');
                            return;
                        }
                        this.cardState.firstPiece = piece;
                        this.showCardInstructions('Select the second piece.');
                    } else {
                        if (this.cardState.requiresFriendly && piece.owner !== 'player') {
                            this.showCardInstructions('Select your piece.');
                            return;
                        }
                        if (this.cardState.requiresAdjacent) {
                            const dist = Math.max(Math.abs(piece.row - this.cardState.firstPiece.row), Math.abs(piece.col - this.cardState.firstPiece.col));
                            if (dist > 1) {
                                this.showCardInstructions('Pieces must be adjacent!');
                                return;
                            }
                        }
                        if (card?.execute) card.execute(this, this.cardState.firstPiece, piece);
                    }
                }
                break;
            case 'selectAdjacentEnemy':
                if (piece?.owner === 'enemy') {
                    const isAdj = this.playerPieces.some(p => Math.max(Math.abs(p.row - piece.row), Math.abs(p.col - piece.col)) === 1);
                    if (!isAdj) {
                        this.showCardInstructions('Must be adjacent to your piece!');
                        return;
                    }
                    if (card?.execute) card.execute(this, piece);
                }
                break;
            case 'selectDirection':
                this.executeDirectionAction(row, col);
                break;
        }

        this.render();
    }

    executeEmptySquareAction(row, col) {
        const cardId = this.cardState.card;
        const target = this.cardState.piece;

        switch (cardId) {
            case 'teleport':
                this.board[target.row][target.col] = null;
                target.row = row;
                target.col = col;
                this.board[row][col] = target;
                this.showCardInstructions(`${target.type} teleported!`);
                this.finishCardPlay();
                break;
            case 'clone':
                const dist = Math.max(Math.abs(row - target.row), Math.abs(col - target.col));
                if (dist > 1) {
                    this.showCardInstructions('Must be adjacent!');
                    return;
                }
                const clone = { type: target.type, owner: 'player', row, col, id: `clone-${Date.now()}`, isClone: true };
                this.board[row][col] = clone;
                this.playerPieces.push(clone);
                this.showCardInstructions(`${target.type} cloned!`);
                this.finishCardPlay();
                break;
            case 'kidnap':
                this.board[target.row][target.col] = null;
                target.row = row;
                target.col = col;
                this.board[row][col] = target;
                this.showCardInstructions(`${target.type} kidnapped!`);
                this.finishCardPlay();
                break;
        }
    }

    executeDirectionAction(row, col) {
        const piece = this.cardState.piece;
        const dirs = this.cardState.directions;

        for (const [dr, dc] of dirs) {
            if (piece.row + dr === row && piece.col + dc === col) {
                if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= 8 || this.board[row][col]) {
                    this.showCardInstructions('Cannot move there!');
                    return;
                }
                this.board[piece.row][piece.col] = null;
                piece.row = row;
                piece.col = col;
                this.board[row][col] = piece;
                this.showCardInstructions(`${piece.type} moved!`);
                this.finishCardPlay();
                return;
            }
        }
        this.showCardInstructions('Invalid direction!');
    }

    finishCardPlay(endTurn = true) {
        const cardId = this.selectedCard;
        const card = CARD_DEFINITIONS[cardId];

        this.cardsPlayedThisBattle++;
        this.runStats.totalCardsPlayed++;

        // Handle BURN cards
        if (card?.isBurn) {
            this.hand = this.hand.filter(c => c !== cardId);
            this.deck = this.deck.filter(c => c !== cardId);
        }

        this.selectedCard = null;
        this.cardState = null;

        // Recalculate enemy intent (fire and forget, will update UI when done)
        this.calculateEnemyIntent();

        if (endTurn) {
            this.endPlayerTurn();
        } else {
            this.render();
        }
    }

    // ============================================
    // MOVEMENT
    // ============================================

    getValidMoves(piece, forAI = false) {
        if (this.frozenPieces.has(piece.id) || this.invulnerablePieces.has(piece.id)) {
            return [];
        }

        const moves = [];

        switch (piece.type) {
            case PIECES.KING: this.addKingMoves(piece, moves, forAI); break;
            case PIECES.QUEEN: this.addQueenMoves(piece, moves, forAI); break;
            case PIECES.ROOK: this.addRookMoves(piece, moves, forAI); break;
            case PIECES.BISHOP: this.addBishopMoves(piece, moves, forAI); break;
            case PIECES.KNIGHT: this.addKnightMoves(piece, moves, forAI); break;
            case PIECES.PAWN: this.addPawnMoves(piece, moves, forAI); break;
        }

        if (this.knightJumpActive && piece.owner === 'player' && piece.type !== PIECES.KNIGHT) {
            this.addKnightMoves(piece, moves, forAI);
        }

        if (this.snipeActive && piece.owner === 'player' && ['rook', 'bishop', 'queen'].includes(piece.type)) {
            this.addPiercingMoves(piece, moves);
        }

        return moves;
    }

    addKingMoves(piece, moves, forAI) {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves, forAI);
        }
    }

    addQueenMoves(piece, moves, forAI) {
        this.addRookMoves(piece, moves, forAI);
        this.addBishopMoves(piece, moves, forAI);
    }

    addRookMoves(piece, moves, forAI) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr*i, piece.col + dc*i, moves, forAI)) break;
                if (this.board[piece.row + dr*i]?.[piece.col + dc*i]) break;
            }
        }
    }

    addBishopMoves(piece, moves, forAI) {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            for (let i = 1; i < 8; i++) {
                if (!this.addMoveIfValid(piece, piece.row + dr*i, piece.col + dc*i, moves, forAI)) break;
                if (this.board[piece.row + dr*i]?.[piece.col + dc*i]) break;
            }
        }
    }

    addKnightMoves(piece, moves, forAI) {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            this.addMoveIfValid(piece, piece.row + dr, piece.col + dc, moves, forAI);
        }
    }

    addPawnMoves(piece, moves, forAI) {
        const dir = piece.owner === 'player' ? -1 : 1;
        const startRow = piece.owner === 'player' ? 6 : 1;
        const newRow = piece.row + dir;

        if (newRow >= 0 && newRow < BOARD_ROWS && !this.board[newRow][piece.col]) {
            if (!forAI || !this.traps.has(`${newRow},${piece.col}`)) {
                moves.push({ row: newRow, col: piece.col });
            }
            const doubleRow = piece.row + dir * 2;
            if (piece.row === startRow && !this.board[doubleRow]?.[piece.col]) {
                if (!forAI || !this.traps.has(`${doubleRow},${piece.col}`)) {
                    moves.push({ row: doubleRow, col: piece.col });
                }
            }
        }

        for (const dc of [-1, 1]) {
            const captureCol = piece.col + dc;
            if (captureCol >= 0 && captureCol < 8) {
                const target = this.board[newRow]?.[captureCol];
                if (target && target.owner !== piece.owner) {
                    if (forAI && this.invulnerablePieces.has(target.id)) continue;
                    if (forAI && this.traps.has(`${newRow},${captureCol}`)) continue;
                    moves.push({ row: newRow, col: captureCol });
                }
            }
        }
    }

    addPiercingMoves(piece, moves) {
        const dirs = piece.type === 'rook' ? [[-1,0],[1,0],[0,-1],[0,1]] :
                     piece.type === 'bishop' ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
                     [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

        for (const [dr, dc] of dirs) {
            let obstacles = 0;
            for (let i = 1; i < 8; i++) {
                const row = piece.row + dr*i;
                const col = piece.col + dc*i;
                if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= 8) break;

                const target = this.board[row][col];
                if (target) {
                    obstacles++;
                    if (obstacles === 2 && target.owner !== piece.owner && target.type !== 'king') {
                        if (!this.invulnerablePieces.has(target.id) && !moves.some(m => m.row === row && m.col === col)) {
                            moves.push({ row, col, piercing: true });
                        }
                        break;
                    }
                    if (obstacles >= 2) break;
                }
            }
        }
    }

    addMoveIfValid(piece, row, col, moves, forAI) {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= 8) return false;
        if (forAI && this.traps.has(`${row},${col}`)) return false;

        const target = this.board[row][col];
        if (!target) {
            moves.push({ row, col });
            return true;
        }
        if (target.owner !== piece.owner) {
            if (forAI && this.invulnerablePieces.has(target.id)) return false;
            if (this.invulnerablePieces.has(target.id)) return false;
            moves.push({ row, col });
            return true;
        }
        return false;
    }

    movePiece(piece, toRow, toCol, isPiercing = false) {
        const trapKey = `${toRow},${toCol}`;

        if (this.traps.has(trapKey)) {
            this.traps.delete(trapKey);
            this.board[piece.row][piece.col] = null;
            this.capturePiece(piece);
            this.checkGameEnd();
            return;
        }

        const captured = this.board[toRow][toCol];
        if (captured) this.capturePiece(captured);

        this.board[piece.row][piece.col] = null;
        piece.row = toRow;
        piece.col = toCol;
        this.board[toRow][toCol] = piece;

        // Pawn promotion
        if (piece.type === PIECES.PAWN) {
            const promoRow = piece.owner === 'player' ? 0 : 7;
            if (toRow === promoRow) piece.type = PIECES.QUEEN;
        }

        this.checkGameEnd();
    }

    capturePiece(piece) {
        this.spawnCaptureParticles(piece.row, piece.col, piece.owner);
        this.triggerScreenShake();

        if (piece.owner === 'player') {
            this.playerPieces = this.playerPieces.filter(p => p !== piece);
            this.capturedPlayerPieces.push({ ...piece });
            this.runStats.piecesLost++;
        } else {
            this.enemyPieces = this.enemyPieces.filter(p => p !== piece);
            this.capturedEnemyPieces.push({ ...piece });
        }

        // Clean up status effects
        [this.frozenPieces, this.invulnerablePieces, this.shieldedPieces, this.bracedPieces, this.phantomPieces].forEach(m => m.delete(piece.id));

        if (this.chainReactionActive && piece.owner === 'enemy') {
            this.chainReactionActive = false;
            this.triggerChainReaction(piece.row, piece.col);
        }
    }

    triggerChainReaction(row, col) {
        let damaged = 0;
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < 8) {
                const adj = this.board[r][c];
                if (adj?.owner === 'enemy' && adj.type !== 'king') {
                    this.board[r][c] = null;
                    this.capturePiece(adj);
                    damaged++;
                }
            }
        }
        if (damaged) this.showCardInstructions(`Chain Reaction! ${damaged} enemies destroyed!`);
    }

    // ============================================
    // TURN MANAGEMENT
    // ============================================

    endPlayerTurn() {
        this.isPlayerTurn = false;
        this.knightJumpActive = false;
        this.snipeActive = false;
        this.render();

        if (this.gameOver) return;

        setTimeout(() => this.doEnemyTurn(), 600);
    }

    async doEnemyTurn() {
        if (this.skipEnemyTurn) {
            this.skipEnemyTurn = false;
            this.startPlayerTurn();
            return;
        }

        const gameState = this.getGameState();
        const playerCards = this.hand;

        let bestMove = null;

        // Check if cached intent is still valid
        if (this.enemyIntent && typeof EnemyAI !== 'undefined' && EnemyAI.isMoveStillLegal(this.enemyIntent, gameState)) {
            bestMove = this.enemyIntent;
        } else if (typeof EnemyAI !== 'undefined') {
            // Use async Stockfish-powered AI
            try {
                bestMove = await EnemyAI.calculateBestMoveAsync(gameState, playerCards, this.aiDifficulty, this.aiArchetype);
            } catch (err) {
                console.warn('Async AI failed, using fallback:', err);
                bestMove = EnemyAI.calculateBestMoveFallback(gameState, playerCards, this.aiDifficulty, this.aiArchetype);
            }
        }

        if (bestMove) {
            this.enemyIntent = bestMove;
            this.movePiece(bestMove.piece, bestMove.to.row, bestMove.to.col);
        }

        this.updateStatusEffects();

        if (!this.gameOver) this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.saveBoardState();
        this.render();

        // Calculate enemy intent asynchronously (will update UI when done)
        this.calculateEnemyIntent();
    }

    updateStatusEffects() {
        const decrement = (map) => {
            for (const [id, turns] of map) {
                if (turns <= 1) map.delete(id);
                else map.set(id, turns - 1);
            }
        };

        decrement(this.frozenPieces);
        decrement(this.invulnerablePieces);
        decrement(this.shieldedPieces);
        decrement(this.bracedPieces);

        // Phantom pieces
        for (const [id, turns] of this.phantomPieces) {
            if (turns <= 1) {
                this.phantomPieces.delete(id);
                const phantom = this.playerPieces.find(p => p.id === id);
                if (phantom) {
                    this.board[phantom.row][phantom.col] = null;
                    this.playerPieces = this.playerPieces.filter(p => p.id !== id);
                }
            } else {
                this.phantomPieces.set(id, turns - 1);
            }
        }

        // Controlled enemies
        for (const [id, data] of this.controlledEnemies) {
            if (data.turnsLeft <= 1) {
                this.controlledEnemies.delete(id);
                const piece = this.playerPieces.find(p => p.id === id);
                if (piece) {
                    piece.owner = 'enemy';
                    this.playerPieces = this.playerPieces.filter(p => p.id !== id);
                    this.enemyPieces.push(piece);
                }
            } else {
                data.turnsLeft--;
            }
        }

        if (this.kingQueenMoves > 0) this.kingQueenMoves--;
        if (this.extendedIntentTurns > 0) this.extendedIntentTurns--;

        this.rallyActive = false;
        this.showAllEnemyMoves = false;
        this.loadedDiceActive = false;
        this.zugzwangActive = false;
    }

    // ============================================
    // AI
    // ============================================

    getGameState() {
        return {
            board: this.board,
            playerPieces: this.playerPieces,
            enemyPieces: this.enemyPieces,
            frozenPieces: this.frozenPieces,
            invulnerablePieces: this.invulnerablePieces,
            traps: this.traps
        };
    }

    async calculateEnemyIntent() {
        if (typeof EnemyAI === 'undefined') return;
        const gameState = this.getGameState();

        try {
            // Use async Stockfish-powered intent preview
            this.enemyIntent = await EnemyAI.previewEnemyIntentAsync(gameState, this.hand, this.aiDifficulty, this.aiArchetype);
        } catch (err) {
            console.warn('Async intent failed, using fallback:', err);
            this.enemyIntent = EnemyAI.previewEnemyIntent(gameState, this.hand, this.aiDifficulty, this.aiArchetype);
        }

        // Re-render to show updated intent
        this.renderEnemyIntent();
        this.renderBoard();
    }

    // ============================================
    // WIN/LOSE
    // ============================================

    checkGameEnd() {
        const playerKing = this.playerPieces.find(p => p.type === PIECES.KING);
        if (!playerKing) {
            this.onBattleDefeat();
            return;
        }

        const enemyKing = this.enemyPieces.find(p => p.type === PIECES.KING);
        if (!enemyKing || this.enemyPieces.length === 0) {
            this.onBattleVictory();
            return;
        }
    }

    // ============================================
    // BOARD HISTORY
    // ============================================

    saveBoardState() {
        const state = {
            board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            playerPieces: this.playerPieces.map(p => ({ ...p })),
            enemyPieces: this.enemyPieces.map(p => ({ ...p })),
            frozenPieces: new Map(this.frozenPieces),
            invulnerablePieces: new Map(this.invulnerablePieces),
            traps: new Map(this.traps)
        };
        this.boardHistory.push(state);
        if (this.boardHistory.length > 5) this.boardHistory.shift();
    }

    restoreBoardState() {
        if (this.boardHistory.length < 2) return false;

        this.boardHistory.pop();
        const state = this.boardHistory.pop();

        this.board = state.board.map(row => row.map(cell => cell ? { ...cell } : null));
        this.playerPieces = [];
        this.enemyPieces = [];

        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    (piece.owner === 'player' ? this.playerPieces : this.enemyPieces).push(piece);
                }
            }
        }

        this.frozenPieces = new Map(state.frozenPieces);
        this.invulnerablePieces = new Map(state.invulnerablePieces);
        this.traps = new Map(state.traps);

        this.saveBoardState();
        return true;
    }

    // ============================================
    // VISUAL EFFECTS
    // ============================================

    spawnCaptureParticles(row, col, owner) {
        const board = document.getElementById('board');
        if (!board) return;

        const rect = board.getBoundingClientRect();
        const cellSize = rect.width / 8;
        const centerX = rect.left + col * cellSize + cellSize / 2;
        const centerY = rect.top + row * cellSize + cellSize / 2;

        const colors = owner === 'player' ? ['#00d2ff', '#0088cc', '#ffffff'] : ['#ff4444', '#cc0000', '#ffaa00'];

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const angle = (Math.PI * 2 * i) / 8;
            const dist = 30 + Math.random() * 40;

            particle.style.cssText = `
                left: ${centerX}px; top: ${centerY}px;
                width: ${4 + Math.random() * 6}px; height: ${4 + Math.random() * 6}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                --tx: ${Math.cos(angle) * dist}px; --ty: ${Math.sin(angle) * dist}px;
            `;

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }

    triggerScreenShake() {
        const container = document.querySelector('.game-container');
        if (container) {
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 300);
        }
    }
}

// ============================================
// START
// ============================================

const game = new ChessRoguelike();
