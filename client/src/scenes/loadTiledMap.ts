// Tiled JSON 맵 로드 헬퍼.
// import-map.ts 가 생성한 JSON 의 collision/overlay/spawn 레이어를 Phaser 객체로 변환.
// 모든 1막 씬이 공유.

import Phaser from 'phaser';

const TILE_SIZE = 32;

type TiledLayer = {
  id: number;
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: TiledObject[];
};

type TiledObject = {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
};

export type LoadedMap = {
  bgImage: Phaser.GameObjects.Image;
  collisionBodies: Phaser.Physics.Arcade.StaticGroup;
  overlayBodies: Phaser.GameObjects.Group; // 천장 — 캐릭터보다 위에 그려짐
  spawns: Map<string, { x: number; y: number; width: number; height: number }>;
  widthPx: number;
  heightPx: number;
};

// scene 의 BootScene 에서 미리 로드된 텍스처(`map_<id>`) 와 데이터(`map_<id>_data`) 를 사용.
export const loadTiledMap = (scene: Phaser.Scene, mapId: string): LoadedMap => {
  const bgKey = `map_${mapId}`;
  const dataKey = `map_${mapId}_data`;

  if (!scene.textures.exists(bgKey)) {
    throw new Error(`map texture "${bgKey}" not loaded. Add to BootScene.`);
  }
  const json = scene.cache.json.get(dataKey) as { content: TiledMap } | undefined;
  if (!json) {
    throw new Error(`map data "${dataKey}" not loaded. Add to BootScene.`);
  }

  const { content } = json;
  const widthPx = content.width * content.tilewidth;
  const heightPx = content.height * content.tileheight;

  // 배경 이미지 (좌상단 정렬, depth 가장 아래)
  const bgImage = scene.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(0);

  // collision: invisible 정적 박스. 같은 격자 영역들을 큰 직사각형으로 묶어 효율화.
  const collisionBodies = scene.physics.add.staticGroup();
  const collisionLayer = content.layers.find((l) => l.name === 'collision');
  if (collisionLayer?.data) {
    addCollisionRects(scene, collisionBodies, collisionLayer.data, content.width, content.height);
  }

  // overlay: 캐릭터 위에 그려지는 천장 타일. 시각만, 충돌 X.
  const overlayBodies = scene.add.group();
  const overlayLayer = content.layers.find((l) => l.name === 'overlay');
  if (overlayLayer?.data) {
    addOverlayTiles(scene, overlayBodies, overlayLayer.data, content.width, content.height);
  }

  // spawn: 이름으로 lookup 가능한 좌표 맵
  const spawns = new Map<string, { x: number; y: number; width: number; height: number }>();
  const spawnLayer = content.layers.find((l) => l.name === 'spawn');
  if (spawnLayer?.objects) {
    for (const obj of spawnLayer.objects) {
      spawns.set(obj.name, {
        x: obj.x,
        y: obj.y,
        width: obj.width || TILE_SIZE,
        height: obj.height || TILE_SIZE,
      });
    }
  }

  return { bgImage, collisionBodies, overlayBodies, spawns, widthPx, heightPx };
};

// 인접 collision 타일들을 큰 직사각형으로 묶어 정적 body 생성 (성능 + 디버그 가독성)
const addCollisionRects = (
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  data: number[],
  cols: number,
  rows: number
) => {
  const visited = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (visited[idx] || data[idx] !== 1) continue;

      // 가로로 같은 row 에서 연속된 collision 타일 width 구함
      let w = 1;
      while (col + w < cols && data[row * cols + (col + w)] === 1 && !visited[row * cols + (col + w)]) w++;

      // 같은 width 가 유지되는 row 만큼 height 확장
      let h = 1;
      while (row + h < rows) {
        let canExpand = true;
        for (let dx = 0; dx < w; dx++) {
          const ni = (row + h) * cols + (col + dx);
          if (data[ni] !== 1 || visited[ni]) {
            canExpand = false;
            break;
          }
        }
        if (!canExpand) break;
        h++;
      }

      // 방문 표시
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          visited[(row + dy) * cols + (col + dx)] = 1;
        }
      }

      // 박스 생성
      const x = col * TILE_SIZE + (w * TILE_SIZE) / 2;
      const y = row * TILE_SIZE + (h * TILE_SIZE) / 2;
      const rect = scene.add.rectangle(x, y, w * TILE_SIZE, h * TILE_SIZE, 0xff0000, 0);
      scene.physics.add.existing(rect, true);
      group.add(rect);
    }
  }
};

// overlay 타일 — 시각만. 캐릭터보다 위 depth.
const addOverlayTiles = (
  scene: Phaser.Scene,
  group: Phaser.GameObjects.Group,
  data: number[],
  cols: number,
  rows: number
) => {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (data[idx] !== 1) continue;
      // 단순 검은 사각형으로 표시 (실제 천장 타일 텍스처는 추후 확장)
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      const rect = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0.6);
      rect.setDepth(1000);
      group.add(rect);
    }
  }
};
