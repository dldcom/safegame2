// 친구 NPC 성격 + 대사 카탈로그.
// 평상시 (idle) wander 중에 학생이 다가오면 idleLines 중 무작위 하나, 모집 시 recruitLine.
// '나' 외 친구의 분위기를 살리는 게 목적 — 매뉴얼 학습과 직접 관련 없는 감성 대사.

export type Personality = {
  // characterId → 친구의 짧은 자기소개식 톤
  trait: string;
  // 평상시 wander 중 무작위 노출 대사 (3~5개 권장)
  idleLines: string[];
  // 학생이 모집할 때 (A 버튼) 한 번 띄울 대사
  recruitLine: string;
  // 모집 후 학생 근처에서 가끔 노출되는 진정 대사 (1~2개)
  followLines: string[];
};

// 학생이 고른 캐릭터는 player 가 되고, 나머지가 friend 슬롯.
// 어떤 캐릭터가 친구가 되든 톤이 일관되도록 모든 6마리에 정의.
export const PERSONALITIES: Record<string, Personality> = {
  elephant: {
    trait: '든든하고 의젓한 형/누나',
    idleLines: [
      '...침착하자. 학교에서 배웠잖아.',
      '괜찮아, 같이 있으면 돼.',
      '숨 크게 쉬어. 천천히.',
    ],
    recruitLine: '응, 같이 가자. 너만 믿을게.',
    followLines: ['다들 흩어지지 말자.', '나 여기 있어.'],
  },
  fox: {
    trait: '똑똑한데 유난스러움',
    idleLines: [
      '아 어떡해 어떡해 어떡해!',
      '책에서 봤는데... 음... 뭐였더라!',
      '진짜 불이야? 진짜로?',
    ],
    recruitLine: '맞아 같이 가야지! 따로 가면 안 된대!',
    followLines: ['빨리 가자 빨리!', '학교에서 분명히 배웠는데...'],
  },
  kitten_boy: {
    trait: '겁많고 울 것 같은 동생',
    idleLines: [
      '...무서워.',
      '엄마... 엄마 보고 싶어.',
      '나 못 가겠어...',
    ],
    recruitLine: '...같이 갈게. 손 잡아줘.',
    followLines: ['...옆에 있어줘.', '...무섭다.'],
  },
  kitten_girl: {
    trait: '차분하고 배려심 많음',
    idleLines: [
      '괜찮아, 우리 같이 있어.',
      '서두르지 말고 천천히 가자.',
      '다친 사람 없는지 봐야 해.',
    ],
    recruitLine: '응, 같이 가자. 모두 데려가야 해.',
    followLines: ['앞에 잘 봐.', '뒤에 친구도 챙기자.'],
  },
  lion: {
    trait: '충동적이고 용감한데 직관이 자주 틀림',
    idleLines: [
      '내가 먼저 갈게! 따라와!',
      '엘리베이터가 더 빠를 텐데?',
      '뛰어! 그냥 뛰면 돼!',
    ],
    recruitLine: '오케이! 내가 앞장설게!',
    followLines: ['빨리 가자!', '내가 길 알아!'],
  },
  rabbit: {
    trait: '빠르고 산만, 우왕좌왕',
    idleLines: [
      '어디로 가지? 어디로?',
      '빨리빨리 빨리빨리!',
      '저쪽? 이쪽? 어디?',
    ],
    recruitLine: '응응응! 같이 가 같이 가!',
    followLines: ['빨리빨리!', '어디 가? 같이 가!'],
  },
};

// 안전 fallback (정의 없는 id)
export const DEFAULT_PERSONALITY: Personality = {
  trait: '...',
  idleLines: ['...'],
  recruitLine: '...같이 가자.',
  followLines: ['...'],
};

export const getPersonality = (id: string): Personality =>
  PERSONALITIES[id] ?? DEFAULT_PERSONALITY;

// 무작위 idle 대사 — 직전과 같은 줄 피하기 위해 last index 인자 받음
export const pickIdleLine = (id: string, lastIndex: number = -1): { line: string; index: number } => {
  const p = getPersonality(id);
  if (p.idleLines.length <= 1) return { line: p.idleLines[0] ?? '...', index: 0 };
  let idx = Math.floor(Math.random() * p.idleLines.length);
  if (idx === lastIndex) idx = (idx + 1) % p.idleLines.length;
  return { line: p.idleLines[idx], index: idx };
};
