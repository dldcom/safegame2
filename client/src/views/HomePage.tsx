// 시작 화면 — 캐릭터 선택 + 시작/이어서.
// 캐릭터 미선택 시 시작하기 비활성. localStorage 에 선택 영속.

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { findCharacter } from '@shared/lib/characters';
import CharacterPicker from '@/components/CharacterPicker';

const isDev = import.meta.env.DEV;

export default function HomePage() {
  const navigate = useNavigate();
  const startNewGame = useGameStore((s) => s.startNewGame);
  const selectedCharacter = useGameStore((s) => s.selectedCharacter);
  const act1Current = useGameStore((s) => s.act1.current);
  const hasSavedProgress = act1Current > 1;

  const character = selectedCharacter ? findCharacter(selectedCharacter) : null;
  const canStart = !!character;

  const onStart = () => {
    if (!canStart) return;
    startNewGame();
    navigate('/game');
  };

  const onContinue = () => {
    if (!canStart) return;
    navigate('/game');
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={styles.title}>안전교육 게임</h1>
        <p style={styles.subtitle}>화재와 지진, 침착하게 친구들을 지키자</p>
      </header>

      <CharacterPicker />

      <div style={styles.btnGroup}>
        {hasSavedProgress && (
          <button
            style={canStart ? styles.btnPrimary : styles.btnDisabled}
            onClick={onContinue}
            disabled={!canStart}
          >
            이어서 플레이
          </button>
        )}
        <button
          style={
            !canStart
              ? styles.btnDisabled
              : hasSavedProgress
                ? styles.btnSecondary
                : styles.btnPrimary
          }
          onClick={onStart}
          disabled={!canStart}
        >
          {hasSavedProgress ? '처음부터 다시' : '시작하기'}
        </button>
        {!canStart && (
          <p style={styles.hint}>먼저 캐릭터를 골라주세요.</p>
        )}
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
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    padding: '40px 20px',
    background: 'radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 70%)',
    overflowY: 'auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 44,
    fontWeight: 900,
    margin: 0,
    color: '#f8fafc',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    margin: '8px 0 0',
  },
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
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
    minWidth: 240,
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
    minWidth: 240,
  },
  btnDisabled: {
    background: '#374151',
    color: '#6b7280',
    border: 'none',
    borderRadius: 8,
    padding: '14px 36px',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'not-allowed',
    minWidth: 240,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    margin: 0,
  },
  devLinks: {
    marginTop: 'auto',
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
