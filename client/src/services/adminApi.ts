// 관리자 에셋 CRUD 클라이언트 API (mesa 에서 가져와 인증 제거).
// 로컬 개발 전용 — Express 가 localhost:3002 에서 받아 assets/ 폴더에 저장.
// 배포 빌드에서는 Maker 라우트가 마운트되지 않아 호출되지 않음.

export type AssetType = 'characters' | 'items' | 'maps' | 'npcs';

export type AssetMetadata = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imagePath?: string;
  [key: string]: unknown;
};

export const listAssets = async (type: AssetType): Promise<AssetMetadata[]> => {
  const res = await fetch(`/api/admin/${type}`);
  if (!res.ok) throw new Error(`목록 조회 실패 (${res.status})`);
  const data = (await res.json()) as { assets: AssetMetadata[] };
  return data.assets;
};

export const getAsset = async (
  type: AssetType,
  id: string
): Promise<AssetMetadata> => {
  const res = await fetch(`/api/admin/${type}/${id}`);
  if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
  return res.json();
};

export const deleteAsset = async (type: AssetType, id: string): Promise<void> => {
  const res = await fetch(`/api/admin/${type}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`삭제 실패 (${res.status})`);
};

// 통합 업로드 — 모든 타입 사용
export const uploadAsset = async (
  type: AssetType,
  metadata: Record<string, unknown>,
  imageBlob?: Blob,
  imageFilename?: string
): Promise<AssetMetadata> => {
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));
  if (imageBlob) {
    formData.append('image', imageBlob, imageFilename ?? 'asset.png');
  }

  const res = await fetch(`/api/admin/${type}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `업로드 실패 (${res.status})`);
  }
  const data = (await res.json()) as { asset: AssetMetadata };
  return data.asset;
};
