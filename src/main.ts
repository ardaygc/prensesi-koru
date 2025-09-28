import * as THREE from 'three';
import { Hands, type Results as HandResults } from '@mediapipe/hands';

// --- DOM Elementleri ---
let videoElement: HTMLVideoElement;
let gameCanvas: HTMLCanvasElement;
let scoreDisplayElement: HTMLElement;
let introScreen: HTMLElement, gameArea: HTMLElement, gameOverScreen: HTMLElement, leaderboardScreen: HTMLElement, pauseOverlay: HTMLElement;
let startGameBtn: HTMLButtonElement, leaderboardBtn: HTMLButtonElement, pauseGameBtn: HTMLButtonElement, resumeGameBtn: HTMLButtonElement, restartGameBtn: HTMLButtonElement, mainMenuBtn: HTMLButtonElement, backToIntroBtn: HTMLButtonElement, pauseMainMenuBtn: HTMLButtonElement;
let usernameInput: HTMLInputElement;
let countdownDisplay: HTMLElement;
let finalScoreMessageElement: HTMLElement, playerRankMessageElement: HTMLElement, gameOverFeedbackElement: HTMLElement;
let leaderboardListElement: HTMLOListElement, noScoresMessageElement: HTMLElement;

// --- Sahne, Kamera, Renderer ---
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;

// --- Oyun Nesneleri ---
let player: THREE.Mesh, princess: THREE.Mesh;
const enemies: THREE.Mesh[] = [];
const enemyImagePaths = ['/enemies/stego.png', '/enemies/tha.png', '/enemies/trex.png'];
const playerSize = 1.5, princessSize = 2, enemySize = 1.5;

// --- MediaPipe & Dokular ---
let hands: Hands, textureLoader: THREE.TextureLoader;

// --- Oyun Durumu ---
type GameState = 'intro' | 'playing' | 'paused' | 'countdown' | 'gameOver' | 'leaderboard';
let gameState: GameState = 'intro';
let score = 0, lastEnemySpawnTime = 0, gameLoopId: number, currentUsername: string | null = null, countdownInterval: number, countdownValue: number;

// --- Zorluk Ayarları ---
const BASE_ENEMY_SPEED = 0.03, MAX_ENEMY_SPEED = 0.15, SPEED_INCREASE_PER_N_SCORE = 100, SPEED_INCREMENT = 0.008;
const BASE_ENEMY_SPAWN_INTERVAL = 2000, MIN_ENEMY_SPAWN_INTERVAL = 500, SPAWN_DECREASE_PER_N_SCORE = 80, SPAWN_INTERVAL_DECREMENT = 100;
let currentEnemySpeed = BASE_ENEMY_SPEED, currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;

// --- Liderlik Tablosu ---
const LEADERBOARD_KEY = 'prensesiKoruLeaderboard_v2';
const MAX_LEADERBOARD_ENTRIES = 10;
interface LeaderboardEntry { name: string; score: number; }

// --- TEMEL FONKSİYONLAR ---
function showScreen(screenToShow: HTMLElement) {
    [introScreen, gameArea, gameOverScreen, leaderboardScreen].forEach(s => s.classList.toggle('active', s === screenToShow));
    pauseOverlay.classList.remove('active');
}

function initApp() {
    videoElement = document.getElementById('video') as HTMLVideoElement;
    gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    scoreDisplayElement = document.getElementById('scoreDisplay') as HTMLElement;
    introScreen = document.getElementById('introScreen') as HTMLElement;
    gameArea = document.getElementById('gameArea') as HTMLElement;
    gameOverScreen = document.getElementById('gameOverScreen') as HTMLElement;
    leaderboardScreen = document.getElementById('leaderboardScreen') as HTMLElement;
    pauseOverlay = document.getElementById('pauseOverlay') as HTMLElement;
    startGameBtn = document.getElementById('startGameBtn') as HTMLButtonElement;
    leaderboardBtn = document.getElementById('leaderboardBtn') as HTMLButtonElement;
    pauseGameBtn = document.getElementById('pauseGameBtn') as HTMLButtonElement;
    resumeGameBtn = document.getElementById('resumeGameBtn') as HTMLButtonElement;
    restartGameBtn = document.getElementById('restartGameBtn') as HTMLButtonElement;
    mainMenuBtn = document.getElementById('mainMenuBtn') as HTMLButtonElement;
    backToIntroBtn = document.getElementById('backToIntroBtn') as HTMLButtonElement;
    pauseMainMenuBtn = document.getElementById('pauseMainMenuBtn') as HTMLButtonElement;
    usernameInput = document.getElementById('usernameInput') as HTMLInputElement;
    countdownDisplay = document.getElementById('countdownDisplay') as HTMLElement;
    finalScoreMessageElement = document.getElementById('finalScoreMessage') as HTMLElement;
    playerRankMessageElement = document.getElementById('playerRankMessage') as HTMLElement;
    gameOverFeedbackElement = document.getElementById('gameOverFeedback') as HTMLElement;
    leaderboardListElement = document.getElementById('leaderboardList') as HTMLOListElement;
    noScoresMessageElement = document.getElementById('noScoresMessage') as HTMLElement;

    startGameBtn.addEventListener('click', startGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    pauseGameBtn.addEventListener('click', handlePauseGame);
    resumeGameBtn.addEventListener('click', startResumeCountdown);
    restartGameBtn.addEventListener('click', restartGame);
    mainMenuBtn.addEventListener('click', goToMainMenu);
    backToIntroBtn.addEventListener('click', goToMainMenu);
    pauseMainMenuBtn.addEventListener('click', goToMainMenu);
    window.addEventListener('resize', onWindowResize, false);

    showIntroScreen();
}

// --- OYUN BAŞLATMA VE DURUM YÖNETİMİ ---
function startGame() {
    currentUsername = usernameInput.value.trim() || null;
    showScreen(gameArea);
    videoElement.style.display = 'block';

    if (!scene) initThreeJS();
    if (!hands || videoElement.srcObject === null) initMediaPipe();

    resetGameVariables();
    gameState = 'playing';
    pauseGameBtn.style.display = 'inline-flex';

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    animate();
    if (videoElement.readyState >= videoElement.HAVE_METADATA && !videoElement.paused && videoElement.srcObject) {
        if (gameState === 'playing') sendToMediaPipe();
    }
}

function resetGameVariables() {
    score = 0; updateScoreDisplay();
    enemies.forEach(e => scene.remove(e)); enemies.length = 0;
    lastEnemySpawnTime = Date.now();
    currentEnemySpeed = BASE_ENEMY_SPEED; currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
    if (player) player.position.set(0, -2, 0);
    if (princess) princess.position.set(0, 0, 0);
    if (countdownInterval) clearInterval(countdownInterval);
}

function handlePauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    pauseOverlay.classList.add('active');
    resumeGameBtn.style.display = 'inline-flex';
    countdownDisplay.textContent = '';
    countdownDisplay.style.display = 'none';
}

function startResumeCountdown() {
    resumeGameBtn.style.display = 'none';
    countdownDisplay.style.display = 'block';
    countdownValue = 3;
    countdownDisplay.textContent = String(countdownValue);
    gameState = 'countdown';

    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            countdownDisplay.textContent = String(countdownValue);
        } else {
            clearInterval(countdownInterval);
            resumeGame();
        }
    }, 1000);
}

function resumeGame() {
    pauseOverlay.classList.remove('active');
    gameState = 'playing';
    animate();
    sendToMediaPipe();
}

function triggerGameOver() {
    gameState = 'gameOver';
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (countdownInterval) clearInterval(countdownInterval);

    finalScoreMessageElement.innerText = `Son Skor: ${score}`;
    gameOverFeedbackElement.innerText = getGameOverFeedback(score);
    pauseGameBtn.style.display = 'none';

    if (currentUsername) {
        addToLeaderboard(currentUsername, score);
        const rank = getPlayerRank(currentUsername, score);
        playerRankMessageElement.textContent = rank !== -1 ? `Tebrikler ${escapeHtml(currentUsername)}! Liderlik tablosunda ${rank}. sıradasınız.` : '';
        playerRankMessageElement.style.display = rank !== -1 ? 'block' : 'none';
    } else {
        playerRankMessageElement.style.display = 'none';
    }
    showScreen(gameOverScreen);
}

function showIntroScreen() {
    gameState = 'intro';
    showScreen(introScreen);
    videoElement.style.display = 'none';
    pauseGameBtn.style.display = 'none';
    usernameInput.value = ''; 

    if (videoElement.srcObject) {
        (videoElement.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}
function restartGame() { startGame(); }
function goToMainMenu() { showIntroScreen(); }

// --- THREE.JS VE MEDIAPIPE ---
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    textureLoader = new THREE.TextureLoader();

    const playerGeometry = new THREE.BoxGeometry(playerSize, playerSize, 0);
    const playerTexture = textureLoader.load('/fire.png');
    const playerMaterial = new THREE.MeshBasicMaterial({ map: playerTexture, transparent: true });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(player);

    const princessGeometry = new THREE.BoxGeometry(princessSize, princessSize, 0);
    const princessTexture = textureLoader.load('/princess.png');
    const princessMaterial = new THREE.MeshBasicMaterial({ map: princessTexture, transparent: true });
    princess = new THREE.Mesh(princessGeometry, princessMaterial);
    princess.position.set(0, 0, 0);
    scene.add(princess);
}
function initMediaPipe() {
    hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onHandResults);
    
   
    const startCamera = async () => {
        try {
            
            if (videoElement.srcObject) {
                const currentStream = videoElement.srcObject as MediaStream;
                currentStream.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            }

            
            const constraints = {
                video: {
                    width: { ideal: 640, min: 320 },
                    height: { ideal: 480, min: 240 },
                    facingMode: 'user',
                    frameRate: { ideal: 30, min: 15 }
                },
                audio: false
            };

            
            let stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                videoElement.play().then(() => {
                    console.log('Kamera başarıyla başlatıldı');
                    if (['playing', 'paused', 'countdown'].includes(gameState)) {
                        sendToMediaPipe();
                    }
                }).catch(e => {
                    console.error("Video oynatma hatası:", e);
                    
                    setTimeout(() => {
                        if (videoElement.readyState >= videoElement.HAVE_METADATA) {
                            videoElement.play().catch(console.error);
                        }
                    }, 1000);
                });
            };

        } catch (err: any) {
            console.error('Kamera erişim hatası:', err);
            
            
            let errorMessage = "Kamera erişimi reddedildi.";
            
            if (err.name === 'NotAllowedError') {
                errorMessage = "Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.";
            } else if (err.name === 'NotFoundError') {
                errorMessage = "Kamera bulunamadı. Lütfen kamera bağlantınızı kontrol edin.";
            } else if (err.name === 'NotReadableError') {
                errorMessage = "Kamera başka bir uygulama tarafından kullanılıyor.";
            } else if (err.name === 'OverconstrainedError') {
                errorMessage = "Kamera istenen özellikleri desteklemiyor.";
            } else if (err.name === 'SecurityError') {
                errorMessage = "Güvenlik nedeniyle kamera erişimi engellendi.";
            } else if (err.name === 'AbortError') {
                errorMessage = "Kamera erişimi iptal edildi.";
            }

            
            const userConfirmed = confirm(`${errorMessage}\n\nDevam etmek istiyor musunuz? (Kamera olmadan oyun çalışmayacak)`);
            
            if (userConfirmed) {
                
                try {
                    const simpleConstraints = { video: true, audio: false };
                    const stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
                    videoElement.srcObject = stream;
                    videoElement.onloadedmetadata = () => {
                        videoElement.play().catch(console.error);
                        if (['playing', 'paused', 'countdown'].includes(gameState)) {
                            sendToMediaPipe();
                        }
                    };
                } catch (retryErr) {
                    console.error('İkinci deneme de başarısız:', retryErr);
                    alert("Kamera erişimi sağlanamadı. Lütfen tarayıcı ayarlarınızı kontrol edin ve sayfayı yenileyin.");
                    goToMainMenu();
                }
            } else {
                goToMainMenu();
            }
        }
    };

   
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        startCamera();
    } else {
        console.error('getUserMedia desteklenmiyor');
        alert("Tarayıcınız kamera erişimini desteklemiyor. Lütfen modern bir tarayıcı kullanın.");
        goToMainMenu();
    }
}
async function sendToMediaPipe() {
    if (gameState !== 'playing' || !videoElement.videoWidth || videoElement.paused || !videoElement.srcObject) {
        if ((gameState === 'playing' || gameState === 'countdown') && videoElement.srcObject) requestAnimationFrame(sendToMediaPipe);
        return;
    }
    try { await hands.send({ image: videoElement }); } catch (error) { console.error("MediaPipe send error:", error); }
    if (gameState === 'playing') requestAnimationFrame(sendToMediaPipe);
}
function onHandResults(results: HandResults) {
    if (gameState !== 'playing' || !player) return;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handPoint = results.multiHandLandmarks[0][9];
        if (handPoint) {
            const screenX = (1 - handPoint.x) * window.innerWidth; const screenY = handPoint.y * window.innerHeight;
            const mouseX = (screenX / window.innerWidth) * 2 - 1; const mouseY = -(screenY / window.innerHeight) * 2 + 1;
            const vector = new THREE.Vector3(mouseX, mouseY, 0.5); vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize(); const distance = -camera.position.z / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));
            player.position.lerp(new THREE.Vector3(pos.x, pos.y, player.position.z), 0.3);
        }
    }
}

// --- DÜŞMAN VE OYUN MANTIĞI ---
function spawnEnemy() {
    if (gameState !== 'playing' || !textureLoader) return;
    const enemyGeometry = new THREE.BoxGeometry(enemySize, enemySize, 0);
    const randomImagePath = enemyImagePaths[Math.floor(Math.random() * enemyImagePaths.length)];
    const enemyTexture = textureLoader.load(randomImagePath);
    const enemyMaterial = new THREE.MeshBasicMaterial({ map: enemyTexture, transparent: true, alphaTest: 0.5 });
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    const edge = Math.floor(Math.random() * 4);
    const worldHalfWidth = (window.innerWidth / window.innerHeight) * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldHalfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const spawnOffset = enemySize * 1.5;
    switch (edge) {
        case 0: enemy.position.set(THREE.MathUtils.randFloat(-worldHalfWidth, worldHalfWidth), worldHalfHeight + spawnOffset, 0); break;
        case 1: enemy.position.set(THREE.MathUtils.randFloat(-worldHalfWidth, worldHalfWidth), -worldHalfHeight - spawnOffset, 0); break;
        case 2: enemy.position.set(-worldHalfWidth - spawnOffset, THREE.MathUtils.randFloat(-worldHalfHeight, worldHalfHeight), 0); break;
        case 3: enemy.position.set(worldHalfWidth + spawnOffset, THREE.MathUtils.randFloat(-worldHalfHeight, worldHalfHeight), 0); break;
    }
    enemies.push(enemy); scene.add(enemy);
}
function updateEnemies() {
    if (gameState !== 'playing' || !princess || !player) return;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]; if (!enemy) continue;
        const direction = new THREE.Vector3().subVectors(princess.position, enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(currentEnemySpeed));
        if (enemy.position.distanceTo(princess.position) < (princessSize / 2 + enemySize / 2) * 0.7) { triggerGameOver(); return; }
        if (player.position.distanceTo(enemy.position) < (playerSize / 2 + enemySize / 2) * 0.7) {
            scene.remove(enemy); enemies.splice(i, 1); score += 50;
            updateScoreDisplay(); updateDifficulty();
        }
    }
}
function updateDifficulty() {
    
    currentEnemySpeed = Math.min(MAX_ENEMY_SPEED, BASE_ENEMY_SPEED + Math.floor(score / SPEED_INCREASE_PER_N_SCORE) * SPEED_INCREMENT);
    
    
    currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - Math.floor(score / SPAWN_DECREASE_PER_N_SCORE) * SPAWN_INTERVAL_DECREMENT);
}
function updateScoreDisplay() { if (scoreDisplayElement) scoreDisplayElement.innerText = `Skor: ${score}`; }
function getGameOverFeedback(currentScore: number): string {
    if (currentScore > 1000) return "Efsanevi Koruyucu!"; if (currentScore > 750) return "Harikasın! Gerçek bir kahramansın!";
    if (currentScore > 500) return "Çok iyi iş! Prenses sana minnettar."; if (currentScore > 250) return "İyi denemeydi! Giderek ustalaşıyorsun.";
    if (currentScore > 100) return "Fena değil! Biraz daha pratikle daha iyisi olur."; return "Prensesi koruyamadın... Pes etme, tekrar dene!";
}

// --- LİDERLİK TABLOSU FONKSİYONLARI ---
function loadLeaderboard(): LeaderboardEntry[] {
    const storedBoard = localStorage.getItem(LEADERBOARD_KEY);
    return storedBoard ? JSON.parse(storedBoard) : [];
}
function saveLeaderboard(board: LeaderboardEntry[]): void {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
}
function addToLeaderboard(name: string, newScore: number): void {
    const board = loadLeaderboard();
    const existingPlayerIndex = board.findIndex(entry => entry.name === name);
    if (existingPlayerIndex !== -1) {
        if (newScore > board[existingPlayerIndex].score) board[existingPlayerIndex].score = newScore;
        else return;
    } else {
        board.push({ name, score: newScore });
    }
    board.sort((a, b) => b.score - a.score);
    saveLeaderboard(board.slice(0, MAX_LEADERBOARD_ENTRIES));
}
function getPlayerRank(name: string, playerScore: number): number {
    const board = loadLeaderboard();
    const playerEntry = board.find(entry => entry.name === name && entry.score === playerScore);
    if (!playerEntry) return -1;
    let rank = 1;
    for (const entry of board) {
        if (entry.score > playerScore) rank++;
        else if (entry.score === playerScore && entry.name === name) return rank;
    }
    return rank;
}
function displayLeaderboard(): void {
    const board = loadLeaderboard();
    leaderboardListElement.innerHTML = '';
    if (board.length === 0) { noScoresMessageElement.style.display = 'block'; return; }
    noScoresMessageElement.style.display = 'none';

    let currentVisualRank = 0;
    let actualRankBoundaryScore: number | null = null;

    board.forEach((entry) => {
        if (actualRankBoundaryScore === null || entry.score < actualRankBoundaryScore) {
            currentVisualRank++;
            actualRankBoundaryScore = entry.score;
        }

        const listItem = document.createElement('li');
        let rankIconHtml = '';
        if (currentVisualRank === 1) rankIconHtml = `<i class="fas fa-trophy rank-icon gold"></i>`;
        else if (currentVisualRank === 2) rankIconHtml = `<i class="fas fa-medal rank-icon silver"></i>`;
        else if (currentVisualRank === 3) rankIconHtml = `<i class="fas fa-award rank-icon bronze"></i>`;
        else rankIconHtml = `<span class="rank-number">${currentVisualRank}.</span>`;

        listItem.innerHTML = `
            ${rankIconHtml}
            <span class="name">${escapeHtml(entry.name)}</span>
            <span class="score">${entry.score} Puan</span>
        `;
        if(currentVisualRank <=3) listItem.classList.add(`rank-${currentVisualRank}`);
        leaderboardListElement.appendChild(listItem);
    });
}
function escapeHtml(unsafe: string): string {
    return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "").replace(/'/g, "'");
}
function showLeaderboard() {
    gameState = 'leaderboard';
    displayLeaderboard();
    showScreen(leaderboardScreen);
}

// --- PENCERE VE ANİMASYON DÖNGÜSÜ ---
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
function animate() {
    gameLoopId = requestAnimationFrame(animate);
    if (gameState === 'playing') {
        const currentTime = Date.now();
        if (currentTime - lastEnemySpawnTime > currentEnemySpawnInterval) {
            spawnEnemy(); lastEnemySpawnTime = currentTime;
        }
        updateEnemies();
    }
    if (scene && camera && renderer) renderer.render(scene, camera);
}

// --- UYGULAMAYI BAŞLAT ---
initApp();