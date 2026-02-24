// ============================================
// 본업 프로젝트 관리
// ============================================

// 모달 상태
let workModalState = {
  type: null, // 'project', 'subcategory', 'task', 'log'
  projectId: null,
  stageIdx: null,
  subcategoryIdx: null,
  taskIdx: null
};

// 상태 목록
const WORK_STATUS = {
  'not-started': { label: '미시작', color: '#a0a0a0' },
  'in-progress': { label: '진행중', color: '#667eea' },
  'completed': { label: '완료', color: '#48bb78' },
  'blocked': { label: '보류', color: '#f5576c' }
};

/**
 * 프로젝트 목록 렌더링
 */
function renderWorkProjects() {
  // 프로젝트 완료 여부 판단 헬퍼
  const isProjectCompleted = (p) => {
    if (p.stages.length === 0) return false;
    return p.stages.every(s => s.completed);
  };

  const activeProjects = appState.workProjects.filter(p => !p.archived);
  const archivedProjects = appState.workProjects.filter(p => p.archived);

  // 최근 활동순 정렬 헬퍼
  const sortByRecent = (projects) => {
    return [...projects].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || 0);
      const bDate = new Date(b.updatedAt || b.createdAt || 0);
      return bDate - aDate; // 최신순
    });
  };

  // 보류 프로젝트 분리
  const onHoldProjects = sortByRecent(activeProjects.filter(p => p.onHold));

  // 활성 프로젝트를 3가지로 분류 (최근 활동순 정렬, 보류 제외)
  const inProgressProjects = sortByRecent(activeProjects.filter(p => !p.onHold && p.deadline && !isProjectCompleted(p)));
  const completedProjects = sortByRecent(activeProjects.filter(p => !p.onHold && isProjectCompleted(p)));
  const noDeadlineProjects = sortByRecent(activeProjects.filter(p => !p.onHold && !p.deadline && !isProjectCompleted(p)));

  if (appState.workProjects.length === 0) {
    return `
      <div class="work-projects-container">
        <div class="work-projects-header">
          <div class="work-projects-title">💼 본업 프로젝트</div>
        </div>
        <div class="work-empty">
          <div class="work-empty-icon">📋</div>
          <div class="work-empty-title">프로젝트가 없습니다</div>
          <div class="work-empty-desc">새 프로젝트를 추가하여 업무를 체계적으로 관리하세요</div>
          <button class="work-project-add-btn" onclick="showWorkModal('project')">+ 첫 프로젝트 만들기</button>
        </div>
      </div>
    `;
  }

  const activeProject = appState.workProjects.find(p => p.id === appState.activeWorkProject);

  // 본업 일반 작업 (프로젝트 미연결)
  const workGeneralTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);

  return `
    <div class="work-projects-container">
      <!-- 헤더 -->
      <div class="work-projects-header">
        <div class="work-projects-title">💼 본업</div>
        <div style="display: flex; gap: 8px;">
          <button class="work-project-add-btn" onclick="showWorkModal('project')">+ 새 프로젝트</button>
          <button class="work-project-action-btn" onclick="showWorkModal('template-select')">📋 템플릿</button>
          <button class="work-project-action-btn" onclick="showWorkModal('template-import')">📥 가져오기</button>
        </div>
      </div>

      <!-- 본업 빠른 추가 (프로젝트 없이) -->
      <div class="work-quick-add">
        <input
          type="text"
          class="work-quick-input"
          placeholder="프로젝트 없이 본업 작업 추가 (Enter)"
          id="work-quick-input"
          onkeypress="if(event.key==='Enter') quickAddWorkTask()"
        >
        <button class="work-quick-btn" onclick="quickAddWorkTask()">+</button>
      </div>

      ${workGeneralTasks.length > 0 ? `
        <div class="work-general-tasks">
          <div class="work-general-title">📋 일반 작업 (${workGeneralTasks.length})</div>
          <div class="work-general-list">
            ${workGeneralTasks.slice(0, 5).map(task => `
              <div class="work-general-item-wrapper">
                <div class="work-general-item">
                  <button class="task-check-btn" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                  <span class="work-general-item-title" onclick="editTask('${escapeAttr(task.id)}')">${escapeHtml(task.title)}</span>
                  ${task.subtasks && task.subtasks.length > 0 ? `
                    <span class="subtask-badge" onclick="event.stopPropagation(); toggleWorkGeneralSubtask('${escapeAttr(task.id)}')">
                      📋${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}
                    </span>
                  ` : ''}
                  <button class="work-general-delete-btn" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">×</button>
                </div>
                ${task.subtasks && task.subtasks.length > 0 && appState.expandedWorkGeneralSubtasks && appState.expandedWorkGeneralSubtasks[task.id] ? `
                  <div class="work-general-subtasks">
                    ${task.subtasks.map((st, idx) => `
                      <div class="work-general-subtask ${st.completed ? 'completed' : ''}" onclick="toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
                        <span class="subtask-check">${st.completed ? '✓' : '○'}</span>
                        <span>${escapeHtml(st.text)}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
            ${workGeneralTasks.length > 5 ? `<div class="work-general-more">+ ${workGeneralTasks.length - 5}개 더</div>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- 뷰 전환 -->
      <div class="work-view-tabs">
        <button class="work-view-tab ${appState.workView === 'dashboard' ? 'active' : ''}" onclick="setWorkView('dashboard')">📊 대시보드</button>
        <button class="work-view-tab ${appState.workView === 'detail' ? 'active' : ''}" onclick="setWorkView('detail')">📝 상세보기</button>
        <button class="work-view-tab ${appState.workView === 'calendar' ? 'active' : ''}" onclick="setWorkView('calendar')">📅 달력</button>
        <button class="work-view-tab ${appState.workView === 'timeline' ? 'active' : ''}" onclick="setWorkView('timeline')">📜 이력</button>
        ${archivedProjects.length > 0 ? `
          <button class="work-view-tab" style="margin-left: auto;" onclick="toggleArchivedProjects()">
            📦 아카이브 (${archivedProjects.length})
          </button>
        ` : ''}
      </div>

      ${appState.workView === 'dashboard' ? `
        <!-- 대시보드 뷰 -->
        <!-- 지금 할 것 -->
        ${(() => {
          // 프로젝트 내 진행중 작업 수집
          const inProgressTasks = [];
          appState.workProjects.filter(p => !p.archived && !p.onHold).forEach(p => {
            p.stages.forEach((stage, si) => {
              (stage.subcategories || []).forEach((sub, sci) => {
                sub.tasks.forEach((task, ti) => {
                  if (task.status === 'in-progress') {
                    inProgressTasks.push({ ...task, projectName: p.name, projectId: p.id, stageIdx: si, subcatIdx: sci, taskIdx: ti });
                  }
                });
              });
            });
          });
          // 일반 본업 작업 (프로젝트 미연결, 미완료)
          const generalWorkTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);

          if (inProgressTasks.length === 0 && generalWorkTasks.length === 0) return '';

          return '<div class="work-focus-section" style="background: linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1)); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px;">' +
            '<div style="font-size: 16px; font-weight: 700; color: var(--accent-blue); margin-bottom: 12px;">🎯 지금 할 것</div>' +
            inProgressTasks.slice(0, 3).map(t =>
              '<div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-primary); border-radius: 8px; margin-bottom: 6px; cursor: pointer;" onclick="selectWorkProject(\'' + escapeAttr(t.projectId) + '\'); setWorkView(\'detail\');">' +
                '<span style="color: #667eea; font-weight: 600;">\u2192</span>' +
                '<span style="flex: 1; font-size: 16px;">' + escapeHtml(t.title) + '</span>' +
                '<span style="font-size: 15px; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 8px; border-radius: 4px;">' + escapeHtml(t.projectName) + '</span>' +
                (t.deadline ? '<span style="font-size: 15px; color: var(--accent-warning);">' + (new Date(t.deadline).getMonth()+1) + '/' + new Date(t.deadline).getDate() + '</span>' : '') +
              '</div>'
            ).join('') +
            generalWorkTasks.slice(0, 2).map(t =>
              '<div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-primary); border-radius: 8px; margin-bottom: 6px;">' +
                '<button class="task-check-btn" onclick="event.stopPropagation(); completeTask(\'' + escapeAttr(t.id) + '\')" style="flex-shrink: 0;">○</button>' +
                '<span style="flex: 1; font-size: 16px;">' + escapeHtml(t.title) + '</span>' +
                (t.deadline ? '<span style="font-size: 15px; color: var(--accent-warning);">' + formatDeadline(t.deadline) + '</span>' : '') +
              '</div>'
            ).join('') +
          '</div>';
        })()}
        ${inProgressProjects.length > 0 ? `
          <div class="work-section">
            <div class="work-section-title">🚀 진행중 (${inProgressProjects.length})</div>
            <div class="work-dashboard">
              ${inProgressProjects.map(p => renderWorkDashboardCard(p)).join('')}
            </div>
          </div>
        ` : ''}
        ${noDeadlineProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: var(--text-muted);" onclick="toggleWorkSection('noDeadline')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.noDeadline ? '▼' : '▶'}</span>
              📋 마감없음 (${noDeadlineProjects.length})
            </div>
            ${appState.workSectionExpanded?.noDeadline ? `
              <div class="work-dashboard">
                ${noDeadlineProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${onHoldProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: #f5576c;" onclick="toggleWorkSection('onHold')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.onHold ? '▼' : '▶'}</span>
              ⏸ 보류 (${onHoldProjects.length})
            </div>
            ${appState.workSectionExpanded?.onHold ? `
              <div class="work-dashboard">
                ${onHoldProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${completedProjects.length > 0 ? `
          <div class="work-section collapsible" style="margin-top: 20px;">
            <div class="work-section-title clickable" style="color: var(--success);" onclick="toggleWorkSection('completed')">
              <span class="work-section-toggle">${appState.workSectionExpanded?.completed ? '▼' : '▶'}</span>
              ✅ 완료 (${completedProjects.length})
            </div>
            ${appState.workSectionExpanded?.completed ? `
              <div class="work-dashboard">
                ${completedProjects.map(p => renderWorkDashboardCard(p)).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${appState.showArchivedProjects && archivedProjects.length > 0 ? `
          <div class="work-section" style="margin-top: 20px;">
            <div class="work-section-title">📦 아카이브 (${archivedProjects.length})</div>
            <div class="work-dashboard">
              ${archivedProjects.map(p => renderWorkDashboardCard(p)).join('')}
            </div>
          </div>
        ` : ''}
      ` : ''}
      ${appState.workView === 'detail' ? `
        <!-- 상세 뷰 -->
        <div class="work-project-selector">
          <label class="work-project-selector-label">프로젝트 선택</label>
          <select class="work-project-select" onchange="selectWorkProject(this.value)">
            <option value="" ${!appState.activeWorkProject ? 'selected' : ''}>-- 프로젝트 선택 --</option>
            ${inProgressProjects.length > 0 ? `
              <optgroup label="🚀 진행중">
                ${inProgressProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${noDeadlineProjects.length > 0 ? `
              <optgroup label="📋 마감없음">
                ${noDeadlineProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${onHoldProjects.length > 0 ? `
              <optgroup label="⏸ 보류">
                ${onHoldProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${completedProjects.length > 0 ? `
              <optgroup label="✅ 완료">
                ${completedProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
            ${archivedProjects.length > 0 ? `
              <optgroup label="📦 아카이브">
                ${archivedProjects.map(p => `
                  <option value="${p.id}" ${p.id === appState.activeWorkProject ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                `).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>
        ${activeProject ? renderWorkProjectDetail(activeProject) : `
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            프로젝트를 선택하세요
          </div>
        `}
      ` : ''}
      ${appState.workView === 'calendar' ? `
        <!-- 프로젝트 스케줄 뷰 + 달력 -->
        ${(() => {
          var now = new Date();
          var todayStr = getLocalDateStr(now);
          var activeAll = appState.workProjects.filter(function(p) { return !p.archived; });
          // 기본: 진행중 + 마감없음(활성)만 표시
          var defaultProjects = activeAll.filter(function(p) {
            return !p.onHold && !isProjectCompleted(p);
          });
          // 토글 시 완료/보류도 포함
          var showAll = appState.scheduleShowAll || false;
          var projects = showAll ? activeAll : defaultProjects;
          var hiddenCount = activeAll.length - defaultProjects.length;
          var projectColors = ['#667eea', '#48bb78', '#f6ad55', '#f093fb', '#22d3ee', '#f5576c', '#a78bfa', '#fb923c'];

          // 시간 범위: 오늘 기준 -2주 ~ +8주 (총 10주 = 70일)
          var rangeStart = new Date(now);
          rangeStart.setDate(rangeStart.getDate() - 14);
          rangeStart.setHours(0, 0, 0, 0);
          var rangeEnd = new Date(now);
          rangeEnd.setDate(rangeEnd.getDate() + 56);
          rangeEnd.setHours(23, 59, 59, 999);
          var totalDays = Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));

          // 주 단위 헤더 생성
          var weekStart = new Date(rangeStart);
          var dayOfWeek = weekStart.getDay();
          var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          weekStart.setDate(weekStart.getDate() + mondayOffset);

          var weekLabels = [];
          var tempWeek = new Date(weekStart);
          while (tempWeek < rangeEnd) {
            var wMonth = tempWeek.getMonth() + 1;
            var wDay = tempWeek.getDate();
            var weekDaysFromStart = Math.round((tempWeek - rangeStart) / (1000 * 60 * 60 * 24));
            var leftPct = Math.max(0, (weekDaysFromStart / totalDays) * 100);
            weekLabels.push({ label: wMonth + '/' + wDay, left: leftPct });
            tempWeek.setDate(tempWeek.getDate() + 7);
          }

          var weeksHtml = '';
          weeksHtml += '<div style="display: flex; align-items: center; border-bottom: 1px solid var(--border-color); padding: 8px 0; font-size: 14px; color: var(--text-muted);">';
          weeksHtml += '<div style="min-width: 130px; max-width: 130px; padding: 0 8px; font-weight: 600; color: var(--text-primary);">프로젝트</div>';
          weeksHtml += '<div style="flex: 1; position: relative; height: 24px; overflow: hidden;">';
          for (var wi = 0; wi < weekLabels.length; wi++) {
            weeksHtml += '<div style="position: absolute; left: ' + weekLabels[wi].left + '%; top: 0; font-size: 14px; color: var(--text-muted); white-space: nowrap; transform: translateX(-50%);">' + weekLabels[wi].label + '</div>';
            weeksHtml += '<div style="position: absolute; left: ' + weekLabels[wi].left + '%; top: 18px; width: 1px; height: 6px; background: var(--border-color);"></div>';
          }
          weeksHtml += '</div>';
          weeksHtml += '</div>';

          // 오늘 세로선 위치
          var todayDaysFromStart = Math.round((now - rangeStart) / (1000 * 60 * 60 * 24));
          var todayPct = (todayDaysFromStart / totalDays) * 100;

          // 프로젝트 행 생성
          var rowsHtml = '';
          if (projects.length === 0) {
            rowsHtml += '<div style="text-align: center; padding: 30px; color: var(--text-muted);">활성 프로젝트가 없습니다</div>';
          }
          for (var pi = 0; pi < projects.length; pi++) {
            var proj = projects[pi];
            var color = projectColors[pi % projectColors.length];
            var pStart = proj.createdAt ? new Date(proj.createdAt) : now;
            var pEnd = proj.deadline ? new Date(proj.deadline + 'T23:59:59') : null;
            var isOverdue = pEnd && pEnd < now;

            // 진행률 계산
            var totalStages = proj.stages.length;
            var completedStages = proj.stages.filter(function(s) { return s.completed; }).length;
            var progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

            // 바 위치 계산
            var barStartDays = Math.round((pStart - rangeStart) / (1000 * 60 * 60 * 24));
            var barLeft = Math.max(0, (barStartDays / totalDays) * 100);
            var barWidth = 0;
            var hasBar = false;

            if (pEnd) {
              var barEndDays = Math.round((pEnd - rangeStart) / (1000 * 60 * 60 * 24));
              var barRight = Math.min(100, (barEndDays / totalDays) * 100);
              barWidth = Math.max(2, barRight - barLeft);
              hasBar = true;
            }

            var barColor = isOverdue ? '#f5576c' : color;
            // hex to rgba for background
            var hexStr = (isOverdue ? '#f5576c' : color).replace('#', '');
            var rVal = parseInt(hexStr.substring(0, 2), 16);
            var gVal = parseInt(hexStr.substring(2, 4), 16);
            var bVal = parseInt(hexStr.substring(4, 6), 16);
            var barBg = 'rgba(' + rVal + ',' + gVal + ',' + bVal + ',0.15)';

            // 프로젝트 내 작업 마감일 점(dot) 수집
            var taskDots = [];
            proj.stages.forEach(function(stage) {
              (stage.subcategories || []).forEach(function(sub) {
                sub.tasks.forEach(function(task) {
                  if (task.deadline && task.status !== 'done') {
                    var tDate = new Date(task.deadline);
                    var tDays = Math.round((tDate - rangeStart) / (1000 * 60 * 60 * 24));
                    var tPct = (tDays / totalDays) * 100;
                    if (tPct >= 0 && tPct <= 100) {
                      taskDots.push({ pct: tPct, title: task.title, overdue: tDate < now });
                    }
                  }
                });
              });
            });

            // 마감일 라벨
            var deadlineLabel = proj.deadline ? proj.deadline.substring(5).replace('-', '/') : '';

            rowsHtml += '<div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); min-height: 40px; cursor: pointer; transition: background 0.15s;" onmouseenter="this.style.background=&quot;var(--bg-tertiary)&quot;" onmouseleave="this.style.background=&quot;transparent&quot;" onclick="appState.activeWorkProject=&quot;' + proj.id + '&quot;; setWorkView(&quot;detail&quot;);">';
            // 프로젝트 이름
            rowsHtml += '<div style="min-width: 130px; max-width: 130px; padding: 0 8px; display: flex; align-items: center; gap: 6px;">';
            rowsHtml += '<div style="width: 8px; height: 8px; border-radius: 50%; background: ' + barColor + '; flex-shrink: 0;"></div>';
            rowsHtml += '<span style="font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary);" title="' + escapeAttr(proj.name) + '">' + escapeHtml(proj.name) + '</span>';
            rowsHtml += '</div>';
            // 타임라인 영역
            rowsHtml += '<div style="flex: 1; position: relative; height: 32px; overflow: hidden;">';
            // 오늘 세로선
            rowsHtml += '<div style="position: absolute; left: ' + todayPct + '%; top: 0; bottom: 0; width: 2px; background: #f5576c; z-index: 2; opacity: 0.7;"></div>';
            // 주 구분선
            for (var wli = 0; wli < weekLabels.length; wli++) {
              rowsHtml += '<div style="position: absolute; left: ' + weekLabels[wli].left + '%; top: 0; bottom: 0; width: 1px; background: var(--border-color); opacity: 0.3;"></div>';
            }

            if (hasBar) {
              // 프로젝트 바
              rowsHtml += '<div style="position: absolute; left: ' + barLeft + '%; width: ' + barWidth + '%; top: 4px; height: 24px; background: ' + barBg + '; border-radius: 6px; overflow: hidden; border: 1px solid ' + barColor + ';">';
              // 진행률 채우기
              if (progress > 0) {
                rowsHtml += '<div style="position: absolute; left: 0; top: 0; bottom: 0; width: ' + progress + '%; background: ' + barColor + '; opacity: 0.35; border-radius: 5px 0 0 5px;"></div>';
              }
              // 바 내부 텍스트
              rowsHtml += '<div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; height: 100%; font-size: 14px; font-weight: 600; color: ' + barColor + '; padding: 0 6px; white-space: nowrap; overflow: hidden;">';
              if (barWidth > 8) {
                rowsHtml += progress + '%';
                if (deadlineLabel && barWidth > 15) {
                  rowsHtml += ' &middot; ' + deadlineLabel;
                }
              }
              rowsHtml += '</div>';
              rowsHtml += '</div>';
            } else {
              // 마감일 없으면 시작점에 점으로 표시
              if (barLeft >= 0 && barLeft <= 100) {
                rowsHtml += '<div style="position: absolute; left: ' + barLeft + '%; top: 10px; width: 12px; height: 12px; border-radius: 50%; background: ' + color + '; transform: translateX(-50%); opacity: 0.7;" title="마감일 미설정"></div>';
              }
            }

            // 작업 마감일 점
            for (var di = 0; di < taskDots.length; di++) {
              var dot = taskDots[di];
              rowsHtml += '<div style="position: absolute; left: ' + dot.pct + '%; bottom: 2px; width: 5px; height: 5px; border-radius: 50%; background: ' + (dot.overdue ? '#f5576c' : barColor) + '; transform: translateX(-50%); opacity: 0.8;" title="' + escapeAttr(dot.title) + '"></div>';
            }

            rowsHtml += '</div>'; // 타임라인 영역 닫기
            rowsHtml += '</div>'; // 행 닫기
          }

          // === 프로젝트 스케줄 뷰 조립 ===
          var scheduleHtml = '<div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 16px;">';
          scheduleHtml += '<div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">';
          scheduleHtml += '<span style="font-size: 17px;">프로젝트 스케줄</span>';
          scheduleHtml += '<span style="font-size: 15px; color: var(--text-muted); font-weight: 400;">' + projects.length + '개 · -2주~+8주</span>';
          scheduleHtml += '<span style="flex: 1;"></span>';
          if (hiddenCount > 0) {
            scheduleHtml += '<button onclick="appState.scheduleShowAll=!appState.scheduleShowAll; renderStatic();" style="background: ' + (showAll ? 'rgba(102,126,234,0.15)' : 'var(--bg-tertiary)') + '; border: 1px solid ' + (showAll ? 'rgba(102,126,234,0.3)' : 'var(--border-color)') + '; border-radius: 6px; padding: 4px 10px; font-size: 15px; color: ' + (showAll ? '#93BBFF' : 'var(--text-muted)') + '; cursor: pointer;">' + (showAll ? '활성만' : '완료/보류 +' + hiddenCount) + '</button>';
          }
          scheduleHtml += '</div>';
          scheduleHtml += weeksHtml;
          scheduleHtml += rowsHtml;
          // 범례
          scheduleHtml += '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 10px; font-size: 14px; color: var(--text-muted);">';
          scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 2px; height: 10px; background: #f5576c;"></span> 오늘</span>';
          scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 16px; height: 6px; background: rgba(102,126,234,0.3); border: 1px solid #667eea; border-radius: 3px;"></span> 프로젝트 기간</span>';
          scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #667eea;"></span> 작업 마감일</span>';
          scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 16px; height: 6px; background: rgba(245,87,108,0.15); border: 1px solid #f5576c; border-radius: 3px;"></span> 기한 초과</span>';
          scheduleHtml += '</div>';
          scheduleHtml += '</div>';

          // === 기존 달력 그리드 (프로젝트 마감일 표시 포함) ===
          var viewYear = appState.workCalendarYear || now.getFullYear();
          var viewMonth = appState.workCalendarMonth !== undefined ? appState.workCalendarMonth : now.getMonth();
          var firstDay = new Date(viewYear, viewMonth, 1);
          var lastDay = new Date(viewYear, viewMonth + 1, 0);
          var daysInMonth = lastDay.getDate();
          var startDow = firstDay.getDay();

          var deadlineMap = {};
          appState.workProjects.filter(function(p) { return !p.archived; }).forEach(function(p, pIdx) {
            if (p.deadline) {
              var pdStr = p.deadline.substring(0, 10);
              if (!deadlineMap[pdStr]) deadlineMap[pdStr] = [];
              deadlineMap[pdStr].push({ title: p.name + ' (마감)', project: p.name, status: 'project', color: projectColors[pIdx % projectColors.length] });
            }
            p.stages.forEach(function(stage) {
              (stage.subcategories || []).forEach(function(sub) {
                sub.tasks.forEach(function(task) {
                  if (task.deadline && task.status !== 'done') {
                    var dateStr = task.deadline.substring(0, 10);
                    if (!deadlineMap[dateStr]) deadlineMap[dateStr] = [];
                    deadlineMap[dateStr].push({ title: task.title, project: p.name, status: task.status });
                  }
                });
              });
            });
          });
          appState.tasks.filter(function(t) { return t.category === '본업' && !t.completed && t.deadline; }).forEach(function(t) {
            var dateStr = t.deadline.substring(0, 10);
            if (!deadlineMap[dateStr]) deadlineMap[dateStr] = [];
            deadlineMap[dateStr].push({ title: t.title, project: null, status: 'task' });
          });

          var daysHtml = '';
          var maxVisible = 3; // 셀 안에 보여줄 최대 작업 수
          for (var i = 0; i < startDow; i++) daysHtml += '<div class="calendar-day empty"></div>';
          for (var day = 1; day <= daysInMonth; day++) {
            var dateStr = viewYear + '-' + String(viewMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
            var tasks = deadlineMap[dateStr] || [];
            var isToday = dateStr === todayStr;
            var isSelected = dateStr === appState.workCalendarSelected;
            var classes = 'calendar-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + (tasks.length > 0 ? ' has-activity' : '');
            daysHtml += '<div class="' + classes + '" onclick="selectWorkCalendarDate(&quot;' + dateStr + '&quot;)">';
            daysHtml += '<span class="calendar-day-number">' + day + '</span>';
            if (tasks.length > 0) {
              daysHtml += '<div class="calendar-day-tasks">';
              var visibleTasks = tasks.slice(0, maxVisible);
              for (var ti = 0; ti < visibleTasks.length; ti++) {
                var t = visibleTasks[ti];
                var taskColor = t.status === 'project' ? (t.color || '#667eea') : t.status === 'in-progress' ? '#667eea' : t.status === 'blocked' ? '#f5576c' : '#48bb78';
                daysHtml += '<div class="calendar-day-task" style="background: ' + taskColor + '22; border-left: 2px solid ' + taskColor + ';" title="' + escapeAttr(t.title) + (t.project ? ' (' + escapeAttr(t.project) + ')' : '') + '">' + escapeHtml(t.title) + '</div>';
              }
              if (tasks.length > maxVisible) {
                daysHtml += '<div class="calendar-day-more">+' + (tasks.length - maxVisible) + '개</div>';
              }
              daysHtml += '</div>';
            }
            daysHtml += '</div>';
          }

          var monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
          var selectedTasks = appState.workCalendarSelected ? (deadlineMap[appState.workCalendarSelected] || []) : [];

          var calendarHtml = '<div class="calendar-container work-calendar">' +
            '<div class="calendar-header">' +
              '<div class="calendar-title">' + viewYear + '년 ' + monthNames[viewMonth] + '</div>' +
              '<div class="calendar-nav">' +
                '<button class="calendar-nav-btn" onclick="navigateWorkCalendar(-1)">◀</button>' +
                '<button class="calendar-nav-btn" onclick="navigateWorkCalendar(1)">▶</button>' +
              '</div>' +
            '</div>' +
            '<div class="calendar-weekdays"><div class="calendar-weekday">일</div><div class="calendar-weekday">월</div><div class="calendar-weekday">화</div><div class="calendar-weekday">수</div><div class="calendar-weekday">목</div><div class="calendar-weekday">금</div><div class="calendar-weekday">토</div></div>' +
            '<div class="calendar-days">' + daysHtml + '</div>' +
          '</div>';

          if (appState.workCalendarSelected && selectedTasks.length > 0) {
            calendarHtml += '<div style="margin-top: 16px; background: var(--bg-secondary); border-radius: 12px; padding: 16px;">' +
              '<div style="font-weight: 600; margin-bottom: 10px;">' + appState.workCalendarSelected + ' 마감 작업</div>';
            selectedTasks.forEach(function(t) {
              calendarHtml += '<div style="padding: 8px 12px; background: var(--bg-primary); border-radius: 8px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">' +
                '<span style="color: ' + (t.status === 'in-progress' ? '#667eea' : t.status === 'blocked' ? '#f5576c' : t.status === 'project' ? (t.color || '#667eea') : '#a0a0a0') + ';">&#9679;</span>' +
                '<span style="flex:1;">' + escapeHtml(t.title) + '</span>' +
                (t.project ? '<span style="font-size: 15px; color: var(--text-muted);">' + escapeHtml(t.project) + '</span>' : '') +
              '</div>';
            });
            calendarHtml += '</div>';
          } else if (appState.workCalendarSelected && selectedTasks.length === 0) {
            calendarHtml += '<div style="margin-top: 16px; text-align: center; color: var(--text-muted); padding: 20px;">이 날짜에 마감인 작업이 없습니다</div>';
          }

          return scheduleHtml + calendarHtml;
        })()}
      ` : ''}
      ${appState.workView === 'timeline' ? `
        <!-- 이력 뷰 -->
        ${(() => {
          // 모든 프로젝트의 최근 로그 수집
          const allLogs = [];
          appState.workProjects.filter(p => !p.archived).forEach(p => {
            p.stages.forEach((stage, si) => {
              (stage.subcategories || []).forEach((sub, sci) => {
                sub.tasks.forEach((task, ti) => {
                  (task.logs || []).forEach(log => {
                    allLogs.push({
                      date: log.date,
                      content: log.content,
                      taskTitle: task.title,
                      projectName: p.name,
                      projectId: p.id,
                      status: task.status
                    });
                  });
                });
              });
            });
          });

          // 완료된 일반 본업 작업
          const completedWork = appState.tasks.filter(t => t.category === '본업' && t.completed && t.completedAt).map(t => ({
            date: t.completedAt.substring(0, 10),
            content: '✓ 완료',
            taskTitle: t.title,
            projectName: '일반',
            projectId: null,
            status: 'completed'
          }));

          allLogs.push(...completedWork);
          allLogs.sort((a, b) => b.date.localeCompare(a.date));

          // 날짜별 그룹핑
          const byDate = {};
          allLogs.forEach(log => {
            if (!byDate[log.date]) byDate[log.date] = [];
            byDate[log.date].push(log);
          });
          const dates = Object.keys(byDate).sort().reverse().slice(0, 30);

          if (dates.length === 0) return '<div style="text-align: center; padding: 40px; color: var(--text-muted);">아직 기록이 없습니다</div>';

          return '<div style="padding: 0 4px;">' +
            '<div style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">📜 최근 활동 이력</div>' +
            dates.map(date =>
              '<div style="margin-bottom: 16px;">' +
                '<div style="font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border-color);">' + date + ' (' + byDate[date].length + '건)</div>' +
                byDate[date].map(log =>
                  '<div style="padding: 6px 12px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">' +
                    '<span style="width: 6px; height: 6px; border-radius: 50%; background: ' + (log.status === 'completed' ? '#48bb78' : log.status === 'in-progress' ? '#667eea' : '#a0a0a0') + '; flex-shrink: 0;"></span>' +
                    '<span style="flex: 1; font-size: 15px;">' + escapeHtml(log.taskTitle) + '</span>' +
                    '<span style="font-size: 14px; color: var(--text-secondary);">' + escapeHtml(log.content) + '</span>' +
                    '<span style="font-size: 15px; color: var(--text-muted); background: var(--bg-secondary); padding: 1px 6px; border-radius: 4px;">' + escapeHtml(log.projectName) + '</span>' +
                  '</div>'
                ).join('') +
              '</div>'
            ).join('') +
          '</div>';
        })()}
      ` : ''}
    </div>
  `;
}

/**
 * 뷰 전환
 */
function setWorkView(view) {
  appState.workView = view;
  renderStatic();
}
window.setWorkView = setWorkView;

// 본업 달력 상태 초기화
if (appState.workCalendarYear === undefined) {
  appState.workCalendarYear = new Date().getFullYear();
  appState.workCalendarMonth = new Date().getMonth();
}

function selectWorkCalendarDate(dateStr) {
  appState.workCalendarSelected = dateStr;
  renderStatic();
}
window.selectWorkCalendarDate = selectWorkCalendarDate;

function navigateWorkCalendar(direction) {
  let month = (appState.workCalendarMonth !== undefined ? appState.workCalendarMonth : new Date().getMonth()) + direction;
  let year = appState.workCalendarYear || new Date().getFullYear();
  if (month < 0) { month = 11; year--; }
  if (month > 11) { month = 0; year++; }
  appState.workCalendarMonth = month;
  appState.workCalendarYear = year;
  appState.workCalendarSelected = null;
  renderStatic();
}
window.navigateWorkCalendar = navigateWorkCalendar;

/**
 * 아카이브 토글
 */
function toggleArchivedProjects() {
  appState.showArchivedProjects = !appState.showArchivedProjects;
  renderStatic();
}
window.toggleArchivedProjects = toggleArchivedProjects;

// 라이프 리듬 트래커 + 복약 트래커: js/rhythm.js로 분리됨

// 로컬 타임존 기준 날짜 문자열 (YYYY-MM-DD) - UTC 변환 방지
function getLocalDateStr(d) {
  const dt = d || new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

// 로컬 시간 기준 datetime-local 문자열 (YYYY-MM-DDTHH:mm)
function getLocalDateTimeStr(d) {
  const dt = d || new Date();
  return getLocalDateStr(dt) + 'T' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
}

// getTimeDiffMessage ~ loadLifeRhythm: js/rhythm.js로 분리됨


function toggleWorkSection(section) {
  if (!appState.workSectionExpanded) {
    appState.workSectionExpanded = {};
  }
  appState.workSectionExpanded[section] = !appState.workSectionExpanded[section];
  renderStatic();
}
window.toggleWorkSection = toggleWorkSection;

/**
 * 대시보드 카드 렌더링
 */
function renderWorkDashboardCard(project) {
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalStages = project.stages.length;
  const totalTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.length, 0), 0);
  const completedTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.filter(t => t.status === 'completed').length, 0), 0);

  // 마감일 계산
  let deadlineText = '';
  let deadlineClass = 'none';
  if (project.deadline) {
    const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      deadlineText = `D+${Math.abs(daysLeft)}`;
      deadlineClass = 'overdue';
    } else if (daysLeft === 0) {
      deadlineText = 'D-Day';
      deadlineClass = 'overdue';
    } else if (daysLeft <= 3) {
      deadlineText = `D-${daysLeft}`;
      deadlineClass = 'soon';
    } else {
      deadlineText = `D-${daysLeft}`;
    }
  }

  return `
    <div class="work-dashboard-card ${project.id === appState.activeWorkProject ? 'active' : ''} ${project.archived ? 'archived' : ''}"
         onclick="selectWorkProject('${escapeAttr(project.id)}'); setWorkView('detail');">
      <div class="work-dashboard-header">
        <div class="work-dashboard-name">
          ${escapeHtml(project.name)}
          ${project.archived ? '<span class="work-archived-badge">아카이브</span>' : ''}
          ${project.onHold ? '<span class="work-onhold-badge">보류</span>' : ''}
        </div>
        ${project.deadline ? `
          <span class="work-deadline ${deadlineClass}">${deadlineText}</span>
        ` : ''}
      </div>
      ${(project.startDate || project.deadline) ? `
        <div class="work-dashboard-schedule">
          📅 ${project.startDate ? `${new Date(project.startDate).getMonth() + 1}/${new Date(project.startDate).getDate()}` : ''}
          ${project.startDate && project.deadline ? '~' : ''}
          ${project.deadline ? `${new Date(project.deadline).getMonth() + 1}/${new Date(project.deadline).getDate()}` : ''}
        </div>
      ` : ''}
      <div class="work-dashboard-stages">
        ${project.stages.map((s, idx) => `
          <div class="work-dashboard-stage-dot ${s.completed ? 'completed' : (idx === project.currentStage ? 'current' : '')}"></div>
        `).join('')}
      </div>
      <div class="work-dashboard-meta">
        <span>📋 ${completedTasks}/${totalTasks} 항목</span>
        <span>✓ ${completedStages}/${totalStages} 단계</span>
        ${project.participantGoal ? `<span>👥 ${project.participantCount || 0}/${project.participantGoal}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * 프로젝트 선택
 */
function selectWorkProject(projectId) {
  appState.activeWorkProject = projectId;
  renderStatic();
}
window.selectWorkProject = selectWorkProject;

/**
 * 프로젝트 상세 렌더링
 */
function renderWorkProjectDetail(project) {
  const completedStages = project.stages.filter(s => s.completed).length;
  const totalTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.length, 0), 0);
  const completedTasks = project.stages.reduce((sum, s) =>
    sum + (s.subcategories || []).reduce((subSum, sub) => subSum + sub.tasks.filter(t => t.status === 'completed').length, 0), 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 프로젝트 일정 계산
  let scheduleHtml = '';
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (project.startDate || project.deadline) {
    let dDayHtml = '';
    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      let deadlineClass = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
      let deadlineText = daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? 'D-Day' : `D-${daysLeft}`;
      dDayHtml = `<span class="work-deadline ${deadlineClass}">${deadlineText}</span>`;
    }

    const dateRange = project.startDate && project.deadline
      ? `${formatDate(project.startDate)} ~ ${formatDate(project.deadline)}`
      : project.startDate ? `${formatDate(project.startDate)} ~` : `~ ${formatDate(project.deadline)}`;

    scheduleHtml = `
      <div class="work-schedule" onclick="showWorkModal('deadline', '${escapeAttr(project.id)}')" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <span class="work-date-range">📅 ${dateRange}</span>
        ${dDayHtml}
      </div>
    `;
  } else {
    scheduleHtml = `<span class="work-deadline none" onclick="showWorkModal('deadline', '${escapeAttr(project.id)}')">+ 일정 설정</span>`;
  }

  return `
    <div class="work-project-detail">
      <!-- 프로젝트 헤더 -->
      <div class="work-projects-header">
        <!-- 1줄: 프로젝트명 + 일정 + D-day -->
        <div class="work-project-info-row">
          <div class="work-projects-title">${escapeHtml(project.name)}</div>
          ${scheduleHtml}
        </div>
        <!-- 진행률 바 -->
        <div class="work-project-progress">
          <div class="work-project-progress-bar">
            <div class="work-project-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <span class="work-project-progress-text">${completedTasks}/${totalTasks} 항목 · ${completedStages}/${project.stages.length} 단계</span>
        </div>
        <!-- 2줄: 액션 버튼 -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="work-project-action-btn" onclick="copyProjectToSlack('${escapeAttr(project.id)}')" aria-label="슬랙에 복사">💬 슬랙복사</button>
          <button class="work-project-action-btn" onclick="duplicateWorkProject('${escapeAttr(project.id)}')" aria-label="프로젝트 복제">📋 복제</button>
          <button class="work-project-action-btn" onclick="holdWorkProject('${escapeAttr(project.id)}')" aria-label="${project.onHold ? '프로젝트 재개' : '프로젝트 보류'}">${project.onHold ? '▶ 재개' : '⏸ 보류'}</button>
          <button class="work-project-action-btn" onclick="archiveWorkProject('${escapeAttr(project.id)}')" aria-label="${project.archived ? '프로젝트 복원' : '프로젝트 보관'}">${project.archived ? '📤 복원' : '📦 보관'}</button>
          <button class="work-project-action-btn" onclick="saveAsTemplate('${escapeAttr(project.id)}')" aria-label="템플릿으로 저장">💾 템플릿</button>
          <button class="work-project-action-btn delete" onclick="deleteWorkProject('${escapeAttr(project.id)}')" aria-label="프로젝트 삭제">${svgIcon('trash', 14)} 삭제</button>
        </div>
      </div>

      <!-- 참여자 트래커 -->
      ${project.participantGoal ? `
        <div class="work-participant-tracker">
          <span class="work-participant-label">👥 참여자 현황</span>
          <div class="work-participant-bar">
            <div class="work-participant-fill" style="width: ${Math.min(100, ((project.participantCount || 0) / project.participantGoal) * 100)}%"></div>
          </div>
          <span class="work-participant-count">${project.participantCount || 0}</span>
          <span class="work-participant-goal">/ ${project.participantGoal}명</span>
          <button class="work-task-action" onclick="updateParticipantCount('${escapeAttr(project.id)}')">수정</button>
        </div>
      ` : `
        <div style="margin: 12px 0;">
          <button class="work-stage-add-task" onclick="showWorkModal('participant', '${escapeAttr(project.id)}')">+ 참여자 목표 설정</button>
        </div>
      `}

      <!-- 단계별 내용 -->
      <div class="work-stages">
        ${project.stages.map((stage, stageIdx) => {
          const stageName = getStageName(project, stageIdx);
          const stageClass = stage.completed ? 'completed' : '';
          const subcategories = stage.subcategories || [];

          return `
            <div class="work-stage ${stageClass}">
              <div class="work-stage-header">
                <div class="work-stage-title">
                  <div class="work-stage-checkbox ${stage.completed ? 'checked' : ''}"
                       onclick="toggleStageComplete('${escapeAttr(project.id)}', ${stageIdx})">
                    ${stage.completed ? '✓' : ''}
                  </div>
                  <span class="work-stage-number">${stageIdx + 1}</span>
                  <span class="work-stage-name" onclick="promptRenameStage('${escapeAttr(project.id)}', ${stageIdx}, '${escapeAttr(stageName)}')" style="cursor: pointer;" title="클릭하여 이름 변경">${escapeHtml(stageName)}</span>
                  ${(stage.startDate || stage.deadline) ? (() => {
                    const fmtDate = (d) => d ? (new Date(d).getMonth() + 1) + '/' + new Date(d).getDate() : '';
                    let html = '<span class="work-stage-date" style="margin-left: 8px; font-size: 14px; color: var(--text-muted);">';
                    if (stage.startDate && stage.deadline) {
                      html += fmtDate(stage.startDate) + '~' + fmtDate(stage.deadline);
                    } else if (stage.startDate) {
                      html += fmtDate(stage.startDate) + '~';
                    } else {
                      html += '~' + fmtDate(stage.deadline);
                    }
                    html += '</span>';
                    if (stage.deadline) {
                      const daysLeft = Math.ceil((new Date(stage.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                      const cls = daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'soon' : '';
                      const txt = daysLeft < 0 ? 'D+' + Math.abs(daysLeft) : daysLeft === 0 ? 'D-Day' : 'D-' + daysLeft;
                      html += '<span class="work-deadline ' + cls + '" style="margin-left: 6px;">' + txt + '</span>';
                    }
                    return html;
                  })() : ''}
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="work-stage-add-task" onclick="promptRenameStage('${escapeAttr(project.id)}', ${stageIdx}, '${escapeAttr(stageName)}')" title="단계 이름 변경" aria-label="단계 이름 변경">${svgIcon('edit', 14)}</button>
                  <button class="work-stage-add-task" onclick="showWorkModal('stage-deadline', '${escapeAttr(project.id)}', ${stageIdx})" title="단계 일정 설정" aria-label="단계 일정 설정">📅</button>
                  <button class="work-stage-add-task" onclick="deleteProjectStage('${escapeAttr(project.id)}', ${stageIdx})" title="단계 삭제" aria-label="단계 삭제" style="color: var(--danger);">${svgIcon('trash', 14)}</button>
                  <button class="work-stage-add-task" onclick="showWorkModal('subcategory', '${escapeAttr(project.id)}', ${stageIdx})">+ 중분류</button>
                </div>
              </div>

              ${subcategories.length > 0 ? `
                ${subcategories.map((subcat, subcatIdx) => `
                  <div class="work-subcategory">
                    <div class="work-subcategory-header">
                      <div class="work-subcategory-title">
                        <div class="work-subcategory-checkbox ${subcat.tasks.length > 0 && subcat.tasks.every(t => t.status === 'completed') ? 'checked' : ''}"
                             onclick="toggleSubcategoryComplete('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})">
                          ${subcat.tasks.length > 0 && subcat.tasks.every(t => t.status === 'completed') ? '✓' : ''}
                        </div>
                        <span class="work-subcategory-name" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx}, '${escapeAttr(subcat.name)}')" title="클릭하여 이름 변경">${escapeHtml(subcat.name)}</span>
                        <span class="work-subcategory-toggle">(${subcat.tasks.filter(t => t.status === 'completed').length}/${subcat.tasks.length})</span>
                        ${(subcat.startDate || subcat.endDate) ? (() => {
                          const fmtDate = (d) => d ? (new Date(d).getMonth() + 1) + '/' + new Date(d).getDate() : '';
                          let html = '<span class="work-subcat-date" style="margin-left: 8px; font-size: 15px; color: var(--text-muted);">';
                          if (subcat.startDate && subcat.endDate) {
                            html += fmtDate(subcat.startDate) + '~' + fmtDate(subcat.endDate);
                          } else if (subcat.startDate) {
                            html += fmtDate(subcat.startDate) + '~';
                          } else {
                            html += '~' + fmtDate(subcat.endDate);
                          }
                          html += '</span>';
                          return html;
                        })() : ''}
                      </div>
                      <div class="work-subcategory-actions">
                        <button class="work-task-action" onclick="promptRenameSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx}, '${escapeAttr(subcat.name)}')" title="중분류 이름 변경">${svgIcon('edit', 14)}</button>
                        <button class="work-task-action" onclick="showWorkModal('subcat-deadline', '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="중분류 일정" aria-label="중분류 일정 설정">📅</button>
                        <button class="work-task-action" onclick="deleteSubcategory('${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})" title="중분류 삭제" style="color: var(--danger);">${svgIcon('trash', 14)}</button>
                        <button class="work-task-action" onclick="showWorkModal('task', '${escapeAttr(project.id)}', ${stageIdx}, ${subcatIdx})">+ 항목</button>
                      </div>
                    </div>
                    ${subcat.tasks.length > 0 ? `
                      <div class="work-task-list">
                        ${subcat.tasks.map((task, taskIdx) => renderWorkTask(project.id, stageIdx, subcatIdx, task, taskIdx)).join('')}
                      </div>
                    ` : '<div style="color: var(--text-muted); font-size: 14px; padding: 8px;">항목 없음</div>'}
                  </div>
                `).join('')}
              ` : '<div style="color: var(--text-muted); font-size: 15px; padding: 10px;">중분류를 추가하세요</div>'}
            </div>
          `;
        }).join('')}

        <!-- 새 단계 추가 버튼 -->
        <div class="work-stage-add-new" style="margin-top: 12px; padding: 12px; border: 2px dashed var(--border); border-radius: var(--radius-md); text-align: center;">
          <button class="work-stage-add-task" onclick="promptAddStage('${escapeAttr(project.id)}')" style="width: 100%; padding: 10px;">
            + 새 단계 추가
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 16px;">
        <button class="work-copy-btn" onclick="copyWorkProjectToClipboard('${escapeAttr(project.id)}')">
          📋 노션/슬랙용 복사
        </button>
      </div>
    </div>
  `;
}

/**
 * 단계 완료 토글
 */
function toggleStageComplete(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].completed = !project.stages[stageIdx].completed;

  // 완료된 단계 이후의 첫 미완료 단계를 현재 단계로 설정
  const firstIncomplete = project.stages.findIndex(s => !s.completed);
  project.currentStage = firstIncomplete >= 0 ? firstIncomplete : project.stages.length - 1;

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(project.stages[stageIdx].completed ? '단계 완료!' : '단계 완료 취소', 'success');
}
window.toggleStageComplete = toggleStageComplete;

/**
 * 프로젝트 복제
 */
function duplicateWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newProject = JSON.parse(JSON.stringify(project));
  newProject.id = generateId();
  newProject.name = project.name + ' (복사본)';
  newProject.createdAt = new Date().toISOString();
  newProject.updatedAt = new Date().toISOString();
  newProject.archived = false;

  // 모든 단계와 항목 초기화
  newProject.stages.forEach(stage => {
    stage.completed = false;
    (stage.subcategories || []).forEach(sub => {
      sub.tasks.forEach(task => {
        task.status = 'not-started';
        task.logs = [];
      });
    });
  });
  newProject.currentStage = 0;
  newProject.participantCount = 0;

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 복제됨', 'success');
}
window.duplicateWorkProject = duplicateWorkProject;

/**
 * 프로젝트 슬랙 형식으로 클립보드 복사
 * - 슬랙에 붙여넣기 용도의 체크리스트 텍스트 생성
 */
function copyProjectToSlack(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const statusLabel = {
    'not-started': '',
    'in-progress': '[진행중]',
    'completed': '[완료]',
    'blocked': '[보류]'
  };

  // 마감일 포맷 헬퍼
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = [];
  lines.push('[ ' + project.name + ' 진행 리스트 ]');
  lines.push('');

  project.stages.forEach((stage, stageIdx) => {
    const stageName = getStageName(project, stageIdx);
    const subcats = stage.subcategories || [];
    if (subcats.length === 0) return;

    // 단계별 완료율 계산
    const total = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
    const done = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
    const stageStatus = total > 0 && done === total ? ' ✅' : '';

    lines.push('■ ' + stageName + stageStatus);

    subcats.forEach(sub => {
      // 중분류명이 "일반"이면 생략하고 작업만 나열
      const isGeneral = sub.name === '일반';

      if (!isGeneral) {
        // 중분류에 작업이 있으면 중분류명을 상위 항목으로 표시
        const subDone = sub.tasks.filter(t => t.status === 'completed').length;
        const subStatus = sub.tasks.length > 0 && subDone === sub.tasks.length ? ' [완료]' : '';
        lines.push(sub.name + ':' + subStatus);

        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = '  ' + task.title;
          if (status) line += ' ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      } else {
        // "일반" 중분류: 작업을 최상위로 나열
        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = task.title;
          if (status) line += ': ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      }
    });

    lines.push(''); // 단계 사이 빈 줄
  });

  const text = lines.join('\n').trim();
  navigator.clipboard.writeText(text).then(() => {
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  }).catch(() => {
    // 클립보드 API 실패 시 fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  });
}
window.copyProjectToSlack = copyProjectToSlack;

/**
 * 본업 프로젝트 단계(stage) 단위 슬랙 복사
 */
function copyStageToSlack(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const stage = project.stages[stageIdx];
  const stageName = getStageName(project, stageIdx);
  const statusLabel = { 'not-started': '', 'in-progress': '[진행중]', 'completed': '[완료]', 'blocked': '[보류]' };
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = ['■ ' + stageName];
  (stage.subcategories || []).forEach(sub => {
    const isGeneral = sub.name === '일반';
    if (!isGeneral && sub.tasks.length > 0) {
      lines.push(sub.name + ':');
    }
    sub.tasks.forEach(task => {
      const status = statusLabel[task.status] || '';
      const deadline = fmtDeadline(task);
      const prefix = isGeneral ? '' : '  ';
      let line = prefix + task.title;
      if (status) line += ' ' + status;
      if (deadline) line += deadline;
      lines.push(line);
    });
  });

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('단계 복사됨 (슬랙용)', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('단계 복사됨 (슬랙용)', 'success');
  });
}
window.copyStageToSlack = copyStageToSlack;

/**
 * 본업 프로젝트 개별 작업 슬랙 복사
 */
function copyWorkTaskToSlack(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories[subcatIdx]?.tasks[taskIdx];
  if (!task) return;

  const statusLabel = { 'not-started': '미시작', 'in-progress': '진행중', 'completed': '완료', 'blocked': '보류' };
  let text = task.title;
  text += ' [' + (statusLabel[task.status] || '미시작') + ']';
  if (task.deadline) {
    const d = new Date(task.deadline);
    text += ' ~' + (d.getMonth()+1) + '/' + d.getDate();
  }
  if (task.logs && task.logs.length > 0) {
    text += '\n최근 기록:';
    task.logs.slice(-3).forEach(log => {
      text += '\n  - ' + log.date + ': ' + log.content;
    });
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('작업 복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('작업 복사됨', 'success');
  });
}
window.copyWorkTaskToSlack = copyWorkTaskToSlack;

/**
 * 프로젝트 아카이브
 */
function archiveWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.archived = !project.archived;
  project.updatedAt = new Date().toISOString();

  if (project.archived && appState.activeWorkProject === projectId) {
    const active = appState.workProjects.find(p => !p.archived);
    appState.activeWorkProject = active ? active.id : null;
  }

  saveWorkProjects();
  renderStatic();
  showToast(project.archived ? '아카이브됨' : '아카이브 해제됨', 'success');
}
window.archiveWorkProject = archiveWorkProject;

/**
 * 프로젝트 보류 토글
 */
function holdWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.onHold = !project.onHold;
  project.updatedAt = new Date().toISOString();

  saveWorkProjects();
  renderStatic();
  showToast(project.onHold ? '보류 처리됨' : '보류 해제됨', 'success');
}
window.holdWorkProject = holdWorkProject;

/**
 * 템플릿으로 저장
 */
function saveAsTemplate(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const templateName = prompt('템플릿 이름을 입력하세요:', project.name + ' 템플릿');
  if (!templateName) return;

  const template = {
    id: generateId(),
    name: templateName,
    stageNames: project.stages.map(s => s.name || ''),
    stages: project.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => ({ title: t.title }))
      }))
    })),
    participantGoal: project.participantGoal,
    createdAt: new Date().toISOString()
  };

  appState.workTemplates.push(template);
  if (!appState.user) {
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
  }
  if (appState.user) { syncToFirebase(); }
  showToast('템플릿 저장됨', 'success');
}
window.saveAsTemplate = saveAsTemplate;

/**
 * 참여자 수 업데이트
 */
function updateParticipantCount(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const count = prompt('현재 참여자 수:', project.participantCount || 0);
  if (count === null) return;

  project.participantCount = parseInt(count) || 0;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.updateParticipantCount = updateParticipantCount;

/**
 * 작업 항목 렌더링
 */
function renderWorkTask(projectId, stageIdx, subcatIdx, task, taskIdx) {
  const statusInfo = WORK_STATUS[task.status] || WORK_STATUS['not-started'];

  // 작업 마감일 표시
  let deadlineHtml = '';
  if (task.deadline) {
    const d = new Date(task.deadline);
    const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    const deadlineClass = daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'soon' : '';
    const dateStr = (d.getMonth() + 1) + '/' + d.getDate();
    deadlineHtml = `<span class="work-task-deadline ${deadlineClass}" onclick="event.stopPropagation(); promptTaskDeadline('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="클릭하여 마감일 변경">~${dateStr}</span>`;
  }

  return `
    <div class="work-task-item">
      <div class="work-task-header">
        <div class="work-task-checkbox ${task.status === 'completed' ? 'checked' : ''}"
             onclick="toggleWorkTaskComplete('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
             title="완료 체크">
          ${task.status === 'completed' ? '✓' : ''}
        </div>
        <span class="work-status-badge ${task.status}" onclick="cycleWorkTaskStatus('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})"
              title="클릭하여 상태 변경">
          ${statusInfo.label}
        </span>
        <span class="work-task-title ${task.status === 'completed' ? 'completed' : ''}"
              onclick="promptRenameWorkTask('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx}, '${escapeAttr(task.title)}')"
              title="클릭하여 이름 변경">${escapeHtml(task.title)}</span>
        ${deadlineHtml}
        <div class="work-task-actions">
          <button class="work-task-action" onclick="promptRenameWorkTask('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx}, '${escapeAttr(task.title)}')">${svgIcon('edit', 14)}</button>
          <button class="work-task-action" onclick="promptTaskDeadline('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="마감일 설정" aria-label="마감일 설정">📅</button>
          <button class="work-task-action" onclick="showWorkModal('log', '${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" aria-label="기록 추가">+ 기록</button>
          <button class="work-task-action" onclick="event.stopPropagation(); copyWorkTaskToSlack('${escapeAttr(projectId)}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="슬랙 복사" aria-label="슬랙 복사">📋</button>
          <button class="work-task-action" onclick="deleteWorkTask('${projectId}', ${stageIdx}, ${subcatIdx}, ${taskIdx})" title="항목 삭제" aria-label="항목 삭제" style="color: var(--danger);">${svgIcon('trash', 14)}</button>
        </div>
      </div>
      ${task.logs && task.logs.length > 0 ? `
        <div class="work-task-logs">
          ${(() => {
            // 완료 로그 압축: "✓ 완료" 로그는 하나로 요약
            const completionLogs = task.logs.filter(l => l.content === '✓ 완료');
            const otherLogs = task.logs.filter(l => l.content !== '✓ 완료');
            let html = '';
            if (completionLogs.length > 0) {
              const lastDate = completionLogs[completionLogs.length - 1].date;
              if (completionLogs.length === 1) {
                html += '<div class="work-task-log"><span class="work-task-log-date" style="color: #48bb78;">✓ 완료 (' + lastDate + ')</span></div>';
              } else {
                html += '<div class="work-task-log"><span class="work-task-log-date" style="color: #48bb78;">✓ ' + completionLogs.length + '회 완료 (최근: ' + lastDate + ')</span></div>';
              }
            }
            otherLogs.forEach(log => {
              const actualIdx = task.logs.indexOf(log);
              html += '<div class="work-task-log"><span class="work-task-log-date">' + escapeHtml(log.date) + '</span><span class="work-task-log-content">' + escapeHtml(log.content) + '</span><div class="work-task-log-actions"><button class="work-task-log-action" onclick="deleteWorkLog(\'' + escapeAttr(projectId) + '\', ' + Number(stageIdx) + ', ' + Number(subcatIdx) + ', ' + Number(taskIdx) + ', ' + Number(actualIdx) + ')" aria-label="기록 삭제">×</button></div></div>';
            });
            return html;
          })()}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 모달 표시
 */
function showWorkModal(type, projectId = null, stageIdx = null, subcatIdx = null, taskIdx = null) {
  workModalState = { type, projectId, stageIdx, subcategoryIdx: subcatIdx, taskIdx };

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  let titleText = '';
  let bodyHtml = '';

  const project = projectId ? appState.workProjects.find(p => p.id === projectId) : null;

  switch(type) {
    case 'project':
      titleText = '📁 새 프로젝트';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">프로젝트 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: UT 10월차" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일 (선택)</label>
          <input type="date" class="work-modal-input" id="work-input-deadline">
        </div>
      `;
      break;
    case 'subcategory':
      titleText = '📂 중분류 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 사전 준비" autofocus>
        </div>
      `;
      break;
    case 'task':
      titleText = '📝 항목 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">항목 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 작업명 입력" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">진행 상태</label>
          <div class="work-status-group">
            <button type="button" class="work-status-option selected" data-status="not-started">미시작</button>
            <button type="button" class="work-status-option" data-status="in-progress">진행중</button>
            <button type="button" class="work-status-option" data-status="completed">완료</button>
            <button type="button" class="work-status-option" data-status="blocked">보류</button>
          </div>
        </div>
      `;
      break;
    case 'log':
      titleText = '📋 진행 기록 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">진행 내용</label>
          <textarea class="work-modal-textarea" id="work-input-content" placeholder="오늘 진행한 내용을 입력하세요..." autofocus></textarea>
        </div>
      `;
      break;
    case 'deadline':
      titleText = '📅 프로젝트 일정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${project?.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${project?.deadline || ''}">
        </div>
        ${project?.startDate && project?.deadline ? `
          <div style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
            📆 총 ${Math.ceil((new Date(project.deadline) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))}일 소요 예정
          </div>
        ` : ''}
      `;
      break;
    case 'stage-deadline':
      titleText = '📅 단계 일정';
      const stageData = project?.stages[stageIdx] || {};
      const stageNameForModal = getStageName(project, stageIdx);
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${stageData.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${stageData.deadline || ''}">
        </div>
      `;
      break;
    case 'subcat-deadline':
      titleText = '📅 중분류 일정';
      const subcatData = project?.stages[stageIdx]?.subcategories[subcatIdx] || {};
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${subcatData.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 종료일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${subcatData.endDate || ''}">
        </div>
      `;
      break;
    case 'participant':
      titleText = '👥 참여자 목표 설정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">목표 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-goal" placeholder="예: 10" min="1" value="${project?.participantGoal || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">현재 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-count" placeholder="예: 0" min="0" value="${project?.participantCount || 0}">
        </div>
      `;
      break;
    case 'template-select': {
      titleText = '📋 템플릿 선택';
      const allTemplates = appState.workTemplates;
      const totalTaskCount = (t) => t.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
      if (allTemplates.length === 0) {
        bodyHtml = `
          <div class="work-modal-field" style="text-align: center; padding: 20px; color: var(--text-muted);">
            <div style="font-size: 16px; margin-bottom: 12px;">저장된 템플릿이 없습니다</div>
            <div style="font-size: 14px;">📥 가져오기 버튼으로 JSON 템플릿을 추가하거나,<br>프로젝트 상세에서 "템플릿으로 저장"을 이용하세요.</div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allTemplates.map(t => `
                <div style="display: flex; align-items: stretch; gap: 4px;">
                  <button type="button" class="work-status-option template-option" data-template-id="${t.id}" style="text-align: left; padding: 12px; flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(t.name)}</div>
                    <div style="font-size: 15px; color: var(--text-muted); margin-top: 4px;">
                      ${escapeHtml((t.stageNames || t.stages.map((_, i) => appState.workProjectStages[i])).filter(Boolean).join(' → '))}
                    </div>
                    <div style="font-size: 15px; color: var(--text-muted);">
                      ${totalTaskCount(t)}개 항목
                    </div>
                  </button>
                  <button type="button" class="work-project-action-btn" onclick="exportTemplate('${t.id}')" title="JSON 내보내기" style="padding: 8px; font-size: 16px;">📤</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      break;
    }
    case 'template-import': {
      titleText = '📥 템플릿 가져오기';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">JSON 템플릿 붙여넣기</label>
          <textarea class="work-modal-input" id="work-input-template-json" rows="10"
            placeholder='{"name": "템플릿 이름", "stageNames": ["단계1", ...], "stages": [{"subcategories": [{"name": "분류", "tasks": [{"title": "작업"}]}]}]}'
            style="font-family: monospace; font-size: 14px; resize: vertical; min-height: 150px;"></textarea>
          <div style="font-size: 15px; color: var(--text-muted); margin-top: 8px;">
            프로젝트에서 📤 내보내기한 JSON을 붙여넣으세요.<br>
            가져온 템플릿은 모든 기기에서 자동 동기화됩니다.
          </div>
        </div>
      `;
      break;
    }
  }

  title.textContent = titleText;
  body.innerHTML = bodyHtml;
  modal.classList.add('show');

  // 상태 선택 버튼 이벤트
  if (type === 'task') {
    body.querySelectorAll('.work-status-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.work-status-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 템플릿 선택 이벤트
  if (type === 'template-select') {
    body.querySelectorAll('.template-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 첫 입력 필드에 포커스
  setTimeout(() => {
    const input = body.querySelector('input, textarea');
    if (input) input.focus();
  }, 100);
}
window.showWorkModal = showWorkModal;

/**
 * 모달 닫기
 */
function closeWorkModal() {
  document.getElementById('work-input-modal').classList.remove('show');
  workModalState = { type: null, projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null };
}
window.closeWorkModal = closeWorkModal;

/**
 * 모달 확인
 */
function confirmWorkModal() {
  const { type, projectId, stageIdx, subcategoryIdx, taskIdx } = workModalState;

  switch(type) {
    case 'project': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const deadline = document.getElementById('work-input-deadline')?.value || null;
      addWorkProject(name, deadline);
      break;
    }
    case 'subcategory': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      addSubcategory(projectId, stageIdx, name);
      break;
    }
    case 'task': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const status = document.querySelector('.work-status-option.selected')?.dataset.status || 'not-started';
      addWorkTask(projectId, stageIdx, subcategoryIdx, name, status);
      break;
    }
    case 'log': {
      const content = document.getElementById('work-input-content').value.trim();
      if (!content) { showToast('내용을 입력하세요', 'error'); return; }
      addWorkLog(projectId, stageIdx, subcategoryIdx, taskIdx, content);
      break;
    }
    case 'deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.startDate = startDate;
        project.deadline = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('일정 설정됨', 'success');
      }
      break;
    }
    case 'stage-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.stages[stageIdx].startDate = startDate;
        project.stages[stageIdx].deadline = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('단계 일정 설정됨', 'success');
      }
      break;
    }
    case 'subcat-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const endDate = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project && project.stages[stageIdx]?.subcategories[subcategoryIdx]) {
        project.stages[stageIdx].subcategories[subcategoryIdx].startDate = startDate;
        project.stages[stageIdx].subcategories[subcategoryIdx].endDate = endDate;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('중분류 일정 설정됨', 'success');
      }
      break;
    }
    case 'participant': {
      const goal = parseInt(document.getElementById('work-input-goal').value) || null;
      const count = parseInt(document.getElementById('work-input-count').value) || 0;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.participantGoal = goal;
        project.participantCount = count;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('참여자 목표 설정됨', 'success');
      }
      break;
    }
    case 'template-select': {
      const selected = document.querySelector('.template-option.selected');
      if (selected) {
        const templateId = selected.dataset.templateId;
        applyTemplate(templateId);
      }
      break;
    }
    case 'template-import': {
      const jsonText = document.getElementById('work-input-template-json').value.trim();
      if (!jsonText) { showToast('JSON을 입력하세요', 'error'); return; }

      try {
        const parsed = JSON.parse(jsonText);

        // 검증: 필수 필드
        if (!parsed.name || typeof parsed.name !== 'string') {
          showToast('name 필드가 필요합니다', 'error'); return;
        }
        if (!Array.isArray(parsed.stages) || parsed.stages.length === 0) {
          showToast('stages 배열이 필요합니다', 'error'); return;
        }

        // 검증: stages 구조
        for (let i = 0; i < parsed.stages.length; i++) {
          const stage = parsed.stages[i];
          if (!stage.subcategories || !Array.isArray(stage.subcategories)) {
            showToast(`stages[${i}]에 subcategories 배열이 필요합니다`, 'error'); return;
          }
          for (const sub of stage.subcategories) {
            if (!sub.name || !Array.isArray(sub.tasks)) {
              showToast('subcategories에 name과 tasks가 필요합니다', 'error'); return;
            }
            for (const task of sub.tasks) {
              if (!task.title) {
                showToast('tasks에 title이 필요합니다', 'error'); return;
              }
            }
          }
        }

        // 템플릿 생성
        const template = {
          id: generateId(),
          name: parsed.name,
          stageNames: parsed.stageNames || null,
          stages: parsed.stages.map(stage => ({
            subcategories: stage.subcategories.map(sub => ({
              name: sub.name,
              tasks: sub.tasks.map(t => ({ title: t.title }))
            }))
          })),
          participantGoal: parsed.participantGoal || null,
          createdAt: new Date().toISOString()
        };

        appState.workTemplates.push(template);
        if (!appState.user) {
          localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
        }
        if (appState.user) { syncToFirebase(); }
        showToast(`"${escapeHtml(template.name)}" 템플릿 가져오기 완료`, 'success');
        renderStatic();
      } catch (e) {
        showToast('JSON 파싱 오류: ' + e.message, 'error'); return;
      }
      break;
    }
  }

  closeWorkModal();
}
window.confirmWorkModal = confirmWorkModal;

/**
 * 템플릿 적용
 */
function applyTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  const projectName = prompt('프로젝트 이름을 입력하세요:', template.name.replace(' 템플릿', ''));
  if (!projectName) return;

  // 템플릿에 stageNames가 있으면 그것 사용, 없으면 전역 기본값 사용
  const stageSource = template.stageNames || appState.workProjectStages;
  const stageCount = Math.max(stageSource.length, template.stages.length);

  const newProject = {
    id: generateId(),
    name: projectName,
    currentStage: 0,
    stages: Array.from({ length: stageCount }, (_, idx) => ({
      name: stageSource[idx] || ('단계 ' + (idx + 1)),
      completed: false,
      startDate: null,
      endDate: null,
      subcategories: template.stages[idx]?.subcategories?.map(sub => ({
        id: generateId(),
        name: sub.name,
        startDate: null,
        endDate: null,
        tasks: sub.tasks.map(t => ({
          id: generateId(),
          title: t.title,
          status: 'not-started',
          logs: []
        }))
      })) || []
    })),
    participantGoal: template.participantGoal,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast(`"${projectName}" 생성됨`, 'success');
}

/**
 * 템플릿 JSON 내보내기 (클립보드 복사)
 */
function exportTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  // 내보내기용 JSON (id, createdAt 등 내부 필드 제외)
  const exportData = {
    name: template.name,
    stageNames: template.stageNames || null,
    stages: template.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => ({ title: t.title }))
      }))
    })),
    participantGoal: template.participantGoal || null
  };

  const json = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(`"${escapeHtml(template.name)}" 템플릿 JSON 복사됨`, 'success');
  }).catch(() => {
    // 클립보드 실패 시 프롬프트로 표시
    prompt('아래 JSON을 복사하세요:', json);
  });
}
window.exportTemplate = exportTemplate;

/**
 * 프로젝트 추가
 */
function addWorkProject(name, deadline = null) {
  // 기본 단계 (프로젝트별로 커스터마이징 가능)
  const defaultStages = appState.workProjectStages.map(stageName => ({
    name: stageName,
    completed: false,
    subcategories: [],
    startDate: null,
    endDate: null
  }));

  const newProject = {
    id: generateId(),
    name: name,
    currentStage: 0,
    deadline: deadline,
    stages: defaultStages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  appState.workView = 'detail'; // 새 프로젝트 생성 시 상세보기로
  saveWorkProjects();
  renderStatic();
  showToast(`프로젝트 "${name}" 생성됨`, 'success');
}

/**
 * 프로젝트 단계 추가
 */
function addProjectStage(projectId, stageName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !stageName.trim()) return;

  project.stages.push({
    name: stageName.trim(),
    completed: false,
    subcategories: [],
    startDate: null,
    endDate: null
  });
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${stageName}" 단계 추가됨`, 'success');
}
window.addProjectStage = addProjectStage;

/**
 * 프로젝트 단계 이름 수정
 */
function renameProjectStage(projectId, stageIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx] || !newName.trim()) return;

  project.stages[stageIdx].name = newName.trim();
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.renameProjectStage = renameProjectStage;

/**
 * 프로젝트 단계 삭제
 */
function deleteProjectStage(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const stageName = project.stages[stageIdx].name;
  if (!confirm(`"${escapeHtml(stageName)}" 단계를 삭제하시겠습니까?\n하위 중분류/작업도 모두 삭제됩니다.`)) return;

  project.stages.splice(stageIdx, 1);
  if (project.currentStage >= project.stages.length) {
    project.currentStage = Math.max(0, project.stages.length - 1);
  }
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${stageName}" 단계 삭제됨`, 'success');
}
window.deleteProjectStage = deleteProjectStage;

/**
 * 단계 이름 가져오기 (기존 프로젝트 호환)
 */
function getStageName(project, stageIdx) {
  const stage = project.stages[stageIdx];
  if (!stage) return '';
  // 새 구조: name 필드가 있음
  if (stage.name) return stage.name;
  // 기존 구조: 전역 배열에서 가져옴
  return appState.workProjectStages[stageIdx] || `단계 ${stageIdx + 1}`;
}
window.getStageName = getStageName;

/**
 * 새 단계 추가 프롬프트
 */
function promptAddStage(projectId) {
  const name = prompt('새 단계 이름을 입력하세요:');
  if (name && name.trim()) {
    addProjectStage(projectId, name.trim());
  }
}
window.promptAddStage = promptAddStage;

/**
 * 단계 이름 변경 프롬프트
 */
function promptRenameStage(projectId, stageIdx, currentName) {
  const newName = prompt('단계 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameProjectStage(projectId, stageIdx, newName.trim());
  }
}
window.promptRenameStage = promptRenameStage;

/**
 * 중분류 이름 변경 프롬프트
 */
function promptRenameSubcategory(projectId, stageIdx, subcatIdx, currentName) {
  const newName = prompt('중분류 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameSubcategory(projectId, stageIdx, subcatIdx, newName.trim());
  }
}
window.promptRenameSubcategory = promptRenameSubcategory;

/**
 * 중분류 이름 변경
 */
function renameSubcategory(projectId, stageIdx, subcatIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx]?.subcategories?.[subcatIdx];
  if (subcat) {
    subcat.name = newName;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast('중분류 이름이 변경되었습니다', 'success');
  }
}
window.renameSubcategory = renameSubcategory;

/**
 * 소분류(항목) 이름 변경 프롬프트
 */
function promptRenameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, currentName) {
  const newName = prompt('항목 이름을 변경하세요:', currentName);
  if (newName && newName.trim() && newName.trim() !== currentName) {
    renameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, newName.trim());
  }
}
window.promptRenameWorkTask = promptRenameWorkTask;

/**
 * 소분류(항목) 이름 변경
 */
function renameWorkTask(projectId, stageIdx, subcatIdx, taskIdx, newName) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (task) {
    task.title = newName;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast('항목 이름이 변경되었습니다', 'success');
  }
}
window.renameWorkTask = renameWorkTask;

/**
 * 소분류(항목) 마감일 설정
 * - prompt 대신 date input 사용 (모바일 날짜 선택기 활용)
 */
function promptTaskDeadline(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
  if (!task) return;

  // date input을 동적으로 생성하여 날짜 선택기 호출
  const input = document.createElement('input');
  input.type = 'date';
  input.value = task.deadline || '';
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.top = '50%';
  input.style.left = '50%';
  document.body.appendChild(input);

  input.addEventListener('change', function() {
    task.deadline = this.value || null;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    if (this.value) {
      const d = new Date(this.value);
      showToast('마감일 설정: ' + (d.getMonth() + 1) + '/' + d.getDate(), 'success');
    } else {
      showToast('마감일 삭제됨', 'success');
    }
    document.body.removeChild(input);
  });

  input.addEventListener('blur', function() {
    // 변경 없이 닫힌 경우 정리
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  });

  input.focus();
  input.showPicker?.();
}
window.promptTaskDeadline = promptTaskDeadline;

/**
 * 중분류 추가
 */
function addSubcategory(projectId, stageIdx, name) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  if (!project.stages[stageIdx].subcategories) {
    project.stages[stageIdx].subcategories = [];
  }

  project.stages[stageIdx].subcategories.push({
    id: generateId(),
    name: name,
    tasks: []
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(`"${name}" 추가됨`, 'success');
}

/**
 * 중분류 삭제
 */
function deleteSubcategory(projectId, stageIdx, subcatIdx) {
  if (!confirm('이 중분류와 하위 항목을 모두 삭제하시겠습니까?')) return;

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories.splice(subcatIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('삭제됨', 'success');
}
window.deleteSubcategory = deleteSubcategory;

/**
 * 프로젝트 단계 이동
 */
function moveWorkProjectStage(projectId, direction) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newStage = project.currentStage + direction;
  if (newStage >= 0 && newStage < project.stages.length) {
    project.currentStage = newStage;
    project.updatedAt = new Date().toISOString();
    saveWorkProjects();
    renderStatic();
    showToast(`${getStageName(project, newStage)} 단계로 이동`, 'success');
  }
}
window.moveWorkProjectStage = moveWorkProjectStage;

/**
 * 프로젝트 삭제
 */
function deleteWorkProject(projectId) {
  if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;

  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.workProjects[projectId] = new Date().toISOString();
  appState.workProjects = appState.workProjects.filter(p => p.id !== projectId);
  if (appState.activeWorkProject === projectId) {
    appState.activeWorkProject = appState.workProjects.length > 0 ? appState.workProjects[0].id : null;
  }
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 삭제됨', 'success');
}
window.deleteWorkProject = deleteWorkProject;

/**
 * 작업 항목 추가
 */
function addWorkTask(projectId, stageIdx, subcatIdx, title, status) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks.push({
    id: generateId(),
    title: title,
    status: status,
    logs: []
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('항목 추가됨', 'success');
}

/**
 * 작업 상태 순환
 */
function cycleWorkTaskStatus(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const statuses = ['not-started', 'in-progress', 'completed', 'blocked'];
  const currentIdx = statuses.indexOf(task.status);
  task.status = statuses[(currentIdx + 1) % statuses.length];

  // 완료로 변경 시 자동 로그
  if (task.status === 'completed') {
    const today = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
    task.logs.push({ date: today, content: '✓ 완료' });
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.cycleWorkTaskStatus = cycleWorkTaskStatus;

/**
 * 소분류 완료 체크박스 토글 (완료↔미시작)
 */
function toggleWorkTaskComplete(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const wasCompleted = task.status === 'completed';
  task.status = wasCompleted ? 'not-started' : 'completed';

  // 완료로 변경 시 자동 로그
  if (!wasCompleted) {
    const today = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
    task.logs.push({ date: today, content: '✓ 완료' });
  }

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(wasCompleted ? '미시작으로 변경' : '완료!', 'success');
}
window.toggleWorkTaskComplete = toggleWorkTaskComplete;

/**
 * 중분류 완료 체크박스 토글 (하위 전체 완료↔미시작)
 */
function toggleSubcategoryComplete(projectId, stageIdx, subcatIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx].subcategories[subcatIdx];
  if (!subcat || subcat.tasks.length === 0) {
    showToast('항목이 없습니다', 'warning');
    return;
  }

  // 모두 완료이면 → 전부 미시작, 아니면 → 전부 완료
  const allCompleted = subcat.tasks.every(t => t.status === 'completed');
  const today = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });

  subcat.tasks.forEach(task => {
    if (allCompleted) {
      task.status = 'not-started';
    } else {
      if (task.status !== 'completed') {
        task.status = 'completed';
        task.logs.push({ date: today, content: '✓ 완료' });
      }
    }
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(allCompleted ? '중분류 전체 미시작으로 변경' : '중분류 전체 완료!', 'success');
}
window.toggleSubcategoryComplete = toggleSubcategoryComplete;

/**
 * 작업 삭제
 */
function deleteWorkTask(projectId, stageIdx, subcatIdx, taskIdx) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks.splice(taskIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.deleteWorkTask = deleteWorkTask;

/**
 * 진행 로그 추가
 */
function addWorkLog(projectId, stageIdx, subcatIdx, taskIdx, content) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx];
  const today = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });

  task.logs.push({
    date: today,
    content: content
  });

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('기록 추가됨', 'success');
}

/**
 * 로그 삭제
 */
function deleteWorkLog(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  if (!confirm('이 기록을 삭제하시겠습니까?')) return;
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].subcategories[subcatIdx].tasks[taskIdx].logs.splice(logIdx, 1);
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.deleteWorkLog = deleteWorkLog;

/**
 * 노션/슬랙용 복사
 */
function copyWorkProjectToClipboard(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  let text = `📋 ${project.name}\n`;
  text += `현재 단계: ${getStageName(project, project.currentStage)}\n`;
  text += `─────────────────\n\n`;

  project.stages.forEach((stage, idx) => {
    const hasContent = stage.subcategories && stage.subcategories.some(s => s.tasks.length > 0);
    if (!hasContent) return;

    const stageName = getStageName(project, idx);
    const isCurrent = idx === project.currentStage;
    text += `${isCurrent ? '▶ ' : ''}${idx + 1}. ${stageName}\n`;

    stage.subcategories.forEach(subcat => {
      if (subcat.tasks.length === 0) return;
      text += `\n  📁 ${subcat.name}\n`;

      subcat.tasks.forEach(task => {
        const statusIcon = task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '→' : task.status === 'blocked' ? '⏸' : '○';
        text += `    ${statusIcon} ${task.title}\n`;
        task.logs.forEach(log => {
          text += `       └ ${log.date}: ${log.content}\n`;
        });
      });
    });
    text += '\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('클립보드에 복사됨!', 'success');
  }).catch(() => {
    // 클립보드 API 실패 시 textarea fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('클립보드에 복사됨!', 'success'); }
    catch(e) { showToast('복사 실패 — 브라우저 권한을 확인하세요', 'error'); }
    finally { document.body.removeChild(ta); }
  });
}
window.copyWorkProjectToClipboard = copyWorkProjectToClipboard;

/**
 * 프로젝트 저장
 */
function saveWorkProjects() {
  if (!appState.user) {
    localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
  }
  // Firebase 동기화 (로그인된 경우)
  if (appState.user) {
    syncToFirebase();
  }
}

/**
 * 프로젝트 불러오기
 */
function loadWorkProjects() {
  const saved = localStorage.getItem('navigator-work-projects');
  if (saved) {
    try {
      appState.workProjects = JSON.parse(saved);

      // 기존 프로젝트 마이그레이션: 단계에 name 필드 추가
      let needsSave = false;
      appState.workProjects.forEach(project => {
        if (project.stages) {
          project.stages.forEach((stage, idx) => {
            if (!stage.name) {
              // 기존 프로젝트: 전역 배열에서 이름 가져오기
              stage.name = appState.workProjectStages[idx] || `단계 ${idx + 1}`;
              needsSave = true;
            }
          });
        }
      });
      if (needsSave) {
        saveWorkProjects();
        console.log('프로젝트 단계 마이그레이션 완료');
      }

      // 첫 프로젝트 자동 선택
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        appState.activeWorkProject = appState.workProjects[0].id;
      }
    } catch (e) {
      console.error('프로젝트 로드 실패:', e);
      appState.workProjects = [];
    }
  }
}

