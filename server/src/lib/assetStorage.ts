// 파일 기반 에셋 저장소 (mesa 에서 가져와 1280×1280 으로 조정).
// safegame2/assets/{characters,items,maps,npcs}/ 폴더에 JSON + 이미지 파일로 저장.
// DB 사용 X — 단일 제작자(선생님), 고정 콘텐츠, git 버전 관리, PC 간 이전 용이.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type AssetType = 'characters' | 'items' | 'maps' | 'npcs';

export const ASSET_TYPES: readonly AssetType[] = [
  'characters',
  'items',
  'maps',
  'npcs',
] as const;

export const isAssetType = (x: string): x is AssetType =>
  (ASSET_TYPES as readonly string[]).includes(x);

export type AssetMetadata = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

const ASSETS_ROOT = path.resolve(__dirname, '../../../assets');

const typeDir = (type: AssetType) => path.join(ASSETS_ROOT, type);
const metaPath = (type: AssetType, id: string) =>
  path.join(typeDir(type), `${id}.json`);
const imagePathOf = (type: AssetType, id: string, ext: string) =>
  path.join(typeDir(type), `${id}.${ext}`);

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const safeId = (raw: string): string => {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
};

export const generateAssetId = (baseName?: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  const base = baseName ? safeId(baseName) : 'asset';
  return `${base}-${timestamp}${random}`;
};

// 맵 배경 최적화 — 1280×1280 정사각 (mesa 의 1280×720 과 다름) + JPG q=85.
// 캐릭터/아이템/NPC 는 투명 PNG 가 필요해서 변환 안 함 (maps 만).
const MAP_TARGET_W = 1280;
const MAP_TARGET_H = 1280;
const MAP_JPG_QUALITY = 85;

const optimizeMapImage = async (buf: Buffer): Promise<{ buf: Buffer; ext: string }> => {
  const out = await sharp(buf)
    .resize(MAP_TARGET_W, MAP_TARGET_H, { fit: 'fill' })
    .jpeg({ quality: MAP_JPG_QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
  return { buf: out, ext: 'jpg' };
};

const removeStaleImages = async (
  type: AssetType,
  id: string,
  keepExt: string
) => {
  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    if (ext === keepExt) continue;
    try {
      await fs.unlink(imagePathOf(type, id, ext));
    } catch {
      /* 해당 확장자 없음 — 정상 */
    }
  }
};

// ===== 저장 (이미지 포함) =====
export const saveAssetWithImage = async (
  type: AssetType,
  id: string,
  metadata: { name: string; imageExt: string } & Record<string, unknown>,
  imageBuffer: Buffer
): Promise<AssetMetadata> => {
  await ensureDir(typeDir(type));
  const now = new Date().toISOString();

  let ext = metadata.imageExt.replace(/^\./, '');
  let bufToWrite = imageBuffer;
  if (type === 'maps') {
    const optimized = await optimizeMapImage(imageBuffer);
    bufToWrite = optimized.buf;
    ext = optimized.ext;
    await removeStaleImages(type, id, ext);
  }

  await fs.writeFile(imagePathOf(type, id, ext), bufToWrite);

  const fullMeta: AssetMetadata = {
    ...metadata,
    id,
    name: metadata.name,
    imageExt: ext,
    createdAt: now,
    updatedAt: now,
    imagePath: `/assets/${type}/${id}.${ext}`,
  };
  await fs.writeFile(
    metaPath(type, id),
    JSON.stringify(fullMeta, null, 2),
    'utf-8'
  );
  return fullMeta;
};

// ===== 저장 (JSON only) =====
export const saveAssetJson = async (
  type: AssetType,
  id: string,
  metadata: { name: string } & Record<string, unknown>
): Promise<AssetMetadata> => {
  await ensureDir(typeDir(type));
  const now = new Date().toISOString();

  let createdAt = now;
  let imagePath: string | undefined;
  try {
    const existing = JSON.parse(await fs.readFile(metaPath(type, id), 'utf-8'));
    if (existing.createdAt) createdAt = existing.createdAt;
    if (typeof existing.imagePath === 'string') imagePath = existing.imagePath;
  } catch {
    /* 파일 없으면 새로 */
  }

  const fullMeta: AssetMetadata = {
    ...metadata,
    id,
    name: metadata.name,
    createdAt,
    updatedAt: now,
    ...(imagePath ? { imagePath } : {}),
  };
  await fs.writeFile(
    metaPath(type, id),
    JSON.stringify(fullMeta, null, 2),
    'utf-8'
  );
  return fullMeta;
};

// ===== 목록 =====
export const listAssets = async (type: AssetType): Promise<AssetMetadata[]> => {
  await ensureDir(typeDir(type));
  const files = await fs.readdir(typeDir(type));
  const out: AssetMetadata[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(typeDir(type), f), 'utf-8');
      out.push(JSON.parse(content));
    } catch (err) {
      console.warn(`[assetStorage] 읽기 실패: ${f}`, err);
    }
  }
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// ===== 단건 조회 =====
// JSON 에 imagePath 누락돼 있으면 디스크 스캔으로 자동 복구.
export const getAsset = async (
  type: AssetType,
  id: string
): Promise<AssetMetadata | null> => {
  try {
    const content = await fs.readFile(metaPath(type, id), 'utf-8');
    const meta = JSON.parse(content) as AssetMetadata;
    if (typeof meta.imagePath !== 'string') {
      for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
        try {
          await fs.access(imagePathOf(type, id, ext));
          meta.imagePath = `/assets/${type}/${id}.${ext}`;
          break;
        } catch {
          /* 해당 확장자 없음 */
        }
      }
    }
    return meta;
  } catch {
    return null;
  }
};

// ===== 삭제 =====
export const deleteAsset = async (
  type: AssetType,
  id: string
): Promise<boolean> => {
  const meta = await getAsset(type, id);
  if (!meta) return false;

  try {
    await fs.unlink(metaPath(type, id));
  } catch {
    /* ignore */
  }

  for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
    try {
      await fs.unlink(imagePathOf(type, id, ext));
      break;
    } catch {
      /* 해당 확장자 없음 */
    }
  }
  return true;
};
