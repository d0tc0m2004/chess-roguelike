// Stockfish Web Worker Wrapper
// Loads Stockfish.js and communicates via postMessage

let stockfish = null;
let isReady = false;

// Try to load Stockfish from various sources
const STOCKFISH_SOURCES = [
    'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
    'https://unpkg.com/stockfish.js@10.0.2/stockfish.js',
    'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
];

async function loadStockfish() {
    for (const source of STOCKFISH_SOURCES) {
        try {
            importScripts(source);
            if (typeof STOCKFISH === 'function') {
                return STOCKFISH();
            }
        } catch (e) {
            console.warn('Failed to load Stockfish from:', source, e);
        }
    }
    throw new Error('Could not load Stockfish from any source');
}

loadStockfish()
    .then(sf => {
        stockfish = sf;

        stockfish.onmessage = function(event) {
            const message = event;

            if (message === 'uciok') {
                isReady = true;
                postMessage({ type: 'ready' });
            }

            // Parse bestmove response
            if (typeof message === 'string' && message.startsWith('bestmove')) {
                const parts = message.split(' ');
                const bestMove = parts[1];
                postMessage({ type: 'bestmove', move: bestMove });
            }

            // Parse info with score and pv (principal variation)
            if (typeof message === 'string' && message.includes('info') && message.includes(' pv ')) {
                const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
                const pvMatch = message.match(/ pv (.+)/);
                const depthMatch = message.match(/depth (\d+)/);

                if (scoreMatch && pvMatch) {
                    const scoreType = scoreMatch[1];
                    const scoreValue = parseInt(scoreMatch[2]);
                    const pv = pvMatch[1].split(' ');
                    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;

                    postMessage({
                        type: 'analysis',
                        scoreType,
                        scoreValue,
                        pv,
                        depth,
                        bestMove: pv[0]
                    });
                }
            }
        };

        // Initialize UCI
        stockfish.postMessage('uci');
    })
    .catch(err => {
        console.error('Stockfish load failed:', err);
        postMessage({ type: 'error', message: err.message });
    });

// Handle messages from main thread
onmessage = function(e) {
    if (!stockfish || !isReady) {
        postMessage({ type: 'error', message: 'Stockfish not ready' });
        return;
    }

    const { type, fen, depth, multiPV } = e.data;

    switch (type) {
        case 'analyze':
            // Set position and analyze
            stockfish.postMessage('ucinewgame');
            stockfish.postMessage(`position fen ${fen}`);
            if (multiPV && multiPV > 1) {
                stockfish.postMessage(`setoption name MultiPV value ${multiPV}`);
            }
            stockfish.postMessage(`go depth ${depth || 12}`);
            break;

        case 'stop':
            stockfish.postMessage('stop');
            break;

        case 'quit':
            stockfish.postMessage('quit');
            break;
    }
};
