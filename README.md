# 안전교육 게임 (가칭)

> 초등 4학년 화재·지진 안전교육 1인 플레이 시리어스 게임

매뉴얼대로 한 행동 = 정답. 추리 퍼즐 X, 반복 숙달 O.

---

## 개요

| 항목 | 내용 |
|---|---|
| 대상 | 초등학교 4학년 |
| 주제 | 1막 화재 + 2막 지진 (한 캐릭터의 여정) |
| 플레이 | 1인 / 카메라 스크롤 / 막당 6 체크포인트 |
| 시간 제약 | 매 체크포인트 10초 카운트다운 |
| 막 전환 | 단순 페이드 |
| 총 플레이 시간 | 약 25~30분 |
| 동행 NPC | 동생 (가르치며 배우기 효과) |

---

## 매뉴얼 12개 체크포인트

### 1막 — 화재 (학교 도서관 → 복도 → 운동장)
1. 옆 교실 연기 발견 → "불이야!" + 119 신고
2. 출구 문 → 손등으로 온도 확인
3. 복도 연기 → 낮은 자세 + 코·입 가리기
4. 휴지통 작은 불 → 소화기 3단계 (안전핀 뽑기 → 호스 조준 → 손잡이 누르기)
5. 1층 가는 길 → 엘리베이터 X, 계단
6. 운동장 도착 → 안전거리 + 점호

### 2막 — 지진 (거리 → 상가 1층 → 공원 대피소)
1. 거리에서 흔들림 → 머리 보호 + 전봇대/간판/유리창에서 멀어지기
2. 상가 안에서 재진동 → Drop → Cover → Hold On
3. 흔들림 멈춤 → 신발 신기 + 머리 보호 + 낙하물 우회 이동
4. 1층 가는 길 → 계단 (1막 반복)
5. 다친 행인 → 119 신고, 직접 옮기지 않기
6. 공원 도착 → 머리 보호 자세 + 안전안내문자 확인

---

## 기술 스택

- **클라이언트** (배포 대상): Vite + React 18 + TypeScript + Phaser 3 + Zustand
- **서버** (로컬 개발 전용, 배포 X): Express + multer + sharp — Maker 저장 API 만
- **자동화 스크립트**: Node + tsx + sharp — AI 생성 이미지를 게임용 자산으로 가공
- **호스팅**: 정적 (GitHub Pages / Netlify / Vercel 무료 플랜)
- **DB**: 사용 안 함 (진행 상태는 localStorage)

---

## 폴더 구조

```
safegame2/
├── client/                 ← Vite + React + Phaser (배포 대상)
├── server/                 ← 로컬 개발 전용 미니 Express
├── scripts/                ← 자동화 (import-character/item/map)
├── shared/maps/            ← spawn 정의 (Phaser 와 스크립트가 공유)
├── docs/                   ← 시나리오, 결정사항
└── assets/
    ├── raw/                ← AI 이미지 원본 (선생님이 떨어뜨림)
    │   ├── characters/
    │   ├── items/
    │   └── maps/
    ├── characters/         ← 가공 결과 (게임이 직접 읽음)
    ├── items/
    └── maps/
```

---

## 자산 워크플로우 (이중 경로, 같은 폴더 공유)

```
[자동 — 메인]                          [수동 — Maker UI]
프롬프트 (Claude 가 작성)               Maker 페이지 열기
        ↓                                  ↓
선생님이 AI 이미지 생성                 그림 그리기 / 수정
        ↓                                  ↓
assets/raw/ 에 떨어뜨림                 Express 가 받음
        ↓                                  ↓
import-*.ts 실행 (Claude 가 실행)  ←→  같은 assets/{type}/ 폴더
                       ↓
                Phaser 가 읽어서 게임 동작
```

- 자동 결과가 90% OK 면 그대로 사용
- 어색하면 Maker UI 열어서 수동 보정
- Maker 는 **로컬 개발 환경에만** 존재. 배포된 게임에는 학생용 UI 만

---

## 맵 규격

- **해상도**: 1280×1280 (정사각, 1:1)
- **타일 크기**: 32×32 px
- **격자**: 40×40 = 1600 타일
- **레이어**: collision (벽), overlay (천장), spawn (오브젝트 위치)
- **카메라**: 플레이어 따라다니는 스크롤 (큰 세계 탐험감)

---

## 실행

```bash
# 최초 설정
npm run install:all

# 개발 모드 (Vite 5173 + Express 3002 동시)
npm run dev

# 자산 가공 (Maker 거치지 않고 Claude 가 자동으로)
npm run import:character firefighter assets/raw/characters/firefighter.png
npm run import:item extinguisher assets/raw/items/extinguisher.png
npm run import:map act1_library assets/raw/maps/act1_library.png

# 배포용 빌드 (정적 dist/)
npm run build
```

---

## 설계 결정 이력

핵심 결정사항은 [`docs/decisions.md`](docs/decisions.md) 에 정리됨.
