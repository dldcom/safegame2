// 세션 인벤토리 / 임시 막 진행 상태.
// useGameStore 와 분리: 캐릭터 선택·CP 결과는 localStorage 영속이지만,
// 인벤토리 (휴대폰·손수건) 는 한 번 플레이 안에서만 의미 있음. 새로고침 시 초기화.

import { create } from 'zustand';

type SessionStore = {
  hasPhone: boolean;
  hasHandkerchief: boolean;
  pickupPhone: () => void;
  pickupHandkerchief: () => void;
  reset: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  hasPhone: false,
  hasHandkerchief: false,
  pickupPhone: () => set({ hasPhone: true }),
  pickupHandkerchief: () => set({ hasHandkerchief: true }),
  reset: () => set({ hasPhone: false, hasHandkerchief: false }),
}));
