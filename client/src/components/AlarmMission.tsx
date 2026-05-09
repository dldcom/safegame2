// 미션 2: 화재경보기 홀드 게이지.
// 큰 버튼 꾹 누르고 있으면 게이지 0→100%. 70~90% 사이에 떼면 사이렌 작동(성공).
// <70% 떼면: 약함, 재시도. 100% 도달까지 안 떼면: 망가짐, 재시도 + 페널티.

import { useEffect, useRef, useState } from 'react';
import { useAlarmMissionStore } from '@/store/useAlarmMissionStore';

const FILL_DURATION_MS = 1400; // 0 → 100% 까지 걸리는 시간 (홀드)
const TARGET_MIN = 0.7;
const TARGET_MAX = 0.9;

// 호 게이지 기하
const CX = 220;
const CY = 200;
const R = 150;
const ARC_LEN = Math.PI * R;

type Phase = 'idle' | 'holding' | 'weak' | 'broken' | 'success';

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  // 0° = 위(12시), 양수 = 시계방향
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
};

// 진행 0~1 → 게이지 호 위 각도 (-90° 시작 ~ +90° 끝)
const progressToAngle = (p: number) => -90 + p * 180;

export default function AlarmMission() {
  const active = useAlarmMissionStore((s) => s.active);
  const onResolve = useAlarmMissionStore((s) => s.onResolve);
  const close = useAlarmMissionStore((s) => s.close);

  const [progress, setProgress] = useState(0); // 0~1
  const [phase, setPhase] = useState<Phase>('idle');
  const [weakAttempts, setWeakAttempts] = useState(0);
  const [breakAttempts, setBreakAttempts] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  // 활성화 시 초기화
  useEffect(() => {
    if (!active) return;
    setProgress(0);
    setPhase('idle');
    setWeakAttempts(0);
    setBreakAttempts(0);
    holdStartRef.current = null;
  }, [active]);

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startHold = () => {
    if (phaseRef.current !== 'idle') return;
    setPhase('holding');
    holdStartRef.current = performance.now();
    const tick = (now: number) => {
      const start = holdStartRef.current;
      if (start === null) return;
      const p = Math.min(1, (now - start) / FILL_DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        // 망가짐 — release 안 해도 자동 종료
        stopRaf();
        holdStartRef.current = null;
        setPhase('broken');
        setBreakAttempts((c) => c + 1);
        setTimeout(() => {
          setProgress(0);
          setPhase('idle');
        }, 1100);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const releaseHold = () => {
    if (phaseRef.current !== 'holding') return;
    stopRaf();
    const start = holdStartRef.current;
    holdStartRef.current = null;
    if (start === null) return;
    const finalP = Math.min(1, (performance.now() - start) / FILL_DURATION_MS);
    setProgress(finalP);
    if (finalP >= TARGET_MIN && finalP <= TARGET_MAX) {
      setPhase('success');
      setTimeout(() => {
        onResolve?.('success', weakAttempts, breakAttempts);
        close();
      }, 900);
    } else if (finalP < TARGET_MIN) {
      setPhase('weak');
      setWeakAttempts((c) => c + 1);
      setTimeout(() => {
        setProgress(0);
        setPhase('idle');
      }, 900);
    } else {
      // 90~100% 구간에 떼었음 — 너무 셈
      setPhase('broken');
      setBreakAttempts((c) => c + 1);
      setTimeout(() => {
        setProgress(0);
        setPhase('idle');
      }, 1100);
    }
  };

  // 키보드 Space 홀드
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      startHold();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      e.stopPropagation();
      releaseHold();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [active]);

  // 컴포넌트 unmount 시 RAF 정리
  useEffect(() => {
    return () => stopRaf();
  }, []);

  if (!active) return null;

  const pct = Math.round(progress * 100);
  const inTarget = progress >= TARGET_MIN && progress <= TARGET_MAX;
  const overTarget = progress > TARGET_MAX;

  // 게이지 호 채움 색
  const fillColor =
    phase === 'success'
      ? '#10b981'
      : phase === 'broken'
      ? '#dc2626'
      : phase === 'weak'
      ? '#f59e0b'
      : inTarget
      ? '#10b981'
      : overTarget
      ? '#dc2626'
      : '#fb923c';

  // 마스코트 상태 클래스
  const mascotClass =
    phase === 'success'
      ? 'mascot mascot-ring'
      : phase === 'broken'
      ? 'mascot mascot-dazed'
      : phase === 'weak'
      ? 'mascot mascot-tilt'
      : phase === 'holding' && inTarget
      ? 'mascot mascot-jump'
      : phase === 'holding'
      ? 'mascot mascot-shake'
      : 'mascot mascot-idle';

  // 호 경로
  const trackPath = arcPath(CX, CY, R, -90, 90);
  const targetPath = arcPath(CX, CY, R, progressToAngle(TARGET_MIN), progressToAngle(TARGET_MAX));
  const needleAngle = progressToAngle(progress);

  // 눈금 (0, 25, 50, 75, 100%)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const a = progressToAngle(t);
    const inner = polar(CX, CY, R - 30, a);
    const outer = polar(CX, CY, R - 12, a);
    return { a, inner, outer, key: t };
  });

  return (
    <div style={styles.backdrop}>
      <style>{KEYFRAMES}</style>
      <div style={styles.modal}>
        {/* 나무 프레임 장식 못 4개 */}
        <div style={{ ...styles.nail, top: 10, left: 10 }} />
        <div style={{ ...styles.nail, top: 10, right: 10 }} />
        <div style={{ ...styles.nail, bottom: 10, left: 10 }} />
        <div style={{ ...styles.nail, bottom: 10, right: 10 }} />

        <div style={styles.title}>화재경보기 작동시키기</div>
        <div style={styles.subtitle}>초록 별자리에서 손을 떼!</div>

        <div style={styles.gaugeWrap}>
          <svg width={440} height={310} viewBox="0 0 440 310" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="trackGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={fillColor} />
              </linearGradient>
              <radialGradient id="helmetGrad" cx="0.4" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#a16207" />
              </radialGradient>
              <linearGradient id="coatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0f1e3a" />
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="3" result="off" />
                <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 호 트랙 (배경) */}
            <path
              d={trackPath}
              stroke="#fef3c7"
              strokeWidth={28}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={trackPath}
              stroke="url(#trackGrad)"
              strokeWidth={22}
              strokeLinecap="round"
              fill="none"
              opacity={0.55}
            />

            {/* 타겟 영역 (초록 별자리 띠) */}
            <path
              d={targetPath}
              stroke="#34d399"
              strokeWidth={26}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <path
              d={targetPath}
              stroke="#a7f3d0"
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
            />

            {/* 진행 채움 */}
            <path
              d={trackPath}
              stroke="url(#fillGrad)"
              strokeWidth={20}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={ARC_LEN * (1 - progress)}
              style={{ transition: 'stroke 120ms ease' }}
            />

            {/* 눈금 */}
            {ticks.map((t) => (
              <line
                key={t.key}
                x1={t.inner.x}
                y1={t.inner.y}
                x2={t.outer.x}
                y2={t.outer.y}
                stroke="#92400e"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
              />
            ))}

            {/* 라벨 */}
            <text
              x={polar(CX, CY, R + 28, -90).x}
              y={polar(CX, CY, R + 28, -90).y + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight={800}
              fill="#92400e"
              opacity={0.7}
            >
              약
            </text>
            <text
              x={polar(CX, CY, R + 28, 90).x}
              y={polar(CX, CY, R + 28, 90).y + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight={800}
              fill="#92400e"
              opacity={0.7}
            >
              강
            </text>

            {/* 바늘 */}
            <g
              transform={`rotate(${needleAngle} ${CX} ${CY})`}
              style={{ transition: phase === 'idle' ? 'transform 200ms ease' : 'none' }}
              filter="url(#softShadow)"
            >
              <polygon
                points={`${CX - 4},${CY} ${CX},${CY - R + 18} ${CX + 4},${CY}`}
                fill="#1c1917"
              />
              <polygon
                points={`${CX - 6},${CY - R + 24} ${CX},${CY - R + 8} ${CX + 6},${CY - R + 24}`}
                fill="#dc2626"
              />
            </g>

            {/* 중앙 허브 (나사 머리) */}
            <circle cx={CX} cy={CY} r={14} fill="#78350f" />
            <circle cx={CX} cy={CY} r={10} fill="#b45309" />
            <line x1={CX - 6} y1={CY} x2={CX + 6} y2={CY} stroke="#451a03" strokeWidth={2} strokeLinecap="round" />

            {/* 퍼센트 라벨 */}
            <text
              x={CX}
              y={CY + 38}
              textAnchor="middle"
              fontSize={20}
              fontWeight={900}
              fill="#78350f"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {pct}%
            </text>

            {/* 마스코트 소방관 캐릭터 */}
            <g
              transform={`translate(${CX - 50}, ${CY + 60})`}
              className={mascotClass}
              style={{ transformOrigin: '50px 50px' }}
            >
              <FirefighterMascot phase={phase} inTarget={inTarget} />
            </g>

            {/* 성공 시 종소리 광선 */}
            {phase === 'success' && (
              <g transform={`translate(${CX}, ${CY + 110})`} style={{ transformOrigin: '0 0' }}>
                {[-60, -30, 0, 30, 60].map((deg, i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={-30}
                    x2={0}
                    y2={-50}
                    stroke="#fbbf24"
                    strokeWidth={3}
                    strokeLinecap="round"
                    transform={`rotate(${deg})`}
                    className="ring-line"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </g>
            )}

            {/* 타겟 안에 들어왔을 때 스파클 파티클 */}
            {phase === 'holding' && inTarget && (
              <g>
                {SPARKLE_POSITIONS.map((s, i) => {
                  const tipPos = polar(CX, CY, R - 12, needleAngle);
                  return (
                    <g
                      key={i}
                      transform={`translate(${tipPos.x + s.dx}, ${tipPos.y + s.dy})`}
                      className="sparkle"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <path
                        d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z"
                        fill="#fde047"
                        stroke="#f59e0b"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        <button
          type="button"
          style={{
            ...styles.holdButton,
            ...(phase === 'holding' ? styles.holdButtonActive : null),
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as Element).setPointerCapture?.(e.pointerId);
            startHold();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            releaseHold();
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            releaseHold();
          }}
        >
          <span style={styles.holdButtonLabel}>꾹 누르기</span>
          <span style={styles.holdHint}>A / Space</span>
        </button>

        <div style={styles.feedback}>
          {phase === 'idle' && weakAttempts === 0 && breakAttempts === 0 && (
            <span style={{ color: '#78350f' }}>버튼을 꾹 눌러서 게이지를 올려보자!</span>
          )}
          {phase === 'holding' && !inTarget && !overTarget && (
            <span style={{ color: '#b45309' }}>조금만 더…</span>
          )}
          {phase === 'holding' && inTarget && (
            <span style={{ color: '#047857' }}>지금이야! 손 떼!</span>
          )}
          {phase === 'holding' && overTarget && (
            <span style={{ color: '#b91c1c' }}>너무 세! 곧 부서져!</span>
          )}
          {phase === 'weak' && (
            <span style={{ color: '#b45309' }}>약해서 안 눌렸어. 좀 더 세게!</span>
          )}
          {phase === 'broken' && (
            <span style={{ color: '#b91c1c' }}>너무 세서 망가질 뻔했어 — 다시!</span>
          )}
          {phase === 'success' && (
            <span style={{ color: '#047857' }}>딸랑딸랑! 사이렌이 울렸다!</span>
          )}
          {phase === 'idle' && (weakAttempts > 0 || breakAttempts > 0) && (
            <span style={{ color: '#78350f' }}>다시 시도… 초록 별자리에서 손 떼!</span>
          )}
        </div>

        {(weakAttempts > 0 || breakAttempts > 0) && (
          <div style={styles.missInfo}>
            약함 {weakAttempts} · 망가짐 {breakAttempts} (페널티 +
            {weakAttempts * 1 + breakAttempts * 3}초)
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 소방관 마스코트 ─────────────────────────

function FirefighterMascot({ phase, inTarget }: { phase: Phase; inTarget: boolean }) {
  const eyesType: 'normal' | 'happy' | 'x' | 'dot' =
    phase === 'success' || (phase === 'holding' && inTarget)
      ? 'happy'
      : phase === 'broken'
      ? 'x'
      : phase === 'weak'
      ? 'dot'
      : 'normal';
  const showSweat = phase === 'weak' || (phase === 'holding' && !inTarget);
  const showBlush = phase === 'success' || (phase === 'holding' && inTarget);
  const helmetTilt = phase === 'broken' ? -12 : 0;
  const handsUp = phase === 'success' || (phase === 'holding' && inTarget);

  return (
    <>
      {/* 발 밑 그림자 */}
      <ellipse cx={50} cy={102} rx={28} ry={3} fill="#1c1917" opacity={0.25} />

      {/* 다리/부츠 */}
      <rect x={36} y={94} width={10} height={8} rx={2} fill="#1c1917" stroke="#000" strokeWidth={1} />
      <rect x={54} y={94} width={10} height={8} rx={2} fill="#1c1917" stroke="#000" strokeWidth={1} />

      {/* 몸통 (소방복) */}
      <path
        d="M 22 75 Q 22 70 28 68 L 72 68 Q 78 70 78 75 L 78 96 Q 50 100 22 96 Z"
        fill="url(#coatGrad)"
        stroke="#0c1430"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* 반사 노란 스트라이프 */}
      <rect x={22} y={84} width={56} height={5} fill="#fbbf24" stroke="#7c2d12" strokeWidth={1} />
      <rect x={22} y={84} width={56} height={1.5} fill="#fef08a" opacity={0.8} />

      {/* 옷 중앙 지퍼 */}
      <line x1={50} y1={68} x2={50} y2={96} stroke="#0c1430" strokeWidth={1.5} />

      {/* 단추 (양쪽) */}
      <circle cx={42} cy={78} r={1.8} fill="#fbbf24" stroke="#7c2d12" strokeWidth={0.6} />
      <circle cx={58} cy={78} r={1.8} fill="#fbbf24" stroke="#7c2d12" strokeWidth={0.6} />
      <circle cx={42} cy={92} r={1.8} fill="#fbbf24" stroke="#7c2d12" strokeWidth={0.6} />
      <circle cx={58} cy={92} r={1.8} fill="#fbbf24" stroke="#7c2d12" strokeWidth={0.6} />

      {/* 손 (성공/타겟이면 위로 만세, 아니면 옆으로) */}
      {handsUp ? (
        <>
          <circle cx={14} cy={56} r={6} fill="#fde68a" stroke="#92400e" strokeWidth={1.8} />
          <circle cx={86} cy={56} r={6} fill="#fde68a" stroke="#92400e" strokeWidth={1.8} />
          {/* 팔 */}
          <path d="M 22 72 Q 16 64 14 56" stroke="url(#coatGrad)" strokeWidth={6} strokeLinecap="round" fill="none" />
          <path d="M 78 72 Q 84 64 86 56" stroke="url(#coatGrad)" strokeWidth={6} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx={18} cy={84} r={6} fill="#fde68a" stroke="#92400e" strokeWidth={1.8} />
          <circle cx={82} cy={84} r={6} fill="#fde68a" stroke="#92400e" strokeWidth={1.8} />
        </>
      )}

      {/* 목 */}
      <rect x={43} y={62} width={14} height={7} fill="#fde68a" stroke="#92400e" strokeWidth={1.5} />

      {/* === 머리 그룹 (헬멧+얼굴, broken 시 기울어짐) === */}
      <g transform={`rotate(${helmetTilt} 50 48)`}>
        {/* 얼굴 */}
        <ellipse cx={50} cy={50} rx={18} ry={17} fill="#fde68a" stroke="#92400e" strokeWidth={2} />

        {/* 헬멧 챙 */}
        <path
          d="M 22 36 Q 50 42 78 36 L 76 41 Q 50 47 24 41 Z"
          fill="#f59e0b"
          stroke="#7c2d12"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* 헬멧 돔 */}
        <path
          d="M 28 38 Q 28 16 50 14 Q 72 16 72 38 Q 60 36 50 36 Q 40 36 28 38 Z"
          fill="url(#helmetGrad)"
          stroke="#7c2d12"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* 헬멧 빨간 휘장 (방패형) */}
        <path
          d="M 44 17 L 56 17 L 57 28 Q 50 32 43 28 Z"
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <text
          x={50}
          y={26}
          textAnchor="middle"
          fontSize={6}
          fontWeight={900}
          fill="#fff"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          119
        </text>

        {/* 헬멧 하이라이트 */}
        <ellipse cx={36} cy={22} rx={5} ry={9} fill="#fff" opacity={0.4} />

        {/* 볼 빨강 */}
        {showBlush && (
          <>
            <ellipse cx={36} cy={56} rx={4} ry={2.5} fill="#fda4af" opacity={0.85} />
            <ellipse cx={64} cy={56} rx={4} ry={2.5} fill="#fda4af" opacity={0.85} />
          </>
        )}

        {/* 눈 */}
        {eyesType === 'normal' && (
          <>
            <circle cx={42} cy={50} r={2.8} fill="#1c1917" />
            <circle cx={58} cy={50} r={2.8} fill="#1c1917" />
            <circle cx={43} cy={48.8} r={1} fill="#fff" />
            <circle cx={59} cy={48.8} r={1} fill="#fff" />
          </>
        )}
        {eyesType === 'happy' && (
          <>
            <path d="M 38 50 Q 42 46 46 50" stroke="#1c1917" strokeWidth={2.2} fill="none" strokeLinecap="round" />
            <path d="M 54 50 Q 58 46 62 50" stroke="#1c1917" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </>
        )}
        {eyesType === 'x' && (
          <>
            <path d="M 38 47 L 46 53 M 46 47 L 38 53" stroke="#1c1917" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M 54 47 L 62 53 M 62 47 L 54 53" stroke="#1c1917" strokeWidth={2.2} strokeLinecap="round" />
          </>
        )}
        {eyesType === 'dot' && (
          <>
            <circle cx={42} cy={50} r={1.5} fill="#1c1917" />
            <circle cx={58} cy={50} r={1.5} fill="#1c1917" />
          </>
        )}

        {/* 입 */}
        {phase === 'success' || (phase === 'holding' && inTarget) ? (
          <path d="M 44 60 Q 50 66 56 60" stroke="#1c1917" strokeWidth={2.2} fill="#7f1d1d" strokeLinecap="round" />
        ) : phase === 'broken' ? (
          <ellipse cx={50} cy={62} rx={3.5} ry={2.5} fill="#1c1917" />
        ) : phase === 'weak' ? (
          <path d="M 46 62 L 54 62" stroke="#1c1917" strokeWidth={2.2} strokeLinecap="round" />
        ) : (
          <path d="M 45 60 Q 50 64 55 60" stroke="#1c1917" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        )}

        {/* 땀방울 */}
        {showSweat && (
          <path
            d="M 76 36 Q 79 42 82 36 Q 82 32 79 30 Q 76 32 76 36 Z"
            fill="#60a5fa"
            stroke="#1d4ed8"
            strokeWidth={1}
            className="sweat-drop"
          />
        )}
      </g>
    </>
  );
}

// ───────────────────────── 상수 ─────────────────────────

const SPARKLE_POSITIONS = [
  { dx: -16, dy: -8 },
  { dx: 14, dy: -10 },
  { dx: 0, dy: -22 },
  { dx: -22, dy: 6 },
  { dx: 18, dy: 8 },
];

const KEYFRAMES = `
@keyframes mascotIdle {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(0deg); }
}
@keyframes mascotShake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(-2deg); }
  75% { transform: translateX(2px) rotate(2deg); }
}
@keyframes mascotJump {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
  40% { transform: translateY(-10px) rotate(-3deg) scale(1.05); }
  60% { transform: translateY(-10px) rotate(3deg) scale(1.05); }
}
@keyframes mascotRing {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-12deg); }
  40% { transform: rotate(10deg); }
  60% { transform: rotate(-8deg); }
  80% { transform: rotate(6deg); }
}
@keyframes mascotDazed {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
@keyframes mascotTilt {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-8deg) translateY(2px); }
}
@keyframes sparkleFloat {
  0% { opacity: 0; transform: translate(var(--sx, 0), var(--sy, 0)) scale(0.4); }
  30% { opacity: 1; transform: translate(var(--sx, 0), calc(var(--sy, 0) - 6px)) scale(1); }
  100% { opacity: 0; transform: translate(var(--sx, 0), calc(var(--sy, 0) - 18px)) scale(0.6); }
}
@keyframes ringLine {
  0% { opacity: 0; transform: scaleY(0.3); }
  40% { opacity: 1; transform: scaleY(1); }
  100% { opacity: 0; transform: scaleY(1.4); }
}
@keyframes sweatBob {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(3px); opacity: 0.6; }
}

.mascot { transform-box: fill-box; }
.mascot-idle { animation: mascotIdle 2.4s ease-in-out infinite; }
.mascot-shake { animation: mascotShake 0.18s ease-in-out infinite; }
.mascot-jump { animation: mascotJump 0.5s ease-in-out infinite; }
.mascot-ring { animation: mascotRing 0.6s ease-in-out infinite; }
.mascot-dazed { animation: mascotDazed 0.5s ease-in-out infinite; }
.mascot-tilt { animation: mascotTilt 0.6s ease-in-out infinite; }

.sparkle { animation: sparkleFloat 0.9s ease-out infinite; transform-box: fill-box; }
.ring-line { animation: ringLine 0.6s ease-out infinite; transform-origin: center bottom; transform-box: fill-box; }
.sweat-drop { animation: sweatBob 0.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
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
  },
  modal: {
    position: 'relative',
    background:
      'radial-gradient(circle at 30% 20%, #fffbeb 0%, #fef3c7 60%, #fde68a 100%)',
    border: '6px solid #92400e',
    borderRadius: 28,
    padding: '26px 36px 22px',
    minWidth: 520,
    boxShadow:
      '0 12px 40px rgba(60, 30, 0, 0.55), inset 0 0 0 3px #fde68a, inset 0 0 24px rgba(146, 64, 14, 0.15)',
    color: '#78350f',
    fontFamily: 'Pretendard, sans-serif',
    textAlign: 'center',
  },
  nail: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #fcd34d 0%, #b45309 60%, #78350f 100%)',
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
    marginBottom: 8,
    opacity: 0.8,
  },
  gaugeWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '4px 0 8px',
  },
  holdButton: {
    width: 160,
    height: 64,
    borderRadius: 32,
    background: 'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)',
    color: '#fff',
    border: '4px solid #7c2d12',
    boxShadow:
      '0 6px 0 #7c2d12, 0 8px 16px rgba(124, 45, 18, 0.4), inset 0 2px 0 rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Pretendard, sans-serif',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    transition: 'transform 80ms ease, box-shadow 80ms ease, background 80ms ease',
    margin: '4px 0 8px',
  },
  holdButtonActive: {
    transform: 'translateY(4px)',
    boxShadow:
      '0 2px 0 #7c2d12, 0 3px 8px rgba(124, 45, 18, 0.4), inset 0 2px 0 rgba(255,255,255,0.3)',
    background: 'linear-gradient(180deg, #ea580c 0%, #c2410c 100%)',
  },
  holdButtonLabel: {
    lineHeight: 1,
  },
  holdHint: {
    fontSize: 11,
    fontWeight: 700,
    opacity: 0.85,
  },
  feedback: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 800,
    minHeight: 22,
  },
  missInfo: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#9a3412',
    opacity: 0.8,
  },
};
