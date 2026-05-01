// shared/maps barrel export.
// 새 맵 spawn 정의 추가 시 여기에 export 한 줄 추가하면 import-map.ts 가 자동 인식.

export * from './types';

import type { MapSpawnConfig } from './types';
import { ACT1_LIBRARY_SPAWNS } from './act1_library.spawns';
import { ACT1_CORRIDOR_SPAWNS } from './act1_corridor.spawns';
import { ACT1_PLAYGROUND_SPAWNS } from './act1_playground.spawns';

// 맵 id → spawn config 레지스트리
export const SPAWN_REGISTRY: Record<string, MapSpawnConfig> = {
  act1_library: ACT1_LIBRARY_SPAWNS,
  act1_corridor: ACT1_CORRIDOR_SPAWNS,
  act1_playground: ACT1_PLAYGROUND_SPAWNS,
};
