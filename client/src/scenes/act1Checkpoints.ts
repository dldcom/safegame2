// 1막 도서관 체크포인트 정의 (CP1, CP2, CP3).
// runCheckpoint 가 이 정의를 받아 흐름 실행.

import type { CheckpointConfig } from './runCheckpoint';

// CP1 — "불이야!" + 119 신고
export const CP1_119: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '어어 저거 봐, 옆 교실에서 연기가...' },
    { speaker: '친구2', text: '어떡해 어떡해 어떡해...' },
    { speaker: '친구3', text: '어, 어, 어떡하지!?' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '어떻게 해야 하지? 침착해야 한다.',
        choices: [
          { label: '119에 신고한다', value: '119' },
          { label: '선생님 부르러 간다', value: 'teacher' },
          { label: '일단 도망친다', value: 'flee' },
        ],
      },
      correctValue: '119',
      hint: [
        {
          speaker: '친구4',
          text: '신고... 신고해야 하지 않아? 학교에서 배운 것 같아.',
        },
      ],
      onWrong: [
        { speaker: '친구5', text: '어... 그게 맞을까?' },
      ],
      onCorrect: [
        { speaker: '나', text: '119에 신고했다. "옆 교실에서 불이 났어요!"' },
        { speaker: '친구1', text: '맞아! 신고! 너 진짜 침착하다!' },
      ],
    },
    {
      question: {
        speaker: '나',
        text: '신고했으니 이제 다른 사람들도 알려야 한다.',
        choices: [
          { label: '"불이야!" 큰 소리로 외친다', value: 'shout' },
          { label: '조용히 친구들만 데리고 나간다', value: 'quiet' },
          { label: '일단 그냥 있는다', value: 'wait' },
        ],
      },
      correctValue: 'shout',
      hint: [
        {
          speaker: '친구2',
          text: '큰 소리로 알려야 다른 친구들도 알지...!',
        },
      ],
      onWrong: [
        { speaker: '친구3', text: '어, 그래도 될까?' },
      ],
      onCorrect: [
        { speaker: '나', text: '"불이야!"' },
        { speaker: '친구5', text: '네 목소리 들으니까 진정된다.' },
      ],
    },
  ],
  outro: [
    { speaker: '친구1', text: '이제 빨리 나가야 해. 어디로 가지?' },
  ],
};

// CP2 — 화재경보기 누르기
export const CP2_FIRE_ALARM: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '벽에 빨간 거... 뭐야 저거?' },
    { speaker: '친구2', text: '어떻게 하지, 어떻게 하지...' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '이건 화재경보기다. 어떻게 할까?',
        choices: [
          { label: '핸들을 내려서 누른다', value: 'press' },
          { label: '그냥 지나간다', value: 'skip' },
          { label: '경보기를 흔들어본다', value: 'shake' },
        ],
      },
      correctValue: 'press',
      hint: [
        {
          speaker: '친구3',
          text: '저거... 누르는 거 아니야? 학교에서 본 적 있는 것 같아.',
        },
      ],
      onWrong: [{ speaker: '친구4', text: '어... 그게 맞을까?' }],
      onCorrect: [
        { speaker: '나', text: '핸들을 내렸다. 사이렌이 울린다!' },
        { speaker: '친구5', text: '와, 이제 다른 사람들도 알겠다.' },
      ],
    },
  ],
  outro: [
    { speaker: '친구1', text: '진짜 나가야 해. 출구는 저쪽이야.' },
  ],
};

// CP4 — 낮은 자세 + 코·입 가리기
export const CP4_LOW_POSTURE: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '복도가 온통 연기야...' },
    { speaker: '친구2', text: '콜록콜록... 어떡해?' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '연기는 위로 올라간다. 어떻게 이동할까?',
        choices: [
          { label: '낮은 자세로 입과 코를 가리고 이동', value: 'low' },
          { label: '빠르게 뛰어서 통과', value: 'run' },
          { label: '코만 손으로 막고 이동', value: 'nose' },
        ],
      },
      correctValue: 'low',
      hint: [
        { speaker: '친구3', text: '엎드려서... 가야 한다고 들은 것 같아.' },
      ],
      onWrong: [{ speaker: '친구4', text: '콜록콜록!' }],
      onCorrect: [
        { speaker: '나', text: '몸을 낮추고 옷자락으로 입과 코를 가린다.' },
        { speaker: '친구5', text: '이제 숨쉬기 좀 나아.' },
        { speaker: '나', text: '계속 이 자세 유지해야 해. B 버튼 (또는 C 키) 을 누르고 다니자.' },
      ],
    },
  ],
  outro: [
    { speaker: '친구1', text: '저기 1층 가는 길이 보여!' },
  ],
};

// CP5 — 계단 vs 엘리베이터
export const CP5_STAIRS: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '엘리베이터가 빨라 보여!' }, // 잘못된 충동
    { speaker: '친구2', text: '계단은 좀 어둡지만...' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '잠깐. 화재일 때는 어디로 가야 하지?',
        choices: [
          { label: '계단으로 내려간다', value: 'stairs' },
          { label: '엘리베이터를 탄다', value: 'elevator' },
          { label: '창문 쪽으로 가본다', value: 'window' },
        ],
      },
      correctValue: 'stairs',
      hint: [
        {
          speaker: '친구3',
          text: '엘리베이터는 안 된다고 했던 것 같아... 갇힌대.',
        },
      ],
      onWrong: [{ speaker: '나', text: '...아니다, 그건 위험할 것 같다.' }],
      onCorrect: [
        { speaker: '나', text: '계단으로 침착하게 내려간다.' },
        { speaker: '친구5', text: '맞아! 엘베는 안 된다고 했어!' },
      ],
    },
  ],
  outro: [
    { speaker: '친구1', text: '운동장이 보인다. 거의 다 왔어!' },
  ],
};

// CP6 — 안전거리 + 점호
export const CP6_GATHERING: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '드디어 밖이다!' },
    { speaker: '친구2', text: '여기서 멈춰도 될까? 건물 가까운데...' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '여기가 충분히 안전한 곳일까?',
        choices: [
          { label: '여기서 멈추고 모두 모인다', value: 'gather' },
          { label: '학교를 다시 살피러 간다', value: 'back' },
          { label: '집으로 그냥 간다', value: 'home' },
        ],
      },
      correctValue: 'gather',
      hint: [
        {
          speaker: '친구3',
          text: '선생님이... 안전한 곳에서 모두 모이라고 했던 것 같아.',
        },
      ],
      onWrong: [{ speaker: '친구4', text: '잠깐, 그건 위험할 것 같아.' }],
      onCorrect: [
        { speaker: '나', text: '여기서 모이자. 다 같이 무사히 왔는지 확인해야 해.' },
        { speaker: '친구5', text: '맞아! 점호하자!' },
      ],
    },
  ],
  outro: [
    { speaker: '나', text: '하나, 둘, 셋, 넷, 다섯, 여섯... 다 무사하다!' },
  ],
};

// CP3 — 손등으로 문 온도 확인
export const CP3_DOOR_TEMP: CheckpointConfig = {
  countdownSeconds: 10,
  intro: [
    { speaker: '친구1', text: '이 문 잡고 빨리 나가자!' }, // 잘못된 충동
    { speaker: '나', text: '잠깐, 그냥 잡으면 안 될 것 같은데...' },
  ],
  steps: [
    {
      question: {
        speaker: '나',
        text: '문이 뜨거우면 화상을 입을 수도 있다. 어떻게 확인할까?',
        choices: [
          { label: '손등으로 살짝 댄다', value: 'back' },
          { label: '손바닥으로 잡는다', value: 'palm' },
          { label: '발로 차서 연다', value: 'kick' },
        ],
      },
      correctValue: 'back',
      hint: [
        {
          speaker: '친구2',
          text: '손등... 으로 한다고 배운 것 같은데?',
        },
      ],
      onWrong: [
        { speaker: '나', text: '아, 위험하다!' },
      ],
      onCorrect: [
        { speaker: '나', text: '손등을 살짝 댔다. 차갑다 — 안전하다!' },
        { speaker: '친구3', text: '오, 너 진짜 침착하다.' },
      ],
    },
  ],
  outro: [
    { speaker: '친구1', text: '복도가 보인다. 다 같이 나가자!' },
  ],
};
