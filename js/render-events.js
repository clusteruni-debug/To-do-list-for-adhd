// ============================================
// 렌더링 - 이벤트 탭
// ============================================

/**
 * 부업 이벤트 탭 HTML을 반환한다.
 */
function renderEventsTab() {
          const eventTasks = appState.tasks.filter(t => t.category === '부업');
          const pendingEvents = eventTasks.filter(t => !t.completed).sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
          });
          const submittedEvents = eventTasks.filter(t => t.completed).sort((a, b) => {
            return new Date(b.deadline || 0) - new Date(a.deadline || 0);
          });

          const getDaysLeft = (deadline) => {
            if (!deadline) return null;
            const now = new Date();
            const d = new Date(deadline);
            const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
            return diff;
          };

          const formatDday = (days) => {
            if (days === null) return '';
            if (days < 0) return '<span style="color:#f5576c">D+' + Math.abs(days) + '</span>';
            if (days === 0) return '<span style="color:#f5576c">D-Day</span>';
            if (days <= 3) return '<span style="color:#ff9500">D-' + days + '</span>';
            return 'D-' + days;
          };

          const urgentCount = pendingEvents.filter(t => {
            const d = getDaysLeft(t.deadline);
            return d !== null && d <= 1;
          }).length;

          // 텔레그램 연동 작업 수 확인
          const telegramLinkedCount = eventTasks.filter(t => t.source && t.source.type === 'telegram-event').length;

          return `
            <div class="events-header">
              <div class="events-title">💰 이벤트</div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="event-bulk-select-btn ${_eventBulkSelectMode ? 'active' : ''}" onclick="toggleEventBulkSelect()" aria-label="이벤트 일괄 선택 모드 ${_eventBulkSelectMode ? '해제' : '진입'}">☑ 선택</button>
                <button class="telegram-status ${telegramLinkedCount > 0 ? 'connected' : ''}" onclick="showTelegramEvents()" aria-label="텔레그램 이벤트 목록 보기" title="클릭하여 텔레그램 이벤트 확인">
                  <span class="telegram-icon">🤖</span>
                  <span class="telegram-text">${telegramLinkedCount > 0 ? '텔레그램 연동 ' + telegramLinkedCount + '개' : '텔레그램 미연동'}</span>
                </button>
              </div>
            </div>

            ${_eventBulkSelectMode ? `
            <div class="event-bulk-actions">
              <button onclick="toggleEventSelectAll()" aria-label="전체 선택/해제">전체</button>
              <button class="bulk-delete-btn" onclick="bulkDeleteEvents()" ${_eventBulkSelectedIds.size === 0 ? 'disabled' : ''} aria-label="${_eventBulkSelectedIds.size}개 삭제">🗑 삭제 (${_eventBulkSelectedIds.size})</button>
              <button class="bulk-cancel-btn" onclick="toggleEventBulkSelect()" aria-label="선택 모드 취소">취소</button>
              <span class="event-bulk-count">${_eventBulkSelectedIds.size}개 선택</span>
            </div>
            ` : ''}

            <!-- 이벤트 빠른 추가 -->
            <div class="events-quick-add">
              <input
                type="text"
                class="events-quick-input"
                placeholder="이벤트명 입력 후 Enter (예: 불개미 AMA)"
                id="event-quick-input"
                onkeypress="if(event.key==='Enter') quickAddEvent()"
              >
              <button class="events-quick-btn" onclick="quickAddEvent()">+</button>
              <button class="events-detail-btn" onclick="addNewEvent()" title="상세 입력">📝</button>
            </div>

            <div class="events-summary">
              <div class="events-summary-item">
                <div class="events-summary-value" style="color: ${urgentCount > 0 ? '#f5576c' : '#48bb78'}">${pendingEvents.length}</div>
                <div class="events-summary-label">미제출</div>
              </div>
              <div class="events-summary-item">
                <div class="events-summary-value" style="color: #ff9500">${urgentCount}</div>
                <div class="events-summary-label">긴급 (D-1)</div>
              </div>
              <div class="events-summary-item">
                <div class="events-summary-value" style="color: #48bb78">${submittedEvents.length}</div>
                <div class="events-summary-label">제출완료</div>
              </div>
            </div>

            ${(() => {
              if (pendingEvents.length === 0) {
                return `
                  <div class="events-empty">
                    <div class="events-empty-icon">🎉</div>
                    <div class="events-empty-text">미제출 이벤트가 없습니다!</div>
                  </div>
                `;
              }

              // 기한별 그룹화: 긴급(D-1 이하) / 마감 전(D-2~D-5) / 미제출(나머지)
              const urgent = pendingEvents.filter(t => { const d = getDaysLeft(t.deadline); return d !== null && d <= 1; });
              const approaching = pendingEvents.filter(t => { const d = getDaysLeft(t.deadline); return d !== null && d >= 2 && d <= 5; });
              const pending = pendingEvents.filter(t => { const d = getDaysLeft(t.deadline); return d === null || d > 5; });

              const renderEventCard = (task) => {
                const days = getDaysLeft(task.deadline);
                const startDateStr = task.startDate ? new Date(task.startDate).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : '';
                const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : '';
                let dateDisplay = '';
                if (startDateStr && deadlineStr) {
                  dateDisplay = startDateStr + '~' + deadlineStr;
                } else if (deadlineStr) {
                  dateDisplay = '~' + deadlineStr;
                } else if (startDateStr) {
                  dateDisplay = startDateStr + '~';
                }
                const metaItems = [];
                // 텔레그램 source에서 project/organizer 우선 표시
                const srcProject = task.source?.project;
                const srcOrganizer = task.source?.organizer;
                if (srcProject) metaItems.push(srcProject);
                if (srcOrganizer || task.organizer) metaItems.push(srcOrganizer || task.organizer);
                if (task.eventType) metaItems.push(task.eventType);
                if (task.expectedRevenue) metaItems.push('₩' + Number(task.expectedRevenue).toLocaleString());
                const metaStr = metaItems.join(' · ');
                const telegramBadge = task.source && task.source.type === 'telegram-event' ? '<span class="event-tg-badge" title="텔레그램 연동">📱</span>' : '';
                return `
                  <div class="event-card ${days !== null && days <= 1 ? 'urgent' : (days !== null && days <= 3 ? 'warning' : '')}" style="${_eventBulkSelectMode ? 'display:flex;align-items:center' : ''}">
                    ${_eventBulkSelectMode ? '<div class="event-check-col"><input type="checkbox" ' + (_eventBulkSelectedIds.has(task.id) ? 'checked' : '') + ' onchange="toggleEventSelection(\'' + escapeAttr(task.id) + '\')" aria-label="' + escapeHtml(task.title) + ' 선택"></div>' : ''}
                    <div style="flex:1;min-width:0">
                      <div class="event-card-main">
                        <div class="event-title">${telegramBadge}${escapeHtml(task.title)}</div>
                        ${metaStr ? '<div class="event-meta-info">' + escapeHtml(metaStr) + '</div>' : ''}
                        ${task.description ? '<div class="event-description">' + escapeHtml(task.description.slice(0, 60)) + (task.description.length > 60 ? '...' : '') + '</div>' : ''}
                      </div>
                      ${dateDisplay ? '<span class="event-compact-date">' + dateDisplay + '</span>' : ''}
                      ${_eventBulkSelectMode ? '' : `<div class="event-actions">
                        ${sanitizeUrl(task.link) ? '<a href="' + escapeHtml(sanitizeUrl(task.link)) + '" target="_blank" rel="noopener" class="btn btn-small btn-link">🔗</a>' : ''}
                        <button class="btn btn-small btn-submit" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                        <button class="btn btn-small btn-edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                        <button class="btn btn-small btn-delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                      </div>`}
                      <div class="event-dday">${days !== null ? (days < 0 ? 'D+' + Math.abs(days) : (days === 0 ? 'D-Day' : 'D-' + days)) : ''}</div>
                    </div>
                  </div>
                `;
              };

              const renderGroup = (groupId, title, icon, events) => {
                if (events.length === 0) return '';
                const isCollapsed = _collapsedEventGroups.has(groupId);
                const groupIds = events.map(e => e.id);
                const allChecked = _eventBulkSelectMode && groupIds.every(id => _eventBulkSelectedIds.has(id));
                return `
                  <div class="events-group">
                    <div class="events-group-header" onclick="toggleEventGroup('${groupId}')">
                      <span>
                        ${_eventBulkSelectMode ? '<input type="checkbox" ' + (allChecked ? 'checked' : '') + ' onclick="event.stopPropagation(); toggleEventGroupSelect([\'' + groupIds.map(id => escapeAttr(id)).join("','") + '\'])" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;cursor:pointer;min-width:44px;min-height:44px;accent-color:var(--accent-primary)">' : ''}
                        ${icon} ${title} (${events.length})
                      </span>
                      <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
                    </div>
                    <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
                      ${events.map(renderEventCard).join('')}
                    </div>
                  </div>
                `;
              };

              return `
                ${renderGroup('urgent', '긴급', '🚨', urgent)}
                ${renderGroup('approaching', '마감 전', '⚡', approaching)}
                ${renderGroup('pending', '미제출', '📅', pending)}
              `;
            })()}

            ${submittedEvents.length > 0 ? (() => {
              const submittedIds = submittedEvents.map(t => t.id);
              const allSubmittedChecked = _eventBulkSelectMode && submittedIds.every(id => _eventBulkSelectedIds.has(id));
              return `
              <div class="events-group">
                <div class="events-group-header" onclick="toggleEventGroup('submitted')">
                  <span>
                    ${_eventBulkSelectMode ? '<input type="checkbox" ' + (allSubmittedChecked ? 'checked' : '') + ' onclick="event.stopPropagation(); toggleEventGroupSelect([\'' + submittedIds.map(id => escapeAttr(id)).join("','") + '\'])" style="width:18px;height:18px;margin-right:6px;vertical-align:middle;cursor:pointer;min-width:44px;min-height:44px;accent-color:var(--accent-primary)">' : ''}
                    ✅ 제출완료 (${submittedEvents.length})
                  </span>
                  <span class="toggle-icon">${_collapsedEventGroups.has('submitted') ? '▶' : '▼'}</span>
                </div>`;
            })() + `
                <div class="events-list ${_collapsedEventGroups.has('submitted') ? 'collapsed' : ''}">
                  ${submittedEvents.map(task => {
                    const completedDate = task.completedAt ? new Date(task.completedAt) : null;
                    const completedStr = completedDate ? completedDate.toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) + ' ' + completedDate.toTimeString().slice(0,5) : '';
                    const isTelegram = task.source && task.source.type === 'telegram-event';
                    return `
                    <div class="event-card completed" style="${_eventBulkSelectMode ? 'display:flex;align-items:center' : ''}">
                      ${_eventBulkSelectMode ? '<div class="event-check-col"><input type="checkbox" ' + (_eventBulkSelectedIds.has(task.id) ? 'checked' : '') + ' onchange="toggleEventSelection(\'' + escapeAttr(task.id) + '\')" aria-label="' + escapeHtml(task.title) + ' 선택"></div>' : ''}
                      <div style="flex:1;min-width:0">
                        <div class="event-title">${isTelegram ? '<span class="event-tg-badge">📱</span>' : ''}${escapeHtml(task.title)}</div>
                        ${completedStr ? `<span class="event-completed-date" onclick="editCompletedAt('${escapeAttr(task.id)}')" title="클릭하여 수정">✓ ${completedStr}</span>` : ''}
                        ${isTelegram ? '<span class="event-tg-synced" title="텔레그램 동기화됨">✓ 동기화</span>' : ''}
                        ${_eventBulkSelectMode ? '' : `<div class="event-actions">
                          <button class="btn btn-small btn-undo" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩</button>
                          <button class="btn btn-small btn-delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">🗑</button>
                        </div>`}
                      </div>
                    </div>
                  `}).join('')}
                </div>
              </div>
            ` : ''}

            ${(() => {
              const eventTrash = appState.trash.filter(t => t.category === '부업');
              if (eventTrash.length === 0) return '';
              const isCollapsed = _collapsedEventGroups.has('trash');
              return `
                <div class="events-group" style="margin-top:16px">
                  <div class="events-group-header" onclick="toggleEventGroup('trash')" style="color:var(--text-muted)">
                    <span>🗑 휴지통 (${eventTrash.length})</span>
                    <span style="display:flex;align-items:center;gap:8px">
                      <button onclick="event.stopPropagation(); emptyTrash()" style="font-size:14px;padding:3px 8px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-muted);cursor:pointer;min-height:44px" aria-label="휴지통 비우기">비우기</button>
                      <span class="toggle-icon">${isCollapsed ? '▶' : '▼'}</span>
                    </span>
                  </div>
                  <div class="events-list ${isCollapsed ? 'collapsed' : ''}">
                    ${eventTrash.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')).map(task => {
                      const deletedDate = task.deletedAt ? new Date(task.deletedAt) : null;
                      const deletedStr = deletedDate ? deletedDate.toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) + ' 삭제' : '';
                      const daysLeft = task.deletedAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(task.deletedAt).getTime()) / (1000*60*60*24))) : 30;
                      return '<div class="event-card" style="opacity:0.7">' +
                        '<div class="event-card-main">' +
                          '<div class="event-title">' + escapeHtml(task.title) + '</div>' +
                          '<div class="event-meta-info" style="font-size:14px;color:var(--text-muted)">' + deletedStr + ' · ' + daysLeft + '일 후 영구삭제</div>' +
                        '</div>' +
                        '<div class="event-actions">' +
                          '<button class="btn btn-small btn-undo" onclick="restoreFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="복원" title="복원">↩</button>' +
                          '<button class="btn btn-small btn-delete" onclick="permanentDeleteFromTrash(\'' + escapeAttr(task.id) + '\')" aria-label="영구삭제" title="영구삭제">✕</button>' +
                        '</div>' +
                      '</div>';
                    }).join('')}
                  </div>
                </div>
              `;
            })()}
          `;
}
