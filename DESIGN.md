# DESIGN.md

CRM 대시보드의 시각 디자인 시스템 레퍼런스.
새 컴포넌트를 만들거나 기존 UI를 수정할 때 이 문서의 토큰과 패턴을 따른다.

---

## 색상 팔레트

### 브랜드 & 인터랙티브

| 이름 | 값 | 용도 |
|------|-----|------|
| Brand Blue | `#4361EE` | 주요 강조색, 활성 탭, 차트 Primary 라인, 호버 미니차트 |
| Brand Blue Light | `#EEF2FF` / `#EEF1FF` | 선택된 배지 배경, 강조 배경 |
| Brand Indigo Dim | `#A5B4FC` | 차트 Bar (Revenue) |
| Indigo Pale | `#C7D2FE` / `#E0E7FF` | 테이블 헤더 tint, hover tint |

### 텍스트

| 이름 | 값 | 용도 |
|------|-----|------|
| Text Primary | `#111827` | 제목, 카드 수치 |
| Text Body | `#374151` | 본문, 드롭다운 항목 |
| Text Secondary | `#6B7280` | 라벨, 보조 설명 |
| Text Muted | `#9CA3AF` | 힌트, WoW 단위("vs 지난주"), 축 레이블 |
| Text Subtle | `#64748B` / `#475569` | 서브헤더, 메타데이터 |
| Text Dark | `#0F172A` | 강조 헤더 (ConversionFunnel 제목) |

### 배경 & 경계선

| 이름 | 값 | 용도 |
|------|-----|------|
| Page BG | `#F4F5F7` | `body` 배경 |
| Card BG | `#FFFFFF` | 카드, 패널 배경 |
| Surface 1 | `#F9FAFB` | 드롭다운 hover, 테이블 행 hover |
| Surface 2 | `#F3F4F6` | 스켈레톤 배경, 비활성 배지 |
| Surface 3 | `#F1F5F9` | 테이블 헤더 |
| Border Default | `#E5E7EB` | 카드, 테이블, 입력 테두리 |
| Border Muted | `#E2E8F0` | 연한 구분선 |

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
| Sent/Impression Bar | `#A5B4FC` | 발송량 bar |
| CTR Line | `#4361EE` | CTR 꺾은선 |
| CVR Line | `#F59E0B` | CVR 꺾은선 |
| Revenue Bar | `#A5B4FC` | Revenue bar |
| AOV Line | `#F59E0B` | AOV 꺾은선 |
| Rev/Send Bar | `#6EE7B7` | 발송당 Revenue bar |
| Reward Line | `#EC4899` | 예상 Reward 꺾은선 |
| Funnel Steps | `#0066FF → #0055DD → #0044BB → #00484F` | 퍼널 단계별 색상 (위→아래) |
| Push Opt-in | `#4361EE` | 수신동의 카드 |
| SMS Opt-in | `#10B981` | 수신동의 카드 |
| Kakao Opt-in | `#F59E0B` | 수신동의 카드 |

---

## 타이포그래피

시스템 폰트 스택: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif`

| 역할 | 클래스 | 크기 |
|------|--------|------|
| 섹션 제목 | `text-sm font-semibold` | 14px |
| 강조 제목 (퍼널) | `text-xl font-bold` | 20px |
| KPI 수치 — Primary | `text-3xl font-bold leading-none` | 30px |
| KPI 수치 — Secondary | `text-2xl font-bold leading-none` | 24px |
| 퍼널 수치 | `text-2xl font-extrabold` | 24px |
| 본문/라벨 | `text-sm` | 14px |
| 보조 라벨 | `text-xs` | 12px |
| 미니 레이블 | `text-[11px]` | 11px |
| 최소 레이블 (WoW 단위) | `text-[10px]` | 10px |

---

## 간격 & 레이아웃

### 페이지 레이아웃
- 좌우 패딩: `px-6` (24px)
- 행 간격: `gap-4` (16px) — Row 사이
- 카드 간격: `gap-3` (12px) — KPI 카드 사이
- 섹션 패딩: `py-4` (16px 상하)

### 카드
- 기본 패딩: `p-4` (16px)
- Primary KPI 카드 패딩: `p-5` (20px)
- 차트 카드 패딩: `p-5` (20px)
- 모서리: `rounded-xl` (12px)
- 테두리: `border border-[#E5E7EB]`
- 호버 그림자: `shadow-md`

### KPI 카드 비율
- Primary (수신동의, Revenue): `flex-[1.6]`
- Secondary (나머지 5개): `flex-1`

---

## 컴포넌트 패턴

### KPI 카드 (`KpiCard`)
```
┌─────────────────────────────┐
│ 라벨         ⚠️ 아이콘        │  ← text-xs/sm + text-[#6B7280]
│                             │
│ 123,456                     │  ← text-2xl/3xl bold + text-[#111827]
│                             │
│ ↑ 5.2%  vs 지난주           │  ← WowBadge + text-[10px] muted
│ ↓ 1.1%  vs 전월             │
└─────────────────────────────┘
```
- 호버 시 `shadow-md` + 우상단에 14일 추이 미니차트 팝업
- 이상 감지 시 `border-[#FCA5A5]` + ⚠️ 아이콘

### 차트 Empty State (`EmptyChartState`)
- 데이터 0건 시 `BarChart2` 아이콘(30% opacity) + 안내 문구
- 높이: `min-h-[120px]`, 중앙 정렬

### 로딩 스켈레톤 (`SkeletonCard`)
- `animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F3F4F6]`
- Row별 flex 비율 유지 (Row1: 7개 `flex-1 h-24`)

### WoW 배지 (`WowBadge`)
- 상승: `TrendingUp` + `text-[#10B981]`
- 하락: `TrendingDown` + `text-[#EF4444]`
- 보합: `Minus` + `text-[#9CA3AF]`
- 텍스트: `text-[11px] font-medium`

### 필터 바
- 배경: `bg-white border-b border-[#E5E7EB]`
- Preset 배지 활성: `bg-[#EEF2FF] text-[#4361EE] font-semibold`
- Preset 배지 비활성: `bg-[#F3F4F6] text-[#374151]`

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

## 디자인 원칙

1. **위계 우선** — 같은 크기의 카드/버튼을 7개 나열하지 않는다. Primary 지표는 더 크게, 보조 지표는 작게.
2. **데이터 밀도** — K/M/B 축약 없이 실제 숫자 표기. 공간이 부족하면 카드를 줄이되 숫자는 자르지 않는다.
3. **상태 완성도** — 로딩(skeleton), 에러(red text), 빈 결과(EmptyChartState) 세 가지를 모두 처리한다.
4. **애니메이션 최소화** — `transition-shadow`, `animate-pulse` 외 애니메이션 추가 금지. 정보 밀도 우선.
5. **색상 추가 자제** — 팔레트에 없는 색은 위 표에서 가장 가까운 것을 쓴다. 새 색상 추가 시 이 문서를 먼저 업데이트한다.
