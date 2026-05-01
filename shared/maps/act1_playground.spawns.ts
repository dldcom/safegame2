// 1막 Map 3: 운동장 — spawn 정의 단일 진실 원천.

import type { MapSpawnConfig } from './types';

export const ACT1_PLAYGROUND_SPAWNS: MapSpawnConfig = {
  actNumber: 1,
  spawns: [
    // 학생 시작 — 상단 (학교 건물에서 막 나온 위치)
    { name: 'playerspawn', x: 640, y: 220 },

    // 친구 5 슬롯
    { name: 'npc_friend_1', x: 600, y: 260 },
    { name: 'npc_friend_2', x: 680, y: 260 },
    { name: 'npc_friend_3', x: 560, y: 300 },
    { name: 'npc_friend_4', x: 720, y: 300 },
    { name: 'npc_friend_5', x: 640, y: 340 },

    // CP6 시각 단서 — 멀리 보이는 화재 건물 (위험 표시)
    { name: 'zone_danger_building', x: 640, y: 100, width: 1280, height: 200 },

    // CP6 정답 — 안전 모임 지점 (하단)
    { name: 'zone_safe_gathering', x: 640, y: 1000, width: 256, height: 192 },
  ],

  // 운동장 walls. 위쪽 학교 건물 + 양옆 외곽. 가운데는 캐릭터 통과 가능.
  walls: [
    // 학교 건물 좌측
    { col: 0, row: 0, w: 14, h: 14 },
    // 학교 건물 우측
    { col: 26, row: 0, w: 14, h: 14 },
    // 좌측 잔디 가장자리 (나무들)
    { col: 0, row: 30, w: 4, h: 10 },
    // 우측 잔디 가장자리
    { col: 36, row: 30, w: 4, h: 10 },
  ],
};
