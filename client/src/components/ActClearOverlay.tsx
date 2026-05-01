// 막 클리어 모달 — gameEventBus 의 'act:completed' 이벤트 받아 화면 위에 표시.
// 학생이 가장 침착하게 행동했음을 강조 + 메인으로 가기.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameEventBus } from '@/lib/gameEventBus';

const ACT_TITLES: Record<number, string> = {
  1: '1막 — 화재 대피',
  2: '2막 — 지진 대피',
  3: '3막 — 화재 진화',
};

const ACT_MESSAGES: Record<number, string> = {
  1: '위급할 때 가장 중요한 건 침착함.\n너의 행동이 친구 5명을 무사히 데리고 나왔어.',
  2: '흔들림 속에서도 침착하게 행동했다. 멋지다.',
  3: '소화기 사용을 정확히 익혔다. 작은 불은 빨리 끄는 게 중요하다.',
};

export default function ActClearOverlay() {
  const [act, setAct] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onComplete = (payload: { act: number } | undefined) => {
      if (!payload) return;
      // 약간 딜레이 후 모달 표시 (점호 끝나고 분위기 잡히게)
      setTimeout(() => setAct(payload.act), 600);
    };
    gameEventBus.on('act:completed', onComplete);
    return () => gameEventBus.off('act:completed', onComplete);
  }, []);

  if (act === null) return null;

  const title = ACT_TITLES[act] ?? `${act}막`;
  const message = ACT_MESSAGES[act] ?? '클리어!';

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.badge}>CLEAR</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.message}>{message}</p>
        <div style={styles.checklist}>
          <div style={styles.checkItem}>119 신고 + "불이야!" 외치기</div>
          <div style={styles.checkItem}>화재경보기 누르기</div>
          <div style={styles.checkItem}>손등으로 문 온도 확인</div>
          <div style={styles.checkItem}>낮은 자세 + 코·입 가리고 이동</div>
          <div style={styles.checkItem}>엘리베이터 X, 계단으로 대피</div>
          <div style={styles.checkItem}>안전한 곳에서 점호</div>
        </div>
        <p style={styles.real}>
          실제로 화재가 일어나면 너희 학교에서도 똑같이 행동해야 해.
        </p>
        <div style={styles.buttons}>
          <button
            style={styles.btnPrimary}
            onClick={() => {
              setAct(null);
              navigate('/');
            }}
          >
            메인 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
    padding: 20,
    overflowY: 'auto',
  },
  box: {
    width: '100%',
    maxWidth: 560,
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    border: '2px solid #fbbf24',
    borderRadius: 16,
    padding: '40px 36px 32px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
    color: '#e2e8f0',
    fontFamily: 'Pretendard, sans-serif',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 18px',
    background: '#fbbf24',
    color: '#1c1917',
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 2,
    borderRadius: 999,
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    color: '#f8fafc',
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    margin: '16px 0 24px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  checklist: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '14px 18px',
    margin: '0 0 20px',
    textAlign: 'left',
  },
  checkItem: {
    fontSize: 13,
    color: '#86efac',
    padding: '4px 0',
  },
  real: {
    fontSize: 13,
    color: '#fde68a',
    margin: '0 0 24px',
    fontStyle: 'italic',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
  },
  btnPrimary: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Pretendard, sans-serif',
    cursor: 'pointer',
  },
};
