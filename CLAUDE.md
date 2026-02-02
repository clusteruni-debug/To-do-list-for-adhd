# Navigator - ADHD 친화적 할일 관리

> 📅 마지막 업데이트: 2026-02-02
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

### 최근 보안 수정 (2026-02-02)
- ✅ 보안 헤더 추가 (X-Frame-Options, X-Content-Type-Options)
- ✅ Firebase 보안 규칙 권장사항 주석 추가
- ✅ `escapeHtml()` XSS 방지 함수 추가
- ✅ `safeParseJSON()` 안전한 JSON 파싱 함수 추가
- ✅ `validateTask()`, `validateTasks()` 데이터 검증 함수 추가

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

## 주요 기능
- 카테고리별 작업 관리 (부업, 크립토, 공부 등)
- 예상 수익/소요시간 추적
- Firebase 클라우드 동기화
- 서브태스크, 습관 트래커, 주간 리뷰
