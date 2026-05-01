// Phaser 게임 인스턴스 팩토리.
// React 의 GamePage 가 마운트되면서 이걸 호출해 Phaser 를 띄움.
// 1280x1280 정사각 맵 + 카메라 스크롤 (씬 안에서 cameras.main.startFollow).

import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import Act1LibraryScene from './scenes/Act1LibraryScene';
import Act1CorridorScene from './scenes/Act1CorridorScene';
import Act1PlaygroundScene from './scenes/Act1PlaygroundScene';
import type { Act } from '@shared/types/game';

export type SafeGameInit = {
  parent: string;
  startAct?: Act;
};

export const createPhaserGame = (opts: SafeGameInit): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720, // 화면 뷰포트 (16:9 일반 노트북·태블릿 가로). 맵 자체는 1280×1280.
    parent: opts.parent,
    backgroundColor: '#0a0e1a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: import.meta.env.DEV,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    scene: [BootScene, Act1LibraryScene, Act1CorridorScene, Act1PlaygroundScene],
  };
  const game = new Phaser.Game(config);
  game.registry.set('startAct', opts.startAct ?? 1);
  return game;
};
