// 미션 1: "불이야!" 외치기 게이지 단타.
// 좌우로 움직이는 마커가 중앙 타겟 안에 있을 때 A 버튼 단타.

import { create } from 'zustand';

export type ShoutResult = 'perfect' | 'fail';

type ShoutMissionStore = {
  active: boolean;
  onResolve: ((r: ShoutResult, missCount: number) => void) | null;
  show: (onResolve: (r: ShoutResult, missCount: number) => void) => void;
  close: () => void;
};

export const useShoutMissionStore = create<ShoutMissionStore>((set) => ({
  active: false,
  onResolve: null,
  show: (onResolve) => set({ active: true, onResolve }),
  close: () => set({ active: false, onResolve: null }),
}));
