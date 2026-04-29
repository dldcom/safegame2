// 에셋 로딩 씬. /assets/ 폴더에서 캐릭터/NPC/아이템/맵 로드.
// 자산이 아직 없을 때도 안전하게 스킵 (404 는 경고만).

import Phaser from 'phaser';

// 향후 자산이 추가되면 여기에 등록만 하면 자동 로드.
// 캐릭터 = 6프레임×4방향 아틀라스 (48×64 프레임)
// NPC = 동일 포맷
// 아이템 = 32×32
// 맵 = 1280×1280 JPG + Tiled JSON

const PLAYER_CHARACTERS = ['student'] as const;
const NPCS = ['sibling'] as const;
const MAPS = ['act1_library'] as const;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x222b3b);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 20, 0x3b82f6);
    bar.setOrigin(0, 0.5);
    const label = this.add.text(width / 2, height / 2 - 40, '에셋 로딩 중…', {
      color: '#e5e7eb',
      fontSize: '16px',
      fontFamily: 'Pretendard, sans-serif',
    });
    label.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 400 * value;
    });

    for (const id of PLAYER_CHARACTERS) {
      this.load.spritesheet(id, `/assets/characters/${id}.png`, {
        frameWidth: 48,
        frameHeight: 64,
      });
    }

    for (const id of NPCS) {
      this.load.spritesheet(id, `/assets/npcs/${id}.png`, {
        frameWidth: 48,
        frameHeight: 64,
      });
    }

    for (const id of MAPS) {
      this.load.image(`map_${id}`, `/assets/maps/${id}.jpg`);
      this.load.json(`map_${id}_data`, `/assets/maps/${id}.json`);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[BootScene] 에셋 로드 실패 (계속 진행):', file.key);
    });
  }

  create() {
    // TODO: Act1Scene 구현 후 변경
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'BootScene 완료\n(씬 미구현)', {
      color: '#e5e7eb',
      fontSize: '20px',
      fontFamily: 'Pretendard, sans-serif',
      align: 'center',
    }).setOrigin(0.5);
  }
}
