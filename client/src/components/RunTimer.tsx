// 좌상단 작은 HUD: 진행 시간 + 페널티 (베스트 기록과 비교).
// startRun() 호출되면 표시 시작, finishRun() 후엔 finishedMs 고정.

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

const formatMs = (ms: number) => {
  const total = Math.floor(ms / 100);
  const sec = Math.floor(total / 10);
  const tenths = total % 10;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
};

export default function RunTimer() {
  const startedAt = useGameStore((s) => s.startedAt);
  const penaltyMs = useGameStore((s) => s.penaltyMs);
  const finishedMs = useGameStore((s) => s.finishedMs);
  const currentAct = useGameStore((s) => s.currentAct);
  const bestAct1Ms = useGameStore((s) => s.bestAct1Ms);
  const bestAct2Ms = useGameStore((s) => s.bestAct2Ms);

  const [now, setNow] = useState(() => Date.now());

  // RAF 로 매 프레임 갱신 (세션 진행 중일 때만)
  useEffect(() => {
    if (startedAt === null || finishedMs !== null) return;
    let raf: number;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, finishedMs]);

  if (startedAt === null && finishedMs === null) return null;

  const elapsed =
    finishedMs !== null
      ? finishedMs
      : startedAt !== null
      ? now - startedAt + penaltyMs
      : penaltyMs;

  const best = currentAct === 1 ? bestAct1Ms : bestAct2Ms;
  const beatingBest = best !== null && elapsed < best;

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <span style={styles.label}>시간</span>
        <span style={styles.time}>{formatMs(elapsed)}</span>
      </div>
      {penaltyMs > 0 && (
        <div style={styles.penalty}>페널티 +{Math.round(penaltyMs / 100) / 10}초</div>
      )}
      {best !== null && (
        <div style={{ ...styles.best, color: beatingBest ? '#10b981' : '#94a3b8' }}>
          베스트 {formatMs(best)}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    background: 'rgba(15, 23, 42, 0.78)',
    border: '2px solid rgba(148, 163, 184, 0.5)',
    borderRadius: 10,
    padding: '8px 14px',
    color: '#fff',
    fontFamily: 'Pretendard, sans-serif',
    pointerEvents: 'none',
    zIndex: 650,
    minWidth: 130,
  },
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
  },
  time: {
    fontSize: 20,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0.5,
  },
  penalty: {
    fontSize: 11,
    color: '#fca5a5',
    marginTop: 2,
    fontWeight: 600,
  },
  best: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: 600,
  },
};
