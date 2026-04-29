// 맵 자산 자동 임포트 스크립트.
// 입력: 1280×1280 (또는 임의) 배경 PNG + shared/maps/<id>.spawns.ts
// 처리: 1280×1280 JPG q=85 압축 + Tiled 호환 JSON 생성
//        (collision/overlay 레이어는 spawns.ts 의 walls/overlays 배열로 자동 채움)
// 출력: assets/maps/<id>.jpg + <id>.json
//
// 사용법:
//   npx tsx scripts/import-map.ts <map-id> <source-image>
// 예:
//   npx tsx scripts/import-map.ts act1_library assets/raw/maps/act1_library.png
//
// spawn / 벽 / 천장 정의는 shared/maps/<id>.spawns.ts 에 작성 후 shared/maps/index.ts 의
// SPAWN_REGISTRY 에 등록하면 자동 인식.

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { SPAWN_REGISTRY, type SpawnDef, type TileRect } from '../shared/maps';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MAPS_DIR = path.join(PROJECT_ROOT, 'assets', 'maps');

const TARGET_W = 1280;
const TARGET_H = 1280;
const JPG_QUALITY = 85;
const TILE_SIZE = 32;
const GRID_W = TARGET_W / TILE_SIZE; // 40
const GRID_H = TARGET_H / TILE_SIZE; // 40

// TileRect 들을 1차원 격자 배열(0/1)로 펼침
const tileRectsToGrid = (rects: TileRect[] | undefined): number[] => {
  const grid = new Array<number>(GRID_W * GRID_H).fill(0);
  if (!rects) return grid;
  for (const r of rects) {
    for (let row = r.row; row < r.row + r.h; row++) {
      for (let col = r.col; col < r.col + r.w; col++) {
        if (row < 0 || row >= GRID_H || col < 0 || col >= GRID_W) continue;
        grid[row * GRID_W + col] = 1;
      }
    }
  }
  return grid;
};

const makeTiledJson = (
  id: string,
  actNumber: number,
  spawns: SpawnDef[],
  walls?: TileRect[],
  overlays?: TileRect[]
) => ({
  id,
  name: id,
  actNumber,
  imageExt: 'jpg',
  imagePath: `/assets/maps/${id}.jpg`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  content: {
    compressionlevel: -1,
    width: GRID_W,
    height: GRID_H,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tileheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.1',
    nextlayerid: 4,
    nextobjectid: spawns.length + 1,
    tilesets: [
      {
        firstgid: 1,
        name: 'CollisionTile',
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        tilecount: 1,
        columns: 1,
        margin: 0,
        spacing: 0,
        image: 'Wall',
        imagewidth: TILE_SIZE,
        imageheight: TILE_SIZE,
      },
    ],
    layers: [
      {
        id: 1,
        name: 'collision',
        type: 'tilelayer',
        width: GRID_W,
        height: GRID_H,
        x: 0,
        y: 0,
        opacity: 0.5,
        visible: true,
        data: tileRectsToGrid(walls),
      },
      {
        id: 2,
        name: 'overlay',
        type: 'tilelayer',
        width: GRID_W,
        height: GRID_H,
        x: 0,
        y: 0,
        opacity: 0.5,
        visible: true,
        data: tileRectsToGrid(overlays),
      },
      {
        id: 3,
        name: 'spawn',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        draworder: 'topdown',
        objects: spawns.map((s, i) => ({
          id: i + 1,
          name: s.name,
          point: false,
          rotation: 0,
          type: '',
          visible: true,
          x: s.x,
          y: s.y,
          width: s.width ?? TILE_SIZE,
          height: s.height ?? TILE_SIZE,
        })),
      },
    ],
  },
});

async function main() {
  const id = process.argv[2];
  const sourcePath = process.argv[3];
  if (!id || !sourcePath) {
    console.error('Usage: npx tsx scripts/import-map.ts <map-id> <source-image-path>');
    console.error(`Known maps: ${Object.keys(SPAWN_REGISTRY).join(', ') || '(none)'}`);
    process.exit(1);
  }
  const config = SPAWN_REGISTRY[id];
  if (!config) {
    console.error(
      `No spawn config for "${id}". Add shared/maps/${id}.spawns.ts and register in shared/maps/index.ts.`
    );
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source image not found: ${sourcePath}`);
    process.exit(1);
  }

  fs.mkdirSync(MAPS_DIR, { recursive: true });

  // 1. 이미지 → 1280×1280 JPG q=85
  const jpgPath = path.join(MAPS_DIR, `${id}.jpg`);
  const sourceSize = fs.statSync(sourcePath).size;
  const sourceBuf = fs.readFileSync(sourcePath);
  await sharp(sourceBuf)
    .resize(TARGET_W, TARGET_H, { fit: 'fill' })
    .jpeg({ quality: JPG_QUALITY, progressive: true, mozjpeg: true })
    .toFile(jpgPath);
  const jpgSize = fs.statSync(jpgPath).size;
  console.log(
    `[import-map] image: ${(sourceSize / 1024).toFixed(0)}KB → ${(jpgSize / 1024).toFixed(0)}KB JPG`
  );

  // 2. Tiled JSON (collision/overlay 자동 채움 + spawn)
  const json = makeTiledJson(
    id,
    config.actNumber,
    config.spawns,
    config.walls,
    config.overlays
  );
  const jsonPath = path.join(MAPS_DIR, `${id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  console.log(
    `[import-map] json: ${config.spawns.length} spawns, ${config.walls?.length ?? 0} wall rects, ${config.overlays?.length ?? 0} overlay rects`
  );

  // 3. 같은 ID 의 stale 확장자 정리
  const sourceAbs = path.resolve(sourcePath);
  for (const ext of ['png', 'jpeg', 'webp']) {
    const stale = path.join(MAPS_DIR, `${id}.${ext}`);
    if (fs.existsSync(stale) && path.resolve(stale) !== sourceAbs) {
      fs.unlinkSync(stale);
      console.log(`[import-map] cleaned stale ${path.basename(stale)}`);
    }
  }

  console.log(`[import-map] OK ${id} 완료`);
  console.log(`[import-map] spawns:`);
  for (const s of config.spawns) {
    console.log(`  - ${s.name} @ (${s.x}, ${s.y})`);
  }
}

main().catch((e) => {
  console.error('[import-map] FAILED:', e);
  process.exit(1);
});
