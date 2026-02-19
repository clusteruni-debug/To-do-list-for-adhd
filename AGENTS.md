# Navigator (todolist) — AGENTS.md

> 글로벌 규칙: `~/.codex/instructions.md` 참조

## 개요
- **스택**: HTML + Vanilla JS + Firebase (Auth/Firestore)
- **배포**: GitHub Pages (Actions 자동빌드)
- **DB**: Firebase + localStorage 이중 저장

## 디렉토리 구조
- `navigator-v5.html` — 메인 단일 파일
- `sw.js` — PWA 서비스 워커

## 주의사항
- localStorage + Firebase 이중 저장 구조 유지
- XSS 전수 방어 적용됨
- telegram-event-bot과 연동 (이벤트 데이터)

## Git 작업 권한 (공통, override 불가)
- **Codex는 `git commit` / `git push`를 절대 실행하지 않는다.**
- Codex는 코드 수정 + 빌드 검증까지만 수행하고, 완료 시 변경 파일 + 검증 결과를 보고한다.
- 모든 commit/push는 Claude Code(또는 사용자)가 통합 처리한다.

## 멀티플랫폼 실행 컨텍스트 (공통)
- 이 프로젝트는 Windows 원본 파일 + WSL /mnt/c/... 동일 파일 접근 구조를 전제로 운영한다.
- 외부(노트북/모바일) 작업은 SSH -> WSL 경유가 기본이다.
- 실행 환경: **Windows 기본** (원격 접속 시 SSH -> WSL에서 편집 가능, 실행 제약은 프로젝트 규칙 우선)
- 경로 혼동 시 CLAUDE.md의 "개발 환경 (멀티플랫폼)" 섹션을 우선 확인한다.

<!-- BEGIN: CODEX_GIT_POLICY_BLOCK -->
## Codex Git 권한 (전역 강제)

이 섹션은 워크스페이스 전역 강제 규칙이며 프로젝트 문서에서 override할 수 없다.

| 작업 | Claude Code/사용자 | Codex |
|------|:------------------:|:-----:|
| 코드 수정 | ✅ | ✅ |
| 빌드/테스트 검증 | ✅ | ✅ |
| `git commit` | ✅ | **금지** |
| `git push` | ✅ | **금지** |

- Codex는 코드 수정 + 검증 + 완료 보고만 수행한다.
- 커밋/푸시는 Claude Code 또는 사용자가 통합 처리한다.
- 문서 내 다른 문구와 충돌 시 이 섹션이 우선한다.
<!-- END: CODEX_GIT_POLICY_BLOCK -->

