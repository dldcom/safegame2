# 설계 결정 이력

이 문서는 시나리오·기술·UX 결정사항의 **진실의 원천**입니다. 다른 PC 또는 새 세션에서 이어 작업할 때 먼저 읽으세요.

---

## 1. 게임 설계 결정

### 1.1 시나리오 골격
- **대상**: 초등 4학년
- **주제**: 1막 화재 + 2막 지진 (별개 시나리오 X, **한 캐릭터 여정 연결**)
- **이유**: 1인 플레이의 외로움을 동생 NPC 동행 + 연속된 서사로 보완

### 1.2 학습 패러다임 — 반복 숙달
- mesa 와 다름: **멘사급 논리 퍼즐 X**
- 정답 = 매뉴얼대로 한 행동, 오답 = 가벼운 시각 효과 + 즉시 재시도
- **Why**: 안전교육 목표는 추리력이 아닌 위급 상황 시 반사적 정답 행동 체화
- 4가지 메커니즘: 짧은 시간 제약 / 즉시 피드백 / 반복 노출 / NPC 가르치며 배우기

### 1.3 4학년 안전교육 — 학생 영역만 다룸
**포함**: 119 신고, 손등 문온도 확인, 낮은 자세, 소화기 3단계, 계단 사용, Drop-Cover-Hold On, 머리 보호, 안전거리, 안전안내문자 확인

**제외 (어른 영역)**: 가스/전기 차단, 부상자 직접 운반, 직접 진화 판단

**예외**: 소화기 3단계 사용은 4학년 표준 교육과정에 있어 포함

### 1.4 NPC 활용
- **동생 (1학년)**: 동행, 보호 책임감으로 감성 축, 후반엔 학생이 동생에게 알려주는 형태로 가르치며 배우기
- **어른 NPC** (사서, 선생님 등): 첫 등장 단계의 가이드 역할

### 1.5 페이싱
- 막당 **6 체크포인트** × 2막 = 12 체크포인트
- 체크포인트당 **30초~1분** (소화기 3단계는 1~1.5분)
- **시간 제약**: 매 체크포인트 10초 카운트다운 (망설임 방지, 부담 X)
- **막 전환**: 단순 페이드
- **총 플레이**: 25~30분 (1차시 안에 1~2회 가능)

### 1.6 매뉴얼 체크포인트 12개

| # | 1막 화재 | 2막 지진 |
|---|---|---|
| 1 | 연기 발견 → "불이야!"+119 | 거리 흔들림 → 머리보호+위험물 거리두기 |
| 2 | 문 앞 → 손등 온도 확인 | 실내 재진동 → Drop-Cover-Hold On |
| 3 | 복도 연기 → 낮은자세+코입 | 흔들림 멈춤 → 신발+낙하물 우회 |
| 4 | 휴지통 불 → 소화기 3단계 | 1층 → 계단 |
| 5 | 1층 → 계단 | 다친 행인 → 119 (직접 X) |
| 6 | 운동장 → 안전거리+점호 | 공원 → 머리보호+안전안내문자 |

---

## 2. 기술 결정

### 2.1 플레이어 구조
- **1인 플레이** (mesa 4인 협동과 다름)
- Socket.io / 세션 코드 / 팀 배정 / 교사 대시보드 **모두 제거**
- 진행 상태는 localStorage

### 2.2 카메라
- **카메라 스크롤** (mesa 단일화면 톱다운과 다름)
- 큰 세계 탐험감, 플레이어 따라다님

### 2.3 맵 규격
- **1280×1280** 정사각 (mesa 1280×720 대신)
- 32px 타일, 40×40 격자
- 1:1 비율은 AI 이미지 생성기 기본값이라 생성 용이

### 2.4 호스팅 — 정적 + 로컬 Express
- **배포물**: 100% 정적 (GitHub Pages / Netlify / Vercel 무료 플랜)
- **로컬 개발 전용 Express**: Maker UI 의 자산 저장 API 만 제공
- 배포된 게임에는 Express 등장 X
- **Maker 인증 없음**: Express 가 localhost 바인딩이라 같은 PC 에서만 접근 가능

### 2.5 자산 워크플로우 — 이중 경로
- **자동 (메인)**: Claude 프롬프트 작성 → 선생님 이미지 생성 → `assets/raw/` 에 저장 → `scripts/import-*.ts` 실행 → 가공된 PNG+JSON
- **수동 (escape hatch)**: Maker UI 로 직접 제작/수정 → Express 가 받아 같은 폴더에 저장
- 두 경로가 **같은 `assets/{type}/` 폴더, 같은 JSON 포맷** 공유 → 자유 교차

### 2.6 Phaser 자산 처리 (mesa 에서 가져옴)
- **캐릭터**: 3분할(정면/측면/후면) PNG → 6프레임×4방향 아틀라스 자동 합성 (288×256)
- **아이템**: 흰 배경 PNG → 32×32 정렬 (카테고리·actNumber **제거**, mesa 와 다름)
- **맵**: 배경 PNG → 1280×1280 JPG q=85 압축 + collision/overlay/spawn Tiled JSON

### 2.7 단일 진실 원천 패턴
- spawn 좌표는 `shared/maps/<id>.spawns.ts` 한 곳에만
- Phaser Scene 과 import-map 스크립트가 모두 동일 파일 import
- 좌표 한 군데 고치면 코드와 JSON 자동 동기화

---

## 3. mesa 에서 재사용 / 폐기 / 변경

### 재사용 (그대로 가져옴)
- `client/src/views/admin/CharacterMaker.tsx` — 그대로
- `client/src/views/admin/MapMaker.tsx` — 1280×1280 격자 수만 조정
- `server/src/lib/assetStorage.ts` — 1280×1280 상수만 조정
- `server/src/routes/admin.ts` — auth 미들웨어만 제거
- `client/src/scenes/characterAnims.ts` — 그대로
- `client/src/components/TouchControls.tsx`, `DialogueBox.tsx` — 그대로
- `client/src/lib/gameEventBus.ts` — 그대로
- `scripts/optimize-maps.ts`, `import-map.ts` — 1280×1280 + walls/overlays 자동 채우기 확장

### 폐기
- `server/prisma/` 통째로 (DB 제거)
- `server/src/lib/jwt.ts`, `middleware/auth.ts`, `routes/auth.ts`, `routes/session.ts`
- `server/src/sockets/` 통째로
- `server/src/game/sessionManager.ts`
- `client/src/services/socket.ts`, `useSessionStore.ts`, `useAuthStore.ts`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/views/StudentEntryPage.tsx`, `StudentWaitPage.tsx`, `LoginPage.tsx`, `TeacherDashboard.tsx`
- `client/src/utils/fraction.ts`
- `client/src/scenes/Act1Scene.ts`, `Act2Scene.ts`, `PrologueScene.ts` (시나리오 종속)

### 변경
- `client/src/views/admin/ItemMaker.tsx` — `category`, `actNumber` 필드 제거
- `client/src/views/HomePage.tsx` — 새로 작성 (학생 진입 → 게임 시작 단순화)
- `client/src/views/GamePage.tsx` — 단순 Phaser 마운트
- `client/src/App.tsx` — 라우터 단순화 (역할 가드 제거)
- `client/src/store/` — useGameStore 새로, dialogue/touch 만 재사용

---

## 4. 디자인 원칙 (코드 스타일)

mesa 의 [`CONTEXT_FOR_CLAUDE.md`](../../mesa/docs/CONTEXT_FOR_CLAUDE.md) 와 동일:
- TypeScript 전면 적용
- React 함수 컴포넌트 + Hooks
- Zustand (Redux/Context 안 씀)
- 주석 최소화, 명명으로 의도 전달
- 과도한 추상화 금지 (YAGNI)
- 에러 처리는 경계에서만

추가:
- **이모지 금지** (코드/대화 양쪽). UI 내 상태 아이콘은 OK
- **로맨스 코드 금지** (모든 시나리오·NPC·대사)

---

## 5. 진행 단계

- [x] mesa 분석 + 시나리오 큰 그림 + 매뉴얼 12개 확정 (2026-04-29)
- [x] 프로젝트 폴더 구조 (2026-04-29)
- [x] client 골격 (Vite+React+Phaser, mesa 에서 가져와 정리) (2026-04-30)
- [x] server 골격 (미니 Express, auth 제거) (2026-04-30)
- [x] Maker UI 3종 포팅 + 1280×1280 적용 (2026-04-30)
- [x] 자동화 스크립트 3종 (`import-character/item/map.ts`) (2026-04-30)
- [ ] **다음**: 의존성 설치(`npm run install:all`) + 동작 검증(`npm run dev`)
- [ ] 1막 자산 설계 + 첫 프롬프트
- [ ] 1막 Phaser 씬 구현
- [ ] 2막 자산 + 씬
- [ ] 정적 빌드 + 배포 테스트

진행 재개 시 `RESUME.md` 를 먼저 읽으세요.
