// 미션 1: "불이야!" 외치기 — 좌우 게이지 + 중앙 타겟 단타.
// 마커가 사인파로 좌우 왕복. A 버튼 (Space) 누른 순간 위치가 타겟 안이면 정확.
// 빗나가면 "작게 외쳤어 — 다시!" + 페널티 누적. 결국엔 통과 (4학년 좌절 방지).
// UI: 팡야st 따뜻한 나무판/크림 톤 + 다람쥐 마스코트 (입에 손 모은 외치는 자세).

import { useEffect, useRef, useState } from 'react';
import { useShoutMissionStore } from '@/store/useShoutMissionStore';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 32;
const TARGET_RATIO = 0.22;
const MARKER_HALF_WIDTH = 11;
const BASE_CYCLE_MS = 2200;

type Feedback = 'idle' | 'perfect' | 'fail';

export default function ShoutMission() {
  const active = useShoutMissionStore((s) => s.active);
  const onResolve = useShoutMissionStore((s) => s.onResolve);
  const close = useShoutMissionStore((s) => s.close);

  const [pos, setPos] = useState(0.5);
  const [missCount, setMissCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const acceptInputRef = useRef(true);

  useEffect(() => {
    if (!active) return;
    setPos(0.5);
    setMissCount(0);
    setFeedback('idle');
    acceptInputRef.current = true;
    startTimeRef.current = performance.now();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const cycleMs = BASE_CYCLE_MS + missCount * 360;
      const phase = ((elapsed % cycleMs) / cycleMs) * Math.PI * 2;
      const p = (Math.sin(phase) + 1) / 2;
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, missCount]);

  const tryShout = () => {
    if (!acceptInputRef.current) return;
    acceptInputRef.current = false;
    const center = 0.5;
    const half = TARGET_RATIO / 2;
    if (pos >= center - half && pos <= center + half) {
      setFeedback('perfect');
      setTimeout(() => {
        onResolve?.('perfect', missCount);
        close();
      }, 900);
    } else {
      setMissCount((c) => c + 1);
      setFeedback('fail');
      setTimeout(() => {
        setFeedback('idle');
        acceptInputRef.current = true;
      }, 700);
    }
  };

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      e.stopPropagation();
      tryShout();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pos, missCount]);

  if (!active) return null;

  const center = 0.5;
  const half = TARGET_RATIO / 2;
  const inTarget = pos >= center - half && pos <= center + half;
  const shouting = feedback === 'perfect' || (inTarget && feedback === 'idle');

  // 마스코트 클래스
  const mascotClass =
    feedback === 'perfect'
      ? 'shout-squirrel shout-jump'
      : feedback === 'fail'
      ? 'shout-squirrel shout-shake'
      : inTarget
      ? 'shout-squirrel shout-cheer'
      : 'shout-squirrel shout-idle';

  // 마커 색
  const markerColor =
    feedback === 'perfect' ? '#10b981' : feedback === 'fail' ? '#dc2626' : '#fb923c';

  // 바 좌표 (SVG 안)
  const BAR_X = 40;
  const BAR_Y = 188;
  const targetX = BAR_X + ((1 - TARGET_RATIO) / 2) * BAR_WIDTH;
  const targetW = BAR_WIDTH * TARGET_RATIO;
  const markerCx = BAR_X + pos * BAR_WIDTH;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={styles.backdrop}>
        <div style={styles.modal}>
          {/* 나무 프레임 못 4개 */}
          <div style={{ ...styles.nail, top: 10, left: 10 }} />
          <div style={{ ...styles.nail, top: 10, right: 10 }} />
          <div style={{ ...styles.nail, bottom: 10, left: 10 }} />
          <div style={{ ...styles.nail, bottom: 10, right: 10 }} />

          <div style={styles.title}>
            <span className="shout-blink-bang">!</span>
            &nbsp;&nbsp;불이야 외치기&nbsp;&nbsp;
            <span className="shout-blink-bang">!</span>
          </div>
          <div style={styles.subtitle}>마커가 초록 별자리에 들어왔을 때 [Space] 단타!</div>

          <div style={styles.svgWrap}>
            <svg width={480} height={250} viewBox="0 0 480 250" style={{ overflow: 'visible' }}>
              <defs>
                <radialGradient id="furGrad" cx="0.4" cy="0.3" r="0.9">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
                <linearGradient id="bubbleGradHot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef9c3" />
                  <stop offset="100%" stopColor="#fde047" />
                </linearGradient>
                <linearGradient id="bubbleGradCold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f9fafb" />
                  <stop offset="100%" stopColor="#e5e7eb" />
                </linearGradient>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="100%" stopColor="#fde68a" />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <radialGradient id="markerGrad" cx="0.4" cy="0.3" r="0.8">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                  <stop offset="40%" stopColor={markerColor} />
                  <stop offset="100%" stopColor={markerColor} stopOpacity="0.85" />
                </radialGradient>
                <filter id="shoutShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                  <feOffset dx="0" dy="2" result="off" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* === 다람쥐 마스코트 === */}
              <g
                transform="translate(180, 30)"
                className={mascotClass}
                style={{ transformOrigin: '60px 80px' }}
              >
                <SquirrelMascot feedback={feedback} inTarget={inTarget} shouting={shouting} />
              </g>

              {/* === 스피치 버블 (오른쪽 위) === */}
              <g transform="translate(310, 28)" filter="url(#shoutShadow)">
                <ellipse
                  cx={50}
                  cy={28}
                  rx={48}
                  ry={24}
                  fill={shouting ? 'url(#bubbleGradHot)' : 'url(#bubbleGradCold)'}
                  stroke={shouting ? '#dc2626' : '#9ca3af'}
                  strokeWidth={3}
                />
                {/* 버블 꼬리 */}
                <path
                  d="M 18 46 L 4 64 L 28 50 Z"
                  fill={shouting ? '#fde047' : '#e5e7eb'}
                  stroke={shouting ? '#dc2626' : '#9ca3af'}
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                <text
                  x={50}
                  y={shouting ? 35 : 33}
                  textAnchor="middle"
                  fontSize={shouting ? 22 : 16}
                  fontWeight={900}
                  fill={shouting ? '#b91c1c' : '#6b7280'}
                  style={{ fontFamily: 'Pretendard, sans-serif', letterSpacing: '-1px' }}
                  className={shouting ? 'shout-bubble-text' : ''}
                >
                  불이야{shouting ? '!' : '…'}
                </text>
              </g>

              {/* === 게이지 바 === */}
              {/* 나무 외곽 */}
              <rect
                x={BAR_X - 8}
                y={BAR_Y - 8}
                width={BAR_WIDTH + 16}
                height={BAR_HEIGHT + 16}
                rx={(BAR_HEIGHT + 16) / 2}
                fill="#92400e"
              />
              <rect
                x={BAR_X - 6}
                y={BAR_Y - 6}
                width={BAR_WIDTH + 12}
                height={BAR_HEIGHT + 12}
                rx={(BAR_HEIGHT + 12) / 2}
                fill="#b45309"
              />
              {/* 트랙 (크림) */}
              <rect
                x={BAR_X}
                y={BAR_Y}
                width={BAR_WIDTH}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill="url(#barGrad)"
                stroke="#78350f"
                strokeWidth={2}
              />
              {/* 트랙 안쪽 그림자 */}
              <rect
                x={BAR_X + 2}
                y={BAR_Y + 2}
                width={BAR_WIDTH - 4}
                height={4}
                rx={2}
                fill="#92400e"
                opacity={0.18}
              />

              {/* 타겟 영역 (초록 별자리) */}
              <rect
                x={targetX}
                y={BAR_Y + 4}
                width={targetW}
                height={BAR_HEIGHT - 8}
                rx={(BAR_HEIGHT - 8) / 2}
                fill="url(#targetGrad)"
                stroke="#047857"
                strokeWidth={2}
                className="shout-target-glow"
              />
              {/* 타겟 별 장식 (3개) */}
              {[-1, 0, 1].map((i) => (
                <Star
                  key={i}
                  cx={targetX + targetW / 2 + i * 18}
                  cy={BAR_Y + BAR_HEIGHT / 2}
                  r={4}
                  fill="#fef9c3"
                  stroke="#047857"
                />
              ))}

              {/* 중앙선 */}
              <line
                x1={BAR_X + BAR_WIDTH / 2}
                y1={BAR_Y - 12}
                x2={BAR_X + BAR_WIDTH / 2}
                y2={BAR_Y - 4}
                stroke="#7c2d12"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <polygon
                points={`${BAR_X + BAR_WIDTH / 2 - 4},${BAR_Y - 4} ${BAR_X + BAR_WIDTH / 2 + 4},${BAR_Y - 4} ${BAR_X + BAR_WIDTH / 2},${BAR_Y + 2}`}
                fill="#7c2d12"
              />

              {/* 마커 (도토리) */}
              <g
                transform={`translate(${markerCx}, ${BAR_Y + BAR_HEIGHT / 2})`}
                className={feedback === 'perfect' || feedback === 'fail' ? 'shout-marker-pop' : ''}
                filter="url(#shoutShadow)"
              >
                <Acorn color={markerColor} />
              </g>

              {/* 성공 시 별 파티클 */}
              {feedback === 'perfect' &&
                STAR_BURST_POSITIONS.map((s, i) => (
                  <g
                    key={i}
                    transform={`translate(${240 + s.dx}, ${100 + s.dy})`}
                    className="shout-burst-star"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <Star cx={0} cy={0} r={6} fill="#fde047" stroke="#f59e0b" />
                  </g>
                ))}
            </svg>
          </div>

          <div style={styles.feedback}>
            {feedback === 'perfect' && (
              <span style={{ color: '#047857' }}>정확! 큰 목소리로 외쳤어!</span>
            )}
            {feedback === 'fail' && (
              <span style={{ color: '#b91c1c' }}>작게 외쳤어… 다시!</span>
            )}
            {feedback === 'idle' && missCount === 0 && (
              <span style={{ color: '#78350f' }}>마커 잘 보고 [Space] 누르기!</span>
            )}
            {feedback === 'idle' && missCount > 0 && (
              <span style={{ color: '#78350f' }}>다시 한번… 침착하게.</span>
            )}
          </div>

          {/* 미스 도트 */}
          <div style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  background: i < missCount ? '#ef4444' : 'transparent',
                  borderColor: i < missCount ? '#7f1d1d' : '#b45309',
                }}
              />
            ))}
          </div>
          {missCount > 0 && (
            <div style={styles.penaltyText}>페널티 +{missCount * 2}초</div>
          )}
        </div>
      </div>
    </>
  );
}

// ───────────────────────── 다람쥐 마스코트 ─────────────────────────

function SquirrelMascot({
  feedback,
  inTarget,
  shouting,
}: {
  feedback: Feedback;
  inTarget: boolean;
  shouting: boolean;
}) {
  const eyesType: 'normal' | 'happy' | 'x' =
    feedback === 'perfect' ? 'happy' : feedback === 'fail' ? 'x' : 'normal';
  const showSweat = feedback === 'fail';
  const showBlush = feedback === 'perfect' || (inTarget && feedback === 'idle');

  return (
    <>
      {/* 발 밑 그림자 */}
      <ellipse cx={60} cy={108} rx={32} ry={3} fill="#1c1917" opacity={0.22} />

      {/* 꼬리 (큰 곡선, 뒤쪽) */}
      <path
        d="M 80 80 Q 110 75 112 45 Q 112 16 86 18 Q 80 32 96 50 Q 96 66 82 70 Z"
        fill="url(#furGrad)"
        stroke="#7c2d12"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* 꼬리 줄무늬 */}
      <path
        d="M 92 26 Q 100 36 96 48"
        stroke="#7c2d12"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M 100 32 Q 106 38 104 46"
        stroke="#fef3c7"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* 발 */}
      <ellipse cx={48} cy={104} rx={7} ry={3.5} fill="#7c2d12" />
      <ellipse cx={72} cy={104} rx={7} ry={3.5} fill="#7c2d12" />

      {/* 몸통 */}
      <ellipse cx={60} cy={82} rx={24} ry={20} fill="url(#furGrad)" stroke="#7c2d12" strokeWidth={2.5} />

      {/* 배 */}
      <ellipse cx={60} cy={86} rx={14} ry={12} fill="#fef3c7" stroke="#7c2d12" strokeWidth={1.5} />

      {/* 머리 */}
      <circle cx={60} cy={50} r={22} fill="url(#furGrad)" stroke="#7c2d12" strokeWidth={2.5} />

      {/* 귀 좌 */}
      <path
        d="M 42 32 Q 38 18 47 24 Q 50 30 48 36 Z"
        fill="#d97706"
        stroke="#7c2d12"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 귀 우 */}
      <path
        d="M 78 32 Q 82 18 73 24 Q 70 30 72 36 Z"
        fill="#d97706"
        stroke="#7c2d12"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 귀 안쪽 */}
      <path d="M 44 27 L 46 32" stroke="#fda4af" strokeWidth={2} strokeLinecap="round" />
      <path d="M 76 27 L 74 32" stroke="#fda4af" strokeWidth={2} strokeLinecap="round" />

      {/* 얼굴 (밝은 부분) */}
      <ellipse cx={60} cy={56} rx={15} ry={12} fill="#fef3c7" stroke="#7c2d12" strokeWidth={1.5} />

      {/* 눈 */}
      {eyesType === 'normal' && (
        <>
          <circle cx={52} cy={50} r={3} fill="#1c1917" />
          <circle cx={68} cy={50} r={3} fill="#1c1917" />
          <circle cx={53} cy={48.5} r={1.1} fill="#fff" />
          <circle cx={69} cy={48.5} r={1.1} fill="#fff" />
        </>
      )}
      {eyesType === 'happy' && (
        <>
          <path d="M 48 50 Q 52 46 56 50" stroke="#1c1917" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <path d="M 64 50 Q 68 46 72 50" stroke="#1c1917" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      )}
      {eyesType === 'x' && (
        <>
          <path d="M 48 47 L 56 53 M 56 47 L 48 53" stroke="#1c1917" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M 64 47 L 72 53 M 72 47 L 64 53" stroke="#1c1917" strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}

      {/* 코 */}
      <ellipse cx={60} cy={56} rx={2.2} ry={1.6} fill="#7c2d12" />

      {/* 입 (외칠 때 크게 벌림) */}
      {shouting ? (
        <ellipse cx={60} cy={64} rx={5} ry={5} fill="#7f1d1d" stroke="#1c1917" strokeWidth={1.8} />
      ) : feedback === 'fail' ? (
        <path d="M 56 63 L 64 63" stroke="#1c1917" strokeWidth={2} strokeLinecap="round" />
      ) : (
        <path d="M 56 62 Q 60 65 64 62" stroke="#1c1917" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      )}

      {/* 손 (입 옆에 모은 메가폰 자세) */}
      <ellipse cx={45} cy={64} rx={5} ry={4} fill="url(#furGrad)" stroke="#7c2d12" strokeWidth={1.8} />
      <ellipse cx={75} cy={64} rx={5} ry={4} fill="url(#furGrad)" stroke="#7c2d12" strokeWidth={1.8} />

      {/* 외칠 때 음파 라인 (입 양옆) */}
      {shouting && (
        <>
          <path
            d="M 38 60 Q 32 64 38 68"
            stroke="#dc2626"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            className="shout-wave"
          />
          <path
            d="M 82 60 Q 88 64 82 68"
            stroke="#dc2626"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            className="shout-wave"
          />
        </>
      )}

      {/* 볼 빨강 */}
      {showBlush && (
        <>
          <ellipse cx={42} cy={56} rx={4} ry={2.5} fill="#fda4af" opacity={0.85} />
          <ellipse cx={78} cy={56} rx={4} ry={2.5} fill="#fda4af" opacity={0.85} />
        </>
      )}

      {/* 땀방울 */}
      {showSweat && (
        <path
          d="M 84 36 Q 87 42 90 36 Q 90 32 87 30 Q 84 32 84 36 Z"
          fill="#60a5fa"
          stroke="#1d4ed8"
          strokeWidth={1}
          className="shout-sweat"
        />
      )}
    </>
  );
}

// ───────────────────────── 도토리 마커 ─────────────────────────

function Acorn({ color }: { color: string }) {
  return (
    <>
      {/* 갓 (모자) */}
      <path
        d="M -12 -8 Q -12 -12 -10 -12 L 10 -12 Q 12 -12 12 -8 L 12 -2 Q 12 0 10 0 L -10 0 Q -12 0 -12 -2 Z"
        fill="#7c2d12"
        stroke="#451a03"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* 갓 위 줄기 */}
      <path
        d="M 0 -12 Q -1 -16 0 -18"
        stroke="#451a03"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      {/* 갓 점 무늬 */}
      <circle cx={-6} cy={-7} r={1.2} fill="#451a03" opacity={0.6} />
      <circle cx={0} cy={-5} r={1.2} fill="#451a03" opacity={0.6} />
      <circle cx={6} cy={-7} r={1.2} fill="#451a03" opacity={0.6} />
      {/* 몸 */}
      <ellipse cx={0} cy={6} rx={9} ry={10} fill="url(#markerGrad)" stroke="#7c2d12" strokeWidth={1.8} />
      {/* 하이라이트 */}
      <ellipse cx={-3} cy={3} rx={2} ry={3.5} fill="#fff" opacity={0.5} />
    </>
  );
}

// ───────────────────────── 별 ─────────────────────────

function Star({
  cx,
  cy,
  r,
  fill,
  stroke,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return (
    <polygon points={points.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.2} strokeLinejoin="round" />
  );
}

// ───────────────────────── 상수 ─────────────────────────

const STAR_BURST_POSITIONS = [
  { dx: -60, dy: -30 },
  { dx: 60, dy: -30 },
  { dx: -80, dy: 20 },
  { dx: 80, dy: 20 },
  { dx: 0, dy: -60 },
];

const KEYFRAMES = `
@keyframes shoutBlinkBang {
  0%, 49% { opacity: 1; transform: scale(1); }
  50%, 100% { opacity: 0.4; transform: scale(0.85); }
}
@keyframes shoutSquirrelIdle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes shoutSquirrelCheer {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.04); }
}
@keyframes shoutSquirrelJump {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
  30% { transform: translateY(-14px) rotate(-3deg) scale(1.06); }
  60% { transform: translateY(-14px) rotate(3deg) scale(1.06); }
}
@keyframes shoutSquirrelShake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-3px) rotate(-2deg); }
  75% { transform: translateX(3px) rotate(2deg); }
}
@keyframes shoutBubbleText {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes shoutWave {
  0%, 100% { opacity: 0.4; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.3); }
}
@keyframes shoutTargetGlow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
}
@keyframes shoutMarkerPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes shoutBurstStar {
  0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  40% { opacity: 1; transform: scale(1.1) rotate(120deg); }
  100% { opacity: 0; transform: scale(1.4) rotate(240deg); }
}
@keyframes shoutSweatBob {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(3px); opacity: 0.6; }
}

.shout-blink-bang {
  display: inline-block;
  color: #dc2626;
  animation: shoutBlinkBang 700ms ease-in-out infinite;
}
.shout-squirrel { transform-box: fill-box; }
.shout-idle { animation: shoutSquirrelIdle 2.4s ease-in-out infinite; }
.shout-cheer { animation: shoutSquirrelCheer 0.5s ease-in-out infinite; }
.shout-jump { animation: shoutSquirrelJump 0.55s ease-in-out infinite; }
.shout-shake { animation: shoutSquirrelShake 0.18s ease-in-out infinite; }
.shout-bubble-text {
  animation: shoutBubbleText 0.5s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
.shout-wave {
  animation: shoutWave 0.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.shout-target-glow {
  animation: shoutTargetGlow 1.4s ease-in-out infinite;
}
.shout-marker-pop {
  animation: shoutMarkerPop 0.3s ease-out;
  transform-box: fill-box;
  transform-origin: center;
}
.shout-burst-star {
  animation: shoutBurstStar 0.8s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.shout-sweat {
  animation: shoutSweatBob 0.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
`;

// ───────────────────────── 스타일 ─────────────────────────

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(40, 20, 0, 0.55)',
    zIndex: 800,
    fontFamily: 'Pretendard, sans-serif',
  },
  modal: {
    position: 'relative',
    background:
      'radial-gradient(circle at 30% 20%, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)',
    border: '6px solid #92400e',
    borderRadius: 28,
    padding: '26px 36px 22px',
    minWidth: 540,
    boxShadow:
      '0 12px 40px rgba(60, 30, 0, 0.55), inset 0 0 0 3px #fde68a, inset 0 0 24px rgba(146, 64, 14, 0.15)',
    color: '#78350f',
    textAlign: 'center',
  },
  nail: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background:
      'radial-gradient(circle at 35% 30%, #fcd34d 0%, #b45309 60%, #78350f 100%)',
    boxShadow: 'inset -1px -1px 2px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: 26,
    fontWeight: 900,
    marginBottom: 4,
    color: '#7c2d12',
    textShadow: '0 2px 0 #fde68a, 0 3px 4px rgba(124, 45, 18, 0.2)',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 6,
    opacity: 0.8,
  },
  svgWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  feedback: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 800,
    minHeight: 22,
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: '2px solid #b45309',
    background: 'transparent',
    transition: 'background 120ms ease',
  },
  penaltyText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 800,
    color: '#9a3412',
    opacity: 0.85,
  },
};
