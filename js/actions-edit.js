// ============================================
// 작업 수정 / CRUD / 일괄 작업
// (actions.js에서 분리)
// ============================================

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
