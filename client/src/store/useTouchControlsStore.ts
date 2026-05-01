// 가상 조이스틱 + 자세 토글 상태. React 컴포넌트가 set, Phaser 씬이 매 프레임 read.

import { create } from 'zustand';

type TouchControlsStore = {
  joyX: number;       // -1..1 정규화
  joyY: number;       // -1..1
  crouching: boolean; // 낮은 자세 + 코 가림 (B 버튼 / C 키 홀드)
  setJoy: (x: number, y: number) => void;
  setCrouching: (c: boolean) => void;
};

export const useTouchControlsStore = create<TouchControlsStore>((set) => ({
  joyX: 0,
  joyY: 0,
  crouching: false,
  setJoy: (x, y) => set({ joyX: x, joyY: y }),
  setCrouching: (c) => set({ crouching: c }),
}));
