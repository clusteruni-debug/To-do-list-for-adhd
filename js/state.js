// ============================================
// 이벤트 탭 UI 상태 (비영속적 — 새로고침 시 초기화)
// ============================================
let _eventBulkSelectMode = false;
const _eventBulkSelectedIds = new Set();
const _collapsedEventGroups = new Set(); // 접힌 그룹 ID

// ============================================
// 앱 상태 관리
// ============================================

/**
 * @typedef {Object} Subtask
 * @property {string} text - 서브태스크 내용
 * @property {boolean} completed - 완료 여부
 */

/**
 * @typedef {Object} Task
 * @property {string} id - 고유 ID (crypto.randomUUID, 레거시: 숫자→문자열 마이그레이션)
 * @property {string} title - 작업 제목
 * @property {'본업'|'부업'|'일상'|'가족'} category - 카테고리
 * @property {boolean} completed - 완료 여부
 * @property {string} [startDate] - 시작일 (YYYY-MM-DD)
 * @property {string} [deadline] - 마감일 (YYYY-MM-DD)
 * @property {number} [estimatedTime] - 예상 소요시간 (분)
 * @property {number|null} [actualTime] - 실제 소요시간 (분)
 * @property {string} [link] - 관련 링크 URL
 * @property {string|number} [expectedRevenue] - 예상 수익 (원)
 * @property {string} [description] - 작업 설명/메모
 * @property {'none'|'daily'|'weekdays'|'weekends'|'weekly'|'custom'|'monthly'} [repeatType] - 반복 유형
 * @property {number[]} [repeatDays] - 특정 요일 반복 시 요일 배열 (0=일 ~ 6=토)
 * @property {number|null} [repeatMonthDay] - 매월 반복 시 날짜 (1~31)
 * @property {string} [organizer] - 주최자 (부업용)
 * @property {string} [eventType] - 이벤트 종류 (부업용)
 * @property {string[]} [tags] - 태그 목록
 * @property {Subtask[]} [subtasks] - 서브태스크 목록
 * @property {string|null} [workProjectId] - 본업 프로젝트 연결 ID
 * @property {number|null} [workStageIdx] - 본업 단계 인덱스
 * @property {number|null} [workSubcatIdx] - 본업 중분류 인덱스
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 * @property {string} updatedAt - 수정 시각 (ISO 8601)
 * @property {string} [completedAt] - 완료 시각 (ISO 8601)
 * @property {number} [priority] - 정렬 우선순위
 * @property {string} [deletedAt] - 삭제 시각 (휴지통용, ISO 8601)
 * @property {string} [telegramEventId] - 텔레그램 이벤트 연동 ID
 */

/**
 * @typedef {Object} WorkTask
 * @property {string} title - 작업 제목
 * @property {'not-started'|'in-progress'|'done'} status - 진행 상태
 * @property {Array<{date: string, text: string}>} logs - 작업 로그
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 * @property {number} [goal] - 목표 수량
 * @property {number} [count] - 현재 수량
 */

/**
 * @typedef {Object} WorkSubcategory
 * @property {string} id - 고유 ID
 * @property {string} name - 중분류 이름
 * @property {WorkTask[]} tasks - 하위 작업 목록
 */

/**
 * @typedef {Object} WorkStage
 * @property {string} name - 단계 이름 (준비/설계/진행/점검/실행/마무리)
 * @property {boolean} completed - 단계 완료 여부
 * @property {WorkSubcategory[]} subcategories - 중분류 목록
 * @property {string|null} startDate - 단계 시작일
 * @property {string|null} endDate - 단계 종료일
 */

/**
 * @typedef {Object} WorkProject
 * @property {string} id - 고유 ID
 * @property {string} name - 프로젝트 이름
 * @property {number} currentStage - 현재 단계 인덱스
 * @property {string|null} deadline - 마감일 (YYYY-MM-DD)
 * @property {WorkStage[]} stages - 단계 목록
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 * @property {string} updatedAt - 수정 시각 (ISO 8601)
 * @property {boolean} [archived] - 아카이브 여부
 */

/**
 * @typedef {Object} CompletionLogEntry
 * @property {string} t - 작업 제목 (title)
 * @property {string} c - 카테고리 (category)
 * @property {string} at - 완료 시각 (HH:MM)
 * @property {string} [r] - 반복 유형 (repeatType, none이 아닌 경우만)
 * @property {number} [rv] - 수익 (revenue)
 * @property {number} [st] - 완료된 서브태스크 수
 */

/**
 * @typedef {Object} CommuteRoute
 * @property {string} id - 고유 ID ('route-' 접두사 + UUID)
 * @property {string} name - 루트 이름
 * @property {'morning'|'evening'|'both'} type - 출퇴근 유형
 * @property {string} [description] - 루트 설명
 * @property {number} expectedDuration - 예상 소요시간 (분)
 * @property {string} color - 표시 색상 (hex)
 * @property {boolean} isActive - 활성 여부
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 */

/**
 * @typedef {Object} CommuteTrip
 * @property {string} routeId - 사용한 루트 ID
 * @property {string} [departTime] - 출발 시각 (HH:MM)
 * @property {string} [arriveTime] - 도착 시각 (HH:MM)
 * @property {number|null} duration - 소요시간 (분)
 * @property {'clear'|'rain'|'snow'|'delay'} conditions - 교통 상황
 */

/**
 * @typedef {Object} MedicationSlot
 * @property {string} id - 슬롯 ID (예: 'med_morning')
 * @property {string} label - 표시 이름
 * @property {string} icon - 이모지 아이콘
 * @property {boolean} required - 필수 복약 여부
 */

/**
 * @typedef {Object} LifeRhythmDay
 * @property {string|null} date - 날짜 (YYYY-MM-DD)
 * @property {string|null} wakeUp - 기상 시간 (HH:MM)
 * @property {string|null} homeDepart - 집 출발 시간
 * @property {string|null} workArrive - 회사 도착 시간
 * @property {string|null} workDepart - 회사 출발 시간
 * @property {string|null} homeArrive - 집 도착 시간
 * @property {string|null} sleep - 취침 시간
 * @property {Object<string, string|null>} medications - 복약 기록 { slotId: 'HH:MM' | null }
 */

/**
 * @typedef {Object} AppState
 * @property {'action'|'schedule'|'all'|'work'|'more'} currentTab - 현재 활성 탭
 * @property {boolean} shuttleSuccess - 셔틀 탑승 여부
 * @property {Task[]} tasks - 모든 작업 목록
 * @property {boolean} showDetailedAdd - 상세 추가 폼 표시 여부
 * @property {boolean} showTaskList - 작업 리스트 표시 여부
 * @property {boolean} showCompletedTasks - 완료된 작업 표시 여부
 * @property {string} quickAddValue - 빠른 추가 입력값
 *
 * @property {Object} detailedTask - 상세 추가/수정용 임시 데이터
 * @property {string} detailedTask.title
 * @property {'본업'|'부업'|'일상'|'가족'} detailedTask.category
 * @property {string} detailedTask.startDate
 * @property {string} detailedTask.deadline
 * @property {number} detailedTask.estimatedTime
 * @property {string} detailedTask.link
 * @property {string} detailedTask.expectedRevenue
 * @property {string} detailedTask.description
 * @property {string} detailedTask.repeatType
 * @property {number[]} detailedTask.repeatDays
 * @property {number|null} detailedTask.repeatMonthDay
 * @property {string} detailedTask.organizer
 * @property {string} detailedTask.eventType
 * @property {string[]} detailedTask.tags
 * @property {Subtask[]} detailedTask.subtasks
 * @property {string|null} detailedTask.workProjectId
 * @property {number|null} detailedTask.workStageIdx
 * @property {number|null} detailedTask.workSubcatIdx
 *
 * @property {string[]} availableTags - 사용 가능한 태그 목록
 * @property {string|null} editingTaskId - 수정 중인 작업 ID
 * @property {string|null} quickEditTaskId - 빠른 수정 모달용 작업 ID
 * @property {Object|null} touchStart - 스와이프 시작 지점
 * @property {string|null} touchingTaskId - 스와이프 중인 작업 ID
 * @property {'default'|'granted'|'denied'} notificationPermission - 알림 권한 상태
 * @property {'all'|'weekday'|'weekend'|'today'} scheduleFilter - 일정 필터
 * @property {string} searchQuery - 검색어
 * @property {'all'|'본업'|'부업'|'일상'|'가족'} categoryFilter - 카테고리 필터
 * @property {string|null} tagFilter - 태그 필터
 * @property {Object<string, boolean>} showCompletedByCategory - 카테고리별 완료 작업 표시 여부
 * @property {'dark'|'light'} theme - 테마
 * @property {string|null} draggedTaskId - 드래그 중인 작업 ID
 * @property {boolean} focusMode - 포커스 모드
 *
 * @property {Object} streak - 연속 달성 기록
 * @property {number} streak.current - 현재 연속일
 * @property {number} streak.best - 최고 연속일
 * @property {string|null} streak.lastActiveDate - 마지막 활동 날짜
 *
 * @property {boolean} showOnboarding - 온보딩 모달 표시
 * @property {boolean} moreMenuOpen - 더보기 메뉴 열림 상태
 *
 * @property {Object} pomodoro - 포모도로 상태
 * @property {boolean} pomodoro.isRunning
 * @property {boolean} pomodoro.isBreak
 * @property {number} pomodoro.timeLeft - 남은 시간 (초)
 * @property {number} pomodoro.workDuration - 작업 시간 (초, 기본 25분)
 * @property {number} pomodoro.breakDuration - 휴식 시간 (초, 기본 5분)
 * @property {number} pomodoro.completedPomodoros - 완료한 포모도로 수
 * @property {string|null} pomodoro.currentTaskId - 현재 작업 중인 태스크 ID
 *
 * @property {Object} todayStats - 오늘의 진행 상황
 * @property {number} todayStats.completedToday - 오늘 완료한 작업 수
 * @property {number} todayStats.streak - 연속 완료 (세션 내)
 * @property {string|null} todayStats.lastCompletedDate - 마지막 완료 날짜
 *
 * @property {Object} lifeRhythm - 라이프 리듬 트래커
 * @property {LifeRhythmDay} lifeRhythm.today - 오늘 기록
 * @property {Object<string, LifeRhythmDay>} lifeRhythm.history - 날짜별 기록
 * @property {Object} lifeRhythm.settings - 설정
 * @property {number} lifeRhythm.settings.targetSleep - 목표 수면 시간
 * @property {number[]} lifeRhythm.settings.workdays - 근무일 (0=일 ~ 6=토)
 * @property {MedicationSlot[]} lifeRhythm.settings.medicationSlots - 복약 슬롯 목록
 *
 * @property {Object} commuteTracker - 통근 트래커
 * @property {CommuteRoute[]} commuteTracker.routes - 루트 목록
 * @property {Object<string, Object<string, CommuteTrip>>} commuteTracker.trips - 날짜별/방향별 통근 기록
 * @property {Object} commuteTracker.settings - 통근 설정
 * @property {string} commuteTracker.settings.targetArrivalTime - 목표 도착 시각
 * @property {number} commuteTracker.settings.bufferMinutes - 여유 시간 (분)
 * @property {string|null} commuteTracker.settings.preferredMorningRoute - 선호 출근 루트 ID
 * @property {string|null} commuteTracker.settings.preferredEveningRoute - 선호 퇴근 루트 ID
 * @property {boolean} commuteTracker.settings.enableAutoTag - 자동 태그 활성화
 *
 * @property {'morning'|'evening'} commuteSubTab - 통근 서브탭
 * @property {string|null} commuteRouteModal - 루트 모달 상태 ('add' | routeId | null)
 * @property {Object<string, string>} commuteSelectedRoute - 방향별 선택 루트 ID
 *
 * @property {Object} historyState - 히스토리/캘린더 상태
 * @property {number} historyState.viewingYear
 * @property {number} historyState.viewingMonth
 * @property {string|null} historyState.selectedDate - 선택된 날짜 (YYYY-MM-DD)
 * @property {Object<string, boolean>} historyState.expandedDates - 펼쳐진 날짜 그룹
 * @property {'tasks'|'rhythm'} historyView - 히스토리 뷰 모드
 *
 * @property {Object} settings - 사용자 설정
 * @property {string} settings.targetWakeTime - 목표 기상 시간 (HH:MM)
 * @property {string} settings.targetBedtime - 목표 취침 시간 (HH:MM)
 * @property {string} settings.workStartTime - 출근 시간 (HH:MM)
 * @property {string} settings.workEndTime - 퇴근 시간 (HH:MM)
 * @property {number} settings.dailyGoal - 일일 목표 (완료 작업 수)
 * @property {number} settings.weeklyGoal - 주간 목표
 * @property {boolean} settings.bedtimeReminder - 취침 알림 활성화
 * @property {number} settings.bedtimeReminderMinutes - 취침 알림 (N분 전)
 * @property {number} settings.dayStartHour - 하루 시작 시각 (기본 5)
 *
 * @property {Task[]} templates - 작업 템플릿 목록
 * @property {boolean} showSettings - 설정 모달 표시
 * @property {boolean} hideSwipeHint - 스와이프 힌트 숨기기
 *
 * @property {Object} quickTimer - ADHD 퀵 타이머
 * @property {boolean} quickTimer.isRunning
 * @property {number} quickTimer.timeLeft - 남은 시간 (초)
 * @property {string|null} quickTimer.taskId - 연결된 작업 ID
 *
 * @property {boolean} showCelebration - 축하 효과 표시
 * @property {string} lastMotivation - 마지막 동기부여 메시지
 * @property {Object<string, boolean>} expandedSubtasks - 펼쳐진 서브태스크 목록
 *
 * @property {Object} weeklyPlan - 주간 계획
 * @property {string[]} weeklyPlan.focusTasks - 이번 주 집중 작업 ID (최대 3개)
 * @property {string|null} weeklyPlan.lastReviewDate
 * @property {string|null} weeklyPlan.lastReminderDate
 * @property {boolean} weeklyPlan.dismissed
 *
 * @property {string|null} quickFilter - 퀵 필터 ('2min'|'5min'|'urgent'|null)
 * @property {Object|null} pendingTimeInput - 실제 소요시간 입력 대기 작업
 *
 * @property {WorkProject[]} workProjects - 업무 프로젝트 목록
 * @property {string|null} activeWorkProject - 현재 선택된 프로젝트 ID
 * @property {string[]} workProjectStages - 기본 단계 이름 목록
 * @property {'dashboard'|'detail'} workView - 본업 뷰 모드
 * @property {Object[]} workTemplates - 저장된 본업 템플릿 목록
 * @property {boolean} showArchivedProjects - 아카이브 프로젝트 표시 여부
 *
 * @property {Object|null} user - 로그인한 Firebase 사용자
 * @property {'offline'|'syncing'|'synced'|'error'} syncStatus - 동기화 상태
 * @property {string|null} lastSyncTime - 마지막 동기화 시간
 *
 * @property {Object<string, CompletionLogEntry[]>} completionLog - 날짜별 완료 기록
 *
 * @property {Object} deletedIds - Soft-Delete 추적 (동기화 시 오판 방지)
 * @property {Object<string, string>} deletedIds.tasks - { taskId: 삭제시각 }
 * @property {Object<string, string>} deletedIds.workProjects
 * @property {Object<string, string>} deletedIds.templates
 * @property {Object<string, string>} deletedIds.workTemplates
 *
 * @property {Task[]} trash - 삭제된 태스크 보관 (30일 후 자동 정리)
 */
/** @type {AppState} */
const appState = {
  currentTab: 'action',           // 현재 활성 탭
  shuttleSuccess: false,          // 셔틀 탑승 여부
  tasks: [],                      // 모든 작업 목록
  showDetailedAdd: false,         // 상세 추가 폼 표시 여부
  showTaskList: true,             // 작업 리스트 표시 여부
  showCompletedTasks: false,      // 완료된 작업 표시 여부
  quickAddValue: '',              // 빠른 추가 입력값
  detailedTask: {                 // 상세 추가/수정용 임시 데이터
    title: '',
    category: '부업',
    startDate: '',                // 시작일 (일정 범위 표시용)
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',              // 작업 설명/메모
    repeatType: 'none',           // 반복 유형: none/daily/weekdays/weekends/weekly/custom/monthly
    repeatDays: [],               // 특정 요일 반복 시 요일 배열 (0=일, 1=월, ... 6=토)
    repeatMonthDay: null,         // 매월 반복 시 날짜 (1~31)
    organizer: '',                // 주최자 (부업용): 불개미, 코같투, 맨틀 등
    eventType: '',                // 이벤트 종류 (부업용): 의견작성, 리캡, AMA 등
    tags: [],                     // 태그 목록
    subtasks: [],                 // 서브태스크 목록
    workProjectId: null,          // 본업 프로젝트 연결 ID
    workStageIdx: null,           // 본업 단계 인덱스
    workSubcatIdx: null           // 본업 중분류 인덱스
  },
  availableTags: ['긴급', '회의', '전화', '외출', '대기중', '검토필요'],  // 사용 가능한 태그
  editingTaskId: null,            // 수정 중인 작업 ID (null이면 새로 추가)
  quickEditTaskId: null,          // 빠른 수정 모달용 작업 ID
  touchStart: null,               // 스와이프 시작 지점
  touchingTaskId: null,           // 스와이프 중인 작업 ID
  notificationPermission: 'default', // 알림 권한 상태
  scheduleFilter: 'all',          // 일정 필터: all/weekday/weekend/today
  searchQuery: '',                // 검색어
  categoryFilter: 'all',          // 카테고리 필터: all/본업/부업/일상/가족
  tagFilter: null,                 // 태그 필터: null이면 전체
  showCompletedByCategory: {},     // 전체 탭에서 카테고리별 완료 작업 표시 여부
  theme: 'dark',                   // 테마: dark/light
  draggedTaskId: null,             // 드래그 중인 작업 ID
  focusMode: false,                // 포커스 모드 (한 번에 하나만)
  streak: {                        // 연속 달성 기록
    current: 0,
    best: 0,
    lastActiveDate: null
  },
  habitStreaks: {},                  // 습관별 스트릭: { "작업제목": { current, best, lastActiveDate } }
  habitFilter: 'all',               // 습관 트래커 필터: 'all' 또는 작업 제목
  showOnboarding: false,           // 온보딩 모달 표시
  moreMenuOpen: false,             // 더보기 메뉴 열림 상태
  // 포모도로 상태
  pomodoro: {
    isRunning: false,
    isBreak: false,
    timeLeft: 25 * 60,            // 25분 (초)
    workDuration: 25 * 60,        // 작업 시간
    breakDuration: 5 * 60,        // 휴식 시간
    completedPomodoros: 0,        // 완료한 포모도로 수
    currentTaskId: null           // 현재 작업 중인 태스크
  },
  // 오늘의 진행 상황
  todayStats: {
    completedToday: 0,            // 오늘 완료한 작업 수
    streak: 0,                    // 연속 완료 (세션 내)
    lastCompletedDate: null       // 마지막 완료 날짜
  },
  // 라이프 리듬 트래커 (6개 항목 + 복약)
  lifeRhythm: {
    today: {
      date: null,                 // 오늘 날짜 (YYYY-MM-DD)
      wakeUp: null,               // 기상 시간 (HH:MM)
      homeDepart: null,           // 집 출발 시간
      workArrive: null,           // 회사 도착 시간
      workDepart: null,           // 회사 출발 시간
      homeArrive: null,           // 집 도착 시간
      sleep: null,                // 취침 시간
      medications: {}             // 복약 기록 { slotId: 'HH:MM' or null }
    },
    history: {},                  // 날짜별 기록
    settings: {
      targetSleep: 7,             // 목표 수면 시간
      workdays: [1, 2, 3, 4, 5],  // 근무일 (0=일, 1=월, ... 6=토)
      medicationSlots: [
        { id: 'med_morning', label: 'ADHD약(아침)', icon: '💊', required: true },
        { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
        { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false },
        { id: 'med_evening', label: '영양제(저녁)', icon: '🌿', required: false }
      ]
    }
  },
  // 통근 트래커
  commuteTracker: {
    routes: [],
    trips: {},
    settings: {
      targetArrivalTime: '09:00',
      bufferMinutes: 10,
      preferredMorningRoute: null,
      preferredEveningRoute: null,
      enableAutoTag: true
    }
  },
  commuteSubTab: 'morning',
  commuteRouteModal: null,
  commuteSelectedRoute: {},
  // 히스토리/캘린더 상태
  historyState: {
    viewingYear: new Date().getFullYear(),
    viewingMonth: new Date().getMonth(),
    selectedDate: null,           // 선택된 날짜 (YYYY-MM-DD)
    expandedDates: {}             // 펼쳐진 날짜 그룹
  },
  historyView: 'tasks',           // 히스토리 뷰: tasks / rhythm
  // 사용자 설정
  settings: {
    targetWakeTime: '07:00',      // 목표 기상 시간
    targetBedtime: '23:00',       // 목표 취침 시간
    workStartTime: '11:00',       // 출근 시간 (회사 모드 시작)
    workEndTime: '20:00',         // 퇴근 시간 (회사 모드 끝)
    dailyGoal: 5,                 // 일일 목표 (완료 작업 수)
    weeklyGoal: 25,               // 주간 목표 (완료 작업 수)
    bedtimeReminder: true,        // 취침 알림 활성화
    bedtimeReminderMinutes: 30,   // 취침 몇 분 전 알림
    dayStartHour: 5               // 하루 시작 시각 (이 시각 이후 반복 태스크 리셋, 기본 05:00)
  },
  templates: [],                    // 작업 템플릿 목록
  showSettings: false,             // 설정 모달 표시
  hideSwipeHint: false,            // 스와이프 힌트 숨기기
  // ADHD 특화 기능
  quickTimer: {
    isRunning: false,
    timeLeft: 5 * 60,              // 5분 (초)
    taskId: null                    // 타이머와 연결된 작업 ID
  },
  showCelebration: false,          // 축하 효과 표시
  lastMotivation: '',              // 마지막 동기부여 메시지
  expandedSubtasks: {},             // 펼쳐진 서브태스크 목록 (taskId: true/false)
  // 주간 계획
  weeklyPlan: {
    focusTasks: [],                   // 이번 주 집중할 작업 ID 목록 (최대 3개)
    lastReviewDate: null,             // 마지막 주간 리뷰 날짜
    lastReminderDate: null,           // 마지막 월요일 리마인더 날짜
    dismissed: false                  // 이번 주 리마인더 닫음 여부
  },
  quickFilter: null,                  // 퀵 필터: null, '2min', '5min', 'urgent'
  pendingTimeInput: null,             // 실제 소요시간 입력 대기 중인 작업
  // 본업 프로젝트 관리
  workProjects: [],                   // 업무 프로젝트 목록
  activeWorkProject: null,            // 현재 선택된 프로젝트 ID
  workProjectStages: ['준비', '설계', '진행', '점검', '실행', '마무리'],
  workView: 'dashboard',              // 뷰 모드: 'dashboard' | 'detail'
  workTemplates: [],                  // 저장된 템플릿 목록
  showArchivedProjects: false,        // 아카이브 프로젝트 표시 여부
  scheduleShowAll: false,             // 스케줄 뷰: 완료/보류 포함 여부
  // Firebase 동기화
  user: null,                       // 로그인한 사용자
  syncStatus: 'offline',            // 동기화 상태: offline/syncing/synced/error
  lastSyncTime: null,               // 마지막 동기화 시간
  // 태스크 완료 영구 기록 (날짜별)
  // { "2026-02-05": [{ t, c, at, r?, rv?, st? }], ... }
  completionLog: {},
  // Soft-Delete 추적: 삭제된 항목의 ID + 삭제 시각 기록
  // 다른 기기에서 동기화 시 "로컬에만 있음 = 새 항목" 오판 방지
  deletedIds: {
    tasks: {},          // { "task-uuid": "2026-02-05T..." }
    workProjects: {},
    templates: {},
    workTemplates: {},
    commuteRoutes: {}   // 삭제된 통근 루트 추적
  },
  // 휴지통: 삭제된 태스크 보관 (30일 후 자동 정리)
  trash: []
};

// ============================================
// 로컬스토리지 관리
// ============================================

/**
 * 로컬스토리지에서 데이터 로드
 * 에러 처리 포함
 */
function loadState() {
  try {
    const savedTasks = localStorage.getItem('navigator-tasks');
    const isFirstVisit = !savedTasks && !localStorage.getItem('navigator-visited');

    // 🔐 작업 데이터 검증 후 로드
    if (savedTasks) {
      const parsedTasks = safeParseJSON('navigator-tasks', []);
      appState.tasks = validateTasks(parsedTasks);
    }

    // 🔐 boolean 검증
    const savedShuttle = localStorage.getItem('navigator-shuttle');
    if (savedShuttle) {
      appState.shuttleSuccess = Boolean(safeParseJSON('navigator-shuttle', false));
    }

    // 테마 로드
    const savedTheme = localStorage.getItem('navigator-theme');
    if (savedTheme) {
      appState.theme = savedTheme;
    }
    applyTheme();

    // 태그 로드
    const parsedTags = safeParseJSON('navigator-tags', null);
    if (parsedTags) appState.availableTags = parsedTags;

    // 스트릭 로드
    const parsedStreak = safeParseJSON('navigator-streak', null);
    if (parsedStreak) appState.streak = parsedStreak;
    updateStreak();

    // 습관별 스트릭 로드
    const parsedHabitStreaks = safeParseJSON('navigator-habitStreaks', null);
    if (parsedHabitStreaks) appState.habitStreaks = parsedHabitStreaks;

    // 설정 로드
    const parsedSettings = safeParseJSON('navigator-settings', null);
    if (parsedSettings) appState.settings = { ...appState.settings, ...parsedSettings };

    // 템플릿 로드
    const parsedTemplates = safeParseJSON('navigator-templates', null);
    if (parsedTemplates) appState.templates = parsedTemplates;

    // 주간 계획 로드
    const parsedWeeklyPlan = safeParseJSON('navigator-weekly-plan', null);
    if (parsedWeeklyPlan) appState.weeklyPlan = { ...appState.weeklyPlan, ...parsedWeeklyPlan };

    // 본업 프로젝트 로드
    const parsedWorkProjects = safeParseJSON('navigator-work-projects', null);
    if (parsedWorkProjects) {
      appState.workProjects = parsedWorkProjects;
      // 첫 프로젝트 자동 선택
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        const activeProject = appState.workProjects.find(p => !p.archived);
        appState.activeWorkProject = activeProject ? activeProject.id : null;
      }
    }

    // 본업 템플릿 로드
    const parsedWorkTemplates = safeParseJSON('navigator-work-templates', null);
    if (parsedWorkTemplates) appState.workTemplates = parsedWorkTemplates;

    // 라이프 리듬 로드
    loadLifeRhythm();

    // 통근 트래커 로드
    loadCommuteTracker();

    // 완료 기록 영구 로그 로드 + 1년 이상 데이터 압축
    loadCompletionLog();
    compactOldCompletionLog();

    // Soft-Delete 추적 데이터 로드
    const parsedDeletedIds = safeParseJSON('navigator-deleted-ids', null);
    if (parsedDeletedIds) appState.deletedIds = parsedDeletedIds;
    // 30일 이상 된 deletedIds 자동 정리
    cleanupOldDeletedIds();

    // 휴지통 로드 + 30일 자동 정리
    const parsedTrash = safeParseJSON('navigator-trash', null);
    if (Array.isArray(parsedTrash)) appState.trash = parsedTrash;
    cleanupOldTrash();

    // 오늘 완료한 작업 수 계산
    recomputeTodayStats();

    // 오래된 완료 태스크 정리
    cleanupOldCompletedTasks();

    // 반복 태스크 일일 초기화는 클라우드 데이터 로드 후 실행
    // (클라우드 로드 전 실행하면 updatedAt 갱신으로 다른 기기의 오늘 완료 기록이 merge에서 패배)
    // → initialCloudLoadComplete 플래그로 loadFromFirebase() 완료 후 checkDailyReset() 호출
    // → 비로그인/타임아웃 대비 fallback은 firebase-ready 리스너 하단에서 처리

    // 첫 방문 시 온보딩
    if (isFirstVisit) {
      setTimeout(() => showOnboarding(), 500);
    }

    // 기존 숫자 ID → 문자열 마이그레이션 (crypto.randomUUID 전환 호환)
    migrateNumericIds();

    // 중복 항목 제거 (ID 타입 불일치 병합 버그로 생긴 중복 정리)
    deduplicateAll();

    // 백업 리마인더 체크
    checkBackupReminder();

    // 데이터 유실 자동 감지: localStorage가 비어있지만 동기화 백업에 데이터가 있으면 복구 제안
    const shrinkage = checkDataShrinkage();
    if (shrinkage.blocked) {
      console.warn('[startup] 데이터 유실 감지:', shrinkage.details);
      setTimeout(() => {
        if (confirm(
          '⚠️ 데이터 유실이 감지되었습니다.\n\n' +
          shrinkage.details + '\n\n' +
          '동기화 백업에서 복원하시겠습니까?'
        )) {
          restoreFromSyncBackup();
        }
      }, 1000);
    }

  } catch (error) {
    console.error('데이터 로드 실패:', error);
    showToast('데이터 로드 중 오류가 발생했습니다', 'error');
  }
}

/**
 * 로컬스토리지에 데이터 저장 (실제 저장 로직)
 */
function _doSaveState(immediate = false) {
  try {
    // 로그인 사용자: Firestore IndexedDB가 주 저장소 → localStorage 캐싱 스킵
    // 비로그인 또는 IndexedDB 사용 불가(프라이빗 브라우징): localStorage 폴백
    if (!appState.user || !isIndexedDBAvailable) {
      localStorage.setItem('navigator-tasks', JSON.stringify(appState.tasks));
      localStorage.setItem('navigator-shuttle', JSON.stringify(appState.shuttleSuccess));
      localStorage.setItem('navigator-theme', appState.theme);
      localStorage.setItem('navigator-tags', JSON.stringify(appState.availableTags));
      localStorage.setItem('navigator-settings', JSON.stringify(appState.settings));
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
      localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks || {}));
      localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
      localStorage.setItem('navigator-weekly-plan', JSON.stringify(appState.weeklyPlan));
      localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
      localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
      localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
      localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
      localStorage.setItem('navigator-deleted-ids', JSON.stringify(appState.deletedIds));
      localStorage.setItem('navigator-trash', JSON.stringify(appState.trash));
      localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
    }

    // Firebase 동기화 (로그인된 경우, 디바운스 적용)
    if (appState.user) {
      syncToFirebase(immediate);
    }
  } catch (error) {
    console.error('데이터 저장 실패:', error);
    showToast('데이터 저장 중 오류가 발생했습니다', 'error');
  }
}

// 디바운스된 저장 (연속 입력 시 500ms 후 한 번만 저장)
let saveStateTimeout = null;
function saveState() {
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
  }
  saveStateTimeout = setTimeout(() => {
    _doSaveState();
    saveStateTimeout = null;
  }, 500);
}

// 즉시 저장이 필요한 경우 (앱 종료 전 등)
// 디바운스된 sync 타이머도 취소하고 즉시 동기화
function saveStateImmediate() {
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = null;
  }
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  _doSaveState(true);
}

// localStorage에만 동기적으로 저장 (Firebase 호출 없음)
// beforeunload에서 사용 — async setDoc은 브라우저가 기다리지 않으므로
function _doSaveStateLocalOnly() {
  try {
    localStorage.setItem('navigator-tasks', JSON.stringify(appState.tasks));
    localStorage.setItem('navigator-shuttle', JSON.stringify(appState.shuttleSuccess));
    localStorage.setItem('navigator-theme', appState.theme);
    localStorage.setItem('navigator-tags', JSON.stringify(appState.availableTags));
    localStorage.setItem('navigator-settings', JSON.stringify(appState.settings));
    localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks || {}));
    localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
    localStorage.setItem('navigator-weekly-plan', JSON.stringify(appState.weeklyPlan));
    localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
    localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
    localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
    localStorage.setItem('navigator-deleted-ids', JSON.stringify(appState.deletedIds));
    localStorage.setItem('navigator-trash', JSON.stringify(appState.trash));
    // 라이프 리듬도 로컬 백업 (beforeunload 시 유실 방지)
    localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
  } catch (error) {
    console.error('로컬 저장 실패:', error);
  }
}

