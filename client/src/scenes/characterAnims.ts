// 캐릭터별 4방향 walk 애니메이션 등록 헬퍼 (mesa 에서 단순화).
// 키 규칙: `${character}:walk_${dir}` (예: student:walk_down)
// 1인 플레이라 슬롯 개념은 빠지고, 등록된 모든 텍스처에 대해 일괄 등록.

import Phaser from 'phaser';
import { useTouchControlsStore } from '@/store/useTouchControlsStore';

const DIR_ROWS = [
  { dir: 'down' as const, start: 0, end: 5 },
  { dir: 'up' as const, start: 6, end: 11 },
  { dir: 'right' as const, start: 12, end: 17 },
  { dir: 'left' as const, start: 18, end: 23 },
];

export type WalkDir = 'down' | 'up' | 'right' | 'left';

export const animKey = (character: string, dir: WalkDir): string =>
  `${character}:walk_${dir}`;

// 주어진 캐릭터 ID 들에 대해 4방향 walk 애니메이션 등록.
// 텍스처가 로드되지 않은 키는 스킵 (BootScene 에서 로드 실패해도 안전).
export const ensureCharacterAnimations = (
  scene: Phaser.Scene,
  characterIds: string[]
) => {
  for (const id of characterIds) {
    if (!scene.textures.exists(id)) continue;
    for (const r of DIR_ROWS) {
      const key = animKey(id, r.dir);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(id, {
          start: r.start,
          end: r.end,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
};

// 입력 통합 — 가상 조이스틱이 활성이면 그것 우선, 아니면 cursor keys 사용.
const JOY_DEADZONE = 0.18;

export const readMovementInput = (
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  speed: number
): { vx: number; vy: number; dir: WalkDir | null } => {
  const { joyX, joyY } = useTouchControlsStore.getState();
  const mag = Math.hypot(joyX, joyY);
  if (mag > JOY_DEADZONE) {
    const vx = joyX * speed;
    const vy = joyY * speed;
    let dir: WalkDir;
    if (Math.abs(joyX) > Math.abs(joyY)) {
      dir = joyX < 0 ? 'left' : 'right';
    } else {
      dir = joyY < 0 ? 'up' : 'down';
    }
    return { vx, vy, dir };
  }
  let vx = 0;
  let vy = 0;
  let dir: WalkDir | null = null;
  if (cursors.left.isDown) { vx = -speed; dir = 'left'; }
  else if (cursors.right.isDown) { vx = speed; dir = 'right'; }
  if (cursors.up.isDown) { vy = -speed; dir = dir ?? 'up'; }
  else if (cursors.down.isDown) { vy = speed; dir = dir ?? 'down'; }
  return { vx, vy, dir };
};
