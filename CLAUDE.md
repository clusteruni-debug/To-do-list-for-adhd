# Navigator - ADHD 친화적 할일 관리

> 📅 마지막 업데이트: 2026-02-02 22:00
> 상태: 🟢 운영중

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

### Firebase Security Rules (권장)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 프로젝트 개요
- **목적**: ADHD 친화적 할일 관리, 예상 수익 추적, 시간 관리
- **스택**: HTML + Vanilla JS + Firebase (Auth/Firestore)
- **배포**: GitHub Pages
- **URL**: https://clusteruni-debug.github.io/To-do-list-for-adhd/navigator-v5.html

## 파일 구조
```
todolist/
├── navigator-v5.html    # 메인 앱 (단일 파일)
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA 매니페스트
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

### 자산관리 ↔ Navigator (예정)
```
Navigator  ──(부업 Task 완료 + 수익)──▶  자산관리 크립토 수익 기록
```
- **상태**: 🔵 계획중
- **연동 방식**: Firebase 공유 또는 API 호출

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
| P0 | 수익 대시보드 | 월별/주별 수익 그래프, 카테고리별 비교 | 🔴 |
| P0 | 마감일 푸시 알림 | 브라우저 알림 스케줄링 (D-1, 당일) | 🔴 |
| P1 | 데이터 내보내기 | JSON/CSV 백업/복원 기능 | 🔴 |
| P1 | 온보딩 가이드 | 첫 사용자 기능 발견 개선 | 🔴 |
| P2 | 주간/월간 리포트 | 완료율, 수익 요약 자동 생성 | 🔴 |
| P2 | 자산관리 연동 | 완료 Task 수익 → 자산관리 자동 기록 | 🔴 |

### UX 관점 (사용자 경험)

| 우선순위 | 기능 | 설명 | 상태 |
|---------|------|------|------|
| P0 | 퀵입력 카테고리 | `#부업 제목` 형식으로 카테고리 지정 | 🔴 |
| P1 | 탭 구조 개선 | 6개 → 5개 축소 (더보기 메뉴) | 🔴 |
| P1 | Task 카드 간소화 | 액션 버튼 스와이프/롱프레스로 숨김 | 🔴 |
| P1 | 키보드 단축키 | n=추가, Enter=완료, e=편집 | 🔴 |
| P2 | 접근성 개선 | aria-label, 포커스 스타일, 색상 대비 | 🔴 |
| P2 | 포모도로 통합 | 25분 집중 + 5분 휴식 사이클 | 🔴 |

### Design 관점 (비주얼)

| 우선순위 | 기능 | 설명 | 상태 |
|---------|------|------|------|
| P0 | 8pt 스페이싱 | 마진/패딩 8의 배수로 통일 | 🔴 |
| P1 | 부드러운 다크 | #0a0a0a → #121218 (눈 피로 감소) | 🔴 |
| P1 | 디자인 토큰 | 버튼/카드/radius/shadow 통일 | 🔴 |
| P2 | 카테고리 색상 체계 | 본업/부업/일상/가족 색상 명시화 | 🔴 |
| P2 | SVG 아이콘 | 핵심 UI 이모지 → SVG로 교체 | 🔴 |

---

## ✅ 개선 체크리스트

### Phase 1: Quick Wins (1주)
- [x] 수익 대시보드 추가 (월별 차트) ✅
- [x] 퀵입력 카테고리 프리픽스 (#부업 제목) ✅
- [x] 8pt 스페이싱 그리드 적용 ✅
- [x] 배경색 #0a0a0a → #121218 변경 ✅

### Phase 2: Core UX (2주)
- [x] 마감일 푸시 알림 스케줄링 ✅
- [x] Task 카드 액션 버튼 간소화 ✅
- [ ] 탭 구조 5개로 축소
- [x] 키보드 단축키 추가 ✅

### Phase 3: Design System (1주) ✅ 완료
- [ ] 버튼 컴포넌트 통일 (3종 → 1종 + 변형)
- [x] 카드 radius 통일 (sm/md/lg) ✅
- [x] 그림자 토큰 정의 ✅
- [x] 카테고리 색상 변수화 ✅

### Phase 4: 연동 & 고급 (진행 중)
- [x] telegram-event-bot 연동 완료
- [ ] 자산관리 수익 연동
- [ ] 데이터 내보내기/가져오기
- [ ] 주간 리포트 자동 생성

---

## 🔥 현재 작업 (WIP)

| 작업 | 우선순위 | 상태 |
|------|---------|------|
| 탭 구조 5개로 축소 | P2 | 🔴 대기 |
| 버튼 컴포넌트 통일 | P2 | 🔴 대기 |
| 자산관리 수익 연동 | P2 | 🔴 대기 |

### ✅ 최근 완료
- [x] 디자인 토큰 통일 (카테고리 색상, 그림자)
- [x] 키보드 단축키 추가 (Ctrl+N, Ctrl+D, 1-3 탭 전환)
- [x] 8pt 스페이싱 그리드 적용
- [x] 배경색 부드럽게 변경 (#121218)
- [x] Task 카드 액션 간소화
- [x] 수익 대시보드 (월별/카테고리별)
- [x] 퀵입력 카테고리 (#부업, #본업 등)
- [x] 마감일 푸시 알림 (D-1, D-Day)

---

## 주요 기능 (현재)
- 카테고리별 작업 관리 (본업, 부업, 일상, 가족)
- 예상 수익/소요시간 추적
- Firebase 클라우드 동기화
- 서브태스크, 반복 Task
- 퀵 타이머, 포커스 모드
- 캘린더/히스토리
- telegram-event-bot 연동 (이벤트 → Task)
