// 친구 머리 위 짧은 말풍선 (Phaser).
// fade in → 일정 시간 유지 → fade out → destroy. 같은 sprite 위에 여러 개 띄우면
// 이전 것이 즉시 destroy 되어 한 번에 하나만 보임.

import Phaser from 'phaser';

const BUBBLE_DEPTH = 1100;
const PADDING_X = 8;
const PADDING_Y = 5;
const FONT_SIZE = 13;
const COLOR_BG = 0xfffbeb;
const COLOR_BORDER = 0x78350f;
const COLOR_TEXT = '#1c1917';

type AttachedBubble = Phaser.GameObjects.Container & { __safegameBubble?: true };

const activeBubbles = new WeakMap<Phaser.GameObjects.Sprite, AttachedBubble>();

export const showSpeechBubble = (
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Sprite,
  text: string,
  options: { holdMs?: number; offsetY?: number } = {}
): void => {
  const holdMs = options.holdMs ?? 1800;
  const offsetY = options.offsetY ?? -42;

  // 기존 풍선 즉시 제거
  const existing = activeBubbles.get(target);
  if (existing) {
    existing.destroy();
    activeBubbles.delete(target);
  }

  const label = scene.add.text(0, 0, text, {
    fontSize: `${FONT_SIZE}px`,
    color: COLOR_TEXT,
    fontFamily: 'Pretendard, sans-serif',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 220 },
  });
  label.setOrigin(0.5, 0.5);

  const w = Math.ceil(label.width) + PADDING_X * 2;
  const h = Math.ceil(label.height) + PADDING_Y * 2;

  const bg = scene.add.graphics();
  bg.fillStyle(COLOR_BG, 0.96);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
  bg.lineStyle(1.5, COLOR_BORDER, 1);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
  // 작은 꼬리 (아래 중앙)
  bg.fillStyle(COLOR_BG, 0.96);
  bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 5);
  bg.lineStyle(1.5, COLOR_BORDER, 1);
  bg.lineBetween(-5, h / 2 - 1, 0, h / 2 + 5);
  bg.lineBetween(0, h / 2 + 5, 5, h / 2 - 1);

  const container = scene.add.container(target.x, target.y + offsetY, [bg, label]) as AttachedBubble;
  container.__safegameBubble = true;
  container.setDepth(BUBBLE_DEPTH);
  container.setAlpha(0);

  activeBubbles.set(target, container);

  // 매 프레임 target 따라가게
  const followEvent = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (!target.active || !container.active) {
        followEvent.remove(false);
        return;
      }
      container.x = target.x;
      container.y = target.y + offsetY;
    },
  });

  // fade in
  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 180,
    ease: 'Sine.easeOut',
  });

  // hold → fade out → destroy
  scene.time.delayedCall(holdMs, () => {
    if (!container.active) return;
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeIn',
      onComplete: () => {
        followEvent.remove(false);
        if (activeBubbles.get(target) === container) {
          activeBubbles.delete(target);
        }
        container.destroy();
      },
    });
  });
};

export const clearSpeechBubble = (target: Phaser.GameObjects.Sprite): void => {
  const existing = activeBubbles.get(target);
  if (existing) {
    existing.destroy();
    activeBubbles.delete(target);
  }
};
