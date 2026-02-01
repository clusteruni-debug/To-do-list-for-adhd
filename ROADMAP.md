# 🗺️ Navigator - 개발 로드맵

> "작동하는 쓰레기 → 좋은 코드" 전략

---

## 📍 현재 위치

```
✅ Phase 1: HTML 프로토타입 (완료 + 확장)
⏳ Phase 2: Next.js 전환 (대기)
⏳ Phase 3: 실시간 동기화 (대기)
⏳ Phase 4: PWA 완성 (일부 완료 - 기본 PWA 구현)
⏳ Phase 5: 고급 기능 (일부 완료 - 반복작업, 일정뷰)
```

---

## Phase 1: HTML 프로토타입 ✅ 완료 + 확장

**목표**: 빠른 검증, 즉시 사용

### 완료된 것 (v5 기본)
- [x] 기본 UI/UX
- [x] 빠른/상세 추가
- [x] 작업 수정/삭제
- [x] 완료/완료 취소
- [x] 자동 우선순위 계산
- [x] 시간대별 모드
- [x] 셔틀 모드
- [x] 스와이프 제스처
- [x] 대시보드
- [x] JSON 백업/복원
- [x] 에러 처리
- [x] 주석 완비

### 추가 완료 (v5 확장)
- [x] **반복 작업** - 매일/매주/매월 반복 설정
- [x] **PWA 기본 지원** - manifest.json, Service Worker
- [x] **푸시 알림** - 마감 3시간/1시간 전 알림
- [x] **PC/모바일 반응형** - PC 3컬럼, 모바일 1컬럼
- [x] **일정 탭** - 평일/주말 필터, 날짜별 그룹
- [x] **완료 애니메이션** - 체크 오버레이, 도파민 피드백
- [x] **진행률 표시** - 오늘의 진행률, 연속 달성일
- [x] **현재 시간 표시** - 실시간 시계, 모드별 남은 시간
- [x] **검색/필터** - 카테고리별 필터, 검색 기능

### 추가 완료 (v6 본업 관리)
- [x] **본업 프로젝트 시스템** - 대시보드/상세 뷰 전환
- [x] **6단계 체크박스** - 준비→설계→진행→점검→실행→마무리
- [x] **중분류/체크리스트** - 단계별 하위 작업 관리
- [x] **진행 로그** - 작업별 메모 기록
- [x] **일정 관리** - 프로젝트/단계별 시작일+마감일, D-day 표시
- [x] **참여자 트래커** - 참여 목표/현재 현황
- [x] **템플릿 시스템** - 프로젝트 구조 저장/재사용
- [x] **프로젝트 관리** - 복제/보관/삭제
- [x] **노션용 복사** - 클립보드 복사 기능
- [x] **본업 통합** - 할일 추가 시 프로젝트/단계/중분류 연결
- [x] **빠른 템플릿** - 글쓰기(x-article-editor 연동) 등
- [x] **캐시 최적화** - 네트워크 우선 전략으로 변경

### 배운 것
- React 라이브러리 로딩 어려움
- 상태 관리의 중요성
- 렌더링 vs 이벤트 핸들러
- 에러 처리 필수
- PWA 구조 이해
- 반응형 CSS 그리드

### 다음 단계로 가는 기준
- ✅ 기본 기능 모두 작동
- ✅ 사용자 테스트 완료
- ✅ 피드백 수집
- ✅ 기술부채 정리
- ✅ UX 개선 (완료 피드백, 진행률)
- ✅ PWA 기본 구현

**초기 완료일**: 2026-01-28
**확장 완료일**: 2026-01-28

---

## Phase 2: Next.js 전환 🔄 진행 중

**목표**: 확장 가능한 구조, 제대로 된 코드

**예상 기간**: 3-5일 (Max 사용)

### 2.1 프로젝트 초기 설정 (Day 1)

#### 설정 작업
- [ ] Next.js 14 프로젝트 생성
- [ ] TypeScript 설정
- [ ] Tailwind CSS 설정
- [ ] ESLint/Prettier 설정
- [ ] Git 브랜치 전략
- [ ] Vercel 연결

**명령어**:
```bash
npx create-next-app@latest navigator-app
cd navigator-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**구조**:
```
navigator-app/
├── src/
│   ├── app/              # Next.js 14 App Router
│   ├── components/       # React 컴포넌트
│   ├── lib/             # 유틸리티
│   ├── types/           # TypeScript 타입
│   └── store/           # Zustand 상태 관리
├── public/              # 정적 파일
└── ...config files
```

---

### 2.2 데이터 모델링 (Day 1)

#### Task 타입 정의
```typescript
// src/types/task.ts
export type TaskCategory = '본업' | '부업' | '일상';
export type TaskUrgency = 'urgent' | 'warning' | 'normal' | 'expired';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: string;              // UUID
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  
  // 시간
  deadline?: Date;
  estimatedTime: number;   // 분
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // 메타
  link?: string;
  expectedRevenue?: number;
  
  // 계산값 (런타임)
  priority?: number;
  urgency?: TaskUrgency;
}
```

#### 상태 관리 (Zustand)
```typescript
// src/store/useTaskStore.ts
interface TaskStore {
  // 상태
  tasks: Task[];
  shuttleSuccess: boolean;
  currentMode: Mode;
  
  // 액션
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  
  // 계산
  getFilteredTasks: () => Task[];
  getNextAction: () => Task | null;
}
```

---

### 2.3 UI 컴포넌트 변환 (Day 2-3)

#### 컴포넌트 구조
```
components/
├── layout/
│   ├── Header.tsx
│   ├── TabNav.tsx
│   └── Footer.tsx
├── task/
│   ├── TaskCard.tsx
│   ├── TaskList.tsx
│   ├── NextAction.tsx
│   └── QuickAdd.tsx
├── dashboard/
│   ├── StatsCard.tsx
│   ├── CategoryStats.tsx
│   └── UrgentList.tsx
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Toast.tsx
    └── Modal.tsx
```

#### 변환 우선순위
1. [ ] QuickAdd (가장 많이 씀)
2. [ ] NextAction (핵심 기능)
3. [ ] TaskList (기본 뷰)
4. [ ] Dashboard (통계)
5. [ ] Settings (부가 기능)

---

### 2.4 로직 마이그레이션 (Day 3-4)

#### 우선순위 계산
```typescript
// src/lib/priority.ts
export function calculatePriority(task: Task): number {
  let score = 0;
  
  // 마감시간 점수
  if (task.deadline) {
    const hoursLeft = getHoursLeft(task.deadline);
    if (hoursLeft < 0) score -= 100;
    else if (hoursLeft < 3) score += 100;
    else if (hoursLeft < 24) score += 70;
    else if (hoursLeft < 72) score += 40;
  }
  
  // 카테고리 점수
  const categoryScores = {
    '본업': 40,
    '부업': 35,
    '일상': 25
  };
  score += categoryScores[task.category];
  
  // ROI (부업만)
  if (task.category === '부업' && task.expectedRevenue) {
    const roi = task.expectedRevenue / task.estimatedTime;
    score += Math.min(roi * 0.1, 30);
  }
  
  // 짧은 작업 우대
  if (task.estimatedTime <= 10) score += 10;
  
  return score;
}
```

#### 모드 시스템
```typescript
// src/lib/modes.ts
export function getCurrentMode(
  hour: number,
  shuttleSuccess: boolean
): Mode {
  if (hour >= 11 && hour < 20) return '회사';
  if (shuttleSuccess && hour >= 19 && hour < 24) return '여유';
  if (!shuttleSuccess && hour >= 22 && hour < 24) return '생존';
  if (hour >= 7 && hour < 11) return '출근';
  return '휴식';
}
```

---

### 2.5 스타일링 (Day 4)

#### Tailwind 테마
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#764ba2',
        },
        work: '#667eea',
        crypto: '#f093fb',
        life: '#48bb78',
        urgent: '#f5576c',
        warning: '#ff9500',
      }
    }
  }
}
```

#### 다크모드
- [ ] 시스템 설정 따라가기
- [ ] 수동 토글 (나중에)

---

### 2.6 테스트 & 배포 (Day 5)

#### 로컬 테스트
- [ ] 모든 기능 작동 확인
- [ ] 모바일 반응형 테스트
- [ ] 브라우저 호환성 (Chrome, Safari)

#### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

#### 환경 변수
```
NEXT_PUBLIC_APP_URL=https://navigator.vercel.app
```

---

### 완료 기준 (Phase 2)
- [ ] v5의 모든 기능 작동
- [ ] TypeScript로 타입 안전성
- [ ] 반응형 디자인 (모바일/PC)
- [ ] Vercel 배포 완료
- [ ] URL로 접속 가능
- [ ] 성능 개선 (로딩 < 2초)

**예상 완료**: 2026-02-02 (D+5)

---

## Phase 3: 실시간 동기화 ⏳ 대기

**목표**: 모바일/PC 간 자동 동기화

**예상 기간**: 3-4일

### 3.1 Supabase 설정 (Day 1)

#### 프로젝트 생성
- [ ] Supabase 계정 생성
- [ ] 새 프로젝트 생성
- [ ] Database 스키마 설계

#### 테이블 구조
```sql
-- tasks 테이블
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  deadline TIMESTAMPTZ,
  estimated_time INTEGER,
  link TEXT,
  expected_revenue INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_status ON tasks(status);

-- RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own tasks"
  ON tasks
  FOR ALL
  USING (auth.uid() = user_id);
```

---

### 3.2 인증 (Day 1-2)

#### Supabase Auth 설정
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### 로그인 방법
- [ ] 이메일 + 비밀번호
- [ ] 구글 소셜 로그인
- [ ] 익명 로그인 (나중에)

---

### 3.3 실시간 구독 (Day 2)

#### Realtime 설정
```typescript
// src/store/useTaskStore.ts
useEffect(() => {
  const subscription = supabase
    .channel('tasks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        // 작업 변경 시 자동 업데이트
        handleRealtimeUpdate(payload);
      }
    )
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, [user]);
```

---

### 3.4 오프라인 지원 (Day 3)

#### 로컬 우선 전략
```typescript
// 1. 로컬에 즉시 저장
addTask(newTask);

// 2. 백그라운드 동기화
syncToSupabase(newTask);

// 3. 실패 시 대기열
if (offline) {
  addToSyncQueue(newTask);
}
```

#### 충돌 해결
- Last-Write-Wins (간단)
- 타임스탬프 비교

---

### 3.5 마이그레이션 (Day 4)

#### 데이터 이관
```typescript
// 로컬스토리지 → Supabase
async function migrateLocalData() {
  const localTasks = JSON.parse(
    localStorage.getItem('navigator-tasks') || '[]'
  );
  
  for (const task of localTasks) {
    await supabase.from('tasks').insert({
      ...task,
      user_id: user.id
    });
  }
  
  // 백업 후 삭제
  localStorage.removeItem('navigator-tasks');
}
```

---

### 완료 기준 (Phase 3)
- [ ] 로그인/로그아웃 작동
- [ ] CRUD 모두 Supabase 연동
- [ ] 실시간 동기화 (2초 이내)
- [ ] 모바일 ↔ PC 동기화 확인
- [ ] 오프라인 작동
- [ ] 충돌 해결 작동

**예상 완료**: 2026-02-09 (D+12)

---

## Phase 4: PWA 완성 ⏳ 대기 (기본 완료)

**목표**: 네이티브 앱처럼

**예상 기간**: 2-3일

### ~~4.1 PWA 설정~~ ✅ Phase 1에서 완료

#### manifest.json (완료)
```json
{
  "name": "Navigator - ADHD 할일 관리",
  "short_name": "Navigator",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#667eea"
}
```

#### sw.js (완료)
- [x] 정적 리소스 캐싱
- [x] network-first 전략

---

### 4.2 오프라인 캐싱 (추가 작업 필요)

#### 완료
- [x] Service Worker 기본 구현
- [x] HTML/manifest 캐싱

#### 남은 것
- [ ] API 응답 캐싱 (Phase 3 이후)
- [ ] "오프라인" 배너
- [ ] 동기화 상태 표시

---

### ~~4.3 푸시 알림~~ ✅ Phase 1에서 완료

#### 완료
- [x] 알림 권한 요청
- [x] 마감 3시간 전 알림
- [x] 마감 1시간 전 알림
- [x] 5분마다 마감 체크

#### 남은 것
- [ ] FCM 서버 푸시 (Phase 3 이후)
- [ ] 23:00 취침 알림
- [ ] 셔틀 시간 (07:00) 알림

---

### 4.4 홈 화면 설치 (추가 작업 필요)

#### 완료
- [x] manifest.json 설정
- [x] 기본 PWA 조건 충족

#### 남은 것
- [ ] 설치 프롬프트 UI
- [ ] 아이콘 디자인 (192x192, 512x512)
- [ ] Apple Touch Icon

---

### 완료 기준 (Phase 4)
- [x] ~~기본 PWA 작동~~
- [x] ~~로컬 푸시 알림~~
- [ ] 홈 화면에 설치 (아이콘 필요)
- [ ] 오프라인 UI 표시
- [ ] 네이티브 앱처럼 느껴짐

**예상 완료**: 2026-02-12 (D+15)

---

## Phase 5: 고급 기능 ⏳ 대기 (일부 완료)

**목표**: 사용성 극대화

**예상 기간**: 1주일

### 5.1 텔레그램 연동

#### Bot 생성
- [ ] @BotFather로 봇 생성
- [ ] Webhook 설정
- [ ] 메시지 파싱

#### 기능
- [ ] 이벤트 알림 받기
- [ ] 빠른 추가 (텔레그램에서)
- [ ] 완료 체크

---

### 5.2 X 활동 트래커

#### 데이터 수집
- [ ] 주간 목표 (포스팅 16개, 댓글 117개)
- [ ] 일일 진행률
- [ ] 수익 예측

#### 대시보드
- [ ] 이번주 활동량
- [ ] 목표 대비 달성률
- [ ] 경고 (목표 미달 시)

---

### 5.3 고급 통계

#### 분석
- [ ] 주간 완료율 추이
- [ ] 카테고리별 시간 분배
- [ ] 생산성이 높은 시간대
- [ ] 작업별 실제 소요 시간

#### 인사이트
- [ ] "이번주는 부업에 80% 시간"
- [ ] "본업 완료율 하락 중"
- [ ] "저녁이 가장 생산적"

---

### ~~5.4 반복 작업~~ ✅ Phase 1에서 완료

```typescript
// 이미 구현됨
interface Task {
  repeatType?: 'none' | 'daily' | 'weekday' | 'weekly' | 'monthly';
}
```

- [x] 매일/평일/매주/매월 반복
- [x] 완료 시 다음 작업 자동 생성
- [ ] 건너뛰기 (나중에)
- [ ] 템플릿 저장 (나중에)

---

### ~~5.5 검색 & 필터~~ ✅ Phase 1에서 완료

- [x] 제목 검색
- [x] 카테고리 필터
- [x] 상태 (완료/미완료)
- [ ] 태그 검색 (나중에)
- [ ] 기간 필터 (나중에)

---

### 5.6 추가 고려 기능

#### 게이미피케이션
- [ ] 연속 달성 배지
- [ ] 레벨 시스템
- [ ] 주간 리포트

---

### 완료 기준 (Phase 5)
- [ ] 텔레그램 봇 작동
- [ ] X 통계 표시
- [x] ~~반복 작업 자동 생성~~ (완료)
- [x] ~~검색/필터~~ (완료)

**예상 완료**: 2026-02-19 (D+22)

---

## 🎯 마일스톤

```
✅ 2026-01-28: v5 프로토타입 완성
✅ 2026-01-28: v5 확장 (PWA, 반복작업, 일정뷰, UX개선)
✅ 2026-02-02: v6 본업 관리 시스템 (프로젝트, 일정, 템플릿)
⏳ 미정: Phase 2 완료 (Next.js)
⏳ 미정: Phase 3 완료 (Supabase)
⏳ 미정: Phase 4 완료 (PWA 아이콘/설치)
⏳ 미정: Phase 5 완료 (텔레그램, X트래커)
🚀 미정: v1.0 정식 출시
```

---

## 📊 진행률 추적

### Phase 1 체크리스트 (확장)
- [x] 기본 기능 (빠른추가, 상세추가, 수정, 삭제, 완료)
- [x] 반복 작업 (매일/평일/매주/매월)
- [x] PWA 기본 (manifest, SW)
- [x] 푸시 알림 (마감 알림)
- [x] PC/모바일 반응형 레이아웃
- [x] 일정 탭 (평일/주말 필터)
- [x] 완료 애니메이션
- [x] 진행률 & 연속 달성일
- [x] 현재 시간 & 모드별 남은 시간

**진행률**: 9/9 (100%)

### Phase 2 체크리스트
- [ ] 2.1 프로젝트 초기 설정
- [ ] 2.2 데이터 모델링
- [ ] 2.3 UI 컴포넌트 변환
- [ ] 2.4 로직 마이그레이션
- [ ] 2.5 스타일링
- [ ] 2.6 테스트 & 배포

**진행률**: 0/6 (0%)

---

## 🔄 업데이트 로그

### 2026-02-02 (v6 본업 관리)
- 본업 프로젝트 관리 시스템 추가
  - 대시보드/상세 뷰 전환
  - 6단계 체크박스 (준비→마무리)
  - 중분류 및 체크리스트
  - 진행 로그 기록
- 일정 관리 강화
  - 프로젝트/단계별 시작일+마감일
  - D-day 표시
- 참여자 트래커 (참여 현황)
- 템플릿 저장/적용
- 프로젝트 복제/보관/삭제
- 노션용 복사 기능
- 할일 추가 → 본업 프로젝트 연결 기능
- 빠른 템플릿 (글쓰기 등)
- Service Worker 캐시 전략 변경 (네트워크 우선)

### 2026-01-28 (확장)
- PWA 지원 추가 (manifest.json, sw.js)
- 푸시 알림 구현 (마감 3시간/1시간 전)
- 반복 작업 기능 추가
- PC 3컬럼 레이아웃 추가
- 일정 탭 추가 (평일/주말 필터)
- 완료 애니메이션 & 도파민 피드백
- 오늘의 진행률 & 연속 달성일
- 현재 시간 & 모드별 남은 시간 표시
- ROADMAP.md 업데이트

### 2026-01-28
- Phase 1 완료
- ROADMAP.md 작성
- Phase 2 시작 준비

---

**이 로드맵은 유동적입니다. 진행하며 조정됩니다.**
