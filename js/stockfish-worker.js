// stockfish-worker.js
// Web Worker for Stockfish chess engine

let stockfish = null;
let isReady = false;

// Try multiple methods to load Stockfish
async function initStockfish() {
    const paths = [
        'stockfish.js',
        './stockfish.js',
        '/js/stockfish.js',
        '../js/stockfish.js',
        'js/stockfish.js'
    ];

    for (const path of paths) {
        try {
            importScripts(path);

            // Check if Stockfish loaded
            if (typeof Stockfish === 'function') {
                stockfish = Stockfish();
                setupStockfish();
                console.log('Stockfish loaded successfully from:', path);
                return true;
            }
            if (typeof STOCKFISH === 'function') {
                stockfish = STOCKFISH();
                setupStockfish();
                console.log('Stockfish loaded from:', path);
                return true;
            }
        } catch (e) {
            console.log('Failed to load from:', path);
        }
    }

    // All paths failed
    postMessage({ type: 'error', message: 'Could not load Stockfish from any source' });
    return false;
}

function setupStockfish() {
    if (!stockfish) return;

    // Forward all Stockfish messages to main thread
    stockfish.onmessage = function (event) {
        const message = typeof event === 'string' ? event : event.data;
        postMessage(message);
    };

    isReady = true;
    postMessage({ type: 'ready' });
}

// Handle commands from main thread
onmessage = function (e) {
    const command = e.data;

    if (!stockfish) {
        // Queue command until ready
        initStockfish().then(() => {
            if (stockfish && command) {
                stockfish.postMessage(command);
            }
        });
        return;
    }

    // Forward command to Stockfish
    stockfish.postMessage(command);
};

// Start initialization
initStockfish();
