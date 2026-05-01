// 체크포인트 카운트다운 표시 (화면 우상단).
// gameEventBus 의 'checkpoint:countdown' 이벤트 받아서 표시. 0 = 숨김.

import { useEffect, useState } from 'react';
import { gameEventBus } from '@/lib/gameEventBus';

export default function CountdownTimer() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const onTick = (payload: { remaining: number } | undefined) => {
      setRemaining(payload?.remaining ?? 0);
    };
    gameEventBus.on('checkpoint:countdown', onTick);
    return () => gameEventBus.off('checkpoint:countdown', onTick);
  }, []);

  if (remaining <= 0) return null;

  const urgent = remaining <= 3;

  return (
    <div style={{ ...styles.box, ...(urgent ? styles.urgent : null) }}>
      <div style={styles.label}>남은 시간</div>
      <div style={styles.number}>{remaining}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: 'absolute',
    top: 24,
    right: 24,
    minWidth: 96,
    padding: '12px 18px',
    background: 'rgba(15, 23, 42, 0.92)',
    border: '2px solid #3b82f6',
    borderRadius: 12,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
    color: '#e2e8f0',
    fontFamily: 'Pretendard, sans-serif',
    textAlign: 'center',
    zIndex: 800,
    transition: 'all 200ms ease',
  },
  urgent: {
    borderColor: '#ef4444',
    background: 'rgba(127, 29, 29, 0.92)',
    color: '#fee2e2',
    transform: 'scale(1.08)',
    boxShadow: '0 0 16px rgba(239, 68, 68, 0.6)',
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700,
    opacity: 0.8,
  },
  number: {
    fontSize: 32,
    fontWeight: 900,
    lineHeight: 1.1,
    marginTop: 2,
  },
};
