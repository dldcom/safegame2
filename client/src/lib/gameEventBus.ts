// Phaser 씬 ↔ React 오버레이 사이 이벤트 버스.
// Phaser 가 이미 의존성이므로 별도 mitt 추가 안 하고 내장 EventEmitter 사용.

import Phaser from 'phaser';
import type { Act } from '@shared/types/game';

export type GameEventMap = {
  // Phaser → React: NPC/오브젝트 근처 진입/이탈 (말풍선 / 인터랙션 힌트)
  'npc:proximityEnter': { npcKey: string; label?: string };
  'npc:proximityLeave': { npcKey: string };

  // Phaser → React: 체크포인트 시작 (10초 카운트다운 시작)
  'checkpoint:start': { act: Act; index: number; label: string };
  // Phaser → React: 카운트다운 매 초 갱신 (0 = 숨김)
  'checkpoint:countdown': { remaining: number };
  // Phaser → React: 체크포인트 결과
  'checkpoint:success': { act: Act; index: number };
  'checkpoint:failed': { act: Act; index: number; reason: string };

  // Phaser → React: 막 완료
  'act:completed': { act: Act };

  // React → Phaser: 카운트다운 만료 (시간 초과)
  'countdown:expired': { act: Act; index: number };
};

class TypedEventBus {
  private emitter = new Phaser.Events.EventEmitter();

  emit<K extends keyof GameEventMap>(event: K, payload?: GameEventMap[K]) {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ) {
    this.emitter.on(event, handler);
  }

  off<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ) {
    this.emitter.off(event, handler);
  }

  destroy() {
    this.emitter.removeAllListeners();
  }
}

export const gameEventBus = new TypedEventBus();
