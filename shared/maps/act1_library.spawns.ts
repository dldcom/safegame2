// 1막 Map 1: 도서관 — spawn 정의 단일 진실 원천.
// Act1Scene 과 scripts/import-map.ts 가 모두 여기서 좌표를 읽음.
// 위치 변경 시 이 파일만 수정 → import-map.ts 다시 실행으로 JSON 재생성.

import type { MapSpawnConfig } from './types';

export const ACT1_LIBRARY_SPAWNS: MapSpawnConfig = {
  actNumber: 1,
  spawns: [
    // 학생 시작 위치 (도서관 중앙).
    { name: 'playerspawn', x: 640, y: 640 },

    // 친구 5 슬롯 — 패닉으로 흩어진 위치 (책상 옆, 구석, 위쪽 공간).
    // 학생이 다가가서 A 버튼으로 모집해야 합류.
    { name: 'npc_friend_1', x: 256, y: 896 },  // 좌측 책상 옆
    { name: 'npc_friend_2', x: 608, y: 928 },  // 책상 사이
    { name: 'npc_friend_3', x: 896, y: 896 },  // 우측 책상 옆
    { name: 'npc_friend_4', x: 960, y: 256 },  // 위쪽 우측 빈 공간
    { name: 'npc_friend_5', x: 256, y: 256 },  // 위쪽 좌측 빈 공간

    // 인벤토리 아이템 — 학생이 줍기 인터랙션.
    // 휴대폰: 책상 위. 줍기 후에 CP1 (119 신고) 자동 발동.
    { name: 'item_phone', x: 448, y: 864, width: 32, height: 32 },
    // 손수건: 다른 책상 위. 복도 CP4 (낮은 자세) 시 옷자락 대신 사용.
    { name: 'item_handkerchief', x: 704, y: 864, width: 32, height: 32 },

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
