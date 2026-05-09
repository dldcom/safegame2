// 1막 Map 3: 운동장.
// CP6 (안전거리 + 점호) — proximity 자동 트리거.
// 정답 후 친구들 원형 정렬 + 점호 텍스트 시퀀스 + 1막 클리어 이벤트.

import Phaser from 'phaser';
import { CHARACTER_IDS } from '@shared/lib/characters';
import { animKey, ensureCharacterAnimations, readMovementInput } from './characterAnims';
import { loadTiledMap, type LoadedMap } from './loadTiledMap';
import { buildFriendSlots } from './friendSlots';
import { useGameStore } from '@/store/useGameStore';
import { gameEventBus } from '@/lib/gameEventBus';
import { runCheckpoint } from './runCheckpoint';
import { CP6_GATHERING } from './act1Checkpoints';

const PLAYER_SPEED = 180;
const PLAYER_DEPTH = 100;
const NPC_DEPTH = 90;

type Friend = {
  characterId: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  homeX: number;
  homeY: number;
  wanderTargetX: number;
  wanderTargetY: number;
  wanderTimer: number;
  lastDir: 'down' | 'up' | 'left' | 'right';
};

const requireMapSpawn = (map: LoadedMap, name: string) => {
  const sp = map.spawns.get(name);
  if (!sp) throw new Error(`spawn "${name}" not found in playground map`);
  return sp;
};

export default class Act1PlaygroundScene extends Phaser.Scene {
  private map!: LoadedMap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerCharacterId = 'puppy';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private friends: Friend[] = [];
  private lastDir: 'down' | 'up' | 'left' | 'right' = 'down';
  private cp6Triggered = false;
  private movementLocked = false;

  constructor() {
    super('Act1PlaygroundScene');
  }

  create() {
    this.cameras.main.fadeIn(800, 0, 0, 0);

    const selected = useGameStore.getState().selectedCharacter ?? CHARACTER_IDS[0];
    this.playerCharacterId = selected;

    this.map = loadTiledMap(this, 'act1_playground');
    ensureCharacterAnimations(this, CHARACTER_IDS);

    // 플레이어
    const playerSpawn = requireMapSpawn(this.map, 'playerspawn');
    this.player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, this.playerCharacterId, 0);
    this.player.setDepth(PLAYER_DEPTH);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(28, 16);
    this.player.body!.setOffset(10, 46);
    this.physics.add.collider(this.player, this.map.collisionBodies);

    // 친구 5명
    const slots = buildFriendSlots(this.playerCharacterId);
    for (const [slotName, characterId] of Object.entries(slots)) {
      const sp = requireMapSpawn(this.map, slotName);
      const sprite = this.physics.add.sprite(sp.x, sp.y, characterId, 0);
      sprite.setDepth(NPC_DEPTH);
      sprite.body!.setSize(28, 16);
      sprite.body!.setOffset(10, 46);
      this.physics.add.collider(sprite, this.map.collisionBodies);
      this.friends.push({
        characterId,
        sprite,
        homeX: sp.x,
        homeY: sp.y,
        wanderTargetX: sp.x,
        wanderTargetY: sp.y,
        wanderTimer: Math.random() * 1500,
        lastDir: 'down',
      });
    }

    // 카메라
    this.cameras.main.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // 화재 건물 위험 효과 (위쪽)
    this.addDangerEffect();

    // 안전 지점 마커 (아래쪽 — 깜빡이는 초록 ring)
    this.addSafeMarker();
  }

  private addDangerEffect() {
    const zone = this.map.spawns.get('zone_danger_building');
    if (!zone) return;
    // 학교 건물 위쪽에서 솟는 회색 연기 점들
    const graphics = this.add.graphics();
    graphics.setDepth(60);
    const draw = () => {
      graphics.clear();
      graphics.fillStyle(0x6b7280, 0.6);
      const left = zone.x - zone.width / 2;
      const right = zone.x + zone.width / 2;
      const top = zone.y - zone.height / 2;
      const bottom = zone.y + zone.height / 2;
      for (let i = 0; i < 30; i++) {
        const x = left + Math.random() * (right - left);
        const y = top + Math.random() * (bottom - top);
        graphics.fillCircle(x, y, Math.random() * 5 + 2);
      }
    };
    draw();
    this.time.addEvent({ delay: 250, callback: draw, loop: true });
  }

  private addSafeMarker() {
    const zone = this.map.spawns.get('zone_safe_gathering');
    if (!zone) return;
    const ring = this.add.graphics();
    ring.setDepth(50);
    this.tweens.add({
      targets: { alpha: 0.35 },
      alpha: 0.85,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_t, target) => {
        ring.clear();
        ring.lineStyle(4, 0x10b981, target.alpha);
        ring.strokeCircle(zone.x, zone.y, 90);
        ring.lineStyle(2, 0x10b981, target.alpha * 0.6);
        ring.strokeCircle(zone.x, zone.y, 110);
      },
    });
    // 텍스트 라벨
    const label = this.add.text(zone.x, zone.y - 130, '안전 모임 지점', {
      fontSize: '14px',
      color: '#10b981',
      fontStyle: 'bold',
      fontFamily: 'Pretendard, sans-serif',
      stroke: '#064e3b',
      strokeThickness: 3,
    });
    label.setOrigin(0.5);
    label.setDepth(51);
  }

  private async startCp6() {
    if (this.cp6Triggered) return;
    this.cp6Triggered = true;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);

    await runCheckpoint(CP6_GATHERING, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    });

    // 친구 5명을 학생 주변에 원형 정렬
    await this.gatherFriends();

    // 점호 시퀀스
    await this.showRollCall();

    useGameStore.getState().recordCheckpoint(1, 5, 'success');
    useGameStore.getState().advanceCheckpoint(1);

    // 1막 클리어
    gameEventBus.emit('act:completed', { act: 1 });
  }

  private async gatherFriends() {
    const safe = this.map.spawns.get('zone_safe_gathering');
    if (!safe) return;
    const radius = 70;
    for (let i = 0; i < this.friends.length; i++) {
      const angle = (i / this.friends.length) * Math.PI * 2 + Math.PI / 2;
      const targetX = safe.x + Math.cos(angle) * radius;
      const targetY = safe.y + Math.sin(angle) * radius;
      this.tweens.add({
        targets: this.friends[i].sprite,
        x: targetX,
        y: targetY,
        duration: 900,
        ease: 'Sine.easeInOut',
      });
    }
    await new Promise<void>((resolve) =>
      this.time.delayedCall(1000, () => resolve())
    );
  }

  private async showRollCall() {
    const numbers = ['하나!', '둘!', '셋!', '넷!', '다섯!', '여섯!'];
    for (const num of numbers) {
      const cx = this.cameras.main.scrollX + this.scale.width / 2;
      const cy = this.cameras.main.scrollY + this.scale.height / 2 - 60;
      const text = this.add.text(cx, cy, num, {
        fontSize: '36px',
        color: '#fef3c7',
        fontStyle: 'bold',
        fontFamily: 'Pretendard, sans-serif',
        stroke: '#000',
        strokeThickness: 4,
      });
      text.setOrigin(0.5);
      text.setDepth(2000);
      text.setScrollFactor(0);
      this.tweens.add({
        targets: text,
        y: text.y - 30,
        alpha: 0,
        scale: 1.6,
        duration: 600,
        ease: 'Sine.easeOut',
        onComplete: () => text.destroy(),
      });
      await new Promise<void>((resolve) =>
        this.time.delayedCall(400, () => resolve())
      );
    }
    await new Promise<void>((resolve) =>
      this.time.delayedCall(500, () => resolve())
    );
  }

  update(time: number, delta: number) {
    if (!this.player) return;

    // 학생이 안전 지점 100px 이내 도달 시 CP6 자동 트리거
    if (!this.cp6Triggered && !this.movementLocked) {
      const safe = this.map.spawns.get('zone_safe_gathering');
      if (safe) {
        const d = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          safe.x, safe.y
        );
        if (d < 100) {
          void this.startCp6();
        }
      }
    }

    // 학생 이동
    if (this.movementLocked) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
    } else {
      const { vx, vy, dir } = readMovementInput(this.cursors, PLAYER_SPEED);
      this.player.setVelocity(vx, vy);
      if (dir) {
        this.lastDir = dir;
        const key = animKey(this.playerCharacterId, dir);
        if (this.player.anims.getName() !== key) {
          this.player.anims.play(key, true);
        }
      } else {
        this.player.anims.stop();
        const dirRow: Record<string, number> = { down: 0, up: 1, right: 2, left: 3 };
        this.player.setFrame(dirRow[this.lastDir] * 6);
      }
    }

    // 친구들 — 평상시 wander, CP6 진행 중엔 정렬 tween 이 처리하니 update 에선 건들지 않음
    // (1막은 운동장에서 끝 → follower 시점 없음. 점호가 모이게 함)
    if (!this.cp6Triggered) {
      for (const f of this.friends) {
        this.tickWander(f, delta);
      }
    }
  }

  private tickWander(f: Friend, delta: number) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      const stayStill = Math.random() < 0.3;
      if (stayStill) {
        f.wanderTargetX = f.sprite.x;
        f.wanderTargetY = f.sprite.y;
        f.wanderTimer = 600 + Math.random() * 800;
      } else {
        f.wanderTargetX = f.homeX + (Math.random() - 0.5) * 96;
        f.wanderTargetY = f.homeY + (Math.random() - 0.5) * 96;
        f.wanderTimer = 1200 + Math.random() * 1500;
      }
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, 50);
  }

  private moveTowards(f: Friend, tx: number, ty: number, speed: number) {
    const dx = tx - f.sprite.x;
    const dy = ty - f.sprite.y;
    const dist = Math.hypot(dx, dy);
    const STOP_THRESHOLD = 6;
    if (dist < STOP_THRESHOLD) {
      f.sprite.setVelocity(0, 0);
      f.sprite.anims.stop();
      const dirRow: Record<string, number> = { down: 0, up: 1, right: 2, left: 3 };
      f.sprite.setFrame(dirRow[f.lastDir] * 6);
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    f.sprite.setVelocity(nx * speed, ny * speed);
    let dir: 'down' | 'up' | 'left' | 'right';
    if (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 'left' : 'right';
    else dir = dy < 0 ? 'up' : 'down';
    f.lastDir = dir;
    const key = animKey(f.characterId, dir);
    if (f.sprite.anims.getName() !== key) {
      f.sprite.anims.play(key, true);
    }
  }
}
