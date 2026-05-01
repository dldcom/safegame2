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

type Persisted = {
  selectedCharacter: string | null; // 시작 화면에서 고른 6마리 중 하나
  currentAct: Act;
  act1: ActProgress;
  act2: ActProgress;
};

type GameStore = Persisted & {
  setCharacter: (id: string | null) => void;
  startNewGame: () => void;
  setAct: (act: Act) => void;
  recordCheckpoint: (act: Act, index: number, result: CheckpointResult) => void;
  advanceCheckpoint: (act: Act) => void;
  isActComplete: (act: Act) => boolean;
};

const defaultState = (): Persisted => ({
  selectedCharacter: null,
  currentAct: 1,
  act1: emptyProgress(1),
  act2: emptyProgress(2),
});

const loadFromStorage = (): Persisted => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>;
      return { ...defaultState(), ...parsed };
    }
  } catch {
    /* 손상된 데이터 무시 */
  }
  return defaultState();
};

const persist = (state: Persisted) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota 초과 등 무시 */
  }
};

const snapshot = (s: GameStore): Persisted => ({
  selectedCharacter: s.selectedCharacter,
  currentAct: s.currentAct,
  act1: s.act1,
  act2: s.act2,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadFromStorage(),

  setCharacter: (id) => {
    set({ selectedCharacter: id });
    persist(snapshot(get()));
  },

  startNewGame: () => {
    // 캐릭터 선택은 유지 (다시 시작해도 같은 캐릭터)
    const keep = get().selectedCharacter;
    const next: Persisted = {
      selectedCharacter: keep,
      currentAct: 1,
      act1: emptyProgress(1),
      act2: emptyProgress(2),
    };
    set(next);
    persist(next);
  },

  setAct: (act) => {
    set({ currentAct: act });
    persist(snapshot(get()));
  },

  recordCheckpoint: (act, index, result) => {
    const key = act === 1 ? 'act1' : 'act2';
    const prev = get()[key];
    const results = [...prev.results];
    results[index] = result;
    const next = { ...prev, results };
    set({ [key]: next } as Partial<GameStore>);
    persist(snapshot(get()));
  },

  advanceCheckpoint: (act) => {
    const key = act === 1 ? 'act1' : 'act2';
    const prev = get()[key];
    const next = { ...prev, current: Math.min(prev.current + 1, 6) };
    set({ [key]: next } as Partial<GameStore>);
    persist(snapshot(get()));
  },

  isActComplete: (act) => {
    const key = act === 1 ? 'act1' : 'act2';
    return get()[key].results.every((r) => r === 'success');
  },
}));
