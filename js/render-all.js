// ============================================
// 렌더링 - 전체 목록 탭 + 히스토리 탭
// ============================================

/**
 * 전체 목록 탭 HTML을 반환한다.
 */
function renderAllTasksTab() {
  return `
        <div class="all-tasks-header">
          <h2>📋 전체 작업 목록</h2>
          <div class="all-tasks-summary">
            총 ${appState.tasks.length}개 · 진행 중 ${appState.tasks.filter(t => !t.completed).length}개 · 오늘 완료 ${getTodayCompletedTasks(appState.tasks).length}개
          </div>
        </div>

        ${['본업', '부업', '일상', '가족'].map(category => {
          const categoryTasks = appState.tasks.filter(t => t.category === category);
          const pendingTasks = categoryTasks.filter(t => !t.completed);
          // 모든 완료 태스크 표시 (오늘만 필터링하면 어제 완료 태스크가 사라짐)
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
                  ${pendingTasks.map(task => {
                    const urgency = getUrgencyLevel(task);
                    return `
                      <div class="all-task-item ${urgency === 'urgent' ? 'urgent' : ''} ${urgency === 'warning' ? 'warning' : ''}" style="--task-cat-color: var(--cat-${task.category})">
                        <div class="all-task-content">
                          <div class="all-task-title">${escapeHtml(task.title)}</div>
                          <div class="all-task-meta">
                            ${task.estimatedTime ? `⏱️ ${task.estimatedTime}분` : ''}
                            ${task.deadline ? ` · ${formatDeadline(task.deadline)}` : ''}
                            ${task.organizer ? ` · 👤 ${task.organizer}` : ''}
                            ${task.eventType ? ` · 🏷️ ${task.eventType}` : ''}
                          </div>
                        </div>
                        <div class="all-task-actions">
                          ${task.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(task.link)}')">GO</button>` : ''}
                          <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                          <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                          <button class="btn-small copy" onclick="copyTask('${escapeAttr(task.id)}')">📋</button>
                          <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
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
        }).join('')}

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
