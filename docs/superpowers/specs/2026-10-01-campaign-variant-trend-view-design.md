# 캠페인별 추이 — 캠페인/베리언트 단위 분리 — Design Spec

**Date:** 2026-10-01
**Status:** Draft

---

## Problem

AO 탭의 "캠페인별 추이" 섹션은 지금 `캠페인명_분할 · 배리언트명_분할`을 합친 문자열(`aoCampaignKey`) 하나를 기준으로 동작한다. 그래서 베리언트별로만 볼 수 있고, 여러 베리언트를 합쳐서 "캠페인 전체" 실적을 보는 방법이 없다(예: "검색 상품 구매 유도-ver2" 캠페인 안에 "검색어 재랜딩" / "연관검색어 랜딩" / "온라인최저가 랜딩" 베리언트가 있을 때, 이 셋을 합친 추이를 볼 수 없음).

## Solution

"캠페인별 추이" 섹션에 드롭다운을 하나 더 추가해서, **캠페인**과 **베리언트**를 따로 고를 수 있게 한다 — Braze Canvas 자체의 "Canvas name + Canvas step" UI 패턴과 동일한 구조(사용자에게 이미 익숙함).

- 드롭다운 1 "캠페인": `캠페인명_분할` 목록
- 드롭다운 2 "베리언트": 드롭다운 1에서 고른 캠페인에 속한 `배리언트명_분할` 목록 + 맨 위 고정된 **"전체"** 옵션(기본값)

"전체" 선택 시 그 캠페인의 모든 베리언트를 합산한 추이, 특정 베리언트 선택 시 그 베리언트만(기존과 동일한 동작).

**적용 범위**: AO 탭의 "캠페인별 추이" 섹션(상단 차트/테이블)에만 적용한다. 월별 실적표, 주의 필요 알림 배너는 지금처럼 베리언트 단위 그대로 둔다(범위 밖).

---

## 선택 상태 모델

`CRMAlwaysOn.tsx`에서 선택 상태를 문자열 하나(`selectedCampaign`) 대신 아래 형태로 관리한다:

```ts
interface AoCampaignSelection {
  campaign: string        // 캠페인명_분할
  variant: string | null  // 배리언트명_분할, null = "전체"
}
```

- 캠페인(드롭다운 1)을 바꾸면 베리언트(드롭다운 2)는 항상 `null`("전체")로 리셋된다.
- 캠페인 목록 로드 후 기본값: 지금과 같은 "모니터링 대상 우선, 그다음 가나다순 첫 캠페인" 규칙을 캠페인 단위로 적용(아래 참고). 베리언트는 항상 `null`로 시작.

---

## 데이터 집계 (`lib/metrics.ts`)

새로 추가:
- `listAoCampaignGroups(rows: AoPushRow[]): string[]` — `캠페인명_분할` 고유값, 가나다순. 드롭다운 1의 옵션 목록.
- `listAoCampaignVariants(rows: AoPushRow[], campaign: string): string[]` — 주어진 캠페인에 속한 `배리언트명_분할` 고유값(빈 문자열 제외), 가나다순. 드롭다운 2의 옵션 목록("전체"는 컴포넌트 쪽에서 맨 앞에 추가하며 이 목록에는 포함 안 함).

기존 함수 시그니처 변경 (`CRMAlwaysOn.tsx`에서만 호출되므로 다른 곳에 영향 없음, 콜러 쪽도 같이 수정):
- `buildAoCampaignTrend(rows, selection: AoCampaignSelection, granularity)`: `selection.variant`가 있으면 `campaignSplit === selection.campaign && variantSplit === selection.variant`, 없으면(전체) `campaignSplit === selection.campaign`인 행만 합산.
- `buildAoCampaignDailyRows(rows, selection: AoCampaignSelection)`: 동일한 매칭 규칙.

---

## UI (`CRMAlwaysOn.tsx`)

기존 단일 `CampaignSelectFilter`(`label="캠페인"`) 자리에 두 개를 나란히 배치:

```tsx
<CampaignSelectFilter
  label="캠페인"
  options={sortedCampaignGroupOptions}
  selected={selection.campaign}
  onChange={campaign => setSelection({ campaign, variant: null })}
  monitoredCampaigns={monitoredCampaignGroups}
/>
<CampaignSelectFilter
  label="베리언트"
  options={['전체', ...variantOptions]}
  selected={selection.variant ?? '전체'}
  onChange={v => setSelection(prev => ({ ...prev, variant: v === '전체' ? null : v }))}
  monitoredCampaigns={monitoredCampaigns}
/>
```

새 컴포넌트는 만들지 않는다 — 기존 `CampaignSelectFilter`를 옵션 목록만 다르게 줘서 두 번 재사용한다.

- **드롭다운 1 정렬**: "이 캠페인에 모니터링 대상 베리언트가 하나라도 있으면" 최상단 우선(기존 원칙의 캠페인 단위 확장). 이를 위한 `monitoredCampaignGroups`는 `monitoredCampaigns`(베리언트 단위, 기존)를 `캠페인명_분할`만 추출해 만든 파생 Set.
- **드롭다운 2 정렬**: "전체"는 항상 맨 위 고정. 그 아래는 기존처럼 모니터링 대상 베리언트 우선 + 가나다순(`monitoredCampaigns`를 그대로 재사용 — 정확히 그 베리언트 문자열이 모니터링 대상일 때만 별 표시).
- **표시 라벨**(차트 제목, 일별 테이블 헤더에 쓰는 문자열): `selection.variant`가 없으면 `"{campaign} (전체)"`, 있으면 기존과 동일한 `"{campaign} · {variant}"`.

---

## 메모 연동

메모는 **항상 캠페인(드롭다운 1) 기준**으로만 저장/조회한다 — 베리언트 선택과 무관. 즉 `useCampaignNotesState`/메모 텍스트박스가 바라보는 키를 기존 `selectedCampaign`(베리언트 포함 문자열) 대신 `selection.campaign`(캠페인명만)으로 바꾼다. 같은 캠페인이면 베리언트를 "전체"에서 특정 베리언트로 바꿔도 같은 메모가 그대로 보인다.

이 변경은 `CRMAlwaysOn.tsx`에서 메모 관련 `useEffect`/`onBlur` 핸들러가 참조하는 변수를 `selectedCampaign` → `selection.campaign`으로 바꾸는 것뿐이라, 백엔드(`api/campaign-notes.ts`)나 훅(`useCampaignNotesState`) 쪽은 전혀 건드리지 않는다.

---

## 엣지 케이스

- **베리언트가 하나도 없는 캠페인** (모든 행의 `배리언트명_분할`이 빈 문자열): 드롭다운 2는 "전체" 하나만 보임. "전체" 선택 시 그 캠페인의 전체 행(=베리언트 구분 없는 행들) 합산 — 기존과 동일한 결과.
- **베리언트가 1개뿐인 캠페인**: 드롭다운 2에 "전체" + 그 베리언트 1개, 총 2개 옵션. 두 옵션 다 같은 데이터를 보여주지만(합이 1개짜리라 전체=그 베리언트), 굳이 숨기지 않는다 — 단순함 유지.
- **캠페인 전환 시 베리언트 리셋**: 위에서 설명한 대로 항상 "전체"로 리셋.

---

## 테스트

자동화 테스트 없음(기존 관례). `type-check` + 브라우저 수동 확인:
1. 베리언트가 여러 개인 캠페인 선택 → "전체" 상태에서 추이 차트/일별 테이블 숫자가 그 캠페인 전체 행의 합산과 일치하는지 확인
2. 베리언트 드롭다운에서 특정 베리언트 선택 → 그 베리언트 행만 반영되는지 확인(기존 동작과 동일한 결과가 나와야 함)
3. "전체"와 특정 베리언트를 오가도 메모 내용이 안 바뀌는지(캠페인 단위로 고정) 확인
4. 다른 캠페인으로 전환 → 베리언트 드롭다운이 "전체"로 리셋되고, 메모도 그 새 캠페인 것으로 바뀌는지 확인
5. 모니터링 대상 캠페인이 드롭다운 1/2 양쪽에서 각각 올바르게 최상단 정렬되는지 확인

---

## Out of Scope

- 월별 실적표, 주의 필요 알림 — 베리언트 단위 그대로 (요청 범위 밖)
- 베리언트별 메모 (캠페인 단위 메모만 지원하기로 확정)
- 드롭다운 2의 "전체" 외 베리언트가 하나뿐일 때 UI 단순화(숨김 처리 등)
