// ============================================
// 렌더링 - 실행 탭 (오늘)
// ============================================

/**
 * 실행(오늘) 탭 HTML을 반환한다.
 * renderStatic()에서 계산된 변수들을 인자로 받는다.
 */
function renderActionTab(ctx) {
  var now = ctx.now;
  var hour = ctx.hour;
  var filteredTasks = ctx.filteredTasks;
  var nextAction = ctx.nextAction;
  var mode = ctx.mode;
  var urgentTasks = ctx.urgentTasks;
  var completedTasks = ctx.completedTasks;
  var urgencyClass = ctx.urgencyClass;
  var urgencyLabel = ctx.urgencyLabel;
  var minutesUntilBed = ctx.minutesUntilBed;
  var categoryFields = ctx.categoryFields;

  return `
        <!-- PC 3단 레이아웃 / 모바일 1단 -->
        <div class="pc-layout">
          <!-- 왼쪽 컬럼: 상태 + Next Action -->
          <div class="pc-column-left">
            <!-- 현재 시간 & 남은 시간 -->
            <div class="current-time-section">
              <div class="current-time-left">
                <div class="current-time-clock" id="current-clock">${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="current-time-mode">
                  <span class="current-time-mode-label">현재 모드</span>
                  <span class="current-time-mode-value ${mode}">${mode}</span>
                </div>
              </div>
              <div class="current-time-right">
                <div class="time-remaining-label">${getModeTimeLabel(mode, hour)}</div>
                <div class="time-remaining-value ${minutesUntilBed < 60 && hour >= 22 ? 'urgent' : ''}" id="mode-time-remaining">
                  ${getModeTimeRemaining(mode, hour, now)}
                </div>
              </div>
            </div>

            <!-- 🔥 완료 스트릭 -->
            ${(() => {
              const { streak, hasTodayCompletion } = calculateCompletionStreak();
              const badge = getStreakBadge(streak);
              if (streak === 0 && !hasTodayCompletion) return '';
              return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
                  <span style="font-size: 22px;">🔥</span>
                  <div style="flex: 1;">
                    <div style="font-size: 17px; font-weight: 600; color: var(--text-primary);">${streak}일 연속 완료${hasTodayCompletion ? '' : ' <span style="font-size: 14px; color: var(--text-muted);">(오늘 아직)</span>'}</div>
                    ${badge ? `<div style="font-size: 14px; color: var(--accent-warning); margin-top: 2px;">${badge}</div>` : ''}
                  </div>
                  <span style="font-size: 20px; font-weight: 700; color: ${streak >= 7 ? 'var(--accent-warning)' : 'var(--text-secondary)'};">${streak}</span>
                </div>
              `;
            })()}

            <!-- 📊 라이프 리듬 트래커 -->
            ${(() => {
              const today = getLocalDateStr();
              const rhythm = appState.lifeRhythm.today.date === today ? appState.lifeRhythm.today : { wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
              const yesterday = getLocalDateStr(new Date(Date.now() - 86400000));
              const yesterdayData = appState.lifeRhythm.history[yesterday] || {};

              const toMins = (t) => {
                if (!t || !t.includes(':')) return null;
                const [h, m] = t.split(':').map(Number);
                return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
              };
              const formatDur = (mins) => {
                if (!mins || mins <= 0) return null;
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return h + 'h ' + m + 'm';
              };

              let sleepDuration = null;
              if (yesterdayData.sleep && rhythm.wakeUp) {
                const sleepTime = toMins(yesterdayData.sleep);
                const wakeTime = toMins(rhythm.wakeUp);
                let duration = wakeTime - sleepTime;
                if (duration < 0) duration += 24 * 60;
                sleepDuration = formatDur(duration);
              }

              let commuteToWork = null;
              if (rhythm.homeDepart && rhythm.workArrive) {
                const dur = toMins(rhythm.workArrive) - toMins(rhythm.homeDepart);
                commuteToWork = formatDur(dur);
              }

              let commuteToHome = null;
              if (rhythm.workDepart && rhythm.homeArrive) {
                const dur = toMins(rhythm.homeArrive) - toMins(rhythm.workDepart);
                commuteToHome = formatDur(dur);
              }

              let workDuration = null;
              if (rhythm.workArrive && rhythm.workDepart) {
                const dur = toMins(rhythm.workDepart) - toMins(rhythm.workArrive);
                workDuration = formatDur(dur);
              }

              let totalOutTime = null;
              if (rhythm.homeDepart && rhythm.homeArrive) {
                const dur = toMins(rhythm.homeArrive) - toMins(rhythm.homeDepart);
                totalOutTime = formatDur(dur);
              }

              return `
                <div class="life-rhythm-tracker">
                  <div class="life-rhythm-header">
                    <span class="life-rhythm-title">📊 오늘의 리듬</span>
                    ${sleepDuration ? '<span class="life-rhythm-sleep">💤 수면 ' + sleepDuration + '</span>' : ''}
                  </div>
                  <div class="life-rhythm-buttons six-items">
                    <button class="life-rhythm-btn ${rhythm.wakeUp ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('wakeUp', ${rhythm.wakeUp ? 'true' : 'false'}, event)"
                            title="${rhythm.wakeUp ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">☀️</span>
                      <span class="life-rhythm-label">기상</span>
                      <span class="life-rhythm-time">${rhythm.wakeUp || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.homeDepart ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('homeDepart', ${rhythm.homeDepart ? 'true' : 'false'}, event)"
                            title="${rhythm.homeDepart ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🚶</span>
                      <span class="life-rhythm-label">집출발</span>
                      <span class="life-rhythm-time">${rhythm.homeDepart || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.workArrive ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('workArrive', ${rhythm.workArrive ? 'true' : 'false'}, event)"
                            title="${rhythm.workArrive ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🏢</span>
                      <span class="life-rhythm-label">근무시작</span>
                      <span class="life-rhythm-time">${rhythm.workArrive || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.workDepart ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('workDepart', ${rhythm.workDepart ? 'true' : 'false'}, event)"
                            title="${rhythm.workDepart ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🚀</span>
                      <span class="life-rhythm-label">근무종료</span>
                      <span class="life-rhythm-time">${rhythm.workDepart || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.homeArrive ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('homeArrive', ${rhythm.homeArrive ? 'true' : 'false'}, event)"
                            title="${rhythm.homeArrive ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🏠</span>
                      <span class="life-rhythm-label">집도착</span>
                      <span class="life-rhythm-time">${rhythm.homeArrive || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.sleep ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('sleep', ${rhythm.sleep ? 'true' : 'false'}, event)"
                            title="${rhythm.sleep ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🌙</span>
                      <span class="life-rhythm-label">취침</span>
                      <span class="life-rhythm-time">${rhythm.sleep || '--:--'}</span>
                    </button>
                  </div>
                  <div class="life-rhythm-stats">
                    ${commuteToWork ? '<span class="rhythm-stat">🚌 출근 ' + commuteToWork + '</span>' : ''}
                    ${workDuration ? '<span class="rhythm-stat">💼 근무 ' + workDuration + '</span>' : ''}
                    ${commuteToHome ? '<span class="rhythm-stat">🏠 퇴근 ' + commuteToHome + '</span>' : ''}
                    ${totalOutTime ? '<span class="rhythm-stat total">📍 총 외출 ' + totalOutTime + '</span>' : ''}
                  </div>
                </div>
              `;
            })()}

            <!-- 💊 복약 트래커 -->
            ${(() => {
              const medSlots = getMedicationSlots();
              if (!medSlots || medSlots.length === 0) return '';

              const todayStr = getLocalDateStr();
              const todayRhythm = appState.lifeRhythm.today.date === todayStr ? appState.lifeRhythm.today : {};
              const todayMeds = (todayRhythm.medications) || {};
              const takenCount = medSlots.filter(s => todayMeds[s.id]).length;
              const totalCount = medSlots.length;
              const streak = getMedicationStreak();
              const requiredSlots = medSlots.filter(s => s.required);
              const allRequiredTaken = requiredSlots.every(s => todayMeds[s.id]);

              return `
                <div class="medication-tracker">
                  <div class="medication-header">
                    <span class="medication-title">💊 오늘의 복약</span>
                    <span class="medication-progress">${takenCount}/${totalCount} 완료</span>
                  </div>
                  <div class="medication-slots">
                    ${medSlots.map(slot => {
                      const taken = !!todayMeds[slot.id];
                      const timeVal = todayMeds[slot.id] || '--:--';
                      return `
                        <button class="medication-btn ${taken ? 'taken' : ''} ${slot.required ? 'required' : ''}"
                                onclick="handleMedicationClick('${escapeAttr(slot.id)}', ${taken}, event)"
                                title="${taken ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                          <span class="med-icon">${slot.icon}</span>
                          <span class="med-label">${escapeHtml(slot.label)}</span>
                          <span class="med-time">${timeVal}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>
                  ${streak > 0 ? '<div class="medication-streak">❤️ 필수 복약 연속 <span class="streak-good">' + streak + '일째</span></div>' : ''}
                  ${!allRequiredTaken && requiredSlots.length > 0 ? '<div class="medication-streak">⚠️ 필수 복약을 잊지 마세요!</div>' : ''}
                </div>
              `;
            })()}

            <!-- 🎯 일일 목표 진행률 -->
            ${(() => {
              const dailyGoal = appState.settings.dailyGoal || 5;
              const completed = appState.todayStats.completedToday;
              const percentage = Math.min((completed / dailyGoal) * 100, 100);
              const isComplete = completed >= dailyGoal;
              const remaining = dailyGoal - completed;

              let message = '';
              let messageClass = '';
              if (isComplete) {
                message = '목표 달성! 오늘 정말 잘했어요! 🏆';
                messageClass = 'positive';
              } else if (percentage >= 80) {
                message = '거의 다 왔어요! 조금만 더! 💪';
                messageClass = 'encourage';
              } else if (percentage >= 50) {
                message = '반 이상 완료! 잘하고 있어요! ⭐';
                messageClass = 'encourage';
              } else if (percentage >= 20) {
                message = '좋은 시작이에요! 계속 가보자! 🚀';
                messageClass = '';
              } else if (completed > 0) {
                message = '첫 발을 뗐어요! 그게 제일 어려운 거예요! 👏';
                messageClass = '';
              } else {
                message = '오늘 하나 해볼까요? 시작이 반이에요! ✨';
                messageClass = '';
              }

              const runner = isComplete ? '🏅' : (percentage >= 50 ? '🏃' : '🚶');

              return `
                <div class="daily-goal-compact">
                  <div class="daily-goal-header">
                    <div class="daily-goal-info">
                      <span class="daily-goal-emoji">${isComplete ? '🎉' : '🎯'}</span>
                      <span class="daily-goal-text">오늘 <strong>${completed}</strong>/${dailyGoal}개</span>
                    </div>
                    <span class="daily-goal-percentage ${isComplete ? 'complete' : ''}">${Math.round(percentage)}%</span>
                  </div>
                  <div class="daily-goal-track">
                    <div class="daily-goal-bar" style="width: 100%">
                      <div class="daily-goal-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percentage}%">
                        <span class="daily-goal-runner">${runner}</span>
                      </div>
                    </div>
                    <span class="daily-goal-finish">🏁</span>
                  </div>
                  <div class="daily-goal-message ${messageClass}">${message}</div>
                </div>
              `;
            })()}

            <!-- 💬 오늘의 명언 -->
            ${(() => {
              const quote = getDailyQuote();
              return `
                <div class="daily-quote">
                  <div class="daily-quote-text">"${quote.text}"</div>
                  <div class="daily-quote-author">— ${quote.author}</div>
                </div>
              `;
            })()}

          </div>

          <!-- 중간 컬럼: 할 일 -->
          <div class="pc-column-center">
            <!-- 🚨 마감 임박 -->
            ${urgentTasks.length > 0 ? `
              <div class="dashboard-section">
                <div class="dashboard-title">🚨 마감 임박</div>
                <div class="urgent-list">
                  ${urgentTasks.slice(0, 3).map(task => `
                    <div class="urgent-item">
                      <div class="urgent-item-title">${escapeHtml(task.title)}</div>
                      <div class="urgent-item-time">⏰ ${formatDeadline(task.deadline)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 빠른 추가 -->
            <div class="quick-add-simple">
              <input
                type="text"
                id="quick-add-input"
                class="quick-add-input"
                placeholder="+ 새 작업 (#부업 #본업 #일상)"
                value="${escapeHtml(appState.quickAddValue)}"
                onkeypress="if(event.key==='Enter') quickAdd()"
              >
              <button class="quick-add-btn" onclick="quickAdd()" aria-label="빠른 작업 추가">+</button>
            </div>

            <!-- 빠른 추가 버튼 (상세만 유지) -->
            <div class="quick-templates">
              <button class="quick-template-btn secondary" onclick="toggleDetailedAdd()" title="카테고리, 마감일, 예상수익 등 상세 정보 입력" aria-label="상세 작업 추가">
                📝 상세 추가
              </button>
            </div>

            <!-- 퀵 필터 섹션 -->
            <div class="quick-filter-section">
              <div class="quick-filter-header">
                <span class="quick-filter-title">⏱️ 소요시간·마감 필터</span>
              </div>
              <div class="quick-filters">
                <button class="quick-filter-btn ${appState.quickFilter === '2min' ? 'active' : ''}" onclick="setQuickFilter('2min')" title="예상 소요시간 2분 이내인 작업만 표시">
                  ⚡ 2분 이내
                  <span class="filter-count">${getQuickFilterCount('2min')}</span>
                </button>
                <button class="quick-filter-btn ${appState.quickFilter === '5min' ? 'active' : ''}" onclick="setQuickFilter('5min')" title="예상 소요시간 5분 이내인 작업만 표시">
                  🚀 5분 이내
                  <span class="filter-count">${getQuickFilterCount('5min')}</span>
                </button>
                <button class="quick-filter-btn ${appState.quickFilter === 'urgent' ? 'active' : ''}" onclick="setQuickFilter('urgent')" title="마감이 24시간 내로 다가온 긴급 작업">
                  🔥 마감 임박
                  <span class="filter-count">${getQuickFilterCount('urgent')}</span>
                </button>
              </div>
            </div>

            <!-- 다른 작업 목록 (접기/펼치기) -->
            <div class="other-tasks-section">
              <div class="other-tasks-header" onclick="toggleTaskList()">
                <span>📋 다른 작업 ${filteredTasks.filter(t => !t.completed).length - (nextAction ? 1 : 0)}개</span>
                <span class="other-tasks-toggle">${appState.showTaskList ? '▲' : '▼'}</span>
              </div>

              ${appState.showTaskList ? `
                <!-- 검색 (펼쳐졌을 때만) -->
                <div class="search-simple">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="🔍 검색..."
                    value="${appState.searchQuery}"
                    oninput="setSearchQuery(this.value)"
                  >
                  ${appState.searchQuery ? `<button class="search-clear" onclick="clearSearch()">×</button>` : ''}
                </div>

                <!-- 작업 목록 (펼쳐졌을 때만) -->
                <div class="task-list-inner">
                  ${filteredTasks
                    .filter(t => !t.completed && t.id !== (nextAction ? nextAction.id : null))
                    .slice(0, 10)
                    .map(task => `
                      <div class="task-item-mini" onclick="editTask('${escapeAttr(task.id)}')" style="--task-cat-color: var(--cat-${task.category})">
                        <div class="task-item-mini-left">
                          <button class="task-check-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                          <span class="task-item-mini-title">${escapeHtml(task.title)}</span>
                        </div>
                        <span class="task-item-mini-category ${task.category}">${task.category}</span>
                      </div>
                    `).join('')}
                  ${filteredTasks.filter(t => !t.completed && t.id !== (nextAction ? nextAction.id : null)).length > 10 ? `
                    <div class="task-list-more">+ ${filteredTasks.filter(t => !t.completed).length - 10}개 더...</div>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            ${appState.showDetailedAdd ? `
              <div class="add-task-section">
                <h3>${appState.editingTaskId ? svgIcon('edit', 16) + ' 작업 수정' : svgIcon('plus', 16) + ' 상세 추가'}</h3>
                <div class="form-group">
                  <label class="form-label">카테고리</label>
                  <select class="form-select" id="detailed-category" onchange="updateDetailedTaskCategory(this.value)">
                    <option value="본업" ${appState.detailedTask.category === '본업' ? 'selected' : ''}>본업</option>
                    <option value="부업" ${appState.detailedTask.category === '부업' ? 'selected' : ''}>부업</option>
                    <option value="일상" ${appState.detailedTask.category === '일상' ? 'selected' : ''}>일상</option>
                    <option value="가족" ${appState.detailedTask.category === '가족' ? 'selected' : ''}>가족</option>
                  </select>
                </div>

                ${appState.detailedTask.category === '본업' && appState.workProjects.filter(p => !p.archived).length > 0 ? `
                  <div class="work-project-link-section" style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div class="form-group" style="margin-bottom: 8px;">
                      <label class="form-label">📁 프로젝트 연결 (선택)</label>
                      <select class="form-select" id="detailed-work-project" onchange="updateWorkProjectLink(this.value)">
                        <option value="">연결 안함 (일반 할일)</option>
                        ${appState.workProjects.filter(p => !p.archived).map(p => `
                          <option value="${p.id}" ${appState.detailedTask.workProjectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>
                        `).join('')}
                      </select>
                    </div>
                    ${appState.detailedTask.workProjectId ? `
                      <div class="form-group" style="margin-bottom: 8px;">
                        <label class="form-label">📋 단계</label>
                        <select class="form-select" id="detailed-work-stage" onchange="updateWorkStageLink(this.value)">
                          ${appState.workProjectStages.map((stage, idx) => `
                            <option value="${idx}" ${appState.detailedTask.workStageIdx === idx ? 'selected' : ''}>${idx + 1}. ${stage}</option>
                          `).join('')}
                        </select>
                      </div>
                      ${(() => {
                        const proj = appState.workProjects.find(p => p.id === appState.detailedTask.workProjectId);
                        const stageIdx = appState.detailedTask.workStageIdx || 0;
                        const subcats = proj?.stages[stageIdx]?.subcategories || [];
                        if (subcats.length > 0) {
                          return `
                            <div class="form-group" style="margin-bottom: 0;">
                              <label class="form-label">📂 중분류</label>
                              <select class="form-select" id="detailed-work-subcat" onchange="updateWorkSubcatLink(this.value)">
                                ${subcats.map((sub, idx) => `
                                  <option value="${idx}" ${appState.detailedTask.workSubcatIdx === idx ? 'selected' : ''}>${escapeHtml(sub.name)}</option>
                                `).join('')}
                              </select>
                            </div>
                          `;
                        } else {
                          return '<div style="color: var(--text-muted); font-size: 14px;">이 단계에 중분류가 없습니다. 본업 탭에서 먼저 추가하세요.</div>';
                        }
                      })()}
                    ` : ''}
                  </div>
                ` : ''}

                <div class="form-group">
                  <label class="form-label">제목</label>
                  <input type="text" class="form-input" id="detailed-title" placeholder="작업 제목" value="${escapeHtml(appState.detailedTask.title)}">
                </div>
                <div class="form-group">
                  <label class="form-label">설명 (선택)</label>
                  <textarea class="form-input form-textarea" id="detailed-description" placeholder="작업 내용, 요구사항, 메모 등" rows="2">${escapeHtml(appState.detailedTask.description || '')}</textarea>
                </div>
                ${categoryFields[appState.detailedTask.category]}

                <!-- 태그 입력 -->
                <div class="form-group">
                  <label class="form-label">태그</label>
                  <div class="tags-input-container">
                    <div class="selected-tags">
                      ${(appState.detailedTask.tags || []).map(tag => `
                        <span class="tag selected" onclick="removeTagFromTask('${escapeAttr(tag)}')">${escapeHtml(tag)} ×</span>
                      `).join('')}
                    </div>
                    <div class="available-tags">
                      ${appState.availableTags.filter(tag => !(appState.detailedTask.tags || []).includes(tag)).map(tag => `
                        <span class="tag" onclick="addTagToTask('${escapeAttr(tag)}')">${escapeHtml(tag)}</span>
                      `).join('')}
                    </div>
                    <div class="new-tag-input">
                      <input type="text" class="form-input tag-input" id="new-tag-input" placeholder="새 태그 입력 후 Enter">
                    </div>
                  </div>
                </div>

                <!-- 서브태스크 입력 -->
                <div class="form-group">
                  <label class="form-label">서브태스크 (단계별 할일)</label>
                  <div class="subtasks-container">
                    ${(appState.detailedTask.subtasks || []).map((subtask, index) => `
                      <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
                        <span class="subtask-list-check" onclick="toggleDetailedSubtask(${index})" style="cursor:pointer">${subtask.completed ? '✓' : index + 1}</span>
                        <span class="subtask-text ${subtask.completed ? 'completed' : ''}" style="${subtask.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(subtask.text)}</span>
                        <button class="subtask-remove" onclick="removeSubtask(${index})">×</button>
                      </div>
                    `).join('')}
                    <div class="subtask-add">
                      <input type="text" class="form-input subtask-input" id="new-subtask-input" placeholder="서브태스크 추가 후 Enter">
                    </div>
                    ${(() => {
                      const subtasks = appState.detailedTask.subtasks || [];
                      const completedCount = subtasks.filter(s => s.completed).length;
                      const totalCount = subtasks.length;
                      if (totalCount > 0 && completedCount === totalCount && appState.editingTaskId) {
                        return `
                          <button class="complete-all-subtasks-btn" onclick="completeTask('${appState.editingTaskId}'); cancelEdit();">
                            🎉 모든 서브태스크 완료! 작업 완료하기
                          </button>
                        `;
                      }
                      return '';
                    })()}
                  </div>
                </div>

                ${appState.editingTaskId ? `
                  <button class="btn btn-primary" onclick="detailedAdd()">✓ 수정 완료</button>
                  <button class="btn btn-secondary" onclick="cancelEdit()">✕ 취소</button>
                ` : `
                  <button class="btn btn-primary" onclick="detailedAdd()">추가하기</button>
                `}
              </div>
            ` : ''}

            ${filteredTasks.length > 0 && !appState.focusMode ? `
              <!-- 스와이프 힌트 -->
              ${!localStorage.getItem('navigator-hide-swipe-hint') ? `
                <div class="swipe-hint">
                  <span class="swipe-hint-icon">👆</span>
                  <span class="swipe-hint-text">
                    작업을 <strong>왼쪽으로 밀면 완료</strong>, <strong>오른쪽으로 밀면 삭제</strong>
                  </span>
                  <button class="swipe-hint-close" onclick="dismissSwipeHint()">✕</button>
                </div>
              ` : ''}
              <div class="task-list-section task-list-full">
                <div class="task-list-header" onclick="toggleTaskList()">
                  <div class="task-list-title">📋 전체 목록</div>
                  <div class="task-list-count">${filteredTasks.length}개 ${appState.showTaskList ? '▼' : '▶'}</div>
                </div>
                <div class="task-list ${appState.showTaskList ? 'show' : ''}">
                  ${filteredTasks.map((task, index) => `
                    <div
                      id="task-${task.id}"
                      class="task-item ${task.urgency === 'urgent' ? 'urgent' : ''} ${task.urgency === 'warning' ? 'warning' : ''}"
                      style="--task-cat-color: var(--cat-${task.category})"
                      draggable="true"
                      ondragstart="handleDragStart(event, '${escapeAttr(task.id)}')"
                      ondragend="handleDragEnd(event)"
                      ondragover="handleDragOver(event, '${escapeAttr(task.id)}')"
                      ondrop="handleDrop(event, '${escapeAttr(task.id)}')"
                      ontouchstart="handleTouchStart(event, '${escapeAttr(task.id)}')"
                      ontouchmove="handleTouchMove(event, '${escapeAttr(task.id)}')"
                      ontouchend="handleTouchEnd(event, '${escapeAttr(task.id)}')"
                    >
                      <div class="swipe-actions left">✓ 완료</div>
                      <div class="swipe-actions right">× 삭제</div>

                      <div class="task-item-header">
                        <div class="task-item-title">
                          ${index + 1}. ${escapeHtml(task.title)}
                          <span class="task-item-inline-cat ${task.category}">${task.category}</span>
                          ${task.subtasks && task.subtasks.length > 0 ? `
                            <span class="subtask-badge" onclick="event.stopPropagation(); toggleSubtaskExpand('${escapeAttr(task.id)}')">
                              📋${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}
                            </span>
                          ` : ''}
                        </div>
                      </div>
                      <div class="task-item-meta">
                        <span class="category ${task.category}">${task.category}</span>
                        ${task.repeatType && task.repeatType !== 'none' ? ` · 🔄 ${getRepeatLabel(task.repeatType, task)}` : ''}
                        ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                        ${task.deadline ? ` · ${formatDeadline(task.deadline)}` : ''}
                        ${task.postponeCount && task.postponeCount > 0 ? `
                          <span class="postpone-badge ${task.postponeCount >= 3 ? 'warning' : ''}">
                            ⏰ ${task.postponeCount}번 미룸
                          </span>
                        ` : ''}
                      </div>
                      ${task.tags && task.tags.length > 0 ? `
                        <div class="task-tags">
                          ${task.tags.map(tag => `<span class="task-tag">#${escapeHtml(tag)}</span>`).join('')}
                        </div>
                      ` : ''}
                      ${task.subtasks && task.subtasks.length > 0 ? `
                        ${(() => {
                          const completedCount = task.subtasks.filter(s => s.completed).length;
                          const totalCount = task.subtasks.length;
                          const percentage = Math.round((completedCount / totalCount) * 100);
                          const isExpanded = appState.expandedSubtasks && appState.expandedSubtasks[task.id];
                          const nextSubtask = task.subtasks.find(s => !s.completed);
                          const previewText = nextSubtask ? nextSubtask.text : '모두 완료!';
                          return `
                            <div class="subtask-progress-bar" onclick="event.stopPropagation(); toggleSubtaskExpand('${escapeAttr(task.id)}')">
                              <div class="subtask-progress-bar-fill-container">
                                <div class="subtask-progress-bar-fill ${percentage === 100 ? 'complete' : ''}" style="width: ${percentage}%"></div>
                              </div>
                              <span class="subtask-progress-bar-text">${completedCount}/${totalCount} 완료</span>
                              <span class="subtask-progress-toggle ${isExpanded ? 'expanded' : ''}">▼</span>
                            </div>
                            ${!isExpanded ? `
                              <div class="subtask-preview" onclick="event.stopPropagation(); toggleSubtaskExpand('${escapeAttr(task.id)}')">
                                ${nextSubtask ? '▸ 다음: ' : '🎉 '}${escapeHtml(previewText.length > 30 ? previewText.substring(0, 30) + '...' : previewText)}
                              </div>
                            ` : ''}
                            ${isExpanded ? `
                              <div class="subtask-list-expanded">
                                ${task.subtasks.map((subtask, idx) => `
                                  <div class="subtask-list-item ${subtask.completed ? 'completed' : ''}" onclick="event.stopPropagation(); toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
                                    <span class="subtask-list-check">${subtask.completed ? '✓' : ''}</span>
                                    <span class="subtask-list-text">${escapeHtml(subtask.text)}</span>
                                  </div>
                                `).join('')}
                                ${completedCount === totalCount && totalCount > 0 ? `
                                  <button class="complete-all-subtasks-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')">
                                    🎉 작업 완료하기
                                  </button>
                                ` : ''}
                              </div>
                            ` : ''}
                          `;
                        })()}
                      ` : ''}
                      <div class="task-item-actions">
                        ${task.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(task.link)}')">GO</button>` : ''}
                        <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                        <button class="btn-small" onclick="startPomodoro('${escapeAttr(task.id)}')" title="이 작업에 포모도로 집중" aria-label="포모도로 시작" style="background: rgba(245, 87, 108, 0.1); color: #f5576c;">🍅</button>
                        <button class="btn-small" onclick="postponeTask('${escapeAttr(task.id)}')" title="내일로 미루기" aria-label="내일로 미루기" style="background: rgba(255, 149, 0, 0.1); color: #ff9500;">⏰</button>
                        <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                        <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${appState.showCompletedTasks && completedTasks.length > 0 ? `
              <div class="task-list-section">
                <div class="task-list-header" onclick="toggleCompletedTasks()">
                  <div class="task-list-title">✓ 완료한 작업</div>
                  <div class="task-list-count">${completedTasks.length}개 ${appState.showCompletedTasks ? '▼' : '▶'}</div>
                </div>
                <div class="task-list show">
                  ${completedTasks.map((task, index) => `
                    <div id="task-completed-${task.id}" class="task-item completed" style="--task-cat-color: var(--cat-${task.category})">
                      <div class="task-item-header">
                        <div class="task-item-title completed">${index + 1}. ${escapeHtml(task.title)}</div>
                      </div>
                      <div class="task-item-meta">
                        <span class="category ${task.category}">${task.category}</span>
                        ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                      </div>
                      <div class="task-item-actions">
                        <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩️ 되돌리기</button>
                        <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')">× 삭제</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${appState.tasks.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div>작업이 없습니다</div>
                <div style="font-size: 16px; margin-top: 10px">새 작업을 추가해보세요</div>
              </div>
            ` : ''}
          </div>

          <!-- 오른쪽 컬럼: 지금 집중 -->
          <div class="pc-column-right">
            <!-- ▶ 지금 할 것 -->
            ${nextAction ? `
              <div class="next-action ${urgencyClass}">
                <div class="next-action-label">${urgencyLabel[urgencyClass]}</div>
                <div class="task-title">${escapeHtml(nextAction.title)}</div>
                <div class="task-meta">
                  <span class="category ${nextAction.category}">${nextAction.category}</span>
                  ${nextAction.repeatType && nextAction.repeatType !== 'none' ? `<span class="meta-item">🔄 ${getRepeatLabel(nextAction.repeatType)}</span>` : ''}
                  ${nextAction.estimatedTime ? `<span class="meta-item">⏱ ${nextAction.estimatedTime}분</span>` : ''}
                  ${nextAction.deadline ? `<span class="meta-item">⏰ ${formatDeadline(nextAction.deadline)}</span>` : ''}
                  ${nextAction.expectedRevenue ? `<span class="meta-item">💰 ${parseInt(nextAction.expectedRevenue).toLocaleString()}원</span>` : ''}
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 15px;">
                  <button class="btn btn-primary" onclick="handleGo('${escapeAttr(nextAction.link || '')}')">
                    ${nextAction.link ? '🚀 GO' : '시작하기'}
                  </button>
                  <button class="quick-timer-btn ${appState.quickTimer.isRunning ? 'running' : ''}" onclick="startQuickTimer('${nextAction.id}')" aria-label="${appState.quickTimer.isRunning ? '타이머 정지' : '5분 집중 타이머 시작'}">
                    ⏱ <span id="quick-timer-display" class="quick-timer-display">${appState.quickTimer.isRunning ?
                      Math.floor(appState.quickTimer.timeLeft / 60) + ':' + String(appState.quickTimer.timeLeft % 60).padStart(2, '0') :
                      '5분 집중'}</span>
                  </button>
                  <button class="btn btn-success" onclick="completeTask('${nextAction.id}')">
                    ✓ 완료
                  </button>
                </div>
              </div>
            ` : `
              ${(() => {
                const rest = getRestActivity();
                const completedToday = appState.todayStats.completedToday;
                const streak = appState.streak.current;
                const messages = [
                  '오늘의 할 일을 모두 끝냈어요!',
                  '깔끔하게 정리됐어요!',
                  '완벽한 하루!',
                  '오늘도 해냈어요!'
                ];
                const msg = messages[Math.floor(Math.random() * messages.length)];
                return `
                  <div class="empty-state-enhanced todoist-zero" id="todoist-zero">
                    <div class="empty-state-icon-large">🏆</div>
                    <div class="empty-state-title">#NavigatorZero</div>
                    <div class="empty-state-subtitle">
                      ${msg}<br>
                      오늘 <strong>${completedToday}개</strong> 완료
                      ${streak > 1 ? ` · 🔥 ${streak}일 연속` : ''}
                    </div>
                    ${completedToday >= 3 ? `
                      <div class="zero-stats">
                        <div class="zero-stat">
                          <span class="zero-stat-value">${completedToday}</span>
                          <span class="zero-stat-label">완료</span>
                        </div>
                        <div class="zero-stat">
                          <span class="zero-stat-value">🔥 ${streak}</span>
                          <span class="zero-stat-label">스트릭</span>
                        </div>
                      </div>
                    ` : ''}
                    <div class="empty-state-actions">
                      <button class="empty-state-btn" onclick="showToast('${rest.icon} ${rest.text}: ${rest.desc}', 'success')">
                        ${rest.icon} ${rest.text}
                      </button>
                    </div>
                  </div>
                  <script>
                    (function() {
                      if (${completedToday} >= 1) {
                        setTimeout(function() { if (typeof showConfetti === 'function') showConfetti(); }, 300);
                      }
                    })();
                  </script>
                `;
              })()}
            `}

            <!-- 🍅 포모도로 타이머 (진행 중일 때만 표시) -->
            ${(() => {
              const pomo = appState.pomodoro;
              const currentTask = pomo.currentTaskId ? appState.tasks.find(t => t.id === pomo.currentTaskId) : null;
              if (!pomo.isRunning && !pomo.isBreak && pomo.completedPomodoros === 0) {
                return ''; // 비활성 상태에서는 숨김
              }
              return `
                <div class="pomodoro-section ${pomo.isRunning ? 'active' : ''} ${pomo.isBreak ? 'break' : ''}" style="margin-bottom: 12px;">
                  <div class="pomodoro-title">${pomo.isBreak ? '☕ 휴식 중' : '🍅 포모도로'}</div>
                  <div class="pomodoro-time" id="pomodoro-time">${formatPomodoroTime(pomo.timeLeft)}</div>
                  ${currentTask ? `<div class="pomodoro-task" style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; text-align: center;">🎯 ${escapeHtml(currentTask.title)}${currentTask.actualTime ? ` (누적 ${currentTask.actualTime}분)` : ''}</div>` : ''}
                  <div class="pomodoro-controls">
                    ${pomo.isRunning ? `
                      <button class="pomodoro-btn pause" onclick="pausePomodoro()" aria-label="일시정지">⏸ 일시정지</button>
                    ` : `
                      <button class="pomodoro-btn start" onclick="resumePomodoro()" aria-label="재개">▶ 재개</button>
                    `}
                    <button class="pomodoro-btn stop" onclick="stopPomodoro()" aria-label="중지">⏹ 중지</button>
                    ${pomo.isBreak ? `<button class="pomodoro-btn skip" onclick="skipBreak()" aria-label="휴식 건너뛰기">⏭ 건너뛰기</button>` : ''}
                  </div>
                  <div class="pomodoro-stats">
                    <div class="pomodoro-stat">
                      <div class="pomodoro-stat-value">${pomo.completedPomodoros}</div>
                      <div>완료</div>
                    </div>
                  </div>
                </div>
              `;
            })()}

            <!-- 🎯 포커스 모드 -->
            ${appState.focusMode && filteredTasks.length > 0 ? `
              <div class="focus-mode-container">
                <div class="focus-mode-header">
                  <span>🎯 포커스 모드</span>
                  <span class="focus-mode-hint">가장 중요한 작업에 집중하세요</span>
                </div>
                <div class="focus-task">
                  <div class="focus-task-title">${escapeHtml(filteredTasks[0].title)}</div>
                  <div class="focus-task-meta">
                    <span class="category ${filteredTasks[0].category}">${filteredTasks[0].category}</span>
                    ${filteredTasks[0].estimatedTime ? ` · ${filteredTasks[0].estimatedTime}분` : ''}
                    ${filteredTasks[0].deadline ? ` · ${formatDeadline(filteredTasks[0].deadline)}` : ''}
                  </div>
                  ${filteredTasks[0].subtasks && filteredTasks[0].subtasks.length > 0 ? `
                    <div class="focus-subtasks">
                      ${filteredTasks[0].subtasks.map((st, idx) => `
                        <div class="focus-subtask ${st.completed ? 'completed' : ''}" onclick="toggleSubtaskComplete('${filteredTasks[0].id}', ${idx})">
                          <span class="focus-subtask-check">${st.completed ? '✓' : '○'}</span>
                          <span>${escapeHtml(st.text)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  <div class="focus-actions">
                    <button class="btn btn-primary btn-large" onclick="completeTask('${filteredTasks[0].id}')">
                      ✓ 완료!
                    </button>
                    ${filteredTasks[0].link ? `
                      <button class="btn btn-secondary" onclick="handleGo('${escapeAttr(filteredTasks[0].link)}')">
                        🔗 열기
                      </button>
                    ` : ''}
                  </div>
                </div>
                <div class="focus-remaining">
                  나머지 ${filteredTasks.length - 1}개 작업 대기 중
                </div>
              </div>
            ` : ''}

            <!-- 📅 월요일 리마인더 -->
            ${(() => {
              if (!checkMondayReminder()) return '';
              const focusTasks = appState.weeklyPlan.focusTasks
                .map(id => appState.tasks.find(t => t.id === id))
                .filter(t => t && !t.completed);
              if (focusTasks.length === 0) return '';
              return `
                <div class="monday-reminder">
                  <div class="monday-reminder-header">
                    <div class="monday-reminder-title">🎯 이번 주 집중할 작업</div>
                    <button class="monday-reminder-close" onclick="dismissMondayReminder()">×</button>
                  </div>
                  <div class="monday-reminder-tasks">
                    ${focusTasks.map((task, idx) => `
                      <div class="monday-reminder-task" onclick="editTask('${escapeAttr(task.id)}')">
                        <span class="monday-reminder-task-num">${idx + 1}</span>
                        <span>${escapeHtml(task.title)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            })()}

            <!-- PWA 설치 배너 -->
            <div id="install-banner" class="install-banner">
              <div class="install-banner-content">
                <div class="install-banner-text">
                  📱 홈 화면에 추가하면 더 빠르게!
                </div>
                <button class="install-banner-btn" onclick="installPWA()">설치</button>
                <button class="install-banner-close" onclick="closeInstallBanner()">×</button>
              </div>
            </div>

          </div>

          <!-- 4K 전용: 전체 작업 목록 (4번째 컬럼) -->
          <div class="pc-column-tasklist">
            <div class="tasklist-4k-header">📋 전체 작업 (${filteredTasks.filter(t => !t.completed).length})</div>
            <div class="search-simple">
              <input
                type="text"
                class="search-input"
                placeholder="🔍 검색..."
                value="${appState.searchQuery}"
                oninput="setSearchQuery(this.value)"
              >
              ${appState.searchQuery ? `<button class="search-clear" onclick="clearSearch()">×</button>` : ''}
            </div>
            <div class="task-list-inner">
              ${filteredTasks
                .filter(t => !t.completed)
                .map(task => `
                  <div class="task-item-mini" onclick="editTask('${escapeAttr(task.id)}')" style="--task-cat-color: var(--cat-${task.category})">
                    <div class="task-item-mini-left">
                      <button class="task-check-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                      <span class="task-item-mini-title">${escapeHtml(task.title)}</span>
                    </div>
                    <span class="task-item-mini-category ${task.category}">${task.category}</span>
                  </div>
                `).join('')}
            </div>
            ${filteredTasks.filter(t => t.completed).length > 0 ? `
              <details class="completed-tasks-4k" style="margin-top: 8px;">
                <summary style="cursor: pointer; font-size: 16px; color: var(--text-secondary); padding: 8px 0;">
                  ✅ 완료 ${filteredTasks.filter(t => t.completed).length}개
                </summary>
                <div class="task-list-inner" style="opacity: 0.6;">
                  ${filteredTasks
                    .filter(t => t.completed)
                    .slice(0, 20)
                    .map(task => `
                      <div class="task-item-mini" onclick="editTask('${escapeAttr(task.id)}')" style="text-decoration: line-through; --task-cat-color: var(--cat-${task.category})">
                        <div class="task-item-mini-left">
                          <button class="task-check-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" style="border-color: #48bb78; color: #48bb78;">✓</button>
                          <span class="task-item-mini-title">${escapeHtml(task.title)}</span>
                        </div>
                        <span class="task-item-mini-category ${task.category}">${task.category}</span>
                      </div>
                    `).join('')}
                </div>
              </details>
            ` : ''}
          </div>
        </div>
        `;
}
