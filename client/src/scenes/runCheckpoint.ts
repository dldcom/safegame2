// 체크포인트 실행 헬퍼.
// DialogueBox 기반 흐름: intro → question → 정답·오답 처리 → success / 재시도.
// 카운트다운 + 1차 실패 시 힌트 + 시간 초과 시 힌트 + 재시도 패턴 통합.

import {
  useDialogueStore,
  type DialogueLine,
} from '@/store/useDialogueStore';
import { useQuestionStore } from '@/store/useQuestionStore';

export type CheckpointStep = {
  // 질문 (선택지 포함)
  question: DialogueLine; // choices 필수
  // 정답 value (DialogueChoice.value 와 매치)
  correctValue: string;
  // 1차 실패 시 힌트 대사
  hint: DialogueLine[];
  // 정답 시 즉시 보여줄 대사 (success 가는 길)
  onCorrect?: DialogueLine[];
  // 오답 시 보여줄 대사 (재시도 전)
  onWrong?: DialogueLine[];
};

export type CheckpointConfig = {
  // 체크포인트 시작 시 한 번만 보여줄 대사 (우왕좌왕 친구들)
  intro?: DialogueLine[];
  // 순차 단계 (예: CP1 은 119신고 → 불이야 외치기 = 2단계)
  steps: CheckpointStep[];
  // 모든 단계 완료 후 대사 (안도)
  outro?: DialogueLine[];
  // 시간 제한 (초). 0 이면 제한 없음. 단계마다 적용.
  countdownSeconds: number;
};

// 단순 다이얼로그 출력 — 끝나면 resolve.
export const showLines = (lines: DialogueLine[]): Promise<void> =>
  new Promise((resolve) => {
    if (lines.length === 0) {
      resolve();
      return;
    }
    useDialogueStore.getState().show(lines, () => resolve());
  });

// Fisher-Yates 셔플 (원본 보존, 새 배열 반환).
const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 단일 선택지 질문 — 별도 가운데 모달.
// 매번 choices 셔플해서 정답 위치 무작위. carryover 방지는 store 의 OPEN_LOCK_MS.
export const showQuestion = (question: DialogueLine): Promise<string | null> =>
  new Promise((resolve) => {
    const choices = question.choices ?? [];
    useQuestionStore.getState().show(
      {
        speaker: question.speaker,
        prompt: question.text,
        choices: shuffle(choices),
      },
      (value) => resolve(value)
    );
  });

// 시간 카운트다운 — 진행 중 question Promise 가 끝나면 cancel.
// 카운트다운 만료 시 onTimeout 콜백 호출.
const startCountdown = (
  seconds: number,
  onTick: (remaining: number) => void,
  onTimeout: () => void
): { cancel: () => void } => {
  if (seconds <= 0) return { cancel: () => {} };

  let remaining = seconds;
  let cancelled = false;
  onTick(remaining);

  const tick = () => {
    if (cancelled) return;
    remaining -= 1;
    if (remaining <= 0) {
      onTick(0);
      onTimeout();
      return;
    }
    onTick(remaining);
    setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);

  return {
    cancel: () => {
      cancelled = true;
    },
  };
};

// 단일 step 실행 — 정답 받을 때까지 반복.
// 첫 시도 실패 시 OR 카운트다운 3초 남았는데 미입력 시 힌트 발동.
const runStep = async (
  step: CheckpointStep,
  countdownSeconds: number,
  onCountdown: (remaining: number) => void
): Promise<void> => {
  let attempt = 0;
  let hintShown = false;

  while (true) {
    attempt += 1;

    let timedOut = false;
    let hintTriggeredByTime = false;

    const countdown = startCountdown(
      countdownSeconds,
      (r) => {
        onCountdown(r);
        // 3초 남았는데 아직 응답 없고 힌트 안 보였으면 힌트
        if (r === 3 && !hintShown && !hintTriggeredByTime) {
          hintTriggeredByTime = true;
        }
      },
      () => {
        timedOut = true;
        useQuestionStore.getState().close();
      }
    );

    // 시간 압박 힌트가 트리거됐으면 question 닫고 힌트 → 다시 시도
    // 단순 구현: 힌트는 첫 실패 시만 (시간 초과는 close + 재시도)
    const value = await showQuestion(step.question);
    countdown.cancel();
    onCountdown(0); // UI 숨김

    if (timedOut) {
      // 시간 초과 — 힌트 (안 보였으면) + 재시도
      if (!hintShown) {
        hintShown = true;
        await showLines(step.hint);
      }
      continue;
    }

    if (value === step.correctValue) {
      if (step.onCorrect) await showLines(step.onCorrect);
      return;
    }

    // 오답 — 1차 실패면 힌트 보여줌. 그 후 재시도.
    if (step.onWrong) await showLines(step.onWrong);
    if (!hintShown) {
      hintShown = true;
      await showLines(step.hint);
    }
  }
};

export const runCheckpoint = async (
  config: CheckpointConfig,
  onCountdown: (remaining: number) => void
): Promise<void> => {
  if (config.intro) await showLines(config.intro);
  for (const step of config.steps) {
    await runStep(step, config.countdownSeconds, onCountdown);
  }
  if (config.outro) await showLines(config.outro);
  onCountdown(0);
};
