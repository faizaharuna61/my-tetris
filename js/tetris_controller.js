const mainCanvas = document.getElementById('gameCanvas');
const mainCtx = mainCanvas.getContext('2d');
const previewCanvas = document.getElementById('nextPieceCanvas');
const previewCtx = previewCanvas.getContext('2d');
const scoreElement = document.getElementById('scoreDisplay');
const linesElement = document.getElementById('linesDisplay');
const levelElement = document.getElementById('levelDisplay');
const startButton = document.getElementById('playButton');

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const TETROMINO_COLORS = {
    'I': 'cyan',
    'O': 'yellow',
    'T': 'purple',
    'S': 'green',
    'Z': 'red',
    'J': 'blue',
    'L': 'orange',
};
const TETROMINO_SHAPES = {
    'I': [[1, 1, 1, 1]],
    'O': [[1, 1], [1, 1]],
    'T': [[0, 1, 0], [1, 1, 1]],
    'S': [[0, 1, 1], [1, 1, 0]],
    'Z': [[1, 1, 0], [0, 1, 1]],
    'J': [[1, 0, 0], [1, 1, 1]],
    'L': [[0, 0, 1], [1, 1, 1]],
};

let board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
let currentPiece = generateRandomTetromino();
let upcomingPiece = generateRandomTetromino();
let reservedPiece = null;
let gameEnded = false;
let fallSpeed = 1000;
let previousFallTime = 0;
let playerScore = 0;
let totalLinesCleared = 0;
let currentLevel = 0;

function paintBlock(x, y, color, context) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = '#000';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function paintBoard() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                paintBlock(x, y, board[y][x], mainCtx);
            }
        }
    }
}

function paintNextPiece() {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    upcomingPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                paintBlock(x, y, upcomingPiece.color, previewCtx);
            }
        });
    });
}

function generateRandomTetromino() {
    const types = Object.keys(TETROMINO_SHAPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return createTetromino(randomType);
}

function createTetromino(type) {
    return {
        type,
        shape: TETROMINO_SHAPES[type],
        color: TETROMINO_COLORS[type],
        x: Math.floor(BOARD_WIDTH / 2) - 1,
        y: 0,
    };
}

function rotatePiece(piece) {
    const rotatedShape = piece.shape[0].map((_, index) => piece.shape.map(row => row[index]).reverse());
    return { ...piece, shape: rotatedShape };
}

function shiftPiece(piece, offsetX, offsetY) {
    const shiftedPiece = { ...piece, x: piece.x + offsetX, y: piece.y + offsetY };
    if (isMoveValid(shiftedPiece)) {
        return shiftedPiece;
    }
    return piece;
}

function performHardDrop(piece) {
    while (isMoveValid({ ...piece, y: piece.y + 1 })) {
        piece.y++;
    }
    return piece;
}

function isMoveValid(piece) {
    return piece.shape.every((row, dy) => {
        return row.every((cell, dx) => {
            const x = piece.x + dx;
            const y = piece.y + dy;
            return (
                cell === 0 ||
                (x >= 0 && x < BOARD_WIDTH && y < BOARD_HEIGHT && !board[y][x])
            );
        });
    });
}

function lockPiece(piece) {
    piece.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
            if (cell) {
                const x = piece.x + dx;
                const y = piece.y + dy;
                board[y][x] = piece.color;
            }
        });
    });
}

function removeCompleteLines() {
    let linesRemoved = 0;
    board = board.filter(row => {
        if (row.every(cell => cell !== null)) {
            linesRemoved++;
            return false;
        }
        return true;
    });
    while (board.length < BOARD_HEIGHT) {
        board.unshift(Array(BOARD_WIDTH).fill(null));
    }
    return linesRemoved;
}

function gameUpdate(currentTime) {
    if (!gameEnded) {
        if (currentTime - previousFallTime > fallSpeed) {
            const newPiece = shiftPiece(currentPiece, 0, 1);
            if (newPiece === currentPiece) {
                lockPiece(currentPiece);
                currentPiece = upcomingPiece;
                upcomingPiece = generateRandomTetromino();
                if (!isMoveValid(currentPiece)) {
                    gameEnded = true;
                }
                const linesRemoved = removeCompleteLines();
                playerScore += linesRemoved * 100;
                totalLinesCleared += linesRemoved;
                if (totalLinesCleared >= (currentLevel + 1) * 10) {
                    currentLevel++;
                    fallSpeed *= 0.9;
                }
                scoreElement.textContent = playerScore;
                linesElement.textContent = totalLinesCleared;
                levelElement.textContent = currentLevel;
            } else {
                currentPiece = newPiece;
            }
            previousFallTime = currentTime;
        }
    }
}

function renderGame() {
    paintBoard();
    paintNextPiece();
    currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                paintBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color, mainCtx);
            }
        });
    });
}

function runGameLoop(currentTime = 0) {
    gameUpdate(currentTime);
    renderGame();
    if (!gameEnded) {
        requestAnimationFrame(runGameLoop);
    } else {
        mainCtx.fillStyle = 'red';
        mainCtx.font = '24px Arial';
        mainCtx.fillText('Game Over', mainCanvas.width / 2 - 50, mainCanvas.height / 2);
    }
}

document.addEventListener('keydown', (event) => {
    if (!gameEnded) {
        switch (event.key) {
            case 'ArrowUp':
            case 'x':
                currentPiece = rotatePiece(currentPiece);
                break;
            case 'ArrowDown':
                currentPiece = shiftPiece(currentPiece, 0, 1);
                break;
            case 'ArrowLeft':
                currentPiece = shiftPiece(currentPiece, -1, 0);
                break;
            case 'ArrowRight':
                currentPiece = shiftPiece(currentPiece, 1, 0);
                break;
            case ' ':
                currentPiece = performHardDrop(currentPiece);
                break;
            case 'Shift':
            case 'c':
                // Handle piece hold (if implemented)
                break;
            case 'Control':
            case 'z':
                currentPiece = rotatePiece(currentPiece);
                break;
            case 'Escape':
            case 'F1':
                break;
            default:
                break;
        }
    }
});

startButton.addEventListener('click', () => {
    if (gameEnded) {
        gameEnded = false;
        board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
        currentPiece = generateRandomTetromino();
        upcomingPiece = generateRandomTetromino();
        playerScore = 0;
        totalLinesCleared = 0;
        currentLevel = 0;
        fallSpeed = 1000;
        previousFallTime = 0;
        scoreElement.textContent = playerScore;
        linesElement.textContent = totalLinesCleared;
        levelElement.textContent = currentLevel;
        runGameLoop();
    }
});

runGameLoop();
