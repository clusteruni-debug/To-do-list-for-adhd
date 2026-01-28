# 🚀 Navigator - 첫 설정 가이드

> 회사 컴퓨터에서 GitHub에 올리기

---

## 📋 준비물

- ✅ 다운로드한 파일들 (outputs 폴더)
- ✅ GitHub 계정
- ✅ 레포지토리: `clusteruni-debug/To-do-list-for-adhd`

---

## 🎯 Step 1: 폴더 준비

### 1-1. 파일 정리

```bash
# 1. 원하는 위치에 폴더 만들기
mkdir ~/Documents/navigator-app
cd ~/Documents/navigator-app

# 2. 다운로드한 파일들 모두 복사
# (Finder/탐색기에서 드래그&드롭)

# 3. 확인
ls
```

**있어야 할 파일들**:
```
✅ navigator-v5.html     # 메인 앱
✅ manifest.json         # PWA 설정 (v5.1 추가)
✅ sw.js                 # Service Worker (v5.1 추가)
✅ README.md
✅ CONTEXT.md
✅ ROADMAP.md
✅ ARCHITECTURE.md
✅ DECISIONS.md
✅ WORKFLOW.md
✅ SETUP-GUIDE.md
✅ TROUBLESHOOTING.md
✅ .gitignore
```

---

## 🔧 Step 2: Git 초기화

### 2-1. Git 설정 (처음 한번만)

```bash
# Git 사용자 정보 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 확인
git config --list
```

### 2-2. 저장소 초기화

```bash
# 폴더로 이동 (이미 있다면 skip)
cd ~/Documents/navigator-app

# Git 초기화
git init

# 상태 확인
git status
```

---

## 📤 Step 3: GitHub에 올리기

### 3-1. 파일 추가

```bash
# 모든 파일 스테이징
git add .

# 확인
git status

# 첫 커밋
git commit -m "v5 프로토타입 완성 + 문서 추가"
```

### 3-2. GitHub 연결

```bash
# 원격 저장소 추가
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 확인
git remote -v
```

### 3-3. Push!

```bash
# 브랜치 이름 설정
git branch -M main

# GitHub에 업로드
git push -u origin main
```

**결과**:
```
✅ Enumerating objects: ...
✅ Counting objects: ...
✅ Writing objects: ...
✅ Total ... pushed
```

---

## 🎉 Step 4: 확인

### 4-1. GitHub 웹에서 확인

```
https://github.com/clusteruni-debug/To-do-list-for-adhd
```

**보여야 할 것**:
- ✅ navigator-v5.html
- ✅ README.md
- ✅ 모든 .md 파일들
- ✅ 커밋 히스토리

### 4-2. 앱 실행 테스트

```bash
# 브라우저로 열기
open navigator-v5.html  # Mac
start navigator-v5.html # Windows
```

---

## 🏠 Step 5: 집 컴퓨터 설정

### 5-1. Clone

```bash
# 원하는 위치로 이동
cd ~/Documents

# GitHub에서 복사
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 폴더 들어가기
cd To-do-list-for-adhd

# 확인
ls
```

---

## 🔄 Step 6: 매일 사용하기

### 아침 (작업 시작 전)

```bash
cd ~/Documents/navigator-app  # 또는 To-do-list-for-adhd
git pull
```

### 저녁 (작업 끝난 후)

```bash
git add .
git commit -m "오늘 한 작업"
git push
```

**이게 전부입니다!**

---

## 🆘 문제 생기면

### Push 거부됨

```bash
git pull
# 충돌 해결
git push
```

### 뭔가 꼬였어요

```bash
# WORKFLOW.md 참고
# 또는
# TROUBLESHOOTING.md 참고
```

---

## 📱 모바일에서 보기

### 임시 방법 (Phase 1)

```bash
# 1. GitHub에서 파일 보기
https://github.com/clusteruni-debug/To-do-list-for-adhd/blob/main/navigator-v5.html

# 2. Raw 버튼 클릭

# 3. 주소 복사

# 4. htmlpreview 사용
https://htmlpreview.github.io/?[복사한주소]

# ⚠️ 제대로 안 될 수 있음
```

### 정식 방법 (Phase 2)

```bash
# Vercel 배포 후
https://navigator.vercel.app
→ 모바일/PC 둘 다 접속
```

---

## ✅ 체크리스트

설정 완료 확인:

- [ ] Git 초기화 완료
- [ ] GitHub에 push 완료
- [ ] GitHub 웹에서 파일 확인
- [ ] navigator-v5.html 실행 확인
- [ ] 작업 추가/완료 테스트
- [ ] 집 컴퓨터에서 clone 완료 (있다면)

---

## 🎓 다음 단계

### Phase 2 준비

```bash
# ROADMAP.md 읽기
# Phase 2: Next.js 전환 계획 확인

# Claude Code로 시작
# 별도 대화에서 진행
```

---

## 💡 팁

### Tip 1: 자주 커밋

```bash
# 좋은 습관
오전 작업 → 커밋
점심 후 → 커밋
저녁 → 커밋
```

### Tip 2: 의미있는 메시지

```bash
# 좋은 예
git commit -m "대시보드 통계 추가"

# 나쁜 예
git commit -m "수정"
```

### Tip 3: 매일 백업

```bash
# 앱에서
📥 내보내기 → JSON 저장

# Git으로
git push → GitHub 자동 백업
```

---

## 🎉 완료!

**축하합니다! Git 설정 완료!**

이제:
- ✅ 회사/집 어디서든 작업 가능
- ✅ 히스토리 추적 가능
- ✅ 안전한 백업
- ✅ Claude Code로 이어서 개발 가능

---

**다음**: WORKFLOW.md로 일상 작업 시작!
