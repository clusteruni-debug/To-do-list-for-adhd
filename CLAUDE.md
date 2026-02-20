# Navigator — ADHD 친화적 할일 관리

## 스택
HTML + Vanilla JS + Firebase (Auth/Firestore)

## 실행
```bash
npx serve -p 5000
# http://localhost:5000/navigator-v5.html
```

## 배포
GitHub Pages: https://clusteruni-debug.github.io/To-do-list-for-adhd/navigator-v5.html

## 구조
단일 파일 아키텍처 (navigator-v5.html) + js/rhythm.js + js/commute.js + sw.js

## 고유 제약
- localStorage + Firebase 이중 저장 (비로그인 시 localStorage만)
- Firebase Security Rules UID 기반 필수
- 날짜: getLocalDateStr() / getLocalDateTimeStr() 사용 (UTC 금지)
- UUID 마이그레이션 완료 — 새 Task는 generateId() (UUID), 기존 숫자 ID는 migrateNumericIds
- 동기화 핑퐁 방지: lastOwnWriteTimestamp 체크
- 단일 HTML 특성상 UI 변경도 영향도 넓음

## 검증 체크리스트
- [ ] Task CRUD (퀵 추가/상세/수정/삭제/완료/취소)
- [ ] 반복 작업 리셋 + 재완료
- [ ] Firebase 동기화 (핑퐁 방지, deletedIds)
- [ ] XSS 방어 (escapeHtml)

## 연동
- telegram-event-bot: 이벤트 → Task 변환 (URL 파라미터)
- 자산관리: 수익 데이터 클립보드 교환

## 참조
- 상세 테스트 시나리오: agent_docs/test-scenarios.md
- CC/CX 파일 담당: agent_docs/domain-map.md
