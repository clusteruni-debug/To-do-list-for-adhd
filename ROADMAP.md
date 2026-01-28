# 🗺️ Navigator - 개발 로드맵

> "작동하는 쓰레기 → 좋은 코드" 전략

---

## 📍 현재 위치

```
✅ Phase 1: HTML 프로토타입 (완료)
🔄 Phase 2: Next.js 전환 (진행 중) ← 여기
⏳ Phase 3: 실시간 동기화 (대기)
⏳ Phase 4: PWA 완성 (대기)
⏳ Phase 5: 고급 기능 (대기)
```

---

## Phase 1: HTML 프로토타입 ✅ 완료

**목표**: 빠른 검증, 즉시 사용

### 완료된 것
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

### 배운 것
- React 라이브러리 로딩 어려움
- 상태 관리의 중요성
- 렌더링 vs 이벤트 핸들러
- 에러 처리 필수

### 다음 단계로 가는 기준
- ✅ 기본 기능 모두 작동
- ✅ 사용자 테스트 완료
- ✅ 피드백 수집
- ✅ 기술부채 정리

**완료일**: 2026-01-28

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

## Phase 4: PWA 완성 ⏳ 대기

**목표**: 네이티브 앱처럼

**예상 기간**: 2-3일

### 4.1 PWA 설정 (Day 1)

#### next-pwa 설치
```bash
npm install next-pwa
```

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // 기존 설정
});
```

#### Manifest
```json
{
  "name": "Navigator",
  "short_name": "Navigator",
  "description": "생존형 할일 관리",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 4.2 오프라인 캐싱 (Day 1-2)

#### Service Worker
- [ ] 정적 리소스 캐싱
- [ ] API 응답 캐싱
- [ ] 이미지 캐싱

#### 오프라인 UI
- [ ] "오프라인" 배너
- [ ] 대기열 표시
- [ ] 동기화 상태

---

### 4.3 푸시 알림 (Day 2-3)

#### 알림 권한
```typescript
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // FCM 토큰 저장
  }
}
```

#### 알림 시나리오
- [ ] 마감 3시간 전
- [ ] 마감 1시간 전
- [ ] 23:00 취침 알림
- [ ] 셔틀 시간 (07:00)

---

### 4.4 홈 화면 설치 (Day 3)

#### 설치 프롬프트
```typescript
// iOS: "홈 화면에 추가" 안내
// Android: 자동 프롬프트
```

#### 아이콘 디자인
- [ ] 192x192
- [ ] 512x512
- [ ] Apple Touch Icon

---

### 완료 기준 (Phase 4)
- [ ] 홈 화면에 설치 가능
- [ ] 오프라인 작동
- [ ] 푸시 알림 수신
- [ ] 네이티브 앱처럼 느껴짐

**예상 완료**: 2026-02-12 (D+15)

---

## Phase 5: 고급 기능 ⏳ 대기

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

### 5.4 반복 작업

#### 설정
```typescript
interface RecurringTask {
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];  // 0=일요일
  time?: string;          // "09:00"
}
```

#### 자동 생성
- [ ] 매일 아침 자동 생성
- [ ] 건너뛰기 가능
- [ ] 템플릿 저장

---

### 5.5 검색 & 필터

#### 검색
- [ ] 제목 검색
- [ ] 태그 검색
- [ ] 전체 텍스트 검색

#### 필터
- [ ] 카테고리
- [ ] 마감일 (오늘/이번주/다음주)
- [ ] 상태 (완료/미완료)
- [ ] 기간 (날짜 범위)

---

### 완료 기준 (Phase 5)
- [ ] 텔레그램 봇 작동
- [ ] X 통계 표시
- [ ] 반복 작업 자동 생성
- [ ] 검색/필터 빠름

**예상 완료**: 2026-02-19 (D+22)

---

## 🎯 마일스톤

```
✅ 2026-01-28: v5 프로토타입 완성
🎯 2026-02-02: Phase 2 완료 (Next.js)
🎯 2026-02-09: Phase 3 완료 (Supabase)
🎯 2026-02-12: Phase 4 완료 (PWA)
🎯 2026-02-19: Phase 5 완료 (고급 기능)
🚀 2026-02-20: v1.0 정식 출시
```

---

## 📊 진행률 추적

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

### 2026-01-28
- Phase 1 완료
- ROADMAP.md 작성
- Phase 2 시작 준비

---

**이 로드맵은 유동적입니다. 진행하며 조정됩니다.**
