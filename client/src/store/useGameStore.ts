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
  bestAct1Ms: number | null; // 1막 베스트 기록 (elapsed + penalty)
  bestAct2Ms: number | null;
};

type RunState = {
  startedAt: number | null; // 막 시작 시각 epoch ms, null 이면 진행 중 아님
  penaltyMs: number; // 페널티 누적 (ms)
  finishedMs: number | null; // 완료된 막의 최종 기록 (elapsed + penalty)
  isBestRun: boolean; // 마지막 finish 시 베스트 갱신됐는지
};

type GameStore = Persisted &
  RunState & {
    setCharacter: (id: string | null) => void;
    startNewGame: () => void;
    setAct: (act: Act) => void;
    recordCheckpoint: (act: Act, index: number, result: CheckpointResult) => void;
    advanceCheckpoint: (act: Act) => void;
    isActComplete: (act: Act) => boolean;

    // 시간/페널티
    startRun: () => void;
    addPenaltyMs: (ms: number) => void;
    getElapsedMs: () => number; // 현재까지 누적 (페널티 포함)
    finishRun: (act: Act) => { totalMs: number; isBest: boolean };
  };

const defaultState = (): Persisted => ({
  selectedCharacter: null,
  currentAct: 1,
  act1: emptyProgress(1),
  act2: emptyProgress(2),
  bestAct1Ms: null,
  bestAct2Ms: null,
});

const defaultRunState = (): RunState => ({
  startedAt: null,
  penaltyMs: 0,
  finishedMs: null,
  isBestRun: false,
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
  bestAct1Ms: s.bestAct1Ms,
  bestAct2Ms: s.bestAct2Ms,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadFromStorage(),
  ...defaultRunState(),

  setCharacter: (id) => {
    set({ selectedCharacter: id });
    persist(snapshot(get()));
  },

  startNewGame: () => {
    // 캐릭터 선택과 베스트 기록은 유지 (다시 시작해도 같은 캐릭터·기록 보존)
    const keep = get().selectedCharacter;
    const bestAct1 = get().bestAct1Ms;
    const bestAct2 = get().bestAct2Ms;
    const next: Persisted = {
      selectedCharacter: keep,
      currentAct: 1,
      act1: emptyProgress(1),
      act2: emptyProgress(2),
      bestAct1Ms: bestAct1,
      bestAct2Ms: bestAct2,
    };
    set({ ...next, ...defaultRunState() });
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

  startRun: () => {
    set({ startedAt: Date.now(), penaltyMs: 0, finishedMs: null, isBestRun: false });
  },

  addPenaltyMs: (ms) => {
    if (ms <= 0) return;
    set({ penaltyMs: get().penaltyMs + ms });
  },

  getElapsedMs: () => {
    const s = get();
    if (s.finishedMs !== null) return s.finishedMs;
    if (s.startedAt === null) return s.penaltyMs;
    return Date.now() - s.startedAt + s.penaltyMs;
  },

  finishRun: (act) => {
    const s = get();
    const total = s.startedAt === null ? s.penaltyMs : Date.now() - s.startedAt + s.penaltyMs;
    const bestKey = act === 1 ? 'bestAct1Ms' : 'bestAct2Ms';
    const prevBest = s[bestKey];
    const isBest = prevBest === null || total < prevBest;
    if (isBest) {
      set({ [bestKey]: total } as Partial<GameStore>);
    }
    set({ finishedMs: total, isBestRun: isBest, startedAt: null });
    persist(snapshot(get()));
    return { totalMs: total, isBest };
  },
}));
