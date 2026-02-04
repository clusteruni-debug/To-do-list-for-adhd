# CHANGELOG

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
