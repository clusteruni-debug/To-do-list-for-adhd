// ============================================
// 렌더링 - 전체 목록 탭 + 히스토리 탭
// ============================================

/**
 * 할일 서브뷰 전환
 */
function setAllTasksSubView(view) {
  appState.allTasksSubView = view;
  renderStatic();
}

/**
 * 서브뷰에 맞는 작업 필터링
 */
function _getSubViewTasks(view) {
  const pending = appState.tasks.filter(t => !t.completed);
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  switch (view) {
    case 'today': {
      return pending.filter(t => {
        if (!t.deadline) return false;
        const dStr = getLocalDateStr(new Date(t.deadline));
        return dStr === todayStr || dStr < todayStr; // 오늘 + 지난 마감
      });
    }
    case 'upcoming': {
      return pending.filter(t => {
        if (!t.deadline) return false;
        const dStr = getLocalDateStr(new Date(t.deadline));
        return dStr >= tomorrowStr;
      }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }
    case 'inbox': {
      return pending.filter(t => !t.deadline);
    }
    default:
      return pending;
  }
}

/**
 * 작업 아이템 HTML 렌더 (재사용)
 */
function _renderTaskItem(task) {
  const urgency = getUrgencyLevel(task);
  return `
    <div class="all-task-item ${urgency === 'urgent' ? 'urgent' : ''} ${urgency === 'warning' ? 'warning' : ''}" style="--task-cat-color: var(--cat-${task.category})">
      <div class="all-task-content">
        <div class="all-task-title">${escapeHtml(task.title)}</div>
        <div class="all-task-meta">
          <span class="category ${task.category}" style="font-size:12px;">${task.category}</span>
          ${task.estimatedTime ? `<span>⏱️ ${task.estimatedTime}분</span>` : ''}
          ${task.deadline ? `<span>${formatDeadline(task.deadline)}</span>` : ''}
          ${task.organizer ? `<span>👤 ${task.organizer}</span>` : ''}
        </div>
      </div>
      <div class="all-task-actions">
        ${task.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(task.link)}')">GO</button>` : ''}
        <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
        <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
        <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
      </div>
    </div>
  `;
}

/**
 * 전체 목록 탭 HTML을 반환한다.
 */
function renderAllTasksTab() {
  const view = appState.allTasksSubView || 'all';
  const pending = appState.tasks.filter(t => !t.completed);

  // 서브뷰별 카운트 계산
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  const todayCount = pending.filter(t => {
    if (!t.deadline) return false;
    const dStr = getLocalDateStr(new Date(t.deadline));
    return dStr === todayStr || dStr < todayStr;
  }).length;
  const upcomingCount = pending.filter(t => {
    if (!t.deadline) return false;
    return getLocalDateStr(new Date(t.deadline)) >= tomorrowStr;
  }).length;
  const inboxCount = pending.filter(t => !t.deadline).length;

  return `
        <div class="all-tasks-header">
          <h2>📋 전체 작업 목록</h2>
          <div class="all-tasks-summary">
            총 ${appState.tasks.length}개 · 진행 중 ${pending.length}개 · 오늘 완료 ${getTodayCompletedTasks(appState.tasks).length}개
          </div>
        </div>

        <!-- 서브뷰 탭 -->
        <div class="all-sub-tabs">
          <button class="all-sub-tab ${view === 'all' ? 'active' : ''}" onclick="setAllTasksSubView('all')">
            전체 <span class="all-sub-tab-count">${pending.length}</span>
          </button>
          <button class="all-sub-tab ${view === 'today' ? 'active' : ''}" onclick="setAllTasksSubView('today')">
            오늘 <span class="all-sub-tab-count ${todayCount > 0 ? 'has-items' : ''}">${todayCount}</span>
          </button>
          <button class="all-sub-tab ${view === 'upcoming' ? 'active' : ''}" onclick="setAllTasksSubView('upcoming')">
            예정 <span class="all-sub-tab-count">${upcomingCount}</span>
          </button>
          <button class="all-sub-tab ${view === 'inbox' ? 'active' : ''}" onclick="setAllTasksSubView('inbox')">
            인박스 <span class="all-sub-tab-count ${inboxCount > 0 ? 'has-items' : ''}">${inboxCount}</span>
          </button>
        </div>

        ${view === 'all' ? _renderAllView() : _renderFilteredView(view)}

        ${appState.tasks.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div>등록된 작업이 없습니다</div>
            <div style="margin-top: 10px; font-size: 16px; color: var(--text-secondary);">
              🎯 오늘 탭에서 새 작업을 추가해보세요
            </div>
          </div>
        ` : ''}
        `;
}

/**
 * 전체 뷰 (카테고리별 그룹)
 */
function _renderAllView() {
  return ['본업', '부업', '일상', '가족'].map(category => {
    const categoryTasks = appState.tasks.filter(t => t.category === category);
    const pendingTasks = categoryTasks.filter(t => !t.completed);
    const completedTasks = categoryTasks.filter(t => t.completed);

    if (categoryTasks.length === 0) return '';

    return `
      <div class="all-category-section">
        <div class="all-category-header ${category}">
          <span class="all-category-title">${category}</span>
          <span class="all-category-count">${pendingTasks.length}개 진행 중 / ${completedTasks.length}개 완료</span>
        </div>

        ${pendingTasks.length > 0 ? `
          <div class="all-task-list">
            ${pendingTasks.map(task => _renderTaskItem(task)).join('')}
          </div>
        ` : ''}

        ${completedTasks.length > 0 ? `
          <div class="all-completed-section">
            <div class="all-completed-toggle" onclick="toggleCompletedCategory('${category}')">
              ✅ 완료 (${completedTasks.length}개) ${appState.showCompletedByCategory && appState.showCompletedByCategory[category] ? '▲' : '▼'}
            </div>
            <div class="all-task-list completed-list ${appState.showCompletedByCategory && appState.showCompletedByCategory[category] ? 'show' : ''}">
              ${completedTasks.slice(0, 5).map(task => `
                <div class="all-task-item completed" style="--task-cat-color: var(--cat-${task.category})">
                  <div class="all-task-content">
                    <div class="all-task-title completed">${escapeHtml(task.title)}</div>
                  </div>
                  <div class="all-task-actions">
                    <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩️</button>
                    <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                  </div>
                </div>
              `).join('')}
              ${completedTasks.length > 5 ? `
                <div class="all-task-more">+${completedTasks.length - 5}개 더</div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * 필터된 뷰 (오늘/예정/인박스)
 */
function _renderFilteredView(view) {
  const tasks = _getSubViewTasks(view);
  const viewLabels = { today: '오늘 할 일', upcoming: '예정된 작업', inbox: '마감 없는 작업' };
  const viewIcons = { today: '🎯', upcoming: '📅', inbox: '📥' };
  const emptyMessages = {
    today: '오늘 마감인 작업이 없어요!',
    upcoming: '예정된 작업이 없어요!',
    inbox: '마감 없는 작업이 없어요!'
  };

  if (tasks.length === 0) {
    return `
      <div class="empty-state" style="padding: 40px 20px;">
        <div class="empty-state-icon">${viewIcons[view]}</div>
        <div>${emptyMessages[view]}</div>
      </div>
    `;
  }

  // 오늘 뷰: 지난 마감과 오늘 마감 분리
  if (view === 'today') {
    const todayStr = getLocalDateStr(new Date());
    const overdue = tasks.filter(t => getLocalDateStr(new Date(t.deadline)) < todayStr);
    const dueToday = tasks.filter(t => getLocalDateStr(new Date(t.deadline)) === todayStr);

    return `
      ${overdue.length > 0 ? `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-danger);">
            <span class="all-category-title" style="color: var(--accent-danger);">❌ 마감 지남</span>
            <span class="all-category-count">${overdue.length}개</span>
          </div>
          <div class="all-task-list">
            ${overdue.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      ` : ''}
      ${dueToday.length > 0 ? `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-warning);">
            <span class="all-category-title">🎯 오늘 마감</span>
            <span class="all-category-count">${dueToday.length}개</span>
          </div>
          <div class="all-task-list">
            ${dueToday.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  // 예정 뷰: 날짜별 그룹
  if (view === 'upcoming') {
    const groups = {};
    tasks.forEach(t => {
      const dStr = getLocalDateStr(new Date(t.deadline));
      if (!groups[dStr]) groups[dStr] = [];
      groups[dStr].push(t);
    });

    return Object.entries(groups).map(([date, dateTasks]) => {
      const d = new Date(date + 'T00:00:00');
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
      return `
        <div class="all-category-section">
          <div class="all-category-header" style="border-left-color: var(--accent-primary);">
            <span class="all-category-title">📅 ${dayLabel}</span>
            <span class="all-category-count">${dateTasks.length}개</span>
          </div>
          <div class="all-task-list">
            ${dateTasks.map(task => _renderTaskItem(task)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // 인박스 뷰: 플랫 리스트
  return `
    <div class="all-task-list">
      ${tasks.map(task => _renderTaskItem(task)).join('')}
    </div>
  `;
}

/**
 * 히스토리 탭 HTML을 반환한다.
 */
function renderHistoryTab() {
          const weeklyStats = getWeeklyStats();
          const totalCompleted = appState.tasks.filter(t => t.completed).length;

          return `
            <div class="history-header">
              <h2>📅 활동 히스토리</h2>
              <div class="history-summary">총 ${totalCompleted}개 완료</div>
            </div>

            <!-- 뷰 전환 탭 -->
            <div class="history-view-tabs">
              <button class="history-view-tab ${appState.historyView !== 'rhythm' ? 'active' : ''}" onclick="setHistoryView('tasks')">
                📋 작업 기록
              </button>
              <button class="history-view-tab ${appState.historyView === 'rhythm' ? 'active' : ''}" onclick="setHistoryView('rhythm')">
                😴 라이프 리듬
              </button>
            </div>

            ${appState.historyView === 'rhythm' ? renderLifeRhythmHistory() : `
            <!-- 주간 요약 -->
            <div class="week-summary">
              <div class="week-summary-title">📊 이번 주 요약</div>
              <div class="week-summary-stats">
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.total}</div>
                  <div class="week-stat-label">완료</div>
                </div>
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.avgPerDay}</div>
                  <div class="week-stat-label">일 평균</div>
                </div>
                <div class="week-stat">
                  <div class="week-stat-value">${weeklyStats.activeDays}/7</div>
                  <div class="week-stat-label">활동일</div>
                </div>
              </div>

              <!-- 주간 바 차트 -->
              ${(() => {
                const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
                const todayIndex = new Date().getDay();
                const maxCount = Math.max(...weeklyStats.dailyCounts, 1);

                return `
                  <div class="weekly-chart">
                    ${weeklyStats.dailyCounts.map((count, i) => {
                      const height = (count / maxCount) * 80;
                      const isToday = i === todayIndex;
                      return `
                        <div class="weekly-chart-bar">
                          <div class="weekly-chart-value">${count > 0 ? count : ''}</div>
                          <div class="weekly-chart-fill ${isToday ? 'today' : ''} ${count === 0 ? 'empty' : ''}" style="height: ${height}px"></div>
                          <div class="weekly-chart-label ${isToday ? 'today' : ''}">${dayLabels[i]}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              })()}
            </div>

            <!-- 캘린더 -->
            ${renderCalendar()}

            <!-- 선택된 날짜 상세 -->
            ${renderDayDetail()}

            <!-- 최근 기록 -->
            <div class="dashboard-section">
              <div class="dashboard-title">📜 최근 기록</div>
              ${renderRecentHistory()}
            </div>
            `}
          `;
}
