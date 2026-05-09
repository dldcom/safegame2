// 화면 가운데 큰 선택지 모달.
// 대화창과 분리되어 있고, 떴을 때 OPEN_LOCK_MS 동안 키 입력 무시 (carryover 방지).
// ↑↓ 으로 이동, Enter/Space 으로 확정, 클릭/탭도 가능.

import { useEffect, useState } from 'react';
import { useQuestionStore, OPEN_LOCK_MS } from '@/store/useQuestionStore';

export default function QuestionModal() {
  const open = useQuestionStore((s) => s.open);
  const speaker = useQuestionStore((s) => s.speaker);
  const prompt = useQuestionStore((s) => s.prompt);
  const choices = useQuestionStore((s) => s.choices);
  const choose = useQuestionStore((s) => s.choose);
  const openedAt = useQuestionStore((s) => s.openedAt);

  const [focused, setFocused] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFocused(0);
    setUnlocked(false);
    const t = setTimeout(() => setUnlocked(true), OPEN_LOCK_MS);
    return () => clearTimeout(t);
  }, [open, openedAt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!unlocked) {
        if (
          e.code === 'Space' ||
          e.code === 'Enter' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowUp'
        ) {
          e.preventDefault();
        }
        return;
      }
      const n = choices.length;
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => (f + 1) % n);
        return;
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setFocused((f) => (f - 1 + n) % n);
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        choose(choices[focused].value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, unlocked, choices, focused, choose]);

  if (!open) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {speaker && <div style={styles.speaker}>{speaker}</div>}
        <div style={styles.prompt}>{prompt}</div>

        <div style={styles.choices}>
          {choices.map((c, i) => {
            const isFocused = i === focused;
            return (
              <button
                key={c.value}
                style={{
                  ...styles.choiceBtn,
                  ...(isFocused ? styles.choiceBtnFocused : null),
                  ...(unlocked ? null : styles.choiceBtnLocked),
                }}
                onMouseEnter={() => unlocked && setFocused(i)}
                onClick={() => unlocked && choose(c.value)}
                disabled={!unlocked}
              >
                <span style={styles.marker}>{isFocused ? '▶' : ' '}</span>
                <span style={styles.choiceText}>{c.label}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.hint}>
          {unlocked ? '↑↓ 로 선택 · Space / Enter 로 결정' : '잠시만...'}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.55)',
    zIndex: 700,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    width: 'min(640px, 88%)',
    background: 'rgba(15, 23, 42, 0.98)',
    border: '3px solid #fbbf24',
    borderRadius: 16,
    padding: '28px 32px 22px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
    color: '#e2e8f0',
    fontFamily: 'Pretendard, sans-serif',
  },
  speaker: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  prompt: {
    fontSize: 22,
    lineHeight: 1.5,
    marginBottom: 22,
    fontWeight: 600,
    color: '#f1f5f9',
    whiteSpace: 'pre-wrap',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  choiceBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    background: 'rgba(30, 41, 59, 0.7)',
    border: '2px solid rgba(148, 163, 184, 0.3)',
    borderRadius: 10,
    color: '#cbd5e1',
    fontSize: 18,
    fontFamily: 'Pretendard, sans-serif',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 140ms ease',
  },
  choiceBtnFocused: {
    background: 'rgba(251, 191, 36, 0.16)',
    border: '2px solid #fbbf24',
    color: '#fde68a',
    fontWeight: 700,
    transform: 'translateX(4px)',
  },
  choiceBtnLocked: {
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  marker: {
    display: 'inline-block',
    width: 18,
    color: '#fbbf24',
    fontSize: 18,
    flexShrink: 0,
  },
  choiceText: {
    flex: 1,
  },
  hint: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0.3,
    textAlign: 'right',
  },
};
