const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 600;

const elements = {
  score: document.getElementById('score'),
  highScore: document.getElementById('high-score'),
  finalScore: document.getElementById('final-score'),
  finalHighScore: document.getElementById('final-high-score'),
  finalCombo: document.getElementById('final-combo'),
  accuracy: document.getElementById('accuracy'),
  combo: document.getElementById('combo'),
  comboContainer: document.getElementById('combo-container'),
  multiplierFill: document.getElementById('multiplier-fill'),
  startScreen: document.getElementById('start-screen'),
  gameOverScreen: document.getElementById('game-over'),
  settingsMenu: document.getElementById('settings-menu'),
  startButton: document.getElementById('start-btn'),
  restartButton: document.getElementById('restart-btn'),
  settingsButton: document.getElementById('settings-btn'),
  backButton: document.getElementById('back-btn'),
  difficultyButtons: document.querySelectorAll('.difficulty-btn'),
  toggleSound: document.getElementById('toggle-sound'),
  toggleParticles: document.getElementById('toggle-particles'),
  toggleAI: document.getElementById('toggle-ai'),
  toggleEffects: document.getElementById('toggle-effects'),
  particleContainer: document.getElementById('particles'),
  languageSelect: document.getElementById('language-select'),
  toggleDev: document.getElementById('toggle-dev'),
  devOptions: document.getElementById('dev-options'),
  toggleInfinite: document.getElementById('toggle-infinite'),
  toggleNoCSS: document.getElementById('toggle-nocss'),
  toggleGodmode: document.getElementById('toggle-godmode'),
  toggleZerog: document.getElementById('toggle-zerog'),
  resetScores: document.getElementById('reset-scores'),
  instantWin: document.getElementById('instant-win')
};

const GAME_STATES = { MENU: 'menu', PLAYING: 'playing', GAME_OVER: 'game_over' };
const DIFFICULTY = {
  EASY: { speed: 2, acceleration: 0.1, tolerance: 0.15, color: '#2ed573' },
  MEDIUM: { speed: 3, acceleration: 0.15, tolerance: 0.1, color: '#ffa502' },
  HARD: { speed: 4, acceleration: 0.2, tolerance: 0.05, color: '#ff4757' }
};

let gameState = GAME_STATES.MENU;
let currentDifficulty = DIFFICULTY.EASY;
let boxes = [];
let debris = [];
let currentBlockIndex = 0;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let combo = 0;
let maxCombo = 0;
let multiplier = 1;
let multiplierProgress = 0;
let totalBlocks = 0;
let perfectBlocks = 0;
let blockSpeed = 0;
let blockDirection = 1;
let isMoving = false;
let isFalling = false;
let lastTimestamp = 0;
let gameStartTime = 0;
let currentPrecision = null;
let aiMode = false;
let aiTimeout = null;
let perfectLanding = false;
let godMode = false;
let zeroGravity = false;
let blockCounter = 0;
let cameraOffset = 0;
const CAMERA_JUMP = 50;
const CAMERA_SMOOTHNESS = 0.1;

const particleSystem = new ParticleSystem(elements.particleContainer);
const sounds = {
  place: new Audio('assets/place-sound.mp3'),
  combo: new Audio('assets/combo-sound.mp3'),
  gameover: new Audio('assets/gameover-sound.mp3')
};

elements.difficultyButtons.forEach(button => {
  button.addEventListener('click', () => {
    elements.difficultyButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentDifficulty = DIFFICULTY[button.dataset.difficulty.toUpperCase()];
  });
});

elements.startButton.addEventListener('click', startGame);
elements.restartButton.addEventListener('click', startGame);
elements.settingsButton.addEventListener('click', () => elements.settingsMenu.classList.remove('hidden'));
elements.backButton.addEventListener('click', () => elements.settingsMenu.classList.add('hidden'));
elements.toggleAI.addEventListener('change', toggleAIMode);
elements.languageSelect.addEventListener('change', (e) => setLanguage(e.target.value));
elements.toggleDev.addEventListener('change', () => elements.devOptions.classList.toggle('hidden', !elements.toggleDev.checked));
elements.toggleNoCSS.addEventListener('change', () => document.body.classList.toggle('no-css', elements.toggleNoCSS.checked));
elements.toggleGodmode.addEventListener('change', () => godMode = elements.toggleGodmode.checked);
elements.toggleZerog.addEventListener('change', () => zeroGravity = elements.toggleZerog.checked);
elements.resetScores.addEventListener('click', resetScores);
elements.instantWin.addEventListener('click', () => score = 9999);

document.addEventListener('keydown', handleKeyPress);
canvas.addEventListener('click', handleCanvasClick);

function toggleAIMode() {
  aiMode = elements.toggleAI.checked;
  canvas.classList.toggle('ai-active', aiMode);
  if (aiMode && gameState === GAME_STATES.PLAYING && isMoving) startAIMove();
  else clearTimeout(aiTimeout);
}

function startAIMove() {
  if (!aiMode || !isMoving || gameState !== GAME_STATES.PLAYING) return;
  const currentBlock = boxes[currentBlockIndex];
  const previousBlock = boxes[currentBlockIndex - 1];
  const targetCenterX = previousBlock.x + previousBlock.width / 2;
  const currentCenterX = currentBlock.x + currentBlock.width / 2;
  const distanceToPerfect = targetCenterX - currentCenterX;
  const timeToPerfect = (Math.abs(distanceToPerfect) * 16) / blockSpeed;
  aiTimeout = setTimeout(() => {
    if (isMoving && aiMode) {
      perfectLanding = true;
      startBlockFall();
      startAIMove();
    }
  }, timeToPerfect);
}

function startGame() {
  gameState = GAME_STATES.PLAYING;
  boxes = [];
  debris = [];
  score = 0;
  combo = 0;
  maxCombo = 0;
  multiplier = 1;
  multiplierProgress = 0;
  totalBlocks = 0;
  perfectBlocks = 0;
  cameraOffset = 0;
  blockCounter = 0;
  blockSpeed = currentDifficulty.speed;
  blockDirection = Math.random() > 0.5 ? 1 : -1;
  isMoving = true;
  isFalling = false;
  elements.score.textContent = '0';
  elements.combo.textContent = 'x1';
  elements.multiplierFill.style.width = '0%';
  elements.comboContainer.style.display = 'none';
  createInitialBlock();
  createNewBlock();
  elements.startScreen.classList.add('hidden');
  elements.gameOverScreen.classList.add('hidden');
  elements.settingsMenu.classList.add('hidden');
  gameStartTime = performance.now();
  lastTimestamp = gameStartTime;
  if (aiMode) startAIMove();
  requestAnimationFrame(gameLoop);
}

function createInitialBlock() {
  boxes.push({
    x: canvas.width / 4,
    y: canvas.height - 100,
    width: canvas.width / 2,
    height: 30,
    color: getRandomColor()
  });
}

function createNewBlock() {
  const lastBlock = boxes[boxes.length - 1];
  boxes.push({
    x: blockDirection > 0 ? 0 : canvas.width - lastBlock.width,
    y: lastBlock.y - 50,
    width: lastBlock.width,
    height: 30,
    color: getRandomColor(),
    moving: true
  });
  currentBlockIndex = boxes.length - 1;
  if (aiMode && isMoving) startAIMove();
}

function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
}

function startBlockFall() {
  isMoving = false;
  isFalling = true;
  const currentBlock = boxes[currentBlockIndex];
  currentBlock.targetY = boxes[currentBlockIndex - 1].y - currentBlock.height;
}

function placeBlock() {
  if (elements.toggleSound.checked) sounds.place.play();
  const currentBlock = boxes[currentBlockIndex];
  const previousBlock = boxes[currentBlockIndex - 1];
  let overlapLeft = Math.max(previousBlock.x - currentBlock.x, 0);
  let overlapRight = Math.max((currentBlock.x + currentBlock.width) - (previousBlock.x + previousBlock.width), 0);
  const totalOverlap = overlapLeft + overlapRight;
  const perfectWidth = previousBlock.width;
  const actualWidth = currentBlock.width - totalOverlap;
  const precisionRatio = actualWidth / perfectWidth;

  for (const level of Object.values(PRECISION)) {
    if (precisionRatio >= level.threshold) {
      currentPrecision = level;
      break;
    }
  }

  if (currentPrecision === PRECISION.PERFECT) {
    perfectBlocks++;
    combo++;
    multiplierProgress += 0.25;
    if (multiplierProgress >= 1) {
      multiplier++;
      multiplierProgress = 0;
      if (elements.toggleSound.checked) sounds.combo.play();
    }
  } else {
    combo = 0;
    multiplierProgress = Math.max(0, multiplierProgress - 0.5);
    if (multiplierProgress <= 0 && multiplier > 1) multiplier--;
  }

  maxCombo = Math.max(maxCombo, combo);
  totalBlocks++;
  score += currentPrecision.points * multiplier;

  if (elements.toggleEffects.checked) showPrecisionFeedback(currentBlock, currentPrecision, currentPrecision.points * multiplier);

  elements.comboContainer.style.display = combo > 1 ? 'flex' : 'none';
  elements.combo.textContent = `x${combo}`;
  elements.multiplierFill.style.width = `${multiplierProgress * 100}%`;
  elements.score.textContent = score;

  if (actualWidth <= 0 && !godMode) return gameOver();

  const newWidth = actualWidth;
  const newX = perfectLanding ? previousBlock.x : currentBlock.x + overlapLeft;

  if (totalOverlap > 0) {
    debris.push({
      x: currentBlock.x,
      y: currentBlock.y + cameraOffset,
      width: overlapLeft,
      height: currentBlock.height,
      color: currentBlock.color
    },{
      x: newX + newWidth,
      y: currentBlock.y + cameraOffset,
      width: overlapRight,
      height: currentBlock.height,
      color: currentBlock.color
    });
  }

  currentBlock.x = newX;
  currentBlock.width = newWidth;
  currentBlock.y = currentBlock.targetY;
  perfectLanding = false;

  blockCounter++;
  if (blockCounter % 8 === 0) {
    cameraOffset += CAMERA_JUMP;
  }

  setTimeout(() => {
    blockSpeed += currentDifficulty.acceleration;
    blockDirection = Math.random() > 0.5 ? 1 : -1;
    isMoving = true;
    createNewBlock();
    isFalling = false;
  }, 300);

  if (elements.toggleParticles.checked) {
    particleSystem.emit(
      currentBlock.x + currentBlock.width / 2,
      currentBlock.y + cameraOffset,
      currentBlock.color,
      20
    );
  }
}

function showPrecisionFeedback(block, precision, points) {
  const feedback = document.createElement('div');
  feedback.className = `accuracy-feedback ${precision.class}`;
  feedback.textContent = `${precision.text} +${points}`;
  feedback.style.left = `${block.x + block.width / 2}px`;
  feedback.style.top = `${block.y + cameraOffset}px`;
  document.querySelector('.game-container').appendChild(feedback);
  setTimeout(() => feedback.remove(), 1000);
}

function updateBlocks(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  if (isMoving) {
    const currentBlock = boxes[currentBlockIndex];
    currentBlock.x += blockSpeed * blockDirection * (deltaTime / 16);
    if (currentBlock.x + currentBlock.width > canvas.width) {
      currentBlock.x = canvas.width - currentBlock.width;
      blockDirection = -1;
    } else if (currentBlock.x < 0) {
      currentBlock.x = 0;
      blockDirection = 1;
    }
  }

  if (isFalling) {
    const currentBlock = boxes[currentBlockIndex];
    currentBlock.y += 15;
    if (currentBlock.y >= currentBlock.targetY) {
      currentBlock.y = currentBlock.targetY;
      isFalling = false;
      placeBlock();
    }
  }
}

function gameOver() {
  gameState = GAME_STATES.GAME_OVER;
  if (elements.toggleSound.checked) sounds.gameover.play();
  clearTimeout(aiTimeout);
  elements.finalScore.textContent = score;
  elements.finalHighScore.textContent = highScore;
  elements.finalCombo.textContent = `x${maxCombo}`;
  const accuracy = totalBlocks > 0 ? Math.round((perfectBlocks / totalBlocks) * 100) : 0;
  elements.accuracy.textContent = `${accuracy}%`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    elements.highScore.textContent = highScore;
  }

  if (elements.toggleEffects.checked) {
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 500);
  }
  elements.gameOverScreen.classList.remove('hidden');
}

function drawBackground() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBoxes() {
  boxes.forEach((block, i) => {
    const yPos = block.y + cameraOffset;
    
    if (yPos + block.height < -50 || yPos > canvas.height + 50) return;
    
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x, yPos, block.width, block.height);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x, yPos, block.width, block.height);
    if (i === currentBlockIndex && isMoving) {
      ctx.strokeStyle = 'white';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(block.x, yPos, block.width, block.height);
      ctx.setLineDash([]);
    }
  });
}

function drawDebris() {
  debris.forEach((piece, i) => {
    const yPos = piece.y;
    if (yPos + piece.height < -50 || yPos > canvas.height + 50) return debris.splice(i, 1);
    ctx.fillStyle = piece.color;
    ctx.fillRect(piece.x, yPos, piece.width, piece.height);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(piece.x, yPos, piece.width, piece.height);
    piece.y += zeroGravity ? 1 : 5;
  });
}

function gameLoop(timestamp) {
  if (gameState !== GAME_STATES.PLAYING) return;
  updateBlocks(timestamp);
  drawBackground();
  drawBoxes();
  drawDebris();
  if (elements.toggleParticles.checked) particleSystem.update();
  requestAnimationFrame(gameLoop);
}

function resetScores() {
  localStorage.setItem('highScore', 0);
  highScore = 0;
  elements.highScore.textContent = '0';
}

function handleKeyPress(e) {
  if (e.code === 'Space') {
    if (gameState === GAME_STATES.PLAYING && isMoving && !isFalling && !aiMode) startBlockFall();
    else if (gameState !== GAME_STATES.PLAYING) startGame();
  }
}

function handleCanvasClick() {
  if (gameState === GAME_STATES.PLAYING && isMoving && !isFalling && !aiMode) startBlockFall();
  else if (gameState !== GAME_STATES.PLAYING) startGame();
}

setLanguage('es');
