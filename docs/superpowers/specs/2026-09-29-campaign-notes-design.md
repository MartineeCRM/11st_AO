# 캠페인별 메모 — Design Spec

**Date:** 2026-09-29
**Status:** Draft

---

## Problem

AO 탭에서 캠페인 데이터를 보다가 "이 캠페인은 격주 발송이라 하락이 정상" 같은 특이사항을 남길 곳이 없다. 지금 캠페인 관련 상태(모니터링 대상 체크 등)는 전부 `localStorage`에만 저장되는데, 메모는 같은 스프레드시트(=같은 고객사)를 보는 팀원 전체가 봐야 해서 브라우저 로컬 저장으로는 안 된다.

## Solution

캠페인별 자유 텍스트 메모 1개를 스프레드시트ID 단위로 공유 저장(Upstash Redis)하고, AO 탭 캠페인별 추이 섹션에 항상 보이는 텍스트 박스로 노출한다.

> **참고**: "Vercel KV"는 2024년 12월에 단종되어 Upstash로 흡수됐다. Vercel 마켓플레이스로 붙이면 Upstash와 같은 서비스지만 커맨드당 비용이 2배라, 여기서는 Upstash를 직접 가입해서 쓰는 경로를 택한다 (무료 티어: 256MB + 월 500K 커맨드).

---

## 데이터 모델

Upstash Redis에 스프레드시트ID당 해시(hash) 1개.

- 키: `notes:{spreadsheetId}`
- 필드: 캠페인명
- 값: 메모 텍스트 (string)

`spreadsheetId`가 비어 있으면(설정 탭에서 사용자가 연결 안 하고 서버 기본 연결을 쓰는 경우) `'default'`를 키로 사용한다 — `api/sheets.ts`가 이미 같은 방식으로 "설정 없으면 서버 기본값" 폴백을 쓰고 있어서 그 규칙을 그대로 재사용한다.

해시를 쓰는 이유: 캠페인 하나 저장할 때 그 필드 하나만 `HSET`으로 덮어쓰므로, 두 사람이 동시에 서로 다른 캠페인 메모를 저장해도 충돌 없이 독립적으로 반영된다.

메모 개수는 캠페인당 최대 1개(덮어쓰는 방식). 날짜별 로그, 작성자 기록, 수정 이력은 범위 밖.

---

## 백엔드

`api/sheets.ts`와 같은 패턴으로 `api/campaign-notes.ts`를 새로 추가한다 (Vercel 서버리스 함수, `@upstash/redis` 사용).

| Method | Path | Body/Query | 설명 |
|---|---|---|---|
| GET | `/api/campaign-notes` | `?spreadsheetId=X` | 그 스프레드시트의 캠페인별 메모 전체를 `{ [campaign]: string }`로 반환 |
| PUT | `/api/campaign-notes` | `{ spreadsheetId, campaign, note }` | 캠페인 하나의 메모만 저장(HSET) |

인증/권한 체크 없음 — 기존 `api/sheets.ts`와 동일하게 "링크를 가진 사람은 누구나" 모델을 따른다. spreadsheetId는 클라이언트가 보내는 값을 그대로 신뢰한다(이미 시트 읽기에서도 같은 신뢰 모델).

### 사전 설정 (배포자가 직접 해야 함)

[upstash.com](https://upstash.com)에서 무료 계정 생성 → Redis 데이터베이스 생성 → REST API 섹션에서 `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` 값을 확인해 Vercel 프로젝트 환경변수에 등록한다. 이건 계정 가입이 필요한 수동 작업이라 코드로 대신할 수 없다. 로컬 개발 시에도 같은 환경변수를 `.env`에 넣어야 메모 기능이 동작한다 (없으면 아래 에러 처리대로 조용히 비활성화).

---

## 프론트엔드

### 새 훅 `useCampaignNotesState(spreadsheetId: string)`

`hooks/useCampaignNotesState.ts`, `useSheetData`와 같은 자리.

- `spreadsheetId`가 바뀔 때(설정 탭에서 연결 변경 시) `GET /api/campaign-notes`로 전체 메모를 로드해 `{ [campaign]: string }` 상태로 보관
- `saveNote(campaign, note)`:
  1. 로컬 상태를 먼저 업데이트 (입력 내용 즉시 반영)
  2. 백그라운드로 `PUT` 전송
  3. 실패 시 저장 실패 상태만 표시, 입력했던 텍스트는 유지 (타이핑한 내용이 날아가지 않게)

### UI

`CRMAlwaysOn.tsx`의 "캠페인별 추이" 섹션 헤더(현재 캠페인명이 표시되는 자리) 바로 아래에 텍스트 박스 추가.

- `value={notes[selectedCampaign] ?? ''}`
- `onBlur`에서 `saveNote(selectedCampaign, value)` 호출 — 타이핑마다 저장하지 않고 포커스 이탈 시에만 (불필요한 쓰기 요청 최소화)
- placeholder: "이 캠페인 특이사항 메모..."
- 박스 옆에 저장 상태를 작은 텍스트로 표시: 저장 중 없음(즉시 로컬 반영이라 딜레이 체감 안 됨) / 저장됨(회색) / 저장 실패, 다시 시도(빨간색)

---

## 에러 처리

- **메모 로드 실패** (Upstash 미연결, 네트워크 오류 등): AO 탭 전체를 막지 않는다. 메모 영역만 빈 텍스트박스로 두고 조용히 넘어간다 — 메모는 부가 기능이라 탭 전체를 깨뜨리면 안 된다는 원칙 (`sheetData`의 필수 에러 처리와 다름).
- **저장 실패**: 인라인으로 "저장 실패, 다시 시도" 표시. 콘솔에 원인 로그.
- **Upstash 미설정 환경** (로컬 개발 등에서 환경변수 없음): GET은 빈 객체 반환, PUT은 명확한 에러 반환 → 프론트는 위 "저장 실패" 상태로 자연스럽게 처리됨. 별도 분기 불필요.

---

## 테스트

이 프로젝트는 자동화 테스트가 없다(`package.json`에 `test` 스크립트 없음, `lint`/`type-check`만 있음). 기존 관례를 따라 자동 테스트는 추가하지 않고, `type-check` + 브라우저 수동 확인으로 검증한다.

수동 확인 체크리스트:
1. 캠페인 A 메모 작성 → 포커스 아웃 → "저장됨" 표시 → 새로고침해도 유지
2. 다른 캠페인으로 전환 → 메모 박스가 그 캠페인 메모로 바뀜(또는 빈 상태)
3. Upstash 환경변수 없이 로컬 실행 → 메모 저장 시도 → "저장 실패" 표시되고 AO 탭 나머지 기능은 정상 동작
4. 설정 탭에서 스프레드시트 연결 바꾸기 → 메모 목록이 새 스프레드시트 것으로 다시 로드됨

---

## Out of Scope

- 메모 작성자/수정 시각 기록
- 메모 수정 이력(로그)
- 메모 검색/전체 목록 보기
- 스프레드시트 간 메모 공유 (의도적으로 스프레드시트별로 격리)
