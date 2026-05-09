// 선택지 질문 상태 (대화 store 와 분리).
// 대화창과 같은 키로 진행하면 답이 자동 선택되는 사고를 막기 위해 별도 store 로 분리.
// 화면 가운데 큰 모달로 띄움. 모달 뜨고 OPEN_LOCK_MS 동안은 키 입력 무시 (carryover 방지).

import { create } from 'zustand';
import type { DialogueChoice } from './useDialogueStore';

export type QuestionPayload = {
  speaker?: string;
  prompt: string;
  choices: DialogueChoice[];
};

type Resolver = (value: string | null) => void;

type QuestionStore = {
  open: boolean;
  speaker: string | undefined;
  prompt: string;
  choices: DialogueChoice[];
  onResolve: Resolver | null;
  openedAt: number;
  show: (q: QuestionPayload, onResolve: Resolver) => void;
  choose: (value: string) => void;
  close: () => void;
};

export const OPEN_LOCK_MS = 400;

export const useQuestionStore = create<QuestionStore>((set, get) => ({
  open: false,
  speaker: undefined,
  prompt: '',
  choices: [],
  onResolve: null,
  openedAt: 0,

  show: (q, onResolve) => {
    set({
      open: true,
      speaker: q.speaker,
      prompt: q.prompt,
      choices: q.choices,
      onResolve,
      openedAt: Date.now(),
    });
  },

  choose: (value) => {
    const cb = get().onResolve;
    set({
      open: false,
      speaker: undefined,
      prompt: '',
      choices: [],
      onResolve: null,
    });
    cb?.(value);
  },

  close: () => {
    const cb = get().onResolve;
    set({
      open: false,
      speaker: undefined,
      prompt: '',
      choices: [],
      onResolve: null,
    });
    cb?.(null);
  },
}));
