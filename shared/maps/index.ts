// shared/maps barrel export.
// 새 맵 spawn 정의 추가 시 여기에 export 한 줄 추가하면 import-map.ts 가 자동 인식.

export * from './types';

import type { MapSpawnConfig } from './types';

// 맵 id → spawn config 레지스트리
// Claude 가 시나리오 작업하면서 한 줄씩 추가 (예: act1_library, act2_street).
export const SPAWN_REGISTRY: Record<string, MapSpawnConfig> = {
  // act1_library: ACT1_LIBRARY_SPAWNS,
  // act2_street: ACT2_STREET_SPAWNS,
};
