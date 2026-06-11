const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameContainer = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameClearScreen = document.getElementById('game-clear-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const nextBtn = document.getElementById('next-btn');
const finalScoreSpan = document.getElementById('final-score');
const clearScoreSpan = document.getElementById('clear-score');
const scoreDisplay = document.getElementById('score-display');
const progressBar = document.getElementById('progress-bar');
const stageDisplay = document.getElementById('stage-display');
const nextStageBtn = document.getElementById('next-stage-btn');

let animationId;
let baseGameSpeed = 6;
let gameSpeed = baseGameSpeed;
let boostTimer = 0;
let gravity = 0.6;
let score = 0;
let isGameOver = false;
let isGameClear = false;

// Settings
const INITIAL_SPEED = 6;
const MAX_SPEED = 16;
let currentStage = 1;
let stageGoalDistance = 3000;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input Handling
let keys = {};
let prevKeys = {};
window.addEventListener('keydown', e => { 
    keys[e.code] = true; 
    // エンターキーですぐに再開・次へ進む
    if (e.code === 'Enter') {
        if (isGameOver) {
            init('restart_stage');
        } else if (isGameClear) {
            init('next_stage');
        } else if (startScreen.classList.contains('active')) {
            init('restart_all');
        }
    }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('touchstart', e => { keys['Space'] = true; });
window.addEventListener('touchend', e => { keys['Space'] = false; });

function isJustPressed(code) {
    return keys[code] && !prevKeys[code];
}

function updateKeys() {
    prevKeys = { ...keys };
}

class Player {
    constructor() {
        this.width = 50;
        this.normalHeight = 80;
        this.duckHeight = 40;
        this.height = this.normalHeight;
        this.x = 150;
        this.y = 0;
        this.vy = 0;
        this.jumpForce = -13;
        this.grounded = false;
        this.isDucking = false;
        this.jumpsLeft = 2; // Double jump capacity
    }

    update() {
        if (this.grounded) {
            this.jumpsLeft = 2;
        }

        let actionDuck = false;
        let actionJump = false;

        if (poisonTimer > 0) {
            // 操作反転: ジャンプとしゃがみが逆になる
            actionDuck = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
            actionJump = isJustPressed('ArrowDown') || isJustPressed('KeyS');
        } else {
            actionDuck = keys['ArrowDown'] || keys['KeyS'];
            actionJump = isJustPressed('Space') || isJustPressed('ArrowUp') || isJustPressed('KeyW');
        }

        // しゃがみ処理
        if (actionDuck) {
            if (!this.isDucking) {
                this.isDucking = true;
                this.height = this.duckHeight;
                if (this.grounded) this.y += (this.normalHeight - this.duckHeight);
            }
        } else {
            if (this.isDucking) {
                this.isDucking = false;
                this.height = this.normalHeight;
                if (this.grounded) this.y -= (this.normalHeight - this.duckHeight);
            }
        }

        // ジャンプ処理
        if (actionJump && !this.isDucking && this.jumpsLeft > 0) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.jumpsLeft--;
        }

        this.vy += gravity;
        this.y += this.vy;
        this.grounded = false;
    }

    draw() {
        ctx.save();
        if (boostTimer > 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00FFFF';
        } else if (poisonTimer > 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#8A2BE2';
        }

        let time = Date.now() / 100;
        let isRunning = this.grounded && !this.isDucking && !isGameOver && !isGameClear;
        let isLongJumping = !this.grounded && !this.isDucking;
        
        // 必死に走るための前傾姿勢と上下の揺れ
        let leanAngle = isRunning ? (gameSpeed * 0.02) + Math.sin(time) * 0.1 : 0;
        let bobbingY = isRunning ? Math.abs(Math.sin(time * 1.5)) * 5 : 0;
        
        if (this.isDucking) leanAngle = Math.PI / 4;
        if (isLongJumping) {
            leanAngle = this.vy < 0 ? -0.1 : -0.2; // 降下時はさらに後ろにのけぞる
        }

        let cx = this.x + this.width / 2;
        let cy = this.y + this.height / 2 - bobbingY;

        ctx.translate(cx, cy);
        ctx.rotate(leanAngle);

        // リアルなおじさんの描画（スーツ姿）
        // 体
        ctx.fillStyle = '#4B5320'; 
        ctx.fillRect(-this.width/2, -this.height/2 + 15, this.width, this.height - 30);
        
        // --- 腕の計算 ---
        let armSwing = isRunning ? Math.sin(time * 1.5) * 20 : 0;
        let backArmAngle = isRunning ? -armSwing/30 : 0;
        let frontArmAngle = isRunning ? armSwing/30 : 0;
        let backArmX = isRunning ? armSwing : 0;
        let frontArmX = isRunning ? -armSwing : 0;
        let backArmY = -5;
        let frontArmY = -5;

        if (isLongJumping) {
            if (this.vy < 0) {
                // 上昇中: バンザイ（跳躍）
                backArmAngle = -Math.PI / 1.5;
                frontArmAngle = -Math.PI / 1.5;
                backArmY = -10;
                frontArmY = -10;
            } else {
                // 下降中: 腕を前に突き出す（着地準備）
                backArmAngle = -Math.PI / 4;
                frontArmAngle = -Math.PI / 4;
                backArmX = 15;
                frontArmX = 15;
            }
        }

        // 奥の腕
        ctx.fillStyle = '#4B5320';
        ctx.beginPath();
        ctx.ellipse(backArmX, backArmY, 8, 25, backArmAngle, 0, Math.PI*2);
        ctx.fill();

        // 顔
        ctx.fillStyle = (poisonTimer > 0) ? '#9370DB' : '#FFCBA4';
        ctx.beginPath();
        ctx.arc(5, -this.height/2 + 5, 18, 0, Math.PI*2);
        ctx.fill();

        // 髪の毛（バーコード）
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -this.height/2 - 8);
        ctx.lineTo(15, -this.height/2 - 8);
        ctx.moveTo(-12, -this.height/2 - 4);
        ctx.lineTo(10, -this.height/2 - 4);
        ctx.stroke();

        // ヒゲと目
        ctx.fillStyle = '#000';
        ctx.fillRect(15, -this.height/2 + 2, 4, 4); // 目
        if (isLongJumping) {
            // ジャンプ中は必死な口（大きく開ける）
            ctx.fillRect(12, -this.height/2 + 12, 6, 6);
        } else {
            ctx.fillRect(10, -this.height/2 + 12, 10, 3); // ちょび髭
        }

        // ネクタイ
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.moveTo(5, -this.height/2 + 23);
        ctx.lineTo(10, -this.height/2 + 40);
        ctx.lineTo(0, -this.height/2 + 40);
        ctx.fill();

        // --- 脚の計算 ---
        let legSwing = isRunning ? Math.sin(time * 1.5) * 15 : 0;
        let backFootX = isRunning ? -legSwing : 0;
        let backFootY = this.height/2;
        let frontFootX = isRunning ? legSwing : 0;
        let frontFootY = this.height/2;

        if (this.isDucking) {
            backFootX = -15;
            frontFootX = 15;
        } else if (isLongJumping) {
            if (this.vy < 0) {
                // 上昇中: 空中で足をバタバタ（シザース）
                let airTime = Date.now() / 60;
                backFootX = Math.sin(airTime) * 20;
                frontFootX = -Math.sin(airTime) * 20;
                backFootY = this.height/2 - 10 + Math.cos(airTime) * 10;
                frontFootY = this.height/2 - 10 - Math.cos(airTime) * 10;
            } else {
                // 下降中: 両足を前に投げ出す（走り幅跳びの着地姿勢）
                backFootX = 25;
                backFootY = this.height/2 - 15;
                frontFootX = 20;
                frontFootY = this.height/2 - 10;
            }
        }

        // 脚の描画
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        // 奥の脚
        ctx.beginPath();
        ctx.moveTo(0, this.height/2 - 15);
        ctx.lineTo(backFootX, backFootY);
        ctx.stroke();
        // 手前の脚
        ctx.beginPath();
        ctx.moveTo(0, this.height/2 - 15);
        ctx.lineTo(frontFootX, frontFootY);
        ctx.stroke();

        // カバン（アタッシュケース）を持たせる
        let handX = frontArmX - Math.sin(frontArmAngle) * 20;
        let handY = frontArmY + Math.cos(frontArmAngle) * 20;
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(frontArmAngle * 0.5);
        ctx.fillStyle = '#654321';
        ctx.fillRect(-10, -5, 25, 15);
        ctx.fillStyle = '#000';
        ctx.fillRect(-2, -8, 10, 3);
        ctx.restore();

        // 手前の腕
        ctx.fillStyle = '#4B5320';
        ctx.beginPath();
        ctx.ellipse(frontArmX, frontArmY, 8, 25, frontArmAngle, 0, Math.PI*2);
        ctx.fill();

        // 汗（必死感）
        if ((isRunning || isLongJumping) && Math.sin(time * 2) > 0) {
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(-10, -this.height/2 - 15, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -this.height/2 - 20, 3, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class Building {
    constructor(x, y, w, h, isCrumbling = false) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isCrumbling = isCrumbling;
        this.crumbleTimer = -1;
        this.offsetY = 0;
    }

    update() {
        this.x -= gameSpeed;
        
        // Crumbling logic
        if (this.isCrumbling && this.crumbleTimer > 0) {
            this.crumbleTimer -= 16; 
            this.offsetY = (Math.random() - 0.5) * 8;
            if (this.crumbleTimer <= 0) {
                this.crumbleTimer = 0;
            }
        } else if (this.isCrumbling && this.crumbleTimer === 0) {
            this.y += 15;
            this.offsetY = 0;
        }
    }

    startCrumble() {
        if (this.isCrumbling && this.crumbleTimer === -1) {
            this.crumbleTimer = 800; // 0.8s
        }
    }

    draw() {
        let drawY = this.y + this.offsetY;
        ctx.fillStyle = this.isCrumbling ? '#5C4033' : '#222';
        ctx.fillRect(this.x, drawY, this.w, this.h);
        ctx.fillStyle = this.isCrumbling ? '#8B5A2B' : '#444';
        ctx.fillRect(this.x, drawY, this.w, 5);
        
        if (!this.isCrumbling) {
            ctx.fillStyle = '#FFF8DC';
            ctx.globalAlpha = 0.8;
            for(let i = 15; i < this.w - 15; i += 40) {
                for(let j = 30; j < this.h - 20; j += 50) {
                    if ((this.x + i + j) % 3 === 0) {
                        ctx.fillRect(this.x + i, drawY + j, 15, 25);
                    }
                }
            }
            ctx.globalAlpha = 1.0;
        } else {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 20, drawY + 20);
            ctx.lineTo(this.x + 40, drawY + 60);
            ctx.lineTo(this.x + 30, drawY + 100);
            ctx.stroke();
        }
    }
}

class Obstacle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 20;
    }
    update() { this.x -= gameSpeed * 1.3; }
    draw() {
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Spike {
    constructor(x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = 30;
    }
    update() { this.x -= gameSpeed; }
    draw() {
        ctx.fillStyle = '#800000'; 
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#C0C0C0'; 
        for (let i = 0; i < this.w; i += 20) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i + 10, this.y - 20);
            ctx.lineTo(this.x + i + 20, this.y);
            ctx.fill();
        }
    }
}

class Poison {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 30;
        this.active = true;
        this.offset = Math.random() * Math.PI * 2;
    }
    update() { this.x -= gameSpeed; }
    draw() {
        if (!this.active) return;
        let drawY = this.y + Math.sin((Date.now() / 150) + this.offset) * 5;
        ctx.fillStyle = '#8A2BE2'; // 紫色の毒瓶
        ctx.fillRect(this.x, drawY + 10, 20, 20); // 胴体
        ctx.fillRect(this.x + 5, drawY, 10, 10); // 首
        ctx.fillStyle = '#32CD32'; // 緑色のドクロラベル
        ctx.fillRect(this.x + 5, drawY + 15, 10, 10);
    }
}

class BoostPad {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 60;
        this.h = 10;
        this.active = true;
    }
    update() { this.x -= gameSpeed; }
    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText('>>', this.x + 20, this.y + 9);
    }
}

class Firebar {
    constructor(x, y, length) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.angle = 0;
    }
    update() {
        this.x -= gameSpeed;
        this.angle += 0.05; 
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 支点（ブロック）は回転させずに描画
        ctx.fillStyle = '#8B4513'; // 茶色のブロック
        ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#DAA520'; // 内側のハイライト
        ctx.fillRect(-10, -10, 20, 20);
        
        // 炎の部分だけ回転させる
        ctx.rotate(this.angle);
        ctx.fillStyle = '#FF4500'; 
        for (let i = 25; i < this.length; i += 20) {
            ctx.beginPath();
            ctx.arc(i, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class GoalPost {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 180;
    }
    update() { this.x -= gameSpeed; }
    draw() {
        ctx.fillStyle = '#CCC'; // Pole
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#FFD700'; // Top knob
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF0000'; // Flag
        ctx.beginPath();
        ctx.moveTo(this.x + this.w, this.y + 10);
        ctx.lineTo(this.x + this.w + 60, this.y + 40);
        ctx.lineTo(this.x + this.w, this.y + 70);
        ctx.fill();
    }
}

let player;
let buildings = [];
let obstacles = [];
let spikes = [];
let boostPads = [];
let firebars = [];
let poisons = [];
let goalPost = null;
let goalSpawned = false;
let poisonTimer = 0;

function init(action = 'restart_all') {
    if (action === 'restart_all') {
        currentStage = 1;
    } else if (action === 'next_stage') {
        currentStage++;
    }
    // 'restart_stage' の場合は currentStage をそのまま維持
    
    stageGoalDistance = 1000 + (currentStage - 1) * 200; // Stage 1: 1000m, Stage 2: 1200m...
    stageDisplay.innerText = `ステージ ${currentStage}`;
    progressBar.style.width = '0%';
    
    player = new Player();
    buildings = [];
    obstacles = [];
    spikes = [];
    boostPads = [];
    firebars = [];
    poisons = [];
    goalPost = null;
    goalSpawned = false;
    
    score = 0;
    poisonTimer = 0;
    baseGameSpeed = INITIAL_SPEED + (currentStage - 1); // Get slightly faster each stage
    if (baseGameSpeed > MAX_SPEED) baseGameSpeed = MAX_SPEED;
    gameSpeed = baseGameSpeed;
    boostTimer = 0;
    isGameOver = false;
    isGameClear = false;
    
    const startH = 200;
    buildings.push(new Building(0, canvas.height - startH, canvas.width, startH));
    player.y = canvas.height - startH - player.normalHeight;
    
    gameContainer.className = 'time-morning';
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameClearScreen.classList.remove('active');
    
    loop();
}

function spawnLevelChunks() {
    let lastBuilding = buildings[buildings.length - 1];
    
    // ゴール到達の少し前（画面外）でゴールを生成する
    let targetSpawnScore = stageGoalDistance - 120;
    if (score >= targetSpawnScore && !goalSpawned) {
        // Spawn Goal Building
        let w = 500;
        let h = 200;
        let y = canvas.height - h;
        let newBuilding = new Building(lastBuilding.x + lastBuilding.w + 100, y, w, h, false);
        buildings.push(newBuilding);
        
        goalPost = new GoalPost(newBuilding.x + 200, newBuilding.y - 180);
        goalSpawned = true;
        return;
    }
    
    if (goalSpawned) {
        // Just spawn endless safe platforms after the goal so we don't fall
        let newBuilding = new Building(lastBuilding.x + lastBuilding.w + 50, canvas.height - 200, 500, 200, false);
        buildings.push(newBuilding);
        return;
    }
    
    let maxSafeGap = Math.min(350, baseGameSpeed * 35); 
    let minGap = 80;
    let gap = Math.random() * (maxSafeGap - minGap) + minGap;
    
    let w = Math.random() * 300 + 200;
    let minH = 150;
    let maxH = canvas.height - 250;
    let h = Math.random() * (maxH - minH) + minH;
    let y = canvas.height - h;
    
    let isCrumbling = false;
    // 崩れる足場: ステージ1の中盤以降から
    if ((currentStage > 1 || score > 500) && Math.random() < 0.3) isCrumbling = true;
    
    let newBuilding = new Building(lastBuilding.x + lastBuilding.w + gap, y, w, h, isCrumbling);
    buildings.push(newBuilding);
    
    // トゲトゲ: ステージ1の序盤以降から
    if ((currentStage > 1 || score > 200) && Math.random() < 0.5 && gap > 150) {
        let spikeY = Math.max(lastBuilding.y, newBuilding.y) + 40; 
        if (spikeY > canvas.height - 30) spikeY = canvas.height - 30;
        spikes.push(new Spike(lastBuilding.x + lastBuilding.w + 10, spikeY, gap - 20));
    }
    
    // 加速パネル: ステージ1の終盤以降から
    if ((currentStage > 1 || score > 700) && Math.random() < 0.2 && !isCrumbling) {
        boostPads.push(new BoostPad(newBuilding.x + w/2 - 30, newBuilding.y - 10));
    }
    
    // 毒: ステージ2以降から
    if ((currentStage > 1 || score > 800) && Math.random() < 0.15) {
        poisons.push(new Poison(newBuilding.x + w/2 + 20, newBuilding.y - 50));
    }
    
    // ファイアバー: ステージ2以降から
    if (currentStage >= 2 && Math.random() < 0.25) {
        firebars.push(new Firebar(newBuilding.x + w/2, newBuilding.y - 60, 150));
    }
    
    // 飛んでくる障害物
    if ((currentStage > 1 || score > 100) && Math.random() < 0.3) {
        let obY = newBuilding.y - player.duckHeight - 15; 
        obstacles.push(new Obstacle(newBuilding.x + w/2, obY));
    }
}

function circleRectCollide(cx, cy, radius, rx, ry, rw, rh) {
    let testX = cx;
    let testY = cy;
    if (cx < rx) testX = rx;
    else if (cx > rx + rw) testX = rx + rw;
    if (cy < ry) testY = ry;
    else if (cy > ry + rh) testY = ry + rh;
    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt((distX*distX) + (distY*distY));
    return distance <= radius;
}

function checkCollisions() {
    player.grounded = false;
    
    for (let b of buildings) {
        let bY = b.y + b.offsetY; 
        
        // 足場への着地判定（揺れでめり込んでも着地とみなすよう余裕を持たせる）
        if (player.vy >= 0 &&
            player.x < b.x + b.w && player.x + player.width > b.x &&
            player.y + player.height <= bY + 25 && 
            player.y + player.height >= bY - 15) {
            
            player.grounded = true;
            player.vy = 0;
            player.y = bY - player.height;
            if (b.isCrumbling) b.startCrumble();
            
        } else if (player.x + player.width > b.x + 10 && player.x < b.x + b.w && 
                   player.y + player.height > bY + 25) {
            // 着地判定よりも下にいて、壁にぶつかった場合はゲームオーバー
            gameOver();
        }
    }

    for (let o of obstacles) {
        if (player.x < o.x + o.w && player.x + player.width > o.x &&
            player.y < o.y + o.h && player.y + player.height > o.y) gameOver();
    }
    
    for (let s of spikes) {
        if (player.x < s.x + s.w && player.x + player.width > s.x &&
            player.y + player.height > s.y - 20) gameOver();
    }
    
    for (let p of boostPads) {
        if (p.active && player.x < p.x + p.w && player.x + player.width > p.x &&
            player.y + player.height >= p.y - 10 && player.y + player.height <= p.y + p.h + 10) {
            p.active = false;
            boostTimer = 120;
        }
    }
    
    // Player vs Poisons
    for (let p of poisons) {
        if (p.active && player.x < p.x + p.w && player.x + player.width > p.x &&
            player.y < p.y + p.h && player.y + player.height > p.y) {
            p.active = false;
            poisonTimer = 300; // 約5秒間
        }
    }
    
    for (let fb of firebars) {
        // 支点（ブロック）の上に乗れるようにする当たり判定
        let bx = fb.x - 15;
        let by = fb.y - 15;
        let bw = 30;
        if (player.vy >= 0 &&
            player.x < bx + bw && player.x + player.width > bx &&
            player.y + player.height <= by + player.vy + 5 && 
            player.y + player.height >= by - 15) {
            
            player.grounded = true;
            player.vy = 0;
            player.y = by - player.height;
        }

        // 炎の当たり判定
        for (let i = 25; i < fb.length; i += 20) {
            let cx = fb.x + Math.cos(fb.angle) * i;
            let cy = fb.y + Math.sin(fb.angle) * i;
            if (circleRectCollide(cx, cy, 6, player.x, player.y, player.width, player.height)) gameOver();
        }
    }

    if (player.y > canvas.height) gameOver();
    
    // Goal Collision
    if (goalPost) {
        // Y座標（高さ）に関係なく、ゴールのX座標に到達したらクリアとする
        if (player.x + player.width > goalPost.x) {
            gameClear();
        }
    }
}

function updateDifficultyAndTime() {
    if (goalSpawned && goalPost) {
        // ゴールまでの実際のピクセル距離からスコアを逆算し、到着時にピッタリになるように調整
        let remainingPhysicalDist = goalPost.x - player.x;
        let calculatedScore = stageGoalDistance - (remainingPhysicalDist * 0.1);
        if (calculatedScore > score) score = calculatedScore;
        if (score > stageGoalDistance) score = stageGoalDistance;
    } else {
        score += gameSpeed * 0.1; // 距離が進むペースを調整（約30秒で1000m到達）
    }
    
    scoreDisplay.innerText = `距離: ${Math.floor(score)}m / ${stageGoalDistance}m`;

    let progress = Math.min(100, (score / stageGoalDistance) * 100);
    progressBar.style.width = `${progress}%`;

    // Speed increase logic
    let targetBaseSpeed = INITIAL_SPEED + (currentStage - 1) * 0.5 + (score / 500);
    if (targetBaseSpeed > MAX_SPEED) targetBaseSpeed = MAX_SPEED;
    baseGameSpeed = targetBaseSpeed;

    if (poisonTimer > 0) poisonTimer--;

    if (boostTimer > 0) {
        gameSpeed = baseGameSpeed * 1.8;
        boostTimer--;
    } else {
        // 毒状態の場合は操作反転（右キーでブレーキ）
        let isBraking = false;
        if (poisonTimer > 0) {
            isBraking = keys['ArrowRight'] || keys['KeyD'];
        } else {
            isBraking = keys['ArrowLeft'] || keys['KeyA'];
        }

        if (isBraking) {
            gameSpeed = baseGameSpeed * 0.6;
        } else {
            gameSpeed = baseGameSpeed;
        }
    }

    // Time of day change
    if (progress > 80) {
        gameContainer.className = 'time-night';
    } else if (progress > 40) {
        gameContainer.className = 'time-evening';
    } else {
        gameContainer.className = 'time-morning';
    }
}

function loop() {
    if (isGameOver || isGameClear) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update();

    if (buildings.length === 0 || buildings[buildings.length - 1].x < canvas.width) {
        spawnLevelChunks();
    }
    
    let entities = [
        { array: buildings, drawFunc: 'draw', updateFunc: 'update' },
        { array: spikes, drawFunc: 'draw', updateFunc: 'update' },
        { array: obstacles, drawFunc: 'draw', updateFunc: 'update' },
        { array: boostPads, drawFunc: 'draw', updateFunc: 'update' },
        { array: firebars, drawFunc: 'draw', updateFunc: 'update' },
        { array: poisons, drawFunc: 'draw', updateFunc: 'update' }
    ];
    
    for (let ent of entities) {
        for (let i = ent.array.length - 1; i >= 0; i--) {
            let obj = ent.array[i];
            obj[ent.updateFunc]();
            obj[ent.drawFunc]();
            if (obj.x + (obj.w || obj.length || 0) < -200) {
                ent.array.splice(i, 1);
            }
        }
    }
    
    if (goalPost) {
        goalPost.update();
        goalPost.draw();
    }

    checkCollisions();
    player.draw();
    
    updateDifficultyAndTime();
    updateKeys();

    // 毒の画面エフェクト
    if (poisonTimer > 0) {
        ctx.fillStyle = 'rgba(138, 43, 226, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('操作反転中！', canvas.width/2 - 80, 100);
    }

    animationId = requestAnimationFrame(loop);
}

function gameOver() {
    isGameOver = true;
    finalScoreSpan.innerText = Math.floor(score);
    gameOverScreen.classList.add('active');
}

function gameClear() {
    isGameClear = true;
    clearScoreSpan.innerText = Math.floor(score);
    gameClearScreen.classList.add('active');
}

startBtn.addEventListener('click', () => init('restart_all'));
restartBtn.addEventListener('click', () => init('restart_stage'));
nextStageBtn.addEventListener('click', () => init('next_stage'));
nextBtn.addEventListener('click', () => {
    gameClearScreen.classList.remove('active');
    startScreen.classList.add('active');
});
