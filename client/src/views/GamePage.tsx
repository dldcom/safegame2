// Phaser 마운트 페이지. React 오버레이 (DialogueBox, TouchControls) 도 같이.

import { useEffect, useRef } from 'react';
import { createPhaserGame } from '@/main-phaser';
import DialogueBox from '@/components/DialogueBox';
import TouchControls from '@/components/TouchControls';
import { useGameStore } from '@/store/useGameStore';

const PARENT_ID = 'phaser-parent';

export default function GamePage() {
  const startAct = useGameStore((s) => s.currentAct);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = createPhaserGame({
      parent: PARENT_ID,
      startAct,
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [startAct]);

  return (
    <div style={styles.wrap}>
      <div id={PARENT_ID} style={styles.phaser} />
      <DialogueBox />
      <TouchControls />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: '#000',
  },
  phaser: {
    width: '100%',
    height: '100%',
  },
};
