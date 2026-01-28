# 🔄 Navigator - Git 작업 가이드

> 매일 사용하는 명령어 모음

---

## 🎯 핵심 3줄 (외워두세요)

```bash
git pull    # 아침: 집/회사에서 한 작업 가져오기
git add .   # 작업 후: 변경사항 스테이징
git push    # 저녁: 변경사항 GitHub에 올리기
```

**이것만 알아도 90% 해결됩니다.**

---

## 📅 일상 워크플로우

### 아침 (작업 시작 전)

```bash
# 1. 폴더로 이동
cd ~/Documents/navigator-app
# 또는
cd To-do-list-for-adhd

# 2. 최신 코드 가져오기
git pull

# ✅ 이제 작업 시작!
```

**의미**:
- `git pull`: 집/회사 다른 컴퓨터에서 한 작업 가져오기
- 항상 최신 상태로 시작

---

### 저녁 (작업 끝난 후)

```bash
# 1. 변경사항 확인
git status

# 2. 모든 변경사항 추가
git add .

# 3. 커밋 (저장)
git commit -m "오늘 한 작업 설명"

# 4. GitHub에 올리기
git push

# ✅ 끝! 집/회사에서 이어서 가능
```

**의미**:
- `git add .`: 변경된 파일 모두 선택
- `git commit`: 로컬에 저장 (아직 GitHub 안 감)
- `git push`: GitHub에 업로드

---

## 🏠 처음 시작 (한 번만)

### 회사 컴퓨터에서 (이미 폴더 있음)

```bash
# 1. 폴더로 이동
cd ~/Documents/navigator-project

# 2. Git 초기화
git init

# 3. 파일 추가
git add .

# 4. 첫 커밋
git commit -m "v5 프로토타입 완성"

# 5. GitHub 연결
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 6. 업로드
git branch -M main
git push -u origin main

# ✅ 완료! 이제 일상 워크플로우만 사용
```

---

### 집 컴퓨터에서 (처음)

```bash
# 1. 원하는 위치로 이동
cd ~/Documents

# 2. GitHub에서 복사 (Clone)
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 3. 폴더 들어가기
cd To-do-list-for-adhd

# ✅ 완료! 이제 일상 워크플로우 사용
```

---

## 📝 커밋 메시지 가이드

### 좋은 예
```bash
git commit -m "Next-Action 화면 완성"
git commit -m "우선순위 계산 버그 수정"
git commit -m "대시보드 통계 추가"
git commit -m "스와이프 제스처 구현"
```

### 나쁜 예
```bash
git commit -m "수정"        # ❌ 뭘 수정?
git commit -m "ㅁㄴㅇㄹ"     # ❌ 알 수 없음
git commit -m "asdf"        # ❌ 의미 없음
```

### 패턴
```
[동사] [대상]

추가: "작업 수정 기능 추가"
수정: "우선순위 계산 로직 개선"
삭제: "불필요한 주석 제거"
버그: "입력 포커스 버그 수정"
```

---

## 🔍 자주 쓰는 명령어

### 상태 확인
```bash
# 현재 상태 보기
git status

# 변경 내역 보기
git log --oneline

# 최근 5개 커밋
git log -5
```

### 변경사항 확인
```bash
# 뭐가 바뀌었는지 보기
git diff

# 특정 파일만
git diff navigator-v5.html
```

### 브랜치 (나중에)
```bash
# 현재 브랜치 확인
git branch

# 새 브랜치 만들기
git branch feature-name

# 브랜치 전환
git checkout feature-name
```

---

## 🚨 자주 하는 실수 & 해결

### 실수 1: 커밋 안 하고 pull

**증상**:
```
error: Your local changes would be overwritten by merge.
```

**해결**:
```bash
# 옵션 A: 지금 커밋
git add .
git commit -m "작업 중"
git pull

# 옵션 B: 임시 저장
git stash
git pull
git stash pop
```

---

### 실수 2: 커밋 메시지 오타

**증상**:
```
git commit -m "작얽 추가"  # 오타!
```

**해결**:
```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "작업 추가"

# 아직 push 안 했으면 OK
# push 했으면 그냥 두기 (큰 문제 아님)
```

---

### 실수 3: 충돌 (Conflict)

**증상**:
```
CONFLICT (content): Merge conflict in navigator-v5.html
```

**해결**:
```bash
# 1. 파일 열어서 확인
code navigator-v5.html

# 2. <<<<<<< ======= >>>>>>> 표시 찾기
# 3. 원하는 버전 선택하고 표시 삭제
# 4. 저장

# 5. 해결 완료 표시
git add navigator-v5.html
git commit -m "충돌 해결"
git push
```

**예시**:
```html
<<<<<<< HEAD
<div>회사에서 작업</div>
=======
<div>집에서 작업</div>
>>>>>>> origin/main
```

**수정 후**:
```html
<div>회사에서 작업</div>
<!-- 또는 -->
<div>집에서 작업</div>
<!-- 또는 둘 다 유지 -->
```

---

### 실수 4: push 거부됨

**증상**:
```
! [rejected] main -> main (non-fast-forward)
```

**해결**:
```bash
# 누군가 먼저 push 했음 (또는 다른 컴퓨터에서)
# 그것 먼저 가져오기
git pull

# 충돌 없으면 자동 해결
# 충돌 있으면 위 "실수 3" 참고

# 다시 push
git push
```

---

## 🎨 GitHub 웹에서 확인

### 코드 보기
```
https://github.com/clusteruni-debug/To-do-list-for-adhd
```

### 커밋 히스토리
```
https://github.com/clusteruni-debug/To-do-list-for-adhd/commits/main
```

### 파일 다운로드
```
Code 버튼 → Download ZIP
```

---

## 💡 팁 & 트릭

### Tip 1: 자주 커밋하기
```bash
# 나쁜 예
오전 작업 → 저녁 한 번에 커밋 (❌ 히스토리 추적 어려움)

# 좋은 예
기능 하나 완성 → 커밋
버그 수정 → 커밋
작은 변경 → 커밋
```

### Tip 2: .gitignore 활용
```bash
# .gitignore 파일에 추가
node_modules/
.DS_Store
.env
*.log
```

### Tip 3: 브랜치 전략 (나중에)
```bash
# main: 안정 버전
# develop: 개발 중
# feature/xxx: 새 기능

git checkout -b feature/dashboard
# 작업
git commit -m "대시보드 추가"
git checkout main
git merge feature/dashboard
```

---

## 🆘 응급 상황

### 전부 날아갔어요!
```bash
# GitHub에 있으면 괜찮음
rm -rf To-do-list-for-adhd
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# ✅ 복구 완료
```

### Git 완전히 망가졌어요
```bash
# 폴더만 남기고 Git 제거
rm -rf .git

# 다시 초기화
git init
git add .
git commit -m "재시작"
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git
git push -f origin main  # ⚠️ 강제 push (주의)
```

### 실수로 삭제했어요
```bash
# 커밋 전이면 복구 가능
git checkout -- navigator-v5.html

# 커밋 후면 히스토리에서 복구
git log  # 커밋 찾기
git checkout <commit-hash> -- navigator-v5.html
```

---

## 📚 더 배우고 싶다면

### 추천 자료
1. GitHub 공식 가이드: https://docs.github.com
2. Git 간단 가이드: https://rogerdudler.github.io/git-guide/
3. Visual Git: https://learngitbranching.js.org/

### 명령어 치트시트
```bash
# 자주 쓰는 것
git status      # 상태 확인
git add .       # 모두 추가
git commit      # 커밋
git push        # 업로드
git pull        # 다운로드

# 가끔 쓰는 것
git log         # 히스토리
git diff        # 변경사항
git branch      # 브랜치
git checkout    # 전환

# 거의 안 쓰는 것
git reset       # 되돌리기
git revert      # 취소
git stash       # 임시 저장
git merge       # 병합
```

---

## 🎯 요약: 매일 하는 3단계

```bash
# 아침
cd ~/Documents/To-do-list-for-adhd
git pull

# [작업]

# 저녁
git add .
git commit -m "오늘 한 일"
git push
```

**이것만 외우세요!**

---

**문제 생기면 TROUBLESHOOTING.md 참고**
