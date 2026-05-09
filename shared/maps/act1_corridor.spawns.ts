// 1막 Map 2: 복도+계단 — spawn 정의 단일 진실 원천.

import type { MapSpawnConfig } from './types';

export const ACT1_CORRIDOR_SPAWNS: MapSpawnConfig = {
  actNumber: 1,
  spawns: [
    // 학생 시작 — 우상단 (도서관 출구 직후 위치)
    { name: 'playerspawn', x: 1100, y: 200 },

    // 친구 5 슬롯 (학생 따라옴)
    { name: 'npc_friend_1', x: 1060, y: 240 },
    { name: 'npc_friend_2', x: 1100, y: 280 },
    { name: 'npc_friend_3', x: 1140, y: 240 },
    { name: 'npc_friend_4', x: 1060, y: 320 },
    { name: 'npc_friend_5', x: 1140, y: 320 },

    // CP4 — 천장 연기 영역 (복도 상단). 학생이 이 y 영역을 통과할 때 트리거
    { name: 'zone_smoke', x: 640, y: 200, width: 1280, height: 240 },

    // 손등 체크 문 3개 — CP4 통과 후 활성. 1개만 시원함 (랜덤). 시원한 문 통과 = 좌하단 텔포.
    // 복도 중간 가로선 위에 흩어 배치
    { name: 'door_a', x: 288, y: 576, width: 64, height: 96 },  // 좌
    { name: 'door_b', x: 608, y: 576, width: 64, height: 96 },  // 중
    { name: 'door_c', x: 976, y: 576, width: 64, height: 96 },  // 우

    // CP5 — 갈림길 (좌하단). 시원한 문 통과 후 활성.
    { name: 'item_stairs', x: 160, y: 1080, width: 96, height: 128 },     // 정답
    { name: 'item_elevator', x: 280, y: 1100, width: 96, height: 128 },   // 오답

    // 시원한 문 통과 시 학생이 텔포될 위치 (좌하단 통로 위)
    { name: 'spawn_after_door', x: 240, y: 920, width: 32, height: 32 },
  ],

  // 복도 walls. L자 형태의 통로 — 우상단 입구(도서관에서) → 좌하단 출구(계단).
  walls: [
    // 위쪽 벽 (천장 영역)
    { col: 0, row: 0, w: 40, h: 5 },
    // 좌측 벽
    { col: 0, row: 5, w: 5, h: 30 },
    // 우측 벽
    { col: 35, row: 5, w: 5, h: 30 },
    // 아래쪽 벽 (좌하단 계단·엘베 출구 영역만 빈)
    { col: 9, row: 35, w: 31, h: 5 },
  ],
};
