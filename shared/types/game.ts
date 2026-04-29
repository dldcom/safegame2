// 게임 공통 타입 — 클라이언트와 스크립트가 공유.

// 캐릭터 ID. 스프라이트 시트 텍스처 키이자 메타 JSON 의 id.
// 새 캐릭터 추가 시 assets/characters/ 에 PNG+JSON 저장 후 여기에 추가하면 BootScene 이 자동 로드.
export type Character = string;

// 게임 진행 막
export type Act = 1 | 2;

// 체크포인트 결과
export type CheckpointResult = 'pending' | 'success' | 'failed';

// 막별 체크포인트 진행
export type ActProgress = {
  act: Act;
  current: number; // 1~6 (현재 풀고 있는 체크포인트)
  results: CheckpointResult[]; // 길이 6, 각 체크포인트 결과
};
