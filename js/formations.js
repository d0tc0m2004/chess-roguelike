// ============================================
// FORMATION SYSTEM - Chess Roguelike
// 25+ Enemy Formations with AI Archetypes
// ============================================

// ============================================
// FORMATION DATA STRUCTURE
// ============================================
// Each formation defines:
// - name: Display name
// - description: Flavor text
// - difficulty: 1-10 scale
// - archetype: AI behavior type
// - pieces: Array of {type, row, col} for enemy pieces
// - specialRules: Optional special conditions

const FORMATIONS = {
    // ============================================
    // DIFFICULTY 1-2: TUTORIAL FORMATIONS
    // ============================================

    pawnWall: {
        id: 'pawnWall',
        name: 'The Pawn Wall',
        description: 'A simple line of pawns. Good for learning.',
        difficulty: 1,
        archetype: 'PASSIVE',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'pawn', row: 2, col: 2 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    lonePawns: {
        id: 'lonePawns',
        name: 'Scattered Pawns',
        description: 'Disorganized pawns with their King.',
        difficulty: 1,
        archetype: 'PASSIVE',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'pawn', row: 1, col: 1 },
            { type: 'pawn', row: 2, col: 6 },
            { type: 'pawn', row: 3, col: 3 }
        ]
    },

    knightIntro: {
        id: 'knightIntro',
        name: 'Knight Apprentice',
        description: 'A single Knight guards the King.',
        difficulty: 2,
        archetype: 'PASSIVE',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'knight', row: 1, col: 2 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    bishopIntro: {
        id: 'bishopIntro',
        name: 'Bishop\'s Blessing',
        description: 'A Bishop watches over the pawns.',
        difficulty: 2,
        archetype: 'PASSIVE',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'bishop', row: 1, col: 2 },
            { type: 'pawn', row: 2, col: 1 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    // ============================================
    // DIFFICULTY 3-4: BEGINNER FORMATIONS
    // ============================================

    twinKnights: {
        id: 'twinKnights',
        name: 'Twin Knights',
        description: 'Two Knights working in tandem.',
        difficulty: 3,
        archetype: 'HUNTER',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'knight', row: 1, col: 1 },
            { type: 'knight', row: 1, col: 6 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    bishopPair: {
        id: 'bishopPair',
        name: 'Bishop Pair',
        description: 'Two Bishops control the diagonals.',
        difficulty: 3,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'pawn', row: 1, col: 3 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 2, col: 2 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    rookTower: {
        id: 'rookTower',
        name: 'The Tower',
        description: 'A Rook stands guard.',
        difficulty: 4,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'pawn', row: 1, col: 0 },
            { type: 'pawn', row: 1, col: 3 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 1, col: 5 }
        ]
    },

    pawnSwarm: {
        id: 'pawnSwarm',
        name: 'Pawn Swarm',
        description: 'Many pawns push forward relentlessly.',
        difficulty: 4,
        archetype: 'SWARM',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'pawn', row: 1, col: 0 },
            { type: 'pawn', row: 1, col: 1 },
            { type: 'pawn', row: 1, col: 2 },
            { type: 'pawn', row: 1, col: 5 },
            { type: 'pawn', row: 1, col: 6 },
            { type: 'pawn', row: 1, col: 7 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 }
        ]
    },

    // ============================================
    // DIFFICULTY 5-6: INTERMEDIATE FORMATIONS
    // ============================================

    queensGuard: {
        id: 'queensGuard',
        name: 'Queen\'s Guard',
        description: 'The Queen leads a small escort.',
        difficulty: 5,
        archetype: 'HUNTER',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 1, col: 3 },
            { type: 'pawn', row: 2, col: 2 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    castleDefense: {
        id: 'castleDefense',
        name: 'Castle Defense',
        description: 'Two Rooks protect their King.',
        difficulty: 5,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'pawn', row: 1, col: 3 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 1, col: 5 }
        ]
    },

    knightSquad: {
        id: 'knightSquad',
        name: 'Knight Squadron',
        description: 'Three Knights hunt together.',
        difficulty: 5,
        archetype: 'HUNTER',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'knight', row: 1, col: 1 },
            { type: 'knight', row: 1, col: 4 },
            { type: 'knight', row: 1, col: 6 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    tacticalSetup: {
        id: 'tacticalSetup',
        name: 'Tactical Formation',
        description: 'A balanced force of minor pieces.',
        difficulty: 6,
        archetype: 'TACTICIAN',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'knight', row: 0, col: 6 },
            { type: 'knight', row: 1, col: 1 },
            { type: 'bishop', row: 1, col: 5 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    aggressiveStance: {
        id: 'aggressiveStance',
        name: 'Aggressive Stance',
        description: 'Forward positioned pieces ready to attack.',
        difficulty: 6,
        archetype: 'AGGRESSOR',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 2, col: 3 },
            { type: 'knight', row: 3, col: 2 },
            { type: 'knight', row: 3, col: 5 },
            { type: 'pawn', row: 4, col: 3 },
            { type: 'pawn', row: 4, col: 4 }
        ]
    },

    // ============================================
    // DIFFICULTY 7-8: ADVANCED FORMATIONS
    // ============================================

    royalCourt: {
        id: 'royalCourt',
        name: 'The Royal Court',
        description: 'Queen, Rooks, and Knights serve the King.',
        difficulty: 7,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 0, col: 3 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'knight', row: 1, col: 1 },
            { type: 'knight', row: 1, col: 6 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    huntingPack: {
        id: 'huntingPack',
        name: 'Hunting Pack',
        description: 'Queen and Knights coordinate attacks.',
        difficulty: 7,
        archetype: 'HUNTER',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 1, col: 3 },
            { type: 'knight', row: 2, col: 1 },
            { type: 'knight', row: 2, col: 6 },
            { type: 'knight', row: 3, col: 4 },
            { type: 'pawn', row: 1, col: 5 },
            { type: 'pawn', row: 1, col: 6 }
        ]
    },

    fortress: {
        id: 'fortress',
        name: 'The Fortress',
        description: 'Heavy defensive position with Rooks.',
        difficulty: 7,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'pawn', row: 1, col: 1 },
            { type: 'pawn', row: 1, col: 3 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 1, col: 5 },
            { type: 'pawn', row: 1, col: 6 }
        ]
    },

    blitzkrieg: {
        id: 'blitzkrieg',
        name: 'Blitzkrieg',
        description: 'Fast-moving pieces positioned for quick strikes.',
        difficulty: 8,
        archetype: 'AGGRESSOR',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 2, col: 4 },
            { type: 'rook', row: 1, col: 0 },
            { type: 'rook', row: 1, col: 7 },
            { type: 'knight', row: 3, col: 2 },
            { type: 'knight', row: 3, col: 5 },
            { type: 'bishop', row: 2, col: 1 },
            { type: 'bishop', row: 2, col: 6 }
        ]
    },

    masterTactician: {
        id: 'masterTactician',
        name: 'Master Tactician',
        description: 'Positioned for forks, pins, and skewers.',
        difficulty: 8,
        archetype: 'TACTICIAN',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 1, col: 3 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'knight', row: 2, col: 1 },
            { type: 'knight', row: 2, col: 6 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 1, col: 5 }
        ]
    },

    // ============================================
    // DIFFICULTY 9-10: EXPERT/BOSS FORMATIONS
    // ============================================

    fullArmy: {
        id: 'fullArmy',
        name: 'Full Chess Army',
        description: 'The complete enemy army. Good luck.',
        difficulty: 9,
        archetype: 'TACTICIAN',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 0, col: 3 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'knight', row: 0, col: 1 },
            { type: 'knight', row: 0, col: 6 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'pawn', row: 1, col: 0 },
            { type: 'pawn', row: 1, col: 1 },
            { type: 'pawn', row: 1, col: 2 },
            { type: 'pawn', row: 1, col: 3 },
            { type: 'pawn', row: 1, col: 4 },
            { type: 'pawn', row: 1, col: 5 },
            { type: 'pawn', row: 1, col: 6 },
            { type: 'pawn', row: 1, col: 7 }
        ]
    },

    queenArmada: {
        id: 'queenArmada',
        name: 'Queen Armada',
        description: 'Multiple Queens dominate the board.',
        difficulty: 9,
        archetype: 'AGGRESSOR',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 0, col: 3 },
            { type: 'queen', row: 1, col: 1 },
            { type: 'queen', row: 1, col: 6 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 }
        ]
    },

    knightmareSquad: {
        id: 'knightmareSquad',
        name: 'Knightmare Squad',
        description: 'Five Knights will haunt your dreams.',
        difficulty: 9,
        archetype: 'HUNTER',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'knight', row: 1, col: 0 },
            { type: 'knight', row: 1, col: 2 },
            { type: 'knight', row: 1, col: 4 },
            { type: 'knight', row: 1, col: 5 },
            { type: 'knight', row: 1, col: 7 },
            { type: 'queen', row: 0, col: 3 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 5 }
        ]
    },

    theWall: {
        id: 'theWall',
        name: 'The Great Wall',
        description: 'An impenetrable defensive formation.',
        difficulty: 10,
        archetype: 'WALL',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 0, col: 3 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'knight', row: 1, col: 1 },
            { type: 'knight', row: 1, col: 6 },
            { type: 'pawn', row: 2, col: 0 },
            { type: 'pawn', row: 2, col: 1 },
            { type: 'pawn', row: 2, col: 2 },
            { type: 'pawn', row: 2, col: 3 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 2, col: 5 },
            { type: 'pawn', row: 2, col: 6 },
            { type: 'pawn', row: 2, col: 7 }
        ]
    },

    grandmaster: {
        id: 'grandmaster',
        name: 'The Grandmaster',
        description: 'Perfect positioning. Maximum difficulty.',
        difficulty: 10,
        archetype: 'TACTICIAN',
        pieces: [
            { type: 'king', row: 0, col: 6 },
            { type: 'queen', row: 1, col: 3 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 5 },
            { type: 'bishop', row: 1, col: 1 },
            { type: 'bishop', row: 2, col: 6 },
            { type: 'knight', row: 2, col: 2 },
            { type: 'knight', row: 3, col: 4 },
            { type: 'pawn', row: 1, col: 5 },
            { type: 'pawn', row: 1, col: 6 },
            { type: 'pawn', row: 1, col: 7 },
            { type: 'pawn', row: 2, col: 4 },
            { type: 'pawn', row: 3, col: 1 },
            { type: 'pawn', row: 3, col: 3 }
        ]
    },

    deathSquad: {
        id: 'deathSquad',
        name: 'Death Squad',
        description: 'All heavy pieces. No mercy.',
        difficulty: 10,
        archetype: 'AGGRESSOR',
        pieces: [
            { type: 'king', row: 0, col: 4 },
            { type: 'queen', row: 1, col: 3 },
            { type: 'queen', row: 1, col: 5 },
            { type: 'rook', row: 0, col: 0 },
            { type: 'rook', row: 0, col: 7 },
            { type: 'rook', row: 2, col: 2 },
            { type: 'rook', row: 2, col: 5 },
            { type: 'bishop', row: 0, col: 2 },
            { type: 'bishop', row: 0, col: 5 },
            { type: 'knight', row: 3, col: 1 },
            { type: 'knight', row: 3, col: 6 }
        ]
    }
};

// ============================================
// FORMATION POOLS BY DIFFICULTY
// ============================================
const FORMATION_POOLS = {
    TUTORIAL: ['pawnWall', 'lonePawns'],
    EASY: ['knightIntro', 'bishopIntro', 'twinKnights', 'bishopPair'],
    MEDIUM: ['rookTower', 'pawnSwarm', 'queensGuard', 'castleDefense', 'knightSquad'],
    HARD: ['tacticalSetup', 'aggressiveStance', 'royalCourt', 'huntingPack', 'fortress'],
    EXPERT: ['blitzkrieg', 'masterTactician', 'fullArmy', 'queenArmada'],
    BOSS: ['knightmareSquad', 'theWall', 'grandmaster', 'deathSquad']
};

// ============================================
// BATTLE PROGRESSION
// ============================================
const BATTLE_PROGRESSION = [
    { battle: 1, pool: 'TUTORIAL', difficulty: 'HARD' },
    { battle: 2, pool: 'TUTORIAL', difficulty: 'HARD' },
    { battle: 3, pool: 'EASY', difficulty: 'HARD' },
    { battle: 4, pool: 'EASY', difficulty: 'HARD' },
    { battle: 5, pool: 'MEDIUM', difficulty: 'HARD' },
    { battle: 6, pool: 'MEDIUM', difficulty: 'HARD' },
    { battle: 7, pool: 'HARD', difficulty: 'HARD' },
    { battle: 8, pool: 'HARD', difficulty: 'HARD' },
    { battle: 9, pool: 'EXPERT', difficulty: 'HARD' },
    { battle: 10, pool: 'BOSS', difficulty: 'BRUTAL' }
];

// ============================================
// FORMATION HELPER FUNCTIONS
// ============================================

function getFormationById(formationId) {
    return FORMATIONS[formationId] || null;
}

function getRandomFormation(pool = 'MEDIUM') {
    const formationIds = FORMATION_POOLS[pool] || FORMATION_POOLS.MEDIUM;
    const randomId = formationIds[Math.floor(Math.random() * formationIds.length)];
    return FORMATIONS[randomId];
}

function getFormationForBattle(battleNumber) {
    const progression = BATTLE_PROGRESSION.find(p => p.battle === battleNumber)
        || BATTLE_PROGRESSION[BATTLE_PROGRESSION.length - 1];

    const formation = getRandomFormation(progression.pool);
    return {
        formation,
        difficulty: progression.difficulty
    };
}

function getAllFormationsByDifficulty(minDifficulty, maxDifficulty) {
    return Object.values(FORMATIONS).filter(f =>
        f.difficulty >= minDifficulty && f.difficulty <= maxDifficulty
    );
}

function setupFormation(game, formation) {
    // Clear existing enemy pieces
    game.enemyPieces = [];

    // Clear enemy positions on board
    for (let row = 0; row < game.board.length; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = game.board[row][col];
            if (piece && piece.owner === 'enemy') {
                game.board[row][col] = null;
            }
        }
    }

    // Place formation pieces
    for (const pieceData of formation.pieces) {
        const piece = {
            type: pieceData.type,
            owner: 'enemy',
            row: pieceData.row,
            col: pieceData.col,
            id: `enemy-${pieceData.type}-${Date.now()}-${Math.random()}`
        };
        game.board[pieceData.row][pieceData.col] = piece;
        game.enemyPieces.push(piece);
    }

    // Set AI archetype based on formation
    game.aiArchetype = formation.archetype || 'HUNTER';

    return formation;
}

// ============================================
// AI ARCHETYPE EXTENSIONS
// ============================================
const AI_ARCHETYPE_EXTENSIONS = {
    PASSIVE: {
        name: 'Passive',
        description: 'Defensive play, rarely initiates attacks',
        modifiers: {
            captureBonus: -30,
            defendKingBonus: +50,
            advanceBonus: -40
        }
    },
    SWARM: {
        name: 'The Swarm',
        description: 'Pawns push forward relentlessly',
        modifiers: {
            pawnAdvanceBonus: +50,
            kingAggressionPenalty: -60,
            queenAggressionPenalty: -30
        }
    },
    HUNTER: {
        name: 'The Hunter',
        description: 'Aggressively pursues captures',
        modifiers: {
            queenAggressionBonus: +50,
            captureBonus: +40,
            defensePenalty: -25
        }
    },
    WALL: {
        name: 'The Wall',
        description: 'Impenetrable defense',
        modifiers: {
            advanceBonus: -50,
            defendKingBonus: +70,
            captureBonus: -30
        }
    },
    TACTICIAN: {
        name: 'The Tactician',
        description: 'Seeks forks, pins, and positional advantage',
        modifiers: {
            forkBonus: +80,
            pinBonus: +70,
            knightBishopBonus: +30,
            positionBonus: +40
        }
    },
    AGGRESSOR: {
        name: 'The Aggressor',
        description: 'All-out attack, minimal regard for safety',
        modifiers: {
            advanceBonus: +60,
            captureBonus: +60,
            safetyPenaltyReduction: 0.4
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FORMATIONS,
        FORMATION_POOLS,
        BATTLE_PROGRESSION,
        AI_ARCHETYPE_EXTENSIONS,
        getFormationById,
        getRandomFormation,
        getFormationForBattle,
        getAllFormationsByDifficulty,
        setupFormation
    };
}
