/* ==========================================================
   坦克大战 (Tank Battle) — Full Game
   Inspired by the classic Battle City (1985)
   ========================================================== */

// ─── Canvas setup ───────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 780, H = 780;
const TILE = 26;            // 每个格子 26px (780/30=26)
const COLS = 30, ROWS = 30;

// ─── DOM refs ───────────────────────────────────────────────
const levelDisplay   = document.getElementById('levelDisplay');
const livesDisplay   = document.getElementById('livesDisplay');
const enemiesDisplay = document.getElementById('enemiesDisplay');
const scoreDisplay   = document.getElementById('scoreDisplay');
const overlayTitle   = document.getElementById('overlayTitle');
const overlayMsg     = document.getElementById('overlayMsg');
const overlayBtn     = document.getElementById('overlayBtn');
const overlayEl      = document.getElementById('gameOverlay');
const restartBtn     = document.getElementById('restartBtn');

// ─── Sound (simple Web Audio) ───────────────────────────────
let audioCtx = null;
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playBeep(freq, dur, vol = 0.1, type = 'square') {
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
    } catch(e) {/* ignore */}
}
function soundShoot()  { playBeep(800, 0.08); }
function soundHit()    { playBeep(200, 0.15, 0.12, 'sawtooth'); }
function soundExplode(){ playBeep(100, 0.3, 0.15, 'sawtooth'); }
function soundGameOver(){ playBeep(300, 0.15); setTimeout(()=>playBeep(200,0.3),150); }

// ─── Map tile types ─────────────────────────────────────────
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, GRASS = 4, BASE = 5;

// ─── Direction helpers ─────────────────────────────────────
const DIR = { UP:0, RIGHT:1, DOWN:2, LEFT:3 };
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// ─── Game state ─────────────────────────────────────────────
let game = {
    state: 'menu',       // menu | playing | paused | gameover | win
    level: 1,
    score: 0,
    lives: 3,
    enemiesTotal: 0,
    enemiesSpawned: 0,
    enemiesAlive: 0,
    enemiesKilled: 0,
    maxEnemiesOnScreen: 4,
    frame: 0,
    spawnTimer: 0,
    animFrameId: null,
    bulletIdCounter: 0,
};

// ─── Map presets ────────────────────────────────────────────
// 0=空 1=砖 2=钢 3=水 4=草 5=基地
const MAPS = [
    // Level 1 — classic
    [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,2,2,1,1,2,2,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,2,2,1,1,2,2,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    // Level 2 — fortress
    [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,2,2,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,2,2,0,0],
        [0,0,2,2,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,2,2,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
        [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,3,3,3,3,3,3,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,3,3,3,3,3,3,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
        [0,0,1,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
    // Level 3 — water world
    [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,3,3,3,3,0,0,1,1,0,0,1,1,0,0,3,3,3,3,0,0,1,1,0,0],
        [0,0,1,1,0,0,3,3,3,3,0,0,1,1,0,0,1,1,0,0,3,3,3,3,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0,2,2,0,0,0,0,0,0,2,2,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,2,2,0,0,0,0,0,0,2,2,0,0,1,1,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
        [0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0],
        [0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,2,2,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,1,1,0,0,1,1,0,0,1,1,0,0,2,2,0,0,1,1,0,0,1,1,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
];

// ─── Tile map runtime ──────────────────────────────────────
let tileMap = [];

function buildMap(level) {
    tileMap = [];
    const data = MAPS[(level - 1) % MAPS.length];
    for (let r = 0; r < ROWS; r++) {
        tileMap[r] = [];
        for (let c = 0; c < COLS; c++) {
            tileMap[r][c] = data ? data[r][c] : (r === 0 || r === ROWS-1 || c === 0 || c === COLS-1 ? STEEL : EMPTY);
        }
    }
}

// ─── Tank object ────────────────────────────────────────────
function createTank(x, y, dir, isPlayer) {
    const size = TILE * 2;  // 坦克占 2x2 格 (52x52)
    return {
        x, y,           // 左上角像素坐标
        dir,
        size,
        speed: isPlayer ? 1.8 : 1.0,
        isPlayer,
        alive: true,
        cooldown: 0,
        fireRate: isPlayer ? 15 : 40,
        moveTimer: 0,
        changeDirInterval: 120, // frames between AI direction changes
        hp: isPlayer ? 1 : 1,
        color: isPlayer ? '#4a9' : '#c44',
    };
}

// ─── Bullet ─────────────────────────────────────────────────
function createBullet(x, y, dir, owner) {
    return {
        id: game.bulletIdCounter++,
        x, y,
        dir,
        speed: 3.5,
        owner,
        alive: true,
        size: 6,
    };
}

// ─── Explosion animation ────────────────────────────────────
let explosions = [];

function addExplosion(x, y, big = false) {
    explosions.push({ x, y, radius: big ? 40 : 24, maxRadius: big ? 40 : 24, alpha: 1, big });
}

// ─── Entities ───────────────────────────────────────────────
let player = null;
let enemies = [];
let bullets = [];

// ─── Spawn points ───────────────────────────────────────────
const PLAYER_SPAWN = { x: 8 * TILE, y: 24 * TILE };
const ENEMY_SPAWNS = [
    { x: 0, y: 0 },
    { x: 12 * TILE, y: 0 },
    { x: 24 * TILE, y: 0 },
];

// ─── Base position ──────────────────────────────────────────
const BASE_TILE = { row: 28, col: 13 };  // 基地在 (14,29) 附近

// ─── Rect collision ─────────────────────────────────────────
function rectCollide(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function tankRect(t) {
    return { x: t.x + 2, y: t.y + 2, w: t.size - 4, h: t.size - 4 };
}
function bulletRect(b) {
    return { x: b.x - b.size/2, y: b.y - b.size/2, w: b.size, h: b.size };
}

// ─── Tile collision helpers ─────────────────────────────────
function isTileSolid(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    const t = tileMap[row][col];
    return t === BRICK || t === STEEL || t === WATER || t === BASE;
}

function tilesInRect(x, y, w, h) {
    const tiles = [];
    const c1 = Math.floor(x / TILE);
    const r1 = Math.floor(y / TILE);
    const c2 = Math.floor((x + w - 0.1) / TILE);
    const r2 = Math.floor((y + h - 0.1) / TILE);
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                tiles.push({ row: r, col: c, val: tileMap[r][c] });
            }
        }
    }
    return tiles;
}

function canMoveTo(x, y, size, ignoreTank) {
    const rect = { x: x + 2, y: y + 2, w: size - 4, h: size - 4 };
    // Tile collision
    const tiles = tilesInRect(rect.x, rect.y, rect.w, rect.h);
    for (const t of tiles) {
        if (t.val === BRICK || t.val === STEEL || t.val === WATER || t.val === BASE) return false;
    }
    // Tank collision
    const allTanks = [player, ...enemies].filter(t => t && t.alive && t !== ignoreTank);
    for (const t of allTanks) {
        if (rectCollide(rect, tankRect(t))) return false;
    }
    return true;
}

// ─── Spawn enemy ────────────────────────────────────────────
function spawnEnemy() {
    if (game.enemiesKilled + game.enemiesAlive >= game.enemiesTotal) return;
    if (game.enemiesAlive >= game.maxEnemiesOnScreen) return;

    const spawns = ENEMY_SPAWNS.slice();
    // 找到最近的可用出生点
    for (const sp of spawns) {
        const t = createTank(sp.x, sp.y, DIR.DOWN, false);
        if (canMoveTo(t.x, t.y, t.size, null)) {
            enemies.push(t);
            game.enemiesAlive++;
            game.enemiesSpawned++;
            // Spawn animation flash
            addExplosion(sp.x + t.size/2, sp.y + t.size/2, false);
            updateEnemiesDisplay();
            return;
        }
    }
}

// ─── Fire bullet ────────────────────────────────────────────
function fireBullet(tank) {
    if (tank.cooldown > 0) return;
    if (!tank.alive) return;
    const cx = tank.x + tank.size / 2;
    const cy = tank.y + tank.size / 2;
    const off = tank.size / 2 + 2;
    const bx = cx + DX[tank.dir] * off;
    const by = cy + DY[tank.dir] * off;
    const b = createBullet(bx, by, tank.dir, tank);
    bullets.push(b);
    tank.cooldown = tank.fireRate;
    if (tank.isPlayer) soundShoot();
}

// ─── Player movement ────────────────────────────────────────
let keys = {};

function handleInput() {
    if (!player || !player.alive || game.state !== 'playing') return;

    let dx = 0, dy = 0, newDir = player.dir;

    if (keys['ArrowUp'] || keys['KeyW'] || keys['w']) { dy = -1; newDir = DIR.UP; }
    else if (keys['ArrowDown'] || keys['KeyS'] || keys['s']) { dy = 1; newDir = DIR.DOWN; }
    else if (keys['ArrowLeft'] || keys['KeyA'] || keys['a']) { dx = -1; newDir = DIR.LEFT; }
    else if (keys['ArrowRight'] || keys['KeyD'] || keys['d']) { dx = 1; newDir = DIR.RIGHT; }

    player.dir = newDir;
    if (dx !== 0 || dy !== 0) {
        const nx = player.x + dx * player.speed;
        const ny = player.y + dy * player.speed;
        // 尝试轴对齐移动
        if (dx !== 0 && canMoveTo(nx, player.y, player.size, player)) {
            player.x = nx;
        } else if (dy !== 0 && canMoveTo(player.x, ny, player.size, player)) {
            player.y = ny;
        }
        // 边界约束
        player.x = Math.max(0, Math.min(W - player.size, player.x));
        player.y = Math.max(0, Math.min(H - player.size, player.y));
    }

    if (keys['Space'] || keys['KeyJ'] || keys['j']) {
        fireBullet(player);
    }
}

// ─── AI ──────────────────────────────────────────────────────
function updateAI(tank) {
    if (!tank.alive) return;
    tank.moveTimer++;

    // 随机改变方向
    if (tank.moveTimer % tank.changeDirInterval === 0) {
        tank.dir = Math.floor(Math.random() * 4);
    }

    // 如果遇到障碍转向
    const dx = DX[tank.dir] * tank.speed;
    const dy = DY[tank.dir] * tank.speed;
    const nx = tank.x + dx;
    const ny = tank.y + dy;
    if (!canMoveTo(nx, ny, tank.size, tank) ||
        nx < 0 || nx > W - tank.size ||
        ny < 0 || ny > H - tank.size) {
        tank.dir = Math.floor(Math.random() * 4);
    }

    // 移动
    const ndx = DX[tank.dir] * tank.speed;
    const ndy = DY[tank.dir] * tank.speed;
    const nnx = tank.x + ndx;
    const nny = tank.y + ndy;
    if (canMoveTo(nnx, tank.y, tank.size, tank)) tank.x = nnx;
    if (canMoveTo(tank.x, nny, tank.size, tank)) tank.y = nny;
    tank.x = Math.max(0, Math.min(W - tank.size, tank.x));
    tank.y = Math.max(0, Math.min(H - tank.size, tank.y));

    // 射击 (随机 + 朝向玩家)
    if (player && player.alive) {
        const dist = Math.hypot(tank.x - player.x, tank.y - player.y);
        if (dist < TILE * 8 && Math.random() < 0.03) {
            // 朝向玩家
            const dxp = player.x - tank.x;
            const dyp = player.y - tank.y;
            if (Math.abs(dxp) > Math.abs(dyp)) {
                tank.dir = dxp > 0 ? DIR.RIGHT : DIR.LEFT;
            } else {
                tank.dir = dyp > 0 ? DIR.DOWN : DIR.UP;
            }
        }
    }
    if (Math.random() < 0.02) fireBullet(tank);
}

// ─── Update bullets ─────────────────────────────────────────
function updateBullets() {
    for (const b of bullets) {
        if (!b.alive) continue;
        b.x += DX[b.dir] * b.speed;
        b.y += DY[b.dir] * b.speed;

        // 出界
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
            b.alive = false;
            continue;
        }

        // Tile collision
        const tiles = tilesInRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size);
        let hit = false;
        for (const t of tiles) {
            if (t.val === BRICK) {
                tileMap[t.row][t.col] = EMPTY;
                hit = true;
                soundHit();
            } else if (t.val === STEEL) {
                hit = true;
                soundHit();
            } else if (t.val === BASE) {
                tileMap[t.row][t.col] = EMPTY;
                hit = true;
                gameOver(false);
                return;
            }
        }
        if (hit) { b.alive = false; continue; }

        // Tank collision
        if (b.owner && b.owner.alive) {
            if (b.owner.isPlayer) {
                // Player bullet hits enemies
                for (const e of enemies) {
                    if (!e.alive) continue;
                    if (rectCollide(bulletRect(b), tankRect(e))) {
                        e.alive = false;
                        b.alive = false;
                        game.enemiesAlive--;
                        game.enemiesKilled++;
                        game.score += 100;
                        updateScoreDisplay();
                        updateEnemiesDisplay();
                        addExplosion(e.x + e.size/2, e.y + e.size/2, true);
                        soundExplode();
                        // Remove enemy (delayed)
                        setTimeout(() => {
                            enemies = enemies.filter(en => en.alive);
                        }, 100);
                        // Check win
                        if (game.enemiesKilled >= game.enemiesTotal) {
                            game.state = 'win';
                            showOverlay('🎉 胜利！', '按 空格键 进入下一关');
                            return;
                        }
                        break;
                    }
                }
            } else {
                // Enemy bullet hits player
                if (rectCollide(bulletRect(b), tankRect(player))) {
                    b.alive = false;
                    playerHit();
                    return;
                }
            }
        }

        // Bullet vs Bullet
        for (const b2 of bullets) {
            if (b2 === b || !b2.alive) continue;
            if (b.owner && b2.owner && b.owner.isPlayer !== b2.owner.isPlayer) {
                if (Math.abs(b.x - b2.x) < b.size && Math.abs(b.y - b2.y) < b.size) {
                    b.alive = false;
                    b2.alive = false;
                    break;
                }
            }
        }
    }
    bullets = bullets.filter(b => b.alive);
}

// ─── Player hit ─────────────────────────────────────────────
function playerHit() {
    if (!player || !player.alive) return;
    player.alive = false;
    addExplosion(player.x + player.size/2, player.y + player.size/2, true);
    soundExplode();
    game.lives--;
    updateLivesDisplay();

    if (game.lives <= 0) {
        gameOver(true);
    } else {
        // Respawn player after delay
        setTimeout(() => {
            if (game.state === 'playing') {
                spawnPlayer();
            }
        }, 1000);
    }
}

function spawnPlayer() {
    player = createTank(PLAYER_SPAWN.x, PLAYER_SPAWN.y, DIR.UP, true);
    // Ensure spawn is clear
    if (!canMoveTo(player.x, player.y, player.size, player)) {
        player = null;
        setTimeout(spawnPlayer, 500);
    }
}

// ─── Game Over / Win ────────────────────────────────────────
function gameOver(lost) {
    game.state = 'gameover';
    soundGameOver();
    if (lost) {
        showOverlay('💀 游戏结束', `得分: ${game.score}`);
    } else {
        showOverlay('💀 基地被摧毁', '游戏结束');
    }
}

function nextLevel() {
    game.level++;
    resetLevel();
}

function resetLevel() {
    enemies = [];
    bullets = [];
    explosions = [];
    game.bulletIdCounter = 0;
    game.enemiesSpawned = 0;
    game.enemiesAlive = 0;
    game.enemiesKilled = 0;
    game.enemiesTotal = 20 + (game.level - 1) * 5;
    game.spawnTimer = 0;
    game.maxEnemiesOnScreen = Math.min(4 + Math.floor(game.level / 2), 8);

    buildMap(game.level);
    spawnPlayer();
    updateLevelDisplay();
    updateEnemiesDisplay();
    updateScoreDisplay();
    updateLivesDisplay();
}

function fullReset() {
    game.level = 1;
    game.score = 0;
    game.lives = 3;
    game.state = 'playing';
    resetLevel();
    hideOverlay();
}

// ─── Display updates ────────────────────────────────────────
function updateLevelDisplay()   { levelDisplay.textContent = game.level; }
function updateLivesDisplay()   { livesDisplay.textContent = game.lives; }
function updateEnemiesDisplay() { enemiesDisplay.textContent = game.enemiesTotal - game.enemiesKilled; }
function updateScoreDisplay()   { scoreDisplay.textContent = game.score; }

function showOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlayBtn.style.display = 'none';
    overlayEl.style.display = 'flex';
}
function hideOverlay() {
    overlayEl.style.display = 'none';
}

// ─── DRAWING ─────────────────────────────────────────────────

// Color palette
const COLORS = {
    brick: '#c9714a',
    brickDark: '#a85a3a',
    steel: '#aaa',
    steelDark: '#888',
    water: '#2255aa',
    waterLight: '#3366cc',
    grass: '#2a7a2a',
    base: '#ffd700',
    baseDead: '#555',
    playerBody: '#4a9a6a',
    playerTurret: '#6aba8a',
    playerBarrel: '#3a8a5a',
    enemyBody: '#b84a4a',
    enemyTurret: '#d86a6a',
    enemyBarrel: '#9a3a3a',
};

function drawTiles() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * TILE, y = r * TILE;
            switch (tileMap[r][c]) {
                case BRICK:
                    ctx.fillStyle = COLORS.brick;
                    ctx.fillRect(x, y, TILE, TILE);
                    // Brick pattern
                    ctx.fillStyle = COLORS.brickDark;
                    ctx.fillRect(x, y, TILE, 1);
                    ctx.fillRect(x, y, 1, TILE);
                    ctx.fillRect(x + TILE/2, y, 1, TILE);
                    ctx.fillRect(x, y + TILE/2, TILE, 1);
                    break;
                case STEEL:
                    ctx.fillStyle = COLORS.steel;
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.fillStyle = COLORS.steelDark;
                    ctx.fillRect(x, y, TILE, 2);
                    ctx.fillRect(x, y, 2, TILE);
                    ctx.fillStyle = '#ddd';
                    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
                    ctx.fillStyle = COLORS.steel;
                    ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
                    break;
                case WATER:
                    ctx.fillStyle = COLORS.water;
                    ctx.fillRect(x, y, TILE, TILE);
                    // Wave effect
                    ctx.fillStyle = COLORS.waterLight;
                    const phase = (game.frame * 2) % 12;
                    for (let wy = 0; wy < TILE; wy += 6) {
                        ctx.fillRect(x + ((wy + phase) % 12) - 3, y + wy, 6, 3);
                    }
                    break;
                case GRASS:
                    // Grass drawn on top of everything later
                    break;
                case BASE:
                    ctx.fillStyle = COLORS.base;
                    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
                    ctx.fillStyle = COLORS.base;
                    ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
                    // Eagle emblem
                    ctx.fillStyle = '#daa520';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('⭐', x + TILE/2, y + TILE/2);
                    break;
            }
        }
    }
}

function drawGrass() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (tileMap[r][c] === GRASS) {
                ctx.fillStyle = COLORS.grass;
                ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
                ctx.fillStyle = '#3a9a3a';
                for (let i = 0; i < 6; i++) {
                    const gx = c * TILE + (i * 5 + game.frame * 1) % TILE;
                    const gy = r * TILE + (i * 7 + game.frame * 2) % TILE;
                    ctx.fillRect(gx, gy, 3, 6);
                }
            }
        }
    }
}

function drawTank(tank) {
    if (!tank || !tank.alive) return;
    const { x, y, size, dir, isPlayer } = tank;
    const cx = x + size/2, cy = y + size/2;

    // Body
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);

    // Tracks
    ctx.fillStyle = isPlayer ? '#2a7a4a' : '#8a2a2a';
    ctx.fillRect(-size/2, -size/2, size, 6);
    ctx.fillRect(-size/2, size/2 - 6, size, 6);
    // Track lines
    ctx.fillStyle = isPlayer ? '#1a5a3a' : '#6a1a1a';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(-size/2 + 4 + i * 9, -size/2 + 1, 5, 4);
        ctx.fillRect(-size/2 + 4 + i * 9, size/2 - 5, 5, 4);
    }

    // Body rectangle
    const bodyColor = isPlayer ? COLORS.playerBody : COLORS.enemyBody;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-size/2 + 6, -size/2 + 6, size - 12, size - 12);

    // Body highlight
    ctx.fillStyle = isPlayer ? COLORS.playerTurret : COLORS.enemyTurret;
    ctx.fillRect(-size/2 + 8, -size/2 + 8, size - 16, size - 16);

    // Turret circle
    ctx.beginPath();
    ctx.arc(0, 0, size/4, 0, Math.PI * 2);
    const turretColor = isPlayer ? COLORS.playerTurret : COLORS.enemyTurret;
    ctx.fillStyle = turretColor;
    ctx.fill();
    ctx.strokeStyle = isPlayer ? '#2a7a4a' : '#7a2a2a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Barrel
    const barrelColor = isPlayer ? COLORS.playerBarrel : COLORS.enemyBarrel;
    ctx.fillStyle = barrelColor;
    ctx.fillRect(-3, -(size/2 - 2), 6, size/2 - 2);

    ctx.restore();

    // Hull mark (player star / enemy mark)
    if (isPlayer) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `${size/3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', cx, cy + 1);
    } else {
        ctx.fillStyle = '#ff6';
        ctx.font = `${size/4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', cx, cy + 1);
    }
}

function drawBullet(b) {
    if (!b.alive) return;
    ctx.fillStyle = b.owner && b.owner.isPlayer ? '#ff6' : '#f66';
    ctx.shadowColor = b.owner && b.owner.isPlayer ? '#ff0' : '#f00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawExplosions() {
    for (const e of explosions) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        grad.addColorStop(0, `rgba(255,255,200,${e.alpha})`);
        grad.addColorStop(0.4, `rgba(255,150,50,${e.alpha})`);
        grad.addColorStop(1, `rgba(200,50,0,0)`);
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

// ─── Spawn indicators ───────────────────────────────────────
function drawSpawnPoints() {
    if (game.state !== 'playing') return;
    for (const sp of ENEMY_SPAWNS) {
        if (game.frame % 30 < 15) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(sp.x, sp.y, TILE * 2, TILE * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sp.x, sp.y, TILE * 2, TILE * 2);
        }
    }
}

// ─── Main render ────────────────────────────────────────────
function render() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE, 0);
        ctx.lineTo(i * TILE, H);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * TILE);
        ctx.lineTo(W, i * TILE);
        ctx.stroke();
    }

    drawTiles();
    drawSpawnPoints();

    // Draw tanks (below grass)
    if (player) drawTank(player);
    for (const e of enemies) drawTank(e);

    // Bullets
    for (const b of bullets) drawBullet(b);

    // Grass (on top)
    drawGrass();

    // Explosions
    drawExplosions();
}

// ─── Game Loop ──────────────────────────────────────────────
function update() {
    if (game.state !== 'playing') return;
    game.frame++;

    handleInput();

    // Update player cooldown
    if (player && player.alive && player.cooldown > 0) player.cooldown--;

    // Update enemies
    for (const e of enemies) {
        updateAI(e);
        if (e.cooldown > 0) e.cooldown--;
    }

    // Spawn enemies
    if (game.enemiesSpawned < game.enemiesTotal) {
        game.spawnTimer++;
        if (game.spawnTimer > 120) {  // spawn every 2 seconds
            spawnEnemy();
            game.spawnTimer = 0;
        }
    }

    // Update bullets
    updateBullets();

    // Update explosions
    for (const e of explosions) {
        e.radius += 1.5;
        e.alpha -= 0.05;
    }
    explosions = explosions.filter(e => e.alpha > 0);

    // Check if player is alive and no base destroyed
    // (base check is in bullet collision)
}

function gameLoop() {
    update();
    render();
    game.animFrameId = requestAnimationFrame(gameLoop);
}

// ─── Start game ─────────────────────────────────────────────
function startGame() {
    initAudio();
    if (game.state === 'menu') {
        game.state = 'playing';
        fullReset();
    } else if (game.state === 'win') {
        nextLevel();
    } else if (game.state === 'gameover') {
        fullReset();
    }
}

// ─── Keyboard ───────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (game.state === 'menu' || game.state === 'gameover' || game.state === 'win') {
            startGame();
            return;
        }
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (game.state === 'playing') {
            game.state = 'paused';
            showOverlay('⏸️ 暂停', '按 P 继续游戏');
        } else if (game.state === 'paused') {
            game.state = 'playing';
            hideOverlay();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ─── Mobile touch controls ─────────────────────────────────
let touchPos = { x: 0, y: 0 };
let touchActive = false;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    if (game.state === 'menu' || game.state === 'gameover' || game.state === 'win') {
        startGame();
        return;
    }
    if (game.state === 'paused') {
        game.state = 'playing';
        hideOverlay();
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const t = e.touches[0];
    touchPos.x = (t.clientX - rect.left) * scaleX;
    touchPos.y = (t.clientY - rect.top) * scaleY;
    touchActive = true;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchActive || !player || !player.alive || game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const t = e.touches[0];
    const tx = (t.clientX - rect.left) * scaleX;
    const ty = (t.clientY - rect.top) * scaleY;

    const ddx = tx - touchPos.x;
    const ddy = ty - touchPos.y;
    const moveThreshold = 10;  // pixels before registering direction

    if (Math.abs(ddx) > Math.abs(ddy)) {
        if (ddx > moveThreshold) {
            keys['ArrowRight'] = true; keys['ArrowLeft'] = false;
            keys['ArrowUp'] = false; keys['ArrowDown'] = false;
        } else if (ddx < -moveThreshold) {
            keys['ArrowLeft'] = true; keys['ArrowRight'] = false;
            keys['ArrowUp'] = false; keys['ArrowDown'] = false;
        }
    } else {
        if (ddy > moveThreshold) {
            keys['ArrowDown'] = true; keys['ArrowUp'] = false;
            keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
        } else if (ddy < -moveThreshold) {
            keys['ArrowUp'] = true; keys['ArrowDown'] = false;
            keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
        }
    }
    touchPos.x = tx;
    touchPos.y = ty;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchActive = false;
    keys['ArrowUp'] = false; keys['ArrowDown'] = false;
    keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
    // Fire on tap
    if (player && player.alive && game.state === 'playing') {
        fireBullet(player);
    }
}, { passive: false });

// ─── Restart button ─────────────────────────────────────────
restartBtn.addEventListener('click', () => {
    fullReset();
    hideOverlay();
    game.state = 'playing';
});
overlayBtn.addEventListener('click', startGame);

// ─── Init ───────────────────────────────────────────────────
buildMap(1);
player = createTank(PLAYER_SPAWN.x, PLAYER_SPAWN.y, DIR.UP, true);
showOverlay('🎮 坦克大战', '按 空格键 / Enter 开始');
updateLevelDisplay();
updateLivesDisplay();
updateEnemiesDisplay();
updateScoreDisplay();
gameLoop();
