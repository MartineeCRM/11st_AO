# SKILLS.md

이 프로젝트에서 Claude Code 작업 시 사용할 Skills 가이드.
새 작업을 시작하기 전에 아래 표를 확인하고 해당하는 skill을 먼저 호출한다.

---

## 작업 유형별 Skill 매핑

### 계획 수립

| 상황 | 사용 Skill |
| --- | --- |
| 새 열(Row) 또는 탭 추가 등 기능 추가/변경 스펙을 받았을 때 | `superpowers:brainstorming` |
| 구현 전 세부 실행 계획이 필요할 때 | `superpowers:writing-plans` |
| 독립적인 여러 태스크를 병렬 처리할 때 | `superpowers:dispatching-parallel-agents` |

### 구현

| 상황 | 사용 Skill |
| --- | --- |
| 새 대시보드 섹션/열 컴포넌트 구현 시 | `data:build-dashboard` |
| 새 차트 컴포넌트 설계 및 구현 시 | `data:data-visualization` |
| Google Sheets 데이터 집계 쿼리/로직 작성 시 | `data:write-query` |
| 기능 또는 버그픽스 구현 전 (TDD 흐름) | `superpowers:test-driven-development` |

### 코드 품질

| 상황 | 사용 Skill |
| --- | --- |
| 구현 완료 후 코드 정리 및 개선 | `simplify` |
| 주요 기능 완성 후 리뷰 요청 | `superpowers:requesting-code-review` |
| 완료 선언 전 검증 | `superpowers:verification-before-completion` |
| 코드리뷰 피드백을 받았을 때 | `superpowers:receiving-code-review` |

### 디버깅

| 상황 | 사용 Skill |
| --- | --- |
| 버그, 테스트 실패, 예상치 못한 동작 발생 시 | `superpowers:systematic-debugging` |

---

## 작업 순서 가이드

### 새 기능 추가 시

```text
brainstorming → writing-plans → (test-driven-development) → 구현 → simplify → verification-before-completion
```

### 버그 수정 시

```text
systematic-debugging → (test-driven-development) → 수정 → verification-before-completion
```

### 대규모 리팩토링 시

```text
brainstorming → writing-plans → dispatching-parallel-agents → simplify → requesting-code-review
```

---

## 이 프로젝트 특이사항

- **지표 계산 변경** 시 반드시 `lib/metrics.ts`의 순수 함수만 수정하고, 컴포넌트 단에서 직접 계산하지 않는다.
- **새 차트** 추가 시 `data:data-visualization` skill로 Recharts 컴포넌트 설계를 먼저 검토한다.
- **Google Sheets 연동** 관련 작업은 `lib/googleSheets.ts`와 `hooks/useSheetData.ts`만 수정한다.
- **고객사별 배포** 시 `.env` 파일만 교체하면 되도록 하드코딩을 피한다.

---

## 정답에 가까운 프로젝트 패턴

참고: Braze REST API 연동 패턴 기록은 이 브랜치에서 Braze 연동이 완전히 제거되면서 삭제했다 (Braze 관련 프록시/클라이언트 코드는 모두 존재하지 않음). 데이터 소스는 Google Sheets(`api/sheets.ts`, `src/lib/googleSheets.ts`) 단일 경로만 사용한다.

### Google Sheets 프록시

- 클라이언트는 스프레드시트 ID/API 키를 직접 다루지 않고 `/api/sheets`만 호출한다.
- 서버 전용 환경변수(`SPREADSHEET_ID`, `GOOGLE_SHEETS_API_KEY`)는 `VITE_` prefix 없이 `process.env`로만 읽는다.
- 프록시는 요청받은 `sheet` 쿼리 파라미터를 그대로 신뢰하지 않고, 허용된 시트 이름(`브레이즈 푸시 실적`)으로 allowlist 검증한다.

### Vercel 배포와 Git author

- 이 repo에서 Vercel 자동 배포용 커밋 author는 GitHub 계정 이메일로 맞춘다.

```bash
git config user.name "guney69"
git config user.email "gunhee@martinee.io"
```

- Vercel 로그인 계정은 `guneylee69@gmail.com`이어도, commit author email은 `gunhee@martinee.io`를 사용한다.
- 배포 오류가 나면 먼저 최신 커밋 author/committer를 확인한다.

```bash
git log -3 --format='%h %an <%ae> | committer: %cn <%ce> | %s'
```
