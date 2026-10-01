import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private isReelSpinning: boolean[] = [false, false, false];
    
    // リール画像オブジェクト
    private reelSprites: Phaser.GameObjects.Image[] = [];
    private reelYPositions: number[] = [0, 0, 0]; // 各リールのスクロール位置
    
    // ステータス管理
    private currentCoins: number = 0;
    private currentGames: number = 30;
    private isUpperRush: boolean = false;
    
    private isBonus: boolean = false;
    private bonusGames: number = 0;

    private coinText!: Phaser.GameObjects.Text;
    private gameText!: Phaser.GameObjects.Text;
    private modeText!: Phaser.GameObjects.Text;

    private currentRole: string = 'HAZURE';
    private correctPress: { position: 'LEFT' | 'CENTER' | 'RIGHT', symbol: 'RED' | 'BLUE' } = { position: 'LEFT', symbol: 'RED' };
    private playerPress: { position: 'LEFT' | 'CENTER' | 'RIGHT' | null, symbol: 'RED' | 'BLUE' | null } = { position: null, symbol: null };

    private selectPosText!: Phaser.GameObjects.Text;
    private selectSymText!: Phaser.GameObjects.Text;

    constructor() {
        super('MainScene');
    }

    preload() {
        // --- ✂️ 切り出したリール画像のロード ---
        this.load.image('reel_left', 'assets/reel_left.jpg');
        this.load.image('reel_center', 'assets/reel_center.jpg');
        this.load.image('reel_right', 'assets/reel_right.jpg');
    }

    create() {
        // --- ① 筐体風の背景 ---
        this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

        // --- ② 上部：メイン液晶ウィンドウ ---
        this.add.rectangle(400, 150, 520, 180, 0x0a0a0a)
            .setStrokeStyle(6, 0xd4af37);
        this.add.rectangle(400, 150, 500, 160, 0x051525);

        this.statusText = this.add.text(400, 95, '【 下位RUSH: 約30%ナビ ＆ 自力6択 】', {
            fontSize: '15px',
            color: '#ffcc00',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        this.modeText = this.add.text(400, 125, 'モード: 下位RUSH (純増約2.5〜3枚)', {
            fontSize: '13px',
            color: '#00ffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        this.gameText = this.add.text(200, 185, '残りG: 30G', { fontSize: '15px', color: '#ffffff' });
        this.coinText = this.add.text(460, 185, '獲得枚数: 0枚', { fontSize: '15px', color: '#00ffcc' });

        this.selectPosText = this.add.text(200, 210, '第1停止: [ 未選択 ]', { fontSize: '13px', color: '#ff99ff' });
        this.selectSymText = this.add.text(460, 210, '絵柄: [ 未選択 ]', { fontSize: '13px', color: '#ff99ff' });

// --- ③ 中部：リアルリール窓エリア ＆ マスク処理 ---
        const reelXCoords = [310, 400, 490]; 
        const reelKeys = ['reel_left', 'reel_center', 'reel_right'];

        // リール窓のサイズ
        const windowWidth = 320;
        const windowHeight = 140;

        // 1. マスク専用のシェイプ（長方形）をグラフィックスで作る
        const rect = this.add.graphics();
        rect.fillStyle(0xffffff, 1);
        rect.fillRect(400 - windowWidth / 2, 330 - windowHeight / 2, windowWidth, windowHeight);
        
        // 2. このグラフィックスからジオメトリマスクを生成
        const reelMask = new Phaser.Display.Masks.GeometryMask(this, rect);

        // リール窓の枠（見た目の枠線）
        this.add.rectangle(400, 330, windowWidth, windowHeight, 0x111111)
            .setStrokeStyle(4, 0xffd700);

        this.reelSprites = [];
        for (let i = 0; i < 3; i++) {
            const x = reelXCoords[i];
            
            // コンテナを作成
            const container = this.add.container(x, 330);
            
            // リール画像を生成
            const reelImg = this.add.image(0, 0, reelKeys[i]);
            reelImg.setScale(0.45);
            
            container.add(reelImg);
            
            // 3. コンテナ（または画像）にマスクをセット
            container.setMask(reelMask);

            this.reelSprites.push(reelImg);
        }

        // --- ④ 下部：6択操作パネル ＆ ボタン類 ---
        this.add.text(140, 410, '【 第1停止を選択 】', { fontSize: '12px', color: '#aaaaaa' });
        const positions: ('LEFT' | 'CENTER' | 'RIGHT')[] = ['LEFT', 'CENTER', 'RIGHT'];
        const posLabels = ['左から', '中から', '右から'];
        positions.forEach((pos, idx) => {
            const btn = this.add.rectangle(100 + (idx * 90), 445, 80, 35, 0x0055cc)
                .setInteractive().setStrokeStyle(1, 0xffffff);
            this.add.text(100 + (idx * 90), 445, posLabels[idx], { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
            btn.on('pointerdown', () => {
                this.playerPress.position = pos;
                this.selectPosText.setText(`第1停止: [ ${posLabels[idx]} ]`);
            });
        });

        this.add.text(460, 410, '【 狙う絵柄を選択 】', { fontSize: '12px', color: '#aaaaaa' });
        const symbols: ('RED' | 'BLUE')[] = ['RED', 'BLUE'];
        const symLabels = ['赤7', '青7'];
        symbols.forEach((sym, idx) => {
            const btn = this.add.rectangle(480 + (idx * 90), 445, 80, 35, idx === 0 ? 0xcc0000 : 0x0044cc)
                .setInteractive().setStrokeStyle(1, 0xffffff);
            this.add.text(480 + (idx * 90), 445, symLabels[idx], { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
            btn.on('pointerdown', () => {
                this.playerPress.symbol = sym;
                this.selectSymText.setText(`絵柄: [ ${symLabels[idx]} ]`);
            });
        });

        const leverButton = this.add.rectangle(160, 520, 150, 45, 0xcc2200)
            .setInteractive().setStrokeStyle(2, 0xffffff);
        this.add.text(160, 520, '🚀 レバーON (勝負)', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
        leverButton.on('pointerdown', () => this.onLeverOn());

        const bonusBtn = this.add.rectangle(380, 520, 160, 45, 0xff8800)
            .setInteractive().setStrokeStyle(2, 0xffffff);
        this.add.text(380, 520, '🔥 疑似ボーナス突入(20G)', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
        bonusBtn.on('pointerdown', () => {
            this.isBonus = true;
            this.bonusGames = 20;
            this.modeText.setText('🔥 モード: 疑似ボーナス中 (全ナビ高速消化 20G)');
            this.modeText.setColor('#ff3300');
            this.statusText.setText('【 演出: 太陽のボーナス当選！ 20G間全ナビ発生！ 】');
        });

        const modeBtn = this.add.rectangle(630, 520, 150, 45, 0x880088)
            .setInteractive().setStrokeStyle(2, 0xffffff);
        this.add.text(630, 520, '上位RUSH切替', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
        modeBtn.on('pointerdown', () => {
            this.isUpperRush = !this.isUpperRush;
            if (!this.isBonus) {
                this.modeText.setText(this.isUpperRush ? 'モード: 上位RUSH (純増約10枚・全ナビ)' : 'モード: 下位RUSH (約30%ナビ＋自力6択)');
                this.modeText.setColor(this.isUpperRush ? '#ff00ff' : '#00ffff');
            }
        });

        const stopConfigs = [{ x: 310, index: 0 }, { x: 400, index: 1 }, { x: 490, index: 2 }];
        stopConfigs.forEach((conf) => {
            const btn = this.add.rectangle(conf.x, 570, 70, 25, 0x333333)
                .setInteractive().setStrokeStyle(1, 0xffffff);
            this.add.text(conf.x, 570, `STOP ${conf.index + 1}`, { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5, 0.5);
            btn.on('pointerdown', () => this.stopReel(conf.index));
        });
    }

    update() {
        // --- 🔄 リール回転中のスクロール処理 ---
        for (let i = 0; i < 3; i++) {
            if (this.isReelSpinning[i]) {
                this.reelYPositions[i] += 25; // 回転スピード
                if (this.reelYPositions[i] > 300) {
                    this.reelYPositions[i] = 0;
                }
                this.reelSprites[i].y = 330 + (this.reelYPositions[i] % 150);
            }
        }
    }

    private onLeverOn() {
        if (this.isReelSpinning.some(s => s)) return;
        if (this.currentGames <= 0 && !this.isBonus) {
            this.statusText.setText('【 RUSH終了 】');
            return;
        }

        if (this.isBonus) {
            this.bonusGames--;
            if (this.bonusGames <= 0) {
                this.isBonus = false;
                this.modeText.setText('モード: 下位RUSH (約30%ナビ＋自力6択)');
                this.modeText.setColor('#00ffff');
                this.statusText.setText('【 疑似ボーナス終了 通常RUSHへ戻ります 】');
            } else {
                this.statusText.setText(`🔥 【 疑似ボーナス中 残り ${this.bonusGames}G (全ナビ) 】`);
            }
        } else {
            this.currentGames--;
            this.gameText.setText(`残りG: ${this.currentGames}G`);
        }

        const posList: ('LEFT' | 'CENTER' | 'RIGHT')[] = ['LEFT', 'CENTER', 'RIGHT'];
        const symList: ('RED' | 'BLUE')[] = ['RED', 'BLUE'];
        this.correctPress = {
            position: posList[Math.floor(Math.random() * posList.length)],
            symbol: symList[Math.floor(Math.random() * symList.length)]
        };

        const rand = Math.random();
        if (rand < 0.75) {
            this.currentRole = 'BELL_6TAKU';
        } else if (rand < 0.85) {
            this.currentRole = 'REPLAY';
        } else {
            this.currentRole = 'HAZURE';
        }

        const isAssist = !this.isUpperRush && (Math.random() < 0.32);

        if (this.isBonus || this.isUpperRush || isAssist) {
            this.playerPress = { ...this.correctPress };
            const pStr = this.correctPress.position === 'LEFT' ? '左' : this.correctPress.position === 'CENTER' ? '中' : '右';
            const sStr = this.correctPress.symbol === 'RED' ? '赤7' : '青7';
            
            if (this.isBonus) {
                this.statusText.setText(`🔥 【 ボーナス中全ナビ！ [ ${pStr}から ${sStr} ] 】`);
            } else if (this.isUpperRush) {
                this.statusText.setText(`【 🌟上位全ナビ！ [ ${pStr}から ${sStr} ] 】`);
            } else {
                this.statusText.setText(`【 💡演出ナビ発生！ [ ${pStr}から ${sStr} ] 】`);
            }
        } else if (this.currentRole === 'BELL_6TAKU') {
            this.statusText.setText('【 6択ベル成立！ 位置と絵柄を自力で当てろ…！ 】');
        } else {
            this.statusText.setText('【 探索中… リールを停止させてください 】');
        }

        // リール回転スタート
        this.isReelSpinning = [true, true, true];
    }

    private stopReel(index: number) {
        if (!this.isReelSpinning[index]) return;
        this.isReelSpinning[index] = false;

        this.reelSprites[index].y = 330;

        const allStopped = this.isReelSpinning.every(s => !s);
        if (allStopped) {
            let payout = 0;
            let resultMessage = '';

            if (this.currentRole === 'REPLAY') {
                resultMessage = 'リプレイ（メダル±0 / ゲーム数再セット）';
                if (!this.isBonus) this.currentGames++;
            } else if (this.currentRole === 'BELL_6TAKU') {
                const isPosCorrect = (this.playerPress.position === this.correctPress.position);
                const isSymCorrect = (this.playerPress.symbol === this.correctPress.symbol);
                const isAllCorrect = isPosCorrect && isSymCorrect;

                const correctPosStr = this.correctPress.position === 'LEFT' ? '左' : this.correctPress.position === 'CENTER' ? '中' : '右';
                const correctSymStr = this.correctPress.symbol === 'RED' ? '赤7' : '青7';

                if (isAllCorrect || this.isUpperRush || this.isBonus) {
                    payout = 15;
                    resultMessage = `🎉 正解！ 払い出し +${payout}枚 (正解: ${correctPosStr}/${correctSymStr})`;
                } else {
                    payout = 0;
                    resultMessage = `❌ 不正解…（正解は ${correctPosStr}・${correctSymStr} でした）`;
                }
            } else {
                resultMessage = 'ハズレ 払い出し 0枚';
            }

            this.currentCoins += payout;
            this.coinText.setText(`獲得枚数: ${this.currentCoins}枚`);
            this.gameText.setText(`残りG: ${this.currentGames}G`);

            if (!this.isBonus) {
                this.statusText.setText(`【 ${resultMessage} 】`);
            }

            this.playerPress = { position: null, symbol: null };
            this.selectPosText.setText('第1停止: [ 未選択 ]');
            this.selectSymText.setText('絵柄: [ 未選択 ]');
        }
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'app',
    backgroundColor: '#111111',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);