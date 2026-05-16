/**
 * Monster Defense - Core Game Logic
 */

// Wrap in DOMContentLoaded to ensure elements exist
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('start-screen');
    const hud = document.getElementById('hud');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const scoreValue = document.getElementById('score-value');
    const finalScore = document.getElementById('final-score');
    const healthBar = document.getElementById('health-bar');

    // Game State
    let gameState = 'START'; // START, PLAYING, GAMEOVER
    let score = 0;
    let animationId;
    let lastTime = 0;
    let screenShake = 0;

    // Game Config
    const CONFIG = {
        playerSpeed: 5,
        playerSize: 20,
        projectileSpeed: 10,
        projectileSize: 5,
        monsterSpawnRate: 1500, // ms
        monsterBaseSpeed: 2,
        monsterSize: 18,
        maxHealth: 100
    };

    // Entities
    let player;
    let projectiles = [];
    let monsters = [];
    let particles = [];
    let keys = {};
    let mouse = { x: 0, y: 0 };
    let lastSpawnTime = 0;
    let health = CONFIG.maxHealth;

    // Utility Functions
    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    // Classes
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = CONFIG.playerSize;
            this.color = '#4488ff';
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.closePath();
            
            const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(angle) * 30, this.y + Math.sin(angle) * 30);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
            
            ctx.shadowBlur = 0;
        }

        update() {
            if (keys['w'] || keys['ArrowUp']) this.y -= CONFIG.playerSpeed;
            if (keys['s'] || keys['ArrowDown']) this.y += CONFIG.playerSpeed;
            if (keys['a'] || keys['ArrowLeft']) this.x -= CONFIG.playerSpeed;
            if (keys['d'] || keys['ArrowRight']) this.x += CONFIG.playerSpeed;

            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }
    }

    class Projectile {
        constructor(x, y, targetX, targetY) {
            this.x = x;
            this.y = y;
            this.radius = CONFIG.projectileSize;
            this.color = '#ffff00';
            
            const angle = Math.atan2(targetY - y, targetX - x);
            this.velocity = {
                x: Math.cos(angle) * CONFIG.projectileSpeed,
                y: Math.sin(angle) * CONFIG.projectileSpeed
            };
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.closePath();
            ctx.shadowBlur = 0;
        }

        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
        }
    }

    class Monster {
        constructor(x, y, speed) {
            this.x = x;
            this.y = y;
            this.radius = CONFIG.monsterSize;
            this.color = '#ff4444';
            this.speed = speed;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        update() {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = Math.random() * 3;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.01;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= this.decay;
        }
    }

    // Spawning Logic
    function spawnMonster() {
        let x, y;
        const edge = Math.floor(Math.random() * 4);

        switch (edge) {
            case 0: x = Math.random() * canvas.width; y = -50; break;
            case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
            case 3: x = -50; y = Math.random() * canvas.height; break;
        }

        const speed = CONFIG.monsterBaseSpeed + (score / 4000);
        monsters.push(new Monster(x, y, speed));
    }

    // Game Functions
    function init() {
        resize();
        player = new Player(canvas.width / 2, canvas.height / 2);
        projectiles = [];
        monsters = [];
        particles = [];
        score = 0;
        health = CONFIG.maxHealth;
        scoreValue.innerText = score;
        updateHealthBar();
    }

    function updateHealthBar() {
        healthBar.style.width = `${(health / CONFIG.maxHealth) * 100}%`;
        if (health < 30) healthBar.style.backgroundColor = '#ff4444';
        else if (health < 60) healthBar.style.backgroundColor = '#ffff44';
        else healthBar.style.backgroundColor = '#44ff44';
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function animate(timestamp) {
        if (gameState !== 'PLAYING') return;

        animationId = requestAnimationFrame(animate);
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        ctx.fillStyle = 'rgba(26, 26, 26, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
            screenShake *= 0.9;
            if (screenShake < 0.1) screenShake = 0;
        }

        if (timestamp - lastSpawnTime > Math.max(250, CONFIG.monsterSpawnRate - score / 15)) {
            spawnMonster();
            lastSpawnTime = timestamp;
        }

        player.update();
        player.draw();

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0) particles.splice(i, 1);
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.update();
            p.draw();

            if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
                projectiles.splice(i, 1);
                continue;
            }

            for (let j = monsters.length - 1; j >= 0; j--) {
                const m = monsters[j];
                if (getDistance(p.x, p.y, m.x, m.y) < p.radius + m.radius) {
                    for (let k = 0; k < 8; k++) particles.push(new Particle(m.x, m.y, m.color));
                    monsters.splice(j, 1);
                    projectiles.splice(i, 1);
                    score += 100;
                    scoreValue.innerText = score;
                    break;
                }
            }
        }

        for (let i = monsters.length - 1; i >= 0; i--) {
            const m = monsters[i];
            m.update();
            m.draw();

            if (getDistance(m.x, m.y, player.x, player.y) < m.radius + player.radius) {
                monsters.splice(i, 1);
                health -= 10;
                updateHealthBar();
                for (let k = 0; k < 12; k++) particles.push(new Particle(player.x, player.y, '#ffffff'));
                screenShake = 15;
                if (health <= 0) endGame();
            }
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function startGame() {
        console.log("Starting game...");
        gameState = 'PLAYING';
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        init();
        lastTime = performance.now();
        animationId = requestAnimationFrame(animate);
    }

    function endGame() {
        gameState = 'GAMEOVER';
        cancelAnimationFrame(animationId);
        finalScore.innerText = score;
        gameOverScreen.classList.remove('hidden');
        hud.classList.add('hidden');
    }

    // Event Listeners
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', () => {
        if (gameState === 'PLAYING') {
            projectiles.push(new Projectile(player.x, player.y, mouse.x, mouse.y));
        }
    });

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);

    resize();
});
