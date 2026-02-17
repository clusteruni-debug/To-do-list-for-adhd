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
