// 미션 3: 손등 체크 — 손등/손바닥 아이콘 랜덤 등장. 손등만 터치.
// onResolve 시 페널티 정보 (손바닥 잘못 터치 횟수 + 하트 0 리셋 횟수) 전달.

import { create } from 'zustand';

type DoorMissionStore = {
  active: boolean;
  onResolve: ((palmTaps: number, resets: number) => void) | null;
  show: (onResolve: (palmTaps: number, resets: number) => void) => void;
  close: () => void;
};

export const useDoorMissionStore = create<DoorMissionStore>((set) => ({
  active: false,
  onResolve: null,
  show: (onResolve) => set({ active: true, onResolve }),
  close: () => set({ active: false, onResolve: null }),
}));
