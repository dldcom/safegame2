// 미션 3: 손등 체크.
// 4x3 그리드 슬롯에 손등/손바닥 아이콘이 랜덤 위치 + 랜덤 종류로 잠깐 등장.
// 손등만 빠르게 탭 → 정답. 손바닥 탭 → 하트 -1 + 0.7초 경직.
// 5개 정답 = 통과. 하트 0 = 페널티 +5초 + 리셋 (점수 유지).

import { useEffect, useRef, useState } from 'react';
import { useDoorMissionStore } from '@/store/useDoorMissionStore';

const TARGET_SCORE = 5;
const MAX_HEARTS = 3;
const FREEZE_MS = 700;
const SPAWN_INTERVAL_MS = 850;
const ICON_LIFETIME_MS = 1300; // idle 단계 (등장/소멸 애니 별도)
const ANIM_IN_MS = 150;
const ANIM_OUT_MS = 200;
const MAX_CONCURRENT = 2;

const COLS = 4;
const ROWS = 3;
const SLOT_SIZE = 80;
const SLOT_GAP = 12;

// 픽셀 톤 팔레트 (1단계와 동일 계열)
const PIXEL = 4;
const C_BG_DEEP = '#0d0d1f';
const C_BG_MODAL = '#1b1b3a';
const C_BORDER_OUTER = '#000000';
const C_BORDER_INNER = '#f5f5f7';
const C_BORDER_DARK = '#2a2a4a';
const C_FIELD_BG = '#0a0a1a';
const C_TITLE = '#fcbf49';
const C_TEXT = '#f1faee';
const C_TEXT_DIM = '#8d8da0';
const C_BACK = '#06d6a0'; // 손등 (정답) - 초록
const C_BACK_DARK = '#048a64';
const C_PALM = '#ef476f'; // 손바닥 (오답) - 빨강
const C_PALM_DARK = '#a62a4d';
const C_SKIN = '#fcd5b5';
const C_SKIN_LINE = '#7a4a2a';
const C_HEART_FULL = '#ef476f';
const C_HEART_EMPTY = '#3a3a5a';

type IconType = 'back' | 'palm';

type Icon = {
  id: number;
  type: IconType;
  slot: number;
  spawnedAt: number;
  resolvedAt: number | null;
  resolvedAs: 'correct' | 'wrong' | null;
};

let nextId = 1;

export default function DoorMission() {
  const active = useDoorMissionStore((s) => s.active);
  const onResolve = useDoorMissionStore((s) => s.onResolve);
  const close = useDoorMissionStore((s) => s.close);

  const [icons, setIcons] = useState<Icon[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [palmTaps, setPalmTaps] = useState(0);
  const [resets, setResets] = useState(0);
  const [frozenUntil, setFrozenUntil] = useState(0);
  const [shake, setShake] = useState(0); // 빨간 플래시 트리거
  const [now, setNow] = useState(() => performance.now());
  const lastSpawnRef = useRef(0);

  // 활성화 초기화
  useEffect(() => {
    if (!active) return;
    setIcons([]);
    setScore(0);
    setHearts(MAX_HEARTS);
    setPalmTaps(0);
    setResets(0);
    setFrozenUntil(0);
    lastSpawnRef.current = performance.now() + 400; // 첫 스폰까지 살짝 여유
  }, [active]);

  // 메인 틱 — 스폰 + 라이프사이클 + 시간 업데이트
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const tick = () => {
      const t = performance.now();
      setNow(t);

      // 만료된 아이콘 정리
      setIcons((prev) => {
        const next: Icon[] = [];
        for (const ic of prev) {
          if (ic.resolvedAt !== null) {
            if (t - ic.resolvedAt < ANIM_OUT_MS) next.push(ic);
            continue;
          }
          const age = t - ic.spawnedAt;
          if (age < ANIM_IN_MS + ICON_LIFETIME_MS + ANIM_OUT_MS) {
            next.push(ic);
          }
        }
        return next;
      });

      // 스폰 결정
      if (t >= lastSpawnRef.current) {
        setIcons((prev) => {
          const liveCount = prev.filter((ic) => ic.resolvedAt === null).length;
          if (liveCount >= MAX_CONCURRENT) {
            lastSpawnRef.current = t + 200;
            return prev;
          }
          const used = new Set(prev.filter((ic) => ic.resolvedAt === null).map((ic) => ic.slot));
          const free: number[] = [];
          for (let i = 0; i < COLS * ROWS; i++) if (!used.has(i)) free.push(i);
          if (free.length === 0) return prev;
          const slot = free[Math.floor(Math.random() * free.length)];
          // 60% back (손등), 40% palm (손바닥) — 진행 가능성 보장
          const type: IconType = Math.random() < 0.6 ? 'back' : 'palm';
          lastSpawnRef.current = t + SPAWN_INTERVAL_MS;
          return [
            ...prev,
            {
              id: nextId++,
              type,
              slot,
              spawnedAt: t,
              resolvedAt: null,
              resolvedAs: null,
            },
          ];
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // 5점 달성 → 종료
  useEffect(() => {
    if (!active) return;
    if (score < TARGET_SCORE) return;
    const t = setTimeout(() => {
      onResolve?.(palmTaps, resets);
      close();
    }, 500);
    return () => clearTimeout(t);
  }, [active, score, palmTaps, resets, onResolve, close]);

  // 하트 0 → 리셋
  useEffect(() => {
    if (!active) return;
    if (hearts > 0) return;
    setResets((r) => r + 1);
    setShake((s) => s + 1);
    setFrozenUntil(performance.now() + FREEZE_MS * 2);
    setTimeout(() => {
      setHearts(MAX_HEARTS);
    }, FREEZE_MS);
  }, [active, hearts]);

  const tapIcon = (icon: Icon) => {
    if (icon.resolvedAt !== null) return;
    if (performance.now() < frozenUntil) return;
    if (icon.type === 'back') {
      setIcons((prev) =>
        prev.map((ic) =>
          ic.id === icon.id ? { ...ic, resolvedAt: performance.now(), resolvedAs: 'correct' } : ic
        )
      );
      setScore((s) => Math.min(TARGET_SCORE, s + 1));
    } else {
      setIcons((prev) =>
        prev.map((ic) =>
          ic.id === icon.id ? { ...ic, resolvedAt: performance.now(), resolvedAs: 'wrong' } : ic
        )
      );
      setHearts((h) => Math.max(0, h - 1));
      setPalmTaps((p) => p + 1);
      setShake((s) => s + 1);
      setFrozenUntil(performance.now() + FREEZE_MS);
    }
  };

  if (!active) return null;

  const fieldWidth = COLS * SLOT_SIZE + (COLS - 1) * SLOT_GAP;
  const fieldHeight = ROWS * SLOT_SIZE + (ROWS - 1) * SLOT_GAP;
  const isFrozen = now < frozenUntil;

  return (
    <>
      <style>{doorCss}</style>
      <div style={styles.backdrop}>
        <div
          key={`shake-${shake}`}
          style={{
            ...styles.modal,
            ...(isFrozen ? styles.modalFrozen : null),
          }}
          className={shake > 0 ? 'door-shake' : ''}
        >
          {/* 모서리 픽셀 장식 */}
          <div style={{ ...styles.corner, top: -PIXEL, left: -PIXEL }} />
          <div style={{ ...styles.corner, top: -PIXEL, right: -PIXEL }} />
          <div style={{ ...styles.corner, bottom: -PIXEL, left: -PIXEL }} />
          <div style={{ ...styles.corner, bottom: -PIXEL, right: -PIXEL }} />

          <div style={styles.title}>문 온도 확인</div>
          <div style={styles.subtitle}>손등 아이콘만 빠르게 터치 — 손바닥은 X</div>

          {/* HUD: 하트 + 점수 */}
          <div style={styles.hudRow}>
            <div style={styles.hudGroup}>
              <span style={styles.hudLabel}>HEARTS</span>
              <div style={styles.hearts}>
                {Array.from({ length: MAX_HEARTS }, (_, i) => (
                  <PixelHeart key={i} filled={i < hearts} />
                ))}
              </div>
            </div>
            <div style={styles.hudGroup}>
              <span style={styles.hudLabel}>SCORE</span>
              <div style={styles.scoreDots}>
                {Array.from({ length: TARGET_SCORE }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.scoreDot,
                      background: i < score ? C_BACK : C_HEART_EMPTY,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 게임 필드 */}
          <div
            style={{
              ...styles.field,
              width: fieldWidth + PIXEL * 2,
              height: fieldHeight + PIXEL * 2,
            }}
          >
            <div
              style={{
                ...styles.fieldInner,
                width: fieldWidth,
                height: fieldHeight,
              }}
            >
              {icons.map((ic) => (
                <IconCell key={ic.id} icon={ic} now={now} onTap={() => tapIcon(ic)} />
              ))}
            </div>
            {isFrozen && resets > 0 && hearts === MAX_HEARTS && (
              <div style={styles.resetBanner}>RESET! +5s</div>
            )}
          </div>

          {/* 페널티 표시 */}
          {(palmTaps > 0 || resets > 0) && (
            <div style={styles.penaltyText}>
              PENALTY +{palmTaps + resets * 5}s
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ───────── 아이콘 셀 ─────────

function IconCell({
  icon,
  now,
  onTap,
}: {
  icon: Icon;
  now: number;
  onTap: () => void;
}) {
  const elapsed = now - icon.spawnedAt;
  let scale = 1;
  let opacity = 1;

  if (icon.resolvedAt !== null) {
    const since = now - icon.resolvedAt;
    scale = 1 + since / 200;
    opacity = Math.max(0, 1 - since / ANIM_OUT_MS);
  } else if (elapsed < ANIM_IN_MS) {
    scale = elapsed / ANIM_IN_MS;
    opacity = elapsed / ANIM_IN_MS;
  } else if (elapsed > ANIM_IN_MS + ICON_LIFETIME_MS) {
    const fading = elapsed - (ANIM_IN_MS + ICON_LIFETIME_MS);
    opacity = Math.max(0, 1 - fading / ANIM_OUT_MS);
  }

  const col = icon.slot % COLS;
  const row = Math.floor(icon.slot / COLS);
  const x = col * (SLOT_SIZE + SLOT_GAP);
  const y = row * (SLOT_SIZE + SLOT_GAP);

  const isBack = icon.type === 'back';
  const borderColor =
    icon.resolvedAs === 'correct'
      ? C_BACK
      : icon.resolvedAs === 'wrong'
      ? C_PALM
      : isBack
      ? C_BACK
      : C_PALM;
  const borderDark =
    icon.resolvedAs === 'correct'
      ? C_BACK_DARK
      : icon.resolvedAs === 'wrong'
      ? C_PALM_DARK
      : isBack
      ? C_BACK_DARK
      : C_PALM_DARK;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (icon.resolvedAt !== null) return;
        onTap();
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        background: C_SKIN,
        border: 'none',
        padding: 0,
        cursor: icon.resolvedAt === null ? 'pointer' : 'default',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        boxShadow: `
          inset 0 0 0 ${PIXEL}px ${borderColor},
          inset 0 0 0 ${PIXEL * 1.6}px ${borderDark},
          ${PIXEL / 2}px ${PIXEL / 2}px 0 0 ${C_BORDER_OUTER}
        `,
        outline: 'none',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* 픽셀 손 아이콘 (CSS 기반 단순화) */}
      <HandPixelArt type={icon.type} resolved={icon.resolvedAs} />
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1,
          color: borderColor,
          textShadow: `1px 1px 0 ${C_BORDER_OUTER}`,
          fontFamily: '"Pretendard", "Courier New", monospace',
        }}
      >
        {isBack ? '손등' : '손바닥'}
      </div>
    </button>
  );
}

// 픽셀 손 그래픽 — 손등은 위쪽에 마디 점, 손바닥은 가운데 가로줄
function HandPixelArt({
  type,
  resolved,
}: {
  type: IconType;
  resolved: 'correct' | 'wrong' | null;
}) {
  const cellSize = 5; // 1 픽셀 단위
  // 손 모양 (8x8 그리드, 1 = 살색, 0 = 투명)
  const handGrid = [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ];
  // 손등 마디 점 (3x8 위쪽에 점)
  const backMarks: [number, number][] = [
    [1, 1],
    [1, 4],
    [2, 1],
    [2, 5],
    [3, 2],
  ];
  // 손바닥 손금 (가로줄)
  const palmMarks: [number, number][] = [
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
    [3, 5],
    [4, 6],
    [5, 1],
    [5, 2],
    [5, 3],
  ];
  const marks = type === 'back' ? backMarks : palmMarks;

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 8 * cellSize,
        height: 8 * cellSize,
        opacity: resolved === null ? 1 : 0.8,
      }}
    >
      {handGrid.map((row, r) =>
        row.map((v, c) =>
          v ? (
            <div
              key={`h-${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize,
                height: cellSize,
                background: C_SKIN,
                boxShadow: `inset 0 -1px 0 0 ${C_SKIN_LINE}`,
              }}
            />
          ) : null
        )
      )}
      {marks.map(([r, c], i) => (
        <div
          key={`m-${i}`}
          style={{
            position: 'absolute',
            left: c * cellSize,
            top: r * cellSize,
            width: cellSize,
            height: cellSize,
            background: C_SKIN_LINE,
          }}
        />
      ))}
    </div>
  );
}

// 픽셀 하트
function PixelHeart({ filled }: { filled: boolean }) {
  const size = 3;
  // 7x6 픽셀 하트
  const grid = [
    [0, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ];
  return (
    <div
      style={{
        position: 'relative',
        width: 7 * size,
        height: 6 * size,
      }}
    >
      {grid.map((row, r) =>
        row.map((v, c) =>
          v ? (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * size,
                top: r * size,
                width: size,
                height: size,
                background: filled ? C_HEART_FULL : C_HEART_EMPTY,
              }}
            />
          ) : null
        )
      )}
    </div>
  );
}

const doorCss = `
@keyframes doorShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.door-shake {
  animation: doorShake 280ms steps(5, end);
}
`;

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 800,
    fontFamily: '"Pretendard", "Courier New", monospace',
  },
  modal: {
    position: 'relative',
    background: C_BG_MODAL,
    color: C_TEXT,
    padding: '24px 28px 20px',
    minWidth: 480,
    textAlign: 'center',
    boxShadow: `
      0 0 0 ${PIXEL}px ${C_BORDER_INNER},
      0 0 0 ${PIXEL * 2}px ${C_BORDER_OUTER},
      ${PIXEL}px ${PIXEL}px 0 ${PIXEL * 2}px ${C_BG_DEEP}
    `,
    border: 'none',
    borderRadius: 0,
    transition: 'background 100ms steps(1, end)',
  },
  modalFrozen: {
    background: '#3a1a2a',
  },
  corner: {
    position: 'absolute',
    width: PIXEL * 2,
    height: PIXEL * 2,
    background: C_PALM,
    pointerEvents: 'none',
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 2,
    color: C_TITLE,
    textShadow: `2px 2px 0 ${C_BORDER_OUTER}`,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    color: C_TEXT_DIM,
    marginBottom: 18,
    textTransform: 'uppercase' as const,
  },
  hudRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    padding: '0 4px',
  },
  hudGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 2,
    color: C_TEXT_DIM,
  },
  hearts: {
    display: 'flex',
    gap: 4,
  },
  scoreDots: {
    display: 'flex',
    gap: 4,
  },
  scoreDot: {
    width: 14,
    height: 14,
    background: C_HEART_EMPTY,
    boxShadow: `inset 0 0 0 2px ${C_BORDER_OUTER}`,
  },
  field: {
    position: 'relative',
    background: C_BORDER_OUTER,
    padding: PIXEL,
    margin: '0 auto',
    boxShadow: `0 0 0 ${PIXEL}px ${C_BORDER_DARK}`,
  },
  fieldInner: {
    position: 'relative',
    background: C_FIELD_BG,
  },
  resetBanner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(239, 71, 111, 0.4)',
    color: '#fff',
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 4,
    textShadow: `3px 3px 0 ${C_BORDER_OUTER}`,
    pointerEvents: 'none',
  },
  penaltyText: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    color: C_PALM,
  },
};
