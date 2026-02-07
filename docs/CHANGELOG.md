# CHANGELOG

## [2026-02-07] (세션 19)

### 작업 내용
- **P0 버그 수정: 반복 태스크 일일 초기화 saveState() 누락**
  - `checkDailyReset()` 후 `saveState()` 호출 추가 (4곳)
  - loadState(), setInterval(1분), visibilitychange, wakeUp 트리거
  - 모바일에서 `beforeunload` 미발생 시 초기화 데이터 유실 방지

- **이벤트 탭 일괄 삭제(다중 선택) 기능**
  - `☑ 선택` 버튼 → 선택 모드 진입: 체크박스 표시 + 액션바(전체/삭제/취소)
  - 개별/전체 선택 → `🗑 삭제 (N)` → confirm → soft-delete(deletedIds 패턴)
  - 선택 모드에서 액션 버튼 숨김 (오조작 방지)
  - 비영속적 상태: `_eventBulkSelectMode`, `_eventBulkSelectedIds` (새로고침 시 초기화)
  - 접근성: aria-label, 44px 터치 타겟
  - XSS 방어: escapeHtml() 적용

- **이벤트 탭 그룹 재편 + 접기 기능**
  - 그룹 변경: 기한초과/오늘/3일이내/여유 → 긴급(D-1이하)/마감전(D-2~D-5)/미제출/제출완료
  - 모든 그룹 헤더 클릭 시 접기/펼치기 (▼/▶ 토글)
  - `_collapsedEventGroups` Set으로 접힘 상태 관리 (비영속적)
  - 제출완료 섹션도 동일한 events-group 패턴으로 통일

- **복약 트래커 레이아웃 개선**
  - `medication-slots` flex → `grid-template-columns: 1fr 1fr` (2열 고정 그리드)
  - PC에서 3+1 → 2+2, 모바일에서 1+1+1+1 → 2+2로 통일
  - `med-label` ellipsis 제거 → 텍스트 자연 줄바꿈 허용

### 커밋 이력
```
5a38824 feat: 이벤트 탭 일괄 삭제(다중 선택) 기능
530b898 fix: 반복 태스크 일일 초기화 saveState() 누락 수정 (모바일 데이터 유실 방지)
```

### 상태
- ✅ Phase 1 완료 (saveState 누락 수정)
- ✅ Phase 2 완료 (이벤트 일괄 삭제)

---

## [2026-02-06] (세션 18)

### 작업 내용
- **P0 버그 수정: 텔레그램 연동 2건**
  - `confirmImportTask()`: `syncToCloud()` → `syncToFirebase()` (미정의 함수 호출 수정)
  - `_doSyncToFirebase()`: `setDoc`에 `{ merge: true }` 추가
    - Navigator 동기화 시 텔레그램 봇이 저장한 `events` 필드가 삭제되던 문제 수정
  - `confirmImportTask()`: `description` 필드 누락 추가

- **텔레그램 배지 클릭 → 이벤트 목록 모달**
  - 이벤트 탭 `🤖 텔레그램 미연동` 배지를 `<button>`으로 변경 (기존 `<div>`)
  - `showTelegramEvents()`: **Supabase REST API**로 `telegram_messages` 직접 조회
    - 봇은 Supabase 사용, Navigator는 Firebase → Supabase anon key로 크로스 조회
    - 쿼리 필터: `participated=false` + `(starred OR deadline)` + `archived_date IS NULL`
    - analysis 필드 활용: title, summary, reward_usd, time_minutes, project, organizer
  - `showTelegramEventsModal()`: 체크박스 리스트 모달 UI
    - 전체 선택 / 개별 선택 지원
    - 미추가 이벤트 없으면 상태별 안내 메시지 (이벤트 없음 / 전부 추가됨)
    - 날짜 포맷: `YYYY-MM-DD` → `2월 15일 D-3` + D-day 색상
    - 난이도/타입/프로젝트/주최자 메타 표시
    - ⭐ starred 이벤트 표시
  - **카드 상세 보기**: 제목 클릭 시 설명, 할 일 목록, 링크, 프로젝트/주최자 펼침 (▼/▲ 토글)
  - `importSelectedTelegramEvents()`: 선택된 이벤트 일괄 Task 추가
    - `source` 구조: 봇 `exportToNavigator()` 형식과 동일
    - localStorage + Firebase 동기화
  - `archiveSelectedTelegramEvents()`: 선택 이벤트 일괄 삭제(아카이브)
    - Supabase PATCH로 `archived_date` 설정 (봇과 동일한 소프트 삭제)
    - confirm 확인 후 처리, 삭제 후 목록 자동 새로고침
  - CSS: `.tg-events-list`, `.tg-event-item`, `.tg-event-detail` 등
  - 접근성: `aria-label`, `min-height: 44px` 터치 타겟
  - XSS 방어: 모든 사용자 입력에 `escapeHtml()` 적용

- **P0 추가 수정**
  - `renderTasks()` → `renderStatic()` (미정의 함수 호출 2곳 수정)
  - `toggleAllTelegramEvents`: label onclick 타이밍 버그 수정

### 커밋 이력
```
d775a6c feat: 텔레그램 이벤트 일괄 삭제(아카이브) 기능
7c8c53a fix: 텔레그램 이벤트 모달 3가지 개선
0c585d6 fix: 텔레그램 이벤트 추가 안 되는 버그 수정
dc929e8 refactor: 텔레그램 이벤트 조회를 Supabase 직접 조회로 변경
dcf9f0c feat: 텔레그램 배지 클릭 → 이벤트 목록 모달 + P0 동기화 버그 수정
```

### 상태
- ✅ P0 버그 3건 + 텔레그램 이벤트 연동 기능 완료
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB: Supabase `telegram_messages` 읽기/아카이브 (anon key, RLS 보호)

### 다음에 할 것
- P2: SVG 아이콘 교체
- P1: 라이프 리듬 30일 장기 통계 (수면 패턴 트렌드)

---

## [2026-02-06] (세션 17)

### 작업 내용
- **P0 버그 3건 수정**
  - `loadLifeRhythm()`: 날짜 변경 시 오늘의 리듬 자동 리셋
    - 기존 데이터를 히스토리로 이동 후 오늘 날짜로 초기화
    - UTC 보정 로직 제거 → 명확한 날짜 변경 감지로 대체
  - 복약 버튼 레이아웃 밀림 수정
    - `.medication-btn`: max-width 180px 추가
    - `.med-label`: overflow ellipsis + flex:1 + min-width:0
    - `.med-time`: flex-shrink:0 추가
  - `checkDailyReset()`: 일상 반복 태스크 중복 정리 개선
    - 완료 여부 상관없이 중복 정리 (기존: 미완료만)
    - 완료된 태스크 우선 유지 (기존: 최신 생성만 비교)

- **Phase 2: 이벤트 탭 개선 4건**
  - `editCompletedAt()`: 완료된 이벤트의 완료 날짜 수정 기능
    - 모달 UI로 datetime 입력
    - completionLog 자동 갱신 (기존 날짜 제거 → 새 날짜 추가)
  - Task description 필드 추가
    - `detailedTask.description`: 작업 설명/메모 저장
    - 상세 추가 폼에 textarea 추가
    - 이벤트 카드에 description 일부(60자) 표시
  - 이벤트 카드 표시 정보 확장
    - organizer, eventType, expectedRevenue 메타 정보 표시
    - 텔레그램 연동 이벤트에 📱 배지 표시
  - 이벤트 기한별 그룹핑
    - 기한 초과(🚨) / 오늘(⏰) / 3일 이내(⚡) / 여유 있음(📅) 4개 그룹
    - 각 그룹별 카운트 헤더 표시

- **Phase 3: 텔레그램 연동 + 통근 트래커 개선 3건**
  - 텔레그램 연동 상태 표시
    - 완료된 이벤트에 📱 배지 + "✓ 동기화" 표시
    - 미제출 이벤트에도 텔레그램 소스 배지 표시
  - 통근 최근 7일 상세 시간 표시
    - `getRecentCommuteDetail()`: 날짜별 출발/도착 시간 포함
    - 기존 평균만 표시 → 일별 "출발 → 도착" 시간 상세 표시
    - 날씨 조건 아이콘 표시 (🌧️/❄️)
  - 통근 전체 기록 히스토리 탭
    - `commuteSubTab: 'history'` 추가
    - `renderCommuteHistoryView()`: 날짜별 출퇴근 기록 전체 조회
    - 루트명, 출발/도착 시간, 소요시간, 날씨 조건 표시

- **Phase 4: 일정 관리 개선 2건**
  - Task startDate 필드 추가
    - `detailedTask.startDate`: 시작일 저장
    - 본업/부업/일상/가족 4개 카테고리 모두 시작일 입력 가능
    - 시작일-마감일 가로 배치 (`.form-row` + `.form-group.half`)
  - 이벤트 카드 일정 범위 표시
    - 시작일만: "1월5일~"
    - 마감일만: "~1월10일"
    - 둘 다: "1월5일~1월10일"

- **검토 후 추가 수정**
  - 빠른 수정 모달에 description, startDate 필드 추가
    - showQuickEditModal(): textarea + 시작일/마감일 가로 배치
    - saveQuickEdit(): description, startDate 저장 로직 추가
  - detailedAdd() 초기화 2곳에 startDate 누락 수정
  - .work-modal-field-row, .work-modal-field.half 스타일 추가

- **일상 탭 반복/일회성 분리**
  - 일상(반복): repeatType이 daily/weekdays 등인 작업
  - 일상(일회성): repeatType이 none인 작업
  - 가족: 기존 그대로
  - 요약 섹션 4칸: 반복 / 일회성 / 가족 / 완료
  - `resetCompletedRepeatTasks()`: 완료된 반복 작업 수동 리셋 기능
  - "↺ 리셋 (N)" 버튼으로 완료된 반복 작업 일괄 리셋
  - 반복 작업 모두 완료 시 "✓ 오늘 반복 작업 모두 완료!" 표시

### 커밋 이력
```
b968d4e feat: 일상 탭 반복/일회성 분리 + 리셋 기능
f9a4fd9 fix: 검토 후 누락 수정 - 빠른 수정 모달 + 초기화 코드
3c97fe0 feat: Task startDate 필드 + 이벤트 카드 일정 범위 표시
bed5f0f feat: 텔레그램 연동 상태 표시 + 통근 히스토리 탭
13279a2 feat: 이벤트 탭 개선 - 완료 날짜 수정, description 필드, 기한별 그룹핑
c19a0ca fix: P0 버그 3건 수정 - 라이프 리듬 리셋, 복약 레이아웃, 반복 태스크 중복
```

### 상태
- ✅ 13개 계획 이슈 + 검토 수정 + 일상 탭 개선 완료
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: 없음 (startDate, description은 optional 필드)

### 다음에 할 것
- P2: SVG 아이콘 교체
- P1: 라이프 리듬 30일 장기 통계 (수면 패턴 트렌드)

---

## [2026-02-06] (세션 16)

### 작업 내용
- **캘린더 과거 날짜 완료 기록 추가 기능**
  - `addCompletionLogEntry()`: prompt UI로 제목/카테고리/시간/수익 입력 → completionLog에 추가
  - `renderDayDetail()` header에 "➕ 기록 추가" 버튼 배치
  - 빈 날짜(기록 0개)에서도 추가 가능
  - 추가된 기록은 기존 ✏️수정/❌삭제 버튼 자동 표시

- **시간 입력 편의 파싱 (parseTimeInput)**
  - `1430`→`14:30`, `930`→`09:30`, `9`→`09:00` 등 콜론 없이 입력 가능
  - 전각 콜론(：) 자동 변환
  - addCompletionLogEntry, editCompletionLogEntry 양쪽 적용

- **캘린더 카운트 버그 수정 (P0)**
  - `getCompletionMap()`: completionLog에 항목이 있어도 tasks의 추가 완료 항목이 누락되던 버그 수정
  - 날짜 키 유무 체크 → 제목+시간 기반 정확한 중복 체크로 변경

- **completionLog 중복 기록 표시 수정**
  - `getCompletedTasksByDate()`: 같은 제목+시간 기록이 2개 이상일 때 두 번째가 사라지던 문제 수정
  - seen key에 인덱스 포함하여 각각 표시

- **시간 검증 피드백 추가**
  - add/edit 모두 잘못된 시간 형식 입력 시 toast 경고 표시
  - 과거 날짜 기록 시 기본 시간을 현재시간→12:00으로 변경 (오늘은 현재시간 유지)

- **P0 버그 4건 수정**
  - `saveActualTime()`: NaN/음수 입력 방어 + 에러 toast
  - `handleTouchEnd()`: changedTouches 배열 비어있을 때 크래시 방지
  - `importData()`: input.value 초기화로 같은 파일 재선택 가능
  - `handleFileImport()`: JSON 외 파일 거부 + string 타입 검증

- **기타 수정**
  - `showTimeInputModal()`: 기존 모달 닫고 새로 열어 중첩 방지
  - setInterval 중복 등록 방지: `window._navIntervals`로 ID 추적, 재실행 시 기존 정리

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: 없음 (completionLog 기존 구조 `{t, c, at, rv}` 그대로)

### 다음에 할 것
- P2: SVG 아이콘 교체
- P1: 라이프 리듬 30일 장기 통계 (수면 패턴 트렌드)

---

## [2026-02-06] (세션 15)

### 작업 내용
- **PC 4K 레이아웃 균등 재배치 (UX 대폭 개선)**
  - 4K CSS: 3열(RIGHT이 LEFT 아래 쌓임) → 4열(LEFT|CENTER|RIGHT|TASKLIST) 독립 배치
  - LEFT (핵심 상태): 시간 → 라이프 리듬(↑위로 이동) → 마감 임박 → Next Action
  - CENTER (작업 관리): 빠른 추가 → 템플릿 → 퀵 필터 → 작업 목록 → 상세 폼 → 포커스
  - RIGHT (진행률+도구): 일일 목표(LEFT→RIGHT) → 복약(LEFT→RIGHT) → 포모도로 → 명언 → 리마인더 → PWA
  - TASKLIST: 4K 전체 작업 목록 (기존 유지)
  - 목적: 3면 균등 배치, LEFT 과부하 해소, 라이프 리듬 즉시 접근

- **카테고리별 3컬럼 재그룹핑 (UX)**
  - LEFT "오늘의 나": 시간 → 라이프 리듬 → 복약 → 일일 목표 → 명언
  - CENTER "할 일": 마감 임박 → Next Action → 빠른 추가 → 퀵 필터 → 작업 목록 → 상세 폼
  - RIGHT "집중 도구": 포모도로 → 포커스 모드 → 월요일 리마인더 → PWA

### 상태
- 완료: 4K 4열 CSS + 카테고리별 콘텐츠 재그룹핑
- 다음: 브라우저에서 확인

---

## [2026-02-06] (세션 14)

### 작업 내용
- **Soft-Delete 동기화 버그 수정 (P0)**
  - `appState.deletedIds`: 삭제된 항목의 ID+시각 추적 (tasks, workProjects, templates, workTemplates)
  - `mergeTasks()`, `mergeById()`: deletedIds 매개변수 추가, 삭제 항목 병합 제외
  - `mergeDeletedIds()`: 로컬+클라우드 삭제 기록 합집합 병합
  - `cleanupOldDeletedIds()`: 30일 이상 된 삭제 기록 자동 정리
  - `deleteTask()`, `deleteTemplate()`, `deleteWorkProject()`: 삭제 시 deletedIds에 기록
  - `_doSyncToFirebase()`: Firebase에 deletedIds 업로드
  - `loadFromFirebase()`, `startRealtimeSync()`: deletedIds 병합 후 merge에 전달
  - `_doSaveState()`, `loadState()`: localStorage에 deletedIds 저장/로드
  - **효과**: 기기 A에서 삭제 → 기기 B 동기화 시 부활하지 않음

- **startRealtimeSync localStorage 누락 수정 (P0)**
  - settings, streak, templates, availableTags의 localStorage 저장 추가
  - 앱 재시작 시 병합 결과 유실 방지

- **점심약 ADHD/영양제 분리 완전 수정 (P1)**
  - `restoreFromSyncBackup()`: 백업 복원 시 med_afternoon 마이그레이션 추가
  - `loadFromFirebase()`, `startRealtimeSync()`: settings 병합 시 medicationSlots 로컬 우선 보호
  - 클라우드의 옛 슬롯 정의가 분리된 슬롯을 덮어쓰는 문제 해결

- **completionLog 이전 기록 수정/삭제 기능 (P1)**
  - `editCompletionLogEntry()`: prompt 기반 제목/카테고리/시간/수익 수정
  - `deleteCompletionLogEntry()`: confirm 후 기록 삭제
  - `renderDayDetail()`: completionLog 항목에 ✏️/❌ 버튼 추가
  - `getCompletedTasksByDate()`: logIndex 필드 추가 (수정/삭제 대상 인덱스)

- **기타 수정**
  - `_doSaveState()`: commuteTracker 중복 저장 제거
  - `_doSaveState()`: streak, templates localStorage 저장 누락 추가

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: Firebase users 문서에 `deletedIds` 필드 추가
- 검증: 기기 간 삭제 동기화, 점심약 슬롯 2개 표시, 과거 기록 수정/삭제

---

## [2026-02-05] (세션 13)

### 작업 내용
- **태스크 완료 영구 기록 (completionLog) — 장기 통계 분석**
  - `appState.completionLog`: 날짜별 완료 기록 영구 보존 (키: YYYY-MM-DD)
  - 데이터 구조: `{ t: title, c: category, at: "HH:MM", r?: repeatType, rv?: revenue, st?: subtaskCount }`
  - `completeTask()`에서 completionLog 자동 기록 / `uncompleteTask()`에서 제거
  - Firebase `setDoc`에 completionLog 필드 추가 — 멀티디바이스 동기화
  - `mergeCompletionLog()`: 날짜별 합집합 + title+at 중복 제거
  - `loadFromFirebase()`/`startRealtimeSync()` 양쪽 병합 로직 확장
  - `createSyncBackup()`/`restoreFromSyncBackup()` completionLog 포함
  - `exportData()`/`handleFileImport()` completionLog 포함
  - 기존 사용자 마이그레이션: appState.tasks + navigator-completion-history → completionLog 자동 이전
  - 기존 `saveCompletionHistory()`/`getCompletionHistory()` 제거 (dead code 정리)

- **캘린더/히스토리 뷰 completionLog 기반 전환**
  - `getCompletionMap()`: completionLog + tasks 통합 (캘린더 히트맵)
  - `getCompletedTasksByDate()`: completionLog 우선, tasks 보완
  - `renderRecentHistory()`: 14일 → 30일 확장, 날짜별 수익 표시
  - `renderDayDetail()`: 리듬/복약 정보 통합 + 수익 표시
  - `getWeeklyStats()`/`getWeeklyReport()`: completionLog 기반
  - `getCompletionLogEntries()`: 날짜 범위 조회 헬퍼 함수 신규

- **장기 통계 대시보드**
  - `getHourlyProductivity()`/`getDayOfWeekProductivity()`/`getCategoryDistribution()`: completionLog 기반
  - 대시보드: 주간/월간 + 90일 통계 + 월별 트렌드 바 차트 (최근 3개월)
  - 복약 통계: 7일 + 30일 필수/선택 복용률 확장
  - 라이프 리듬 히스토리 완료 수 completionLog 기반

- **데이터 보존 정책**
  - `compactOldCompletionLog()`: 1년 이상 데이터 → 일별 요약 자동 압축
  - 압축 형태: `{ _summary: true, count, categories: {...}, totalRevenue }`
  - `getCompletionMap()`/`getCompletionLogEntries()`: 압축 데이터 지원
  - 앱 시작 시 1일 1회 자동 실행

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: Firebase users 문서에 `completionLog` 필드 추가
- 용량 추정: 하루 5건 기준 1년 ~146KB, 3년 ~438KB (Firestore 1MB 한도 안전)
- 기존 `cleanupOldCompletedTasks()` 동작 유지 (appState.tasks 정리) — completionLog는 별도 영구 보존
- 기존 사용자: completionLog 없어도 `|| {}` 처리로 크래시 없음

### 버그 수정 (세션 13 추가)
- **일상/전체 작업 목록 완료 태스크 사라짐 버그 수정**
  - 원인: `getTodayCompletedTasks()`가 오늘 완료한 태스크만 반환 → 어제 완료 태스크가 pending에도 completedTasks에도 안 보이는 "블랙홀"
  - 수정: 일상 탭 + 전체 작업 목록에서 `lifeTasks.filter(t => t.completed)` / `categoryTasks.filter(t => t.completed)` 사용
  - "오늘" 탭과 헤더 카운트는 기존 `getTodayCompletedTasks` 유지 (정보 표시용)
- **점심 복약 슬롯 ADHD약/영양제 분리**
  - `med_afternoon` (ADHD약+영양제(점심)) → `med_afternoon_adhd` (ADHD약(점심)) + `med_afternoon_nutrient` (영양제(점심))
  - 기존 데이터 마이그레이션: loadLifeRhythm, mergeRhythmHistory, loadFromFirebase, startRealtimeSync 4곳 자동 변환
  - 기존 `med_afternoon` 기록 → `med_afternoon_adhd`로 이전 (ADHD약이 필수이므로)

### 다음에 할 것
- P1: 라이프 리듬 30일 장기 통계 (수면 패턴 트렌드)
- P1: 동기화 백업 3개 로테이션
- P2: SVG 아이콘 교체

---

## [2026-02-05] (세션 12)

### 작업 내용
- **복약/영양제 트래커 — 라이프 리듬 통합 (P1)**
  - appState.lifeRhythm에 medications 필드 + settings.medicationSlots 추가
  - 기본 슬롯 3개: ADHD약(아침/필수), ADHD약+영양제(점심/필수), 영양제(저녁/선택)
  - 오늘의 복약 카드: 리듬 트래커 바로 아래, 탭 한 번으로 시간 기록
  - 기록/수정/삭제 함수 + 액션 메뉴 (기존 리듬 패턴 재사용)
  - 필수 복약 연속일(streak) 계산 + 리마인더 표시
  - Firebase/localStorage 이중 저장 + 병합 로직 확장
  - mergeRhythmHistory, loadFromFirebase, startRealtimeSync 모두 medications 병합 추가
  - today 초기화 6곳 + history 생성 2곳 모두 medications:{} 포함
  - loadLifeRhythm 마이그레이션에 medications 필드 초기화 추가
  - CSS: .medication-tracker, .medication-btn, .medication-btn.taken 등 스타일
  - XSS 방어: escapeHtml() 적용 (slot.id, slot.label)
  - 접근성: button title 속성 (수정/삭제 안내)
  - 히스토리: 복약 행 추가 (아이콘✓/- 형태, 클릭으로 과거 날짜 편집)
  - editMedicationHistory(): 과거 날짜 복약 기록 편집
  - 설정 UI: 복약 슬롯 추가/편집/삭제 (이름, 아이콘, 필수 여부)
  - 대시보드: 7일 필수/선택 복용률 + 연속일 통계
  - hasAnyData에 복약 기록 포함 (복약만 있는 날도 히스토리에 표시)

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: lifeRhythm.today/history에 medications 필드, settings에 medicationSlots 추가
- 기존 사용자: medications 필드 없어도 `|| {}` 처리로 크래시 없음
- 슬롯 삭제 시 기존 기록은 유지 (데이터 안전)

### 다음에 할 것
- P1: 라이프 리듬 히스토리 30일 이후 자동 정리
- P1: 동기화 백업 3개 로테이션
- P2: SVG 아이콘 교체

---

## [2026-02-05] (세션 11)

### 작업 내용
- **통근 트래커 탭 신규 추가 (P1)**
  - 더보기 메뉴에 🚌 통근 탭 추가
  - 서브탭 3개: 🌅 출근 / 🌆 퇴근 / 📊 통계
  - 루트 CRUD: 이름, 설명, 방향(출근/퇴근/양방향), 예상 소요시간, 색상 설정
  - 출퇴근 기록: 라이프 리듬(집출발/회사도착/회사출발/집도착) 시간 자동 연동
  - 소요시간 자동 계산 + 예상 대비 비교 배지 (good/normal/bad)
  - 출발시간 추천 알고리즘: 최근 30일 데이터 기반 75% 백분위 안전값 + 버퍼
  - 신뢰도 표시: 높음(10회+), 중간(5회+), 낮음(<5회)
  - 날씨 조건 태그: 맑음/비/눈
  - 최근 7일 루트별 평균 요약
  - 통계 뷰: 루트별 평균/최단/최장, 이용 빈도 바 차트, 요일별 패턴
  - 🏆 추천 루트 표시 (평균 최단)
  - 라이프 리듬 자동 태그: 출퇴근 기록 시 루트 선택 프롬프트 (10초 자동 닫기)
  - 온보딩: 기본 루트 3개 프리셋 (셔틀버스/지하철+버스/버스 직행)
  - 데이터 저장: localStorage + Firebase 동기화 (병합 로직 포함)
  - 키보드 단축키 7키 → 통근 탭
  - XSS 방어: 모든 사용자 입력 escapeHtml() 적용
  - 접근성: aria-label, 최소 터치타겟 44px

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: commuteTracker 필드 추가 (Firebase users 문서)
- localStorage 키: `navigator-commute-tracker`
- 시간 데이터는 lifeRhythm에 저장, 루트/메타데이터만 commuteTracker에 저장 (중복 없음)

### 다음에 할 것
- Phase 4: 날씨 조건별 분석, CSV 내보내기
- P1: 라이프 리듬 히스토리 30일 이후 자동 정리
- P2: SVG 아이콘 교체

---

## [2026-02-05] (세션 10)

### 작업 내용
- **본업 프로젝트 상세 헤더 레이아웃 개선**
  - 1줄: 프로젝트명 + 일정(날짜 범위 + D-day) — flex 한 줄 배치
  - 2줄: 진행률 바
  - 3줄: 액션 버튼들
  - 프로젝트명 길어도 ellipsis 처리, 일정은 flex-shrink:0으로 고정
  - 기존: 좌우 배치로 긴 이름 시 줄 밀림 → 수정: 세로 배치로 깔끔한 2~3줄 구조

- **데이터 축소 감지 확장 (P0)**
  - `checkDataShrinkage()`에 templates, workTemplates 카운트 감시 추가
  - 기존: tasks, workProjects만 감지 → 템플릿 유실은 미감지
  - 수정: 4가지 데이터 타입 모두 0으로 감소 시 동기화 차단

- **반복 태스크(weekly/monthly/custom) 중복 생성 방지 (P0)**
  - `completeTask()`에서 `createNextRepeatTask()` 호출 전 중복 체크 추가
  - 동일 제목 + 카테고리 + 반복타입의 미완료 태스크가 이미 있으면 생성 스킵
  - 기존: 완료할 때마다 무조건 다음 주기 태스크 생성 → 중복 누적

- **동기화 빈도 최적화 (디바운싱)**
  - `syncToFirebase()` 디바운스 래퍼로 변환 (5초 간격 배치 처리)
  - 실제 로직은 `_doSyncToFirebase()`로 분리
  - `immediate=true` 옵션: 로드 후 머지, 온라인 복귀 등 즉시 동기화 필요 시 사용
  - `saveStateImmediate()`: 앱 종료 전 디바운스 타이머 즉시 실행
  - 효과: 빠른 연속 변경 시 Firebase 쓰기 1회로 통합 (비용/부하 감소)

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: 없음
- 즉시 동기화 경로: `loadFromFirebase()` 머지 후, 온라인 복귀 시
- 디바운스 동기화 경로: `_doSaveState()`, `saveLifeRhythm()`, `saveWorkProjects()`, 템플릿 저장

### 다음에 할 것
- P1: 라이프 리듬 히스토리 30일 이후 자동 정리
- P1: 동기화 백업 3개 로테이션
- P2: SVG 아이콘 교체

## [2026-02-05] (세션 9)

### 작업 내용
- **반복 태스크(daily/weekdays) 날짜 변경 자동 초기화**
  - `checkDailyReset()`: 논리적 날짜 변경 감지 시 daily/weekdays 완료 상태 리셋
  - `getLogicalDate()`: dayStartHour(기본 05:00) 기준 논리적 날짜 계산
    - 새벽 1시 활동 → 아직 "어제" → 리셋 안 됨 / 5시 이후 → "오늘" → 리셋
  - 설정 > "하루 시작 시각" 옵션 추가 (03:00~07:00 선택 가능)
  - weekdays 태스크: 주말(토/일)에는 초기화하지 않음 (금 완료 → 월 리셋)
  - `lastCompletedAt` 필드: 초기화 전 완료 시각을 히스토리로 보존
  - 중복 반복 태스크 자동 정리 (같은 제목+카테고리+반복타입 → 최신 1개만 유지)
  - `completeTask()`: daily/weekdays는 createNextRepeatTask 스킵 (초기화 방식으로 전환)
  - `checkDailyRepeatStreak()`: 논리적 "어제" 기준 반복 태스크 완료 여부로 스트릭 유지/리셋
  - 트리거: 앱 로딩 + visibilitychange(탭 포커스) + setInterval(1분) + 기상 버튼
  - `validateTask()`에 `lastCompletedAt`, `source` 필드 보존 추가

- **라이프 리듬 과거 날짜 수동 입력 기능**
  - "📅 과거 날짜 추가" 버튼: 히스토리 화면 상단에 추가
  - `addRhythmHistoryDate()`: YYYY-MM-DD 형식으로 과거 날짜 입력
  - 추가된 날짜는 빈 레코드로 생성 → 각 시간 클릭해서 수동 입력 가능
  - 기존 `editLifeRhythmHistory()`: 클릭으로 개별 시간 수정 (기존 기능)

- **멀티디바이스 동기화 데이터 유실 방지 (P0 버그 수정)**
  - 근본 원인: `onAuthStateChanged` → `appState.user` 설정 후 `loadFromFirebase()` 완료 전에 `syncToFirebase()`가 빈 데이터를 업로드하는 Race Condition
  - `isLoadingFromCloud` 플래그: 클라우드 초기 로드 중 모든 Firebase 업로드 차단
  - `loadFromFirebase()` 시작 시 `saveStateTimeout` 디바운스 타이머 강제 취소
  - `checkDataShrinkage()`: 이전 데이터 수 대비 급격한 감소(→0) 감지 시 동기화 자동 차단
  - `createSyncBackup()`: 매 동기화 전 현재 상태를 localStorage에 자동 백업
  - `updateDataCounts()`: 성공적인 동기화 후 데이터 수 기록 (다음 축소 감지에 사용)
  - `restoreFromSyncBackup()`: 데이터 유실 시 직전 동기화 백업에서 수동 복원
  - 앱 시작 시 데이터 유실 자동 감지 → `confirm()` 복구 제안
  - 설정 > 데이터 백업 섹션에 "🔄 동기화 백업에서 복원" 버튼 추가
  - `loadFromFirebase()` try-finally 블록으로 에러 시에도 잠금 해제 보장

### 보호 체계 요약
```
앱 시작 → loadState() → checkDataShrinkage() → 유실 감지 시 복구 제안
로그인 → isLoadingFromCloud=true → saveStateTimeout 취소 → loadFromFirebase()
       → 병합 완료 → isLoadingFromCloud=false → updateDataCounts() → syncToFirebase()
syncToFirebase() 호출 시:
  1. isLoadingFromCloud 체크 → 대기
  2. checkDataShrinkage() → 차단
  3. createSyncBackup() → 백업
  4. Firebase 업로드
  5. updateDataCounts() → 기록
```

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: 없음
- 보호 범위: tasks, workProjects, templates, workTemplates 등 전체 데이터 타입
- `_doSaveState()`, `saveWorkProjects()`, 온라인 복귀 이벤트 모두 `syncToFirebase()` 경유 → 자동 보호

### 다음에 할 것
- 반복 태스크(daily/weekdays) 자동 초기화 (오늘의 리듬)
- SVG 아이콘 교체 (P2)

## [2026-02-05] (세션 8 - 전면 개선)

### 작업 내용
- **XSS 잔여 3곳 수정**: subcatData.name, sub.name, stageName confirm에 escapeHtml 적용
- **접근성 대폭 강화**:
  - 65개 aria-label 추가 (삭제, 완료, 편집, 미루기, 탭, 더보기 메뉴 등)
  - 더보기 메뉴에 role="menu"/menuitem, aria-expanded, aria-haspopup 추가
  - 모달 포커스 트랩 구현 (Tab 키 모달 내부 순환)
- **renderStatic 스크롤/포커스 보존**: 렌더링 후 스크롤 위치 + 포커스 자동 복원
- **Firebase 오프라인/온라인 피드백**:
  - 동기화 시작 시 인디케이터 즉시 업데이트
  - 온라인 복귀 시 자동 동기화 + 토스트 알림
  - 오프라인 전환 시 경고 토스트
- **삭제 안전성**: deleteWorkLog에 confirm 추가
- **터치 타겟 보장**: btn-small(44px), work-task-action(44px), work-task-log-action(36px)
- **PWA 개선**: SW v6.3, 앱 업데이트 감지 토스트 추가
- **색상 대비 개선**: 다크모드 text-muted #707078 → #8a8a92, 라이트모드 #9aa0a6 → #72787e
- **전역 함수 네임스페이스 정리**: window.Nav 객체로 142개 함수 그룹화
- **favicon + apple-touch-icon 추가**: SVG data URI 아이콘
- **온보딩 기능 투어**: 4-step 하이라이트 투어 + 설정에서 "기능 가이드" 버튼
- **주간/월간 리포트**: 대시보드에 주간/월간 완료수, 수익, 카테고리별 통계, 일평균 표시
- **포모도로 타이머 UI 연결**: 오늘 탭에 25분 집중/5분 휴식 포모도로 UI 표시 (기존 로직 활용)

### 배포 확인
- 모바일(390), 데스크탑(1440), 4K(3840) 스크린샷 검증 완료
- 포모도로, 라이프 리듬, 필터, 더보기 탭, 색상 대비 등 모든 신규 기능 정상 확인

### 이슈/메모
- 수정 파일: navigator-v5.html, sw.js, docs/CHANGELOG.md
- DB 변경: 없음
- 동기화: localStorage 1차 + Firebase onSnapshot 실시간 + 오프라인→온라인 자동 동기화

### 다음에 할 것
- SVG 아이콘 교체 (P2)

---

## [2026-02-05] (세션 8)

### 작업 내용
- **UTC 날짜 버그 전수 수정**: 캘린더, 히스토리, 자산 내보내기, 백업 파일명 등 14곳의 `toISOString().split('T')[0]` → `getLocalDateStr()` 교체
- **JSON.parse 크래시 방지**: `loadState()`의 7개 bare `JSON.parse()` → `safeParseJSON()` 적용
- **saveTemplates() Firebase 동기화 추가**: 템플릿 저장 시 Firebase 누락 수정
- **XSS 방어 강화**: `showAchievement()`, `showUndoToast()`에 `escapeHtml()` 적용
- **홈 버튼/섹션 UX 정리**:
  - "글쓰기 템플릿" → "글쓰기", "직접 추가" → "📝 상세 추가" (명확한 라벨)
  - "2분 룰" → "2분 이내", "24시간 내" → "마감 임박" (직관적 필터명)
  - 필터 섹션 제목 "빠르게 처리할 작업" → "소요시간·마감 필터"
  - "?" 도움말 아이콘 제거, title 속성에 설명 통합
- **4K/대형 모니터 레이아웃 최적화**:
  - 1920px+: max-width 1800px, 폰트/패딩 확대, 그리드 간격 30px
  - 2560px+: max-width 2400px, 폰트 20px 기준, 전체 UI 요소 스케일업
  - 2560px+ 3열 레이아웃 (상태+필터 | 추가+액션 | 전체 작업목록)
  - 3200px+ zoom: 1.4 (4K 100% DPI 대응)
  - 본업 카드, 이벤트, 수익, 캘린더, 리듬, 토스트 등 모든 컴포넌트 대응
- **XSS 전수 방어**: innerHTML 템플릿의 사용자 입력 35곳에 `escapeHtml()` 적용
  - task.title, project.name, subtask.text, subcat.name, tag 등 전체 커버
- **반복 Task 마감일 UTC 버그 수정**: `getLocalDateTimeStr()` 헬퍼 추가, 4곳의 `toISOString().slice(0,16)` 교체
- **접근성 기초 개선**:
  - 헤더 버튼 6개에 aria-label 추가 (셔틀, 테마, 동기화, 알림, 설정)
  - task-check-btn 5곳에 aria-label="작업 완료" 추가
  - Escape 키로 모달/드롭다운 닫기 기능 추가

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`, `CLAUDE.md`
- DB 변경: 없음
- JSON.parse 전수 점검 결과 10곳 모두 이미 try-catch 적용 완료

### 다음에 할 것
- SVG 아이콘 교체 (P2)
- 포모도로 통합 (P2)
- 온보딩 가이드 (P1)

## [2026-02-04] (세션 7)

### 작업 내용
- **본업 완료 로그 압축**: "✓ 완료" 로그가 누적되던 것을 "✓ N회 완료 (최근: M/D)" 형태로 요약 표시
- **이벤트 카드 한 줄 압축**: 이벤트명, 일자, 버튼, D-Day를 한 줄에 배치
- **오늘 탭 목록 컴팩트 모드**: 기본 "번호. 제목 (카테고리)"만 표시, hover시 액션 버튼 표시
- **진행률 섹션 제거**: 오늘의 진행률 + 카테고리별 현황 섹션 삭제
- **마감 알림 → 헤더 통합**: 별도 섹션에서 헤더 🔔 아이콘 드롭다운으로 이동

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `docs/CHANGELOG.md`
- DB 변경: 없음

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 6)

### 작업 내용
- **중분류/소분류 완료 체크박스 추가**
  - 소분류(Task): status badge 앞에 체크박스 추가, 클릭 시 완료↔미시작 직접 토글
  - 중분류(Subcategory): 📁 아이콘 → 체크박스로 교체, 하위 task 전체 완료면 자동 checked
  - `toggleWorkTaskComplete()`, `toggleSubcategoryComplete()` 함수 추가
  - `.work-subcategory-checkbox` CSS 추가 (기존 `.work-task-checkbox` 활용)

- **본업 섹션 버튼 순서 통일**
  - 대분류: 📅✏️🗑️ → ✏️📅🗑️ 순서로 변경
  - 중분류: 텍스트 '삭제' → 🗑️ 아이콘 + 빨간색 통일
  - 소분류: 📅✏️ → ✏️📅 순서, 텍스트 '삭제' → 🗑️ 통일
  - 전 계층 ✏️→📅→🗑️→[추가] 순서 통일

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: 없음

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 5)

### 작업 내용
- **내장 템플릿 하드코딩 제거 (보안)**
  - 내장 템플릿 상수 삭제 → 사용자 데이터(localStorage/Firebase)로만 관리
  - 템플릿 선택/적용 로직에서 내장 분기 제거

- **템플릿 JSON 가져오기 기능 추가**
  - 본업 대시보드 헤더에 "📥 가져오기" 버튼 추가
  - `showWorkModal('template-import')` → JSON 텍스트 붙여넣기 모달
  - JSON 파싱 + 구조 검증 (name, stages, subcategories, tasks 필수 필드)
  - 가져온 템플릿 → localStorage + Firebase 자동 동기화

- **템플릿 JSON 내보내기 기능 추가**
  - 템플릿 선택 목록에서 각 항목에 📤 내보내기 버튼
  - `exportTemplate()` → 클립보드 JSON 복사 (내부 필드 제외한 깔끔한 JSON)
  - 클립보드 실패 시 prompt 폴백

- **템플릿 선택 UI 개선**
  - 템플릿 없을 때 안내 메시지 표시
  - 템플릿 이름에 escapeHtml 적용 (XSS 방지)

- **git history 보안 정리**
  - 공개 레포에 노출된 내부 업무 용어 전수 제거
  - 코드, 커밋 메시지, CHANGELOG, ROADMAP 등 전체 대상
  - `workProjectStages` 기본값 일반화 (준비/설계/진행/점검/실행/마무리)
  - 참여자 UI 라벨 일반화
  - `navigator-backup-fixed.json` git 추적 제거 + .gitignore 추가
  - `git rebase` + `force push`로 과거 커밋 history 완전 정리
  - GitHub에서 이전 커밋 접근 불가(404) 확인 완료

### 이슈/메모
- 수정 파일: `navigator-v5.html`, `ROADMAP.md`, `docs/CHANGELOG.md`, `.gitignore`
- DB 변경: 없음
- 사용자 데이터(Firebase/localStorage)는 UID 기반 비공개로 안전

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 4)

### 작업 내용
- **내장 템플릿 시스템 추가**
  - 프로젝트 템플릿 기능 구현
  - 템플릿 선택 모달에서 내장 템플릿 표시

- **템플릿 시스템에 stageNames 지원 추가**
  - 템플릿에 단계명(stageNames) 저장/적용 가능
  - `saveAsTemplate()` → 프로젝트 단계명 포함
  - `applyTemplate()` → 템플릿 단계명 사용 (없으면 전역 기본값)

- **슬랙 복사 기능 추가**
  - 프로젝트 상세보기에서 슬랙복사 버튼
  - 진행 상태 포함한 체크리스트 텍스트 클립보드 복사

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: 없음 (workTemplates에 stageNames 필드 추가만)
- 템플릿은 사용자 데이터(localStorage/Firebase)로 관리

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 3)

### 작업 내용
- **대시보드 속성명 불일치 버그 수정**
  - 평균 출근/퇴근/출근편차가 항상 `--:--`로 표시되던 버그 수정
  - `avgWorkStart` → `avgWorkArrive`, `avgWorkEnd` → `avgWorkDepart`, `workStartDeviation` → `homeDepartDeviation`

- **라이프 리듬 기록 UX 개선 — 수정/삭제 액션 메뉴**
  - 기록된 버튼 클릭 시 `prompt()` 직행 → 수정/삭제 팝업 메뉴로 변경
  - `showRhythmActionMenu()`, `hideRhythmActionMenu()`, `deleteLifeRhythm()` 추가
  - 모바일 터치 친화적 CSS (`.rhythm-action-menu`)

- **기상/취침 기록 시 목표 대비 즉시 피드백**
  - `getTimeDiffMessage()` 헬퍼 함수 추가
  - 토스트 예시: "☀️ 기상 07:15 (목표보다 15분 늦음)", "🌙 취침 22:50 (목표보다 10분 일찍 👍)"
  - 취침 자정 넘김 처리 (00:00~05:00 기록 시 전날 밤 기준)

- **대시보드에 기상/취침 목표 대비 통계 추가**
  - `getLifeRhythmStats()` 확장: `avgWakeUp`, `avgBedtime`, `wakeTimeDiff`, `bedtimeDiff`, `targetSleepHours`
  - 수면 섹션에 "평균 기상/취침 + 목표 대비 ±분" 행 추가
  - ±15분 이내 = 녹색(good), 그 외 = 빨강(bad)
  - "목표 대비" 수면 시간: 7시간 하드코딩 → 설정 기반 `targetSleepHours`로 개선

### 이슈/메모
- 수정 파일: `navigator-v5.html` (단일 파일)
- DB 변경: 없음

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 2)

### 작업 내용
- **본업 프로젝트 '보류' 기능 추가** (`fc38a74`)
  - `onHold` 속성으로 프로젝트 보류/재개 토글
  - 대시보드에 ⏸ 보류 접이식 섹션 추가
  - 상세보기 셀렉터에 보류 optgroup 추가
  - 카드에 보류 뱃지 표시 (색상: #f5576c)
  - `holdWorkProject()` 함수 추가

- **라이프 리듬 UTC 날짜 버그 수정** (`e039d4b`)
  - `toISOString()` (UTC) → `getLocalDateStr()` (로컬 타임존) 전환
  - 한국(UTC+9) 자정~오전9시 사이 리듬 데이터 초기화 현상 해결
  - Firebase 머지 시 동률이면 로컬 데이터 우선 (`>=` → `>`)
  - 기존 UTC 날짜로 저장된 데이터 자동 보정 마이그레이션 추가

### 프롬프트 요약
- 본업 프로젝트에 archived와 유사한 패턴으로 '보류' 기능 요청
- 오늘의 리듬이 초기화되는 버그 리포트 → UTC 날짜 문제 발견 및 수정

### 이슈/메모
- `toISOString().split('T')[0]`은 UTC 기준이라 한국 시간대에서 날짜 불일치 발생
- 라이프 리듬 외 다른 기능(수익, 캘린더 등)에도 동일한 UTC 문제가 잠재적으로 존재할 수 있음

### 다음에 할 것
- 다른 기능의 UTC 날짜 사용 부분도 점검 필요 (수익 대시보드, 캘린더, 완료 히스토리 등)
- SVG 아이콘 교체 (P2)
- 접근성 개선 (P2)
- 포모도로 통합 (P2)

## [2026-02-04] (세션 1)

### 작업 내용
- 완료 태스크 일별 갱신 (오늘 완료만 표시, 오래된 완료 자동 정리)
- 동기화 토스트 추가 (업로드 성공/다른 기기 수신 알림)
- 멀티디바이스 동기화 핑퐁 루프 및 데이터 누락 수정

## [2026-02-03]

### 작업 내용
- 더보기 드롭다운 버그 수정
- 일상/가족 탭 수정/삭제 버튼 추가
- 반복 작업 완료 누적 버그 수정
- 본업 프로젝트 단계 커스터마이징 (추가/수정/삭제)
- 본업 중분류 일정 설정 기능
- 빠른 수정 모달 추가
- 완료 게이지 버그 수정
- 일상/가족 탭에 완료 섹션 추가
- 코드 최적화 (디바운스, 검증, 중복 제거)
- 라이프 리듬 트래커 6개 항목 확장
- 자산관리 수익 연동
- 데이터 내보내기/가져오기
