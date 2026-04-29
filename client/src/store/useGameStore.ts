// 게임 진행 상태 — localStorage 영속.
// 1인 플레이라 세션/팀/네트워크 동기화 없음. 로컬에서 자체 저장.

import { create } from 'zustand';
import type { Act, ActProgress, CheckpointResult } from '@shared/types/game';

const STORAGE_KEY = 'safegame_progress';

const emptyProgress = (act: Act): ActProgress => ({
  act,
  current: 1,
  results: Array(6).fill('pending') as CheckpointResult[],
});

type GameStore = {
  currentAct: Act;
  act1: ActProgress;
  act2: ActProgress;

  startNewGame: () => void;
  setAct: (act: Act) => void;
  recordCheckpoint: (act: Act, index: number, result: CheckpointResult) => void;
  advanceCheckpoint: (act: Act) => void;
  isActComplete: (act: Act) => boolean;
};

const loadFromStorage = (): Pick<GameStore, 'currentAct' | 'act1' | 'act2'> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Pick<GameStore, 'currentAct' | 'act1' | 'act2'>;
      return parsed;
    }
  } catch {
    /* 손상된 데이터 무시 */
  }
  return {
    currentAct: 1,
    act1: emptyProgress(1),
    act2: emptyProgress(2),
  };
};

const persist = (state: Pick<GameStore, 'currentAct' | 'act1' | 'act2'>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota 초과 등 무시 */
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadFromStorage(),

  startNewGame: () => {
    const next = {
      currentAct: 1 as Act,
      act1: emptyProgress(1),
      act2: emptyProgress(2),
    };
    set(next);
    persist(next);
  },

  setAct: (act) => {
    set({ currentAct: act });
    persist({ ...get(), currentAct: act });
  },

  recordCheckpoint: (act, index, result) => {
    const key = act === 1 ? 'act1' : 'act2';
    const prev = get()[key];
    const results = [...prev.results];
    results[index] = result;
    const next = { ...prev, results };
    set({ [key]: next } as Partial<GameStore>);
    persist({ ...get(), [key]: next });
  },

  advanceCheckpoint: (act) => {
    const key = act === 1 ? 'act1' : 'act2';
    const prev = get()[key];
    const next = { ...prev, current: Math.min(prev.current + 1, 6) };
    set({ [key]: next } as Partial<GameStore>);
    persist({ ...get(), [key]: next });
  },

  isActComplete: (act) => {
    const key = act === 1 ? 'act1' : 'act2';
    return get()[key].results.every((r) => r === 'success');
  },
}));
