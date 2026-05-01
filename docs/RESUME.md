# 다른 PC 에서 이어서 작업할 곳

> 새 세션에서 Claude 가 이 파일과 `decisions.md` 만 읽으면 곧장 이어 작업 가능.
> 마지막 세션: 2026-05-01

---

## 한 줄 상태

**1막 화재 대피 완성 (CP1~CP6 + 클리어 모달). 6마리 동물 캐릭터 + 기어가는 _b 자세. 다음은 2막 지진.**

---

## 새 PC 셋업 (한 번만)

```bash
git clone https://github.com/dldcom/safegame2.git
cd safegame2
npm run install:all          # sharp 컴파일로 수 분
npm run dev                  # client 5173 + server 3002
```

브라우저 http://localhost:5173/ → 캐릭터 선택 → 시작 → 도서관 진입.

---

## 현재까지 완성된 것 (1막 화재 대피)

### Act1LibraryScene (도서관)
- **CP1** (시작 1.5초 후 자동): 119 신고 + "불이야!" 외치기 — 친구 5명 패닉 모드
- **CP2** (인터랙션, A 버튼): 화재경보기 누르기 — 정답 시 카메라 빨간 플래시 (사이렌)
- **CP3** (인터랙션): 손등으로 문 온도 확인 — 정답 시 페이드 → corridor

### Act1CorridorScene (복도+계단)
- 입장 시 천장에 회색 dithering 연기 효과
- **CP4** (자동 1.2초 후): 낮은 자세 + 코·입 가리기
- **CP4 정답 후 = 자세 메커니즘 활성**:
  - **B 버튼 / C 키 홀드** → 학생 + 친구 5명 모두 `_b` 텍스처로 swap (기어가는 모습)
  - 자세 OFF + zone_smoke 영역 안 = 게이지 +0.5/sec → 화면 어두워짐 + "콜록!" 텍스트
  - 자세 ON 또는 영역 밖 = 게이지 -1.0/sec (회복)
- **CP5** (비대칭):
  - 엘리베이터 = proximity 자동 ("탄다" → 친구 경고 / "타지 않는다" → 정답)
  - 계단 = A 버튼 인터랙션 ("내려간다" → 페이드 → playground / "잠깐 멈춘다" → 닫음)

### Act1PlaygroundScene (운동장)
- 학교 건물 위쪽에 회색 연기 효과 (zone_danger_building)
- 안전 지점 (zone_safe_gathering) 에 깜빡이는 초록 ring + "안전 모임 지점" 라벨
- 친구 follower 모드 (학생 따라옴)
- **CP6** (proximity 100px 자동): "여기서 멈추고 모두 모인다" 정답
- 정답 후: 친구 5명이 학생 주변 70px 반경에 원형 정렬 (tween) → "하나/둘/...여섯!" 점호 텍스트 시퀀스 → `gameEventBus.emit('act:completed', { act: 1 })`

### React 1막 클리어 모달 (`ActClearOverlay`)
- CLEAR 뱃지 + 1막 제목
- 매뉴얼 6개 체크리스트
- 학습 전이 안내: "실제로 화재가 일어나면 너희 학교에서도 똑같이 행동해야 해."
- "메인 화면으로" 버튼 → `/` 이동

### 친구 NPC 3가지 모드 (Library/Corridor 공통)
| 모드 | 트리거 | 동작 |
|---|---|---|
| **panic** | 체크포인트 다이얼로그 진행 중 | 현재 위치 ±16px 작은 random walk, 200~600ms 마다 새 target, 80px/s |
| **wander** | 평상시 (CP 진행 중 X, follower X) | home 위치 ±48px 안 random walk, 1.2~2.7s 간격, 30% 정지 |
| **follower** | 학생이 출구 zone 280px 이내 (Library) / CP4 정답 후 (Corridor·Playground) | 학생 뒤 56·96·136px 거리 줄 서기, 좌우 ±24px 분산, 130px/s |

---

## 게임 자산 — 13장 + 6장 추가 = **19장**

| 폴더 | 파일 |
|---|---|
| `assets/characters/` (12장 PNG+JSON × 6) | elephant / fox / kitten_boy / kitten_girl / lion / rabbit (일어선 자세) |
| `assets/characters/` (12장 PNG+JSON × 6, 추가) | elephant_b / fox_b / ... (기어가는 자세, _b suffix) |
| `assets/items/` | fire_alarm (48px) / door_safe (64px) / elevator (96px) / stairs (96px) |
| `assets/maps/` | act1_library / act1_corridor / act1_playground (1280×1280 JPG + Tiled JSON) |

`shared/lib/characters.ts` 에 카탈로그. 시작 화면 CharacterPicker 가 이 카탈로그 사용 (카드 클릭 = 즉시 setCharacter 변경).

---

## 코드 인프라

### Phaser 씬 헬퍼
- `loadTiledMap.ts` — Tiled JSON → 배경 + collision walls (인접 타일 자동 박스 병합) + overlay + spawn lookup
- `friendSlots.ts` — 학생 선택 캐릭터 빼고 5마리 → npc_friend_1~5 시드 셔플 매핑
- `characterAnims.ts` — 4방향 6프레임 walk anim 등록 헬퍼 (mesa 패턴, ID 배열 받음)
- `runCheckpoint.ts` — DialogueBox 기반 CP 흐름. intro→steps→outro, 단계별 카운트다운/힌트/재시도. `showLines`, `showQuestion` export.
- `act1Checkpoints.ts` — CP1~CP6 정의 (대사·선택지·정답값)

### React 컴포넌트
- `CharacterPicker.tsx` — 6 카드 그리드, 카드 클릭 = 즉시 선택
- `CountdownTimer.tsx` — 우상단 10초 카운트다운, 3초 이하 빨강 + 펄스
- `DialogueBox.tsx` — 하단 비주얼노벨 박스, 타이핑 효과 + 선택지
- `TouchControls.tsx` — 좌하단 가상 조이스틱 + 우하단 A 버튼 + B 버튼 (자세 홀드, C 키 동일 동작)
- `ActClearOverlay.tsx` — 막 클리어 모달

### Zustand 스토어
- `useGameStore` — 진행 상태 + 선택 캐릭터 + localStorage 영속
- `useDialogueStore` — 다이얼로그 큐 + 선택지 + onResolve
- `useTouchControlsStore` — joyX/joyY + crouching boolean

### 자동화 스크립트 (`scripts/`)
- `import-character.ts` — split3 모드 (3분할 PNG → 24프레임 atlas walking + 자동 head/leg 감지 + 4 모서리 배경 + connected component cluster)
- `import-item.ts` — 흰배경 제거 + 32×32 (size 옵션)
- `import-map.ts` — 1280×1280 JPG q=85 + Tiled JSON (walls/overlays 자동 채움)

---

## 다음 단계 후보

### 우선순위 1 — 2막 지진 대피 (`docs/act1-design.md` 와 같은 형식으로 `act2-design.md` 작성)
- 시나리오: 운동장에서 집으로 가던 길에 강진
- 6 체크포인트:
  1. 거리에서 흔들림 → 머리보호 + 위험물(전봇대/간판/유리창) 거리두기
  2. 상가 1층 안에서 재진동 → Drop-Cover-Hold On
  3. 흔들림 멈춤 → 신발 + 낙하물 우회 이동
  4. 1층 → 계단 (1막 반복)
  5. 다친 행인 → 119 신고 (직접 옮기지 않기)
  6. 공원 도착 → 머리 보호 + 안전안내문자 확인
- 자산: 거리·상가·공원 맵 3장 + 새 캐릭터(다친 행인) 1장 + 아이템(휴대폰?, 가스밸브 안 씀)
- 메커니즘: 흔들림 → 카메라 shake + 학생 제어 약화. Drop-Cover-Hold On = 책상/단단한 가구 zone 안 + 자세 ON 유지 (자세 메커니즘 재활용 가능)

### 우선순위 2 — 3막 화재 진화 (소화기 단독, 6~8분 짧은 막)
- 1막 후 별도 발생 시나리오. 작은 불에 소화기 사용
- 핵심: 안전핀 뽑기 → 호스 조준 → 손잡이 누르기 (3단계 미니게임)
- 자산: 소화기 인터랙션용 아이템 (안전핀, 호스 별도 spritesheet?)
- 인터랙션은 mesa 식 드래그/탭 미니게임

### 보조 작업
- `_b` sprite 가 frame 안에 작게 보임 → CharacterMaker UI 로 수동 조정 또는 split3 알고리즘 height 기준 강하게
- 친구 NPC 가 학생 따라올 때 walls 충돌은 OK 인데, 친구끼리 겹치는 경우 가끔 있음 — 친구 간 collider 추가 검토
- 효과음·BGM 미정 (한 번에 추가)

---

## 자산 워크플로우 정리

```
[자동 스크립트]
프롬프트 (Claude) → AI 이미지 생성 (선생님) → assets/raw/{type}/<id>.png
   → npm run import:{character|item|map} <id> <path> [옵션]
   → assets/{type}/<id>.{png|jpg} + <id>.json
   → 게임이 직접 로드

[수동 Maker UI (같은 폴더 공유)]
http://localhost:5173/admin/{character|item|map}-maker
   → Express (3002) 가 받아서 같은 assets/{type}/ 에 저장
   → 게임이 새로고침 시 적용

[맵 walls 정의]
shared/maps/<id>.spawns.ts 에 walls 박스 + npm run import:map
또는 MapMaker UI 에서 시각 페인팅 (둘 중 하나만 — 동시 사용 시 import 가 덮어씀)
```

---

## 핵심 결정사항 요약

- 시나리오: 1막 화재 + 2막 지진 + 3막 화재 진화 (한 캐릭터 여정)
- 학습 패러다임: 반복 숙달 (멘사 논리 X)
- 체크포인트: 막당 6개 × 3막 = 18개, 각 10초 카운트다운
- 친구 5명 = 우왕좌왕 동료, 가이드 X. 1차 실패 OR 3초 남았을 때만 힌트
- 캐릭터 6마리 모두 player 후보 (NPC 슬롯 자동 매핑)
- 1280×1280 / 40×40 타일 맵, 카메라 스크롤
- 정적 배포 (학생) + 로컬 Express (선생님)
- 자세 메커니즘: B 버튼 / C 키 홀드 → _b 텍스처 swap

---

## 리포지토리

- **GitHub**: https://github.com/dldcom/safegame2
- **마지막 push**: 1막 완성 + 클리어 모달 + 자세 텍스처 swap (이 커밋)
- **메인 브랜치**: main

---

## 메모리 동기화

새 PC 에서 메모리는 자동 전승 안 됨. 메모리 파일들:
- `~/.claude/projects/.../memory/MEMORY.md`
- `project_safegame.md`
- `feedback_serious_game_paradigm.md`

→ 이 RESUME.md + decisions.md + GitHub 코드만으로 컨텍스트 복원 가능하게 설계됨.
