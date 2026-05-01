// 1막 Map 1: 도서관.
// 골격 단계 — 학생 이동 + 친구 5명 idle + 카메라 스크롤 + walls 충돌.
// 체크포인트 (CP1~CP3) 는 다음 단계에서 추가.

import Phaser from 'phaser';
import { CHARACTER_IDS } from '@shared/lib/characters';
import { animKey, ensureCharacterAnimations, readMovementInput } from './characterAnims';
import { loadTiledMap, type LoadedMap } from './loadTiledMap';
import { buildFriendSlots } from './friendSlots';
import { useGameStore } from '@/store/useGameStore';
import { gameEventBus } from '@/lib/gameEventBus';
import { runCheckpoint } from './runCheckpoint';
import { CP1_119, CP2_FIRE_ALARM, CP3_DOOR_TEMP } from './act1Checkpoints';

// 맵 *.json 의 spawn 레이어에서 이름으로 좌표 lookup. 못 찾으면 throw.
// MapMaker UI 로 수정한 spawn 변경이 즉시 반영됨 (spawns.ts 우회).
const requireMapSpawn = (
  map: LoadedMap,
  name: string
): { x: number; y: number; width: number; height: number } => {
  const sp = map.spawns.get(name);
  if (!sp) throw new Error(`spawn "${name}" not found in map JSON`);
  return sp;
};

const PLAYER_SPEED = 180;
const PLAYER_DEPTH = 100;
const NPC_DEPTH = 90;

type Friend = {
  slot: string; // 'npc_friend_1'
  characterId: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  homeX: number;
  homeY: number;
  // 우왕좌왕 wander 상태
  wanderTargetX: number;
  wanderTargetY: number;
  wanderTimer: number; // ms 단위 카운트다운
  lastDir: 'down' | 'up' | 'left' | 'right';
};

type InteractionZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  active: boolean;
  used: boolean;
  marker?: Phaser.GameObjects.Container;
  onTrigger: () => Promise<void>;
};

const INTERACTION_RADIUS = 80;

export default class Act1LibraryScene extends Phaser.Scene {
  private map!: LoadedMap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerCharacterId = 'puppy'; // fallback, will be overridden
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private friends: Friend[] = [];
  private lastDir: 'down' | 'up' | 'left' | 'right' = 'down';
  private currentCp = 0;             // 0 = 시작 전, 1 = CP1, ...
  private movementLocked = false;     // 체크포인트 진행 중에는 움직임 잠금
  private fireGlow?: Phaser.GameObjects.Graphics; // 옆 교실 불빛 효과
  private zones: InteractionZone[] = [];
  private nearbyZone: InteractionZone | null = null;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private followerMode = false;       // 학생이 출구 근처 다가가면 ON

  constructor() {
    super('Act1LibraryScene');
  }

  create() {
    // 학생이 고른 캐릭터 (없으면 fallback 첫 번째)
    const selected = useGameStore.getState().selectedCharacter ?? CHARACTER_IDS[0];
    this.playerCharacterId = selected;

    // 1. 맵 로드
    this.map = loadTiledMap(this, 'act1_library');

    // 2. 캐릭터 애니메이션 등록
    ensureCharacterAnimations(this, CHARACTER_IDS);

    // 3. 플레이어 spawn (맵 JSON 에서 lookup — MapMaker UI 변경 즉시 반영)
    const playerSpawn = requireMapSpawn(this.map, 'playerspawn');
    this.player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, this.playerCharacterId, 0);
    this.player.setDepth(PLAYER_DEPTH);
    this.player.setCollideWorldBounds(true);
    // Phaser body 가 sprite 의 frame size 를 그대로 쓰면 너무 큼 — 발 근처 작은 박스로
    this.player.body!.setSize(28, 16);
    this.player.body!.setOffset(10, 46);

    // walls 충돌
    this.physics.add.collider(this.player, this.map.collisionBodies);

    // 4. 친구 5명 spawn (학생이 안 고른 5마리 매핑)
    const slots = buildFriendSlots(this.playerCharacterId);
    for (const [slotName, characterId] of Object.entries(slots)) {
      const sp = requireMapSpawn(this.map, slotName);
      const sprite = this.physics.add.sprite(sp.x, sp.y, characterId, 0);
      sprite.setDepth(NPC_DEPTH);
      sprite.body!.setSize(28, 16);
      sprite.body!.setOffset(10, 46);
      // setImmovable(true) 빼면 walls 와 충돌 시 위치 조정 정상 작동.
      // 학생-NPC 충돌은 등록 안 함 (서로 통과).
      this.physics.add.collider(sprite, this.map.collisionBodies);
      this.friends.push({
        slot: slotName,
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

    // 5. 카메라
    this.cameras.main.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4); // 가까이 줌인 (캐릭터가 더 크게 보임)

    // 6. 입력
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // CP2/CP3 인터랙션 zone 등록 (CP1 끝나면 활성화)
    this.registerZone('item_fire_alarm', () => this.startCp2());
    this.registerZone('item_exit_door', () => this.startCp3());

    // 7. 옆 교실 불빛 효과 (item_classroom_window 위치에서 빨갛게 펄스)
    const windowSpawn = this.map.spawns.get('item_classroom_window');
    if (windowSpawn) {
      this.fireGlow = this.add.graphics();
      this.fireGlow.setDepth(50);
      const cx = windowSpawn.x + windowSpawn.width / 2;
      const cy = windowSpawn.y + windowSpawn.height / 2;
      this.tweens.add({
        targets: { alpha: 0.3 },
        alpha: 0.7,
        duration: 600,
        yoyo: true,
        repeat: -1,
        onUpdate: (_t, target) => {
          if (!this.fireGlow) return;
          this.fireGlow.clear();
          this.fireGlow.fillStyle(0xff4500, target.alpha);
          this.fireGlow.fillCircle(cx, cy, 60);
          this.fireGlow.fillStyle(0xffaa00, target.alpha * 0.7);
          this.fireGlow.fillCircle(cx, cy, 40);
        },
      });
    }

    // 8. CP1 자동 트리거 (게임 시작 1.5초 후)
    this.time.delayedCall(1500, () => this.startCp1());
  }

  private registerZone(spawnName: string, onTrigger: () => Promise<void>) {
    const sp = this.map.spawns.get(spawnName);
    if (!sp) return;
    const cx = sp.x + sp.width / 2;
    const cy = sp.y + sp.height / 2;
    this.zones.push({
      spawnName,
      cx,
      cy,
      radius: INTERACTION_RADIUS,
      active: false,
      used: false,
      onTrigger,
    });
  }

  private createMarker(cx: number, cy: number): Phaser.GameObjects.Container {
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xfbbf24, 1);
    ring.strokeCircle(0, 0, 18);
    ring.fillStyle(0xfbbf24, 0.85);
    ring.fillCircle(0, 0, 14);
    const text = this.add.text(0, 0, 'A', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1c1917',
      fontFamily: 'Pretendard, sans-serif',
    });
    text.setOrigin(0.5, 0.5);
    const container = this.add.container(cx, cy - 50, [ring, text]);
    container.setDepth(500);
    // 부드러운 펄스 + 위아래 살짝 떠다님
    this.tweens.add({
      targets: container,
      y: cy - 56,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return container;
  }

  private updateMarkers() {
    if (!this.player) return;
    let nearest: InteractionZone | null = null;
    let nearestDist = Infinity;
    for (const z of this.zones) {
      if (!z.active || z.used) {
        if (z.marker) {
          z.marker.destroy();
          z.marker = undefined;
        }
        continue;
      }
      // 마커가 없으면 생성
      if (!z.marker) {
        z.marker = this.createMarker(z.cx, z.cy);
      }
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.cx, z.cy);
      if (d < z.radius && d < nearestDist) {
        nearestDist = d;
        nearest = z;
      }
    }
    // 가장 가까운 활성 zone 강조 (마커 크게)
    for (const z of this.zones) {
      if (z.marker) {
        z.marker.setScale(z === nearest ? 1.25 : 0.9);
      }
    }
    this.nearbyZone = nearest;
  }

  private async runZoneTrigger(zone: InteractionZone) {
    if (zone.used || this.movementLocked) return;
    zone.used = true;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);
    if (zone.marker) {
      zone.marker.destroy();
      zone.marker = undefined;
    }
    await zone.onTrigger();
    this.movementLocked = false;
  }

  private startCp1() {
    if (this.currentCp >= 1) return;
    this.currentCp = 1;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);

    void runCheckpoint(CP1_119, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    }).then(() => {
      useGameStore.getState().recordCheckpoint(1, 0, 'success');
      useGameStore.getState().advanceCheckpoint(1);
      this.movementLocked = false;
      // CP2 인터랙션 활성화
      const fireZone = this.zones.find((z) => z.spawnName === 'item_fire_alarm');
      if (fireZone) fireZone.active = true;
    });
  }

  private async startCp2() {
    if (this.currentCp >= 2) return;
    this.currentCp = 2;
    await runCheckpoint(CP2_FIRE_ALARM, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    });
    // 사이렌 효과 — 카메라 빨간 플래시 2번
    this.cameras.main.flash(400, 255, 60, 60);
    this.time.delayedCall(500, () => this.cameras.main.flash(400, 255, 60, 60));
    useGameStore.getState().recordCheckpoint(1, 1, 'success');
    useGameStore.getState().advanceCheckpoint(1);
    // CP3 인터랙션 활성화
    const doorZone = this.zones.find((z) => z.spawnName === 'item_exit_door');
    if (doorZone) doorZone.active = true;
  }

  private async startCp3() {
    if (this.currentCp >= 3) return;
    this.currentCp = 3;
    // CP3 는 손등 vs 손바닥 — 오답 시 화상 효과를 위해 CP 결과를 보고 시각 처리
    // runCheckpoint 가 정답까지 반복하므로 마지막은 항상 정답. 오답 효과는 onWrong 대사 후 별도.
    // 단순화: 첫 응답이 손바닥/발차기였는지 추적하지 않고, 정답 후 차가운 문 효과만 처리.
    await runCheckpoint(CP3_DOOR_TEMP, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    });
    useGameStore.getState().recordCheckpoint(1, 2, 'success');
    useGameStore.getState().advanceCheckpoint(1);
    // 페이드아웃 → corridor scene 전환
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => {
      this.scene.start('Act1CorridorScene');
    });
  }

  update(time: number, delta: number) {
    if (!this.player) return;

    // 인터랙션 마커 갱신
    this.updateMarkers();

    // A 버튼 (Space) JustDown — 가까운 zone 트리거
    if (
      !this.movementLocked &&
      this.nearbyZone &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    ) {
      void this.runZoneTrigger(this.nearbyZone);
    }

    // 학생이 출구 zone 근처 가면 follower 모드 ON (한 번 켜지면 유지)
    if (!this.followerMode && this.currentCp >= 1) {
      const exitZone = this.zones.find((z) => z.spawnName === 'item_exit_door');
      if (exitZone) {
        const d = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          exitZone.cx,
          exitZone.cy
        );
        if (d < 280) this.followerMode = true;
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

    // 친구들 — 모드별 분기
    const panicMode = this.movementLocked && this.currentCp >= 1;
    for (let i = 0; i < this.friends.length; i++) {
      const f = this.friends[i];
      if (panicMode) this.tickPanic(f, delta);
      else if (this.followerMode) this.tickFollower(f, i, delta);
      else this.tickWander(f, delta);
    }
  }

  // 패닉 모드 — 체크포인트 진행 중. 현재 위치에서 작은 반경 빠른 random walk
  // (발 동동 구르는 느낌). home 으로 reset 하지 않음 — 우왕좌왕 흐름 유지.
  private tickPanic(f: Friend, delta: number) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      // 현재 위치 기준 ±16px 안에서 새 target
      f.wanderTargetX = f.sprite.x + (Math.random() - 0.5) * 32;
      f.wanderTargetY = f.sprite.y + (Math.random() - 0.5) * 32;
      f.wanderTimer = 200 + Math.random() * 400;
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, 80);
  }

  // 우왕좌왕 — home 주위 작은 반경 안에서 random walk.
  private tickWander(f: Friend, delta: number) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      // 새 target 정함. home 주변 ±48px (1.5 tile) 안.
      // 가끔 정지 상태도 (target = 현재 위치)
      const stayStill = Math.random() < 0.3;
      if (stayStill) {
        f.wanderTargetX = f.sprite.x;
        f.wanderTargetY = f.sprite.y;
        f.wanderTimer = 600 + Math.random() * 800; // 짧게 정지
      } else {
        f.wanderTargetX = f.homeX + (Math.random() - 0.5) * 96;
        f.wanderTargetY = f.homeY + (Math.random() - 0.5) * 96;
        f.wanderTimer = 1200 + Math.random() * 1500;
      }
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, 50);
  }

  // 학생을 따라옴. 학생 뒤에 일정 거리 유지.
  private tickFollower(f: Friend, idx: number, delta: number) {
    // 학생 lastDir 의 반대 방향으로 떨어진 위치
    const offsets: Record<string, { x: number; y: number }> = {
      down: { x: 0, y: -1 },
      up: { x: 0, y: 1 },
      left: { x: 1, y: 0 },
      right: { x: -1, y: 0 },
    };
    const off = offsets[this.lastDir];
    const tier = Math.floor(idx / 2); // 0,0,1,1,2 — 두 명씩 같은 거리
    const distance = 56 + tier * 40;
    const sideOffset = (idx % 2 === 0 ? -1 : 1) * 24; // 좌우로 살짝 분산
    const perp = this.lastDir === 'down' || this.lastDir === 'up'
      ? { x: 1, y: 0 }
      : { x: 0, y: 1 };
    const targetX = this.player.x + off.x * distance + perp.x * sideOffset;
    const targetY = this.player.y + off.y * distance + perp.y * sideOffset;
    this.moveTowards(f, targetX, targetY, 130);
  }

  // 공통 이동: target 으로 가다가 가까우면 멈춤. walk anim 재생 + 방향 갱신.
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
