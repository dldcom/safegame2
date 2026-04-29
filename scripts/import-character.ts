// 캐릭터 자산 자동 임포트 스크립트.
//
// 두 가지 입력 모드 지원:
//   (A) 24프레임 아틀라스 모드 (권장 — AI 가 이미 시트로 그려준 경우):
//       AI 에게 "6프레임 × 4방향 (down/up/right/left) 의 정확히 288×256 아틀라스, 각 프레임 48×64,
//       캐릭터 가운데 정렬, 흰 배경" 으로 생성 요청.
//       이 스크립트는 검증 + 메타 JSON 생성만.
//
//   (B) 단일 뷰 모드 (간이 — 정적 캐릭터):
//       정면 한 컷만 있을 때. 4방향 모두 같은 프레임으로 채움 (애니메이션 없음).
//       프로토타입용. 정식 캐릭터는 Maker UI 사용 권장.
//
// 사용법:
//   npx tsx scripts/import-character.ts <id> <source-image-path> [--mode atlas|single]
// 예:
//   npx tsx scripts/import-character.ts student assets/raw/characters/student.png --mode atlas
//   npx tsx scripts/import-character.ts sibling assets/raw/characters/sibling_front.png --mode single
//
// 출력: assets/characters/<id>.png (288×256 아틀라스) + <id>.json (Phaser TextureAtlas 포맷)

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRAME_W = 48;
const FRAME_H = 64;
const FRAMES_PER_DIR = 6;
const DIRS = ['down', 'up', 'right', 'left'] as const;
const ATLAS_W = FRAME_W * FRAMES_PER_DIR; // 288
const ATLAS_H = FRAME_H * DIRS.length;    // 256

const buildAtlasJson = (id: string) => {
  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
  DIRS.forEach((dir, row) => {
    for (let col = 0; col < FRAMES_PER_DIR; col++) {
      frames[`${dir}_${col}`] = {
        frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
      };
    }
  });
  return {
    id,
    name: id,
    charId: id,
    atlasData: {
      meta: {
        size: { w: ATLAS_W, h: ATLAS_H },
        app: 'safegame2 import-character',
        version: '1.0',
        image: `${id}.png`,
      },
      frames,
    },
    imageExt: 'png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imagePath: `/assets/characters/${id}.png`,
  };
};

// ── 모드 A: 이미 아틀라스인 PNG 검증 ──
const importAtlas = async (id: string, sourcePath: string, outDir: string) => {
  const meta = await sharp(sourcePath).metadata();
  if (meta.width !== ATLAS_W || meta.height !== ATLAS_H) {
    console.warn(
      `[import-character] WARN: 아틀라스 크기가 ${meta.width}×${meta.height}, 권장 ${ATLAS_W}×${ATLAS_H}. 자동 리사이즈됨.`
    );
  }
  // 흰 배경 → 투명 (간단 임계값) + 정확한 크기로 리사이즈
  const buf = await sharp(sourcePath)
    .resize(ATLAS_W, ATLAS_H, { fit: 'fill' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
};

// ── 모드 B: 단일 뷰 → 4방향 모두 같은 프레임으로 채움 ──
const importSingle = async (id: string, sourcePath: string, outDir: string) => {
  // 흰 배경 제거 + 48×64 로 컨텐츠 정렬
  const frame = await processSingleFrame(sourcePath);

  // 24개 프레임 모두 같은 frame 으로 채우는 아틀라스 합성
  // Sharp 의 composite 사용: 캔버스에 frame 을 24번 덧붙임
  const composites: sharp.OverlayOptions[] = [];
  for (let row = 0; row < DIRS.length; row++) {
    for (let col = 0; col < FRAMES_PER_DIR; col++) {
      composites.push({
        input: frame,
        top: row * FRAME_H,
        left: col * FRAME_W,
      });
    }
  }

  const atlas = await sharp({
    create: {
      width: ATLAS_W,
      height: ATLAS_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(outDir, `${id}.png`), atlas);
};

// 단일 PNG → 흰 배경 제거 + 48×64 중앙 정렬 PNG 버퍼
const processSingleFrame = async (sourcePath: string): Promise<Buffer> => {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const out = Buffer.from(data);

  // 흰 배경 (R+G+B > 240*3) → alpha 0
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] > 240 && out[i + 1] > 240 && out[i + 2] > 240) {
      out[i + 3] = 0;
    }
  }

  // 바운딩박스
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (out[i + 3] > 50) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);

  // 잘라내고 48×64 안에 맞춤
  const cropped = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return cropped;
};

// ── 메인 ──
async function main() {
  const args = process.argv.slice(2);
  const id = args[0];
  const sourcePath = args[1];
  const modeIdx = args.indexOf('--mode');
  const mode = (modeIdx >= 0 ? args[modeIdx + 1] : 'atlas') as 'atlas' | 'single';

  if (!id || !sourcePath) {
    console.error('Usage: npx tsx scripts/import-character.ts <id> <source-image> [--mode atlas|single]');
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }

  const outDir = path.join(PROJECT_ROOT, 'assets', 'characters');
  fs.mkdirSync(outDir, { recursive: true });

  if (mode === 'atlas') {
    await importAtlas(id, sourcePath, outDir);
    console.log(`[import-character] atlas mode: ${id}.png 생성 (${ATLAS_W}×${ATLAS_H})`);
  } else if (mode === 'single') {
    await importSingle(id, sourcePath, outDir);
    console.log(`[import-character] single mode: ${id}.png 생성 (정적, 24프레임 모두 동일)`);
  } else {
    console.error(`Unknown mode: ${mode}. Use 'atlas' or 'single'.`);
    process.exit(1);
  }

  // JSON
  const json = buildAtlasJson(id);
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(json, null, 2));
  console.log(`[import-character] ${id}.json 생성 완료`);
}

main().catch((e) => {
  console.error('[import-character] FAILED:', e);
  process.exit(1);
});
