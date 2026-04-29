// 맵 spawn 정의 타입 — 단일 진실 원천.
// 같은 정의를 클라 Phaser Scene 과 scripts/import-map.ts 가 모두 import.
// 좌표 한 군데 고치면 코드와 JSON 둘 다 자동 반영.

export type SpawnDef = {
  name: string;       // 'playerspawn' | 'npc_<key>' | 'item_<key>' 형식
  x: number;          // 픽셀 좌표 (1280×1280 기준)
  y: number;
  width?: number;
  height?: number;
};

// 타일 단위 사각형 — 격자 (col, row) 기준, w·h 는 타일 개수
// 1280×1280 / 32px = 40×40 격자. col 0~39, row 0~39.
export type TileRect = {
  col: number;
  row: number;
  w: number;
  h: number;
};

export type MapSpawnConfig = {
  actNumber: number;
  spawns: SpawnDef[];
  // 충돌 벽 영역 — 캐릭터가 통과 못 함
  walls?: TileRect[];
  // 천장(overlay) 영역 — 캐릭터보다 위에 그려져서 "지붕 밑으로 들어감" 표현
  overlays?: TileRect[];
};

// 이름으로 spawn 조회. 못 찾으면 throw — 누락 즉시 발견.
export const requireSpawn = (
  config: MapSpawnConfig,
  name: string
): SpawnDef => {
  const s = config.spawns.find((sp) => sp.name === name);
  if (!s) throw new Error(`[spawn] missing "${name}" in spawn config`);
  return s;
};

// 접두사로 시작하는 spawn 들을 모두 반환 (예: 'item_clue_' → 4개 단서)
export const filterSpawns = (
  config: MapSpawnConfig,
  prefix: string
): SpawnDef[] => config.spawns.filter((s) => s.name.startsWith(prefix));
