const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const startScreenElement = document.getElementById('startScreen');
const soundBtn = document.getElementById('soundBtn');
const difficultyDisplay = document.getElementById('difficultyDisplay');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const swipeGuide = document.getElementById('swipeGuide');

// Set canvas size (will be responsive via CSS)
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const size = Math.min(window.innerWidth - 20, 800);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
}

canvas.width = 800;
canvas.height = 800;
resizeCanvas();

// Resize canvas on window resize
window.addEventListener('resize', resizeCanvas);

// Touch/Swipe variables
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Audio Context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound effect functions
function playEatSound() {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playGameOverSound() {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function playMoveSound() {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

// Game settings
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game state
let snake = [
    { x: 20, y: 20 }
];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameRunning = false;
let soundEnabled = true;
let hasStarted = false;
let difficulty = 'normal';
let gameInterval = null;

// Colors
const lightGreen = '#90ee90';
const darkGreen = '#7cc87c';
const snakeColor = '#4169e1';
const foodColor = '#ff0000';

// Initialize high score
highScoreElement.textContent = parseInt(highScore) || 0;

// Create checkered pattern
function drawGrid() {
    for (let row = 0; row < tileCount; row++) {
        for (let col = 0; col < tileCount; col++) {
            const x = col * gridSize;
            const y = row * gridSize;
            
            // Alternate colors for checkered pattern
            if ((row + col) % 2 === 0) {
                ctx.fillStyle = lightGreen;
            } else {
                ctx.fillStyle = darkGreen;
            }
            
            ctx.fillRect(x, y, gridSize, gridSize);
        }
    }
}

// Draw snake
function drawSnake() {
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        ctx.fillStyle = snakeColor;
        
        if (index === 0) {
            // Head: full square + semicircle on the leading edge
            const centerX = x + gridSize / 2;
            const centerY = y + gridSize / 2;
            const radius = gridSize / 2;

            // Base square
            ctx.fillRect(x, y, gridSize, gridSize);

            // Leading semicircle
            ctx.beginPath();
            if (dx === 1) { // Right
                ctx.arc(x + gridSize, centerY, radius, -Math.PI / 2, Math.PI / 2, false);
            } else if (dx === -1) { // Left
                ctx.arc(x, centerY, radius, Math.PI / 2, -Math.PI / 2, false);
            } else if (dy === 1) { // Down
                ctx.arc(centerX, y + gridSize, radius, 0, Math.PI, false);
            } else if (dy === -1) { // Up
                ctx.arc(centerX, y, radius, Math.PI, 0, false);
            } else { // Default face right
                ctx.arc(x + gridSize, centerY, radius, -Math.PI / 2, Math.PI / 2, false);
            }
            ctx.fill();

            // Eyes
            ctx.fillStyle = 'white';
            const eyeSize = 3;
            const eyeOffset = 5;
            let eye1X, eye1Y, eye2X, eye2Y;

            if (dx === 1) { // Right
                eye1X = x + gridSize - 3;
                eye2X = x + gridSize - 3;
                eye1Y = centerY - eyeOffset;
                eye2Y = centerY + eyeOffset;
            } else if (dx === -1) { // Left
                eye1X = x + 3;
                eye2X = x + 3;
                eye1Y = centerY - eyeOffset;
                eye2Y = centerY + eyeOffset;
            } else if (dy === 1) { // Down
                eye1X = centerX - eyeOffset;
                eye2X = centerX + eyeOffset;
                eye1Y = y + gridSize - 3;
                eye2Y = y + gridSize - 3;
            } else if (dy === -1) { // Up
                eye1X = centerX - eyeOffset;
                eye2X = centerX + eyeOffset;
                eye1Y = y + 3;
                eye2Y = y + 3;
            } else { // Default face right
                eye1X = x + gridSize - 3;
                eye2X = x + gridSize - 3;
                eye1Y = centerY - eyeOffset;
                eye2Y = centerY + eyeOffset;
            }

            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (index === snake.length - 1) {
            // Last segment: draw 30% tail only if snake has 3+ segments
            if (snake.length >= 3) {
                const tipWidth = gridSize * 0.3;
                const tipHeight = gridSize * 0.3;
                const tipOffsetX = (gridSize - tipWidth) / 2;
                const tipOffsetY = (gridSize - tipHeight) / 2;
                ctx.fillRect(x + tipOffsetX, y + tipOffsetY, tipWidth, tipHeight);
            } else {
                // If snake only has 2 segments, draw 60% tail
                const tailWidth = gridSize * 0.6;
                const tailHeight = gridSize * 0.6;
                const tailOffsetX = (gridSize - tailWidth) / 2;
                const tailOffsetY = (gridSize - tailHeight) / 2;
                ctx.fillRect(x + tailOffsetX, y + tailOffsetY, tailWidth, tailHeight);
            }
        } else if (index === snake.length - 2 && snake.length >= 3) {
            // Second to last segment: draw 60% tail when snake has 3+ segments
            const tailWidth = gridSize * 0.6;
            const tailHeight = gridSize * 0.6;
            const tailOffsetX = (gridSize - tailWidth) / 2;
            const tailOffsetY = (gridSize - tailHeight) / 2;
            ctx.fillRect(x + tailOffsetX, y + tailOffsetY, tailWidth, tailHeight);
        } else {
            // Draw body segments as rectangles
            ctx.fillRect(x, y, gridSize, gridSize);
            
            // Add parallel lines on body segments (not head, not tail pieces)
            // For snake.length >= 3: stripes on segments between head and tail (index 1 to length-3)
            const isBodySegment = snake.length >= 3 && index > 0 && index < snake.length - 2;
            if (isBodySegment) {
                // Determine segment direction by looking at previous segment
                let segmentDx = 0, segmentDy = 0;
                if (index > 0) {
                    const prevSegment = snake[index - 1];
                    segmentDx = segment.x - prevSegment.x;
                    segmentDy = segment.y - prevSegment.y;
                }
                
                const centerX = x + gridSize / 2;
                const centerY = y + gridSize / 2;
                const eyeOffset = 5;
                const lineLength = gridSize; // 100% of body piece
                const lineThickness = 2;
                
                ctx.fillStyle = 'white';
                
                if (segmentDx === 1 || segmentDx === -1) {
                    // Moving horizontally - draw horizontal lines (rotated 90 degrees)
                    const lineX = x;
                    
                    // Top line
                    ctx.fillRect(lineX, centerY - eyeOffset - lineThickness / 2, lineLength, lineThickness);
                    // Bottom line
                    ctx.fillRect(lineX, centerY + eyeOffset - lineThickness / 2, lineLength, lineThickness);
                } else if (segmentDy === 1 || segmentDy === -1) {
                    // Moving vertically - draw vertical lines (rotated 90 degrees)
                    const lineY = y;
                    
                    // Left line
                    ctx.fillRect(centerX - eyeOffset - lineThickness / 2, lineY, lineThickness, lineLength);
                    // Right line
                    ctx.fillRect(centerX + eyeOffset - lineThickness / 2, lineY, lineThickness, lineLength);
                }
            }
        }
    });
}

// Draw food (apple)
function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    
    // Draw apple body (red circle)
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw stem (small green rectangle)
    ctx.fillStyle = '#228b22';
    ctx.fillRect(x + gridSize / 2 - 2, y + 2, 4, 6);
}

// Generate food at random position
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Make sure food doesn't spawn on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// Move snake
function moveSnake() {
    // Don't move if no direction is set
    if (dx === 0 && dy === 0) {
        return;
    }
    
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Check self collision (skip first segment which is the current head)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreElement.textContent = score;
        
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        playEatSound();
        generateFood();
    } else {
        snake.pop();
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    gameOverElement.classList.add('show');
    playGameOverSound();
    
    // Show swipe guide again when game is over
    if (swipeGuide && window.innerWidth <= 850) {
        swipeGuide.style.display = 'block';
    }
}

// Reset game
function resetGame() {
    snake = [{ x: 20, y: 20 }];
    dx = 0;
    dy = 0;
    score = 0;
    scoreElement.textContent = score;
    gameOverElement.classList.remove('show');
    startScreenElement.classList.add('hide');
    generateFood();
    gameRunning = true;
    hasStarted = false;
}

// Get game speed based on difficulty
function getGameSpeed() {
    switch(difficulty) {
        case 'easy':
            return 150 * 1.3; // 30% slower (195ms)
        case 'hard':
            return 150 / 2; // 2x faster (75ms)
        default:
            return 150; // Normal (150ms)
    }
}

// Start game with selected difficulty
function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    difficultyDisplay.textContent = difficulty.toUpperCase();
    resetGame();
    
    // Hide swipe guide when game starts
    if (swipeGuide) {
        swipeGuide.style.display = 'none';
    }
    
    // Clear existing interval and start new one with correct speed
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, getGameSpeed());
}

// Game loop
function gameLoop() {
    if (gameRunning) {
        const prevLength = snake.length;
        moveSnake();
        
        // Play move sound only if snake actually moved and didn't grow
        if (gameRunning && dx !== 0 && dy !== 0 && snake.length === prevLength) {
            playMoveSound();
        }
    }
    
    drawGrid();
    drawFood();
    drawSnake();
}

// Difficulty button listeners
difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedDifficulty = btn.getAttribute('data-difficulty');
        startGame(selectedDifficulty);
    });
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameRunning && gameOverElement.classList.contains('show')) {
            // Allow space to restart only from game over screen
            startScreenElement.classList.remove('hide');
            gameOverElement.classList.remove('show');
        }
        return;
    }
    
    if (!gameRunning) return;
    
    // Prevent reversing into itself
    if (e.key === 'ArrowUp' && dy !== 1) {
        e.preventDefault();
        dx = 0;
        dy = -1;
        hasStarted = true;
    } else if (e.key === 'ArrowDown' && dy !== -1) {
        e.preventDefault();
        dx = 0;
        dy = 1;
        hasStarted = true;
    } else if (e.key === 'ArrowLeft' && dx !== 1) {
        e.preventDefault();
        dx = -1;
        dy = 0;
        hasStarted = true;
    } else if (e.key === 'ArrowRight' && dx !== -1) {
        e.preventDefault();
        dx = 1;
        dy = 0;
        hasStarted = true;
    }
});

// Sound toggle
soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
});

// Touch/Swipe Controls for Mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    // If game over is showing, tap to return to menu
    if (!gameRunning && gameOverElement.classList.contains('show')) {
        startScreenElement.classList.remove('hide');
        gameOverElement.classList.remove('show');
        return;
    }
    
    if (!gameRunning) return;
    
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: false });

// Also add click handler for game over screen on mobile
gameOverElement.addEventListener('click', () => {
    if (!gameRunning && gameOverElement.classList.contains('show')) {
        startScreenElement.classList.remove('hide');
        gameOverElement.classList.remove('show');
    }
});

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30; // Minimum distance for a swipe
    
    // Determine if swipe is more horizontal or vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && dx !== -1) {
                // Swipe right
                dx = 1;
                dy = 0;
                hasStarted = true;
            } else if (deltaX < 0 && dx !== 1) {
                // Swipe left
                dx = -1;
                dy = 0;
                hasStarted = true;
            }
        }
    } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && dy !== -1) {
                // Swipe down
                dx = 0;
                dy = 1;
                hasStarted = true;
            } else if (deltaY < 0 && dy !== 1) {
                // Swipe up
                dx = 0;
                dy = -1;
                hasStarted = true;
            }
        }
    }
}

// Prevent scrolling on touch devices
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Initialize game (don't start until difficulty is selected)
generateFood();
gameRunning = false;
hasStarted = false;
gameInterval = setInterval(gameLoop, 150);
