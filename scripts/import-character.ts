// 캐릭터 / NPC 자산 자동 임포트 스크립트.
//
// 세 가지 입력 모드:
//   (A) atlas — AI 가 이미 24프레임 시트(288×256) 로 그려준 경우. 검증 + 메타 JSON 만.
//   (B) single — 단일 정면 한 컷. 24프레임 모두 같은 그림 (정적, 안 걸음). 프로토타입용.
//   (C) split3 — 3분할(정면/측면/후면) PNG 한 장. 머리/다리 자동 감지 후 24프레임 walk
//                애니메이션 합성. mesa CharacterMaker 의 픽셀 변형 로직을 Node 로 이식.
//
// 출력 폴더는 --type 으로 선택:
//   --type characters → assets/characters/  (기본, 플레이어 캐릭터)
//   --type npcs       → assets/npcs/        (NPC, 어른 등)
//
// 사용법:
//   npx tsx scripts/import-character.ts <id> <source-image> [옵션...]
//
// 옵션:
//   --mode atlas|single|split3  (기본 atlas)
//   --type characters|npcs       (기본 characters)
//   --name "표시명"              (기본 = id)
//   --bg-color "R,G,B"           (split3 만, 기본 자동 감지)
//   --threshold 30               (split3 만, 배경 제거 색 거리 임계값. 기본 30)
//   --head-limit N               (split3 만, 자동 감지 무시하고 강제. 0~63)
//   --leg-limit N                (split3 만, 자동 감지 무시하고 강제. 0~63)
//
// 예:
//   npx tsx scripts/import-character.ts elephant assets/raw/characters/elephant.png \
//     --mode split3 --name "코끼리"

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRAME_W = 48;
const FRAME_H = 64;
const FRAMES_PER_DIR = 6;
const DIRS = ['down', 'up', 'right', 'left'] as const;
type Dir = (typeof DIRS)[number];
const ATLAS_W = FRAME_W * FRAMES_PER_DIR; // 288
const ATLAS_H = FRAME_H * DIRS.length;    // 256

type AssetKind = 'characters' | 'npcs';
type RGB = { r: number; g: number; b: number };
type BBox = { minX: number; maxX: number; minY: number; maxY: number };

// ── JSON 메타 ──
const buildAtlasJson = (id: string, name: string, kind: AssetKind) => {
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
    name,
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
    imagePath: `/assets/${kind}/${id}.png`,
  };
};

// ── 모드 A: atlas (이미 시트인 PNG 검증) ──
const importAtlas = async (id: string, sourcePath: string, outDir: string) => {
  const meta = await sharp(sourcePath).metadata();
  if (meta.width !== ATLAS_W || meta.height !== ATLAS_H) {
    console.warn(
      `[import-character] WARN: 아틀라스 크기가 ${meta.width}×${meta.height}, 권장 ${ATLAS_W}×${ATLAS_H}. 자동 리사이즈됨.`
    );
  }
  const buf = await sharp(sourcePath)
    .resize(ATLAS_W, ATLAS_H, { fit: 'fill' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
};

// ── 모드 B: single (단일 정면 → 정적 24프레임) ──
const importSingle = async (id: string, sourcePath: string, outDir: string) => {
  const frame = await processSingleFrame(sourcePath);
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

// 단일 PNG → 흰 배경 제거 + 48×64 중앙 정렬 PNG 버퍼 (single 모드용)
const processSingleFrame = async (sourcePath: string): Promise<Buffer> => {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] > 240 && out[i + 1] > 240 && out[i + 2] > 240) {
      out[i + 3] = 0;
    }
  }
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
  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
};

// ── 모드 C: split3 — 핵심 ──

// 모서리 5×5 영역 평균으로 배경색 자동 감지 (4개 corner 별도 — 그라데이션 배경 대응).
// 픽셀 아트 이미지의 배경이 위·아래 또는 좌·우로 약간 다를 수 있어 4점 별도 측정.
const autoDetectBgColors = (buf: Buffer, w: number, h: number): RGB[] => {
  const SAMPLE = 5;
  const corners: Array<[number, number]> = [
    [0, 0],
    [w - SAMPLE, 0],
    [0, h - SAMPLE],
    [w - SAMPLE, h - SAMPLE],
  ];
  const result: RGB[] = [];
  for (const [cx, cy] of corners) {
    let r = 0, g = 0, b = 0, count = 0;
    for (let y = cy; y < cy + SAMPLE && y < h; y++) {
      for (let x = cx; x < cx + SAMPLE && x < w; x++) {
        const i = (y * w + x) * 4;
        r += buf[i];
        g += buf[i + 1];
        b += buf[i + 2];
        count++;
      }
    }
    result.push({
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    });
  }
  return result;
};

const colorDist = (a: RGB, b: RGB): number =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

// 픽셀이 배경 색 4개 중 어느 것에라도 가까우면 배경으로 판정
const isBackground = (px: RGB, bgs: RGB[], threshold: number): boolean => {
  for (const bg of bgs) {
    if (colorDist(px, bg) < threshold) return true;
  }
  return false;
};

// 풀 이미지에서 viewIdx 번째 view 영역 추출 (3분할)
const extractView = (
  buf: Buffer,
  fullW: number,
  fullH: number,
  viewIdx: number
): { buf: Buffer; w: number; h: number } => {
  const viewW = Math.floor(fullW / 3);
  const sx = viewIdx * viewW;
  const out = Buffer.alloc(viewW * fullH * 4);
  for (let y = 0; y < fullH; y++) {
    for (let x = 0; x < viewW; x++) {
      const srcI = (y * fullW + (sx + x)) * 4;
      const dstI = (y * viewW + x) * 4;
      out[dstI] = buf[srcI];
      out[dstI + 1] = buf[srcI + 1];
      out[dstI + 2] = buf[srcI + 2];
      out[dstI + 3] = buf[srcI + 3];
    }
  }
  return { buf: out, w: viewW, h: fullH };
};

// 배경 제거 + bbox 계산. bgs = 4 모서리 색 배열.
const cleanAndBbox = (
  buf: Buffer,
  w: number,
  h: number,
  bgs: RGB[],
  threshold: number
): { buf: Buffer; bbox: BBox; hasContent: boolean } => {
  const out = Buffer.from(buf);
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const px = { r: out[i], g: out[i + 1], b: out[i + 2] };
      if (isBackground(px, bgs, threshold)) {
        out[i + 3] = 0;
      } else if (out[i + 3] > 50) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const hasContent = maxX >= minX && maxY >= minY;
  return { buf: out, bbox: { minX, maxX, minY, maxY }, hasContent };
};

// 노이즈 제거 — 단일 패스. minNeighbors 이하면 고립 픽셀로 간주.
const denoise = (buf: Buffer, w: number, h: number, minNeighbors = 2): void => {
  const original = Buffer.from(buf);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (original[i + 3] <= 50) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = (ny * w + nx) * 4;
          if (original[ni + 3] > 50) n++;
        }
      }
      if (n < minNeighbors) buf[i + 3] = 0;
    }
  }
};

// 메인 connected component 만 keep — 작은 노이즈 클러스터 제거.
// BFS 로 모든 component 찾고, (a) 가장 큰 component 또는 (b) 가장 큰 것의 일정 비율
// 이상 크기 component 들만 keep. 단순히 가장 큰 1개만 keep 하면 다람쥐 꼬리처럼
// 약간 분리될 수 있는 부분이 잘리므로 비율 임계값 사용.
const keepMainComponents = (buf: Buffer, w: number, h: number): BBox | null => {
  const visited = new Uint8Array(w * h);
  const components: number[][] = [];

  for (let y0 = 0; y0 < h; y0++) {
    for (let x0 = 0; x0 < w; x0++) {
      const startIdx = y0 * w + x0;
      if (visited[startIdx]) continue;
      const i0 = startIdx * 4;
      if (buf[i0 + 3] <= 50) {
        visited[startIdx] = 1;
        continue;
      }
      // BFS
      const stack: number[] = [startIdx];
      const comp: number[] = [];
      visited[startIdx] = 1;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        comp.push(cur);
        const cx = cur % w;
        const cy = (cur - cx) / w;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (visited[nIdx]) continue;
          const ni = nIdx * 4;
          if (buf[ni + 3] <= 50) {
            visited[nIdx] = 1;
            continue;
          }
          visited[nIdx] = 1;
          stack.push(nIdx);
        }
      }
      components.push(comp);
    }
  }

  if (components.length === 0) return null;

  // 가장 큰 component 의 5% 이상 크기인 것만 keep (메인 + 큰 부속)
  const maxSize = Math.max(...components.map((c) => c.length));
  const threshold = maxSize * 0.05;
  const keep = new Set<number>();
  for (const c of components) {
    if (c.length >= threshold) {
      for (const idx of c) keep.add(idx);
    }
  }

  // 나머지 alpha=0
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      if (keep.has(idx)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        buf[i + 3] = 0;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, maxX, minY, maxY };
};

// view 를 48×64 캔버스에 통일 스케일 + 중앙 정렬해서 그리기 (nearest neighbor)
const normalizeView = (
  viewBuf: Buffer,
  w: number,
  h: number,
  bbox: BBox,
  unifiedScale: number
): Buffer => {
  const cw = bbox.maxX - bbox.minX + 1;
  const ch = bbox.maxY - bbox.minY + 1;
  const dw = Math.max(1, Math.round(cw * unifiedScale));
  const dh = Math.max(1, Math.round(ch * unifiedScale));
  const dx = Math.floor((FRAME_W - dw) / 2);
  const dy = Math.floor((FRAME_H - dh) / 2);

  const target = Buffer.alloc(FRAME_W * FRAME_H * 4);

  for (let ty = 0; ty < dh; ty++) {
    for (let tx = 0; tx < dw; tx++) {
      // nearest-neighbor mapping back to source pixel
      const sx = bbox.minX + Math.min(cw - 1, Math.floor(tx / unifiedScale));
      const sy = bbox.minY + Math.min(ch - 1, Math.floor(ty / unifiedScale));
      const srcI = (sy * w + sx) * 4;
      const targetX = dx + tx;
      const targetY = dy + ty;
      if (targetX < 0 || targetX >= FRAME_W || targetY < 0 || targetY >= FRAME_H) continue;
      const dstI = (targetY * FRAME_W + targetX) * 4;
      target[dstI] = viewBuf[srcI];
      target[dstI + 1] = viewBuf[srcI + 1];
      target[dstI + 2] = viewBuf[srcI + 2];
      target[dstI + 3] = viewBuf[srcI + 3];
    }
  }
  return target;
};

// 정면 프레임에서 머리/다리 라인 자동 감지
const detectHeadLeg = (
  frame: Buffer
): { headLimit: number; legLimit: number; charTopY: number; charBottomY: number } => {
  type RowInfo = { minX: number; maxX: number; segments: Array<[number, number]> };
  const rowInfo: Array<RowInfo | null> = [];

  for (let y = 0; y < FRAME_H; y++) {
    let minX = FRAME_W, maxX = -1;
    const segments: Array<[number, number]> = [];
    let segStart = -1;
    for (let x = 0; x < FRAME_W; x++) {
      const i = (y * FRAME_W + x) * 4;
      const isChar = frame[i + 3] > 50;
      if (isChar) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (segStart === -1) segStart = x;
      } else {
        if (segStart !== -1) {
          // 작은 갭은 무시 (1픽셀 노이즈) — 갭 ≥ 2 픽셀일 때만 segment 분리
          if (x - segStart >= 1) {
            segments.push([segStart, x - 1]);
          }
          segStart = -1;
        }
      }
    }
    if (segStart !== -1) segments.push([segStart, FRAME_W - 1]);

    // 작은 갭 병합 (다리 사이는 큰 갭, 그 외는 단일 segment 로)
    const merged: Array<[number, number]> = [];
    for (const seg of segments) {
      if (merged.length === 0) {
        merged.push(seg);
      } else {
        const last = merged[merged.length - 1];
        if (seg[0] - last[1] <= 2) {
          last[1] = seg[1];
        } else {
          merged.push(seg);
        }
      }
    }

    rowInfo.push(maxX < minX ? null : { minX, maxX, segments: merged });
  }

  let firstY = -1, lastY = -1;
  for (let y = 0; y < FRAME_H; y++) {
    if (rowInfo[y]) {
      if (firstY === -1) firstY = y;
      lastY = y;
    }
  }
  if (firstY === -1) {
    return { headLimit: 24, legLimit: 44, charTopY: 0, charBottomY: FRAME_H - 1 };
  }
  const charH = lastY - firstY + 1;

  // ── headLimit (목 잘록한 곳) ──
  // 캐릭터 상부 50% 안에서 width 가 local minimum 인 y 찾기.
  let headLimit = -1;
  let bestScore = Infinity;
  const headSearchEnd = firstY + Math.floor(charH * 0.55);
  for (let y = firstY + 1; y < headSearchEnd; y++) {
    const r = rowInfo[y];
    const prev = rowInfo[y - 1];
    const next = rowInfo[y + 1];
    if (!r || !prev || !next) continue;
    const wThis = r.maxX - r.minX + 1;
    const wPrev = prev.maxX - prev.minX + 1;
    const wNext = next.maxX - next.minX + 1;
    // 위는 머리(넓음) → 여기서 좁아짐 → 아래는 어깨(다시 넓어짐)
    if (wThis <= wPrev && wThis <= wNext && wThis < bestScore) {
      // 목 후보 — 위쪽이 충분히 넓고(머리), 아래쪽도 충분히 넓어야(어깨) 함
      // 검사 범위: 위 3 row, 아래 3 row 평균과 비교
      let upWidthSum = 0, upCount = 0;
      for (let k = Math.max(firstY, y - 4); k < y; k++) {
        const rr = rowInfo[k];
        if (rr) {
          upWidthSum += rr.maxX - rr.minX + 1;
          upCount++;
        }
      }
      let downWidthSum = 0, downCount = 0;
      for (let k = y + 1; k <= Math.min(lastY, y + 4); k++) {
        const rr = rowInfo[k];
        if (rr) {
          downWidthSum += rr.maxX - rr.minX + 1;
          downCount++;
        }
      }
      if (upCount > 0 && downCount > 0) {
        const upAvg = upWidthSum / upCount;
        const downAvg = downWidthSum / downCount;
        // 위, 아래 모두 더 넓어야 진짜 목
        if (wThis < upAvg * 0.95 && wThis < downAvg * 0.95) {
          bestScore = wThis;
          headLimit = y + 1; // 목 바로 아래 = 어깨 시작
        }
      }
    }
  }
  if (headLimit === -1) {
    // 못 찾으면 chibi 비율 휴리스틱: 위 38%
    headLimit = firstY + Math.floor(charH * 0.38);
  }

  // ── legLimit (두 갈래 시작 = 다리) ──
  // 아래 50% 영역에서 segments 가 2개 이상으로 나뉘는 첫 row.
  let legLimit = -1;
  const legSearchStart = firstY + Math.floor(charH * 0.55);
  for (let y = legSearchStart; y <= lastY; y++) {
    const r = rowInfo[y];
    if (!r) continue;
    if (r.segments.length >= 2) {
      legLimit = y;
      break;
    }
  }
  if (legLimit === -1) {
    // 못 찾으면 chibi 비율 휴리스틱: 위 70%
    legLimit = firstY + Math.floor(charH * 0.7);
  }

  // 안전 보정: head 와 leg 사이 최소 갭 강제. 너무 가까우면 휴리스틱 fallback.
  const MIN_GAP = 10;
  if (legLimit - headLimit < MIN_GAP) {
    // 검출 결과 의심스러움 → chibi 비율 휴리스틱으로 강제 보정
    const fallbackHead = firstY + Math.floor(charH * 0.38);
    const fallbackLeg = firstY + Math.floor(charH * 0.7);
    // head 와 leg 중 더 신뢰성 있는 것만 유지: charH * 0.55 안에 있는 head 와
    // charH * 0.55 밖의 leg 는 보통 맞음. 둘 다 의심이면 모두 fallback.
    if (legLimit - headLimit < 5) {
      // 너무 가까움 → 둘 다 fallback
      headLimit = fallbackHead;
      legLimit = fallbackLeg;
    } else if (headLimit > firstY + charH * 0.5) {
      // head 가 너무 아래 → head 만 fallback
      headLimit = fallbackHead;
    } else if (legLimit < firstY + charH * 0.55) {
      // leg 가 너무 위 → leg 만 fallback
      legLimit = fallbackLeg;
    } else {
      // 갭만 부족 → leg 를 head + MIN_GAP 으로
      legLimit = Math.min(FRAME_H - 1, headLimit + MIN_GAP);
    }
  }

  return { headLimit, legLimit, charTopY: firstY, charBottomY: lastY };
};

// 한 프레임 그리기 (mesa drawToContext 의 픽셀 변형 로직 이식)
const drawFrame = (
  atlas: Buffer,
  view: Buffer,
  frame: number,
  direction: Dir,
  headLimit: number,
  legLimit: number,
  offX: number,
  offY: number
): void => {
  const f = frame % 4;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const i = (y * FRAME_W + x) * 4;
      const a = view[i + 3];
      if (a <= 10) continue;

      let dx = direction === 'right' ? FRAME_W - 1 - x : x;
      let dy = y;

      const isLeg = y >= legLimit;
      const isHead = y < headLimit;

      if (direction === 'down' || direction === 'up') {
        if (f === 1 || f === 3) {
          dy += 1;
          if (isHead) {
            dy += 1;
            dx += f === 1 ? 1 : -1;
          }
          if (isLeg) {
            const isRightSide = x >= FRAME_W / 2;
            if (f === 1 && isRightSide) dy -= 2;
            else if (f === 3 && !isRightSide) dy -= 2;
          }
        }
      } else {
        // left or right (측면)
        if (f === 1 || f === 3) {
          if (isLeg) {
            const isFrontLeg = x < FRAME_W / 2;
            dx += isFrontLeg ? (f === 1 ? -2 : 2) : f === 1 ? 2 : -2;
            if ((f === 1 && isFrontLeg) || (f === 3 && !isFrontLeg)) dy -= 1;
            else dy += 1;
          } else {
            dy += 1;
            if (isHead) dy += 1;
          }
        }
      }

      const targetX = offX + dx;
      const targetY = offY + dy;
      if (targetX < 0 || targetX >= ATLAS_W || targetY < 0 || targetY >= ATLAS_H) continue;
      const dstI = (targetY * ATLAS_W + targetX) * 4;
      atlas[dstI] = view[i];
      atlas[dstI + 1] = view[i + 1];
      atlas[dstI + 2] = view[i + 2];
      atlas[dstI + 3] = a;
    }
  }
};

// 24프레임 합성 (288×256 atlas)
const synthesizeAtlas = (
  front: Buffer,
  side: Buffer,
  back: Buffer,
  headLimit: number,
  legLimit: number
): Buffer => {
  const atlas = Buffer.alloc(ATLAS_W * ATLAS_H * 4);
  const layout: Array<{ dir: Dir; view: Buffer; row: number }> = [
    { dir: 'down', view: front, row: 0 },
    { dir: 'up', view: back, row: 1 },
    { dir: 'right', view: side, row: 2 },
    { dir: 'left', view: side, row: 3 },
  ];
  for (const l of layout) {
    for (let f = 0; f < FRAMES_PER_DIR; f++) {
      drawFrame(atlas, l.view, f, l.dir, headLimit, legLimit, f * FRAME_W, l.row * FRAME_H);
    }
  }
  return atlas;
};

// split3 모드 메인 함수
const importSplit3 = async (
  id: string,
  sourcePath: string,
  outDir: string,
  options: {
    bgColor?: RGB;
    threshold: number;
    headLimitOverride?: number;
    legLimitOverride?: number;
  }
) => {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fullW = info.width;
  const fullH = info.height;
  const fullBuf = Buffer.from(data);

  // 1. 배경색 (4 모서리 별도 — 그라데이션 배경 대응)
  const bgs = options.bgColor ? [options.bgColor] : autoDetectBgColors(fullBuf, fullW, fullH);
  console.log(
    `[import-character] bg colors: ${bgs.map((b) => `rgb(${b.r}, ${b.g}, ${b.b})`).join(' / ')}`
  );

  // 2. 3분할 + 배경 제거 + 노이즈 제거 + 메인 cluster 추출 + bbox
  const views: Array<{ buf: Buffer; w: number; h: number; bbox: BBox }> = [];
  for (let i = 0; i < 3; i++) {
    const v = extractView(fullBuf, fullW, fullH, i);
    const cleaned = cleanAndBbox(v.buf, v.w, v.h, bgs, options.threshold);
    if (!cleaned.hasContent) {
      throw new Error(`view ${i} (${['front', 'side', 'back'][i]}) 에 컨텐츠 없음 (배경 임계값 너무 높을 수 있음)`);
    }
    // 두 패스 노이즈 제거 (1픽셀, 2픽셀 고립 모두 제거)
    denoise(cleaned.buf, v.w, v.h, 2);
    denoise(cleaned.buf, v.w, v.h, 2);
    // 메인 cluster 만 keep (배경 dithering pixel 들 제거)
    const mainBbox = keepMainComponents(cleaned.buf, v.w, v.h);
    if (!mainBbox) {
      throw new Error(`view ${i} 메인 cluster 추출 실패`);
    }
    views.push({ buf: cleaned.buf, w: v.w, h: v.h, bbox: mainBbox });
  }

  // 3. 통일 스케일 (모든 view 의 bbox 중 최대 기준)
  let maxCw = 0, maxCh = 0;
  for (const v of views) {
    maxCw = Math.max(maxCw, v.bbox.maxX - v.bbox.minX + 1);
    maxCh = Math.max(maxCh, v.bbox.maxY - v.bbox.minY + 1);
  }
  const unifiedScale = Math.min((FRAME_W * 0.85) / maxCw, (FRAME_H * 0.85) / maxCh);
  console.log(`[import-character] bbox max: ${maxCw}×${maxCh}, unified scale: ${unifiedScale.toFixed(3)}`);

  // 4. 각 view → 48×64 정규화
  const front = normalizeView(views[0].buf, views[0].w, views[0].h, views[0].bbox, unifiedScale);
  const side = normalizeView(views[1].buf, views[1].w, views[1].h, views[1].bbox, unifiedScale);
  const back = normalizeView(views[2].buf, views[2].w, views[2].h, views[2].bbox, unifiedScale);

  // 5. 머리/다리 자동 감지 (정면 기준)
  const detected = detectHeadLeg(front);
  const headLimit = options.headLimitOverride ?? detected.headLimit;
  const legLimit = options.legLimitOverride ?? detected.legLimit;
  console.log(
    `[import-character] head/leg lines: head=${headLimit} leg=${legLimit} ` +
      `(detected ${detected.headLimit}/${detected.legLimit}, char Y range ${detected.charTopY}~${detected.charBottomY})`
  );

  // 6. 24프레임 합성
  const atlas = synthesizeAtlas(front, side, back, headLimit, legLimit);

  // 7. PNG 저장
  const png = await sharp(atlas, {
    raw: { width: ATLAS_W, height: ATLAS_H, channels: 4 },
  })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, `${id}.png`), png);
  console.log(`[import-character] split3 mode: ${id}.png 생성 (${ATLAS_W}×${ATLAS_H}, walking animation)`);
};

// ── CLI 파싱 + main ──
const parseRgbArg = (s: string | undefined): RGB | undefined => {
  if (!s) return undefined;
  const parts = s.split(',').map((x) => parseInt(x.trim(), 10));
  if (parts.length !== 3 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    throw new Error(`Invalid --bg-color "${s}". Use "R,G,B" (0-255).`);
  }
  return { r: parts[0], g: parts[1], b: parts[2] };
};

async function main() {
  const args = process.argv.slice(2);
  const id = args[0];
  const sourcePath = args[1];

  const getOpt = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const mode = (getOpt('--mode') ?? 'atlas') as 'atlas' | 'single' | 'split3';
  const kind = (getOpt('--type') ?? 'characters') as AssetKind;
  const name = getOpt('--name') ?? id;
  const bgColor = parseRgbArg(getOpt('--bg-color'));
  const threshold = parseInt(getOpt('--threshold') ?? '30', 10);
  const headLimitArg = getOpt('--head-limit');
  const legLimitArg = getOpt('--leg-limit');
  const headLimitOverride = headLimitArg !== undefined ? parseInt(headLimitArg, 10) : undefined;
  const legLimitOverride = legLimitArg !== undefined ? parseInt(legLimitArg, 10) : undefined;

  if (!id || !sourcePath) {
    console.error(
      'Usage: npx tsx scripts/import-character.ts <id> <source-image> ' +
        '[--mode atlas|single|split3] [--type characters|npcs] [--name "표시명"] ' +
        '[--bg-color "R,G,B"] [--threshold 30] [--head-limit N] [--leg-limit N]'
    );
    process.exit(1);
  }
  if (kind !== 'characters' && kind !== 'npcs') {
    console.error(`Unknown --type: ${kind}. Use 'characters' or 'npcs'.`);
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    process.exit(1);
  }

  const outDir = path.join(PROJECT_ROOT, 'assets', kind);
  fs.mkdirSync(outDir, { recursive: true });

  if (mode === 'atlas') {
    await importAtlas(id, sourcePath, outDir);
    console.log(`[import-character] atlas mode: ${kind}/${id}.png 생성 (${ATLAS_W}×${ATLAS_H})`);
  } else if (mode === 'single') {
    await importSingle(id, sourcePath, outDir);
    console.log(`[import-character] single mode: ${kind}/${id}.png 생성 (정적, 24프레임 모두 동일)`);
  } else if (mode === 'split3') {
    await importSplit3(id, sourcePath, outDir, {
      bgColor,
      threshold,
      headLimitOverride,
      legLimitOverride,
    });
  } else {
    console.error(`Unknown mode: ${mode}. Use 'atlas', 'single', or 'split3'.`);
    process.exit(1);
  }

  // JSON
  const json = buildAtlasJson(id, name, kind);
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(json, null, 2));
  console.log(`[import-character] ${kind}/${id}.json 생성 완료 (name: "${name}")`);
}

main().catch((e) => {
  console.error('[import-character] FAILED:', e);
  process.exit(1);
});
