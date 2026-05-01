# 1막 자산 — AI 이미지 프롬프트 모음

> 모든 프롬프트는 영어 (AI 이미지 모델은 영어가 가장 안정적). Gemini 2.5 Flash Image (Nano Banana), Midjourney, DALL-E 등 어디서든 사용 가능.
> 각 자산을 생성한 PNG 는 `assets/raw/{characters,items,maps}/<id>.png` 에 저장.

---

## 공통 스타일 가이드 (모든 캐릭터 동일 적용)

> 6마리 동물 캐릭터는 **모두 캐릭터(player 후보)** 로 만듭니다. 시작 화면에서 학생이 1마리를 선택하면, 나머지 5마리는 자동으로 NPC 슬롯에 매핑됩니다. 어떤 캐릭터를 골라도 게임이 자연스럽게 흐르려면 **모두 평범한 자세 + 친근한 표정** 으로 그려야 합니다. 무서워하는 자세는 게임 코드에서 임시 효과로 처리.

> Style: KAWAII PIXEL ART, retro 16-bit/32-bit RPG game sprite, similar
> aesthetic to Stardew Valley / Pokemon Mystery Dungeon / Earthbound. Cute
> chibi anthropomorphic ANIMAL character, walking on two legs, wearing simple
> clothes like a child. Extra adorable features: BIG round head, tiny chibi
> body (1:2 head-to-body ratio), HUGE sparkly round eyes, tiny mouth with
> subtle smile, ROSY PINK BLUSH on cheeks, rounded simple silhouette. Limited
> vibrant color palette (about 8-12 colors per character), bold clean
> pixel-art outlines, FLAT colors with at most one shadow tone (no smooth
> gradients, no realistic shading), deliberate "pixel crunchiness" — visible
> pixel grid look. Pure WHITE background. Top-down RPG sprite style.
> 3-section vertical layout: front (top), left-side facing LEFT (middle),
> back (bottom).

**중요한 일관성 요구사항**:
- **PIXEL ART 스타일** — 16-bit RPG 게임 톤, 픽셀 그리드 정렬
- 한정된 컬러 팔레트, flat colors (그라데이션 X, 사실적 셰이딩 X)
- bold pixel-art outlines, minimal anti-aliasing
- 모든 캐릭터는 동일한 키·체형 비율 (chibi, 약 1:2 head-to-body)
- 두 발로 서 있는 의인화 동물 (anthropomorphic, NOT real animals on four legs)
- 옷 입은 상태 (사람 아이처럼)
- **추가 귀여움 강조**: HUGE sparkly eyes, rosy blushing cheeks, tiny mouth, rounded chibi
- **자세는 평범한 정자세** — 양팔 자연스럽게 옆에, 똑바로 서서 정면 응시
- **표정은 친근한 기본 표정** (옅은 미소, 큰 반짝이는 눈) — 무서워하지 X
- 흰 배경 (배경 제거 자동화에 필수)
- 정면/측면/후면 3분할 — 각 뷰가 동일한 스케일 + 동일한 위치 정렬
- 측면 뷰는 반드시 **왼쪽** 향함 (LEFT-side, body facing LEFT)
- 캐릭터 사이에 빈 공간 X
- 그림자 X (게임에서 별도 처리)

---

## 캐릭터 6마리 (모두 `assets/raw/characters/<id>.png`)

### `puppy` — 멍이 (강아지, 노랑)

**파일**: `assets/raw/characters/puppy.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic GOLDEN RETRIEVER
PUPPY, retro 16-bit RPG sprite style (Stardew Valley / Pokemon Mystery
Dungeon vibe), walking on two legs like a child. Big round dog head with
HUGE sparkly round eyes, tiny smile, rosy pink BLUSH circles on cheeks,
soft golden-yellow fur with one shadow tone, slightly floppy long ears,
small black nose dot. Chibi 1:2 head-to-body ratio. Wearing a bright YELLOW
hoodie with white drawstrings, blue jeans, white sneakers. Standard neutral
standing pose: arms relaxed at sides, looking forward. Short fluffy tail.

Limited vibrant pixel-art color palette (~10 colors total), bold clean
pixel-art outlines, flat colors with one shadow tone, no realistic
gradients or smooth shading, deliberate pixel grid crunchiness. Pure WHITE
background only.

Three-section vertical layout on a single white background:
- TOP: front view, facing camera, arms naturally at sides
- MIDDLE: LEFT-side view, body facing LEFT (the character MUST face the
  LEFT side of the canvas, not right), arms at sides, tail and one ear
  visible in profile
- BOTTOM: back view, facing away, hood and tail visible

Each view same scale, vertically centered, pixel-grid aligned.
```

### `bunny` — 토끼 (빨강)

**파일**: `assets/raw/characters/bunny.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic RABBIT, retro
16-bit RPG sprite style (Stardew Valley / Pokemon Mystery Dungeon vibe),
walking on two legs like a child, same scale as the puppy character. Big
round rabbit head with two LONG upright ears tied with pink ribbons, HUGE
sparkly round eyes with calm friendly expression, tiny pink nose dot, tiny
mouth with subtle smile, rosy pink BLUSH on cheeks, soft cream-white fur,
pink inner ear color. Wearing a RED cardigan over a white blouse, red plaid
skirt, white socks, red sneakers. Standard neutral standing pose: arms at
sides, standing straight. Small fluffy round tail.

Limited vibrant pixel-art color palette (~10 colors), bold pixel outlines,
flat colors with one shadow tone, no smooth gradients, deliberate pixel
crunchiness. Pure WHITE background.

Three-section vertical layout: front (top), LEFT-side view facing LEFT
(middle — body MUST face LEFT, not right), back (bottom). Each view same
scale, vertically centered, pixel-grid aligned.
```

### `fox` — 여우 (파랑)

**파일**: `assets/raw/characters/fox.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic FOX, retro 16-bit
RPG sprite style (Stardew Valley / Pokemon Mystery Dungeon vibe), walking
on two legs like a child, same scale as other characters. Big round fox
head with pointed upright orange-red ears (white inner ear), HUGE sparkly
round eyes behind small ROUND silver GLASSES, calm friendly expression,
small black nose dot, white muzzle with subtle smile, rosy pink BLUSH on
cheeks, soft orange-red fur with white cheeks. Wearing a BLUE and white
horizontal-stripe t-shirt, beige shorts, white sneakers. Standard neutral
standing pose: standing straight, arms at sides. Bushy orange-red tail with
white tip.

Limited vibrant pixel-art color palette (~10 colors), bold pixel outlines,
flat colors with one shadow tone, no smooth gradients, deliberate pixel
crunchiness. Pure WHITE background.

Three-section vertical layout: front (top), LEFT-side view facing LEFT
(middle — body MUST face LEFT, not right), back (bottom). Each view same
scale, vertically centered, pixel-grid aligned.
```

### `kitten` — 나비 (초록)

**파일**: `assets/raw/characters/kitten.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic KITTEN, retro
16-bit RPG sprite style (Stardew Valley / Pokemon Mystery Dungeon vibe),
walking on two legs like a child. The SMALLEST of the group — slightly
shorter than others (this kitten is a baby). Big round kitten head with
small triangular pointed ears (slight fluffy tufts on top), HUGE sparkly
round eyes with calm friendly expression, tiny pink nose dot, tiny mouth
with subtle smile, rosy pink BLUSH on cheeks, soft white-and-light-gray fur
with cute markings. Wearing a GREEN hoodie with paw-print pocket, blue
leggings, green sneakers. Standard neutral standing pose: arms at sides,
standing straight. Long thin tail visible.

Limited vibrant pixel-art color palette (~10 colors), bold pixel outlines,
flat colors with one shadow tone, no smooth gradients, deliberate pixel
crunchiness. Pure WHITE background.

Three-section vertical layout: front (top), LEFT-side view facing LEFT
(middle — body MUST face LEFT, not right), back (bottom). Each view same
scale, vertically centered, pixel-grid aligned.
```

### `bear` — 곰돌이 (보라)

**파일**: `assets/raw/characters/bear.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic BABY BEAR cub,
retro 16-bit RPG sprite style (Stardew Valley / Pokemon Mystery Dungeon
vibe), walking on two legs like a child, same scale as others but slightly
chubbier build (the BIGGEST/widest of the group, like a soft round teddy
bear). Big round bear head with small rounded ears, HUGE sparkly round
eyes with calm friendly expression, small black nose dot, gentle muzzle
with subtle smile, rosy pink BLUSH on cheeks, soft brown-tan fur. Wearing
PURPLE overalls (denim style but purple) over a white t-shirt, carrying a
large oversized PURPLE BACKPACK on shoulders, white sneakers. Standard
neutral standing pose: standing straight, arms at sides. Short stubby tail.

Limited vibrant pixel-art color palette (~10 colors), bold pixel outlines,
flat colors with one shadow tone, no smooth gradients, deliberate pixel
crunchiness. Pure WHITE background.

Three-section vertical layout: front (top), LEFT-side view facing LEFT
(middle — body MUST face LEFT, not right), back (bottom). Each view same
scale, vertically centered, pixel-grid aligned.
```

### `squirrel` — 다람이 (주황)

**파일**: `assets/raw/characters/squirrel.png`

```
KAWAII PIXEL ART of an extra cute chibi anthropomorphic SQUIRREL, retro
16-bit RPG sprite style (Stardew Valley / Pokemon Mystery Dungeon vibe),
walking on two legs like a child, same scale as main characters. Big round
squirrel head with small rounded tufted ears, HUGE sparkly round eyes with
calm friendly expression, small black nose dot, two tiny buck teeth gently
visible in subtle smile, rosy pink BLUSH on cheeks, soft red-brown fur with
cream belly. Wearing an ORANGE baseball cap worn forward (between the ears),
orange and white sports tracksuit jacket, navy track pants, white sneakers.
Standard neutral standing pose: standing straight, arms at sides. A LARGE
BUSHY red-brown TAIL prominently curling up behind — the defining squirrel
feature.

Limited vibrant pixel-art color palette (~10 colors), bold pixel outlines,
flat colors with one shadow tone, no smooth gradients, deliberate pixel
crunchiness. Pure WHITE background.

Three-section vertical layout: front (top), LEFT-side view facing LEFT
(middle — body MUST face LEFT, not right; bushy tail prominently visible
in profile), back (bottom — showing the full bushy tail). Each view same
scale, vertically centered, pixel-grid aligned.
```

---

## 아이템 (4개)

> 모든 아이템 픽셀 아트, 흰 배경, 위에서 본 시점(top-down) 또는 정면 (아이템마다 명시).
> 자동 처리 시 흰 배경 제거 + 32×32 또는 지정 크기로 정렬.
> **캐릭터와 동일한 16-bit RPG 톤** (Stardew Valley / Pokemon Mystery Dungeon vibe).

### `fire_alarm` (화재경보기)

**파일**: `assets/raw/items/fire_alarm.png`
**대상 크기**: 48×64

```
KAWAII PIXEL ART of a wall-mounted FIRE ALARM, retro 16-bit RPG game item
sprite (Stardew Valley / Pokemon Mystery Dungeon vibe). Vertical rectangular
red plastic case with a small white pull-down lever in the middle, tiny
white "FIRE" text label at top, small bright red LED indicator dot. Front
view as if looking at the wall. Bold pixel-art outlines, limited vibrant
color palette (~6 colors: bright red, dark red, white, black outline, gray
lever), flat colors with one shadow tone, deliberate pixel grid crunchiness,
no smooth gradients, no realistic shading. Pure WHITE background, no
shadows, no extra text or UI elements.
```

### `door_safe` (도서관 출구 문 — CP3 대상)

**파일**: `assets/raw/items/door_safe.png`
**대상 크기**: 64×96

```
KAWAII PIXEL ART of a closed wooden classroom door, retro 16-bit RPG game
sprite (Stardew Valley vibe). Light brown wood color with simple plank
texture, small frosted glass window panel in the upper third with a faint
cool blue-gray tint (suggesting the door is cool to touch, safe). Silver
round door handle on the right side. Front view, looking straight at the
door. Bold pixel-art outlines, limited color palette (~7 colors: light
brown, dark brown, blue-gray glass, silver handle, white frame, black
outline), flat colors with one shadow tone, pixel-grid crunchiness, no
smooth gradients. Pure WHITE background, no shadows.
```

### `elevator` (엘리베이터 — CP5 오답)

**파일**: `assets/raw/items/elevator.png`
**대상 크기**: 96×128

```
KAWAII PIXEL ART of a closed elevator door, retro 16-bit RPG game sprite
(Stardew Valley / Pokemon Mystery Dungeon vibe). Two metallic silver-gray
doors meeting in the middle with a vertical seam, small black floor display
panel above showing "1F" in glowing red pixel-art digital digits, white
illuminated "UP" arrow button on the right side wall (slightly glowing —
the tempting but wrong choice in fire situations). Front view. Bold
pixel-art outlines, limited color palette (~8 colors: silver-gray, dark
gray, black, red digits, white button, glow), flat colors with one shadow
tone, pixel-grid crunchiness. Pure WHITE background, no shadows.
```

### `stairs` (계단 — CP5 정답)

**파일**: `assets/raw/items/stairs.png`
**대상 크기**: 96×128

```
KAWAII PIXEL ART of a stairwell entrance going down, retro 16-bit RPG game
sprite (Stardew Valley vibe). Wooden steps descending into shadow, a
glowing green EMERGENCY EXIT sign with a small white running-figure icon
mounted softly above the entrance, simple metal railing on the right side.
View is angled slightly to show the steps descending. Reassuring and clearly
marked as the safe choice. Bold pixel-art outlines, limited color palette
(~9 colors: brown wood steps, dark shadow, green sign with white figure,
gray railing, black outline), flat colors with one shadow tone, pixel-grid
crunchiness. Pure WHITE background, no shadows.
```

---

## 맵 3종 (각 1280×1280)

> 톱다운 시점, 1:1 정사각. 캐릭터·아이템 자리는 *비워두기* (게임 코드가 위에 덮어 그림).
> 격자 32px (40×40 칸) 기준이라 의식하지 않아도 됨.
> **캐릭터·아이템과 동일한 픽셀 아트 톤** (16-bit RPG, Stardew Valley vibe).

### `act1_library` (도서관)

**파일**: `assets/raw/maps/act1_library.png`
**크기**: 1280×1280 (반드시 정사각)

```
KAWAII PIXEL ART top-down bird's-eye-view 2D RPG map, 1280x1280 square
aspect ratio, retro 16-bit/32-bit game style (Stardew Valley / Pokemon
Mystery Dungeon / Earthbound vibe). Warm cozy school library interior
viewed straight down at the floor. Bold pixel-art outlines, limited
vibrant color palette, flat colors with one shadow tone, deliberate pixel
grid crunchiness, no smooth gradients, no photorealism.

Layout (looking straight down):
- Light hardwood floor with subtle pixel-art plank texture, soft warm
  lighting feel
- Walls of bookshelves filled with colorful book spines lining the
  perimeter (top, bottom, and right sides), about 2 tiles thick (64 px)
- Large wooden reading tables with chairs in the lower-center area
- Empty floor space in the center (around coordinates 640, 640) where
  characters will spawn — keep this area clear of any objects
- Empty area on the LEFT WALL (around 200, 400) where a fire alarm will be
  placed by the game — leave this wall section clean and flat
- An EXIT DOORWAY in the LEFT-BOTTOM corner (around 160, 1080) — visible
  as a doorway opening in the wall, slightly recessed
- TOP-RIGHT CORNER (around 1100, 200) shows a window into an adjacent
  classroom, with a subtle orange-red pixel glow visible through the glass
  (suggesting fire next door, subtle, not the main focus)
- A few cute pixel-art decorative elements: small potted plants near walls,
  a children's reading corner with cushions in the bottom-right

Atmosphere: warm, cozy, slightly tense due to the orange glow in the
corner. Cream walls, light brown wood, hints of red-orange in the window
corner.

NEGATIVE: 3D perspective, isometric view, photorealism, smooth gradients,
characters, people, fire alarm icon visible (will be added by game), text
labels, UI elements, watermark, logos. Aspect ratio MUST be 1:1 square.
```

### `act1_corridor` (복도+계단)

**파일**: `assets/raw/maps/act1_corridor.png`
**크기**: 1280×1280

```
KAWAII PIXEL ART top-down bird's-eye-view 2D RPG map, 1280x1280 square
aspect ratio, retro 16-bit/32-bit game style (Stardew Valley / Pokemon
Mystery Dungeon vibe). School hallway corridor interior, viewed straight
down. Bold pixel-art outlines, limited color palette, flat colors with one
shadow tone, deliberate pixel grid crunchiness.

Layout (looking straight down):
- L-shaped hallway running from TOP-RIGHT corner (entry from library,
  around 1100, 200) curving down and left to BOTTOM-LEFT corner where the
  stairwell and elevator are located (around 200, 1100)
- Polished gray-beige tile floor with simple grout lines forming a 32px
  grid pattern (in pixel-art style)
- Walls on both sides off-white with occasional closed classroom doors
  (decorative, not interactive)
- TOP portion of the map (above y=300): subtle gray smoke pixel haze
  accumulating near the ceiling — light wispy effect, not heavy, just
  enough to suggest danger (using dithering or scattered gray pixels for
  the smoke effect, not smooth gradient)
- BOTTOM-LEFT corner: TWO entrances side by side
  - LEFT entrance (around 160, 1080): stairwell with green EXIT sign visible
  - RIGHT entrance (around 280, 1100): closed elevator door with small
    floor indicator
- Both entrances should have empty space in front so the game can place
  interactive icons on top later

Atmosphere: tense, slightly smoky, cold fluorescent feel. Cool grays and
beiges with scattered gray smoke pixel haze at the top.

NEGATIVE: 3D perspective, isometric view, photorealism, smooth gradients,
characters, people, text labels, UI elements, watermark. Aspect ratio
MUST be 1:1 square.
```

### `act1_playground` (운동장)

**파일**: `assets/raw/maps/act1_playground.png`
**크기**: 1280×1280

```
KAWAII PIXEL ART top-down bird's-eye-view 2D RPG map, 1280x1280 square
aspect ratio, retro 16-bit/32-bit game style (Stardew Valley vibe). School
outdoor playground/yard area, viewed straight down. Bold pixel-art outlines,
limited color palette, flat colors with one shadow tone, pixel grid
crunchiness.

Layout (looking straight down):
- TOP portion (y=0 to y=200): the school building edge visible at the very
  top with brick or concrete wall, with pixelated smoke rising from one of
  the windows on the upper-right side (subtle, dithered gray pixels) — the
  fire source
- MIDDLE portion (y=200 to y=800): open paved schoolyard, light gray
  asphalt/concrete with painted yellow basketball court lines in pixel
  art
- BOTTOM portion (y=800 to y=1280): grass field, fresh green, with a SAFE
  GATHERING AREA marked by a circular painted ring or arrangement of orange
  cones around coordinates (640, 1000) — this is where characters will
  gather, leave it empty
- A few cute pixel-art decorative elements: a flag pole near the school
  building top, simple stylized trees lining the bottom edges of the grass
  area, a small wooden bench

Atmosphere: outdoor daylight but slightly somber due to the smoke. Blue-gray
sky tone in the top corners, light gray asphalt, fresh green grass, warm
safety colors at the gathering point.

NEGATIVE: 3D perspective, isometric view, photorealism, smooth gradients,
characters, people, fire trucks, text labels, UI elements, watermark.
Aspect ratio MUST be 1:1 square.
```

---

## 이미지 생성 후 처리 명령어

선생님이 위 프롬프트로 이미지 생성 후 raw 폴더에 저장하면, Claude 가 다음 명령어로 가공.

`-- --mode atlas` 가 기본값. AI 가 3분할 정적 일러스트로 그렸다면 atlas 모드가 그대로 잘 작동.

```bash
# 6마리 동물 캐릭터 (모두 characters/ 폴더로)
npm run import:character puppy    assets/raw/characters/puppy.png    -- --name "멍이"
npm run import:character bunny    assets/raw/characters/bunny.png    -- --name "토끼"
npm run import:character fox      assets/raw/characters/fox.png      -- --name "여우"
npm run import:character kitten   assets/raw/characters/kitten.png   -- --name "나비"
npm run import:character bear     assets/raw/characters/bear.png     -- --name "곰돌이"
npm run import:character squirrel assets/raw/characters/squirrel.png -- --name "다람이"

# 아이템 4종
npm run import:item fire_alarm  assets/raw/items/fire_alarm.png  -- --name "화재경보기"  --size 48
npm run import:item door_safe   assets/raw/items/door_safe.png   -- --name "안전한 문"   --size 64
npm run import:item elevator    assets/raw/items/elevator.png    -- --name "엘리베이터" --size 96
npm run import:item stairs      assets/raw/items/stairs.png      -- --name "계단"       --size 96

# 맵 3종
npm run import:map act1_library    assets/raw/maps/act1_library.png
npm run import:map act1_corridor   assets/raw/maps/act1_corridor.png
npm run import:map act1_playground assets/raw/maps/act1_playground.png
```

> **import-item 의 --size 인자**: 화재경보기(세로형 48), 문(64), 엘베·계단(96)이 실제 크기. 32 기본값과 다르므로 명시적으로 줘야 함. 단 import-item.ts 는 정사각으로 리사이즈하므로 비례가 안 맞을 수 있음 — 필요시 ItemMaker UI 로 미세조정.

---

## 우선순위 / 권장 작업 순서

1. **맵 3종 먼저** — 가장 시각 임팩트 크고 spawn 좌표 확정에 필요
2. **학생 + 친구 5명** — 6장 한 번에 같은 톤으로 생성
3. **아이템 4종** — 가장 마지막. 작은 사이즈라 빠름

총 13장 이미지. AI 모델에 따라 한 번에 4-8장씩 배치 처리.
