// Configuration du jeu Phaser
const config = {
    type: Phaser.AUTO, // Utilise le rendu WebGL si disponible, sinon utilise Canvas
    render: {
        pixelArt: true, // Active le rendu pixel art
        antialias: false, // Désactive l'anti-aliasing pour un rendu plus net
        willReadFrequently: true // Optimisation des lectures fréquentes
    },
    width: 800, // Largeur de la fenêtre de jeu
    height: 800, // Hauteur de la fenêtre de jeu
    physics: {
        default: 'arcade', // Utilise le moteur physique Arcade
        arcade: {
            debug: false, // Désactive le mode debug
            gravity: { y: 0 } // Désactive la gravité
        }
    },
    scene: { preload, create, update } // Scènes du jeu
};

// Variables globales
let player, projectiles, enemies = {}, lives = 3, score = 0, isPaused = false;
let startButton, gameOverScreen, scoreText, livesText, gameOverScoreText;
let enemyQueue = [];
const activeKeys = {};
const game = new Phaser.Game(config); // Initialisation du jeu Phaser

// Fonction pour précharger les ressources
function preload() {
    this.load.image('background', 'assets/Sprite fond shooter-Sheet.png'); // Chargement de l'image de fond
    this.load.spritesheet('player', 'assets/Sprite-player-Sheet.png', { frameWidth: 30, frameHeight: 30 }); // Chargement du spritesheet du joueur
    this.load.spritesheet('enemy', 'assets/sprite skel-Sheet.png', { frameWidth: 30, frameHeight: 30 }); // Chargement du spritesheet de l'ennemi
    this.load.spritesheet('alphabet', 'assets/Sprite-alphabet.png', { frameWidth: 9, frameHeight: 12 }); // Chargement du spritesheet des lettres
    this.load.image('projectile', 'assets/Sprite-projectile.png'); // Chargement de l'image du projectile
}

// Fonction pour créer les éléments du jeu
function create() {
    this.add.image(config.width / 2, config.height / 2, 'background').setDisplaySize(config.width, config.height); // Ajout de l'image de fond
    this.anims.create({
        key: 'enemy_move',
        frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 7 }),
        frameRate: 5,
        repeat: -1
    }); // Création de l'animation de l'ennemi
    this.anims.create({
        key: 'player_move',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 6 }),
        frameRate: 5,
        repeat: -1
    }); // Création de l'animation du joueur
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' }); // Ajout du texte du score
    livesText = this.add.text(10, 40, 'Lives: 3', { fontSize: '20px', fill: '#fff' }); // Ajout du texte des vies
    createStartMenu.call(this); // Création du menu de démarrage
}

// Fonction pour démarrer le jeu
function startGame() {
    startButton.destroy(); // Suppression du bouton de démarrage
    player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player').setCollideWorldBounds(true); // Ajout du joueur
    player.setOrigin(0.5, 0.5); // Définition de l'origine du joueur
    player.body.immovable = true; // Le joueur est immobile
    player.play('player_move'); // Lancement de l'animation du joueur
    projectiles = this.physics.add.group(); // Groupe des projectiles
    lives = 3; // Réinitialisation des vies
    enemies = {}; // Réinitialisation des ennemis
    isPaused = false; // Le jeu n'est pas en pause
    scoreText.setText('Score: 0'); // Réinitialisation du score
    livesText.setText('Lives: 3'); // Réinitialisation des vies
    createGameOverScreen.call(this); // Création de l'écran de game over

    this.time.addEvent({ delay: 1000, loop: true, callback: spawnEnemy, callbackScope: this }); // Ajout d'un événement pour générer des ennemis
    setupKeyboard.call(this); // Configuration du clavier
}

// Fonction pour générer un ennemi aléatoire
function spawnEnemy() {
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Génération d'une lettre aléatoire
    spawnEnemyWithLetter.call(this, randomLetter); // Appel de la fonction pour générer un ennemi avec la lettre
}

// Fonction pour générer un ennemi avec une lettre spécifique
function spawnEnemyWithLetter(letter) {
    if (isPaused) return; // Si le jeu est en pause, ne rien faire
    let radius = 400; // Rayon de génération des ennemis
    let angle = Phaser.Math.FloatBetween(0, 2 * Math.PI); // Angle aléatoire
    let x = player.x + radius * Math.cos(angle); // Position X de l'ennemi
    let y = player.y + radius * Math.sin(angle); // Position Y de l'ennemi
    let enemy = this.physics.add.sprite(x, y, 'enemy'); // Ajout de l'ennemi
    enemy.play('enemy_move'); // Lancement de l'animation de l'ennemi
    enemy.setScale(2); // Mise à l'échelle de l'ennemi

    if (x < config.width / 2) {
        enemy.setFlipX(true); // Inversion de l'ennemi si nécessaire
    }
    this.physics.moveToObject(enemy, player, 100); // Déplacement de l'ennemi vers le joueur

    let frameIndex = getLetterFrame(letter); // Obtention de l'index de la lettre
    let letterSprite = this.add.sprite(enemy.x, enemy.y - 40, 'alphabet', frameIndex); // Ajout du sprite de la lettre
    letterSprite.setScale(3); // Mise à l'échelle de la lettre

    enemy.letters = [letter]; // Association de la lettre à l'ennemi
    enemy.letterSprites = [letterSprite]; // Association du sprite de la lettre à l'ennemi
    enemy.isShot = false; // L'ennemi n'a pas encore été touché
    enemy.projectileFired = false; // Aucun projectile n'a encore été tiré vers cet ennemi

    if (!enemies[letter]) {
        enemies[letter] = []; // Initialisation du tableau d'ennemis pour cette lettre
    }
    enemies[letter].push(enemy); // Ajout de l'ennemi au tableau
    enemyQueue.push(enemy); // Ajout de l'ennemi à la file d'attente
}

// Fonction pour mettre à jour le jeu à chaque frame
function update() {
    if (isPaused) return; // Si le jeu est en pause, ne rien faire

    Object.keys(enemies).forEach(letter => {
        if (enemies[letter]) {
            enemies[letter].forEach(enemy => {
                if (enemy.active) {
                    // Mise à jour de la position des lettres pour suivre l'ennemi
                    enemy.letterSprites.forEach((sprite, i) => {
                        sprite.x = enemy.x;
                        sprite.y = enemy.y - 40 - i * 15;
                    });

                    // Vérification de la collision avec le joueur
                    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) < 30) {
                        handleEnemyCollision.call(this, enemy); // Appel de la fonction de gestion de collision
                    }
                }
            });
        }
    });

    // Vérification si une touche est pressée et tirer sur le premier ennemi correspondant
    Object.keys(activeKeys).forEach(letter => {
        if (activeKeys[letter].isDown && enemies[letter] && enemies[letter].length > 0) {
            let targetEnemy = enemies[letter][0]; // Premier ennemi avec la lettre
            if (!targetEnemy.projectileFired) { // Vérification si un projectile a déjà été tiré
                targetEnemy.isShot = true; // Marquer l'ennemi comme touché
                targetEnemy.projectileFired = true; // Marquer que le projectile a été tiré
                fireProjectile.call(this, targetEnemy); // Tirer le projectile
            }
        }
    });
}

// Fonction pour tirer un projectile vers un ennemi
function fireProjectile(targetEnemy) {
    let projectile = this.physics.add.sprite(player.x, player.y, 'projectile'); // Ajout du projectile
    projectile.setScale(1.5); // Mise à l'échelle du projectile
    this.physics.moveTo(projectile, targetEnemy.x, targetEnemy.y, 400); // Déplacement du projectile vers l'ennemi

    this.physics.add.collider(projectile, targetEnemy, (proj, enemy) => {
        if (enemy.active) {
            // Suppression des sprites des lettres
            enemy.letterSprites.forEach(sprite => sprite.destroy());
            enemy.letterSprites = [];

            enemy.destroy(); // Suppression de l'ennemi
            proj.destroy(); // Suppression du projectile

            let letter = enemy.letters[0]; // Lettre de l'ennemi
            let index = enemies[letter].indexOf(enemy); // Index de l'ennemi dans le tableau
            if (index !== -1) {
                enemies[letter].splice(index, 1); // Suppression de l'ennemi du tableau
            }

            score += 10; // Augmentation du score
            scoreText.setText('Score: ' + score); // Mise à jour du texte du score
        }
    });
}

// Fonction pour gérer la collision entre un ennemi et le joueur
function handleEnemyCollision(enemy) {
    if (!enemy || !enemy.active) return; // Si l'ennemi n'existe pas ou n'est pas actif, ne rien faire

    enemy.letterSprites.forEach(sprite => {
        if (sprite) sprite.destroy(); // Suppression des sprites des lettres
    });

    enemy.destroy(); // Suppression de l'ennemi
    let letter = enemy.letters[0]; // Lettre de l'ennemi
    let index = enemies[letter].indexOf(enemy); // Index de l'ennemi dans le tableau
    if (index !== -1) {
        enemies[letter].splice(index, 1); // Suppression de l'ennemi du tableau
    }

    lives -= 1; // Réduction des vies
    livesText.setText('Lives: ' + lives); // Mise à jour du texte des vies

    if (lives <= 0) {
        gameOver(); // Appel de la fonction de game over
    }
}

// Fonction pour obtenir l'index de la lettre dans le spritesheet
function getLetterFrame(letter) {
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Alphabet
    return alphabet.indexOf(letter.toUpperCase()); // Index de la lettre
}

// Fonction pour gérer le game over
function gameOver() {
    isPaused = true; // Mise en pause du jeu
    Object.keys(enemies).forEach(letter => {
        if (enemies[letter]) {
            enemies[letter].forEach(enemy => {
                enemy.letterSprites.forEach(sprite => sprite.destroy()); // Suppression des sprites des lettres
                enemy.destroy(); // Suppression de l'ennemi
            });
        }
    });
    enemies = {}; // Réinitialisation des ennemis
    gameOverScreen.setVisible(true); // Affichage de l'écran de game over
    gameOverScoreText.setText('Score: ' + score); // Mise à jour du score sur l'écran de game over
}

// Fonction pour redémarrer le jeu
function restartGame() {
    Object.keys(enemies).forEach(letter => {
        if (enemies[letter]) {
            enemies[letter].forEach(enemy => {
                enemy.letterSprites.forEach(sprite => sprite.destroy()); // Suppression des sprites des lettres
                enemy.destroy(); // Suppression de l'ennemi
            });
        }
    });
    enemies = {}; // Réinitialisation des ennemis
    lives = 3; // Réinitialisation des vies
    score = 0; // Réinitialisation du score
    scoreText.setText('Score: 0'); // Mise à jour du texte du score
    livesText.setText('Lives: 3'); // Mise à jour du texte des vies
    isPaused = false; // Le jeu n'est plus en pause
    gameOverScreen.setVisible(false); // Masquage de l'écran de game over
}

// Fonction pour créer le menu de démarrage
function createStartMenu() {
    startButton = this.add.text(400, 400, 'Start', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive(); // Ajout du bouton de démarrage
    startButton.on('pointerdown', startGame, this); // Ajout de l'événement de clic sur le bouton
}

// Fonction pour créer l'écran de game over
function createGameOverScreen() {
    gameOverScreen = this.add.container(400, 400).setVisible(false); // Ajout du conteneur de game over
    let bg = this.add.rectangle(0, 0, 400, 400, 0x000000, 0.8).setOrigin(0.5); // Ajout du fond du conteneur
    let retry = this.add.text(0, 0, 'Restart', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive() // Ajout du bouton de redémarrage
        .on('pointerdown', restartGame, this);
    gameOverScoreText = this.add.text(0, 50, 'Score: 0', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5); // Ajout du texte du score
    gameOverScreen.add([bg, retry, gameOverScoreText]); // Ajout des éléments au conteneur
}

// Fonction pour configurer le clavier
function setupKeyboard() {
    let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Alphabet
    letters.split('').forEach(letter => {
        activeKeys[letter] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[letter]); // Ajout des touches du clavier
    });
}