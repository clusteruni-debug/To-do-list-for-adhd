# ⚡ Navigator - 생존형 할일 관리

> ADHD 친화적 할일 관리 앱: "생각 안 하고 실행하게"

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-5.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

---

## 🎯 무엇을 해결하는가?

### 문제
- **"할일 목록 → 실제 행동" 간극**: 목록은 있는데 하지 않음
- **우선순위 판단 피로**: 중요도가 감정/피로도에 따라 임의로 바뀜
- **기록이 일이 되는 문제**: Notion 관리 자체가 부담
- **ADHD 특성**: 실행 기능 장애, 멀티태스킹 어려움

### 해결
- ✅ **자동 우선순위 계산**: 마감시간, 카테고리, ROI 기반 자동 정렬
- ✅ **Next-Action 단일 표시**: 지금 할 것 하나만 크게
- ✅ **시간대별 자동 모드**: 회사/생존/여유 모드 자동 전환
- ✅ **판단 최소화**: 스와이프로 완료/삭제, 햅틱 피드백

---

## 🚀 현재 상태 (v5)

### ✅ 완료된 기능
- [x] 빠른 추가 (제목만 입력)
- [x] 상세 추가 (카테고리별 입력 필드)
- [x] 작업 수정/삭제
- [x] 완료/완료 취소
- [x] 스와이프 제스처 (완료/삭제)
- [x] 자동 우선순위 계산
- [x] 시간대별 모드 (회사/생존/여유)
- [x] 셔틀 모드 전환
- [x] 수면 카운트다운 (22시 이후)
- [x] 마감 임박 시각 강조 (🔴 3시간, 🟠 24시간)
- [x] 대시보드 (통계, 카테고리별 현황)
- [x] 완료 작업 보기
- [x] JSON 백업/복원
- [x] 에러 처리 및 토스트 알림

### 🔄 진행 중
- [ ] Next.js로 전환
- [ ] Vercel 배포
- [ ] 모바일/PC 동기화

### 📅 예정
- [ ] Supabase 연동 (실시간 동기화)
- [ ] PWA 설정 (오프라인, 푸시 알림)
- [ ] 텔레그램 어그리게이터 연동
- [ ] X 활동 트래커

---

## 💻 기술 스택

### 현재 (v5 - HTML 프로토타입)
- **Frontend**: Vanilla JavaScript
- **Storage**: LocalStorage
- **Deployment**: 로컬 HTML 파일

### 예정 (v6+ - Production)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **PWA**: next-pwa

---

## 🎨 주요 기능

### 1. Next-Action 화면
```
지금 할 것 하나만 크게 표시
→ 판단 제거
→ 실행만 하면 됨
```

### 2. 자동 우선순위 계산
```javascript
우선순위 = f(
  마감시간,      // 3시간 내: +100점
  카테고리,      // 본업: +40, 부업: +35, 일상: +25
  ROI,           // 수익/시간 (부업만)
  소요시간       // 10분 이하: +10
)
```

### 3. 시간대별 모드
- **회사 (11-20시)**: 본업만 표시
- **생존 (22-24시, 셔틀 실패)**: 15분 이하 + 긴급만
- **여유 (19-24시, 셔틀 성공)**: 전체 표시

### 4. 스와이프 제스처
- ← 왼쪽: 완료
- → 오른쪽: 삭제
- 햅틱 피드백

---

## 📱 사용법

### 설치
```bash
# 1. 저장소 클론
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git
cd To-do-list-for-adhd

# 2. 브라우저로 열기
open navigator-v5.html  # Mac
start navigator-v5.html # Windows
```

### 기본 사용
1. **빠른 추가**: 제목 입력 → Enter
2. **상세 추가**: "상세 옵션 펼치기" → 모든 정보 입력
3. **완료**: ✓ 버튼 or 왼쪽 스와이프
4. **수정**: ✏️ 버튼
5. **삭제**: × 버튼 or 오른쪽 스와이프

### 데이터 관리
- **백업**: 📥 내보내기 → JSON 다운로드
- **복원**: 📤 가져오기 → JSON 업로드

---

## 📖 문서

프로젝트 이해를 위한 필수 문서:

1. **[CONTEXT.md](./CONTEXT.md)** ⭐ - 전체 맥락 및 배경
2. **[ROADMAP.md](./ROADMAP.md)** ⭐ - 개발 로드맵
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 기술 설계
4. **[DECISIONS.md](./DECISIONS.md)** - 설계 결정 기록
5. **[WORKFLOW.md](./WORKFLOW.md)** - Git 작업 가이드
6. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 문제 해결

---

## 👤 사용자 프로필

이 앱은 다음과 같은 사용자를 위해 설계되었습니다:

- **ADHD**: 실행 기능 장애, 우선순위 판단 어려움
- **시간 제약**: 육아 + 본업 + 부업으로 시간 압박
- **높은 인지 부하**: 판단 피로 최소화 필요
- **즉각적 피드백 선호**: 시각적/촉각적 피드백

자세한 내용: [CONTEXT.md](./CONTEXT.md)

---

## 🤝 기여

이 프로젝트는 현재 개인 프로젝트입니다.

### 개발 환경 설정
```bash
# 1. 저장소 포크 및 클론
git clone https://github.com/YOUR_USERNAME/To-do-list-for-adhd.git

# 2. 브랜치 생성
git checkout -b feature/your-feature

# 3. 변경사항 커밋
git commit -am "Add feature"

# 4. 푸시
git push origin feature/your-feature

# 5. Pull Request 생성
```

---

## 📝 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 📞 연락

- **GitHub**: [@clusteruni-debug](https://github.com/clusteruni-debug)
- **Issues**: [GitHub Issues](https://github.com/clusteruni-debug/To-do-list-for-adhd/issues)

---

## 🙏 감사

- **Claude (Anthropic)**: 전체 개발 지원
- **바이브코딩**: 4일차 비전공자의 도전

---

**Built with ❤️ for people with ADHD, by someone with ADHD**
