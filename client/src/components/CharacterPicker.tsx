// 시작 화면 캐릭터 선택 (6마리 동물 그리드).
// 1인 플레이라 단순화 — 카드 클릭 = 즉시 선택.
// 호버 시 4방향 프레임 순환 미리보기.

import { useEffect, useState } from 'react';
import { CHARACTERS } from '@shared/lib/characters';
import { useGameStore } from '@/store/useGameStore';

const SHEET_W = 288;
const SHEET_H = 256;
const FRAME_W = 48;
const FRAME_H = 64;
const SCALE = 2;

// [col, row] — down(0), right(2), up(1), left(3) 순환
const PREVIEW_FRAMES: Array<[number, number]> = [
  [0, 0],
  [0, 2],
  [0, 1],
  [0, 3],
];

const HOVER_INTERVAL_MS = 280;

export default function CharacterPicker() {
  const selected = useGameStore((s) => s.selectedCharacter);
  const setCharacter = useGameStore((s) => s.setCharacter);

  return (
    <div style={styles.wrap}>
      <h2 style={styles.heading}>캐릭터 고르기</h2>
      <p style={styles.sub}>나머지 5마리는 친구로 등장해요. 다시 누르면 변경됩니다.</p>

      <div style={styles.grid}>
        {CHARACTERS.map((c) => (
          <CharacterCard
            key={c.id}
            id={c.id}
            name={c.name}
            description={c.description}
            mine={c.id === selected}
            onClick={() => setCharacter(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

type CardProps = {
  id: string;
  name: string;
  description: string;
  mine: boolean;
  onClick: () => void;
};

function CharacterCard({ id, name, description, mine, onClick }: CardProps) {
  const [hovering, setHovering] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    if (!hovering) {
      setFrameIdx(0);
      return;
    }
    const t = setInterval(() => {
      setFrameIdx((i) => (i + 1) % PREVIEW_FRAMES.length);
    }, HOVER_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hovering]);

  const [col, row] = PREVIEW_FRAMES[frameIdx];
  const bgX = -col * FRAME_W * SCALE;
  const bgY = -row * FRAME_H * SCALE;

  return (
    <button
      type="button"
      style={{ ...styles.card, ...(mine ? styles.cardMine : null) }}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div style={styles.spriteWrap}>
        <div
          style={{
            ...styles.spriteFrame,
            backgroundImage: `url(/assets/characters/${id}.png)`,
            backgroundPosition: `${bgX}px ${bgY}px`,
            backgroundSize: `${SHEET_W * SCALE}px ${SHEET_H * SCALE}px`,
          }}
        />
        {mine && <div style={styles.selectedBadge}>선택됨</div>}
      </div>
      <div style={styles.cardName}>{name}</div>
      <div style={styles.cardDesc}>{description}</div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    maxWidth: 720,
    padding: 24,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
  },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: '#fde68a',
    textAlign: 'center',
  },
  sub: {
    margin: '8px 0 20px',
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  card: {
    position: 'relative',
    padding: '14px 8px 12px',
    background: '#1e293b',
    border: '2px solid #334155',
    borderRadius: 10,
    cursor: 'pointer',
    color: '#e2e8f0',
    fontFamily: 'Pretendard, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    transition: 'all 120ms ease',
  },
  cardMine: {
    borderColor: '#fbbf24',
    background: '#3a2e0e',
    boxShadow: '0 0 16px rgba(251, 191, 36, 0.45)',
  },
  spriteWrap: {
    position: 'relative',
    width: FRAME_W * SCALE,
    height: FRAME_H * SCALE,
  },
  spriteFrame: {
    width: '100%',
    height: '100%',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  },
  selectedBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '3px 8px',
    background: '#fbbf24',
    color: '#1c1917',
    fontSize: 10,
    fontWeight: 800,
    borderRadius: 999,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  cardName: {
    fontSize: 15,
    fontWeight: 700,
  },
  cardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    minHeight: '2em',
  },
};
