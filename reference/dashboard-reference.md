# 레퍼런스 대시보드

## URL

https://chimerical-raindrop-848e69.netlify.app/

## 개요

Martinee Dashboard — Architect Edition.
현재 운영 중인 CRM 성과 대시보드로, 이번 React + Vite 버전 제작의 주요 레퍼런스.
Google Sheets 연동, 캠페인 성과 시각화 포함.

## 구성 요소

### 필터

- 기간 선택 (어제 / 7일 / 30일 / 전체 프리셋 + 날짜 범위)
- Variant Depth 1 다중선택
- OS 필터 (Android / iOS / Both / Web)

### KPI 카드 (1열)

- 푸시 수신 동의, DAU, MAU, Revenue 등
- 각 카드: WoW 변화율 + 호버 시 30일 미니차트

### 차트

- 콤보 차트: 발송·노출(막대) vs CTR·CVR(꺾은선)
- Top 5 캠페인 가로 막대 (CVR / Revenue / CTR 기준 정렬)
- 전환 퍼널: 제품 상세 → 카트 → 구매 완료 (3단계)
- 커스텀이벤트 일별 트렌드 라인 (체크박스 선택)

### 비교 테이블

DAU, MAU, Revenue, AOV, ARPU 등 주요 지표의 WoW / MoM / YoY 비교

### 캠페인 지표 (5열)

- Revenue & AOV 추이
- 발송당 Revenue & 예상 Reward 효율성

## 기술 스택 (기존)

- Chart.js (→ 새 버전에서는 Recharts로 전환)
- CSV 데이터 로드 (~400KB)
