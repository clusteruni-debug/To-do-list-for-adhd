// ============================================
// 주간 리뷰 & 계획 시스템
// ============================================

/**
 * 주간 리뷰 필요 여부 체크 (일요일 저녁)
 */
function checkWeeklyReview() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일
  const hour = now.getHours();
  const today = now.toDateString();

  // 일요일 18시 이후이고, 오늘 리뷰 안 했으면
  if (dayOfWeek === 0 && hour >= 18 && appState.weeklyPlan.lastReviewDate !== today) {
    showWeeklyReview();
  }
}

/**
 * 월요일 리마인더 필요 여부 체크
 */
function checkMondayReminder() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 1 = 월요일
  const today = now.toDateString();

  // 월요일이고, 오늘 리마인더 안 보여줬고, 닫지 않았으면
  if (dayOfWeek === 1 &&
      appState.weeklyPlan.lastReminderDate !== today &&
      !appState.weeklyPlan.dismissed &&
      appState.weeklyPlan.focusTasks.length > 0) {
    return true;
  }
  return false;
}

/**
 * 주간 리뷰 모달 표시
 */
function showWeeklyReview() {
  const modal = document.getElementById('weekly-review-modal');
  const content = document.getElementById('weekly-review-content');

  if (!modal || !content) return;

  const report = getWeeklyReport();
  const pendingTasks = appState.tasks.filter(t => !t.completed);

  // 비교 텍스트
  let compareText = '';
  let compareClass = '';
  if (report.change > 0) {
    compareText = `▲ 지난주보다 ${report.change}개 더 완료!`;
    compareClass = 'up';
  } else if (report.change < 0) {
    compareText = `▼ 지난주보다 ${Math.abs(report.change)}개 적음`;
    compareClass = 'down';
  } else {
    compareText = '지난주와 동일';
    compareClass = '';
  }

  content.innerHTML = `
    <div class="review-summary">
      <div class="review-summary-value">${report.thisWeekCount}</div>
      <div class="review-summary-label">이번 주 완료한 작업</div>
      <div class="review-summary-compare ${compareClass}">${compareText}</div>
    </div>

    <div class="weekly-plan-section">
      <div class="weekly-plan-title">🎯 다음 주 집중할 작업 선택 (최대 3개)</div>
      <div class="weekly-plan-list" id="weekly-plan-list">
        ${pendingTasks.slice(0, 10).map(task => `
          <div class="weekly-plan-item ${appState.weeklyPlan.focusTasks.includes(task.id) ? 'selected' : ''}"
               onclick="toggleFocusTask('${escapeAttr(task.id)}')">
            <div class="weekly-plan-check">
              ${appState.weeklyPlan.focusTasks.includes(task.id) ? '✓' : ''}
            </div>
            <div class="weekly-plan-item-title">${escapeHtml(task.title)}</div>
            <div class="weekly-plan-item-category">${task.category}</div>
          </div>
        `).join('')}
        ${pendingTasks.length === 0 ? '<div style="text-align: center; color: var(--text-muted); padding: 20px;">진행 중인 작업이 없어요!</div>' : ''}
      </div>
    </div>

    <div style="margin-top: 16px; padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; font-size: 15px; color: var(--text-secondary);">
      💡 선택한 작업은 월요일에 "이번 주 집중" 알림으로 표시됩니다.
    </div>
  `;

  modal.style.display = 'flex';
}

/**
 * 집중 작업 토글
 */
function toggleFocusTask(taskId) {
  const idx = appState.weeklyPlan.focusTasks.indexOf(taskId);

  if (idx === -1) {
    // 추가 (최대 3개)
    if (appState.weeklyPlan.focusTasks.length < 3) {
      appState.weeklyPlan.focusTasks.push(taskId);
    } else {
      showToast('최대 3개까지 선택할 수 있어요', 'warning');
      return;
    }
  } else {
    // 제거
    appState.weeklyPlan.focusTasks.splice(idx, 1);
  }

  // UI 업데이트
  const items = document.querySelectorAll('.weekly-plan-item');
  items.forEach(item => {
    const match = item.getAttribute('onclick')?.match(/toggleFocusTask\('([^']+)'\)/);
    if (!match) return;
    const id = match[1];
    if (appState.weeklyPlan.focusTasks.includes(id)) {
      item.classList.add('selected');
      item.querySelector('.weekly-plan-check').textContent = '✓';
    } else {
      item.classList.remove('selected');
      item.querySelector('.weekly-plan-check').textContent = '';
    }
  });
}

/**
 * 주간 계획 저장
 */
function saveWeeklyPlan() {
  appState.weeklyPlan.lastReviewDate = new Date().toDateString();
  appState.weeklyPlan.dismissed = false;
  appState.weeklyPlan.updatedAt = new Date().toISOString();
  saveState();
  closeWeeklyReview();
  showToast('다음 주 계획이 저장되었어요! 💪', 'success');
}

/**
 * 주간 리뷰 모달 닫기
 */
function closeWeeklyReview() {
  const modal = document.getElementById('weekly-review-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 월요일 리마인더 닫기
 */
function dismissMondayReminder() {
  appState.weeklyPlan.lastReminderDate = new Date().toDateString();
  appState.weeklyPlan.dismissed = true;
  appState.weeklyPlan.updatedAt = new Date().toISOString();
  saveState();
  renderStatic();
}

// ============================================
// 퀵 필터 & 추가 기능
// ============================================

/**
 * 퀵 필터 설정
 */
function setQuickFilter(filter) {
  appState.quickFilter = appState.quickFilter === filter ? null : filter;
  renderStatic();
}

/**
 * 퀵 필터 적용된 작업 수 계산
 */
function getQuickFilterCount(filter) {
  const pending = appState.tasks.filter(t => !t.completed);
  switch (filter) {
    case '2min':
      return pending.filter(t => t.estimatedTime && t.estimatedTime <= 2).length;
    case '5min':
      return pending.filter(t => t.estimatedTime && t.estimatedTime <= 5).length;
    case 'urgent':
      return pending.filter(t => {
        if (!t.deadline) return false;
        const hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
        return hoursLeft <= 24 && hoursLeft > 0;
      }).length;
    default:
      return 0;
  }
}

/**
 * 작업 내일로 미루기
 */
function postponeTask(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  // 미루기 횟수 증가
  task.postponeCount = (task.postponeCount || 0) + 1;
  task.lastPostponed = new Date().toISOString();

  // 마감이 있으면 하루 연장
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    deadline.setDate(deadline.getDate() + 1);
    task.deadline = getLocalDateTimeStr(deadline);
  }

  saveState();

  if (task.postponeCount >= 3) {
    showToast(`⚠️ 이 작업을 ${task.postponeCount}번 미뤘어요. 오늘 해치워버리는 건 어때요?`, 'warning');
  } else {
    showToast('내일로 미뤘어요. 오늘은 쉬어도 돼요! 😌', 'success');
  }

  renderStatic();
}

/**
 * 실제 소요시간 입력 모달 표시
 */
function showTimeInputModal(taskId) {
  // 이미 모달이 열려있으면 기존 것 닫고 새로 열기
  if (appState.pendingTimeInput) closeTimeInputModal();
  appState.pendingTimeInput = taskId;
  renderStatic();

  // 모달 표시
  setTimeout(() => {
    const modal = document.getElementById('time-input-modal');
    if (modal) modal.classList.add('show');
  }, 50);
}

/**
 * 실제 소요시간 저장
 */
function saveActualTime(minutes) {
  const taskId = appState.pendingTimeInput;
  if (!taskId) return;

  const parsed = parseInt(minutes);
  if (isNaN(parsed) || parsed <= 0) {
    showToast('유효한 시간을 입력해주세요', 'error');
    return;
  }

  const task = appState.tasks.find(t => t.id === taskId);
  if (task) {
    task.actualTime = parsed;
    saveState();
  }

  closeTimeInputModal();
  renderStatic();
}

/**
 * 실제 소요시간 입력 모달 닫기
 */
function closeTimeInputModal() {
  const modal = document.getElementById('time-input-modal');
  if (modal) modal.classList.remove('show');
  appState.pendingTimeInput = null;
}

/**
 * 시간 예측 정확도 계산
 */
function getTimeAccuracy() {
  const tasksWithBoth = appState.tasks.filter(t =>
    t.completed && t.estimatedTime && t.actualTime
  );

  if (tasksWithBoth.length < 3) return null;

  const totalEstimated = tasksWithBoth.reduce((sum, t) => sum + t.estimatedTime, 0);
  const totalActual = tasksWithBoth.reduce((sum, t) => sum + t.actualTime, 0);
  const ratio = totalActual / totalEstimated;

  return {
    ratio: ratio.toFixed(2),
    message: ratio > 1.2 ? '예상보다 시간이 더 걸려요' :
             ratio < 0.8 ? '예상보다 빨리 끝내요!' :
             '시간 예측이 정확해요!',
    count: tasksWithBoth.length
  };
}

/**
 * 오늘의 명언 가져오기
 */
function getDailyQuote() {
  const quotes = [
    { text: "완벽하게 하려고 하지 마세요. 그냥 시작하세요.", author: "ADHD 생존 가이드" },
    { text: "5분만 해보자. 5분 후에 그만둬도 돼.", author: "포모도로 철학" },
    { text: "큰 일도 작은 조각으로 나누면 할 수 있어요.", author: "작업 분해의 힘" },
    { text: "지금 안 하면 내일의 내가 힘들어해요.", author: "미래의 나에게" },
    { text: "실수해도 괜찮아요. 다시 시작하면 돼요.", author: "성장 마인드셋" },
    { text: "오늘 할 일을 내일로 미루면, 내일은 두 배가 돼요.", author: "벤자민 프랭클린" },
    { text: "시작이 반이다. 나머지 반은 그냥 계속하는 것.", author: "동기부여 101" },
    { text: "완료된 50%가 완벽한 0%보다 낫다.", author: "실용주의" },
    { text: "휴식도 생산성의 일부예요. 쉴 때 쉬세요.", author: "번아웃 예방" },
    { text: "작은 승리를 축하하세요. 그게 큰 승리가 됩니다.", author: "도파민 관리법" },
    { text: "지금 이 순간에 집중하세요. 과거와 미래는 잠시 내려놓고.", author: "마음챙김" },
    { text: "어제보다 1%만 나아지면 1년 후엔 37배가 돼요.", author: "복리의 힘" },
    { text: "못하는 게 아니라, 아직 안 한 것뿐이에요.", author: "성장 마인드셋" },
    { text: "에너지가 낮을 때는 쉬운 것부터. 높을 때 어려운 것.", author: "에너지 관리" }
  ];

  // 오늘 날짜 기반 고정 인덱스 (하루 동안 같은 명언)
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % quotes.length;

  return quotes[index];
}

/**
 * 랜덤 휴식 활동 추천
 */
function getRestActivity() {
  const activities = [
    { icon: '🚶', text: '5분 산책하기', desc: '햇빛과 신선한 공기!' },
    { icon: '🧘', text: '스트레칭하기', desc: '몸을 풀어주세요' },
    { icon: '☕', text: '따뜻한 음료 마시기', desc: '잠시 여유를 즐기세요' },
    { icon: '🎵', text: '좋아하는 노래 듣기', desc: '기분 전환!' },
    { icon: '👀', text: '창밖 바라보기', desc: '눈의 피로를 풀어주세요' },
    { icon: '💭', text: '5분 명상하기', desc: '마음을 비우세요' },
    { icon: '🤸', text: '간단한 운동하기', desc: '점핑잭 10개 어때요?' },
    { icon: '📱', text: '친구에게 안부 보내기', desc: '연결의 기쁨' }
  ];

  return activities[Math.floor(Math.random() * activities.length)];
}

/**
 * 검색 및 필터 적용된 작업 목록
 */
function getSearchFilteredTasks(tasks) {
  let filtered = tasks;

  // 카테고리 필터
  if (appState.categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === appState.categoryFilter);
  }

  // 태그 필터
  if (appState.tagFilter) {
    filtered = filtered.filter(t => t.tags && t.tags.includes(appState.tagFilter));
  }

  // 검색어 필터 (제목, 태그, 서브태스크 포함)
  if (appState.searchQuery.trim()) {
    const query = appState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => {
      // 제목 검색
      if (t.title.toLowerCase().includes(query)) return true;
      // 태그 검색
      if (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query))) return true;
      // 서브태스크 검색
      if (t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(query))) return true;
      return false;
    });
  }

  return filtered;
}

/**
 * 날짜가 주말인지 확인
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 일정 뷰용 작업 그룹화 (날짜별)
 */
function getTasksByDate() {
  const now = new Date();
  const tasks = appState.tasks.filter(t => !t.completed && t.deadline);
  const grouped = {};

  // 오늘부터 7일간의 날짜 생성
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateKey = getLocalDateStr(date);
    grouped[dateKey] = {
      date: date,
      dayName: getDayName(date),
      isToday: i === 0,
      isWeekend: isWeekend(date),
      tasks: []
    };
  }

  // 작업을 날짜별로 분류
  tasks.forEach(task => {
    const taskDate = getLocalDateStr(new Date(task.deadline));
    if (grouped[taskDate]) {
      grouped[taskDate].tasks.push(task);
    }
  });

  // 각 날짜의 작업을 시간순 정렬
  Object.values(grouped).forEach(day => {
    day.tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  });

  // 필터 적용
  let result = Object.values(grouped);

  if (appState.scheduleFilter === 'weekday') {
    result = result.filter(day => !day.isWeekend);
  } else if (appState.scheduleFilter === 'weekend') {
    result = result.filter(day => day.isWeekend);
  } else if (appState.scheduleFilter === 'today') {
    result = result.filter(day => day.isToday);
  }

  return result;
}

/**
 * 요일 이름 반환
 */
function getDayName(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[date.getDay()];
  const month = date.getMonth() + 1;
  const dateNum = date.getDate();
  return `${month}/${dateNum} (${day})`;
}

/**
 * 시간만 포맷팅
 */
function formatTime(deadline) {
  const d = new Date(deadline);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// 스와이프 제스처
// ============================================

function handleTouchStart(e, taskId) {
  appState.touchStart = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    taskId: taskId
  };
  appState.touchingTaskId = taskId;
}

function handleTouchMove(e, taskId) {
  if (!appState.touchStart || appState.touchStart.taskId !== taskId) return;

  const deltaX = e.touches[0].clientX - appState.touchStart.x;
  const deltaY = e.touches[0].clientY - appState.touchStart.y;
  const taskEl = document.getElementById(`task-${taskId}`);

  // 수평 스와이프가 수직보다 클 때만 스와이프로 인식
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
    e.preventDefault(); // 스크롤 방지

    if (deltaX < -30) {
      taskEl.classList.add('swiping-left');
      taskEl.classList.remove('swiping-right');
    } else if (deltaX > 30) {
      taskEl.classList.add('swiping-right');
      taskEl.classList.remove('swiping-left');
    }
  }
}

function handleTouchEnd(e, taskId) {
  if (!appState.touchStart || appState.touchStart.taskId !== taskId) return;
  if (!e.changedTouches || !e.changedTouches[0]) { appState.touchStart = null; return; }

  const deltaX = e.changedTouches[0].clientX - appState.touchStart.x;
  const taskEl = document.getElementById(`task-${taskId}`);

  if (deltaX < -100) {
    completeTask(taskId);
    if (navigator.vibrate) navigator.vibrate(50);
  } else if (deltaX > 100) {
    deleteTask(taskId);
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  }

  if (taskEl) {
    taskEl.classList.remove('swiping-left', 'swiping-right');
  }
  appState.touchStart = null;
  appState.touchingTaskId = null;
}

// ============================================
// 백업/복원
// ============================================

/**
 * JSON으로 데이터 내보내기
 */
function exportData() {
  try {
    const data = {
      version: '2.3',
      exportDate: new Date().toISOString(),
      tasks: appState.tasks,
      shuttleSuccess: appState.shuttleSuccess,
      availableTags: appState.availableTags,
      streak: appState.streak,
      habitStreaks: appState.habitStreaks || {},
      theme: appState.theme,
      settings: appState.settings,
      templates: appState.templates,
      workProjects: appState.workProjects,
      workTemplates: appState.workTemplates,
      lifeRhythm: appState.lifeRhythm,
      weeklyPlan: appState.weeklyPlan,
      completionLog: appState.completionLog,
      trash: appState.trash
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob(['\uFEFF' + json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `navigator-backup-${getLocalDateStr()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    // 백업 시간 기록
    localStorage.setItem('navigator-last-backup', new Date().toISOString());

    showToast('📦 백업 완료!', 'success');
  } catch (error) {
    console.error('내보내기 실패:', error);
    showToast('백업 생성 중 오류가 발생했습니다', 'error');
  }
}

/**
 * JSON에서 데이터 가져오기
 */
function importData() {
  const input = document.getElementById('file-import');
  input.value = ''; // 같은 파일 재선택 가능하도록 초기화
  input.click();
}

/**
 * 파일 선택 시 처리
 */
function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  // JSON 파일만 허용
  if (!file.name.endsWith('.json') && !file.type.includes('json')) {
    showToast('JSON 파일만 가져올 수 있습니다', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      // BOM 제거 후 파싱
      let text = event.target.result;
      if (typeof text !== 'string') { showToast('파일을 읽을 수 없습니다', 'error'); return; }
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const data = JSON.parse(text);

      // 데이터 유효성 검사
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('잘못된 파일 형식입니다');
      }

      const importedTasks = validateTasks(data.tasks);
      const choice = confirm(
        `${importedTasks.length}개의 태스크를 가져옵니다.\n\n` +
        `[확인] = 기존 데이터와 병합 (추천)\n` +
        `[취소] = 가져오기 취소`
      );

      if (choice) {
        // 병합 (태스크별 타임스탬프 기반)
        appState.tasks = mergeTasks(appState.tasks, importedTasks);
        if (data.shuttleSuccess !== undefined) {
          appState.shuttleSuccess = data.shuttleSuccess;
        }
        if (data.availableTags) {
          appState.availableTags = [...new Set([...(appState.availableTags || []), ...data.availableTags])];
        }
        if (data.streak) {
          appState.streak = {
            lastActiveDate: appState.streak.lastActiveDate > data.streak.lastActiveDate
              ? appState.streak.lastActiveDate : data.streak.lastActiveDate,
            best: Math.max(appState.streak.best || 0, data.streak.best || 0),
            current: appState.streak.lastActiveDate > data.streak.lastActiveDate
              ? appState.streak.current : data.streak.current
          };
        }
        // 습관별 스트릭 병합 (파일 임포트)
        if (data.habitStreaks) {
          const local = appState.habitStreaks || {};
          const imported = data.habitStreaks;
          const merged = { ...local };
          for (const [title, is] of Object.entries(imported)) {
            const ls = merged[title];
            if (!ls) {
              merged[title] = is;
            } else {
              merged[title] = {
                lastActiveDate: (ls.lastActiveDate || '') > (is.lastActiveDate || '') ? ls.lastActiveDate : is.lastActiveDate,
                best: Math.max(ls.best || 0, is.best || 0),
                current: (ls.lastActiveDate || '') > (is.lastActiveDate || '') ? ls.current : is.current,
              };
            }
          }
          appState.habitStreaks = merged;
        }
        // 본업 프로젝트/템플릿 병합
        if (data.workProjects && Array.isArray(data.workProjects)) {
          const localProjectIds = new Set((appState.workProjects || []).map(p => p.id));
          const newProjects = data.workProjects.filter(p => !localProjectIds.has(p.id));
          appState.workProjects = [...(appState.workProjects || []), ...newProjects];
        }
        if (data.workTemplates && Array.isArray(data.workTemplates)) {
          const localTemplateIds = new Set((appState.workTemplates || []).map(t => t.id));
          const newTemplates = data.workTemplates.filter(t => !localTemplateIds.has(t.id));
          appState.workTemplates = [...(appState.workTemplates || []), ...newTemplates];
        }
        if (data.templates && Array.isArray(data.templates)) {
          const localTplIds = new Set((appState.templates || []).map(t => t.id));
          const newTpls = data.templates.filter(t => !localTplIds.has(t.id));
          appState.templates = [...(appState.templates || []), ...newTpls];
        }
        if (data.settings) {
          appState.settings = { ...appState.settings, ...data.settings };
        }
        // 라이프 리듬 병합 (날짜 비교 포함)
        if (data.lifeRhythm) {
          const importRhythm = data.lifeRhythm;
          const localRhythm = appState.lifeRhythm;
          const mergedHistory = { ...(localRhythm.history || {}), ...(importRhythm.history || {}) };
          const { today: mergedToday, history: updatedHistory } = mergeRhythmToday(
            localRhythm.today, importRhythm.today, mergedHistory
          );
          appState.lifeRhythm = {
            ...localRhythm,
            history: updatedHistory,
            today: mergedToday,
            settings: { ...(localRhythm.settings || {}), ...(importRhythm.settings || {}) }
          };
          saveLifeRhythm();
        }
      // 통근 트래커 병합 (deletedIds 필터링 + updatedAt 최신 우선)
      if (data.commuteTracker) {
        const cloud = data.commuteTracker;
        const local = appState.commuteTracker;
        const deletedRoutes = appState.deletedIds.commuteRoutes || {};
        const routeMap = {};
        (local.routes || []).forEach(r => { if (!deletedRoutes[r.id]) routeMap[r.id] = r; });
        (cloud.routes || []).forEach(r => {
          if (deletedRoutes[r.id]) return;
          const existing = routeMap[r.id];
          if (!existing) { routeMap[r.id] = r; return; }
          const eTime = existing.updatedAt || existing.createdAt || '';
          const cTime = r.updatedAt || r.createdAt || '';
          if (cTime > eTime) routeMap[r.id] = r;
        });
        appState.commuteTracker.routes = Object.values(routeMap);
        const mergedTrips = { ...(cloud.trips || {}), ...(local.trips || {}) };
        appState.commuteTracker.trips = mergedTrips;
        appState.commuteTracker.settings = { ...(cloud.settings || {}), ...(local.settings || {}) };
        localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
      }
        // 완료 기록 로그 병합
        if (data.completionLog) {
          appState.completionLog = mergeCompletionLog(appState.completionLog, data.completionLog);
        }
        // 주간 계획 병합
        if (data.weeklyPlan) {
          appState.weeklyPlan = data.weeklyPlan;
        }
        // 휴지통 병합
        if (Array.isArray(data.trash)) {
          const trashMap = new Map();
          (appState.trash || []).forEach(t => trashMap.set(t.id, t));
          data.trash.forEach(t => {
            if (!trashMap.has(t.id)) trashMap.set(t.id, t);
          });
          appState.trash = Array.from(trashMap.values());
        }
        saveState();
        recomputeTodayStats();
        renderStatic();
        showToast(`${importedTasks.length}개 태스크를 병합했습니다`, 'success');
      }
    } catch (error) {
      console.error('가져오기 실패:', error);
      showToast('파일을 읽을 수 없습니다', 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');

  // 인풋 초기화 (같은 파일 다시 선택 가능하게)
  e.target.value = '';
}

// ============================================
// UI 헬퍼
// ============================================

/**
 * 토스트 알림 표시
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

/**
 * 실행취소 토스트 표시 (완료 후 3초간)
 */
let undoToastTimeout = null;
let undoToastInterval = null;
function showUndoToast(taskId, taskTitle) {
  // 기존 토스트/타이머 제거
  const existingToast = document.querySelector('.toast-undo');
  if (existingToast) existingToast.remove();
  if (undoToastTimeout) clearTimeout(undoToastTimeout);
  if (undoToastInterval) clearInterval(undoToastInterval);

  const toast = document.createElement('div');
  toast.className = 'toast-undo';
  toast.innerHTML = `
    <span class="toast-undo-text">✓ "${escapeHtml(taskTitle.substring(0, 15))}${taskTitle.length > 15 ? '...' : ''}" 완료</span>
    <button class="toast-undo-btn" onclick="undoComplete('${taskId}')">↩ 실행취소</button>
    <span class="toast-undo-timer">5</span>
  `;
  document.body.appendChild(toast);

  // 카운트다운 (5초)
  let countdown = 5;
  const timerEl = toast.querySelector('.toast-undo-timer');
  undoToastInterval = setInterval(() => {
    countdown--;
    if (timerEl) timerEl.textContent = countdown;
  }, 1000);

  // 5초 후 자동 제거
  undoToastTimeout = setTimeout(() => {
    clearInterval(undoToastInterval);
    undoToastInterval = null;
    toast.remove();
  }, 5000);
}

/**
 * 실행취소 (토스트에서 호출)
 */
function undoComplete(taskId) {
  // 토스트 및 타이머 즉시 제거
  const toast = document.querySelector('.toast-undo');
  if (toast) toast.remove();
  if (undoToastTimeout) clearTimeout(undoToastTimeout);
  if (undoToastInterval) { clearInterval(undoToastInterval); undoToastInterval = null; }

  // 완료 취소 처리
  uncompleteTask(taskId);
}
window.undoComplete = undoComplete;

// ============================================
// 온보딩 & 스트릭 & 포커스 모드
// ============================================

/**
 * 온보딩 모달 표시
 */
function showOnboarding() {
  appState.showOnboarding = true;
  renderStatic();
}

/**
 * 온보딩 완료 및 샘플 데이터 추가
 */
function completeOnboarding(addSamples = true) {
  localStorage.setItem('navigator-visited', 'true');
  appState.showOnboarding = false;

  if (addSamples) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sampleTasks = [
      {
        id: generateId(),
        title: '👋 Navigator 사용법 익히기',
        category: '일상',
        estimatedTime: 5,
        tags: ['긴급'],
        subtasks: [
          { text: '작업 추가해보기', completed: false },
          { text: '완료 체크해보기', completed: false },
          { text: '태그 사용해보기', completed: false }
        ],
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: generateId(),
        title: '오늘 할 일 정리하기',
        category: '일상',
        estimatedTime: 10,
        deadline: getLocalDateTimeStr(tomorrow),
        tags: [],
        subtasks: [],
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: generateId(),
        title: '주간 목표 세우기',
        category: '본업',
        estimatedTime: 15,
        deadline: getLocalDateTimeStr(nextWeek),
        tags: ['회의'],
        subtasks: [],
        completed: false,
        createdAt: now.toISOString()
      }
    ];

    appState.tasks = sampleTasks;
    saveState();
    showToast('🎉 샘플 작업이 추가되었습니다!', 'success');
  }

  renderStatic();
}

/**
 * 스트릭 업데이트
 */
function updateStreak() {
  // YYYY-MM-DD 포맷으로 비교 (toDateString은 연도 넘어갈 때 문자열 비교 실패)
  const today = getLocalDateStr(new Date());
  const lastActive = appState.streak.lastActiveDate;

  if (!lastActive) {
    // 첫 사용
    return;
  }

  const lastDate = new Date(lastActive);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (getLocalDateStr(lastDate) === getLocalDateStr(yesterday)) {
    // 어제 활동함 → 스트릭 유지
  } else if (getLocalDateStr(lastDate) !== today) {
    // 어제 활동 안 함 → 스트릭 리셋
    appState.streak.current = 0;
  }
}

/**
 * 오늘 활동 기록 (작업 완료 시 호출)
 * @param {string} [taskTitle] - 완료된 작업 제목 (per-habit 스트릭용)
 */
function recordActivity(taskTitle) {
  const today = getLocalDateStr(new Date());

  // 전역 스트릭
  if (appState.streak.lastActiveDate !== today) {
    appState.streak.current++;
    appState.streak.lastActiveDate = today;

    if (appState.streak.current > appState.streak.best) {
      appState.streak.best = appState.streak.current;
    }

    if (!appState.user) {
      localStorage.setItem('navigator-streak', JSON.stringify(appState.streak));
    }

    if (appState.streak.current > 1) {
      showToast(`🔥 ${appState.streak.current}일 연속 달성!`, 'success');
    }
  }

  // per-habit 스트릭
  if (taskTitle) {
    if (!appState.habitStreaks) appState.habitStreaks = {};
    const hs = appState.habitStreaks[taskTitle] || { current: 0, best: 0, lastActiveDate: null };

    if (hs.lastActiveDate !== today) {
      // 연속 확인: 어제 활동했으면 이어가기, 아니면 리셋
      if (hs.lastActiveDate) {
        const lastDate = new Date(hs.lastActiveDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (getLocalDateStr(lastDate) !== getLocalDateStr(yesterday) && hs.lastActiveDate !== today) {
          hs.current = 0; // 리셋
        }
      }
      hs.current++;
      hs.lastActiveDate = today;
      if (hs.current > hs.best) hs.best = hs.current;
      appState.habitStreaks[taskTitle] = hs;

      if (!appState.user) {
        localStorage.setItem('navigator-habitStreaks', JSON.stringify(appState.habitStreaks));
      }
    }
  }
}

/**
 * completionLog localStorage 저장
 */
function saveCompletionLog() {
  try {
    if (!appState.user) {
      localStorage.setItem('navigator-completion-log', JSON.stringify(appState.completionLog));
    }
    // 로그인 사용자는 syncToFirebase()로 Firestore에 저장됨 (_doSaveState 경유)
  } catch (e) {
    console.error('완료 로그 저장 실패:', e);
  }
}

/**
 * completionLog localStorage 로드 + 기존 데이터 마이그레이션
 */
function loadCompletionLog() {
  const parsed = safeParseJSON('navigator-completion-log', null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    appState.completionLog = parsed;
  }

  // 기존 사용자 마이그레이션: appState.tasks에 남아있는 완료 태스크를 completionLog로 이전
  if (Object.keys(appState.completionLog).length === 0) {
    let migrated = 0;
    appState.tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const d = new Date(t.completedAt);
        const dateKey = getLocalDateStr(d);
        const timeStr = d.toTimeString().slice(0, 5);
        if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
        const entry = { t: t.title, c: t.category || '기타', at: timeStr };
        if (t.repeatType && t.repeatType !== 'none') entry.r = t.repeatType;
        if (t.expectedRevenue) entry.rv = Number(t.expectedRevenue);
        appState.completionLog[dateKey].push(entry);
        migrated++;
      }
    });
    // 기존 completion-history도 마이그레이션
    const oldHistory = safeParseJSON('navigator-completion-history', []);
    oldHistory.forEach(h => {
      if (h.completedAt) {
        const d = new Date(h.completedAt);
        const dateKey = getLocalDateStr(d);
        const timeStr = d.toTimeString().slice(0, 5);
        if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
        // 중복 방지 (title+time 기준)
        const exists = appState.completionLog[dateKey].some(e => e.t === h.title && e.at === timeStr);
        if (!exists) {
          appState.completionLog[dateKey].push({
            t: h.title, c: h.category || '기타', at: timeStr
          });
          migrated++;
        }
      }
    });
    if (migrated > 0) {
      saveCompletionLog();
      console.log(`[migration] completionLog에 ${migrated}건 마이그레이션 완료`);
    }
  }
}

/**
 * completionLog 병합 (Firebase 동기화용)
 * 날짜별 합집합, title+at 기준 중복 제거
 */
function mergeCompletionLog(local, cloud) {
  const merged = {};
  // 로컬 데이터 먼저 복사
  for (const date of Object.keys(local || {})) {
    merged[date] = [...(local[date] || [])];
  }
  // 클라우드 데이터 병합
  for (const date of Object.keys(cloud || {})) {
    if (!merged[date]) {
      merged[date] = [...(cloud[date] || [])];
    } else {
      // 한쪽이 압축 데이터(_summary)면 더 많은 데이터를 가진 쪽 우선
      const localIsSummary = merged[date].length === 1 && merged[date][0]?._summary;
      const cloudEntries = cloud[date] || [];
      const cloudIsSummary = cloudEntries.length === 1 && cloudEntries[0]?._summary;

      if (localIsSummary && !cloudIsSummary && cloudEntries.length > 0) {
        // 클라우드에 상세 데이터가 있으면 클라우드 우선
        merged[date] = [...cloudEntries];
      } else if (!localIsSummary && cloudIsSummary) {
        // 로컬에 상세 데이터가 있으면 로컬 유지
      } else {
        // 둘 다 일반 데이터이거나 둘 다 압축 — 기존 로직
        const existing = new Set(merged[date].map(e => (e.t || '') + '|' + (e.at || '')));
        for (const entry of cloudEntries) {
          if (entry._summary) continue; // 압축 항목은 병합하지 않음
          if (!existing.has((entry.t || '') + '|' + (entry.at || ''))) {
            merged[date].push(entry);
          }
        }
      }
    }
  }
  return merged;
}

/**
 * completionLog 데이터 보존 정책:
 * - 최근 365일: 전체 상세 기록 유지
 * - 1년 이상: 일별 요약으로 압축 { count, categories: {본업:2}, totalRevenue: 150000 }
 * 앱 시작 시 1일 1회 자동 실행
 */
function compactOldCompletionLog() {
  const lastCompact = localStorage.getItem('navigator-completion-log-compact-date');
  const todayStr = getLocalDateStr();
  if (lastCompact === todayStr) return; // 오늘 이미 실행

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = getLocalDateStr(cutoff);

  let compacted = 0;
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (dateKey >= cutoffStr) continue; // 1년 이내는 유지
    if (!Array.isArray(entries)) continue;
    // 이미 압축된 형태인지 확인 (배열 길이 1 + _summary 플래그)
    if (entries.length === 1 && entries[0]._summary) continue;

    // 일별 요약으로 압축
    const cats = {};
    let totalRev = 0;
    entries.forEach(e => {
      cats[e.c || '기타'] = (cats[e.c || '기타'] || 0) + 1;
      if (e.rv) totalRev += e.rv;
    });

    appState.completionLog[dateKey] = [{
      _summary: true,
      count: entries.length,
      categories: cats,
      totalRevenue: totalRev
    }];
    compacted++;
  }

  if (compacted > 0) {
    saveCompletionLog();
    console.log(`[compact] completionLog ${compacted}일 압축 완료`);
  }

  localStorage.setItem('navigator-completion-log-compact-date', todayStr);
}

/**
 * completionLog에서 날짜 범위 내 엔트리 조회
 * @param {string} startDateStr - YYYY-MM-DD (포함)
 * @param {string} endDateStr - YYYY-MM-DD (미포함)
 * @returns {Array} [{t, c, at, r?, rv?, dateKey}, ...]
 */
function getCompletionLogEntries(startDateStr, endDateStr) {
  const entries = [];
  for (const [dateKey, dayEntries] of Object.entries(appState.completionLog || {})) {
    if (dateKey >= startDateStr && dateKey < endDateStr) {
      (dayEntries || []).forEach(e => {
        if (e._summary) {
          // 압축된 데이터: 카테고리별 가상 엔트리 생성
          for (const [cat, cnt] of Object.entries(e.categories || {})) {
            for (let i = 0; i < cnt; i++) {
              entries.push({ t: '(요약)', c: cat, at: '00:00', rv: 0, dateKey });
            }
          }
        } else {
          entries.push({ ...e, dateKey });
        }
      });
    }
  }
  return entries;
}

function getWeeklyReport() {
  const now = new Date();

  // 이번 주 시작 (일요일)
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const thisWeekStartStr = getLocalDateStr(thisWeekStart);

  // 지난 주 시작/끝
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = getLocalDateStr(lastWeekStart);

  // 내일 (이번 주 종료 기준)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  // completionLog 기반 이번 주 / 지난 주 완료 작업 조회
  const thisWeekEntries = getCompletionLogEntries(thisWeekStartStr, tomorrowStr);
  const lastWeekEntries = getCompletionLogEntries(lastWeekStartStr, thisWeekStartStr);

  // 요일별 완료 수 계산
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayData = [0, 0, 0, 0, 0, 0, 0];

  thisWeekEntries.forEach(e => {
    const day = new Date(e.dateKey).getDay();
    dayData[day]++;
  });

  // 가장 생산적인 요일
  const maxDayIdx = dayData.indexOf(Math.max(...dayData));
  const bestDay = dayData[maxDayIdx] > 0 ? dayNames[maxDayIdx] : '-';
  const bestDayCount = dayData[maxDayIdx];

  // 카테고리별 완료 수
  const categoryData = {};
  thisWeekEntries.forEach(e => {
    const cat = e.c || '기타';
    categoryData[cat] = (categoryData[cat] || 0) + 1;
  });

  // 가장 많이 완료한 카테고리
  let topCategory = '-';
  let topCategoryCount = 0;
  Object.keys(categoryData).forEach(cat => {
    if (categoryData[cat] > topCategoryCount) {
      topCategoryCount = categoryData[cat];
      topCategory = cat;
    }
  });

  // 변화량 계산
  const change = thisWeekEntries.length - lastWeekEntries.length;

  return {
    thisWeekCount: thisWeekEntries.length,
    lastWeekCount: lastWeekEntries.length,
    change: change,
    bestDay: bestDay,
    bestDayCount: bestDayCount,
    topCategory: topCategory,
    topCategoryCount: topCategoryCount,
    dayData: dayData.map((count, i) => ({ day: dayNames[i], count })),
    streak: appState.streak.current
  };
}

/**
 * 습관 트래커 데이터 생성 (최근 12주)
 * @param {string} [habitTitle] - 특정 습관 필터 (없으면 전체)
 */
function getHabitTrackerData(habitTitle) {
  const now = new Date();
  const weeks = 12;
  const data = [];

  // 오늘 날짜 문자열
  const todayStr = getLocalDateStr(now);

  // 완료 맵 생성 (습관 필터 전달)
  const completionMap = getCompletionMap(habitTitle);

  // per-habit은 1일 1회이므로 레벨 기준 조정
  const isPerHabit = habitTitle && habitTitle !== 'all';

  // 12주 전부터 시작
  for (let week = weeks - 1; week >= 0; week--) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (week * 7 + (6 - day)) - now.getDay());
      const dateStr = getLocalDateStr(date);
      const count = completionMap[dateStr] || 0;

      // 레벨 계산 (per-habit: 완료=level 4, 전체: 기존 기준)
      let level = 0;
      if (isPerHabit) {
        if (count >= 1) level = 4;
      } else {
        if (count >= 1) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;
        if (count >= 7) level = 4;
      }

      weekData.push({
        date: dateStr,
        count: count,
        level: level,
        isToday: dateStr === todayStr
      });
    }
    data.push(weekData);
  }

  return data;
}

/**
 * 반복 습관(daily/weekdays) 목록 추출 — 트래커 필터용
 */
function getRecurringHabits() {
  const habits = new Set();
  // 현재 반복 작업에서 추출
  appState.tasks.forEach(t => {
    if (t.repeatType && t.repeatType !== 'none') {
      habits.add(t.title);
    }
  });
  // completionLog에서 자주 등장하는 제목도 추출 (최근 30일)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = getLocalDateStr(cutoff);
  const titleCounts = {};
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (dateKey < cutoffStr) continue;
    (entries || []).forEach(e => {
      if (e.t && !e._summary) {
        titleCounts[e.t] = (titleCounts[e.t] || 0) + 1;
      }
    });
  }
  // 5회 이상 완료된 것도 습관으로 간주
  Object.entries(titleCounts).forEach(([title, count]) => {
    if (count >= 5) habits.add(title);
  });
  return [...habits].sort();
}

/**
 * 백업 리마인더 체크
 */
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('navigator-last-backup');
  const now = new Date();

  if (!lastBackup) {
    // 첫 사용이거나 백업 기록 없음
    return;
  }

  const daysSinceBackup = (now - new Date(lastBackup)) / (1000 * 60 * 60 * 24);

  if (daysSinceBackup >= 7) {
    setTimeout(() => {
      if (confirm('📦 마지막 백업 후 7일이 지났습니다.\n\n지금 백업하시겠습니까?')) {
        exportData();
      }
    }, 2000);
  }
}

/**
 * 포커스 모드 토글
 */
function toggleFocusMode() {
  appState.focusMode = !appState.focusMode;
  renderStatic();

  if (appState.focusMode) {
    showToast('🎯 포커스 모드: 가장 중요한 작업 1개만 표시', 'success');
  }
}

/**
 * 마감시간 포맷팅
 */
function formatDeadline(deadline) {
  const now = new Date();
  const d = new Date(deadline);
  const hoursLeft = (d - now) / (1000 * 60 * 60);
  
  if (hoursLeft < 1) {
    return `${Math.round(hoursLeft * 60)}분 후`;
  } else if (hoursLeft < 24) {
    return `${Math.round(hoursLeft)}시간 후`;
  }
  
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

