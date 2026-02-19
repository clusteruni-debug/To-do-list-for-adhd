# 🏗️ Navigator - 기술 아키텍처

> 현재 구조와 미래 구조

---

## 📐 시스템 개요

### 현재 (v5 - HTML)
```
┌─────────────────┐
│   Browser       │
│  ┌───────────┐  │
│  │  HTML     │  │
│  │  ↓        │  │
│  │ Vanilla   │  │
│  │   JS      │  │
│  │  ↓        │  │
│  │LocalStore │  │
│  └───────────┘  │
└─────────────────┘
```

### 미래 (v6+ - Production)
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │
│ Browser  │────▶│ Vercel   │────▶│ Supabase │
│ (React)  │     │(Next.js) │     │   (DB)   │
│          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │          Realtime                │
     └─────────────────────────────────┘
```

---

## 📁 현재 구조 (v5.1)

### 파일 구조
```
navigator-app/
├── navigator-v5.html (메인 앱, ~3800줄)
│   ├── HTML (마크업)
│   ├── CSS (스타일)
│   │   ├── PC 레이아웃 (3컬럼)
│   │   ├── 모바일 레이아웃 (1컬럼)
│   │   ├── 완료 애니메이션
│   │   └── 진행률 표시
│   └── JavaScript
│       ├── 상태 관리 (appState)
│       ├── 비즈니스 로직
│       │   ├── 우선순위 계산
│       │   ├── 모드 판단
│       │   ├── 필터링
│       │   ├── 반복 작업 생성
│       │   └── 시간 계산
│       ├── UI 렌더링 (renderStatic)
│       ├── 이벤트 핸들러
│       ├── 알림 시스템
│       └── 로컬스토리지
├── manifest.json (PWA 설정)
└── sw.js (Service Worker)
```

### 상태 관리
```javascript
const appState = {
  // UI 상태
  currentTab: 'action' | 'dashboard',
  showDetailedAdd: boolean,
  showTaskList: boolean,
  showCompletedTasks: boolean,
  
  // 데이터
  tasks: Task[],
  shuttleSuccess: boolean,
  
  // 임시 데이터
  quickAddValue: string,
  detailedTask: Partial<Task>,
  editingTaskId: number | null,
  
  // 터치 이벤트
  touchStart: {x: number, taskId: number} | null,
  touchingTaskId: number | null
}
```

---

## 🎯 핵심 모듈

### 1. 우선순위 계산 엔진

```javascript
/**
 * 작업의 우선순위 점수 계산
 * 
 * 입력: Task 객체
 * 출력: number (점수)
 * 
 * 계산 요소:
 * 1. 마감시간 (-100 ~ +100)
 * 2. 카테고리 (+25 ~ +40)
 * 3. ROI (+0 ~ +30)
 * 4. 소요시간 (+0 ~ +10)
 */
function calculatePriority(task: Task): number {
  let score = 0;
  
  // 1. 마감시간 점수
  if (task.deadline) {
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) score -= 100;      // 지남
    else if (hoursLeft < 3) score += 100; // 긴급
    else if (hoursLeft < 24) score += 70; // 주의
    else if (hoursLeft < 72) score += 40; // 여유
  }
  
  // 2. 카테고리 점수
  const categoryScores = {
    '본업': 40,  // 월급 중요
    '부업': 35,  // 현금흐름 중요
    '일상': 25   // 생존 최소
  };
  score += categoryScores[task.category];
  
  // 3. ROI 점수 (부업만)
  if (task.category === '부업' && task.expectedRevenue) {
    const roi = task.expectedRevenue / task.estimatedTime;
    score += Math.min(roi * 0.1, 30); // 최대 30점
  }
  
  // 4. 짧은 작업 보너스
  if (task.estimatedTime <= 10) {
    score += 10;
  }
  
  return score;
}
```

**특징**:
- 마감시간이 가장 중요 (100점)
- 카테고리는 기본 가중치
- ROI는 보너스 (부업만)
- 짧은 작업 우대 (빠른 성취감)

---

### 2. 모드 시스템

```javascript
/**
 * 현재 시간대와 셔틀 상태 기반 모드 판단
 * 
 * 입력: 시간, 셔틀성공여부
 * 출력: '회사' | '생존' | '여유' | '출근' | '휴식'
 */
function getCurrentMode(
  hour: number,
  shuttleSuccess: boolean
): Mode {
  // 우선순위: 시간대 > 셔틀 상태
  
  if (hour >= 11 && hour < 20) {
    return '회사'; // 본업만 표시
  }
  
  if (hour >= 22 && hour < 24) {
    if (shuttleSuccess) {
      return '여유'; // 전체 표시 (5시간 확보)
    } else {
      return '생존'; // 짧고 급한 것만 (2시간만)
    }
  }
  
  if (hour >= 19 && hour < 22 && shuttleSuccess) {
    return '여유'; // 보너스 시간 활용
  }
  
  if (hour >= 7 && hour < 11) {
    return '출근'; // 이동 중
  }
  
  return '휴식'; // 새벽/아침
}
```

**모드별 필터링**:
```javascript
function filterByMode(tasks: Task[], mode: Mode): Task[] {
  switch (mode) {
    case '회사':
      // 본업만
      return tasks.filter(t => t.category === '본업');
    
    case '생존':
      // 15분 이하 OR 긴급 (priority > 90)
      return tasks.filter(t => 
        t.estimatedTime <= 15 || t.priority > 90
      );
    
    case '여유':
    case '출근':
    case '휴식':
    default:
      // 전체
      return tasks;
  }
}
```

---

### 3. 긴급도 판단

```javascript
/**
 * 마감시간 기반 긴급도 레벨
 * 
 * 입력: Task
 * 출력: 'urgent' | 'warning' | 'normal' | 'expired'
 */
function getUrgencyLevel(task: Task): UrgencyLevel {
  if (!task.deadline) return 'normal';
  
  const hoursLeft = (task.deadline - now) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) return 'expired';   // 지남 (회색)
  if (hoursLeft < 3) return 'urgent';    // 긴급 (빨강)
  if (hoursLeft < 24) return 'warning';  // 주의 (주황)
  return 'normal';                       // 일반 (파랑)
}
```

**UI 매핑**:
```css
.urgent {
  border: 2px solid #f5576c; /* 빨강 */
  animation: pulse 1s infinite;
}

.warning {
  border: 2px solid #ff9500; /* 주황 */
}

.normal {
  border: 1px solid #667eea; /* 파랑 */
}

.expired {
  opacity: 0.5;
  text-decoration: line-through;
}
```

---

### 4. 렌더링 시스템

```javascript
/**
 * 전체 화면 렌더링
 * 
 * 문제: 1초마다 호출 시 입력 포커스 날아감
 * 해결: 시간만 updateTime()으로 분리
 */
function renderStatic() {
  // 1. 데이터 준비
  const filteredTasks = getFilteredTasks();
  const nextAction = filteredTasks[0];
  const stats = calculateStats();
  
  // 2. HTML 생성
  const html = generateHTML({
    tasks: filteredTasks,
    nextAction,
    stats,
    // ... 모든 상태
  });
  
  // 3. DOM 업데이트
  document.getElementById('root').innerHTML = html;
  
  // 4. 이벤트 핸들러 재등록
  setupInputHandlers();
}

/**
 * 시간만 업데이트 (1초마다)
 */
function updateTime() {
  const timeEl = document.getElementById('time-value');
  if (timeEl) {
    timeEl.textContent = formatTime();
  }
}

// 사용
renderStatic(); // 상태 변경 시
setInterval(updateTime, 1000); // 1초마다
```

---

## 🗄️ 데이터 구조

### Task 객체
```typescript
interface Task {
  // 식별
  id: number;  // timestamp (임시)

  // 기본
  title: string;
  category: '본업' | '부업' | '일상';

  // 시간
  deadline: string;        // ISO datetime
  estimatedTime: number;   // 분
  createdAt: string;       // ISO datetime

  // 메타
  link: string;            // URL
  expectedRevenue: string; // 숫자 (문자열로 저장)

  // 반복 (v5.1 추가)
  repeatType?: 'none' | 'daily' | 'weekday' | 'weekly' | 'monthly';

  // 상태
  completed: boolean;

  // 계산값 (런타임)
  priority?: number;
  urgency?: 'urgent' | 'warning' | 'normal' | 'expired';
}
```

### 로컬스토리지 구조
```javascript
// localStorage['navigator-tasks']
[
  {
    id: 1738048239847,
    title: "폴리곤 퀴즈",
    category: "부업",
    deadline: "2026-01-28T23:59:00",
    estimatedTime: 10,
    link: "https://t.me/...",
    expectedRevenue: "50000",
    repeatType: "none",  // v5.1 추가
    completed: false,
    createdAt: "2026-01-28T14:30:00"
  },
  // ...
]

// localStorage['navigator-shuttle']
true // or false

// localStorage['navigator-streak'] (v5.1 추가)
{
  "count": 3,
  "lastDate": "2026-01-28"
}

// localStorage['navigator-notified-tasks'] (v5.1 추가)
["task-id-1", "task-id-2"]  // 이미 알림 보낸 작업 ID
```

---

## 🎨 UI 아키텍처

### 레이아웃 구조
```
App
├── Header (제목, 로고)
├── TabNav (실행 | 대시보드 | 일정)
└── TabContent
    ├── ActionTab (기본)
    │   ├── PC 3컬럼 레이아웃
    │   │   ├── 좌측: CurrentTime, ShuttleStatus, Stats, Backup
    │   │   ├── 중앙: QuickAdd, NextAction, TaskList
    │   │   └── 우측: TodayProgress, UrgentList
    │   └── 모바일 1컬럼 레이아웃
    │       ├── CurrentTimeSection (NEW)
    │       ├── ShuttleStatus
    │       ├── TodayProgress (NEW)
    │       ├── Stats
    │       ├── QuickAdd
    │       ├── DetailedAdd (optional)
    │       ├── NextAction
    │       ├── TaskList
    │       └── CompletedTasks (optional)
    ├── DashboardTab
    │   ├── TodaySummary
    │   ├── CategoryStats
    │   ├── UrgentList (optional)
    │   ├── AllTasksList
    │   └── CompletedList (optional)
    └── ScheduleTab (NEW)
        ├── ScheduleFilter (전체 | 오늘 | 평일 | 주말)
        └── ScheduleList (날짜별 그룹)
```

### 완료 피드백 시스템 (NEW)
```
CompletionOverlay
├── 체크 아이콘 (애니메이션)
├── "완료!" 텍스트
└── 자동 fade-out (0.5초)

TodayProgress
├── 진행률 바
├── 완료/전체 카운트
└── 연속 달성일 (streak)

CurrentTimeSection
├── 현재 시각 (실시간)
├── 현재 모드 (회사/여유/생존/출근/휴식)
└── 모드별 남은 시간
```

### 컴포넌트 책임

**ShuttleStatus**:
- 셔틀 상태 표시/토글
- 클릭 → 상태 변경
- localStorage 저장

**NextAction**:
- 최우선 작업 1개 표시
- [GO] → 링크 열기
- [✓ 완료] → completeTask()

**TaskList**:
- 전체 작업 목록
- 스와이프 제스처
- 완료/수정/삭제 버튼

---

## 🔄 데이터 흐름

### 작업 추가 플로우
```
1. 사용자 입력
   ↓
2. quickAdd() or detailedAdd()
   ↓
3. appState.tasks.push(newTask)
   ↓
4. saveState() → localStorage
   ↓
5. renderStatic() → UI 업데이트
   ↓
6. showToast('성공')
```

### 작업 완료 플로우
```
1. 사용자 액션 (버튼 or 스와이프)
   ↓
2. completeTask(id)
   ↓
3. appState.tasks[i].completed = true
   ↓
4. saveState() → localStorage
   ↓
5. renderStatic() → UI 업데이트
   ↓
6. 햅틱 피드백 (진동)
   ↓
7. showToast('완료!')
```

### Next-Action 결정 플로우
```
1. getFilteredTasks()
   ↓
2. tasks.filter(t => !t.completed)
   ↓
3. tasks.map(t => ({...t, priority: calculatePriority(t)}))
   ↓
4. tasks.sort((a,b) => b.priority - a.priority)
   ↓
5. filterByMode(tasks, getCurrentMode())
   ↓
6. return tasks[0] // 최우선
```

---

## 🚧 기술부채 & 개선 필요

### 1. ID 생성 (Critical)
```javascript
// 현재
id: Date.now() // timestamp

// 문제
- 밀리초 단위 동시 생성 시 충돌
- 예측 가능 (보안 위험)

// 해결 (Phase 2)
import { v4 as uuidv4 } from 'uuid';
id: uuidv4() // "550e8400-e29b-41d4-a716-446655440000"
```

### 2. 타입 안전성 (High)
```javascript
// 현재
task.category // 아무 문자열이나 가능

// 문제
- 런타임 에러 가능
- 자동완성 없음
- 버그 찾기 어려움

// 해결 (Phase 2)
type TaskCategory = '본업' | '부업' | '일상';
task.category: TaskCategory // 타입 체크
```

### 3. 상태 관리 (High)
```javascript
// 현재
const appState = { ... } // 전역 변수

// 문제
- 추적 어려움
- 디버깅 어려움
- 테스트 불가능

// 해결 (Phase 2)
import { create } from 'zustand';
const useTaskStore = create((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  }))
}))
```

### 4. 렌더링 성능 (Medium)
```javascript
// 현재
renderStatic() // 전체 HTML 재생성

// 문제
- 느림 (100+ 작업 시)
- 메모리 낭비
- 스크롤 위치 초기화

// 해결 (Phase 2)
React Virtual DOM // 변경된 부분만
```

### ~~5. 반응형~~ ✅ 완료 (v5.1)
```css
/* v5.1에서 구현됨 */
@media (min-width: 1024px) {
  .pc-layout {
    display: grid;
    grid-template-columns: 1fr 1fr 380px;
    gap: 24px;
  }
}

/* 태블릿도 지원 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 2컬럼 일부 지원 */
}
```

---

## 📈 성능 목표

### 현재 (v5)
- 로딩: < 1초
- 렌더링: < 100ms
- 작업 추가: < 50ms

### 목표 (v6)
- First Paint: < 1초
- Time to Interactive: < 2초
- 렌더링: < 16ms (60fps)
- API 응답: < 500ms

---

## 🔐 보안 고려사항

### 현재 (로컬만)
- XSS: 없음 (외부 입력 없음)
- CSRF: 없음 (서버 없음)
- 인증: 없음 (로컬 전용)

### 미래 (Supabase)
- RLS (Row Level Security)
- JWT 토큰 인증
- HTTPS only
- 환경 변수로 비밀키 관리

---

## 🧪 테스트 전략 (Phase 2+)

### Unit Tests
```typescript
describe('calculatePriority', () => {
  it('긴급 작업은 100점 이상', () => {
    const task = {
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2시간 후
    };
    expect(calculatePriority(task)).toBeGreaterThan(100);
  });
});
```

### Integration Tests
```typescript
describe('작업 추가 플로우', () => {
  it('추가 → 저장 → 표시', async () => {
    await addTask({ title: 'Test' });
    expect(localStorage.getItem('tasks')).toContain('Test');
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)
```typescript
test('사용자가 작업 추가하고 완료', async ({ page }) => {
  await page.goto('/');
  await page.fill('#quick-add-input', 'Test Task');
  await page.click('text=+');
  await page.click('text=✓');
  await expect(page.locator('text=Test Task')).toHaveClass(/completed/);
});
```

---

**이 아키텍처는 진화합니다. Phase별로 업데이트됩니다.**

**마지막 업데이트: 2026-01-28 (v5.1 확장)**
