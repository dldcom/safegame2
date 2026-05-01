// 에셋 로딩 씬. /assets/ 폴더에서 캐릭터/아이템/맵 로드.
// 자산이 아직 없을 때도 안전하게 스킵 (404 는 경고만).

import Phaser from 'phaser';
import { CHARACTER_IDS } from '@shared/lib/characters';

// 향후 자산이 추가되면 여기에 등록만 하면 자동 로드.
// 캐릭터 = 6프레임×4방향 아틀라스 (48×64 프레임)
// 모든 캐릭터(6마리)는 assets/characters/ 하나에서 로드.
// 학생이 고른 캐릭터가 player, 나머지 5마리가 NPC 슬롯에 매핑됨.

// 아이템 = 32×32 (또는 명세된 크기)
const ITEMS = ['fire_alarm', 'door_safe', 'elevator', 'stairs'] as const;

// 맵 = 1280×1280 JPG + Tiled JSON
const MAPS = ['act1_library', 'act1_corridor', 'act1_playground'] as const;

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

    // 6마리 동물 캐릭터 (학생 1 + NPC 5 모두 같은 폴더에서)
    // _b 변형 = 기어가는 자세 (CP4 정답 후 자세 ON 시 텍스처 swap)
    for (const id of CHARACTER_IDS) {
      this.load.spritesheet(id, `/assets/characters/${id}.png`, {
        frameWidth: 48,
        frameHeight: 64,
      });
      this.load.spritesheet(`${id}_b`, `/assets/characters/${id}_b.png`, {
        frameWidth: 48,
        frameHeight: 64,
      });
    }

    for (const id of ITEMS) {
      this.load.image(id, `/assets/items/${id}.png`);
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
    // 1막 도서관 씬으로 진입. 추후 startAct registry 보고 분기.
    this.scene.start('Act1LibraryScene');
  }
}
