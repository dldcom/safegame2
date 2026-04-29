// 시작 화면 — 1인 플레이라 로그인/세션 코드 없음. "시작하기" 한 번만.

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

const isDev = import.meta.env.DEV;

export default function HomePage() {
  const navigate = useNavigate();
  const startNewGame = useGameStore((s) => s.startNewGame);
  const act1Current = useGameStore((s) => s.act1.current);
  const hasSavedProgress = act1Current > 1;

  const onStart = () => {
    startNewGame();
    navigate('/game');
  };

  const onContinue = () => {
    navigate('/game');
  };

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>안전교육 게임</h1>
      <p style={styles.subtitle}>화재와 지진, 침착하게 동생을 지키자</p>

      <div style={styles.btnGroup}>
        {hasSavedProgress && (
          <button style={styles.btnPrimary} onClick={onContinue}>
            이어서 플레이
          </button>
        )}
        <button style={hasSavedProgress ? styles.btnSecondary : styles.btnPrimary} onClick={onStart}>
          {hasSavedProgress ? '처음부터 다시' : '시작하기'}
        </button>
      </div>

      {isDev && (
        <div style={styles.devLinks}>
          <span style={styles.devLabel}>DEV TOOLS</span>
          <a href="/admin/character-maker" style={styles.devLink}>Character Maker</a>
          <a href="/admin/item-maker" style={styles.devLink}>Item Maker</a>
          <a href="/admin/map-maker" style={styles.devLink}>Map Maker</a>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    background: 'radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 70%)',
  },
  title: {
    fontSize: 56,
    fontWeight: 900,
    margin: 0,
    color: '#f8fafc',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
    margin: 0,
  },
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '14px 36px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#cbd5e1',
    border: '2px solid #475569',
    borderRadius: 8,
    padding: '12px 36px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  devLinks: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    fontSize: 11,
  },
  devLabel: {
    color: '#475569',
    letterSpacing: 1.5,
    fontWeight: 700,
  },
  devLink: {
    color: '#64748b',
    textDecoration: 'underline',
  },
};
