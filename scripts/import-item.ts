// 아이템 자산 자동 임포트 스크립트.
// 입력: 흰 배경 + 단일 아이템 PNG
// 처리: 흰 배경 제거 + 컨텐츠 자동 정렬 + 32×32 (또는 지정 크기) 로 리사이즈
// 출력: assets/items/<id>.png + <id>.json
//
// 사용법:
//   npx tsx scripts/import-item.ts <id> <source-image> [--name "표시용 이름"] [--size 32]
// 예:
//   npx tsx scripts/import-item.ts extinguisher assets/raw/items/extinguisher.png --name "분말 소화기"
//   npx tsx scripts/import-item.ts exit_sign assets/raw/items/exit_sign.png --name "비상구 표지"

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SIZE = 32;
const WHITE_THRESHOLD = 240; // R, G, B 모두 240 이상이면 흰 배경으로 간주

const processItem = async (
  sourcePath: string,
  outSize: number
): Promise<Buffer> => {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const out = Buffer.from(data);

  // 흰 배경 → 투명
  for (let i = 0; i < out.length; i += 4) {
    if (
      out[i] > WHITE_THRESHOLD &&
      out[i + 1] > WHITE_THRESHOLD &&
      out[i + 2] > WHITE_THRESHOLD
    ) {
      out[i + 3] = 0;
    }
  }

  // 바운딩박스 + 노이즈 픽셀(이웃 적은 것) 제거
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (out[i + 3] <= 50) continue;

      // 이웃 픽셀 카운트 (8방향)
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = (ny * w + nx) * 4;
          if (out[ni + 3] > 50) neighbors++;
        }
      }
      if (neighbors <= 1) {
        out[i + 3] = 0;
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('이미지에서 컨텐츠를 찾지 못했습니다 (배경만 있거나 너무 흐립니다).');
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(outSize, outSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
};

const buildItemJson = (id: string, name: string) => ({
  id,
  name,
  itemId: id,
  imageExt: 'png',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  imagePath: `/assets/items/${id}.png`,
});

async function main() {
  const args = process.argv.slice(2);
  const id = args[0];
  const sourcePath = args[1];

  const nameIdx = args.indexOf('--name');
  const name = nameIdx >= 0 ? args[nameIdx + 1] : id;

  const sizeIdx = args.indexOf('--size');
  const size = sizeIdx >= 0 ? parseInt(args[sizeIdx + 1], 10) : DEFAULT_SIZE;

  if (!id || !sourcePath) {
    console.error('Usage: npx tsx scripts/import-item.ts <id> <source-image> [--name "표시명"] [--size 32]');
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }

  const outDir = path.join(PROJECT_ROOT, 'assets', 'items');
  fs.mkdirSync(outDir, { recursive: true });

  const buf = await processItem(sourcePath, size);
  fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
  console.log(`[import-item] ${id}.png 생성 (${size}×${size})`);

  const json = buildItemJson(id, name);
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(json, null, 2));
  console.log(`[import-item] ${id}.json 생성 완료`);
}

main().catch((e) => {
  console.error('[import-item] FAILED:', e);
  process.exit(1);
});
