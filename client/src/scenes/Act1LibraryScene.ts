// 1막 Map 1: 도서관.
// 친구 5명 흩어진 채 패닉 → 학생이 다가가 A 버튼으로 한 명씩 모집.
// 휴대폰 줍기 = CP1 (119 신고) 자동 발동 게이트.
// 손수건 줍기 = 복도 CP4 에서 분기 대사 (옷자락 vs 손수건).
// CP3 (출구) = 친구 5명 모두 모집 + CP2 통과 후에만 활성.

import Phaser from 'phaser';
import { CHARACTER_IDS } from '@shared/lib/characters';
import { getPersonality, pickIdleLine } from '@shared/lib/personalities';
import { animKey, ensureCharacterAnimations, readMovementInput } from './characterAnims';
import { loadTiledMap, type LoadedMap } from './loadTiledMap';
import { buildFriendSlots } from './friendSlots';
import { useGameStore } from '@/store/useGameStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useShoutMissionStore } from '@/store/useShoutMissionStore';
import { useAlarmMissionStore } from '@/store/useAlarmMissionStore';
import { useDoorMissionStore } from '@/store/useDoorMissionStore';
import { showSpeechBubble } from './speechBubble';

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
const INTERACTION_RADIUS = 80;
const RECRUIT_RADIUS = 84;
const IDLE_LINE_INTERVAL_MIN = 4500;
const IDLE_LINE_INTERVAL_MAX = 9500;
const IDLE_LINE_PROXIMITY = 200; // 학생이 이 거리 이내 + 타이머 만료 시 idle 대사

type Friend = {
  slot: string;
  characterId: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  homeX: number;
  homeY: number;
  wanderTargetX: number;
  wanderTargetY: number;
  wanderTimer: number;
  lastDir: 'down' | 'up' | 'left' | 'right';
  recruited: boolean;
  marker?: Phaser.GameObjects.Container;
  idleLineTimer: number;
  lastIdleIndex: number;
};

type ItemZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  active: boolean;
  used: boolean;
  marker?: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Container; // placeholder graphics (휴대폰/손수건)
  onTrigger: () => Promise<void>;
};

type CheckpointZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  active: boolean;
  used: boolean;
  marker?: Phaser.GameObjects.Container;
  onTrigger: () => Promise<void>;
};

type NearbyTarget =
  | { kind: 'item'; ref: ItemZone }
  | { kind: 'cp'; ref: CheckpointZone }
  | { kind: 'friend'; ref: Friend }
  | null;

export default class Act1LibraryScene extends Phaser.Scene {
  private map!: LoadedMap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerCharacterId = 'puppy';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private friends: Friend[] = [];
  private lastDir: 'down' | 'up' | 'left' | 'right' = 'down';
  private currentCp = 0;
  private movementLocked = false;
  private fireGlow?: Phaser.GameObjects.Graphics;
  private items: ItemZone[] = [];
  private cpZones: CheckpointZone[] = [];
  private nearby: NearbyTarget = null;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private followerMode = false;
  private cp1Triggered = false;

  constructor() {
    super('Act1LibraryScene');
  }

  create() {
    // 도서관에 진입할 때마다 인벤토리 초기화 (한 막 단위)
    useSessionStore.getState().reset();

    const selected = useGameStore.getState().selectedCharacter ?? CHARACTER_IDS[0];
    this.playerCharacterId = selected;

    this.map = loadTiledMap(this, 'act1_library');
    ensureCharacterAnimations(this, CHARACTER_IDS);

    // 플레이어
    const playerSpawn = requireMapSpawn(this.map, 'playerspawn');
    this.player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, this.playerCharacterId, 0);
    this.player.setDepth(PLAYER_DEPTH);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(28, 16);
    this.player.body!.setOffset(10, 46);
    this.physics.add.collider(this.player, this.map.collisionBodies);

    // 친구 5명 — 흩어진 위치, 시작 시 모두 unrecruited
    const slots = buildFriendSlots(this.playerCharacterId);
    for (const [slotName, characterId] of Object.entries(slots)) {
      const sp = requireMapSpawn(this.map, slotName);
      const sprite = this.physics.add.sprite(sp.x, sp.y, characterId, 0);
      sprite.setDepth(NPC_DEPTH);
      sprite.body!.setSize(28, 16);
      sprite.body!.setOffset(10, 46);
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
        recruited: false,
        idleLineTimer: 1500 + Math.random() * 3000,
        lastIdleIndex: -1,
      });
    }

    // 카메라
    this.cameras.main.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.physics.world.setBounds(0, 0, this.map.widthPx, this.map.heightPx);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.4);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 인벤토리 아이템 (휴대폰, 손수건) — placeholder graphics
    this.registerItem('item_phone', 'phone', () => this.pickupPhone());
    this.registerItem('item_handkerchief', 'handkerchief', () => this.pickupHandkerchief());

    // CP zones (CP2/CP3) — CP2 는 CP1 후 활성, CP3 는 CP2+친구5명 모집 후 활성
    this.registerCpZone('item_fire_alarm', () => this.startCp2());
    this.registerCpZone('item_exit_door', () => this.startCp3());

    // 옆 교실 불빛
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

    // 시작 안내 — 첫 줄로 짧게
    this.time.delayedCall(800, () => {
      showSpeechBubble(this, this.player, '휴대폰부터 챙기고 친구들 모아야 해!', { holdMs: 2400 });
    });
  }

  // ───────── 아이템 placeholder 그래픽 + zone 등록 ─────────

  private registerItem(spawnName: string, kind: 'phone' | 'handkerchief', onPick: () => Promise<void>) {
    const sp = this.map.spawns.get(spawnName);
    if (!sp) return;
    const cx = sp.x + sp.width / 2;
    const cy = sp.y + sp.height / 2;
    const sprite = this.createItemSprite(cx, cy, kind);
    this.items.push({
      spawnName,
      cx,
      cy,
      radius: INTERACTION_RADIUS,
      active: true,
      used: false,
      sprite,
      onTrigger: onPick,
    });
  }

  private createItemSprite(cx: number, cy: number, kind: 'phone' | 'handkerchief'): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    if (kind === 'phone') {
      // 검은 사각형 + 화면
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(-9, -14, 18, 28, 3);
      g.fillStyle(0x60a5fa, 1);
      g.fillRect(-7, -11, 14, 19);
      g.fillStyle(0x1f2937, 1);
      g.fillCircle(0, 11, 1.5);
    } else {
      // 흰 천 사각형 (살짝 접힌 모양)
      g.fillStyle(0xfef3c7, 1);
      g.fillRoundedRect(-12, -10, 24, 20, 3);
      g.lineStyle(1, 0xb45309, 1);
      g.strokeRoundedRect(-12, -10, 24, 20, 3);
      g.lineBetween(-8, -10, -8, 10);
      g.lineBetween(0, -10, 0, 10);
      g.lineBetween(8, -10, 8, 10);
    }
    const container = this.add.container(cx, cy, [g]);
    container.setDepth(70);
    // 살짝 떠다니는 효과
    this.tweens.add({
      targets: container,
      y: cy - 4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return container;
  }

  // ───────── CP zone 등록 ─────────

  private registerCpZone(spawnName: string, onTrigger: () => Promise<void>) {
    const sp = this.map.spawns.get(spawnName);
    if (!sp) return;
    const cx = sp.x + sp.width / 2;
    const cy = sp.y + sp.height / 2;
    this.cpZones.push({
      spawnName,
      cx,
      cy,
      radius: INTERACTION_RADIUS,
      active: false,
      used: false,
      onTrigger,
    });
  }

  // ───────── 마커 ─────────

  private createMarker(label: string = 'A'): Phaser.GameObjects.Container {
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xfbbf24, 1);
    ring.strokeCircle(0, 0, 18);
    ring.fillStyle(0xfbbf24, 0.85);
    ring.fillCircle(0, 0, 14);
    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1c1917',
      fontFamily: 'Pretendard, sans-serif',
    });
    text.setOrigin(0.5, 0.5);
    const container = this.add.container(0, 0, [ring, text]);
    container.setDepth(500);
    return container;
  }

  private ensureMarker(host: { marker?: Phaser.GameObjects.Container }, label: string = 'A') {
    if (!host.marker) host.marker = this.createMarker(label);
  }

  private destroyMarker(host: { marker?: Phaser.GameObjects.Container }) {
    if (host.marker) {
      host.marker.destroy();
      host.marker = undefined;
    }
  }

  // ───────── 가장 가까운 인터랙션 대상 결정 ─────────

  private updateNearby() {
    if (!this.player) return;
    let best: NearbyTarget = null;
    let bestDist = Infinity;

    // items (휴대폰/손수건)
    for (const z of this.items) {
      if (!z.active || z.used) {
        this.destroyMarker(z);
        continue;
      }
      this.ensureMarker(z, 'A');
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.cx, z.cy);
      if (d < z.radius && d < bestDist) {
        bestDist = d;
        best = { kind: 'item', ref: z };
      }
    }

    // CP zones
    for (const z of this.cpZones) {
      if (!z.active || z.used) {
        this.destroyMarker(z);
        continue;
      }
      this.ensureMarker(z, 'A');
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.cx, z.cy);
      if (d < z.radius && d < bestDist) {
        bestDist = d;
        best = { kind: 'cp', ref: z };
      }
    }

    // 친구 (unrecruited)
    for (const f of this.friends) {
      if (f.recruited) {
        this.destroyMarker(f);
        continue;
      }
      this.ensureMarker(f, '?');
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.sprite.x, f.sprite.y);
      if (d < RECRUIT_RADIUS && d < bestDist) {
        bestDist = d;
        best = { kind: 'friend', ref: f };
      }
    }

    // marker 위치 + 강조 갱신
    for (const z of this.items) {
      if (z.marker) {
        z.marker.setPosition(z.cx, z.cy - 50);
        z.marker.setScale(best?.kind === 'item' && best.ref === z ? 1.25 : 0.85);
      }
    }
    for (const z of this.cpZones) {
      if (z.marker) {
        z.marker.setPosition(z.cx, z.cy - 50);
        z.marker.setScale(best?.kind === 'cp' && best.ref === z ? 1.25 : 0.85);
      }
    }
    for (const f of this.friends) {
      if (f.marker) {
        f.marker.setPosition(f.sprite.x, f.sprite.y - 50);
        f.marker.setScale(best?.kind === 'friend' && best.ref === f ? 1.25 : 0.85);
      }
    }

    this.nearby = best;
  }

  // ───────── 인터랙션 트리거 ─────────

  private async runItemPickup(z: ItemZone) {
    if (z.used || this.movementLocked) return;
    z.used = true;
    if (z.sprite) {
      this.tweens.add({
        targets: z.sprite,
        alpha: 0,
        scale: 1.4,
        duration: 250,
        onComplete: () => z.sprite?.destroy(),
      });
    }
    this.destroyMarker(z);
    await z.onTrigger();
  }

  private async runCpZone(z: CheckpointZone) {
    if (z.used || this.movementLocked) return;
    z.used = true;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);
    this.destroyMarker(z);
    await z.onTrigger();
    this.movementLocked = false;
  }

  private recruitFriend(f: Friend) {
    if (f.recruited || this.movementLocked) return;
    f.recruited = true;
    this.destroyMarker(f);
    const p = getPersonality(f.characterId);
    showSpeechBubble(this, f.sprite, p.recruitLine, { holdMs: 2200 });
    // 모집 직후 패닉 wander → 학생 근처 wander 로 자연 전환 (home 갱신은 update 에서)
    f.wanderTimer = 200; // 즉시 새 target 잡게
  }

  // ───────── 줍기 핸들러 ─────────

  private async pickupPhone() {
    useSessionStore.getState().pickupPhone();
    showSpeechBubble(this, this.player, '휴대폰을 챙겼다!', { holdMs: 1600 });
    // CP1 자동 트리거 (휴대폰 줍기 = 119 신고 가능)
    if (!this.cp1Triggered) {
      this.cp1Triggered = true;
      this.time.delayedCall(900, () => this.startCp1());
    }
  }

  private async pickupHandkerchief() {
    useSessionStore.getState().pickupHandkerchief();
    showSpeechBubble(this, this.player, '손수건을 챙겼다.', { holdMs: 1600 });
  }

  // ───────── CP 시작 ─────────

  private startCp1() {
    if (this.currentCp >= 1) return;
    this.currentCp = 1;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);

    // 막 시간 추적 시작 (1막 첫 미션 = 1단계 외치기 시작 시점)
    useGameStore.getState().startRun();

    showSpeechBubble(this, this.player, '"불이야!" 외쳐서 모두에게 알려야 해!', { holdMs: 2200 });
    this.time.delayedCall(2300, () => {
      useShoutMissionStore.getState().show((_result, missCount) => {
        if (missCount > 0) {
          useGameStore.getState().addPenaltyMs(missCount * 2000);
        }
        useGameStore.getState().recordCheckpoint(1, 0, 'success');
        useGameStore.getState().advanceCheckpoint(1);
        this.movementLocked = false;
        // CP2 (경보기) 활성화
        const fireZone = this.cpZones.find((z) => z.spawnName === 'item_fire_alarm');
        if (fireZone) fireZone.active = true;
        showSpeechBubble(this, this.player, '이제 화재경보기를 누르자!', { holdMs: 2200 });
      });
    });
  }

  private async startCp2() {
    if (this.currentCp >= 2) return;
    this.currentCp = 2;
    await new Promise<void>((resolve) => {
      useAlarmMissionStore.getState().show((_result, weakAttempts, breakAttempts) => {
        const penaltyMs = weakAttempts * 1000 + breakAttempts * 3000;
        if (penaltyMs > 0) useGameStore.getState().addPenaltyMs(penaltyMs);
        resolve();
      });
    });
    this.cameras.main.flash(400, 255, 60, 60);
    this.time.delayedCall(500, () => this.cameras.main.flash(400, 255, 60, 60));
    useGameStore.getState().recordCheckpoint(1, 1, 'success');
    useGameStore.getState().advanceCheckpoint(1);
    // CP3 활성 — 친구 5명 모두 모집된 경우만. update 에서 매 프레임 검사.
    this.tryActivateExitDoor();
  }

  private async startCp3() {
    if (this.currentCp >= 3) return;
    this.currentCp = 3;
    showSpeechBubble(this, this.player, '문이 뜨거운지 손등으로 확인해야 해!', { holdMs: 2000 });
    await new Promise<void>((resolve) => setTimeout(resolve, 2100));
    await new Promise<void>((resolve) => {
      useDoorMissionStore.getState().show((palmTaps, resets) => {
        const penaltyMs = palmTaps * 1000 + resets * 5000;
        if (penaltyMs > 0) useGameStore.getState().addPenaltyMs(penaltyMs);
        resolve();
      });
    });
    useGameStore.getState().recordCheckpoint(1, 2, 'success');
    useGameStore.getState().advanceCheckpoint(1);
    // 다음 맵 전환 직전에만 친구들이 학생을 따라옴
    this.followerMode = true;
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => {
      this.scene.start('Act1CorridorScene');
    });
  }

  // CP2 통과 + 친구 5명 모두 모집된 경우에만 출구 문 활성
  private tryActivateExitDoor() {
    if (this.currentCp < 2) return;
    const allRecruited = this.friends.every((f) => f.recruited);
    if (!allRecruited) return;
    const door = this.cpZones.find((z) => z.spawnName === 'item_exit_door');
    if (door && !door.active) {
      door.active = true;
      showSpeechBubble(this, this.player, '다 모였다! 이제 출구로 가자.', { holdMs: 2200 });
    }
  }

  // ───────── update ─────────

  update(time: number, delta: number) {
    if (!this.player) return;

    this.updateNearby();

    // CP3 활성 조건 매 프레임 검사 (친구 모두 모집됐는지)
    this.tryActivateExitDoor();

    // A 버튼 — nearby 종류에 따라 디스패치
    if (!this.movementLocked && Phaser.Input.Keyboard.JustDown(this.interactionKey) && this.nearby) {
      const t = this.nearby;
      if (t.kind === 'item') void this.runItemPickup(t.ref);
      else if (t.kind === 'cp') void this.runCpZone(t.ref);
      else if (t.kind === 'friend') this.recruitFriend(t.ref);
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
    const cpInProgress = this.movementLocked && this.currentCp >= 1;
    for (let i = 0; i < this.friends.length; i++) {
      const f = this.friends[i];

      // 모집된 친구: home 을 학생 근처로 매 프레임 갱신 (자연스럽게 따라옴)
      if (f.recruited && !this.followerMode) {
        f.homeX = this.player.x;
        f.homeY = this.player.y;
      }

      if (this.followerMode) this.tickFollower(f, i, delta);
      else if (cpInProgress) this.tickPanic(f, delta);
      else if (f.recruited) this.tickWander(f, delta, 110); // 학생 근처 wander, 약간 빠름
      else this.tickPanic(f, delta); // unrecruited = 패닉

      // idle 대사 — 학생 근처에 있을 때만, 인터벌마다
      if (!cpInProgress) {
        f.idleLineTimer -= delta;
        if (f.idleLineTimer <= 0) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.sprite.x, f.sprite.y);
          if (d < IDLE_LINE_PROXIMITY) {
            const { line, index } = pickIdleLine(f.characterId, f.lastIdleIndex);
            f.lastIdleIndex = index;
            // 모집 후엔 followLines 도 가끔 섞기
            const useFollow = f.recruited && Math.random() < 0.5;
            if (useFollow) {
              const fl = getPersonality(f.characterId).followLines;
              if (fl.length > 0) {
                showSpeechBubble(this, f.sprite, fl[Math.floor(Math.random() * fl.length)]);
              } else {
                showSpeechBubble(this, f.sprite, line);
              }
            } else {
              showSpeechBubble(this, f.sprite, line);
            }
          }
          f.idleLineTimer = IDLE_LINE_INTERVAL_MIN + Math.random() * (IDLE_LINE_INTERVAL_MAX - IDLE_LINE_INTERVAL_MIN);
        }
      }
    }
  }

  // ───────── 친구 동작 ─────────

  private tickPanic(f: Friend, delta: number) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      f.wanderTargetX = f.sprite.x + (Math.random() - 0.5) * 32;
      f.wanderTargetY = f.sprite.y + (Math.random() - 0.5) * 32;
      f.wanderTimer = 200 + Math.random() * 400;
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, 80);
  }

  private tickWander(f: Friend, delta: number, speed: number = 50) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      const stayStill = Math.random() < 0.25;
      if (stayStill) {
        f.wanderTargetX = f.sprite.x;
        f.wanderTargetY = f.sprite.y;
        f.wanderTimer = 600 + Math.random() * 800;
      } else {
        f.wanderTargetX = f.homeX + (Math.random() - 0.5) * 96;
        f.wanderTargetY = f.homeY + (Math.random() - 0.5) * 96;
        f.wanderTimer = 1000 + Math.random() * 1200;
      }
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, speed);
  }

  private tickFollower(f: Friend, idx: number, _delta: number) {
    const offsets: Record<string, { x: number; y: number }> = {
      down: { x: 0, y: -1 },
      up: { x: 0, y: 1 },
      left: { x: 1, y: 0 },
      right: { x: -1, y: 0 },
    };
    const off = offsets[this.lastDir];
    const tier = Math.floor(idx / 2);
    const distance = 56 + tier * 40;
    const sideOffset = (idx % 2 === 0 ? -1 : 1) * 24;
    const perp = this.lastDir === 'down' || this.lastDir === 'up'
      ? { x: 1, y: 0 }
      : { x: 0, y: 1 };
    const targetX = this.player.x + off.x * distance + perp.x * sideOffset;
    const targetY = this.player.y + off.y * distance + perp.y * sideOffset;
    this.moveTowards(f, targetX, targetY, 130);
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
