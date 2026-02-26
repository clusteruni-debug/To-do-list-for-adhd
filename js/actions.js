// ============================================
// 사용자 액션 핸들러 (메인)
// 하위 모듈: actions-complete.js, actions-edit.js, actions-ui.js
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
