// 1막 Map 1: 도서관 — spawn 정의 단일 진실 원천.
// Act1Scene 과 scripts/import-map.ts 가 모두 여기서 좌표를 읽음.
// 위치 변경 시 이 파일만 수정 → import-map.ts 다시 실행으로 JSON 재생성.

import type { MapSpawnConfig } from './types';

export const ACT1_LIBRARY_SPAWNS: MapSpawnConfig = {
  actNumber: 1,
  spawns: [
    // 학생 시작 위치 (도서관 중앙).
    // 학생이 시작 화면에서 고른 캐릭터가 여기 배치됨.
    { name: 'playerspawn', x: 640, y: 640 },

    // 친구 5 슬롯 — 학생이 고르지 않은 나머지 5마리가 임의 매핑됨.
    // 위치만 정함. 어느 슬롯에 어느 동물이 들어갈지는 게임 시작 시 결정.
    { name: 'npc_friend_1', x: 560, y: 576 },
    { name: 'npc_friend_2', x: 720, y: 576 },
    { name: 'npc_friend_3', x: 520, y: 704 },
    { name: 'npc_friend_4', x: 760, y: 704 },
    { name: 'npc_friend_5', x: 640, y: 736 },

    // CP1 트리거 — 옆 교실 창문 (불빛 보임)
    { name: 'item_classroom_window', x: 1100, y: 200, width: 96, height: 64 },

    // CP2 — 화재경보기. 좌측 게시판 옆 통로 (게시판은 col 0~5).
    // 카운터 아래 빈 벽 영역 (row 22~26 부근, x=200 ≈ col 6.25)
    { name: 'item_fire_alarm', x: 192, y: 800, width: 48, height: 64 },

    // CP3 — 출구 문 (좌하단). 통과하면 다음 맵 (corridor) 으로
    { name: 'item_exit_door', x: 160, y: 1080, width: 64, height: 96 },
  ],

  // 도서관 walls (40×40 격자, 32px tiles). 이미지 보고 결정.
  // 좌하단 출구는 col 0~5, row 28~32 영역으로 빈 통로.
  walls: [
    // 위쪽 책장 (perimeter)
    { col: 0, row: 0, w: 40, h: 5 },
    // 좌측 게시판/카운터 (출구 위)
    { col: 0, row: 5, w: 6, h: 23 },
    // 좌하단 책장 (출구 아래)
    { col: 0, row: 33, w: 8, h: 7 },
    // 우측 책장
    { col: 32, row: 5, w: 8, h: 28 },
    // 우하단 리딩 코너
    { col: 32, row: 33, w: 8, h: 7 },
    // 아래쪽 책장
    { col: 6, row: 36, w: 26, h: 4 },
    // 중앙 책상 1 (왼쪽)
    { col: 12, row: 25, w: 6, h: 8 },
    // 중앙 책상 2 (오른쪽)
    { col: 20, row: 25, w: 6, h: 8 },
  ],
};
