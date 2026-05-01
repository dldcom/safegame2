// 6마리 동물 캐릭터 카탈로그 — 단일 진실 원천.
// 시작 화면 캐릭터 선택, BootScene 자산 로드, NPC 슬롯 매핑 모두가 여기서 참조.
// 새 캐릭터 추가 시: assets/characters/ 에 PNG+JSON 저장 후 이 배열에 한 줄 추가.

export type CharacterDef = {
  id: string;             // 파일명 + 텍스처 키
  name: string;           // 표시 이름 (한글 OK)
  animal: string;         // 동물 종 (한글)
  color: string;          // 식별용 옷 색상 (한글)
  description: string;    // 캐릭터 선택 화면에 보여줄 짧은 설명
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'elephant',
    name: '코끼리',
    animal: '코끼리',
    color: '회색',
    description: '듬직한 코끼리',
  },
  {
    id: 'fox',
    name: '여우',
    animal: '여우',
    color: '파랑',
    description: '발랄한 여우',
  },
  {
    id: 'kitten_boy',
    name: '까망이',
    animal: '검은 고양이',
    color: '회색',
    description: '조용한 검은 고양이',
  },
  {
    id: 'kitten_girl',
    name: '점박이',
    animal: '점박이 고양이',
    color: '파랑',
    description: '리본 단 점박이 고양이',
  },
  {
    id: 'lion',
    name: '사자',
    animal: '사자',
    color: '남색',
    description: '갈기 멋진 사자',
  },
  {
    id: 'rabbit',
    name: '토토',
    animal: '토끼',
    color: '청',
    description: '분홍 토끼',
  },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);

export const findCharacter = (id: string): CharacterDef | undefined =>
  CHARACTERS.find((c) => c.id === id);
