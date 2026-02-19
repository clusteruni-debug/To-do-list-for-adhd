# CHANGELOG.md

> Claude Code가 세션 시작 시 읽고 현재 상태를 파악합니다.
> 가장 최근 항목을 맨 위에 작성하세요.

---

## 2026-02-05 — Insights 기반 전면 개선

**상태**: 완료
**브랜치**: 각 프로젝트별 main

### ✅ 완료

#### Insights 분석 & CLAUDE.md 강화
- [x] `/insights` 리포트 분석 (723 세션, 458시간, 682 커밋 데이터)
- [x] 루트 CLAUDE.md에 Insights 추천사항 반영:
  - 민감 데이터 정리 프로토콜 (전수 스캔 → 목록 확인 → 일괄 실행)
  - 세션 프로토콜 강화 (repo 점검, 페이즈 체크포인트, 즉시 커밋)
  - 대규모 작업 가이드 (분할 원칙, 병렬 에이전트, 자동화)
- [x] **능동적 작업 원칙** 신규 섹션 — 모든 프로젝트 CLAUDE.md에 추가:
  - 유사 패턴 전수 수정 (한 곳 고치면 전체 검색 → 함께 제안)
  - 사이드이펙트 예측 & 선제 제안 (구체적 시나리오 + 해결 방안)
  - 난이도 판단 → Ralph Loop 먼저 제안 (10곳 이상 배치 작업)
  - 선제적 품질 보고 (보안/버그/성능/접근성)

#### 적용된 프로젝트 (7개 + 1개 보류)
- [x] article-editor — CLAUDE.md 업데이트 + push
- [x] baby-care — **CLAUDE.md 신규 생성** + push
- [x] web3-budget-v1 — CLAUDE.md 업데이트 + push
- [x] web3-budget-app — CLAUDE.md 업데이트 + push
- [x] telegram-event-bot — CLAUDE.md 업데이트 (절대 규칙/작업 규칙도 신규 추가) + push
- [x] X 분석 — **CLAUDE.md 신규 생성** + push
- [x] myvibe (루트) — CLAUDE.md 업데이트 + push
- [ ] To-do-list-for-adhd — 로컬 반영 완료, 커밋 보류 (별도 작업 중)

#### Custom Skills 생성 (개인, 모든 프로젝트 적용)
- [x] `/security-scan` — 민감 데이터 전수 스캔
- [x] `/clean-history` — git 히스토리 정리
- [x] `/full-deploy` — GitHub Pages 배포 + 검증
- [x] `/session-wrap` — 세션 마무리 (CHANGELOG + 커밋)
- [x] `/ralph-loop` — 될 때까지 반복 (자율 루프, 플러그인 없이 Stop hook 구현)

#### Hooks 설정
- [x] `post-edit-security-check.ps1` — innerHTML escapeHtml() 누락 감지
- [x] `post-edit-sensitive-scan.ps1` — API 키/비밀번호 등 민감 패턴 감지
- [x] `settings.local.json` — PostToolUse + Stop hook 설정

#### 크로스 PC 동기화 체계
- [x] Skills + Hooks → GitHub private repo: `Claude-skills.git`
- [x] `install-hooks.ps1` — 프로젝트별 hooks 일괄 설치 스크립트
- [x] `settings-template.json` — hooks 설정 템플릿

### 📋 다음
- [ ] To-do-list-for-adhd CLAUDE.md 커밋 + push (작업 완료 후)
- [ ] 집 PC에서 `git clone Claude-skills` + `install-hooks.ps1` 실행
- [ ] 각 프로젝트 `git pull`로 CLAUDE.md 동기화
- [ ] 실제 작업 세션에서 능동적 작업 원칙 동작 검증

### 💡 메모
- Ralph Loop은 플러그인 설치 없이 Stop hook + PowerShell 스크립트로 구현
- Skills repo(`Claude-skills.git`)로 스킬 수정 시 양쪽 PC 동기화 가능
- `install-hooks.ps1 -All` 옵션으로 모든 프로젝트에 hooks 일괄 적용

---

## 2026-02-04

**상태**: 완료
**브랜치**: 각 프로젝트별 (main / v2-unified-portfolio)

### ✅ 완료
- [x] 루트 CLAUDE.md 업데이트 (범용 템플릿 → 실전 간결 규칙)
- [x] article-editor CLAUDE.md 병합 (새 규칙 + 기존 보안 체크리스트 유지)
- [x] To-do-list-for-adhd CLAUDE.md 병합 (새 규칙 + 기존 연동/로드맵/버그 유지)
- [x] web3-budget-app CLAUDE.md 병합 (새 규칙 + 기존 세션 상태/요청 방법 유지)
- [x] web3-budget-v1 CLAUDE.md 신규 생성 (프로젝트 정보 + 새 규칙)
- [x] 4개 프로젝트 모두 GitHub 커밋 + 푸시 완료

### 새 규칙에 추가된 핵심 섹션
- 절대 규칙 (위반 시 작업 중단)
- 구현 완결성 (기능 = UI + 로직 + DB + 피드백 + 조회)
- 변경 전 영향도 분석 (필수)
- 플랜 형식 통일
- 에러 대응 단계화 (1-2회→3회→5회)
- 세션 프로토콜 (시작/종료)

### 📋 다음
- [ ] X 분석 프로젝트는 일회성이라 제외 (필요시 추가)
- [ ] 각 프로젝트에서 실제 개발 세션 진행 시 새 규칙 동작 확인

### 💡 메모
- 루트 CLAUDE.md는 범용 템플릿 겸 가이드 역할
- 각 프로젝트 CLAUDE.md는 프로젝트 고유 내용 + 공통 규칙 병합 구조
- web3-budget-v1은 기존 CLAUDE_CODE_GUIDE.md가 별도로 존재 (삭제하지 않음)
