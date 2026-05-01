// 1막 Map 2: 복도 + 계단.
// CP4 (자동 트리거 — 낮은 자세) + CP5 (갈림길 proximity — 계단 vs 엘베).
// CP5 정답 시 → 페이드 → playground scene (다음 단계에서 구현).

import Phaser from 'phaser';
import { CHARACTER_IDS } from '@shared/lib/characters';
import { animKey, ensureCharacterAnimations, readMovementInput } from './characterAnims';
import { loadTiledMap, type LoadedMap } from './loadTiledMap';
import { buildFriendSlots } from './friendSlots';
import { useGameStore } from '@/store/useGameStore';
import { useTouchControlsStore } from '@/store/useTouchControlsStore';
import { gameEventBus } from '@/lib/gameEventBus';
import { runCheckpoint, showLines, showQuestion } from './runCheckpoint';
import { CP4_LOW_POSTURE } from './act1Checkpoints';

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

type ProximityZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  inside: boolean;
  consumed: boolean;
  onEnter: () => Promise<void>;
};

type InteractionZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  active: boolean;
  marker?: Phaser.GameObjects.Container;
  onTrigger: () => Promise<void>;
};

const requireMapSpawn = (map: LoadedMap, name: string) => {
  const sp = map.spawns.get(name);
  if (!sp) throw new Error(`spawn "${name}" not found in corridor map`);
  return sp;
};

export default class Act1CorridorScene extends Phaser.Scene {
  private map!: LoadedMap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerCharacterId = 'puppy';
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private friends: Friend[] = [];
  private lastDir: 'down' | 'up' | 'left' | 'right' = 'down';
  private currentCp = 0; // 0 = 시작 전, 4, 5
  private movementLocked = false;
  private cp4Done = false; // CP4 정답 후부터 자세 메커니즘 활성
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private elevatorZone: ProximityZone | null = null;
  private stairsZone: InteractionZone | null = null;
  private nearbyInteraction: InteractionZone | null = null;
  private elevatorRefused = false;
  // 자세 메커니즘 — 코 가림 그래픽, 연기 게이지, 콜록 타이머
  private crouchHand?: Phaser.GameObjects.Graphics;
  private vignette?: Phaser.GameObjects.Rectangle;
  private smokeGauge = 0;       // 0~1
  private coughTimer = 0;       // ms
  private currentlyCrouching = false;

  constructor() {
    super('Act1CorridorScene');
  }

  create() {
    this.cameras.main.fadeIn(800, 0, 0, 0);

    const selected = useGameStore.getState().selectedCharacter ?? CHARACTER_IDS[0];
    this.playerCharacterId = selected;

    this.map = loadTiledMap(this, 'act1_corridor');
    // 일어선 + 기어가는 자세 모두 anim 등록
    ensureCharacterAnimations(this, [
      ...CHARACTER_IDS,
      ...CHARACTER_IDS.map((id) => `${id}_b`),
    ]);

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
      // setImmovable(true) 빼면 walls 와 충돌 시 위치 조정 정상 작동.
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
    this.interactionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 천장 연기 시각 효과 (zone_smoke 영역에 회색 dithering 파티클)
    this.addSmokeEffect();

    // 코 가림 손 그래픽 (학생 위에 표시. 자세 ON 시만 보임)
    this.crouchHand = this.add.graphics();
    this.crouchHand.setDepth(PLAYER_DEPTH + 1);
    this.crouchHand.setVisible(false);

    // 연기 vignette overlay (화면 전체. 게이지에 비례해 어두워짐)
    this.vignette = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width * 2,
      this.scale.height * 2,
      0x000000,
      0
    );
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(1500);

    // CP5 zone 등록 (CP4 끝나면 활성화)
    this.setupCp5Zones();

    // CP4 자동 트리거 (1.2초 후)
    this.time.delayedCall(1200, () => this.startCp4());
  }

  private setupCp5Zones() {
    // 엘베 — proximity 자동 다이얼로그
    const elevSp = this.map.spawns.get('item_elevator');
    if (elevSp) {
      const cx = elevSp.x + elevSp.width / 2;
      const cy = elevSp.y + elevSp.height / 2;
      this.elevatorZone = {
        spawnName: 'item_elevator',
        cx,
        cy,
        radius: 80,
        inside: false,
        consumed: false,
        onEnter: () => this.handleElevator(),
      };
    }

    // 계단 — interaction (A 버튼)
    const stairSp = this.map.spawns.get('item_stairs');
    if (stairSp) {
      const cx = stairSp.x + stairSp.width / 2;
      const cy = stairSp.y + stairSp.height / 2;
      this.stairsZone = {
        spawnName: 'item_stairs',
        cx,
        cy,
        radius: 80,
        active: false,
        onTrigger: () => this.handleStairs(),
      };
    }
  }

  private async handleElevator() {
    if (this.movementLocked) return;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);
    const choice = await showQuestion({
      speaker: '나',
      text: '엘리베이터다. 화재 상황인데... 탈까?',
      choices: [
        { label: '엘리베이터를 탄다', value: 'take' },
        { label: '타지 않는다', value: 'skip' },
      ],
    });
    if (choice === 'take') {
      // 힌트 — 친구가 알려줌. zone consumed 안 됨 → 다시 진입 시 다시 묻기.
      await showLines([
        { speaker: '친구1', text: '안 돼! 화재 때 엘베 타면 갇힌대!' },
        { speaker: '친구3', text: '계단으로 가야 해.' },
      ]);
    } else {
      // 정답 — consumed + CP5 부분 진행 표시
      await showLines([
        { speaker: '나', text: '아니, 화재일 땐 엘베는 안 된다.' },
        { speaker: '친구5', text: '맞아! 잘 생각했어!' },
      ]);
      if (this.elevatorZone) this.elevatorZone.consumed = true;
      this.elevatorRefused = true;
    }
    this.movementLocked = false;
  }

  private async handleStairs() {
    if (this.movementLocked) return;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);
    const choice = await showQuestion({
      speaker: '나',
      text: '계단이다. 내려갈까?',
      choices: [
        { label: '계단으로 내려간다', value: 'yes' },
        { label: '잠깐 멈춘다', value: 'no' },
      ],
    });
    if (choice !== 'yes') {
      // 닫기만, 다시 선택 가능
      this.movementLocked = false;
      return;
    }
    await showLines([
      { speaker: '나', text: '계단으로 침착하게 내려간다.' },
      { speaker: '친구5', text: '거의 다 왔어!' },
    ]);
    // CP5 완료
    useGameStore.getState().recordCheckpoint(1, 4, 'success');
    useGameStore.getState().advanceCheckpoint(1);
    // 페이드 → playground scene
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => {
      this.scene.start('Act1PlaygroundScene');
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

  private addSmokeEffect() {
    const zone = this.map.spawns.get('zone_smoke');
    if (!zone) return;
    // 영역에 흩뿌려진 회색 점들 (random pixel dots, slowly fading)
    const graphics = this.add.graphics();
    graphics.setDepth(80);
    const draw = () => {
      graphics.clear();
      graphics.fillStyle(0x9ca3af, 0.5);
      for (let i = 0; i < 60; i++) {
        const x = zone.x - zone.width / 2 + Math.random() * zone.width;
        const y = zone.y - zone.height / 2 + Math.random() * zone.height;
        graphics.fillCircle(x, y, Math.random() * 4 + 2);
      }
    };
    draw();
    this.time.addEvent({ delay: 200, callback: draw, loop: true });
  }

  private async startCp4() {
    if (this.currentCp >= 4) return;
    this.currentCp = 4;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);

    await runCheckpoint(CP4_LOW_POSTURE, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    });

    useGameStore.getState().recordCheckpoint(1, 3, 'success');
    useGameStore.getState().advanceCheckpoint(1);

    // 자세 메커니즘 활성화 — 이제부터 학생이 B/C 누르고 다녀야 안전
    this.cp4Done = true;

    // CP5 zone 활성화 (엘베 + 계단)
    if (this.stairsZone) this.stairsZone.active = true;

    this.movementLocked = false;
  }

  // 학생 + 친구 텍스처 swap. _b sprite 가 이미 기어가는 모습 + 코 가림이라
  // scaleY 변경 / 손 그래픽 불필요. 다만 _b 텍스처가 없으면 fallback.
  private updateCrouchVisual(crouching: boolean) {
    // 학생 텍스처
    const playerKey = this.effectiveCharacterKey(this.playerCharacterId, crouching);
    if (this.player.texture.key !== playerKey) {
      this.player.setTexture(playerKey, 0);
    }
    // 친구 텍스처
    for (const f of this.friends) {
      const friendKey = this.effectiveCharacterKey(f.characterId, crouching);
      if (f.sprite.texture.key !== friendKey) {
        f.sprite.setTexture(friendKey, 0);
      }
    }
    // 손 그래픽은 _b sprite 자체가 코 가린 모습이라 안 씀
    if (this.crouchHand) this.crouchHand.setVisible(false);
    // scaleY 도 1.0 (sprite 자체로 충분히 낮은 자세)
    this.player.setScale(1, 1);
    for (const f of this.friends) f.sprite.setScale(1, 1);
  }

  // _b 텍스처 존재하면 자세 ON 시 _b 키 반환, 없으면 일반 키
  private effectiveCharacterKey(originalId: string, crouching: boolean): string {
    if (!crouching) return originalId;
    const crouchKey = `${originalId}_b`;
    return this.textures.exists(crouchKey) ? crouchKey : originalId;
  }

  // 매 0.5초 콜록 효과 (학생 위에 텍스트 펌프)
  private showCough() {
    const text = this.add.text(this.player.x, this.player.y - 30, '콜록!', {
      fontSize: '14px',
      color: '#ef4444',
      fontStyle: 'bold',
      fontFamily: 'Pretendard, sans-serif',
    });
    text.setOrigin(0.5);
    text.setDepth(1200);
    this.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      scale: 1.4,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // 학생이 zone_smoke 영역 안에 있는지
  private isInSmoke(): boolean {
    const zone = this.map.spawns.get('zone_smoke');
    if (!zone) return false;
    const left = zone.x - zone.width / 2;
    const right = zone.x + zone.width / 2;
    const top = zone.y - zone.height / 2;
    const bottom = zone.y + zone.height / 2;
    return (
      this.player.x > left &&
      this.player.x < right &&
      this.player.y > top &&
      this.player.y < bottom
    );
  }

  update(time: number, delta: number) {
    if (!this.player) return;

    // 엘베 proximity (CP4 정답 후 활성)
    if (this.elevatorZone && this.currentCp >= 4 && !this.movementLocked) {
      const z = this.elevatorZone;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.cx, z.cy);
      const wasInside = z.inside;
      z.inside = d < z.radius;
      if (!wasInside && z.inside && !z.consumed) {
        void z.onEnter();
      }
    }

    // 계단 interaction marker
    if (this.stairsZone) {
      const z = this.stairsZone;
      if (z.active) {
        if (!z.marker) z.marker = this.createMarker(z.cx, z.cy);
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.cx, z.cy);
        const near = d < z.radius;
        z.marker.setScale(near ? 1.25 : 0.9);
        this.nearbyInteraction = near ? z : null;
      }
    }

    // A 버튼 (Space) JustDown
    if (
      !this.movementLocked &&
      this.nearbyInteraction &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    ) {
      void this.nearbyInteraction.onTrigger();
    }

    // 자세 상태 읽기 (B 버튼 / C 키)
    const crouching = useTouchControlsStore.getState().crouching && this.cp4Done;

    // 학생 이동
    if (this.movementLocked) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
    } else {
      const speed = crouching ? PLAYER_SPEED * 0.75 : PLAYER_SPEED;
      const { vx, vy, dir } = readMovementInput(this.cursors, speed);
      this.player.setVelocity(vx, vy);
      const playerAnimKeyId = this.effectiveCharacterKey(this.playerCharacterId, crouching);
      if (dir) {
        this.lastDir = dir;
        const key = animKey(playerAnimKeyId, dir);
        if (this.player.anims.getName() !== key) {
          this.player.anims.play(key, true);
        }
      } else {
        this.player.anims.stop();
        const dirRow: Record<string, number> = { down: 0, up: 1, right: 2, left: 3 };
        this.player.setFrame(dirRow[this.lastDir] * 6);
      }
    }

    // 자세 visual 갱신 (CP4 정답 후만)
    if (this.cp4Done) {
      if (crouching !== this.currentlyCrouching) {
        this.currentlyCrouching = crouching;
      }
      this.updateCrouchVisual(crouching);
    }

    // 연기 게이지 (CP4 정답 후만)
    if (this.cp4Done && !this.movementLocked) {
      const inSmoke = this.isInSmoke();
      if (inSmoke && !crouching) {
        // 위험 — 게이지 차오름 (0.5/sec, 2초에 max)
        this.smokeGauge = Math.min(1, this.smokeGauge + 0.5 * (delta / 1000));
      } else {
        // 안전 — 회복 (1.0/sec, 1초에 0)
        this.smokeGauge = Math.max(0, this.smokeGauge - 1.0 * (delta / 1000));
      }

      // vignette alpha
      if (this.vignette) {
        this.vignette.setFillStyle(0x000000, this.smokeGauge * 0.7);
      }

      // 콜록 효과 (gauge > 0.3 + 위험 상태일 때만)
      if (inSmoke && !crouching && this.smokeGauge > 0.3) {
        this.coughTimer -= delta;
        if (this.coughTimer <= 0) {
          this.coughTimer = 500;
          this.showCough();
        }
      } else {
        this.coughTimer = 0;
      }
    }

    // 친구들 — panic / follower / wander
    const panicMode = this.movementLocked && this.currentCp >= 4;
    const followerActive = this.currentCp >= 4 && !this.movementLocked;
    for (let i = 0; i < this.friends.length; i++) {
      const f = this.friends[i];
      if (panicMode) this.tickPanic(f, delta);
      else if (followerActive) this.tickFollower(f, i, delta);
      else this.tickWander(f, delta);
    }
  }

  private tickPanic(f: Friend, delta: number) {
    f.wanderTimer -= delta;
    if (f.wanderTimer <= 0) {
      f.wanderTargetX = f.sprite.x + (Math.random() - 0.5) * 32;
      f.wanderTargetY = f.sprite.y + (Math.random() - 0.5) * 32;
      f.wanderTimer = 200 + Math.random() * 400;
    }
    this.moveTowards(f, f.wanderTargetX, f.wanderTargetY, 80);
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
    // 친구 자세도 학생과 동일하게 swap (currentlyCrouching 추적)
    const animId = this.effectiveCharacterKey(f.characterId, this.currentlyCrouching);
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
    const key = animKey(animId, dir);
    if (f.sprite.anims.getName() !== key) {
      f.sprite.anims.play(key, true);
    }
  }
}
