> ⚠️ **글로벌 규칙 적용**: 절대 규칙, 보안, Git, 능동적 작업, 구현 완결성, 영향도 분석, 디버깅, 검증, 세션 프로토콜 등 공통 규칙은 `~/.claude/CLAUDE.md` 참조. 이 파일은 **프로젝트 고유 정보만** 담습니다.

# Navigator - ADHD 친화적 할일 관리

## 📋 프로젝트
- **이름**: Navigator
- **스택**: HTML + Vanilla JS + Firebase (Auth/Firestore)
- **한 줄 설명**: ADHD 친화적 할일 관리, 예상 수익 추적, 시간 관리

---

## 🧪 핵심 테스트 시나리오 (코드 수정 후 반드시 확인)

> 코드 변경 시 아래 시나리오 중 **영향받는 항목**을 반드시 검증.
> 전체를 매번 돌릴 필요 없고, 수정 범위에 해당하는 것만 체크.

### 1. 작업 CRUD (Task Lifecycle)
```
□ 퀵 추가: 입력 → 엔터 → 목록에 표시 + saveState 호출
□ 상세 추가: 모든 필드 입력 → 저장 → 새로고침 후 데이터 유지
□ 수정: 기존 작업 편집 → 저장 → 변경 반영 (editingTaskId 정리)
□ 삭제: 삭제 → confirm → trash 이동 + deletedIds 기록 + 목록에서 제거
□ 완료: 체크 → completedAt 기록 + completionLog 추가 + todayStats 증가
□ 완료 취소: undoComplete → completed=false + completionLog에서 제거 + todayStats 감소
□ 브레인덤프: 여러 줄 입력 → 각 줄이 개별 Task로 생성 (#카테고리 파싱)
```

### 2. 반복 작업 (Repeat Tasks)
```
□ daily 반복: 완료 → 다음날 새 Task 생성 (createNextRepeatTask)
□ weekdays/weekends/weekly/monthly: 각 유형별 다음 실행일 계산 정확성
□ 일일 리셋: checkDailyReset() → 완료 상태 초기화 + saveState 호출
□ 리셋 후 재완료: 리셋된 작업 다시 완료 시 completionLog 중복 없음
```

### 3. Firebase 동기화 (Sync)
```
□ 로그인 → loadFromFirebase → 클라우드 데이터 병합 + migrateNumericIds
□ 로컬 변경 → syncToFirebase (1.5초 디바운스) → Firestore 반영
□ 다른 기기 변경 → onSnapshot → 병합 + renderStatic + 토스트
□ 오프라인 → 변경 저장 → 온라인 복귀 시 자동 동기화
□ 핑퐁 방지: 자기 쓰기(lastOwnWriteTimestamp)면 재업로드 스킵
□ deletedIds: 삭제한 항목이 다른 기기에서 부활하지 않음
□ 비로그인: localStorage만 사용 (Firebase 호출 없음)
```

### 4. ID 호환성 (UUID Migration)
```
□ 기존 숫자 ID 데이터 로드 → migrateNumericIds → 문자열로 변환
□ 새 Task 생성 → generateId() → UUID 형식
□ onclick 핸들러에서 UUID ID 정상 전달 (따옴표 포함)
□ find(t => t.id === id) 비교 시 타입 일치 (===)
```

### 5. 본업 프로젝트 (Work Projects)
```
□ 프로젝트 생성: 이름 + 마감일 → stages 자동 생성
□ 중분류 추가/삭제: subcategories CRUD → 프로젝트 updatedAt 갱신
□ 작업 추가: 중분류 내 WorkTask 생성 (status: not-started)
□ 프로젝트 아카이브/복원: archived 토글 → 목록 표시 변경
□ 프로젝트 전환: activeWorkProject 변경 → 대시보드/상세 뷰 갱신
```

### 6. 라이프 리듬 (Life Rhythm)
```
□ 기록: recordLifeRhythm(type) → today 객체 업데이트 + history 저장
□ 날짜 변경: 자정 이후 → today 초기화 + 어제 데이터 history로 이동
□ 복약 기록: medications[slotId] = 'HH:MM' 또는 null (토글)
□ 통계: 7일/30일 평균 계산 → NaN/null 방어
□ 캘린더 연동: historyView='rhythm' → 날짜별 리듬 데이터 표시
```

### 7. 통근 트래커 (Commute)
```
□ 루트 CRUD: 추가/수정/삭제 → commuteTracker.routes 반영
□ 루트 선택: selectCommuteRoute → trips[date][direction] 기록
□ 소요시간 계산: departTime/arriveTime → duration (음수 방어)
□ 교통 상황: conditions 변경 → 해당 날짜 trip 업데이트
```

### 8. UI 렌더링 (renderStatic)
```
□ 탭 전환: currentTab 변경 → 해당 탭 콘텐츠만 렌더링
□ 스크롤 보존: renderStatic 후 스크롤 위치 유지
□ 포커스 보존: 입력 중 renderStatic → 포커스 + 커서 위치 복원
□ XSS 방어: 모든 사용자 입력 → escapeHtml() 통과 후 DOM 삽입
□ 빈 상태: tasks=[] → 빈 상태 메시지 표시 (에러 아님)
```

### 9. 데이터 내보내기/가져오기
```
□ 내보내기: exportData → JSON 파일 다운로드 (모든 appState 키 포함)
□ 가져오기: importData → 파일 선택 → validateTasks → 병합/덮어쓰기
□ 파일 형식 검증: JSON 아닌 파일 → 에러 토스트
□ 빈 파일/손상 파일 → 기존 데이터 유지 + 에러 메시지
```

### 10. 엣지 케이스
```
□ 빠른 연속 클릭: 완료 버튼 더블클릭 → 중복 처리 방지
□ 빈 제목: 제목 없이 저장 시도 → 토스트 에러 (Task 생성 안 됨)
□ 장시간 백그라운드: visibilitychange → checkDailyReset + 동기화
□ 모달 중첩: showTimeInputModal 등 → 기존 모달 제거 후 생성
□ 터치 이벤트: handleTouchEnd → changedTouches 존재 확인
□ setInterval 중복: 타이머 재등록 방지 (ID 체크)
```

---

## 🔐 보안 체크리스트 (작업 시작 전 확인)

### 필수 확인사항
- [ ] Firebase Security Rules가 UID 기반으로 설정되어 있는가?
- [ ] localStorage 데이터 로드 시 `validateTasks()` 검증을 사용하는가?
- [ ] 사용자 입력을 DOM에 삽입할 때 `escapeHtml()` 사용하는가?

### 코드 작성 시 보안 규칙
1. **Firebase 키**: 클라이언트 노출은 OK, 대신 Security Rules 필수
2. **innerHTML 사용 시**: 반드시 `escapeHtml()` 함수로 이스케이프
3. **localStorage 로드**: `safeParseJSON()`, `validateTasks()` 사용
4. **전역 함수 노출**: 최소화 (window.firebase* 등)
5. **하드코딩 금지**: 회사명, 고객명, 내부 프로세스명, 실명 등 민감 데이터를 코드에 직접 작성 금지 — 반드시 placeholder/템플릿 값 사용
6. **push 전 사전 스캔**: `git push` 실행 전 staged 파일 + 커밋 메시지에서 민감 용어 grep 실행 (사후 정리가 아닌 사전 차단)

### 민감 데이터 정리 프로토콜 (git 히스토리 포함)
> **원칙: 행동 전 전수 스캔 → 목록 확인 → 한 번에 실행**

**절대 금지**: 부분 스캔 후 바로 rebase 시작 (반복 사이클의 원인)

**정리 절차:**
1. **전수 스캔** — 파일 내용 + 커밋 메시지 + diff 전체를 대상으로 민감 용어 검색
   ```
   스캔 대상: 회사명, 고객명, 내부 프로세스명, API 키, 내부 URL, 비즈니스 로직 용어
   범위: 현재 파일 + git log --all + git diff (추가 후 삭제된 것 포함)
   ```
2. **인벤토리 작성** — 발견된 모든 항목을 파일/커밋SHA/라인 기준으로 목록화
3. **사용자 확인** — 전체 목록을 사용자에게 보여주고 승인 받은 후에만 실행
4. **일괄 실행** — git-filter-repo 또는 rebase로 한 번에 처리
5. **검증** — 정리 후 동일 스캔 재실행하여 잔여 참조 0건 확인

**병렬 에이전트 활용:**
- Agent 1: 파일 내용 스캔
- Agent 2: 커밋 메시지 스캔
- Agent 3: git diff에서 추가/삭제된 민감 데이터 스캔
- 결과를 단일 리포트로 통합

---

## ⚙️ 프로젝트 특이사항

- **배포**: GitHub Pages
- **URL**: https://clusteruni-debug.github.io/To-do-list-for-adhd/navigator-v5.html
- 단일 파일 아키텍처 (navigator-v5.html)
- Firebase: Security Rules UID 기반 필수
- localStorage + Firebase 이중 저장
- 날짜: getLocalDateStr() / getLocalDateTimeStr() 사용 (UTC 버그 전수 수정 완료)

---

## 📁 파일 구조
```
To-do-list-for-adhd/
├── navigator-v5.html    # 메인 앱 (단일 파일)
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA 매니페스트
├── docs/
│   └── CHANGELOG.md    # 작업 이력
└── CLAUDE.md           # 프로젝트 컨텍스트
```

## 실행 방법
```bash
npx serve -p 5000
# http://localhost:5000/navigator-v5.html
```

---

## 🔗 프로젝트 연동 현황

### telegram-event-bot ↔ Navigator
```
telegram-event-bot  ──(📋 Navigator 버튼)──▶  Navigator
     │                                           │
     └── URL 파라미터(?import=base64) ──────────▶│
                                                 │
Navigator  ──(Task 완료)──▶  이벤트 participated 상태 업데이트
```
- **상태**: ✅ 연동 완료
- **기능**: 이벤트 → Task 변환, 완료 시 상태 동기화

### 자산관리 ↔ Navigator
```
Navigator  ──(📤 자산관리 버튼)──▶  수익 데이터 클립보드 복사
                                         │
자산관리  ──(📤 Navigator 수익 가져오기)──◀──┘
```
- **상태**: ✅ 연동 완료
- **연동 방식**: 클립보드 JSON 데이터 교환

### x-article-editor ↔ Navigator (예정)
```
Navigator  ──(아티클 작성 Task)──▶  x-article-editor 초안 생성
```
- **상태**: 🔵 계획중

---

## 📊 개선 로드맵

### PM 관점 (제품 전략)

| 우선순위 | 기능 | 설명 | 상태 |
|---------|------|------|------|
| P0 | 수익 대시보드 | 월별/주별 수익 그래프, 카테고리별 비교 | ✅ |
| P0 | 마감일 푸시 알림 | 브라우저 알림 스케줄링 (D-1, 당일) | ✅ |
| P0 | 라이프 리듬 트래커 | 기상/출퇴근/취침 기록 + 통근시간 추적 | ✅ |
| P1 | 데이터 내보내기 | JSON/CSV 백업/복원 기능 | ✅ |
| P1 | 온보딩 가이드 | 첫 사용자 기능 발견 개선 | ✅ |
| P2 | 주간/월간 리포트 | 완료율, 수익 요약 자동 생성 | ✅ |
| P2 | 자산관리 연동 | 완료 Task 수익 → 자산관리 자동 기록 | ✅ |

### UX 관점 (사용자 경험)

| 우선순위 | 기능 | 설명 | 상태 |
|---------|------|------|------|
| P0 | 퀵입력 카테고리 | `#부업 제목` 형식으로 카테고리 지정 | ✅ |
| P1 | 탭 구조 개선 | 6개 → 5개 축소 (더보기 메뉴) | ✅ |
| P1 | Task 카드 간소화 | 액션 버튼 스와이프/롱프레스로 숨김 | ✅ |
| P1 | 키보드 단축키 | n=추가, Enter=완료, e=편집 | ✅ |
| P2 | 접근성 개선 | aria-label, 포커스 스타일, 색상 대비, aria-live, skip-nav, 시맨틱 랜드마크 | ✅ |
| P2 | 포모도로 통합 | 25분 집중 + 5분 휴식 사이클 | ✅ |

---

## 🐛 버그 (수정 필요)

| 버그 | 설명 | 우선순위 | 상태 |
|------|------|---------|------|
| ~~더보기 드롭다운 안 열림~~ | ~~더보기 버튼 클릭해도 메뉴가 표시되지 않음~~ | P0 | ✅ 해결 |
| ~~반복 작업 완료 누적~~ | ~~매일 반복 작업 완료 시 계속 누적됨~~ | P0 | ✅ 해결 |
| ~~완료 취소 시 게이지 버그~~ | ~~작업 완료 후 취소해도 완료 게이지(진행률)가 줄어들지 않음~~ | P0 | ✅ 해결 |

## 🎨 UX 개선 필요

| 문제 | 설명 | 우선순위 | 상태 |
|------|------|---------|------|
| ~~일상/가족 탭 수정/삭제 불가~~ | ~~항목은 보이지만 수정/삭제 버튼이 없음~~ | P0 | ✅ 해결 |
| ~~취소 기능 불명확~~ | ~~완료 버튼만 있고 취소 버튼이 따로 없어서 취소 개념이 명확하지 않음~~ | P1 | ✅ 해결 |
| ~~홈 버튼들 혼란~~ | ~~새작업 추가, 글쓰기, 상세 입력 버튼들의 기능 구분이 안 됨~~ | P1 | ✅ 해결 |
| ~~섹션 구분 불명확~~ | ~~2분룰, 5분이하, 24시간 내 등 섹션 간 구분과 각 섹션의 목적이 불명확~~ | P1 | ✅ 해결 |

---

## 🔥 현재 작업 (WIP)

| 작업 | 우선순위 | 상태 |
|------|---------|------|
| SVG 아이콘 교체 | P2 | ✅ 완료 |
| 접근성 개선 심화 | P2 | ✅ 완료 |
| 라이프 리듬 30일 장기 통계 | P1 | ✅ 완료 |

### ✅ 최근 완료 (2026-02-06, 세션 16)
- [x] 캘린더 과거 날짜 완료 기록 추가 (addCompletionLogEntry) ✅
- [x] 시간 입력 편의 파싱 — 1430, 930 등 콜론 없이 입력 (parseTimeInput) ✅
- [x] 캘린더 카운트 버그 수정 (getCompletionMap 중복 체크) ✅
- [x] completionLog 중복 기록 표시 수정 ✅
- [x] 시간 검증 피드백 toast + 과거 날짜 기본 시간 12:00 ✅
- [x] saveActualTime NaN 방어 ✅
- [x] handleTouchEnd changedTouches 크래시 방지 ✅
- [x] importData 파일 재선택 + handleFileImport 타입 검증 ✅
- [x] showTimeInputModal 모달 중첩 방지 ✅
- [x] setInterval 중복 등록 방지 (메모리 누수 예방) ✅

### ✅ 이전 완료 (2026-02-05)
- [x] XSS 전수 방어 - innerHTML 38곳 escapeHtml() 적용 ✅
- [x] 접근성 65개 aria-label + 포커스 트랩 + WCAG 색상 대비 ✅
- [x] renderStatic 스크롤/포커스 보존 ✅
- [x] Firebase 온오프라인 자동 동기화 피드백 ✅
- [x] 터치타겟 44px + 삭제 confirm 보완 ✅
- [x] 전역 함수 Nav 네임스페이스 정리 ✅
- [x] 온보딩 기능 투어 (4-step 하이라이트) ✅
- [x] 주간/월간 리포트 (대시보드) ✅
- [x] 포모도로 타이머 UI 연결 ✅
- [x] PWA SW v6.3 + 앱 업데이트 감지 ✅
- [x] 4K 레이아웃 + favicon/apple-touch-icon ✅

---

## 주요 기능 (현재)
- 카테고리별 작업 관리 (본업, 부업, 일상, 가족)
- 예상 수익/소요시간 추적
- Firebase 클라우드 동기화
- 서브태스크, 반복 Task
- 퀵 타이머, 포커스 모드
- 캘린더/히스토리
- telegram-event-bot 연동 (이벤트 → Task)
- **라이프 리듬 트래커** (기상/집출발/회사도착/회사출발/집도착/취침 + 통근시간 자동계산)

---

## 🔌 MCP 서버 & 도구

- **context7**: 라이브러리 최신 문서 자동 주입 (`resolve-library-id` → `get-library-docs`)
- **claude-mem**: 세션 히스토리 압축 + 컨텍스트 유실 방지
- **ccusage**: `npx ccusage@latest daily` — 토큰 비용 확인
- **firebase MCP**: Firestore/Auth 관리 (첫 사용 시 인증 필요)
- **github MCP**: GitHub 이슈/PR/Actions 관리

---

## 🔒 세션 잠금

이 프로젝트는 세션 잠금 시스템 적용 대상입니다.
- 작업 시작: `/session-start` → `.claude-lock` 생성 → 다른 세션 수정 차단
- 작업 종료: `/session-end` → `.claude-lock` 삭제
- **다른 세션에서 이 프로젝트를 수정하려 하면 PreToolUse hook이 자동 차단합니다**
