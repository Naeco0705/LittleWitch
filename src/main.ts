import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private isReelSpinning: boolean[] = [false, false, false];
    private reelTexts: Phaser.GameObjects.Text[] = [];
    private targetSymbols = [1, 3, 5, 7, 2, 4, 6, 8];
    private spinTimer?: Phaser.Time.TimerEvent;
    
    // 秘宝伝風のステータス管理
    private currentCoins: number = 0;
    private currentGames: number = 30;
    private coinText!: Phaser.GameObjects.Text;
    private gameText!: Phaser.GameObjects.Text;

    constructor() {
        super('MainScene');
    }

    preload() {}

    create() {
        // --- ① 筐体風の背景（全体） ---
        this.add.rectangle(400, 300, 800, 600, 0x1a1a1a);

        // --- ② 上部：メイン液晶ウィンドウ（秘宝伝スタイル） ---
        // 液晶の枠（ゴールドの重厚なフレーム）
        this.add.rectangle(400, 160, 480, 200, 0x0a0a0a)
            .setStrokeStyle(6, 0xd4af37);

        // 液晶内部の背景（ステージやモードによって色を変えられるエリア）
        this.add.rectangle(400, 160, 460, 180, 0x051525); // 遺跡・冒険をイメージした深青色

        // 液晶内の演出テキスト（ステータスやモード）
        this.statusText = this.add.text(400, 120, '【 太陽のステージ 】', {
            fontSize: '20px',
            color: '#ffcc00',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        // 獲得枚数 ＆ 残りゲーム数の表示（液晶内下部）
        this.gameText = this.add.text(220, 210, '残りG: 30G', { fontSize: '16px', color: '#ffffff' });
        this.coinText = this.add.text(500, 210, '獲得枚数: 0枚', { fontSize: '16px', color: '#00ffcc' });

        // --- ③ 中部：リール窓エリア ---
        this.add.rectangle(400, 390, 320, 120, 0x111111)
            .setStrokeStyle(4, 0xffd700);

        this.reelTexts = [];
        for (let i = 0; i < 3; i++) {
            const x = 310 + (i * 90);
            
            // 各リールの背景
            this.add.rectangle(x, 390, 80, 100, 0x000000)
                .setStrokeStyle(2, 0x555555);

            const t = this.add.text(x, 390, '7', {
                fontSize: '40px',
                color: '#ff3333',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5);

            this.reelTexts.push(t);
        }

        // --- ④ 下部：操作ボタンエリア ---
        
        // スタート（レバー）ボタン
        const leverButton = this.add.rectangle(180, 520, 140, 50, 0xcc0000)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);
        
        this.add.text(180, 520, 'START / LEVER', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        leverButton.on('pointerdown', () => {
            if (this.isReelSpinning.some(s => s)) return;
            this.startSpin();
        });

        // STOPボタン（3つ）
        const stopConfigs = [
            { x: 310, index: 0 },
            { x: 400, index: 1 },
            { x: 490, index: 2 },
        ];

        stopConfigs.forEach((conf) => {
            const btn = this.add.rectangle(conf.x, 520, 70, 50, 0x0055cc)
                .setInteractive()
                .setStrokeStyle(2, 0xffffff);
            
            this.add.text(conf.x, 520, `STOP ${conf.index + 1}`, {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0.5);

            btn.on('pointerdown', () => {
                this.stopReel(conf.index);
            });
        });
    }

    // 回転開始
    private startSpin() {
        this.isReelSpinning = [true, true, true];
        this.statusText.setText('【 探索中… (回転中) 】');

        for (let i = 0; i < 3; i++) {
            this.reelTexts[i].setColor('#ff3333');
        }

        if (this.spinTimer) {
            this.spinTimer.remove();
        }

        this.spinTimer = this.time.addEvent({
            delay: 60,
            loop: true,
            callback: () => {
                for (let i = 0; i < 3; i++) {
                    if (this.isReelSpinning[i]) {
                        const randVal = this.targetSymbols[Math.floor(Math.random() * this.targetSymbols.length)];
                        this.reelTexts[i].setText(randVal.toString());
                    }
                }
            }
        });
    }

    // 個別リール停止
    private stopReel(index: number) {
        if (!this.isReelSpinning[index]) return;

        this.isReelSpinning[index] = false;
        const stopVal = Math.floor(Math.random() * 9) + 1;
        this.reelTexts[index].setText(stopVal.toString());
        this.reelTexts[index].setColor('#ffffff');

        const allStopped = this.isReelSpinning.every(s => !s);
        if (allStopped) {
            if (this.spinTimer) {
                this.spinTimer.remove();
            }
            
            // 簡易的にメダルとゲーム数を減らす・増やす演出のサンプル
            this.currentCoins += 15; // ベルや小役に見立てた払い出し
            this.currentGames = Math.max(0, this.currentGames - 1);
            
            this.coinText.setText(`獲得枚数: ${this.currentCoins}枚`);
            this.gameText.setText(`残りG: ${this.currentGames}G`);
            this.statusText.setText('【 小役入賞！ ＋15枚 】');
        } else {
            this.statusText.setText(`STOP ${index + 1} 停止`);
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

new Phaser.Game(config);