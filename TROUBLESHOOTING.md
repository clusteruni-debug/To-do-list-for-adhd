# 🔧 Navigator - 문제 해결 가이드

> 자주 겪는 문제와 해결 방법

---

## 🚨 긴급 상황

### 🔥 앱이 안 열려요 (검은 화면)

**증상**: navigator-v5.html 열면 검은 화면만

**원인**:
1. JavaScript 에러
2. 브라우저 호환성
3. 파일 손상

**해결**:
```bash
# 1. 브라우저 콘솔 확인
F12 (개발자 도구) → Console 탭 → 에러 확인

# 2. 다른 브라우저로 열어보기
Chrome, Safari, Firefox 시도

# 3. 파일 다시 다운로드
GitHub에서 최신 버전 받기
```

---

### 🔥 데이터가 날아갔어요

**증상**: 작업 목록이 전부 사라짐

**원인**:
1. LocalStorage 삭제됨
2. 브라우저 캐시 삭제
3. 다른 브라우저/시크릿 모드

**해결**:
```bash
# 1. JSON 백업 있으면
📤 가져오기 버튼 → 백업 파일 선택 → 복구

# 2. 백업 없으면
😢 복구 불가능
→ 앞으로 자주 백업하기

# 3. 예방
매일 저녁 📥 내보내기 클릭
```

---

### 🔥 작업 추가가 안 돼요

**증상**: + 버튼 눌러도 안 됨

**원인**:
1. 제목 입력 안 함
2. JavaScript 에러
3. LocalStorage 꽉 참

**해결**:
```bash
# 1. 제목 입력했는지 확인
빈 칸 → 토스트 알림 "제목을 입력하세요"

# 2. 콘솔 에러 확인
F12 → Console → 에러 메시지

# 3. LocalStorage 용량 확인
F12 → Application → Local Storage
→ 5MB 넘으면 오래된 작업 삭제
```

---

## 💻 Git 문제

### Git Push 거부됨

**증상**:
```
! [rejected] main -> main (non-fast-forward)
error: failed to push some refs
```

**원인**: 다른 곳에서 먼저 push함

**해결**:
```bash
# 1. 최신 코드 가져오기
git pull

# 2. 충돌 없으면 자동 해결됨
git push

# 3. 충돌 있으면 (아래 참고)
```

---

### Git 충돌 (Conflict)

**증상**:
```
CONFLICT (content): Merge conflict in navigator-v5.html
Automatic merge failed; fix conflicts and then commit.
```

**해결**:
```bash
# 1. 충돌 파일 열기
code navigator-v5.html

# 2. <<<<<<< ======= >>>>>>> 찾기
<<<<<<< HEAD
내 코드
=======
GitHub 코드
>>>>>>> origin/main

# 3. 선택하기
# 옵션 A: 내 코드만
내 코드

# 옵션 B: GitHub 코드만
GitHub 코드

# 옵션 C: 둘 다
내 코드
GitHub 코드

# 4. 표시 삭제 후 저장

# 5. 완료
git add .
git commit -m "충돌 해결"
git push
```

**팁**: VSCode 사용하면 버튼으로 해결 가능
```
Accept Current Change
Accept Incoming Change
Accept Both Changes
```

---

### Git Clone 실패

**증상**:
```
fatal: could not read Username
```

**원인**: GitHub 인증 문제

**해결**:
```bash
# 옵션 A: Personal Access Token
GitHub → Settings → Developer settings
→ Personal access tokens → Generate new token
→ repo 체크 → 생성
→ 토큰 복사

git clone https://TOKEN@github.com/clusteruni-debug/To-do-list-for-adhd.git

# 옵션 B: SSH (추천)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# GitHub → Settings → SSH Keys → Add
git clone git@github.com:clusteruni-debug/To-do-list-for-adhd.git
```

---

## 📱 PWA & 알림 문제 (v5.1 추가)

### 알림이 안 와요

**증상**: 마감 알림이 오지 않음

**원인**:
1. 알림 권한 거부
2. 브라우저 백그라운드 종료
3. 5분 간격 체크 사이에 확인

**해결**:
```bash
# 1. 알림 권한 확인
브라우저 설정 → 사이트 설정 → 알림 → 허용

# 2. 앱이 열려있어야 함
현재 버전은 서버 푸시가 아님
→ Phase 3에서 개선 예정

# 3. 페이지 새로고침
F5 또는 Cmd+R
```

---

### 홈 화면에 설치가 안 돼요

**증상**: "홈 화면에 추가" 옵션이 없음

**원인**:
1. HTTPS 아님 (로컬 파일)
2. manifest.json 문제
3. 아이콘 없음

**해결**:
```bash
# Phase 2 (Vercel 배포) 후 가능
현재는 로컬 파일이라 설치 불가
→ Phase 2에서 해결 예정

# 임시 방법 (PC)
Chrome → 더보기 → 바로가기 만들기
```

---

### Service Worker 에러

**증상**: 콘솔에 SW 에러

**해결**:
```bash
# 1. 캐시 삭제
F12 → Application → Clear Storage → Clear site data

# 2. SW 재등록
브라우저 재시작

# 3. 파일 확인
sw.js가 navigator-v5.html과 같은 폴더에 있어야 함
```

---

## 📱 모바일 문제

### 스와이프가 안 돼요

**증상**: 좌우로 밀어도 반응 없음

**원인**:
1. 터치 이벤트 미지원
2. 밀기 부족 (100px 이상 필요)
3. 브라우저 제스처 충돌

**해결**:
```bash
# 1. 충분히 밀기
100px 이상 (화면 1/3 정도)

# 2. 버튼 사용
✓ 완료 버튼
× 삭제 버튼

# 3. 다른 브라우저
Safari → Chrome 시도
```

---

### 진동이 안 돼요

**증상**: 완료해도 진동 없음

**원인**:
1. 브라우저 권한 없음
2. 무음 모드
3. 진동 미지원

**해결**:
```bash
# 1. 브라우저 권한 확인
설정 → Safari/Chrome → 진동 허용

# 2. 무음 모드 해제
물리 버튼 확인

# 3. 진동 미지원
일부 브라우저/기기는 미지원
→ 정상임
```

---

### 화면이 작아요

**증상**: 모바일에서 글씨 너무 작음

**원인**: 브라우저 배율 설정

**해결**:
```bash
# iOS
설정 → 디스플레이 및 밝기 → 텍스트 크기

# Android
설정 → 디스플레이 → 글꼴 크기

# 브라우저
확대/축소 (핀치)
```

---

## 🐛 버그 & 오류

### "못 해도 괜찮아" 안 뜨는데요?

**증상**: 0개 완료해도 격려 메시지 없음

**원인**: 작업이 아예 없음

**해결**:
```bash
# 작업 추가 후 0개 완료하면 뜸
작업 1개 추가 → 안 하고 기다리기
→ "못 해도 괜찮아" 메시지
```

---

### 시간이 안 흘러가요

**증상**: 수면 카운트다운이 멈춤

**원인**: setInterval 중단됨

**해결**:
```bash
# 새로고침
F5 또는 Cmd+R

# 브라우저 재시작
완전 종료 후 재실행
```

---

### 우선순위가 이상해요

**증상**: 중요한 게 밑으로 감

**원인**:
1. 마감시간 없음
2. 카테고리가 낮음
3. 알고리즘 특성

**해결**:
```bash
# 1. 마감시간 추가
수정 버튼 → 마감시간 설정
→ 우선순위 올라감

# 2. 카테고리 변경
부업 → 본업
→ 점수 +5

# 3. 수동 조정 (나중에)
현재는 수동 불가
Phase 2에서 추가 예정
```

---

## 🖥️ PC 문제

### 전체 리스트가 안 보여요

**증상**: 클릭해도 펼쳐지지 않음

**원인**: v4 이전 버전

**해결**:
```bash
# v5 사용 확인
navigator-v5.html 열어야 함

# 최신 버전 다운로드
GitHub에서 다시 받기
```

---

### 창이 너무 좁아요 (PC)

**증상**: PC 대화면에서 600px로 고정

**원인**: 모바일 우선 설계

**해결**:
```bash
# Phase 2에서 해결 예정
현재는 600px 고정

# 임시 해결: 브라우저 창 줄이기
창 크기 조절
```

---

## ⚙️ 설정 문제

### 셔틀 모드가 자동으로 바뀌어요

**증상**: 설정해도 다시 바뀜

**원인**: LocalStorage 미저장 (버그)

**해결**:
```bash
# v5에서 수정됨
최신 버전 사용 확인

# 여전히 문제면
F12 → Console → 에러 확인
→ GitHub Issue 등록
```

---

## 🔐 보안 문제

### 다른 사람이 내 작업을 볼 수 있나요?

**답변**: 아니요, 불가능합니다.

**이유**:
```
v5 (현재):
- LocalStorage (로컬만)
- 인터넷 안 감
- 완전히 로컬

v6+ (미래):
- Supabase (서버)
- 로그인 필요
- RLS (Row Level Security)
→ 본인 데이터만 접근
```

---

## 📊 성능 문제

### 작업이 100개인데 느려요

**증상**: 렌더링 느림, 버벅임

**원인**: 전체 리렌더링

**해결**:
```bash
# 단기:
오래된 작업 삭제
완료한 작업 삭제

# 장기:
Phase 2에서 React로 전환
→ 성능 크게 개선
```

---

### 브라우저가 느려져요

**증상**: 앱 열면 전체가 느림

**원인**:
1. LocalStorage 용량 초과
2. 메모리 누수
3. 백그라운드 탭 많음

**해결**:
```bash
# 1. LocalStorage 정리
불필요한 작업 삭제

# 2. 브라우저 재시작
완전 종료 후 재실행

# 3. 백그라운드 탭 닫기
사용 안 하는 탭 정리
```

---

## 🆘 복구 안 되는 문제

### 정말 모든 데이터가 날아갔어요

**증상**: 백업도 없고, 복구 불가

**해결**:
```bash
# 1. 받아들이기
😢 복구 불가능
LocalStorage는 백업 없음

# 2. 다시 시작
새로운 마음으로

# 3. 예방
매일 백업하기!
Phase 3부터 자동 백업
```

---

### Git이 완전히 망가졌어요

**증상**: 뭘 해도 안 됨

**해결**:
```bash
# 핵옵션: Git 리셋
rm -rf .git
git init
git add .
git commit -m "재시작"
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git
git push -f origin main

# ⚠️ 주의: 히스토리 날아감
```

---

## 📞 도움 요청

### 여기 없는 문제예요

**방법 1: GitHub Issue**
```
https://github.com/clusteruni-debug/To-do-list-for-adhd/issues
→ New Issue
→ 문제 상세히 설명
```

**방법 2: Claude에게 물어보기**
```
Claude Web 또는 Claude Code
→ CONTEXT.md 첨부
→ 문제 설명
```

**포함할 정보**:
1. 증상 (무엇이 안 되는가?)
2. 재현 방법 (어떻게 하면 발생?)
3. 에러 메시지 (F12 → Console)
4. 브라우저/OS (Chrome/Safari, Mac/Windows)
5. 버전 (v5인지 확인)

---

## 🛠️ 예방이 최선

### 매일 백업하기
```bash
# 저녁 루틴
1. 📥 내보내기 클릭
2. 파일 저장 (날짜 포함)
3. Google Drive/iCloud 업로드
```

### 자주 커밋하기
```bash
# Git 사용 시
git add .
git commit -m "오늘 작업"
git push

# GitHub에 있으면 안전
```

### 여러 브라우저 테스트
```bash
# 가끔씩
Chrome에서 열어보기
Safari에서 열어보기
→ 둘 다 작동하는지 확인
```

---

## 📚 추가 자료

### 공식 문서
- README.md: 프로젝트 개요
- CONTEXT.md: 전체 맥락
- WORKFLOW.md: Git 사용법

### 커뮤니티
- GitHub Discussions (나중에)
- Discord (나중에)

---

**문제 해결 안 되면 Issue 등록하세요!**

**GitHub Issues**: https://github.com/clusteruni-debug/To-do-list-for-adhd/issues
