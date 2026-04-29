// 자산 CRUD API (mesa 에서 가져와 인증 미들웨어 제거).
// localhost 바인딩이라 같은 PC 에서만 접근 가능. Maker UI 만 호출.

import express, { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import {
  saveAssetWithImage,
  saveAssetJson,
  listAssets,
  getAsset,
  deleteAsset,
  generateAssetId,
  isAssetType,
} from '../lib/assetStorage';

const router: Router = express.Router();

// 메모리 버퍼로 받아 assetStorage 가 파일로 씀
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ===== 목록 =====
router.get('/:type', async (req, res) => {
  const type = req.params.type;
  if (!isAssetType(type)) {
    res.status(400).json({ message: '알 수 없는 에셋 타입입니다.' });
    return;
  }
  const assets = await listAssets(type);
  res.json({ assets });
});

// ===== 단건 조회 =====
router.get('/:type/:id', async (req, res) => {
  const type = req.params.type;
  if (!isAssetType(type)) {
    res.status(400).json({ message: '알 수 없는 에셋 타입입니다.' });
    return;
  }
  const asset = await getAsset(type, req.params.id);
  if (!asset) {
    res.status(404).json({ message: '에셋을 찾을 수 없습니다.' });
    return;
  }
  res.json(asset);
});

// ===== 삭제 =====
router.delete('/:type/:id', async (req, res) => {
  const type = req.params.type;
  if (!isAssetType(type)) {
    res.status(400).json({ message: '알 수 없는 에셋 타입입니다.' });
    return;
  }
  const ok = await deleteAsset(type, req.params.id);
  if (!ok) {
    res.status(404).json({ message: '에셋을 찾을 수 없습니다.' });
    return;
  }
  res.json({ message: '삭제되었습니다.' });
});

// ===== 통합 저장 (이미지 선택적) =====
// POST /api/admin/:type/upload
//   multipart form-data
//     - image: File (선택)
//     - metadata: JSON string (필수, name 포함)
router.post('/:type/upload', upload.single('image'), async (req, res) => {
  const type = req.params.type;
  if (!isAssetType(type)) {
    res.status(400).json({ message: '알 수 없는 에셋 타입입니다.' });
    return;
  }

  const metadataRaw = req.body.metadata;
  if (!metadataRaw) {
    res.status(400).json({ message: '메타데이터가 필요합니다.' });
    return;
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(metadataRaw);
  } catch {
    res.status(400).json({ message: '메타데이터 JSON 파싱 실패.' });
    return;
  }

  const name = typeof metadata.name === 'string' ? metadata.name : '무명';
  const id =
    typeof metadata.id === 'string' && metadata.id
      ? metadata.id
      : generateAssetId(name);

  try {
    let saved;
    if (req.file) {
      const ext =
        path.extname(req.file.originalname).slice(1).toLowerCase() || 'png';
      saved = await saveAssetWithImage(
        type,
        id,
        { ...metadata, name, imageExt: ext },
        req.file.buffer
      );
    } else {
      saved = await saveAssetJson(type, id, { ...metadata, name });
    }
    res.status(201).json({ message: '저장되었습니다.', asset: saved });
  } catch (err) {
    console.error('[admin] upload 실패:', err);
    res.status(500).json({ message: '저장 중 오류가 발생했습니다.' });
  }
});

export default router;
