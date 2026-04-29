# 내일 이어서 작업할 곳

> 새 세션에서 Claude 가 이 파일과 `decisions.md` 만 읽으면 곧장 이어 작업 가능.
> 마지막 세션: 2026-04-29 ~ 2026-04-30

---

## 한 줄 상태

**코드 골격(client + server + scripts + Maker UI) 다 작성 완료. 다음은 의존성 설치 + 실행 검증, 그 다음 1막 화재 자산 설계.**

---

## 다음에 할 일 (순서대로)

### 1단계 — 의존성 설치 (선생님이 직접)

```bash
cd C:\Users\JY\Downloads\claude\safegame2
npm run install:all
```

이게 root + client + server 의 npm 의존성을 한 번에 설치. sharp 가 네이티브 모듈이라 첫 설치 시 컴파일 시간 걸림 (수 분). 네트워크 필요.

### 2단계 — 동작 검증

```bash
npm run dev
```

확인 항목:
- 콘솔에 `[safegame2-server] http://127.0.0.1:3002` 출력
- 콘솔에 Vite `Local:   http://localhost:5173/` 출력
- 브라우저에서 `http://localhost:5173/` 열기 → "안전교육 게임" 시작 화면 + "시작하기" 버튼
- "시작하기" 클릭 → `/game` 으로 이동, 검은 배경에 "BootScene 완료 (씬 미구현)" 텍스트
- 시작 화면 우하단 DEV TOOLS 링크 → `/admin/character-maker` 등 접속 시 Maker UI 표시

문제 시 자주 나오는 이슈:
- Postgres / Prisma 관련 에러: 없어야 함 (해당 의존성 제거됨). 나오면 mesa 코드가 실수로 들어온 것이니 알려주세요.
- 포트 3002 충돌: 다른 프로세스가 점유 중. `netstat -ano | grep ":3002"` 후 종료 또는 server/src/index.ts 의 PORT 변경.
- sharp 설치 실패: Windows 에선 가끔 Visual Studio Build Tools 없어서. `npm install --include=optional sharp` 또는 `npm rebuild sharp` 시도.

### 3단계 — 1막 화재 자산 설계 (Claude 와 함께)

검증 끝나면 Claude 에게 "1막 자산 설계 시작" 이라고 하면 됩니다. 구체적으로 만들 것:

- 1막 화재 6 체크포인트 (도서관·복도·계단·운동장) 별 공간 구성
- 필요한 캐릭터·NPC 목록: 학생(player), 동생(sibling), 사서(librarian), 그 외 어른 NPC
- 필요한 아이템 목록: 소화기(부품 분리: 본체·안전핀·호스), 휴지통, 불꽃 효과, 비상구 표지, 문(차가운/뜨거운)
- 필요한 맵 목록: act1_library (도서관 내부), act1_corridor (복도 + 계단), act1_playground (운동장 도착)
- 각 자산의 AI 이미지 프롬프트 + raw 폴더 경로
- `shared/maps/act1_library.spawns.ts` 작성 (spawn + walls + overlays)

### 4단계 — 자산 생성 (선생님)

Claude 가 준 프롬프트로 AI 에게 이미지 생성. 결과 PNG 를 `assets/raw/{type}/<id>.png` 에 저장.

### 5단계 — 자산 가공 (Claude)

```bash
npm run import:character student assets/raw/characters/student.png -- --mode atlas
npm run import:item extinguisher assets/raw/items/extinguisher.png -- --name "분말 소화기"
npm run import:map act1_library assets/raw/maps/act1_library.png
```

(npm script 호출 시 --mode 같은 인자는 `--` 뒤에 붙여야 npm 이 스크립트로 전달함)

가공 결과가 어색하면 Maker UI 로 수동 보정.

### 6단계 — 1막 Phaser 씬 구현 (Claude)

`client/src/scenes/Act1Scene.ts` 작성. 카메라 스크롤, 1인 플레이어 이동, 동생 NPC 동행, 6 체크포인트 (각 10초 카운트다운), 정답·오답 피드백.

### 7단계 — 2막 지진 (3~6단계 반복)

---

## 지금까지 완료된 것 (체크용)

### 디렉토리 구조

```
safegame2/
├── package.json              루트 스크립트 (dev, install:all, build, import:*)
├── README.md                 프로젝트 개요 + 매뉴얼 12 체크포인트
├── .gitignore
├── docs/
│   ├── decisions.md          모든 설계 결정의 진실의 원천
│   └── RESUME.md             ← 이 파일
├── client/                   Vite + React + Phaser (배포 대상)
│   ├── package.json
│   ├── vite.config.ts        프록시 /api·/assets → :3002
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx, App.tsx, index.css
│       ├── lib/gameEventBus.ts
│       ├── store/{useGameStore, useDialogueStore, useTouchControlsStore}.ts
│       ├── components/{DialogueBox, TouchControls}.tsx
│       ├── scenes/{BootScene, characterAnims}.ts
│       ├── main-phaser.ts
│       ├── services/adminApi.ts
│       └── views/
│           ├── HomePage.tsx
│           ├── GamePage.tsx
│           └── admin/
│               ├── CharacterMaker.tsx + .css + CropModal.css
│               ├── ItemMaker.tsx + .css       (카테고리·actNumber 제거됨)
│               └── MapMaker.tsx + .css        (40×40 격자)
├── server/                   미니 Express (로컬 개발 전용)
│   ├── package.json          (prisma/jwt/socket.io 없음)
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          127.0.0.1:3002 바인딩
│       ├── app.ts            /assets 정적 + /api/admin
│       ├── lib/assetStorage.ts   (1280×1280 적용)
│       └── routes/admin.ts   (인증 미들웨어 제거됨)
├── scripts/
│   ├── import-character.ts   atlas / single 모드
│   ├── import-item.ts        흰배경 제거 + 32×32
│   └── import-map.ts         1280×1280 JPG + walls/overlays 자동
├── shared/
│   ├── types/game.ts         Character, Act, ActProgress
│   └── maps/
│       ├── types.ts          SpawnDef, TileRect, MapSpawnConfig
│       └── index.ts          SPAWN_REGISTRY (빈 레지스트리)
└── assets/
    ├── raw/{characters,items,maps}/   비어있음 — AI 생성 이미지 떨어뜨릴 곳
    └── {characters,items,maps}/       비어있음 — 가공 결과 들어갈 곳
```

### 의도적으로 빠진 것 (mesa 대비)

`prisma/`, `jwt`, `socket.io`, `useAuthStore`, `useSessionStore`, `ProtectedRoute`, 학생/교사 페이지들, `fraction.ts`, mesa 의 PrologueScene/Act1Scene/Act2Scene 모두. 1인 플레이 + 정적 배포 + 안전교육이라 불필요.

---

## 미해결 / 결정 보류 항목

| 항목 | 현 상태 |
|---|---|
| 프로젝트 이름 | `safegame2` 임시. 옛 `safegame/` 와 구분용. 마음에 들면 유지, 아니면 폴더 rename |
| 사용 폰트 | `Pretendard` 가정. 시스템에 없으면 시스템 sans-serif 폴백 |
| 효과음·BGM | 미정. 1막 씬 작업 시 결정 |
| 실시간 분석 데이터 | 수집 안 함. 나중에 필요하면 옵션 ③(Supabase) 검토 |
| Git 초기화 | 아직 안 함. 셋업 검증 후 `git init` 권장 |

---

## 핵심 결정사항 요약 (decisions.md 발췌)

- **시나리오**: 1막 화재 + 2막 지진 (한 캐릭터 여정, 동생 동반)
- **학습 패러다임**: 반복 숙달 (멘사 논리 X, 시리어스 게임)
- **체크포인트**: 막당 6개 × 2막 = 12개, 각 10초 카운트다운
- **막 전환**: 단순 페이드
- **플레이어**: 1인, 카메라 스크롤
- **맵 규격**: 1280×1280 / 40×40 타일
- **호스팅**: 정적 배포 (학생) + 로컬 Express (선생님 개발)
- **자산 경로**: 자동(스크립트) + 수동(Maker UI) 같은 폴더 공유
- **Maker 인증**: 없음 (localhost 바인딩으로 보호)
- **ItemMaker**: 카테고리·actNumber 필드 제거
- **4학년 안전교육 학생 영역만 다룸**: 가스/전기 차단·부상자 운반 X (소화기 3단계는 표준에 있어 포함)

---

## 메모리 동기화

다음 메모리 파일들이 자동 로드됨:
- `~/.claude/projects/.../memory/MEMORY.md` (인덱스)
- `project_safegame.md` (이 프로젝트 한정 컨텍스트)
- `feedback_serious_game_paradigm.md` (안전교육 게임은 멘사 논리 X)

새 PC 에서 작업 시: 메모리는 PC 별로 분리됨. `decisions.md` + `RESUME.md` 가 진실의 원천.
