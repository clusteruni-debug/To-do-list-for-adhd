// ============================================
// 사용자 액션 핸들러
// ============================================

/**
 * 탭 전환
 */
function switchTab(tab) {
  appState.currentTab = tab;
  renderStatic();
  // 접근성: 탭 전환 시 포커스 이동 + 스크린 리더 안내
  const tabContent = document.querySelector('.tab-content.active');
  if (tabContent) {
    tabContent.setAttribute('tabindex', '-1');
    tabContent.focus({ preventScroll: true });
  }
  srAnnounce(tab + ' 탭');
}

/**
 * 테마 전환
 */
function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', appState.theme);
  saveState();
  renderStatic();
}

/**
 * 테마 적용 (페이지 로드 시)
 */
function applyTheme() {
  document.body.setAttribute('data-theme', appState.theme);
}

/**
 * 설정 모달 열기
 */
function openSettings() {
  appState.showSettings = true;
  renderStatic();
}

/**
 * 설정 모달 닫기
 */
function closeSettings() {
  appState.showSettings = false;
  renderStatic();
}

/**
 * 개별 설정 업데이트
 */
function updateSetting(key, value) {
  appState.settings[key] = value;
  saveState();
  renderStatic();
}

// ============================================
// 템플릿 관리
// ============================================

/**
 * 카테고리별 아이콘 반환
 */
function getCategoryIcon(category) {
  switch(category) {
    case '본업': return '💼';
    case '부업': return '💰';
    case '일상': return '🏠';
    case '가족': return '👨‍👩‍👧';
    default: return '📌';
  }
}

/**
 * 템플릿 삭제
 */
function deleteTemplate(templateId) {
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.templates[templateId] = new Date().toISOString();
  appState.templates = appState.templates.filter(t => t.id !== templateId);
  saveTemplates();
  renderStatic();
}

/**
 * 빠른 추가에서 템플릿 저장
 */
function saveCurrentAsTemplate() {
  const title = appState.quickAddValue.trim();
  if (!title) {
    showToast('제목을 먼저 입력하세요', 'error');
    return;
  }

  const template = {
    id: generateId(),
    title: title,
    category: '부업',
    estimatedTime: 10,
    tags: [],
    icon: '💰'
  };

  appState.templates.push(template);
  saveTemplates();
  appState.quickAddValue = '';
  const input = document.getElementById('quick-add-input');
  if (input) input.value = '';

  showToast('템플릿으로 저장됨', 'success');
  renderStatic();
}

/**
 * 템플릿 저장 (localStorage)
 */
function saveTemplates() {
  try {
    if (!appState.user) {
      localStorage.setItem('navigator-templates', JSON.stringify(appState.templates));
    }
    // Firebase 동기화 (로그인된 경우)
    if (appState.user) {
      syncToFirebase();
    }
  } catch (e) {
    console.error('템플릿 저장 실패:', e);
  }
}

/**
 * 템플릿 로드 (localStorage)
 */
function loadTemplates() {
  try {
    const saved = localStorage.getItem('navigator-templates');
    if (saved) {
      appState.templates = JSON.parse(saved);
    }
  } catch (e) {
    console.error('템플릿 로드 실패:', e);
    appState.templates = [];
  }
}

/**
 * 일상/가족 빠른 추가
 */
function quickAddLifeTask() {
  const input = document.getElementById('life-quick-input');
  if (!input || !input.value.trim()) return;

  let title = input.value.trim();
  let category = '일상';

  // #가족 태그 감지
  if (title.includes('#가족')) {
    category = '가족';
    title = title.replace('#가족', '').trim();
  }

  const newTask = {
    id: generateId(),
    title: title,
    category: category,
    completed: false,
    deadline: '',
    estimatedTime: 15,
    link: '',
    expectedRevenue: '',
    repeatType: 'none',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.tasks.push(newTask);
  saveState();
  input.value = '';
  renderStatic();

  // 바로 수정 모달 열기 (상세 설정 기회 제공)
  setTimeout(() => {
    appState.quickEditTaskId = newTask.id;
    showQuickEditModal(newTask);
  }, 100);
}
window.quickAddLifeTask = quickAddLifeTask;

/**
 * 완료된 반복 작업 리셋 (일상 카테고리 반복 작업만)
 */
function resetCompletedRepeatTasks() {
  const repeatTasks = appState.tasks.filter(t =>
    t.category === '일상' &&
    t.completed &&
    t.repeatType &&
    t.repeatType !== 'none'
  );

  if (repeatTasks.length === 0) {
    showToast('리셋할 반복 작업이 없습니다', 'info');
    return;
  }

  appState.tasks = appState.tasks.map(t => {
    if (t.category === '일상' && t.completed && t.repeatType && t.repeatType !== 'none') {
      return {
        ...t,
        completed: false,
        completedAt: null,
        updatedAt: new Date().toISOString()
      };
    }
    return t;
  });

  saveState();
  renderStatic();
  showToast(`${repeatTasks.length}개 반복 작업 리셋됨`, 'success');
}
window.resetCompletedRepeatTasks = resetCompletedRepeatTasks;

/**
 * 본업 빠른 추가 (프로젝트 없이)
 */
function quickAddWorkTask() {
  const input = document.getElementById('work-quick-input');
  if (!input || !input.value.trim()) return;

  const newTask = {
    id: generateId(),
    title: input.value.trim(),
    category: '본업',
    completed: false,
    deadline: '',
    estimatedTime: 30,
    link: '',
    expectedRevenue: '',
    repeatType: 'none',
    tags: [],
    subtasks: [],
    workProjectId: null,
    workStageIdx: null,
    workSubcatIdx: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.tasks.push(newTask);
  saveState();
  input.value = '';
  renderStatic();

  // 바로 수정 모달 열기 (상세 설정 기회 제공)
  setTimeout(() => {
    appState.quickEditTaskId = newTask.id;
    showQuickEditModal(newTask);
  }, 100);
}
window.quickAddWorkTask = quickAddWorkTask;

/**
 * 이벤트 빠른 추가 (이벤트 탭에서 바로)
 */
function quickAddEvent() {
  const input = document.getElementById('event-quick-input');
  if (!input || !input.value.trim()) return;

  const title = input.value.trim();

  // 주최자 자동 감지 (불개미, 코같투, 맨틀 등)
  const organizers = ['불개미', '코같투', '맨틀', '핀테크', '길드'];
  let organizer = '';
  for (const org of organizers) {
    if (title.includes(org)) {
      organizer = org;
      break;
    }
  }

  const newTask = {
    id: generateId(),
    title: title,
    category: '부업',
    completed: false,
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    organizer: organizer,
    eventType: '',
    repeatType: 'none',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString()
  };

  appState.tasks.push(newTask);
  saveState();
  input.value = '';
  renderStatic();

  // 바로 수정 모달 열기 (상세 설정 기회 제공)
  setTimeout(() => {
    appState.quickEditTaskId = newTask.id;
    showQuickEditModal(newTask);
  }, 100);
}
window.quickAddEvent = quickAddEvent;

/**
 * 부업 이벤트 상세 추가 (부업 탭에서 호출)
 */
function addNewEvent() {
  appState.detailedTask = {
    title: '',
    category: '부업',
    startDate: '',
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',
    repeatType: 'none',
    repeatDays: [],
    repeatMonthDay: null,
    organizer: '',
    eventType: '',
    tags: [],
    subtasks: []
  };
  appState.showDetailedAdd = true;
  appState.editingTaskId = null;
  appState.currentTab = 'action';
  renderStatic();
  // 폼으로 스크롤
  setTimeout(() => {
    const form = document.querySelector('.detailed-add');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

/**
 * 셔틀 상태 토글
 */
function toggleShuttle() {
  appState.shuttleSuccess = !appState.shuttleSuccess;
  saveState();
  renderStatic();
}

/**
 * 템플릿에서 빠른 추가
 */
const quickTemplates = {
  writing: {
    title: '아티클 작성',
    category: '부업',
    estimatedTime: 30,
    link: 'http://localhost:3000/editor',
    tags: ['글쓰기']
  }
};

function addFromTemplate(templateName) {
  const template = quickTemplates[templateName];
  if (!template) {
    showToast('템플릿을 찾을 수 없습니다', 'error');
    return;
  }

  const now = new Date().toISOString();
  appState.tasks.push({
    id: generateId(),
    ...template,
    completed: false,
    createdAt: now,
    updatedAt: now
  });

  saveState();
  renderStatic();
  showToast(`"${template.title}" 추가됨`, 'success');

  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}
window.addFromTemplate = addFromTemplate;

/**
 * 카테고리 프리픽스 파싱 (#부업 제목 → 카테고리: 부업, 제목: 제목)
 */
function parseCategoryPrefix(input) {
  const categoryMap = {
    '#부업': '부업',
    '#본업': '본업',
    '#일상': '일상',
    '#가족': '가족',
    '#크립토': '부업',
    '#에어드랍': '부업',
    '#이벤트': '부업'
  };

  let category = '부업';  // 기본값
  let title = input.trim();

  // 해시태그 패턴 매칭 (대소문자 무시)
  for (const [prefix, cat] of Object.entries(categoryMap)) {
    if (title.toLowerCase().startsWith(prefix.toLowerCase())) {
      category = cat;
      title = title.substring(prefix.length).trim();
      break;
    }
  }

  return { category, title };
}

/**
 * 빠른 추가 (제목만 입력) - 카테고리 프리픽스 지원
 * 사용법: "#부업 제목" 또는 "#본업 제목" 형식
 */
function quickAdd() {
  const rawInput = appState.quickAddValue.trim();
  if (!rawInput) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  // 카테고리 프리픽스 파싱
  const { category, title } = parseCategoryPrefix(rawInput);

  if (!title) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  const now = new Date().toISOString();
  appState.tasks.push({
    id: generateId(),
    title: title,
    category: category,
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    completed: false,
    createdAt: now,
    updatedAt: now
  });

  appState.quickAddValue = '';
  const input = document.getElementById('quick-add-input');
  if (input) input.value = '';

  saveState();
  renderStatic();
  showToast(`[${category}] 작업이 추가되었습니다`, 'success');

  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

/**
 * 브레인 덤프 모달 표시
 * 여러 작업을 한 번에 입력 (한 줄에 하나씩, #카테고리 지원)
 */
function showBrainDumpModal() {
  // 기존 모달 제거
  const existing = document.getElementById('brain-dump-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'brain-dump-modal';
  modal.className = 'modal-overlay';
  modal.onclick = (e) => {
    if (e.target === modal) {
      const textarea = document.getElementById('brain-dump-input');
      if (textarea && textarea.value.trim()) {
        if (!confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) return;
      }
      modal.remove();
    }
  };
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h2>🧠 브레인 덤프</h2>
      </div>
      <div class="modal-body">
        <textarea id="brain-dump-input" class="brain-dump-textarea"
          placeholder="한 줄에 하나씩 작업을 입력하세요&#10;&#10;예시:&#10;보고서 작성&#10;#부업 NFT 이벤트 확인&#10;#일상 장보기&#10;#가족 병원 예약"
        ></textarea>
        <div class="brain-dump-hint">
          💡 <strong>#부업</strong>, <strong>#본업</strong>, <strong>#일상</strong>, <strong>#가족</strong>으로 카테고리 지정 (기본: 부업)
        </div>
        <div class="brain-dump-count" id="brain-dump-count">0줄</div>
      </div>
      <div class="modal-footer" style="flex-direction: row; justify-content: flex-end;">
        <button class="btn-small" onclick="const t=document.getElementById('brain-dump-input'); if(t&&t.value.trim()&&!confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?'))return; document.getElementById('brain-dump-modal').remove()" style="padding: 10px 20px; font-size: 17px;">취소</button>
        <button class="btn-small complete" onclick="processBrainDump()" style="padding: 10px 20px; font-size: 17px;">추가</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const textarea = document.getElementById('brain-dump-input');
  textarea.focus();
  // 줄 수 카운터
  textarea.addEventListener('input', () => {
    const lines = textarea.value.split('\n').filter(l => l.trim()).length;
    document.getElementById('brain-dump-count').textContent = lines + '줄';
  });
}

/**
 * 브레인 덤프 처리 — textarea 내용을 줄 단위로 파싱하여 태스크 생성
 */
function processBrainDump() {
  const textarea = document.getElementById('brain-dump-input');
  if (!textarea) return;

  const lines = textarea.value.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    showToast('작업을 입력하세요', 'error');
    return;
  }

  const now = new Date().toISOString();
  let addedCount = 0;

  for (const line of lines) {
    const { category, title } = parseCategoryPrefix(line.trim());
    if (!title) continue;

    appState.tasks.push({
      id: generateId(), // crypto.randomUUID 기반 고유 ID
      title: title,
      category: category,
      deadline: '',
      estimatedTime: 10,
      link: '',
      expectedRevenue: '',
      completed: false,
      createdAt: now,
      updatedAt: now
    });
    addedCount++;
  }

  if (addedCount === 0) {
    showToast('유효한 작업이 없습니다', 'error');
    return;
  }

  // 모달 닫기
  const modal = document.getElementById('brain-dump-modal');
  if (modal) modal.remove();

  // 한 번만 저장/렌더링 (성능 최적화)
  saveState();
  renderStatic();
  showToast(`${addedCount}개 작업이 추가되었습니다`, 'success');

  if (navigator.vibrate) {
    navigator.vibrate([50, 30, 50]);
  }
}

/**
 * 상세 추가/수정
 */
function detailedAdd() {
  const task = appState.detailedTask;
  if (!task.title) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  // 본업 프로젝트에 연결된 경우
  if (task.category === '본업' && task.workProjectId && task.workSubcatIdx !== null) {
    const project = appState.workProjects.find(p => p.id === task.workProjectId);
    if (project) {
      const stageIdx = task.workStageIdx || 0;
      const subcatIdx = task.workSubcatIdx;
      const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];

      if (subcat) {
        subcat.tasks.push({
          title: task.title,
          status: 'not-started',
          logs: [],
          createdAt: new Date().toISOString()
        });
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        showToast(`"${project.name}" 프로젝트에 추가됨`, 'success');

        // 폼 초기화 후 종료
        appState.detailedTask = {
          title: '',
          category: '부업',
          startDate: '',
          deadline: '',
          estimatedTime: 10,
          link: '',
          expectedRevenue: '',
          description: '',
          repeatType: 'none',
          repeatDays: [],
          repeatMonthDay: null,
          organizer: '',
          eventType: '',
          tags: [],
          subtasks: [],
          workProjectId: null,
          workStageIdx: null,
          workSubcatIdx: null
        };
        appState.showDetailedAdd = false;
        renderStatic();
        return;
      }
    }
    showToast('프로젝트 연결 실패. 중분류를 확인하세요.', 'error');
    return;
  }

  if (appState.editingTaskId) {
    // 수정 모드
    appState.tasks = appState.tasks.map(t =>
      t.id === appState.editingTaskId
        ? { ...task, id: t.id, completed: t.completed, createdAt: t.createdAt, updatedAt: new Date().toISOString() }
        : t
    );
    showToast('작업이 수정되었습니다', 'success');
  } else {
    // 추가 모드
    const now = new Date().toISOString();
    appState.tasks.push({
      id: generateId(),
      ...task,
      completed: false,
      createdAt: now,
      updatedAt: now
    });
    showToast('작업이 추가되었습니다', 'success');
  }
  
  // 폼 초기화
  appState.detailedTask = {
    title: '',
    category: '부업',
    startDate: '',
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',
    repeatType: 'none',
    repeatDays: [],
    repeatMonthDay: null,
    organizer: '',
    eventType: '',
    tags: [],
    subtasks: [],
    workProjectId: null,
    workStageIdx: null,
    workSubcatIdx: null
  };
  appState.showDetailedAdd = false;
  appState.editingTaskId = null;

  saveState();
  renderStatic();

  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

/**
 * 작업 완료
 * 반복 작업인 경우 다음 주기로 새 작업 생성
 */
function completeTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 이미 완료된 작업이면 무시 (중복 클릭 방지)
  if (task.completed) return;

  const now = new Date();
  const completedAt = now.toISOString();

  // 완료 처리
  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completed: true, completedAt: completedAt, updatedAt: completedAt } : t
  );

  // completionLog에 영구 기록 저장
  const dateKey = getLocalDateStr(now);
  const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"
  const logEntry = { t: task.title, c: task.category, at: timeStr };
  if (task.repeatType && task.repeatType !== 'none') logEntry.r = task.repeatType;
  if (task.expectedRevenue) logEntry.rv = Number(task.expectedRevenue);
  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.completed).length;
    if (doneCount > 0) logEntry.st = doneCount;
  }
  if (!appState.completionLog[dateKey]) appState.completionLog[dateKey] = [];
  appState.completionLog[dateKey].push(logEntry);
  saveCompletionLog();

  // 오늘 통계 업데이트
  appState.todayStats.completedToday++;
  appState.todayStats.streak++;

  // 스트릭 기록 (per-habit 포함)
  recordActivity(task.title);

  // 반복 작업이면 다음 주기 작업 자동 생성
  // daily/weekdays는 checkDailyReset()이 자동 초기화하므로 중복 생성하지 않음
  if (task.repeatType && task.repeatType !== 'none'
      && task.repeatType !== 'daily' && task.repeatType !== 'weekdays') {
    // 동일 제목+카테고리+반복타입의 미완료 태스크가 이미 있으면 중복 생성 방지
    const isDuplicate = appState.tasks.some(t =>
      t.id !== task.id &&
      !t.completed &&
      t.title === task.title &&
      t.category === task.category &&
      t.repeatType === task.repeatType
    );
    if (!isDuplicate) {
      const nextTask = createNextRepeatTask(task);
      if (nextTask) {
        appState.tasks.push(nextTask);
      }
    }
  }

  saveState();

  // telegram-event-bot 연동: 연결된 이벤트 상태 업데이트
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, true);
  }

  // 완료 애니메이션 표시
  showCompletionAnimation(task.title, appState.todayStats.streak);
  srAnnounce('작업 완료: ' + task.title);

  // 실행취소 토스트 표시 (3초)
  showUndoToast(id, task.title);

  // 마일스톤 체크 (ADHD 특화 - 도파민 보상)
  checkMilestone();

  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
}

/**
 * 완료 애니메이션 표시
 */
function showCompletionAnimation(taskTitle, streak) {
  const overlay = document.getElementById('completion-overlay');
  const titleEl = document.getElementById('completion-task-title');
  const streakEl = document.getElementById('completion-streak');

  if (overlay) {
    if (titleEl) titleEl.textContent = taskTitle;
    if (streakEl) {
      if (streak > 1) {
        streakEl.textContent = `🔥 ${streak}연속 완료!`;
        streakEl.style.display = 'block';
        streakEl.classList.add('streak-fire-animate');
      } else {
        streakEl.style.display = 'none';
      }
    }

    overlay.classList.add('show');

    // 5연속 이상이면 confetti 효과
    if (streak >= 5) {
      showConfetti();
    }

    setTimeout(() => {
      overlay.classList.remove('show');
      if (streakEl) streakEl.classList.remove('streak-fire-animate');
      renderStatic();
    }, 1500);
  } else {
    renderStatic();
  }
}

/**
 * Confetti 효과 표시
 */
function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#f6ad55', '#ed64a6'];
  const shapes = ['circle', 'square', 'triangle'];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    confetti.className = `confetti ${shape}`;
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = shape !== 'triangle' ? color : 'transparent';
    confetti.style.color = color;
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';

    container.appendChild(confetti);
  }

  setTimeout(() => {
    container.remove();
  }, 4000);
}

/**
 * 성취 뱃지 팝업 표시
 */
function showAchievement(icon, title, description) {
  const popup = document.createElement('div');
  popup.className = 'achievement-popup';
  popup.innerHTML = `
    <div class="achievement-icon">${escapeHtml(icon)}</div>
    <div class="achievement-title">${escapeHtml(title)}</div>
    <div class="achievement-desc">${escapeHtml(description)}</div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.animation = 'achievement-pop 0.3s ease-in reverse forwards';
    setTimeout(() => popup.remove(), 300);
  }, 2500);
}

// ============================================
// ADHD 특화 기능
// ============================================

let quickTimerInterval = null;

/**
 * 5분 퀵타이머 시작
 */
function startQuickTimer(taskId = null) {
  if (appState.quickTimer.isRunning) {
    stopQuickTimer();
    return;
  }

  appState.quickTimer = {
    isRunning: true,
    timeLeft: 5 * 60,
    taskId: taskId
  };

  showMotivation('시작이 반이에요! 5분만 집중해봐요 💪');

  quickTimerInterval = setInterval(() => {
    appState.quickTimer.timeLeft--;

    if (appState.quickTimer.timeLeft <= 0) {
      stopQuickTimer();
      showMotivation('5분 완료! 계속할 수 있어요! 🎉');
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    renderQuickTimerDisplay();
  }, 1000);

  renderStatic();

  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
}
window.startQuickTimer = startQuickTimer;

/**
 * 퀵타이머 중지
 */
function stopQuickTimer() {
  if (quickTimerInterval) {
    clearInterval(quickTimerInterval);
    quickTimerInterval = null;
  }
  appState.quickTimer.isRunning = false;
  appState.quickTimer.timeLeft = 5 * 60;
  renderStatic();
}
window.stopQuickTimer = stopQuickTimer;

/**
 * 퀵타이머 디스플레이 업데이트
 */
function renderQuickTimerDisplay() {
  const display = document.getElementById('quick-timer-display');
  if (display) {
    const mins = Math.floor(appState.quickTimer.timeLeft / 60);
    const secs = appState.quickTimer.timeLeft % 60;
    display.textContent = mins + ':' + String(secs).padStart(2, '0');
  }
}

/**
 * 동기부여 메시지 표시
 */
function showMotivation(message) {
  appState.lastMotivation = message;

  // 기존 토스트 제거
  const existing = document.querySelector('.motivation-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'motivation-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
window.showMotivation = showMotivation;

/**
 * 축하 효과 (콘페티)
 */
function showCelebration(emoji = '🎉') {
  appState.showCelebration = true;

  // 축하 텍스트
  const textEl = document.createElement('div');
  textEl.className = 'celebration-text';
  textEl.textContent = emoji;
  document.body.appendChild(textEl);

  // 콘페티 효과
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  const colors = ['#667eea', '#f093fb', '#4ecdc4', '#ffd93d', '#f5576c', '#48bb78'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-10px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    overlay.appendChild(confetti);
  }

  document.body.appendChild(overlay);

  setTimeout(() => {
    textEl.remove();
    overlay.remove();
    appState.showCelebration = false;
  }, 3000);
}
window.showCelebration = showCelebration;

/**
 * 마일스톤 체크 및 축하
 */
function checkMilestone() {
  const completed = appState.todayStats.completedToday;
  const dailyGoal = appState.settings.dailyGoal || 5;
  const streak = appState.todayStats.streak;

  // 일일 목표 달성
  if (completed === dailyGoal) {
    showCelebration('🎯');
    showAchievement('🏆', '일일 목표 달성!', `오늘 ${dailyGoal}개 작업을 완료했어요!`);
    showConfetti();
    return;
  }

  // 스트릭 마일스톤
  if (streak === 10) {
    showAchievement('🔥', '10연속 완료!', '멈출 수 없는 집중력!');
    showConfetti();
    return;
  }

  // 특정 개수 달성
  if (completed === 3) {
    showMotivation('좋아요! 3개 완료! 그 조자에요! 🔥');
  } else if (completed === 5) {
    showCelebration('⭐');
    showAchievement('⭐', '5개 돌파!', '반도 지나왔어요!');
  } else if (completed === 10) {
    showCelebration('🌟');
    showAchievement('🌟', '10개 달성!', '오늘 진짜 열일했네요!');
    showConfetti();
  } else if (completed === 20) {
    showAchievement('👑', '20개 마스터!', '당신은 오늘의 영웅입니다!');
    showConfetti();
  } else if (completed > 0 && completed % 5 === 0) {
    showMotivation(completed + '개 완료! 계속 가보자! 🚀');
  }
}

/**
 * 랜덤 동기부여 메시지
 */
function getRandomMotivation() {
  const messages = [
    '지금 시작하면 5분 뒤엔 끝나있어요!',
    '완벽하지 않아도 괜찮아요, 시작만 하면 돼요!',
    '작은 한 걸음이 큰 변화를 만들어요',
    '할 수 있어요! 일단 시작해봐요 💪',
    '오늘 할 일은 오늘! 미루면 내일의 내가 힘들어요',
    '5분만 집중! 그게 시작이에요',
    '지금이 가장 좋은 타이밍이에요!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * 반복 유형 라벨 반환
 */
function getRepeatLabel(repeatType, task = null) {
  const labels = {
    'daily': '매일',
    'weekdays': '평일',
    'weekends': '주말',
    'weekly': '매주',
    'monthly': '매월'
  };

  if (repeatType === 'custom' && task && task.repeatDays && task.repeatDays.length > 0) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const selectedDays = task.repeatDays.map(d => dayNames[d]).join(',');
    return `매주 ${selectedDays}`;
  }

  if (repeatType === 'monthly' && task && task.repeatMonthDay) {
    return `매월 ${task.repeatMonthDay}일`;
  }

  return labels[repeatType] || '';
}

/**
 * 다음 반복 작업 생성
 * 반복 작업은 항상 다음 날짜를 기준으로 생성됨 (오늘 목록에 즉시 나타나지 않음)
 */
function createNextRepeatTask(task) {
  const now = new Date();
  let nextDeadline = null;

  // 마감일이 있으면 그 기준으로, 없으면 오늘 기준으로 다음 날짜 계산
  const baseDate = task.deadline ? new Date(task.deadline) : new Date();
  nextDeadline = new Date(baseDate);

  switch (task.repeatType) {
    case 'daily':
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      break;
    case 'weekdays':
      // 평일만: 금요일이면 월요일로, 아니면 다음 날
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() === 0 || nextDeadline.getDay() === 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekends':
      // 주말만: 토요일이면 일요일로, 일요일이면 토요일로
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() !== 0 && nextDeadline.getDay() !== 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekly':
      nextDeadline.setDate(nextDeadline.getDate() + 7);
      break;
    case 'monthly':
      nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      break;
    case 'custom':
      // 특정 요일 반복: 다음 해당 요일 찾기
      if (task.repeatDays && task.repeatDays.length > 0) {
        let found = false;
        for (let i = 1; i <= 7 && !found; i++) {
          nextDeadline.setDate(nextDeadline.getDate() + 1);
          if (task.repeatDays.includes(nextDeadline.getDay())) {
            found = true;
          }
        }
      } else {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    default:
      nextDeadline.setDate(nextDeadline.getDate() + 1);
  }

  // 시간은 원래 작업과 동일하게 (없으면 자정)
  if (task.deadline) {
    const originalTime = new Date(task.deadline);
    nextDeadline.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
  } else {
    nextDeadline.setHours(23, 59, 0, 0); // 마감일 없던 작업은 하루 끝으로
  }

  return {
    id: generateId(),
    title: task.title,
    category: task.category,
    deadline: getLocalDateTimeStr(nextDeadline),
    estimatedTime: task.estimatedTime,
    link: task.link,
    expectedRevenue: task.expectedRevenue,
    repeatType: task.repeatType,
    repeatDays: task.repeatDays, // 커스텀 요일 정보 유지
    completed: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * 작업 완료 취소
 */
function uncompleteTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 오늘 완료한 작업인지 확인
  const wasCompletedToday = task.completedAt &&
    new Date(task.completedAt).toDateString() === new Date().toDateString();

  // completionLog에서 해당 기록 제거
  if (task.completedAt) {
    const logDate = getLocalDateStr(new Date(task.completedAt));
    const logTime = new Date(task.completedAt).toTimeString().slice(0, 5);
    if (appState.completionLog[logDate]) {
      const idx = appState.completionLog[logDate].findIndex(
        e => e.t === task.title && e.at === logTime
      );
      if (idx !== -1) {
        appState.completionLog[logDate].splice(idx, 1);
        // 해당 날짜에 기록이 0개면 키 삭제
        if (appState.completionLog[logDate].length === 0) {
          delete appState.completionLog[logDate];
        }
        saveCompletionLog();
      }
    }
  }

  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completed: false, completedAt: null, updatedAt: new Date().toISOString() } : t
  );

  // 오늘 완료한 작업이었다면 통계 감소
  if (wasCompletedToday) {
    appState.todayStats.completedToday = Math.max(0, appState.todayStats.completedToday - 1);
    appState.todayStats.streak = Math.max(0, appState.todayStats.streak - 1);
  }

  // 반복 작업이었다면 자동 생성된 다음 회차 작업 제거
  if (task.repeatType && task.repeatType !== 'none') {
    // 같은 제목의 미완료 작업 중 방금 생성된 것 제거
    const recentTasks = appState.tasks.filter(t =>
      t.title === task.title &&
      !t.completed &&
      t.id !== id &&
      t.createdAt &&
      (new Date() - new Date(t.createdAt)) < 60000 // 1분 이내 생성된 것
    );
    if (recentTasks.length > 0) {
      const removeId = recentTasks[recentTasks.length - 1].id;
      appState.tasks = appState.tasks.filter(t => t.id !== removeId);
    }
  }

  saveState();

  // telegram-event-bot 연동: 연결된 이벤트 상태 업데이트
  if (task.source && task.source.type === 'telegram-event') {
    updateLinkedEventStatus(task, false);
  }

  renderStatic();
  showToast('완료 취소', 'success');
}

/**
 * 완료 날짜 수정
 */
function editCompletedAt(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task || !task.completedAt) return;

  const oldDate = new Date(task.completedAt);
  if (isNaN(oldDate.getTime())) { showToast('완료 날짜가 올바르지 않습니다', 'error'); return; }
  const oldDateStr = oldDate.toISOString().slice(0, 16); // datetime-local 형식

  // 모달 생성
  const modalHtml = `
    <div class="work-modal-overlay" id="edit-completed-modal" onclick="if(event.target===this) closeEditCompletedModal()">
      <div class="work-modal" onclick="event.stopPropagation()">
        <div class="work-modal-header">
          <h3>완료 날짜 수정</h3>
          <button class="work-modal-close" onclick="closeEditCompletedModal()">✕</button>
        </div>
        <div class="work-modal-body">
          <div class="work-modal-field">
            <label class="work-modal-label">완료 시각</label>
            <input type="datetime-local" class="work-modal-input" id="edit-completed-datetime" value="${oldDateStr}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:var(--text-muted)">
            작업: ${escapeHtml(task.title)}
          </div>
        </div>
        <div class="work-modal-footer">
          <button class="work-modal-btn secondary" onclick="closeEditCompletedModal()">취소</button>
          <button class="work-modal-btn primary" onclick="saveCompletedAt('${id}')">저장</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('edit-completed-datetime').focus();
}
window.editCompletedAt = editCompletedAt;

function closeEditCompletedModal() {
  const modal = document.getElementById('edit-completed-modal');
  if (modal) modal.remove();
}
window.closeEditCompletedModal = closeEditCompletedModal;

function saveCompletedAt(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const input = document.getElementById('edit-completed-datetime');
  const newDateStr = input.value;
  if (!newDateStr) {
    showToast('날짜를 선택해주세요', 'error');
    return;
  }

  const newDate = new Date(newDateStr);
  const oldDate = task.completedAt ? new Date(task.completedAt) : null;

  // completionLog 업데이트
  if (oldDate) {
    const oldLogDate = getLocalDateStr(oldDate);
    const oldLogTime = oldDate.toTimeString().slice(0, 5);
    if (appState.completionLog[oldLogDate]) {
      const idx = appState.completionLog[oldLogDate].findIndex(
        e => e.t === task.title && e.at === oldLogTime
      );
      if (idx !== -1) {
        appState.completionLog[oldLogDate].splice(idx, 1);
        if (appState.completionLog[oldLogDate].length === 0) {
          delete appState.completionLog[oldLogDate];
        }
      }
    }
  }

  // 새 날짜로 completionLog 추가
  const newLogDate = getLocalDateStr(newDate);
  const newLogTime = newDate.toTimeString().slice(0, 5);
  if (!appState.completionLog[newLogDate]) {
    appState.completionLog[newLogDate] = [];
  }
  appState.completionLog[newLogDate].push({
    t: task.title,
    c: task.category,
    at: newLogTime,
    rv: Number(task.expectedRevenue) || 0
  });
  saveCompletionLog();

  // 태스크 업데이트
  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completedAt: newDate.toISOString(), updatedAt: new Date().toISOString() } : t
  );
  saveState();

  closeEditCompletedModal();
  renderStatic();
  showToast('완료 날짜 수정됨', 'success');
}
window.saveCompletedAt = saveCompletedAt;

/**
 * 작업 수정 모드 진입 (빠른 수정 모달로 변경)
 */
function editTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 빠른 수정 모달 열기 (탭 이동 없음)
  appState.quickEditTaskId = id;
  showQuickEditModal(task);
}

/**
 * 빠른 수정 모달 표시
 */
function showQuickEditModal(task) {
  const modal = document.getElementById('quick-edit-modal');
  const body = document.getElementById('quick-edit-body');

  body.innerHTML = `
    <div class="work-modal-field">
      <label class="work-modal-label">제목</label>
      <input type="text" class="work-modal-input" id="quick-edit-title" value="${escapeHtml(task.title)}" autofocus>
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">설명 (선택)</label>
      <textarea class="work-modal-input" id="quick-edit-description" rows="2" placeholder="작업 내용, 메모 등">${escapeHtml(task.description || '')}</textarea>
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">카테고리</label>
      <select class="work-modal-input" id="quick-edit-category">
        <option value="본업" ${task.category === '본업' ? 'selected' : ''}>💼 본업</option>
        <option value="부업" ${task.category === '부업' ? 'selected' : ''}>💰 부업</option>
        <option value="일상" ${task.category === '일상' ? 'selected' : ''}>🌅 일상</option>
        <option value="가족" ${task.category === '가족' ? 'selected' : ''}>👨‍👩‍👧 가족</option>
      </select>
    </div>
    <div class="work-modal-field-row">
      <div class="work-modal-field half">
        <label class="work-modal-label">시작일</label>
        <input type="datetime-local" class="work-modal-input" id="quick-edit-startDate" value="${task.startDate || ''}">
      </div>
      <div class="work-modal-field half">
        <label class="work-modal-label">마감일</label>
        <input type="datetime-local" class="work-modal-input" id="quick-edit-deadline" value="${task.deadline || ''}">
      </div>
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">예상 시간 (분)</label>
      <input type="number" class="work-modal-input" id="quick-edit-time" value="${task.estimatedTime || ''}" min="1">
    </div>
    ${task.category === '부업' ? `
      <div class="work-modal-field">
        <label class="work-modal-label">예상 수익 (원)</label>
        <input type="number" class="work-modal-input" id="quick-edit-revenue" value="${task.expectedRevenue || ''}">
      </div>
    ` : ''}
  `;

  modal.classList.add('show');

  // 엔터키로 저장
  body.querySelector('#quick-edit-title').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveQuickEdit();
  });
}

/**
 * 빠른 수정 모달 닫기
 */
function closeQuickEditModal() {
  const modal = document.getElementById('quick-edit-modal');
  modal.classList.remove('show');
  appState.quickEditTaskId = null;
}
window.closeQuickEditModal = closeQuickEditModal;

/**
 * 빠른 수정 저장
 */
function saveQuickEdit() {
  const id = appState.quickEditTaskId;
  if (!id) return;

  const title = document.getElementById('quick-edit-title').value.trim();
  if (!title) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  const description = document.getElementById('quick-edit-description').value.trim();
  const category = document.getElementById('quick-edit-category').value;
  const startDate = document.getElementById('quick-edit-startDate').value;
  const deadline = document.getElementById('quick-edit-deadline').value;
  const estimatedTime = parseInt(document.getElementById('quick-edit-time').value) || null;
  const revenueEl = document.getElementById('quick-edit-revenue');
  const expectedRevenue = revenueEl ? parseInt(revenueEl.value) || null : null;

  appState.tasks = appState.tasks.map(t => {
    if (t.id === id) {
      return {
        ...t,
        title,
        description,
        category,
        startDate,
        deadline,
        estimatedTime,
        expectedRevenue: expectedRevenue !== null ? expectedRevenue : t.expectedRevenue,
        updatedAt: new Date().toISOString()
      };
    }
    return t;
  });

  saveState();
  closeQuickEditModal();
  renderStatic();
  showToast('수정 완료', 'success');
}
window.saveQuickEdit = saveQuickEdit;

/**
 * 상세 편집으로 이동
 */
function openFullEdit() {
  const id = appState.quickEditTaskId;
  if (!id) return;

  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  closeQuickEditModal();

  appState.detailedTask = { ...task };
  appState.showDetailedAdd = true;
  appState.editingTaskId = id;
  appState.currentTab = 'action';
  renderStatic();

  setTimeout(() => {
    const formEl = document.querySelector('.add-task-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}
window.openFullEdit = openFullEdit;

/**
 * Article Editor 연동 — Task 내용으로 아티클 에디터 열기
 * URL은 설정에서 변경 가능 (기본: localhost:3000)
 */
const ARTICLE_EDITOR_URL = 'https://article-editor-ruddy.vercel.app';
function openArticleEditor(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;
  const params = new URLSearchParams();
  params.set('keyword', task.title || '');
  if (task.description) params.set('summary', task.description);
  const url = `${ARTICLE_EDITOR_URL}/editor?${params.toString()}`;
  handleGo(url);
}
window.openArticleEditor = openArticleEditor;

/**
 * 수정 취소
 */
function cancelEdit() {
  appState.detailedTask = {
    title: '',
    category: '부업',
    startDate: '',
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',
    repeatType: 'none',
    repeatDays: [],
    repeatMonthDay: null,
    organizer: '',
    eventType: '',
    tags: [],
    subtasks: []
  };
  appState.showDetailedAdd = false;
  appState.editingTaskId = null;
  renderStatic();
}

/**
 * 작업 삭제
 */
function deleteTask(id) {
  if (!confirm('정말 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    // 휴지통으로 이동 (30일 보관)
    appState.trash.push({ ...task, deletedAt: new Date().toISOString() });
  }
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.tasks[id] = new Date().toISOString();
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  saveState();
  renderStatic();
  showToast('휴지통으로 이동했습니다 (30일 보관)', 'success');
  srAnnounce('작업 삭제됨');
}

/**
 * 이벤트 일괄 선택 모드 토글
 */
function toggleEventBulkSelect() {
  _eventBulkSelectMode = !_eventBulkSelectMode;
  _eventBulkSelectedIds.clear();
  renderStatic();
}

/**
 * 이벤트 개별 선택 토글
 */
function toggleEventSelection(id) {
  if (_eventBulkSelectedIds.has(id)) {
    _eventBulkSelectedIds.delete(id);
  } else {
    _eventBulkSelectedIds.add(id);
  }
  renderStatic();
}

/**
 * 이벤트 전체 선택/해제
 */
function toggleEventSelectAll() {
  const eventTasks = appState.tasks.filter(t => t.category === '부업');
  if (_eventBulkSelectedIds.size === eventTasks.length) {
    // 전체 해제
    _eventBulkSelectedIds.clear();
  } else {
    // 전체 선택
    eventTasks.forEach(t => _eventBulkSelectedIds.add(t.id));
  }
  renderStatic();
}

/**
 * 선택된 이벤트 일괄 삭제 (soft-delete)
 */
function bulkDeleteEvents() {
  const count = _eventBulkSelectedIds.size;
  if (count === 0) return;
  if (!confirm(count + '개 이벤트를 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const now = new Date().toISOString();
  _eventBulkSelectedIds.forEach(id => {
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
      appState.trash.push({ ...task, deletedAt: now });
    }
    appState.deletedIds.tasks[id] = now;
  });
  appState.tasks = appState.tasks.filter(t => !_eventBulkSelectedIds.has(t.id));

  _eventBulkSelectedIds.clear();
  _eventBulkSelectMode = false;

  saveState();
  renderStatic();
  showToast(count + '개 이벤트가 삭제되었습니다', 'success');
}

/**
 * 이벤트 그룹 접기/펼치기
 */
function toggleEventGroup(groupId) {
  if (_collapsedEventGroups.has(groupId)) {
    _collapsedEventGroups.delete(groupId);
  } else {
    _collapsedEventGroups.add(groupId);
  }
  renderStatic();
}

/**
 * 휴지통에서 태스크 복원
 */
function restoreFromTrash(id) {
  const idx = appState.trash.findIndex(t => t.id === id);
  if (idx === -1) return;

  const task = { ...appState.trash[idx] };
  delete task.deletedAt;

  // deletedIds에서도 제거 (동기화 시 다시 삭제되지 않도록)
  delete appState.deletedIds.tasks[id];

  appState.tasks.push(task);
  appState.trash.splice(idx, 1);
  saveState();
  renderStatic();
  showToast('"' + (task.title || '작업') + '" 복원되었습니다', 'success');
}

/**
 * 휴지통에서 영구 삭제
 */
function permanentDeleteFromTrash(id) {
  if (!confirm('영구 삭제하면 복원할 수 없습니다. 진행하시겠습니까?')) return;
  appState.trash = appState.trash.filter(t => t.id !== id);
  saveState();
  renderStatic();
  showToast('영구 삭제되었습니다', 'info');
}

/**
 * 휴지통 비우기
 */
function emptyTrash() {
  if (appState.trash.length === 0) return;
  if (!confirm('휴지통을 비우면 ' + appState.trash.length + '개 항목이 영구 삭제됩니다. 진행하시겠습니까?')) return;
  appState.trash = [];
  saveState();
  renderStatic();
  showToast('휴지통을 비웠습니다', 'info');
}

/**
 * 30일 이상 된 휴지통 항목 자동 정리
 */
function cleanupOldTrash() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const before = appState.trash.length;
  appState.trash = appState.trash.filter(t => t.deletedAt && t.deletedAt > thirtyDaysAgo);
  if (appState.trash.length < before) {
    console.log('[trash] ' + (before - appState.trash.length) + '개 만료 항목 정리');
  }
}

/**
 * 이벤트 그룹별 전체 선택
 */
function toggleEventGroupSelect(taskIds) {
  // taskIds 배열의 모든 항목이 이미 선택되어 있으면 해제, 아니면 전체 선택
  const allSelected = taskIds.every(id => _eventBulkSelectedIds.has(id));
  if (allSelected) {
    taskIds.forEach(id => _eventBulkSelectedIds.delete(id));
  } else {
    taskIds.forEach(id => _eventBulkSelectedIds.add(id));
  }
  renderStatic();
}

/**
 * 작업 복사
 */
function copyTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const now = new Date().toISOString();
  const newTask = {
    ...task,
    id: generateId(),
    title: task.title + ' (복사)',
    completed: false,
    createdAt: now,
    updatedAt: now
  };

  appState.tasks.push(newTask);
  saveState();
  renderStatic();
  showToast('작업이 복사되었습니다', 'success');
}

/**
 * 드래그 앤 드롭 - 드래그 시작
 */
function handleDragStart(e, taskId) {
  appState.draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
}

/**
 * 드래그 앤 드롭 - 드래그 종료
 */
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  appState.draggedTaskId = null;

  // 모든 드롭 타겟 표시 제거
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

/**
 * 드래그 앤 드롭 - 드래그 오버
 */
function handleDragOver(e, taskId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const targetEl = e.currentTarget;
  if (!targetEl.classList.contains('drag-over') && appState.draggedTaskId !== taskId) {
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    targetEl.classList.add('drag-over');
  }
}

/**
 * 드래그 앤 드롭 - 드롭
 */
function handleDrop(e, targetTaskId) {
  e.preventDefault();

  const draggedId = appState.draggedTaskId;
  if (!draggedId || draggedId === targetTaskId) return;

  const tasks = appState.tasks;
  const draggedIndex = tasks.findIndex(t => t.id === draggedId);
  const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // 작업 순서 변경
  const [draggedTask] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);

  appState.tasks = tasks;
  saveState();
  renderStatic();
  showToast('순서가 변경되었습니다', 'success');
}

/**
 * 링크 열기
 */
function handleGo(link) {
  if (link) {
    // javascript: / data: 프로토콜 차단 (XSS 방지)
    try {
      const url = new URL(link, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return;
    } catch (e) { return; }
    window.open(link, '_blank');
  }
}

/**
 * 작업 리스트 토글
 */
function toggleTaskList() {
  appState.showTaskList = !appState.showTaskList;
  renderStatic();
}

/**
 * 완료된 작업 보기 토글
 */
function toggleCompletedTasks() {
  appState.showCompletedTasks = !appState.showCompletedTasks;
  renderStatic();
}

/**
 * 상세 추가 폼 토글
 */
function toggleDetailedAdd() {
  appState.showDetailedAdd = !appState.showDetailedAdd;
  
  // 수정 중이었으면 취소
  if (!appState.showDetailedAdd && appState.editingTaskId) {
    cancelEdit();
    return;
  }
  
  renderStatic();
}

/**
 * 전체 탭에서 카테고리별 완료 작업 토글
 */
function toggleCompletedCategory(category) {
  if (!appState.showCompletedByCategory) {
    appState.showCompletedByCategory = {};
  }
  appState.showCompletedByCategory[category] = !appState.showCompletedByCategory[category];
  renderStatic();
}

/**
 * 카테고리 변경 시 호출
 */
function updateDetailedTaskCategory(category) {
  appState.detailedTask.category = category;
  // 카테고리 변경 시 프로젝트 연결 초기화
  if (category !== '본업') {
    appState.detailedTask.workProjectId = null;
    appState.detailedTask.workStageIdx = null;
    appState.detailedTask.workSubcatIdx = null;
  }
  renderStatic();
}

/**
 * 본업 프로젝트 연결
 */
function updateWorkProjectLink(projectId) {
  if (projectId) {
    appState.detailedTask.workProjectId = String(projectId);
    appState.detailedTask.workStageIdx = 0;
    // 첫 번째 중분류 선택
    const proj = appState.workProjects.find(p => p.id === String(projectId));
    if (proj?.stages[0]?.subcategories?.length > 0) {
      appState.detailedTask.workSubcatIdx = 0;
    } else {
      appState.detailedTask.workSubcatIdx = null;
    }
  } else {
    appState.detailedTask.workProjectId = null;
    appState.detailedTask.workStageIdx = null;
    appState.detailedTask.workSubcatIdx = null;
  }
  renderStatic();
}
window.updateWorkProjectLink = updateWorkProjectLink;

/**
 * 본업 단계 연결
 */
function updateWorkStageLink(stageIdx) {
  appState.detailedTask.workStageIdx = parseInt(stageIdx);
  // 해당 단계의 첫 번째 중분류 선택
  const proj = appState.workProjects.find(p => p.id === appState.detailedTask.workProjectId);
  if (proj?.stages[stageIdx]?.subcategories?.length > 0) {
    appState.detailedTask.workSubcatIdx = 0;
  } else {
    appState.detailedTask.workSubcatIdx = null;
  }
  renderStatic();
}
window.updateWorkStageLink = updateWorkStageLink;

/**
 * 본업 중분류 연결
 */
function updateWorkSubcatLink(subcatIdx) {
  appState.detailedTask.workSubcatIdx = parseInt(subcatIdx);
  renderStatic();
}
window.updateWorkSubcatLink = updateWorkSubcatLink;

/**
 * 태그를 작업에 추가
 */
function addTagToTask(tag) {
  if (!appState.detailedTask.tags) {
    appState.detailedTask.tags = [];
  }
  if (!appState.detailedTask.tags.includes(tag)) {
    appState.detailedTask.tags.push(tag);
    renderStatic();
  }
}

/**
 * 작업에서 태그 제거
 */
function removeTagFromTask(tag) {
  if (appState.detailedTask.tags) {
    appState.detailedTask.tags = appState.detailedTask.tags.filter(t => t !== tag);
    renderStatic();
  }
}

/**
 * 새 태그 추가 (전역 목록에도 추가)
 */
function addNewTag(tagName) {
  const tag = tagName.trim();
  if (!tag) return;

  // 전역 태그 목록에 추가
  if (!appState.availableTags.includes(tag)) {
    appState.availableTags.push(tag);
    saveState();
  }

  // 현재 작업에도 추가
  addTagToTask(tag);
}

/**
 * 서브태스크 추가
 */
function addSubtask(text) {
  const subtaskText = text.trim();
  if (!subtaskText) return;

  if (!appState.detailedTask.subtasks) {
    appState.detailedTask.subtasks = [];
  }

  appState.detailedTask.subtasks.push({
    text: subtaskText,
    completed: false,
    completedAt: null
  });
  renderStatic();
  // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
  requestAnimationFrame(() => {
    const input = document.getElementById('new-subtask-input');
    if (input) {
      input.focus();
      input.value = '';
    }
  });
}

/**
 * 서브태스크 제거
 */
function removeSubtask(index) {
  if (appState.detailedTask.subtasks) {
    appState.detailedTask.subtasks.splice(index, 1);
    renderStatic();
    // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
    requestAnimationFrame(() => {
      const input = document.getElementById('new-subtask-input');
      if (input) {
        input.focus();
      }
    });
  }
}

/**
 * 상세 입력 폼에서 서브태스크 완료 토글
 */
function toggleDetailedSubtask(index) {
  if (appState.detailedTask.subtasks && appState.detailedTask.subtasks[index]) {
    appState.detailedTask.subtasks[index].completed = !appState.detailedTask.subtasks[index].completed;
    appState.detailedTask.subtasks[index].completedAt = appState.detailedTask.subtasks[index].completed
      ? new Date().toISOString()
      : null;

    // 수정 중인 작업이면 실제 작업에도 반영
    if (appState.editingTaskId) {
      const task = appState.tasks.find(t => t.id === appState.editingTaskId);
      if (task && task.subtasks) {
        task.subtasks = [...appState.detailedTask.subtasks];
        saveState();
      }
    }
    renderStatic();
    // 포커스 복원: renderStatic() 후 DOM이 재생성되므로 새 input에 포커스
    requestAnimationFrame(() => {
      const input = document.getElementById('new-subtask-input');
      if (input) {
        input.focus();
      }
    });
  }
}

/**
 * 서브태스크 완료 토글 (작업 내에서)
 */
function toggleSubtaskComplete(taskId, subtaskIndex) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (task && task.subtasks && task.subtasks[subtaskIndex]) {
    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
    task.subtasks[subtaskIndex].completedAt = task.subtasks[subtaskIndex].completed
      ? new Date().toISOString()
      : null;
    saveState();
    renderStatic();
  }
}

/**
 * 서브태스크 목록 펼치기/접기
 */
function toggleSubtaskExpand(taskId) {
  if (!appState.expandedSubtasks) {
    appState.expandedSubtasks = {};
  }
  appState.expandedSubtasks[taskId] = !appState.expandedSubtasks[taskId];
  renderStatic();
}

/**
 * 본업 일반 작업 세부작업 펼침/접힘
 */
function toggleWorkGeneralSubtask(taskId) {
  if (!appState.expandedWorkGeneralSubtasks) {
    appState.expandedWorkGeneralSubtasks = {};
  }
  appState.expandedWorkGeneralSubtasks[taskId] = !appState.expandedWorkGeneralSubtasks[taskId];
  renderStatic();
}
window.toggleWorkGeneralSubtask = toggleWorkGeneralSubtask;

/**
 * 반복 유형 변경 시 호출
 */
function updateDetailedTaskRepeat(repeatType) {
  appState.detailedTask.repeatType = repeatType;
  // 타입 변경 시 관련 필드 초기화
  if (repeatType !== 'custom') {
    appState.detailedTask.repeatDays = [];
  }
  if (repeatType !== 'monthly') {
    appState.detailedTask.repeatMonthDay = null;
  }
  renderStatic();
}

/**
 * 특정 요일 토글
 */
function toggleRepeatDay(dayIndex) {
  if (!appState.detailedTask.repeatDays) {
    appState.detailedTask.repeatDays = [];
  }
  const days = appState.detailedTask.repeatDays;
  const idx = days.indexOf(dayIndex);
  if (idx === -1) {
    days.push(dayIndex);
  } else {
    days.splice(idx, 1);
  }
  days.sort((a, b) => a - b);
  renderStatic();
}

/**
 * 매월 반복일 설정
 */
function updateRepeatMonthDay(day) {
  const dayNum = parseInt(day);
  appState.detailedTask.repeatMonthDay = (dayNum >= 1 && dayNum <= 31) ? dayNum : null;
}

/**
 * 일정 필터 변경
 */
function setScheduleFilter(filter) {
  appState.scheduleFilter = filter;
  renderStatic();
}

/**
 * 검색어 변경
 */
function setSearchQuery(query) {
  appState.searchQuery = query;
  renderStatic();
}

/**
 * 검색어 클리어
 */
function clearSearch() {
  appState.searchQuery = '';
  renderStatic();
}

/**
 * 카테고리 필터 변경
 */
function setCategoryFilter(category) {
  appState.categoryFilter = category;
  renderStatic();
}

/**
 * 태그 필터 설정
 */
function setTagFilter(tag) {
  appState.tagFilter = appState.tagFilter === tag ? null : tag;
  renderStatic();
}

