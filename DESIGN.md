# DESIGN.md

CRM 대시보드의 시각 디자인 시스템 레퍼런스.
새 컴포넌트를 만들거나 기존 UI를 수정할 때 이 문서의 토큰과 패턴을 따른다.

Apple 웹 디자인 언어를 기반으로 한다: 근접 불가능한 UI, 사진 중심, 단일 액센트 블루, 음수 letter-spacing.

---

## 색상 팔레트

### 브랜드 & 인터랙티브 (Apple 토큰 기반)

| 이름 | 값 | 토큰 | 용도 |
|------|-----|------|------|
| Action Blue | `#0066cc` | `{colors.primary}` | 단일 인터랙티브 액센트. 링크, 버튼, 활성 탭, 차트 Primary 라인 — 이 색 외 다른 액센트 없음 |
| Focus Blue | `#0071e3` | `{colors.primary-focus}` | 키보드 focus ring (`outline: 2px solid`) |
| Sky Link Blue | `#2997ff` | `{colors.primary-on-dark}` | 다크 타일 위 인라인 링크 (라이트 서피스에는 사용 금지) |
| Action Blue Tint | `#e8f0fb` | — | 선택된 배지 배경, 강조 배경 (Action Blue 계열 연색) |

### 서피스

| 이름 | 값 | 토큰 | 용도 |
|------|-----|------|------|
| Pure White | `#ffffff` | `{colors.canvas}` | 카드, 패널, 테이블 배경 |
| Parchment | `#f5f5f7` | `{colors.canvas-parchment}` | 페이지 `body` 배경, 교번 섹션 배경, 푸터 영역 |
| Pearl Button | `#fafafc` | `{colors.surface-pearl}` | 보조 버튼 fill (Parchment 대비 버튼임을 인식 가능하도록) |
| Near-Black Tile | `#272729` | `{colors.surface-tile-1}` | 다크 섹션, 네비게이션 바 배경 (현재 미사용 — 향후 다크 섹션 추가 시) |
| Pure Black | `#000000` | `{colors.surface-black}` | 전체 네비게이션 바 배경 (진정한 void) |

### 텍스트

| 이름 | 값 | 토큰 | 용도 |
|------|-----|------|------|
| Near-Black Ink | `#1d1d1f` | `{colors.ink}` | 제목, KPI 수치, 카드 헤더 |
| Body | `#1d1d1f` | `{colors.body}` | 본문 — Ink와 동일 hex, Apple은 라이트 서피스에 단일 near-black 사용 |
| Text Secondary | `#6B7280` | — | 라벨, 보조 설명 (기존 유지) |
| Text Muted | `#9CA3AF` | — | 힌트, WoW 단위, 축 레이블 (기존 유지) |
| Body On Dark | `#ffffff` | `{colors.body-on-dark}` | 다크 타일 위 모든 텍스트 |
| Body Muted On Dark | `#cccccc` | `{colors.body-muted}` | 다크 타일 위 보조 카피 |
| Ink Muted 48 | `#7a7a7a` | `{colors.ink-muted-48}` | 비활성 버튼 텍스트, 법적 fine-print |

### 경계선

| 이름 | 값 | 토큰 | 용도 |
|------|-----|------|------|
| Hairline | `#e0e0e0` | `{colors.hairline}` | 카드, 테이블, 입력 테두리 |
| Divider Soft | `rgba(0,0,0,0.04)` | `{colors.divider-soft}` | 보조 버튼 ring — 라인이 아닌 soft ring으로 기능 |
| Border Default | `#E5E7EB` | — | Hairline이 적용되지 않은 기존 컴포넌트 (점진 교체) |

### 시맨틱

| 이름 | 값 | 용도 |
|------|-----|------|
| Success | `#10B981` | WoW 상승 화살표, 긍정 배지 |
| Success BG | `#DCFCE7` / `#F0FDF4` | 긍정 배지 배경 |
| Success Dark | `#16A34A` | 배지 텍스트 |
| Danger | `#EF4444` | WoW 하락 화살표, 에러 텍스트 |
| Danger Light | `#FCA5A5` | 이상 감지 카드 테두리 |
| Warning | `#F59E0B` | 이상 감지 아이콘, 차트 보조 라인 |
| Warning BG | `#FFFBEB` | 경고 배지 배경 |
| Warning Dark | `#D97706` | 경고 텍스트 |

### 차트 전용

| 색상 | 값 | 용도 |
|------|-----|------|
| Primary Bar | `#93bbf0` | 발송량 bar, Revenue bar (Action Blue 계열 연색) |
| CTR Line | `#0066cc` | CTR 꺾은선 (Action Blue) |
| CVR Line | `#F59E0B` | CVR 꺾은선 |
| AOV Line | `#F59E0B` | AOV 꺾은선 |
| Rev/Send Bar | `#6EE7B7` | 발송당 Revenue bar |
| Reward Line | `#EC4899` | 예상 Reward 꺾은선 |
| Funnel Steps | `#0066cc → #0055aa → #004499 → #003377` | 퍼널 단계별 색상 (위→아래, Action Blue 계열) |
| Push Opt-in | `#0066cc` | 수신동의 카드 (Action Blue) |
| SMS Opt-in | `#10B981` | 수신동의 카드 |
| Kakao Opt-in | `#F59E0B` | 수신동의 카드 |

---

## 타이포그래피

**Apple SF Pro 스택:** `SF Pro Display, SF Pro Text, system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`

- 라이트 서피스 fallback: macOS/iOS/Safari에서 system-ui가 실제 SF Pro로 해석됨
- 크로스 플랫폼 fallback: Inter (Google Fonts) — 600 weight에서 SF Pro에 근사
- **표시 크기(17px↑)에 음수 letter-spacing 필수** — Apple 특유의 "tight" 헤드라인 감각

| 역할 | 토큰 | 크기 | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| 페이지 히어로 헤더 | `{typography.hero-display}` | 56px | 600 | 1.07 | -0.28px |
| 대형 섹션 제목 | `{typography.display-lg}` | 40px | 600 | 1.10 | 0 |
| 중형 섹션 제목 | `{typography.display-md}` | 34px | 600 | 1.47 | -0.374px |
| KPI 수치 — Primary | `{typography.kpi-primary}` | 30px | 700 | 1.0 | -0.374px |
| KPI 수치 — Secondary | `{typography.kpi-secondary}` | 24px | 700 | 1.0 | -0.374px |
| 강조 제목 (섹션 헤더) | `{typography.tagline}` | 21px | 600 | 1.19 | 0.231px |
| Body Strong (인라인 강조) | `{typography.body-strong}` | 17px | 600 | 1.24 | -0.374px |
| Body (기본 본문) | `{typography.body}` | 17px | 400 | 1.47 | -0.374px |
| 섹션 제목/라벨 | `{typography.caption-strong}` | 14px | 600 | 1.29 | -0.224px |
| 본문 라벨 | `{typography.caption}` | 14px | 400 | 1.43 | -0.224px |
| 보조 라벨 | `{typography.fine-print}` | 12px | 400 | 1.0 | -0.12px |
| 미니 레이블 | — | 11px | 400 | — | — |
| 최소 레이블 (WoW 단위) | — | 10px | 400 | — | — |
| Nav 링크 | `{typography.nav-link}` | 12px | 400 | 1.0 | -0.12px |

**원칙:**
- Weight ladder: **300 / 400 / 600 / 700** — 500은 의도적으로 없음
- 본문은 16px이 아닌 **17px** (데이터 대시보드에선 14px 캡션이 지배적이지만, 설명문/툴팁은 17px 유지)
- 헤드라인은 600, bold 강조는 700, 본문은 400
- 표시 크기에 항상 음수 letter-spacing 적용

---

## 간격 & 레이아웃

### 스페이싱 토큰 (Apple 기반)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `{spacing.xxs}` | 4px | 아이콘-텍스트 gap |
| `{spacing.xs}` | 8px | 버튼 내 tight spacing |
| `{spacing.sm}` | 12px | 배지 내부 패딩 |
| `{spacing.md}` | 17px | body line-height multiplier |
| `{spacing.lg}` | 24px | 카드 내부 패딩 |
| `{spacing.xl}` | 32px | 카드 간격, 섹션 헤더 마진 |
| `{spacing.xxl}` | 48px | 섹션 간격 |

### 페이지 레이아웃
- 좌우 패딩: `px-6` (24px)
- 행 간격: `gap-4` (16px) — Row 사이
- 카드 간격: `gap-3` (12px) — KPI 카드 사이
- 섹션 패딩: `py-4` (16px 상하)

### 카드
- 기본 패딩: `p-4` (16px)
- Primary KPI 카드 패딩: `p-5` (20px)
- 차트 카드 패딩: `p-5` (20px)
- 모서리: `rounded-xl` (18px — Apple `{rounded.lg}`)
- 테두리: `border border-[#e0e0e0]` (Apple Hairline)
- 호버 그림자: `shadow-md`
- **카드/버튼/텍스트에 drop-shadow 사용 금지** — 그림자는 제품 이미지에만

### KPI 카드 비율
- Primary (수신동의, Revenue): `flex-[1.6]`
- Secondary (나머지 5개): `flex-1`

---

## 엘리베이션 & 깊이

| 레벨 | 처리 | 용도 |
|------|------|------|
| Flat | 그림자 없음, 테두리 없음 | 페이지 배경 섹션 |
| Soft hairline | `1px rgba(0,0,0,0.08)` 보더 | 카드, 유틸리티 입력 |
| Backdrop blur | `backdrop-filter: blur(20px) saturate(180%)` on Parchment 80% | 고정 상단 바, 필터 바 |
| Product shadow | `rgba(0,0,0,0.22) 3px 5px 30px 0` | 제품 이미지/아이콘에만 — 시스템 전체에 이 그림자 하나만 |

**그림자 원칙:** Apple은 단 하나의 drop-shadow만 사용하며, 그것은 제품 이미지에만 적용된다. UI 위계는 (a) 서피스 색상 변화와 (b) sticky 바의 backdrop-blur로 표현한다.

---

## 형태 & Border Radius

| 토큰 | 값 | 용도 |
|------|-----|------|
| `{rounded.none}` | 0px | 전체 너비 타일 (모서리 없음) |
| `{rounded.sm}` | 8px | 다크 유틸리티 버튼, 작은 배지 |
| `{rounded.md}` | 11px | Pearl 버튼 캡슐 |
| `{rounded.lg}` | 18px | 카드, 그리드 카드 (기존 `rounded-xl` 12px → 18px) |
| `{rounded.pill}` | 9999px | Primary 블루 pill CTA, 검색 입력, 필터 배지 — Apple 시그니처 pill |
| `{rounded.full}` | 50% | 원형 컨트롤 칩 |

---

## 컴포넌트 패턴

### 상단 네비게이션 바
- 배경: `{colors.surface-black}` (#000000) — 진정한 블랙
- 높이: 44px
- 텍스트: `{colors.body-on-dark}` + `{typography.nav-link}` (12px / 400 / -0.12px)

### 필터 바 (Sub-nav)
- 배경: `{colors.canvas-parchment}` (#f5f5f7) 80% opacity + `backdrop-filter: blur(20px) saturate(180%)`
- 높이: 52px
- Preset 배지 활성: `bg-[#e8f0fb] text-[#0066cc] font-semibold` + `{rounded.pill}`
- Preset 배지 비활성: `bg-[#F3F4F6] text-[#1d1d1f]` + `{rounded.pill}`
- **배지 형태는 반드시 pill (`rounded-full`) — Apple 액션 시그널**

### 버튼

**Primary (`button-primary`)** — Action Blue pill
- 배경: `#0066cc`, 텍스트: white
- `rounded-full` (pill), padding: `11px × 22px`
- Active: `transform: scale(0.95)`
- Focus: `outline: 2px solid #0071e3`

**Secondary pill (`button-secondary-pill`)**
- 배경: transparent, 텍스트: `#0066cc`, 테두리: `1px solid #0066cc`
- `rounded-full`, padding: `11px × 22px`

**Utility (`button-dark-utility`)**
- 배경: `#1d1d1f`, 텍스트: white
- `rounded-[8px]`, padding: `8px × 15px`

**Pearl capsule (`button-pearl-capsule`)**
- 배경: `#fafafc`, 텍스트: `#333333`, 테두리: `3px solid rgba(0,0,0,0.04)`
- `rounded-[11px]`, padding: `8px × 14px`

### KPI 카드 (`KpiCard`)
```
┌─────────────────────────────┐
│ 라벨           ⚠️ 아이콘     │  ← caption (14px/400/-0.224px) + #6B7280
│                             │
│ 123,456                     │  ← kpi-primary (30px/700/-0.374px) + #1d1d1f
│                             │
│ ↑ 5.2%  vs 지난주           │  ← WowBadge + fine-print (12px/400/-0.12px)
│ ↓ 1.1%  vs 전월             │
└─────────────────────────────┘
```
- 카드 모서리: `rounded-[18px]` (Apple `{rounded.lg}`)
- 테두리: `border border-[#e0e0e0]` (Apple Hairline)
- 호버 시 `shadow-md` + 우상단에 14일 추이 미니차트 팝업

### 차트 Empty State (`EmptyChartState`)
- 데이터 0건 시 `BarChart2` 아이콘(30% opacity) + 안내 문구
- 높이: `min-h-[120px]`, 중앙 정렬

### 로딩 스켈레톤 (`SkeletonCard`)
- `animate-pulse rounded-[18px] border border-[#e0e0e0] bg-[#F3F4F6]`

### WoW 배지 (`WowBadge`)
- 상승: `TrendingUp` + `text-[#10B981]`
- 하락: `TrendingDown` + `text-[#EF4444]`
- 보합: `Minus` + `text-[#9CA3AF]`
- 텍스트: `text-[11px] font-medium`

### 에러 상태 (페이지 레벨)
```tsx
<div className="flex flex-col items-center justify-center py-24 gap-3">
  <p className="text-sm font-semibold text-[#EF4444]">데이터 로드 실패</p>
  <p className="text-xs text-[#6B7280]">{error}</p>
</div>
```

---

## 이상 감지 임계값

`src/lib/anomalyThresholds.ts`에서 관리. WoW 변동이 임계값 이상이면 KPI 카드에 ⚠️ 표시.

| 지표 | 임계값 |
|------|--------|
| push_opt_in | ±5% |
| mau | ±10% |
| dau | ±20% |
| revenue, sentImpression, ctr, msgPerUser | ±30% |

---

## 아이콘 라이브러리

Lucide React. `src/components/cards/KpiCard.tsx`의 `ICON_MAP`에서 KPI 카드 아이콘을 등록 관리.

| 아이콘 키 | Lucide 컴포넌트 | 용도 |
|-----------|----------------|------|
| `bell` | `Bell` | 푸시 수신동의 |
| `bell-ring` | `BellRing` | 수신동의 카드 |
| `circle-dollar-sign` | `CircleDollarSign` | Revenue |
| `users` | `Users` | DAU / MAU |
| `send` | `Send` | 발송/노출 |
| `mouse-pointer-click` | `MousePointerClick` | CTR |
| `message-square` | `MessageSquare` | 유저당 메시지 수 |

---

## Do's and Don'ts (Apple 원칙 적용)

### Do
- `#0066cc` (Action Blue)를 모든 인터랙티브 요소에 — 링크, pill CTA, focus 시그널 — 이 색 외 다른 액센트 없음
- 버튼 pill 형태(`rounded-full`)는 "클릭 가능"의 브랜드 시그널 — Primary CTA, 필터 배지에 사용
- 카드 모서리는 `rounded-[18px]` (Apple `{rounded.lg}`) — 기존 `rounded-xl` (12px)에서 교체
- 본문 텍스트는 `#1d1d1f` (Near-Black Ink) — 순수 #000000 대신
- 버튼 active 상태는 `transform: scale(0.95)` — 시스템 전체 통일 micro-interaction
- 페이지 배경은 `#f5f5f7` (Apple Parchment)

### Don't
- 두 번째 액센트 색상 추가 금지 — 모든 "클릭 가능" 시그널은 Action Blue 하나
- 카드/버튼/텍스트에 drop-shadow 금지 — 그림자는 제품 이미지에만
- 장식 그라디언트 배경 금지 — 분위기는 데이터 시각화 자체로
- Body copy에 weight 500 사용 금지 — ladder는 300/400/600/700
- 라이트 서피스에 Sky Link Blue (`#2997ff`) 사용 금지 — 다크 타일 전용

---

## 디자인 원칙 (Apple 철학 + 데이터 대시보드 적용)

1. **위계 우선** — 같은 크기의 카드/버튼을 7개 나열하지 않는다. Primary 지표는 더 크게, 보조 지표는 작게.
2. **데이터 밀도** — K/M/B 축약 없이 실제 숫자 표기. 공간이 부족하면 카드를 줄이되 숫자는 자르지 않는다.
3. **상태 완성도** — 로딩(skeleton), 에러(red text), 빈 결과(EmptyChartState) 세 가지를 모두 처리한다.
4. **애니메이션 최소화** — `transition-shadow`, `animate-pulse`, `transform: scale(0.95)` 외 애니메이션 추가 금지. 정보 밀도 우선.
5. **단일 액센트** — 팔레트에 없는 인터랙티브 색은 `#0066cc` 하나로 수렴. 새 색상 추가 시 이 문서를 먼저 업데이트한다.
6. **그림자 철학** — UI 위계는 서피스 색상 변화로 표현. Drop-shadow는 제품/아이콘 이미지에만.
7. **스캔 우선 설계** — 사용자는 읽지 않고 스캔한다. 시각 위계(중요도 = 노출도)와 명확한 영역 구분으로 설계.
