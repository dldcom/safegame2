// 화면 위에 가상 조이스틱(좌하단) + A 버튼(우하단) 오버레이 (mesa 에서 그대로 가져옴).
// 태블릿 터치는 물론 데스크톱 마우스로도 동작 (pointer events).
// A 버튼은 합성 keydown('Space') 을 window 에 dispatch — Phaser 와 DialogueBox 가 그대로 처리.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTouchControlsStore } from '@/store/useTouchControlsStore';

const JOY_BASE_SIZE = 140;
const JOY_KNOB_SIZE = 60;
const JOY_MAX_OFFSET = (JOY_BASE_SIZE - JOY_KNOB_SIZE) / 2;
const A_BUTTON_SIZE = 96;

export default function TouchControls() {
  const setJoy = useTouchControlsStore((s) => s.setJoy);
  const setCrouching = useTouchControlsStore((s) => s.setCrouching);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [bPressed, setBPressed] = useState(false);
  const activePointer = useRef<number | null>(null);

  const release = useCallback(() => {
    activePointer.current = null;
    setKnob({ dx: 0, dy: 0 });
    setJoy(0, 0);
  }, [setJoy]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > JOY_MAX_OFFSET) {
        dx = (dx / dist) * JOY_MAX_OFFSET;
        dy = (dy / dist) * JOY_MAX_OFFSET;
      }
      setKnob({ dx, dy });
      setJoy(dx / JOY_MAX_OFFSET, dy / JOY_MAX_OFFSET);
    },
    [setJoy]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (activePointer.current !== e.pointerId) return;
      updateFromPointer(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (activePointer.current !== e.pointerId) return;
      release();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [updateFromPointer, release]);

  // 키보드 C 키 — B 버튼 홀드와 동일 동작
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC' && !e.repeat) {
        setBPressed(true);
        setCrouching(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        setBPressed(false);
        setCrouching(false);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [setCrouching]);

  const onJoyDown = (e: React.PointerEvent) => {
    if (activePointer.current !== null) return;
    activePointer.current = e.pointerId;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const fireA = useCallback(() => {
    const ev = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
    });
    Object.defineProperty(ev, 'keyCode', { get: () => 32 });
    Object.defineProperty(ev, 'which', { get: () => 32 });
    window.dispatchEvent(ev);
    setTimeout(() => {
      const up = new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
      });
      Object.defineProperty(up, 'keyCode', { get: () => 32 });
      Object.defineProperty(up, 'which', { get: () => 32 });
      window.dispatchEvent(up);
    }, 50);
  }, []);

  return (
    <>
      <div
        ref={baseRef}
        style={styles.joyBase}
        onPointerDown={onJoyDown}
      >
        <div
          style={{
            ...styles.joyKnob,
            transform: `translate(calc(-50% + ${knob.dx}px), calc(-50% + ${knob.dy}px))`,
          }}
        />
      </div>

      {/* B 버튼 — 우하단, A 버튼 왼쪽 (낮은 자세 + 코 가림 홀드) */}
      <button
        type="button"
        style={{ ...styles.bButton, ...(bPressed ? styles.bButtonPressed : null) }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setBPressed(true);
          setCrouching(true);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          setBPressed(false);
          setCrouching(false);
        }}
        onPointerCancel={() => {
          setBPressed(false);
          setCrouching(false);
        }}
      >
        B
      </button>

      {/* A 버튼 — 우하단 */}
      <button
        type="button"
        style={styles.aButton}
        onPointerDown={(e) => {
          e.preventDefault();
          fireA();
        }}
      >
        A
      </button>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  joyBase: {
    position: 'absolute',
    left: 32,
    bottom: 32,
    width: JOY_BASE_SIZE,
    height: JOY_BASE_SIZE,
    borderRadius: '50%',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '3px solid rgba(148, 163, 184, 0.6)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
    touchAction: 'none',
    userSelect: 'none',
    zIndex: 700,
  },
  joyKnob: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: JOY_KNOB_SIZE,
    height: JOY_KNOB_SIZE,
    borderRadius: '50%',
    background: 'rgba(96, 165, 250, 0.85)',
    border: '2px solid #fff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    transition: 'background 100ms ease',
  },
  aButton: {
    position: 'absolute',
    right: 32,
    bottom: 48,
    width: A_BUTTON_SIZE,
    height: A_BUTTON_SIZE,
    borderRadius: '50%',
    background: '#f59e0b',
    color: '#1c1917',
    border: '4px solid #fff',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
    fontSize: 36,
    fontWeight: 900,
    fontFamily: 'Pretendard, sans-serif',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    zIndex: 700,
  },
  bButton: {
    position: 'absolute',
    right: 32 + A_BUTTON_SIZE + 16, // A 버튼 왼쪽 16px 간격
    bottom: 48,
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#3b82f6',
    color: '#fff',
    border: '4px solid #fff',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
    fontSize: 30,
    fontWeight: 900,
    fontFamily: 'Pretendard, sans-serif',
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    zIndex: 700,
    transition: 'transform 80ms ease, background 80ms ease',
  },
  bButtonPressed: {
    transform: 'scale(0.9)',
    background: '#1d4ed8',
  },
};
