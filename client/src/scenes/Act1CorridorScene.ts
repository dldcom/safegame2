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
import { showSpeechBubble } from './speechBubble';
import { useSessionStore } from '@/store/useSessionStore';

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

type DoorZone = {
  spawnName: string;
  cx: number;
  cy: number;
  radius: number;
  active: boolean;
  used: boolean;
  isCool: boolean; // 1개만 true (시원한 문 = 통과 가능)
  marker?: Phaser.GameObjects.Container;
  spriteImg?: Phaser.GameObjects.Image;
  hotMark?: Phaser.GameObjects.Graphics;
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
  private transitioning = false; // 마지막 CP 통과 후 다음 맵 전환 시점에 ON (follower)
  private movementLocked = false;
  private cp4Done = false; // CP4 정답 후부터 자세 메커니즘 활성
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private elevatorZone: ProximityZone | null = null;
  private stairsZone: InteractionZone | null = null;
  private nearbyInteraction: InteractionZone | null = null;
  private elevatorRefused = false;
  private doors: DoorZone[] = [];
  private nearbyDoor: DoorZone | null = null;
  private coolDoorPassed = false;
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

    // CP5 zone 등록 (cool 문 통과 후 활성화)
    this.setupCp5Zones();

    // 손등 체크 문 3개 등록 (CP4 정답 후 활성화). 1개만 시원함 — 무작위 결정.
    this.setupDoors();

    // CP4 자동 트리거 (1.2초 후)
    this.time.delayedCall(1200, () => this.startCp4());
  }

  private setupDoors() {
    const names = ['door_a', 'door_b', 'door_c'];
    const coolIdx = Math.floor(Math.random() * names.length);
    for (let i = 0; i < names.length; i++) {
      const sp = this.map.spawns.get(names[i]);
      if (!sp) continue;
      const cx = sp.x + sp.width / 2;
      const cy = sp.y + sp.height / 2;
      // door_safe 텍스처를 placeholder sprite 로 표시 (BootScene 에 이미 로드됨)
      let img: Phaser.GameObjects.Image | undefined;
      if (this.textures.exists('door_safe')) {
        img = this.add.image(cx, cy, 'door_safe').setDepth(60);
      }
      this.doors.push({
        spawnName: names[i],
        cx,
        cy,
        radius: 80,
        active: false,
        used: false,
        isCool: i === coolIdx,
        spriteImg: img,
      });
    }
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
    // 다음 맵 전환 직전에만 친구들이 학생을 따라옴
    this.transitioning = true;
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

    // 손수건 보유 시 정답 대사 분기 (옷자락 → 손수건)
    const cp = this.cp4WithKerchiefVariant();

    await runCheckpoint(cp, (remaining) => {
      gameEventBus.emit('checkpoint:countdown', { remaining });
    });

    useGameStore.getState().recordCheckpoint(1, 3, 'success');
    useGameStore.getState().advanceCheckpoint(1);

    // 자세 메커니즘 활성화 — 이제부터 학생이 B/C 누르고 다녀야 안전
    this.cp4Done = true;

    // 손등 체크 문 3개 활성화 (시원한 문 1개 찾아 통과해야 계단실로)
    for (const d of this.doors) d.active = true;

    this.movementLocked = false;

    // 안내 — 손수건 보유 여부에 따라 분기 대사
    const hasKerchief = useSessionStore.getState().hasHandkerchief;
    this.time.delayedCall(400, () => {
      const tip = hasKerchief
        ? '손수건으로 코·입 가리고, 안전한 문을 찾자!'
        : '연기 사이로 안전한 문을 찾자!';
      showSpeechBubble(this, this.player, tip, { holdMs: 2400 });
    });
  }

  private async handleDoorCheck(door: DoorZone) {
    if (door.used || this.movementLocked) return;
    this.movementLocked = true;
    this.player.setVelocity(0, 0);

    showSpeechBubble(this, this.player, '손등으로 살짝 대본다...', { holdMs: 1100 });
    await new Promise<void>((r) => this.time.delayedCall(1200, () => r()));

    if (door.isCool) {
      showSpeechBubble(this, this.player, '차갑다! 안전해 — 통과!', { holdMs: 1800 });
      await new Promise<void>((r) => this.time.delayedCall(900, () => r()));
      // 페이드 → 계단실 통로로 텔포 → fadeIn
      this.cameras.main.fadeOut(500, 0, 0, 0);
      await new Promise<void>((r) => this.time.delayedCall(550, () => r()));
      const after = this.map.spawns.get('spawn_after_door');
      if (after) {
        this.player.setPosition(after.x, after.y);
      }
      this.cameras.main.fadeIn(500, 0, 0, 0);
      // 다른 문 비활성 + cool door 통과 표시 + CP5 활성
      this.coolDoorPassed = true;
      for (const d of this.doors) {
        d.used = true;
        if (d.marker) {
          d.marker.destroy();
          d.marker = undefined;
        }
      }
      if (this.stairsZone) this.stairsZone.active = true;
      this.movementLocked = false;
      return;
    }

    // 뜨거운 문 — 차단
    this.cameras.main.flash(300, 255, 60, 60);
    showSpeechBubble(this, this.player, '앗, 뜨거워! 다른 길로!', { holdMs: 1800 });
    door.used = true;
    if (door.marker) {
      door.marker.destroy();
      door.marker = undefined;
    }
    // 시각 표시: 문 위에 빨간 X
    if (door.spriteImg) {
      door.spriteImg.setTint(0xef4444);
    }
    door.hotMark = this.add.graphics();
    door.hotMark.lineStyle(4, 0xef4444, 0.95);
    door.hotMark.lineBetween(door.cx - 18, door.cy - 18, door.cx + 18, door.cy + 18);
    door.hotMark.lineBetween(door.cx - 18, door.cy + 18, door.cx + 18, door.cy - 18);
    door.hotMark.setDepth(65);
    await new Promise<void>((r) => this.time.delayedCall(900, () => r()));
    this.movementLocked = false;
  }

  // 손수건 보유 여부에 따라 CP4 onCorrect 첫 줄을 분기. 그 외는 그대로.
  private cp4WithKerchiefVariant() {
    const hasKerchief = useSessionStore.getState().hasHandkerchief;
    if (!hasKerchief) return CP4_LOW_POSTURE;
    const step = CP4_LOW_POSTURE.steps[0];
    const original = step.onCorrect ?? [];
    const variant = [
      { speaker: '나', text: '몸을 낮추고 손수건으로 입과 코를 가린다.' },
      ...original.slice(1),
    ];
    return {
      ...CP4_LOW_POSTURE,
      steps: [{ ...step, onCorrect: variant }],
    };
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

    // 손등 체크 문 marker (활성 + 미사용)
    let nearestDoor: DoorZone | null = null;
    let nearestDoorDist = Infinity;
    for (const d of this.doors) {
      if (!d.active || d.used) {
        if (d.marker) {
          d.marker.destroy();
          d.marker = undefined;
        }
        continue;
      }
      if (!d.marker) d.marker = this.createMarker(d.cx, d.cy);
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.cx, d.cy);
      if (dist < d.radius && dist < nearestDoorDist) {
        nearestDoorDist = dist;
        nearestDoor = d;
      }
    }
    for (const d of this.doors) {
      if (d.marker) d.marker.setScale(d === nearestDoor ? 1.25 : 0.9);
    }
    this.nearbyDoor = nearestDoor;

    // A 버튼 (Space) JustDown — door 우선, 없으면 일반 interaction
    if (!this.movementLocked && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.nearbyDoor) {
        void this.handleDoorCheck(this.nearbyDoor);
      } else if (this.nearbyInteraction) {
        void this.nearbyInteraction.onTrigger();
      }
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
    // follower 는 마지막 CP 통과 후 다음 맵 전환 시점에만 ON
    const panicMode = this.movementLocked && this.currentCp >= 4;
    const followerActive = this.transitioning;
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
