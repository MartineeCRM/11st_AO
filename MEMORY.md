# MEMORY.md

프로젝트 작업 중 반복하면 안 되는 시행착오와 원인 기록.

참고: Braze REST API 연동 관련 시행착오 기록은 이 브랜치에서 Braze 연동 자체가 완전히 제거되면서 더 이상 유효하지 않아 삭제했다 (Braze 관련 프록시/클라이언트 코드는 모두 이 저장소에 존재하지 않는다). 데이터 소스는 현재 Google Sheets(`api/sheets.ts`)만 사용한다.

---

## Vercel 배포 시행착오

### Vercel private repo 배포와 커밋 이메일

- 증상 1: `Deployment Blocked` 및 commit author가 Vercel 프로젝트 contributing access가 없다는 오류.
- 증상 2: commit email `guneylee69@gmail.com` could not be matched to a GitHub account.
- 원인: GitHub 계정 이메일과 커밋 author 이메일 매칭이 중요하다. 이 repo에서는 GitHub 계정 이메일 `gunhee@martinee.io`로 커밋되어야 Vercel Git 연동이 정상 처리된다.
- 재발 방지: 이 repo의 로컬 Git 설정은 아래로 유지한다.

```bash
git config user.name "guney69"
git config user.email "gunhee@martinee.io"
```

Vercel 로그인 계정은 `guneylee69@gmail.com`이어도, Git commit author는 GitHub 계정 이메일 `gunhee@martinee.io`를 사용한다.

