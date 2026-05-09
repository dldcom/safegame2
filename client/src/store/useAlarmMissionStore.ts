// 미션 2: 경보기 홀드 게이지.
// A 버튼 꾹 → 게이지 차오름. 70~90% 사이에 떼면 성공.

import { create } from 'zustand';

export type AlarmResult = 'success';

type AlarmMissionStore = {
  active: boolean;
  onResolve: ((r: AlarmResult, weakAttempts: number, breakAttempts: number) => void) | null;
  show: (
    onResolve: (r: AlarmResult, weakAttempts: number, breakAttempts: number) => void
  ) => void;
  close: () => void;
};

export const useAlarmMissionStore = create<AlarmMissionStore>((set) => ({
  active: false,
  onResolve: null,
  show: (onResolve) => set({ active: true, onResolve }),
  close: () => set({ active: false, onResolve: null }),
}));
