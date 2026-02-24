// ============================================
// 렌더링
// ============================================

/**
 * 전체 화면 렌더링 (상태 변경 시 호출)
 */
function renderStatic() {
  const now = new Date();
  const hour = now.getHours();
  const filteredTasks = getFilteredTasks();
  const nextAction = filteredTasks[0] || null;
  const mode = getCurrentMode();
  const categoryStats = getCategoryStats();
  const urgentTasks = getUrgentTasks();
  
  const stats = {
    total: appState.tasks.length,
    completed: getTodayCompletedTasks(appState.tasks).length,
    remaining: appState.tasks.filter(t => !t.completed).length
  };

  const completedTasks = getTodayCompletedTasks(appState.tasks);
  const hiddenCount = appState.tasks.filter(t => !t.completed).length - filteredTasks.length;
  
  const bedtime = new Date(now);
  bedtime.setHours(24, 0, 0, 0);
  const minutesUntilBed = Math.floor((bedtime - now) / (1000 * 60));
  
  const urgencyClass = nextAction ? nextAction.urgency : 'normal';
  const urgencyLabel = {
    'urgent': '🚨 긴급!',
    'warning': '⚠️ 주의',
    'normal': '▶ 지금 할 것',
    'expired': '❌ 마감 지남'
  };

  // 반복 옵션 공통 필드
  const repeatField = `
    <div class="form-group">
      <label class="form-label">반복 설정</label>
      <select class="form-select" id="detailed-repeat" onchange="updateDetailedTaskRepeat(this.value)">
        <option value="none" ${appState.detailedTask.repeatType === 'none' ? 'selected' : ''}>반복 안 함</option>
        <option value="daily" ${appState.detailedTask.repeatType === 'daily' ? 'selected' : ''}>매일</option>
        <option value="weekdays" ${appState.detailedTask.repeatType === 'weekdays' ? 'selected' : ''}>평일만 (월~금)</option>
        <option value="weekends" ${appState.detailedTask.repeatType === 'weekends' ? 'selected' : ''}>주말만 (토~일)</option>
        <option value="weekly" ${appState.detailedTask.repeatType === 'weekly' ? 'selected' : ''}>매주</option>
        <option value="custom" ${appState.detailedTask.repeatType === 'custom' ? 'selected' : ''}>특정 요일</option>
        <option value="monthly" ${appState.detailedTask.repeatType === 'monthly' ? 'selected' : ''}>매월</option>
      </select>
      ${appState.detailedTask.repeatType === 'custom' ? `
        <div class="repeat-days">
          ${['일', '월', '화', '수', '목', '금', '토'].map((day, index) => `
            <label class="repeat-day-option">
              <input type="checkbox"
                ${(appState.detailedTask.repeatDays || []).includes(index) ? 'checked' : ''}
                onchange="toggleRepeatDay(${index})">
              <span>${day}</span>
            </label>
          `).join('')}
        </div>
      ` : ''}
      ${appState.detailedTask.repeatType === 'monthly' ? `
        <div class="repeat-monthly">
          <label class="form-label" style="margin-top: 10px;">매월 반복일</label>
          <input type="number" class="form-input" id="detailed-repeat-day"
            min="1" max="31"
            placeholder="1~31"
            value="${appState.detailedTask.repeatMonthDay || ''}"
            onchange="updateRepeatMonthDay(this.value)">
        </div>
      ` : ''}
      <div class="form-note">* 완료 시 다음 주기 작업이 자동 생성됩니다</div>
    </div>
  `;

  // 카테고리별 입력 필드
  const categoryFields = {
    '본업': `
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">시작일</label>
          <input type="datetime-local" class="form-input" id="detailed-startDate" value="${appState.detailedTask.startDate || ''}">
        </div>
        <div class="form-group half">
          <label class="form-label">마감일</label>
          <input type="datetime-local" class="form-input" id="detailed-deadline" value="${appState.detailedTask.deadline}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">예상 소요시간 (분)</label>
        <input type="number" class="form-input" id="detailed-time" value="${appState.detailedTask.estimatedTime}">
      </div>
      ${repeatField}
      <div class="form-group">
        <label class="form-label">링크</label>
        <input type="url" class="form-input" id="detailed-link" placeholder="https://" value="${escapeHtml(appState.detailedTask.link)}">
      </div>
    `,
    '부업': `
      <div class="form-group">
        <label class="form-label">주최자</label>
        <select class="form-select" id="detailed-organizer">
          <option value="" ${!appState.detailedTask.organizer ? 'selected' : ''}>선택하세요</option>
          <option value="불개미" ${appState.detailedTask.organizer === '불개미' ? 'selected' : ''}>불개미</option>
          <option value="코같투" ${appState.detailedTask.organizer === '코같투' ? 'selected' : ''}>코같투</option>
          <option value="맨틀" ${appState.detailedTask.organizer === '맨틀' ? 'selected' : ''}>맨틀</option>
          <option value="xmaquina" ${appState.detailedTask.organizer === 'xmaquina' ? 'selected' : ''}>xmaquina</option>
          <option value="기타" ${appState.detailedTask.organizer === '기타' ? 'selected' : ''}>기타</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">이벤트 종류</label>
        <select class="form-select" id="detailed-eventType">
          <option value="" ${!appState.detailedTask.eventType ? 'selected' : ''}>선택하세요</option>
          <option value="의견작성" ${appState.detailedTask.eventType === '의견작성' ? 'selected' : ''}>의견작성</option>
          <option value="리캡작성" ${appState.detailedTask.eventType === '리캡작성' ? 'selected' : ''}>리캡작성</option>
          <option value="AMA참여" ${appState.detailedTask.eventType === 'AMA참여' ? 'selected' : ''}>AMA참여</option>
          <option value="아티클작성" ${appState.detailedTask.eventType === '아티클작성' ? 'selected' : ''}>아티클작성</option>
          <option value="영상제작" ${appState.detailedTask.eventType === '영상제작' ? 'selected' : ''}>영상제작</option>
          <option value="커뮤니티" ${appState.detailedTask.eventType === '커뮤니티' ? 'selected' : ''}>커뮤니티</option>
          <option value="기타" ${appState.detailedTask.eventType === '기타' ? 'selected' : ''}>기타</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">시작일</label>
          <input type="datetime-local" class="form-input" id="detailed-startDate" value="${appState.detailedTask.startDate || ''}">
        </div>
        <div class="form-group half">
          <label class="form-label">마감일</label>
          <input type="datetime-local" class="form-input" id="detailed-deadline" value="${appState.detailedTask.deadline}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">링크</label>
        <input type="url" class="form-input" id="detailed-link" placeholder="https://t.me/..." value="${escapeHtml(appState.detailedTask.link)}">
      </div>
    `,
    '일상': `
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">시작일 (선택)</label>
          <input type="datetime-local" class="form-input" id="detailed-startDate" value="${appState.detailedTask.startDate || ''}">
        </div>
        <div class="form-group half">
          <label class="form-label">마감일 (선택)</label>
          <input type="datetime-local" class="form-input" id="detailed-deadline" value="${appState.detailedTask.deadline}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">예상 소요시간 (분)</label>
        <input type="number" class="form-input" id="detailed-time" value="${appState.detailedTask.estimatedTime}">
      </div>
      ${repeatField}
    `,
    '가족': `
      <div class="form-row">
        <div class="form-group half">
          <label class="form-label">시작일 (선택)</label>
          <input type="datetime-local" class="form-input" id="detailed-startDate" value="${appState.detailedTask.startDate || ''}">
        </div>
        <div class="form-group half">
          <label class="form-label">마감일 (선택)</label>
          <input type="datetime-local" class="form-input" id="detailed-deadline" value="${appState.detailedTask.deadline}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">예상 소요시간 (분)</label>
        <input type="number" class="form-input" id="detailed-time" value="${appState.detailedTask.estimatedTime}">
      </div>
      ${repeatField}
      <div class="form-group">
        <label class="form-label">메모/링크 (선택)</label>
        <input type="text" class="form-input" id="detailed-link" placeholder="메모 또는 URL" value="${escapeHtml(appState.detailedTask.link)}">
      </div>
    `
  };

  document.getElementById('root').innerHTML = `
    <div class="app">
      <div class="header">
        <div class="header-left">
          <h1>⚡ Navigator</h1>
          <p class="header-date">${now.getMonth() + 1}월 ${now.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}요일 ${appState.streak.current > 0 ? `<span class="header-streak">🔥${appState.streak.current}</span>` : ''}</p>
        </div>
        <div class="header-actions">
          <button class="header-btn shuttle-toggle ${appState.shuttleSuccess ? 'on' : 'off'}" onclick="toggleShuttle()" title="${appState.shuttleSuccess ? '셔틀 탑승 성공 ✓' : '셔틀 놓침 ✗ (클릭하여 변경)'}" aria-label="셔틀 상태 토글">
            ${appState.shuttleSuccess ? '🚌 ON' : '😴 OFF'}
          </button>
          <button class="header-btn" onclick="toggleTheme()" title="테마 전환" aria-label="테마 전환">
            ${appState.theme === 'dark' ? '☀️' : '🌙'}
          </button>
          ${appState.user ? `
            <button class="header-btn" onclick="openSettings()" title="동기화: ${appState.syncStatus}" aria-label="동기화 상태" style="position: relative;">
              ${appState.syncStatus === 'syncing' ? '🔄' : appState.syncStatus === 'synced' ? '☁️' : appState.syncStatus === 'error' ? '⚠️' : '☁️'}
              <span style="position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px; background: ${appState.syncStatus === 'synced' ? '#48bb78' : appState.syncStatus === 'error' ? '#f5576c' : '#667eea'}; border-radius: 50%; border: 1px solid var(--bg-primary);"></span>
            </button>
          ` : `
            <button class="header-btn" onclick="openSettings()" title="로그인하여 동기화" aria-label="로그인하여 동기화">
              ☁️
            </button>
          `}
          <div class="notification-dropdown-wrapper">
            <button class="header-btn" onclick="toggleNotificationDropdown(event)" title="마감 알림" aria-label="마감 알림" style="position: relative;">
              🔔
              ${appState.notificationPermission === 'granted' ? '<span class="notif-dot" style="background: #48bb78;"></span>' : appState.notificationPermission === 'denied' ? '<span class="notif-dot" style="background: #f5576c;"></span>' : ''}
            </button>
            <div id="notification-dropdown" class="notification-dropdown">
              <div class="notification-title">🔔 마감 알림</div>
              <div class="notification-status">
                ${appState.notificationPermission === 'granted' ? `
                  <span class="notification-text granted">✓ 활성화됨</span>
                  <button class="notification-btn granted" disabled>ON</button>
                ` : appState.notificationPermission === 'denied' ? `
                  <span class="notification-text denied">✕ 차단됨</span>
                  <button class="notification-btn denied" onclick="showToast('브라우저 설정에서 알림을 허용해주세요 (주소창 왼쪽 🔒 클릭)', 'info')">설정</button>
                ` : `
                  <span class="notification-text">알림 받기</span>
                  <button class="notification-btn" onclick="requestNotificationPermission()">켜기</button>
                `}
              </div>
              ${appState.notificationPermission === 'denied' ? `
                <div class="notification-help">
                  💡 주소창 왼쪽의 🔒를 클릭하여 알림을 허용으로 변경하세요
                </div>
              ` : ''}
            </div>
          </div>
          <button class="header-btn" onclick="openSettings()" title="설정" aria-label="설정">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 탭 네비게이션 (5개 + 더보기) -->
      <div class="tab-nav" role="navigation" aria-label="탭 네비게이션">
        <button class="tab-btn ${appState.currentTab === 'action' ? 'active' : ''}" onclick="switchTab('action')" aria-label="오늘 탭">
          ${svgIcon('target')} 오늘
        </button>
        <button class="tab-btn ${appState.currentTab === 'work' ? 'active' : ''}" onclick="switchTab('work')" aria-label="본업 탭">
          ${svgIcon('briefcase')} 본업
        </button>
        <button class="tab-btn ${appState.currentTab === 'events' ? 'active' : ''}" onclick="switchTab('events')" aria-label="이벤트 탭">
          ${svgIcon('dollar')} 이벤트
        </button>
        <button class="tab-btn ${appState.currentTab === 'life' ? 'active' : ''}" onclick="switchTab('life')" aria-label="일상 탭">
          ${svgIcon('home')} 일상
        </button>
        <div class="tab-more-dropdown">
          <button class="tab-btn ${['commute', 'dashboard', 'all', 'history'].includes(appState.currentTab) ? 'active' : ''}" onclick="toggleMoreMenu(event)" aria-label="더보기 메뉴" aria-expanded="${appState.moreMenuOpen}" aria-haspopup="true">
            ${svgIcon('menu')} 더보기 ▾
          </button>
          <div id="more-menu" class="more-menu ${appState.moreMenuOpen ? 'show' : ''}" role="menu">
          <button class="more-menu-item ${appState.currentTab === 'commute' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('commute');" role="menuitem" aria-label="통근 탭">
            ${svgIcon('bus')} 통근
          </button>
            <button class="more-menu-item ${appState.currentTab === 'dashboard' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('dashboard');" role="menuitem" aria-label="통계 탭">
              ${svgIcon('bar-chart')} 통계
            </button>
            <button class="more-menu-item ${appState.currentTab === 'all' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('all');" role="menuitem" aria-label="전체 탭">
              ${svgIcon('list')} 전체
            </button>
            <button class="more-menu-item ${appState.currentTab === 'history' ? 'active' : ''}" onclick="appState.moreMenuOpen = false; switchTab('history');" role="menuitem" aria-label="히스토리 탭">
              ${svgIcon('calendar')} 히스토리
            </button>
          </div>
        </div>
      </div>

      <!-- 실행 탭 -->
      <div class="tab-content ${appState.currentTab === 'action' ? 'active' : ''}">
        ${appState.currentTab === 'action' ? `
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
                // 오후 수면 중복 보정 제거 — 위 로직만으로 야간 수면 정확히 처리됨
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
                      <span class="life-rhythm-label">회사도착</span>
                      <span class="life-rhythm-time">${rhythm.workArrive || '--:--'}</span>
                    </button>
                    <button class="life-rhythm-btn ${rhythm.workDepart ? 'recorded' : ''}"
                            onclick="handleLifeRhythmClick('workDepart', ${rhythm.workDepart ? 'true' : 'false'}, event)"
                            title="${rhythm.workDepart ? '클릭: 수정/삭제' : '클릭: 현재시간 기록'}">
                      <span class="life-rhythm-icon">🚀</span>
                      <span class="life-rhythm-label">회사출발</span>
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

            <!-- 빠른 추가 버튼 -->
            <div class="quick-templates">
              <button class="quick-template-btn" onclick="addFromTemplate('writing')" title="아티클/트윗 작성용 템플릿으로 빠르게 추가" aria-label="글쓰기 템플릿으로 추가">
                ✍️ 글쓰기
              </button>
              <button class="quick-template-btn secondary" onclick="toggleDetailedAdd()" title="카테고리, 마감일, 예상수익 등 상세 정보 입력" aria-label="상세 작업 추가">
                📝 상세 추가
              </button>
              <button class="quick-template-btn secondary" onclick="showBrainDumpModal()" title="한 줄에 하나씩, 여러 작업을 한 번에 추가" aria-label="브레인 덤프">
                🧠 덤프
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
                return `
                  <div class="empty-state-enhanced">
                    <div class="empty-state-icon-large">🎉</div>
                    <div class="empty-state-title">모든 작업 완료!</div>
                    <div class="empty-state-subtitle">
                      오늘 <strong>${completedToday}개</strong> 완료했어요!
                      ${streak > 1 ? `<br>🔥 ${streak}일 연속 달성 중!` : ''}
                    </div>
                    <div class="empty-state-actions">
                      <button class="empty-state-btn primary" onclick="toggleDetailedAdd()">
                        ${svgIcon('plus', 16)} 새 작업 추가
                      </button>
                      <button class="empty-state-btn" onclick="showToast('${rest.icon} ${rest.text}: ${rest.desc}', 'success')">
                        ${rest.icon} ${rest.text}
                      </button>
                    </div>
                  </div>
                `;
              })()}
            `}

            ${hiddenCount > 0 ? `
              <div class="hidden-tasks">
                오늘 못 할 것 ${hiddenCount}개 숨김<br>
                <span style="font-size: 14px">내일 하면 됩니다</span>
              </div>
            ` : ''}

            <!-- 🍅 포모도로 타이머 -->
            ${(() => {
              const pomo = appState.pomodoro;
              const currentTask = pomo.currentTaskId ? appState.tasks.find(t => t.id === pomo.currentTaskId) : null;
              if (!pomo.isRunning && !pomo.isBreak && pomo.completedPomodoros === 0) {
                return `
                  <div class="pomodoro-section" style="margin-bottom: 12px;">
                    <button class="btn btn-secondary" onclick="startPomodoro()" style="width: 100%; padding: 10px;" aria-label="포모도로 시작">
                      🍅 포모도로 25분 집중 시작
                    </button>
                  </div>
                `;
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
        ` : ''}
      </div>

      <!-- 일정 탭 -->
      <div class="tab-content ${appState.currentTab === 'schedule' ? 'active' : ''}">
        ${appState.currentTab === 'schedule' ? `
        <div class="schedule-filter">
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'all' ? 'active' : ''}" onclick="setScheduleFilter('all')">
            전체
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'today' ? 'active' : ''}" onclick="setScheduleFilter('today')">
            오늘
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'weekday' ? 'active' : ''}" onclick="setScheduleFilter('weekday')">
            평일
          </button>
          <button class="schedule-filter-btn ${appState.scheduleFilter === 'weekend' ? 'active' : ''}" onclick="setScheduleFilter('weekend')">
            주말
          </button>
        </div>

        <div class="schedule-week-grid">
          ${getTasksByDate().map(day => `
            <div class="schedule-day">
              <div class="schedule-day-header ${day.isToday ? 'today' : ''} ${day.isWeekend ? 'weekend' : ''}">
                <span>${day.dayName}</span>
                <span class="schedule-day-count">${day.tasks.length}개</span>
              </div>
              <div class="schedule-day-tasks">
                ${day.tasks.length > 0 ? day.tasks.map(task => `
                  <div class="schedule-task">
                    <span class="schedule-task-time">${formatTime(task.deadline)}</span>
                    <span class="schedule-task-title">${escapeHtml(task.title)}</span>
                    <span class="schedule-task-category category ${task.category}">${task.category}</span>
                  </div>
                `).join('') : `
                  <div class="schedule-empty">
                    ${day.isToday ? '오늘은 여유로운 날!' : '일정 없음'}
                  </div>
                `}
              </div>
            </div>
          `).join('')}
        </div>

        ${appState.tasks.filter(t => !t.completed && !t.deadline).length > 0 ? `
          <div class="dashboard-section" style="margin-top: 20px;">
            <div class="dashboard-title">📌 마감 없는 작업 (${appState.tasks.filter(t => !t.completed && !t.deadline).length}개)</div>
            <div class="task-list show">
              ${appState.tasks.filter(t => !t.completed && !t.deadline).map((task, index) => `
                <div class="task-item" style="--task-cat-color: var(--cat-${task.category})">
                  <div class="task-item-header">
                    <div class="task-item-title">${index + 1}. ${escapeHtml(task.title)}</div>
                  </div>
                  <div class="task-item-meta">
                    <span class="category ${task.category}">${task.category}</span>
                    ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                  </div>
                  <div class="task-item-actions">
                    <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')">${svgIcon('edit', 14)} 마감 추가</button>
                    <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ` : ''}
      </div>

      <!-- 본업 프로젝트 탭 -->
      <div class="tab-content ${appState.currentTab === 'work' ? 'active' : ''}">
        ${appState.currentTab === 'work' ? renderWorkProjects() : ''}
      </div>

      <!-- 부업 이벤트 탭 -->
      <div class="tab-content ${appState.currentTab === 'events' ? 'active' : ''}">
        ${appState.currentTab === 'events' ? (() => {
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
        })() : ''}
      </div>

      <!-- 일상/가족 탭 -->
      <div class="tab-content ${appState.currentTab === 'life' ? 'active' : ''}">
        ${appState.currentTab === 'life' ? (() => {
          const now = new Date();
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);

          const lifeTasks = appState.tasks.filter(t => t.category === '일상' || t.category === '가족');
          const pendingTasks = lifeTasks.filter(t => {
            if (t.completed) return false;
            // 반복 작업 중 미래 마감일(내일 이후)인 작업 제외
            if (t.deadline && t.repeatType && t.repeatType !== 'none') {
              const deadline = new Date(t.deadline);
              if (deadline > todayEnd) return false;
            }
            return true;
          }).sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
          });
          // 모든 완료 태스크 표시
          const completedTasks = lifeTasks.filter(t => t.completed);
          // 일상을 반복/일회성으로 분리
          const isRepeat = (t) => t.repeatType && t.repeatType !== 'none';
          const repeatTasks = pendingTasks.filter(t => t.category === '일상' && isRepeat(t));
          const onceTasks = pendingTasks.filter(t => t.category === '일상' && !isRepeat(t));
          const familyTasks = pendingTasks.filter(t => t.category === '가족');
          // 완료된 반복 작업 (리셋 대상)
          const completedRepeatTasks = completedTasks.filter(t => t.category === '일상' && isRepeat(t));

          return `
            <div class="life-header">
              <div class="life-title">🏠 일상 & 가족</div>
            </div>

            <!-- 빠른 추가 -->
            <div class="life-quick-add">
              <input
                type="text"
                class="life-quick-input"
                placeholder="일상/가족 작업 추가 (#가족 붙이면 가족으로)"
                id="life-quick-input"
                onkeypress="if(event.key==='Enter') quickAddLifeTask()"
              >
              <button class="life-quick-btn" onclick="quickAddLifeTask()">+</button>
            </div>

            <div class="life-summary">
              <div class="life-summary-item">
                <div class="life-summary-value">${repeatTasks.length}</div>
                <div class="life-summary-label">🔁 반복</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value">${onceTasks.length}</div>
                <div class="life-summary-label">📌 일회성</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value">${familyTasks.length}</div>
                <div class="life-summary-label">👨‍👩‍👧 가족</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value" style="color: #48bb78">${completedTasks.length}</div>
                <div class="life-summary-label">✓ 완료</div>
              </div>
            </div>

            ${repeatTasks.length > 0 || completedRepeatTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-header">
                  <div class="life-section-title">🔁 일상 (반복) ${repeatTasks.length > 0 ? `(${repeatTasks.length})` : ''}</div>
                  ${completedRepeatTasks.length > 0 ? `
                    <button class="life-reset-btn" onclick="resetCompletedRepeatTasks()" title="완료된 반복 작업 리셋">
                      ↺ 리셋 (${completedRepeatTasks.length})
                    </button>
                  ` : ''}
                </div>
                ${repeatTasks.length > 0 ? `
                  <div class="life-list">
                    ${repeatTasks.map(task => `
                      <div class="life-item" style="--task-cat-color: var(--cat-${task.category})">
                        <button class="task-check-btn" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                        <div class="life-item-content">
                          <div class="life-item-title">${escapeHtml(task.title)}</div>
                          <div class="life-item-meta">
                            ${task.repeatType === 'daily' ? '매일' : task.repeatType === 'weekdays' ? '평일' : '반복'}
                          </div>
                        </div>
                        <div class="life-item-actions">
                          <button class="life-action-btn" onclick="editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                          <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `<div class="life-all-done">✓ 오늘 반복 작업 모두 완료!</div>`}
              </div>
            ` : ''}

            ${onceTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-title">📌 일상 (일회성) (${onceTasks.length})</div>
                <div class="life-list">
                  ${onceTasks.map(task => `
                    <div class="life-item" style="--task-cat-color: var(--cat-${task.category})">
                      <button class="task-check-btn" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                      <div class="life-item-content">
                        <div class="life-item-title">${escapeHtml(task.title)}</div>
                        <div class="life-item-meta">
                          ${task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : ''}
                        </div>
                      </div>
                      <div class="life-item-actions">
                        <button class="life-action-btn" onclick="editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                        <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${familyTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-title">👨‍👩‍👧 가족 (${familyTasks.length})</div>
                <div class="life-list">
                  ${familyTasks.map(task => `
                    <div class="life-item" style="--task-cat-color: var(--cat-${task.category})">
                      <button class="task-check-btn" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>
                      <div class="life-item-content">
                        <div class="life-item-title">${escapeHtml(task.title)}</div>
                        <div class="life-item-meta">
                          ${task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : ''}
                          ${task.repeatType && task.repeatType !== 'none' ? ' 🔁' : ''}
                        </div>
                      </div>
                      <div class="life-item-actions">
                        <button class="life-action-btn" onclick="editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                        <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${pendingTasks.length === 0 ? `
              <div class="life-empty">
                <div class="life-empty-icon">🏡</div>
                <div class="life-empty-text">일상/가족 작업이 없습니다</div>
              </div>
            ` : ''}

            ${completedTasks.length > 0 ? `
              <div class="life-section" style="margin-top: 24px; opacity: 0.7;">
                <div class="life-section-title">✓ 완료됨 (${completedTasks.length})</div>
                <div class="life-list">
                  ${completedTasks.slice(0, 5).map(task => `
                    <div class="life-item completed" style="opacity: 0.6; --task-cat-color: var(--cat-${task.category})">
                      <div class="task-check-btn checked" style="color: #48bb78;">✓</div>
                      <div class="life-item-content" style="text-decoration: line-through;">
                        <div class="life-item-title">${escapeHtml(task.title)}</div>
                      </div>
                      <div class="life-item-actions" style="opacity: 1;">
                        <button class="life-action-btn" onclick="uncompleteTask('${escapeAttr(task.id)}')" title="되돌리기" aria-label="완료 되돌리기">↩️</button>
                        <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                      </div>
                    </div>
                  `).join('')}
                  ${completedTasks.length > 5 ? `<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 8px;">+ ${completedTasks.length - 5}개 더</div>` : ''}
                </div>
              </div>
            ` : ''}
          `;
        })() : ''}
      </div>



      <!-- 통근 트래커 탭 -->
      <div class="tab-content ${appState.currentTab === 'commute' ? 'active' : ''}">
        ${appState.currentTab === 'commute' ? renderCommuteTab() : ''}
      </div>

      <!-- 대시보드 탭 -->
      <div class="tab-content ${appState.currentTab === 'dashboard' ? 'active' : ''}">
        ${appState.currentTab === 'dashboard' ? `
        <div class="dashboard-section">
          <div class="dashboard-title">📈 오늘 요약</div>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${stats.total}</div>
              <div class="stat-label">전체 작업</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color: #48bb78">${stats.completed}</div>
              <div class="stat-label">완료</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</div>
              <div class="stat-label">완료율</div>
            </div>
            <div class="stat-card streak">
              <div class="stat-value">🔥 ${appState.streak.current}</div>
              <div class="stat-label">연속 달성</div>
              ${appState.streak.best > 0 ? `<div class="stat-best">최고: ${appState.streak.best}일</div>` : ''}
            </div>
          </div>
        </div>

        ${(() => {
          const revenueStats = getRevenueStats();
          if (revenueStats.totalRevenue === 0) return '';

          const formatRevenue = (amount) => {
            if (amount >= 10000) return Math.round(amount / 10000) + '만';
            if (amount >= 1000) return Math.round(amount / 1000) + '천';
            return amount.toLocaleString();
          };

          return `
            <div class="dashboard-section revenue-dashboard">
              <div class="dashboard-header">
                <div class="dashboard-title">💰 수익 대시보드</div>
                <button class="btn-export-asset" onclick="exportToAssetManager()" title="자산관리로 내보내기">
                  📤 자산관리
                </button>
              </div>
              <div class="revenue-summary">
                <div class="revenue-card total">
                  <div class="revenue-card-label">총 수익</div>
                  <div class="revenue-card-value">${revenueStats.totalRevenue.toLocaleString()}원</div>
                  <div class="revenue-card-sub">${revenueStats.taskCount}개 완료</div>
                </div>
                <div class="revenue-card month">
                  <div class="revenue-card-label">이번 달</div>
                  <div class="revenue-card-value">${revenueStats.thisMonthRevenue.toLocaleString()}원</div>
                </div>
              </div>

              <div class="revenue-chart-section">
                <div class="revenue-chart-title">📊 월별 수익 추이</div>
                <div class="revenue-bar-chart">
                  ${revenueStats.monthlyData.map(m => `
                    <div class="revenue-bar-item">
                      <div class="revenue-bar-wrapper">
                        <div class="revenue-bar" style="height: ${Math.max((m.revenue / revenueStats.maxMonthlyRevenue) * 100, 5)}%">
                          ${m.revenue > 0 ? `<span class="revenue-bar-value">${formatRevenue(m.revenue)}</span>` : ''}
                        </div>
                      </div>
                      <div class="revenue-bar-label">${m.label}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              ${revenueStats.categoryData.length > 0 ? `
                <div class="revenue-category-section">
                  <div class="revenue-chart-title">📂 카테고리별 수익</div>
                  <div class="revenue-category-list">
                    ${revenueStats.categoryData.map(c => `
                      <div class="revenue-category-item">
                        <div class="revenue-category-header">
                          <span class="category ${c.category}">${c.category}</span>
                          <span class="revenue-category-amount">${c.revenue.toLocaleString()}원</span>
                        </div>
                        <div class="revenue-category-bar">
                          <div class="revenue-category-bar-fill ${c.category}" style="width: ${c.percentage}%"></div>
                        </div>
                        <div class="revenue-category-percent">${c.percentage}%</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        })()}

        ${(() => {
          const rhythmStats = getLifeRhythmStats();
          if (!rhythmStats.hasData) return '';

          return `
            <div class="dashboard-section life-rhythm-stats">
              <div class="dashboard-title">😴 라이프 리듬 (최근 7일)</div>

              <!-- 수면 패턴 차트 -->
              <div class="rhythm-chart-section">
                <div class="rhythm-chart-title">💤 수면 패턴</div>
                <div class="rhythm-bar-chart">
                  ${rhythmStats.sleepData.map(d => `
                    <div class="rhythm-bar-item">
                      <div class="rhythm-bar-wrapper">
                        <div class="rhythm-bar ${d.hours >= 7 ? 'good' : d.hours >= 6 ? 'ok' : 'bad'}"
                             style="height: ${d.hours ? Math.max((d.hours / 10) * 100, 10) : 0}%"
                             title="${d.date}: ${d.hours ? d.hours.toFixed(1) + '시간' : '기록없음'}">
                          ${d.hours ? '<span class="rhythm-bar-value">' + d.hours.toFixed(1) + 'h</span>' : ''}
                        </div>
                      </div>
                      <div class="rhythm-bar-label ${d.isToday ? 'today' : ''}">${d.dayLabel}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="rhythm-summary-row">
                  <span>평균 수면: <strong>${rhythmStats.avgSleep.toFixed(1)}시간</strong></span>
                  <span>목표 대비: <strong class="${rhythmStats.avgSleep >= rhythmStats.targetSleepHours ? 'good' : 'bad'}">${rhythmStats.avgSleep >= rhythmStats.targetSleepHours ? '+' : ''}${(rhythmStats.avgSleep - rhythmStats.targetSleepHours).toFixed(1)}시간</strong></span>
                </div>
                ${rhythmStats.avgWakeUp || rhythmStats.avgBedtime ? `
                <div class="rhythm-summary-row">
                  ${rhythmStats.avgWakeUp ? `<span>평균 기상: <strong>${rhythmStats.avgWakeUp}</strong> ${rhythmStats.wakeTimeDiff !== null ? '<strong class="' + (Math.abs(rhythmStats.wakeTimeDiff) <= 15 ? 'good' : 'bad') + '">' + (rhythmStats.wakeTimeDiff > 0 ? '+' : '') + rhythmStats.wakeTimeDiff + '분</strong>' : ''}</span>` : ''}
                  ${rhythmStats.avgBedtime ? `<span>평균 취침: <strong>${rhythmStats.avgBedtime}</strong> ${rhythmStats.bedtimeDiff !== null ? '<strong class="' + (Math.abs(rhythmStats.bedtimeDiff) <= 15 ? 'good' : 'bad') + '">' + (rhythmStats.bedtimeDiff > 0 ? '+' : '') + rhythmStats.bedtimeDiff + '분</strong>' : ''}</span>` : ''}
                </div>
                ` : ''}
              </div>

              <!-- 근무 패턴 -->
              <div class="rhythm-work-section">
                <div class="rhythm-chart-title">💼 근무 패턴</div>
                <div class="rhythm-work-stats">
                  <div class="rhythm-work-stat">
                    <span class="rhythm-work-label">평균 출근</span>
                    <span class="rhythm-work-value">${rhythmStats.avgWorkArrive || '--:--'}</span>
                  </div>
                  <div class="rhythm-work-stat">
                    <span class="rhythm-work-label">평균 퇴근</span>
                    <span class="rhythm-work-value">${rhythmStats.avgWorkDepart || '--:--'}</span>
                  </div>
                  <div class="rhythm-work-stat">
                    <span class="rhythm-work-label">평균 근무</span>
                    <span class="rhythm-work-value">${rhythmStats.avgWorkHours ? rhythmStats.avgWorkHours.toFixed(1) + 'h' : '--'}</span>
                  </div>
                  <div class="rhythm-work-stat">
                    <span class="rhythm-work-label">출근 편차</span>
                    <span class="rhythm-work-value ${rhythmStats.homeDepartDeviation <= 30 ? 'good' : ''}">${rhythmStats.homeDepartDeviation ? '±' + rhythmStats.homeDepartDeviation + '분' : '--'}</span>
                  </div>
                </div>
              </div>

              <!-- 인사이트 -->
              ${rhythmStats.insights.length > 0 ? `
                <div class="rhythm-insights">
                  <div class="rhythm-chart-title">💡 인사이트</div>
                  ${rhythmStats.insights.map(insight => `
                    <div class="rhythm-insight-item ${insight.type}">
                      <span class="rhythm-insight-icon">${insight.icon}</span>
                      <span class="rhythm-insight-text">${insight.text}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- 복약 통계 (7일/30일) -->
              ${(() => {
                const medSlots = getMedicationSlots();
                if (!medSlots || medSlots.length === 0) return '';

                const today = new Date();
                // 7일 / 30일 통계 함수
                function calcMedStats(days) {
                  let tReq = 0, takenReq = 0, tOpt = 0, takenOpt = 0;
                  for (let i = 0; i < days; i++) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    const ds = getLocalDateStr(d);
                    let dayMeds;
                    if (i === 0 && appState.lifeRhythm.today.date === ds) {
                      dayMeds = appState.lifeRhythm.today.medications || {};
                    } else {
                      const hist = appState.lifeRhythm.history[ds];
                      dayMeds = hist ? (hist.medications || {}) : {};
                    }
                    medSlots.forEach(s => {
                      if (s.required) { tReq++; if (dayMeds[s.id]) takenReq++; }
                      else { tOpt++; if (dayMeds[s.id]) takenOpt++; }
                    });
                  }
                  return {
                    reqRate: tReq > 0 ? Math.round((takenReq / tReq) * 100) : 0,
                    optRate: tOpt > 0 ? Math.round((takenOpt / tOpt) * 100) : 0
                  };
                }

                const w7 = calcMedStats(7);
                const w30 = calcMedStats(30);
                const streak = getMedicationStreak();

                return `
                  <div class="rhythm-work-section" style="margin-top: 16px;">
                    <div class="rhythm-chart-title">💊 복약 통계</div>
                    <div class="rhythm-work-stats">
                      <div class="rhythm-work-stat">
                        <span class="rhythm-work-label">필수 7일</span>
                        <span class="rhythm-work-value ${w7.reqRate >= 80 ? 'good' : ''}">${w7.reqRate}%</span>
                      </div>
                      <div class="rhythm-work-stat">
                        <span class="rhythm-work-label">필수 30일</span>
                        <span class="rhythm-work-value ${w30.reqRate >= 80 ? 'good' : ''}">${w30.reqRate}%</span>
                      </div>
                      <div class="rhythm-work-stat">
                        <span class="rhythm-work-label">선택 7일</span>
                        <span class="rhythm-work-value">${w7.optRate}%</span>
                      </div>
                      <div class="rhythm-work-stat">
                        <span class="rhythm-work-label">연속일</span>
                        <span class="rhythm-work-value ${streak >= 7 ? 'good' : ''}">${streak}일</span>
                      </div>
                    </div>
                  </div>
                `;
              })()}
            </div>
          `;
        })()}

        ${(() => {
          const report = getWeeklyReport();
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const formatDate = (d) => (d.getMonth() + 1) + '/' + d.getDate();

          return `
            <div class="dashboard-section weekly-report">
              <div class="weekly-report-header">
                <div class="weekly-report-title">📅 이번 주 요약</div>
                <div class="weekly-report-period">${formatDate(weekStart)} - ${formatDate(weekEnd)}</div>
              </div>
              <div class="weekly-report-stats">
                <div class="weekly-stat">
                  <div class="weekly-stat-value">${report.thisWeekCount}</div>
                  <div class="weekly-stat-label">완료한 작업</div>
                  ${report.change !== 0 ? `
                    <div class="weekly-stat-change ${report.change > 0 ? 'positive' : 'negative'}">
                      ${report.change > 0 ? '▲' : '▼'} ${Math.abs(report.change)} vs 지난주
                    </div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value positive">${report.bestDay}요일</div>
                  <div class="weekly-stat-label">가장 생산적인 요일</div>
                  ${report.bestDayCount > 0 ? `
                    <div class="weekly-stat-change">${report.bestDayCount}개 완료</div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value">${report.topCategory}</div>
                  <div class="weekly-stat-label">많이 한 카테고리</div>
                  ${report.topCategoryCount > 0 ? `
                    <div class="weekly-stat-change">${report.topCategoryCount}개</div>
                  ` : ''}
                </div>
                <div class="weekly-stat">
                  <div class="weekly-stat-value positive">🔥 ${report.streak}일</div>
                  <div class="weekly-stat-label">연속 달성 스트릭</div>
                </div>
              </div>
            </div>
          `;
        })()}

        ${(() => {
          const filter = appState.habitFilter || 'all';
          const habitTitle = filter === 'all' ? undefined : filter;
          const habitData = getHabitTrackerData(habitTitle);
          const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
          const habits = getRecurringHabits();
          const hs = habitTitle ? (appState.habitStreaks || {})[habitTitle] : null;

          return `
            <div class="dashboard-section habit-tracker">
              <div class="habit-tracker-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <div class="habit-tracker-title" style="margin-bottom:0">🌱 습관 트래커 (최근 12주)</div>
                ${habits.length > 0 ? `
                  <select class="habit-filter-select" onchange="appState.habitFilter=this.value;renderStatic();"
                    style="padding:4px 8px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:14px;max-width:140px;">
                    <option value="all" ${filter === 'all' ? 'selected' : ''}>전체</option>
                    ${habits.map(h => `<option value="${h}" ${filter === h ? 'selected' : ''}>${h}</option>`).join('')}
                  </select>
                ` : ''}
              </div>
              ${hs ? `
                <div style="display:flex;gap:12px;margin-bottom:8px;font-size:14px;color:var(--text-secondary);">
                  <span>🔥 연속 ${hs.current}일</span>
                  <span>🏆 최고 ${hs.best}일</span>
                </div>
              ` : ''}
              <div class="habit-grid">
                ${dayLabels.map((day, dayIdx) => `
                  <div class="habit-day-label">${day}</div>
                  ${habitData.map(week => {
                    const cell = week[dayIdx];
                    return `<div class="habit-cell ${cell.level > 0 ? 'level-' + cell.level : ''} ${cell.isToday ? 'today' : ''}"
                      title="${cell.date}: ${cell.count}개 완료"></div>`;
                  }).join('')}
                `).join('')}
              </div>
              <div class="habit-legend">
                <span>${habitTitle ? '미완료' : '적음'}</span>
                <div class="habit-legend-item"><div class="habit-legend-cell" style="background: var(--bg-tertiary)"></div></div>
                ${habitTitle ? `
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4" style="background: #48bb78"></div></div>
                ` : `
                  <div class="habit-legend-item"><div class="habit-legend-cell level-1" style="background: rgba(72, 187, 120, 0.3)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-2" style="background: rgba(72, 187, 120, 0.5)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-3" style="background: rgba(72, 187, 120, 0.7)"></div></div>
                  <div class="habit-legend-item"><div class="habit-legend-cell level-4" style="background: #48bb78"></div></div>
                `}
                <span>${habitTitle ? '완료' : '많음'}</span>
              </div>
            </div>
          `;
        })()}

        <div class="dashboard-section">
          <div class="dashboard-title">📊 카테고리별 현황</div>
          <div class="category-stats">
            ${categoryStats.map(stat => `
              <div class="category-stat">
                <div class="category-stat-header">
                  <span class="category ${stat.category}">${stat.category}</span>
                  <span class="category-progress">${stat.completed}/${stat.total + stat.completed} 완료</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${stat.category}" style="width: ${stat.percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${urgentTasks.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-title">🚨 마감 임박</div>
            <div class="urgent-list">
              ${urgentTasks.slice(0, 5).map(task => `
                <div class="urgent-item">
                  <div class="urgent-item-title">${escapeHtml(task.title)}</div>
                  <div class="urgent-item-time">⏰ ${formatDeadline(task.deadline)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${(() => {
          const hourlyProd = getHourlyProductivity();
          const catDist = getCategoryDistribution();
          const dayProd = getDayOfWeekProductivity();

          if (hourlyProd.totalCompleted < 3) return '';

          // 시간대별 바 차트 데이터 (주요 시간대만)
          const timeSlots = [
            { label: '아침', count: hourlyProd.periods.morning.count },
            { label: '점심', count: hourlyProd.periods.lunch.count },
            { label: '오후', count: hourlyProd.periods.afternoon.count },
            { label: '저녁', count: hourlyProd.periods.evening.count },
            { label: '밤', count: hourlyProd.periods.night.count }
          ];
          const maxSlot = Math.max(...timeSlots.map(s => s.count), 1);

          // 파이 차트 그라디언트 계산
          const colors = {
            '본업': '#667eea',
            '부업': '#f093fb',
            '일상': '#4ecdc4',
            '가족': '#ffd93d',
            '기타': '#888'
          };
          let gradientParts = [];
          let currentDeg = 0;
          catDist.distribution.forEach(item => {
            const deg = (item.percentage / 100) * 360;
            const color = colors[item.category] || '#888';
            gradientParts.push(color + ' ' + currentDeg + 'deg ' + (currentDeg + deg) + 'deg');
            currentDeg += deg;
          });
          const pieGradient = gradientParts.length > 0
            ? 'conic-gradient(' + gradientParts.join(', ') + ')'
            : 'var(--bg-secondary)';

          // 시간대 바 HTML 생성
          const timeBarsHtml = timeSlots.map(slot =>
            '<div class="insight-bar ' + (slot.count === maxSlot ? 'peak' : '') + '" ' +
            'style="height: ' + Math.max((slot.count / maxSlot) * 100, 8) + '%" ' +
            'title="' + slot.label + ': ' + slot.count + '개"></div>'
          ).join('');

          const timeLabelsHtml = timeSlots.map(slot =>
            '<div class="insight-bar-label">' + slot.label + '</div>'
          ).join('');

          // 요일 바 HTML 생성
          const maxD = Math.max(...dayProd.data.map(x => x.count), 1);
          const dayBarsHtml = dayProd.data.map(d =>
            '<div class="insight-bar ' + (d.count === maxD && d.count > 0 ? 'peak' : '') + '" ' +
            'style="height: ' + Math.max((d.count / maxD) * 100, 8) + '%" ' +
            'title="' + d.name + ': ' + d.count + '개"></div>'
          ).join('');

          const dayLabelsHtml = dayProd.data.map(d =>
            '<div class="insight-bar-label">' + d.name + '</div>'
          ).join('');

          // 카테고리 레전드 HTML 생성
          const legendHtml = catDist.distribution.map(item =>
            '<div class="pie-legend-item">' +
            '<div class="pie-legend-color ' + item.category + '"></div>' +
            '<span>' + item.category + '</span>' +
            '<span class="pie-legend-value">' + item.count + '개 (' + item.percentage + '%)</span>' +
            '</div>'
          ).join('');

          return '<div class="dashboard-section insights-section">' +
            '<div class="insights-title">🔍 나의 생산성 패턴</div>' +

            '<div class="insight-card">' +
            '<div class="insight-header">' +
            '<span class="insight-label">가장 생산적인 시간대</span>' +
            '<span class="insight-value">' + hourlyProd.bestPeriod.name + '</span>' +
            '</div>' +
            '<div class="insight-bar-container">' + timeBarsHtml + '</div>' +
            '<div class="insight-bar-labels">' + timeLabelsHtml + '</div>' +
            '</div>' +

            '<div class="insight-card">' +
            '<div class="insight-header">' +
            '<span class="insight-label">가장 활발한 요일</span>' +
            '<span class="insight-value">' + dayProd.bestDay + '요일 (' + dayProd.bestDayCount + '개)</span>' +
            '</div>' +
            '<div class="insight-bar-container">' + dayBarsHtml + '</div>' +
            '<div class="insight-bar-labels">' + dayLabelsHtml + '</div>' +
            '</div>' +

            (catDist.total > 0 ?
              '<div class="insight-card">' +
              '<div class="insight-header">' +
              '<span class="insight-label">카테고리 분배</span>' +
              '<span class="insight-value">총 ' + catDist.total + '개 완료</span>' +
              '</div>' +
              '<div class="pie-chart-container">' +
              '<div class="pie-chart" style="background: ' + pieGradient + '"></div>' +
              '<div class="pie-legend">' + legendHtml + '</div>' +
              '</div>' +
              '</div>'
            : '') +

            '</div>';
        })()}

        <div class="dashboard-section">
          <div class="dashboard-title">📋 전체 작업 목록</div>
          ${appState.tasks.filter(t => !t.completed).length > 0 ? `
            <div class="task-list show">
              ${appState.tasks.filter(t => !t.completed).map((task, index) => {
                const urgency = getUrgencyLevel(task);
                return `
                <div
                  id="task-dash-${task.id}"
                  class="task-item ${urgency === 'urgent' ? 'urgent' : ''} ${urgency === 'warning' ? 'warning' : ''}"
                  style="--task-cat-color: var(--cat-${task.category})"
                >
                  <div class="task-item-header">
                    <div class="task-item-title">${index + 1}. ${escapeHtml(task.title)}</div>
                  </div>
                  <div class="task-item-meta">
                    <span class="category ${task.category}">${task.category}</span>
                    ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                    ${task.deadline ? ` · ${formatDeadline(task.deadline)}` : ''}
                  </div>
                  <div class="task-item-actions">
                    ${task.link ? `<button class="btn-small go" onclick="handleGo('${escapeAttr(task.link)}')">GO</button>` : ''}
                    <button class="btn-small complete" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">✓</button>
                    <button class="btn-small edit" onclick="editTask('${escapeAttr(task.id)}')" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
                    <button class="btn-small copy" onclick="copyTask('${escapeAttr(task.id)}')">📋</button>
                    <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                  </div>
                </div>
              `}).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">✨</div>
              <div>모든 작업 완료!</div>
            </div>
          `}
        </div>

        ${completedTasks.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-title">✅ 완료한 작업 (${completedTasks.length}개)</div>
            <div class="task-list show">
              ${completedTasks.slice(0, 10).map((task, index) => `
                <div class="task-item completed" style="--task-cat-color: var(--cat-${task.category})">
                  <div class="task-item-header">
                    <div class="task-item-title completed">${index + 1}. ${escapeHtml(task.title)}</div>
                  </div>
                  <div class="task-item-meta">
                    <span class="category ${task.category}">${task.category}</span>
                  </div>
                  <div class="task-item-actions">
                    <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" aria-label="완료 되돌리기">↩️</button>
                    <button class="btn-small delete" onclick="deleteTask('${escapeAttr(task.id)}')" aria-label="작업 삭제">×</button>
                  </div>
                </div>
              `).join('')}
            </div>
            ${completedTasks.length > 10 ? `
              <div style="text-align: center; margin-top: 10px; color: var(--text-secondary); font-size: 16px;">
                최근 10개만 표시 (전체 ${completedTasks.length}개)
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${(() => {
          // 주간/월간/90일 리포트 (completionLog 기반)
          const today = new Date();
          const todayStr = getLocalDateStr(today);
          const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = getLocalDateStr(weekAgo);
          const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
          const monthAgoStr = getLocalDateStr(monthAgo);
          const q90Ago = new Date(today); q90Ago.setDate(q90Ago.getDate() - 90);
          const q90AgoStr = getLocalDateStr(q90Ago);
          const tomorrowStr = getLocalDateStr(new Date(today.getTime() + 86400000));

          const weekEntries = getCompletionLogEntries(weekAgoStr, tomorrowStr);
          const monthEntries = getCompletionLogEntries(monthAgoStr, tomorrowStr);
          const q90Entries = getCompletionLogEntries(q90AgoStr, tomorrowStr);

          const weekRevenue = weekEntries.reduce((sum, e) => sum + (e.rv || 0), 0);
          const monthRevenue = monthEntries.reduce((sum, e) => sum + (e.rv || 0), 0);

          // 카테고리별 분포
          const weekCats = {};
          weekEntries.forEach(e => { weekCats[e.c || '기타'] = (weekCats[e.c || '기타'] || 0) + 1; });

          const formatKRW = (n) => n >= 10000 ? Math.round(n/10000) + '만원' : n.toLocaleString() + '원';

          // 월별 트렌드 (최근 3개월)
          const monthlyTrend = [];
          for (let m = 2; m >= 0; m--) {
            const mStart = new Date(today.getFullYear(), today.getMonth() - m, 1);
            const mEnd = new Date(today.getFullYear(), today.getMonth() - m + 1, 1);
            const mEntries = getCompletionLogEntries(getLocalDateStr(mStart), getLocalDateStr(mEnd));
            const mName = `${mStart.getMonth() + 1}월`;
            monthlyTrend.push({ name: mName, count: mEntries.length, revenue: mEntries.reduce((s, e) => s + (e.rv || 0), 0) });
          }
          const maxMonthCount = Math.max(...monthlyTrend.map(m => m.count), 1);

          return `
            <div class="dashboard-section">
              <div class="dashboard-title">📋 주간/월간 리포트</div>
              <div class="stats" style="margin-bottom: 12px;">
                <div class="stat-card">
                  <div class="stat-value" style="color: #667eea">${weekEntries.length}</div>
                  <div class="stat-label">주간 완료</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #48bb78">${monthEntries.length}</div>
                  <div class="stat-label">월간 완료</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #f093fb">${weekRevenue > 0 ? formatKRW(weekRevenue) : '-'}</div>
                  <div class="stat-label">주간 수익</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #f5576c">${monthRevenue > 0 ? formatKRW(monthRevenue) : '-'}</div>
                  <div class="stat-label">월간 수익</div>
                </div>
              </div>
              ${Object.keys(weekCats).length > 0 ? `
                <div style="font-size: 15px; color: var(--text-secondary); margin-top: 8px;">
                  <strong>주간 카테고리:</strong>
                  ${Object.entries(weekCats).map(([cat, cnt]) => `<span class="category ${cat}" style="margin-left:6px;">${cat} ${cnt}건</span>`).join('')}
                </div>
              ` : ''}
              <div style="font-size: 14px; color: var(--text-muted); margin-top: 6px;">
                일평균: ${(weekEntries.length / 7).toFixed(1)}건/일 (주간) · ${(monthEntries.length / 30).toFixed(1)}건/일 (월간)${q90Entries.length > 0 ? ` · ${(q90Entries.length / 90).toFixed(1)}건/일 (90일)` : ''}
              </div>

              <!-- 월별 트렌드 바 차트 -->
              <div style="margin-top: 12px;">
                <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">📊 월별 완료 트렌드</div>
                ${monthlyTrend.map(m => `
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="width: 30px; font-size: 14px; color: var(--text-secondary);">${m.name}</span>
                    <div style="flex: 1; height: 16px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                      <div style="width: ${Math.round((m.count / maxMonthCount) * 100)}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s;"></div>
                    </div>
                    <span style="width: 50px; font-size: 14px; text-align: right; color: var(--text-secondary);">${m.count}건</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        })()}
        ` : ''}
      </div>

      <!-- 전체 목록 탭 -->
      <div class="tab-content ${appState.currentTab === 'all' ? 'active' : ''}">
        ${appState.currentTab === 'all' ? `
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
        ` : ''}
      </div>

      <!-- 히스토리 탭 -->
      <div class="tab-content ${appState.currentTab === 'history' ? 'active' : ''}">
        ${appState.currentTab === 'history' ? (() => {
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
        })() : ''}
      </div>

      <!-- 온보딩 모달 -->
      ${appState.showOnboarding ? `
        <div class="modal-overlay" onclick="completeOnboarding(false)">
          <div class="modal onboarding-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>👋 Navigator에 오신 것을 환영합니다!</h2>
            </div>
            <div class="modal-body">
              <div class="onboarding-feature">
                <span class="onboarding-icon">🎯</span>
                <div>
                  <strong>자동 우선순위</strong>
                  <p>마감일, 카테고리를 기반으로 가장 중요한 작업을 자동 정렬</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🏷️</span>
                <div>
                  <strong>태그 & 서브태스크</strong>
                  <p>유연한 분류와 큰 작업의 단계별 분해</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🔥</span>
                <div>
                  <strong>연속 달성 스트릭</strong>
                  <p>매일 작업 완료 시 스트릭 증가! 동기부여 UP</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🎯</span>
                <div>
                  <strong>포커스 모드</strong>
                  <p>ADHD 친화적! 가장 중요한 작업 1개만 표시</p>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" onclick="completeOnboarding(true)">
                🚀 샘플 작업으로 시작하기
              </button>
              <button class="btn btn-secondary" onclick="completeOnboarding(false)">
                빈 상태로 시작하기
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 설정 모달 -->
      ${appState.showSettings ? `
        <div class="modal-overlay" onclick="closeSettings()">
          <div class="modal settings-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>⚙️ 설정</h2>
            </div>
            <div class="modal-body">
              <!-- 클라우드 동기화 섹션 -->
              <div class="settings-section">
                <div class="settings-section-title">☁️ 클라우드 동기화</div>
                ${appState.user ? `
                  <div class="user-section">
                    <img class="user-avatar" src="${appState.user.photoURL || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23667eea%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2265%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22white%22>👤</text></svg>'}" alt="프로필">
                    <div class="user-info">
                      <div class="user-name">${appState.user.displayName || '사용자'}</div>
                      <div class="user-email">${appState.user.email}</div>
                      <div id="sync-indicator" class="sync-status ${appState.syncStatus}">
                        <span class="sync-icon">${appState.syncStatus === 'syncing' ? '🔄' : appState.syncStatus === 'synced' ? '✅' : appState.syncStatus === 'error' ? '⚠️' : '☁️'}</span>
                        ${appState.syncStatus === 'syncing' ? '동기화 중...' : appState.syncStatus === 'synced' ? '동기화됨' : appState.syncStatus === 'error' ? '동기화 오류' : '대기 중'}
                      </div>
                    </div>
                    <button class="logout-btn" onclick="logout()">로그아웃</button>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button onclick="forceSync()" style="flex: 1; padding: 10px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 500;">
                      🔄 동기화 갱신
                    </button>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary); text-align: center; margin-top: 8px;">
                    다른 기기에서 같은 계정으로 로그인하면 자동 동기화됩니다
                  </div>
                ` : `
                  <div style="text-align: center; padding: 10px 0;">
                    <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 15px;">
                      Google 계정으로 로그인하면<br>여러 기기에서 동기화할 수 있어요
                    </p>
                    <button class="login-btn" onclick="loginWithGoogle()">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                      Google로 로그인
                    </button>
                  </div>
                `}
              </div>

              <div class="settings-section">
                <div class="settings-section-title">⏰ 시간 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌅</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">목표 기상 시간</span>
                      <span class="settings-label-desc">출근 준비 시작 시간</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.targetWakeTime || '07:00'}"
                    onchange="updateSetting('targetWakeTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🔄</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">하루 시작 시각</span>
                      <span class="settings-label-desc">이 시각 이후 반복 태스크 리셋</span>
                    </div>
                  </div>
                  <select
                    class="settings-input"
                    value="${appState.settings.dayStartHour || 5}"
                    onchange="updateSetting('dayStartHour', parseInt(this.value))"
                  >
                    <option value="3" ${appState.settings.dayStartHour === 3 ? 'selected' : ''}>03:00</option>
                    <option value="4" ${appState.settings.dayStartHour === 4 ? 'selected' : ''}>04:00</option>
                    <option value="5" ${(appState.settings.dayStartHour || 5) === 5 ? 'selected' : ''}>05:00</option>
                    <option value="6" ${appState.settings.dayStartHour === 6 ? 'selected' : ''}>06:00</option>
                    <option value="7" ${appState.settings.dayStartHour === 7 ? 'selected' : ''}>07:00</option>
                  </select>
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🏢</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">출근 시간</span>
                      <span class="settings-label-desc">회사 모드 시작</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.workStartTime || '11:00'}"
                    onchange="updateSetting('workStartTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🚶</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">퇴근 시간</span>
                      <span class="settings-label-desc">회사 모드 종료</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.workEndTime || '20:00'}"
                    onchange="updateSetting('workEndTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌙</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">목표 취침 시간</span>
                      <span class="settings-label-desc">이 시간 전에 잠자리에</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.targetBedtime || '23:00'}"
                    onchange="updateSetting('targetBedtime', this.value)"
                  >
                </div>

                <!-- 타임라인 미리보기 -->
                <div class="settings-time-preview">
                  <div class="settings-time-preview-title">📅 하루 일정 미리보기</div>
                  <div class="settings-time-preview-timeline">
                    <div class="timeline-item">
                      <span class="timeline-icon">🌅</span>
                      <span class="timeline-time">${appState.settings.targetWakeTime || '07:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🏢</span>
                      <span class="timeline-time">${appState.settings.workStartTime || '11:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🚶</span>
                      <span class="timeline-time">${appState.settings.workEndTime || '20:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🌙</span>
                      <span class="timeline-time">${appState.settings.targetBedtime || '23:00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">💊 복약/영양제 설정</div>

                <div style="margin-bottom: 12px;">
                  ${(() => {
                    const medSlots = getMedicationSlots();
                    return medSlots.map((slot, idx) => `
                      <div class="settings-row" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                          <span style="font-size: 18px;">${slot.icon}</span>
                          <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 500;">${escapeHtml(slot.label)}</div>
                            <div style="font-size: 15px; color: var(--text-muted);">${slot.required ? '필수' : '선택'}</div>
                          </div>
                        </div>
                        <div style="display: flex; gap: 4px;">
                          <button class="btn btn-secondary" style="font-size: 15px; padding: 4px 8px;"
                                  onclick="editMedicationSlot(${idx})" aria-label="${escapeHtml(slot.label)} 편집">${svgIcon('edit', 14)}</button>
                          <button class="btn btn-secondary" style="font-size: 15px; padding: 4px 8px; color: var(--danger);"
                                  onclick="deleteMedicationSlot(${idx})" aria-label="${escapeHtml(slot.label)} 삭제">${svgIcon('trash', 14)}</button>
                        </div>
                      </div>
                    `).join('');
                  })()}
                </div>

                <button class="btn btn-secondary" style="width: 100%; font-size: 15px;"
                        onclick="addMedicationSlot()" aria-label="복약 슬롯 추가">
                  ${svgIcon('plus', 16)} 복약 슬롯 추가
                </button>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">🎯 목표 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">📅</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">일일 목표</span>
                      <span class="settings-label-desc">하루에 완료할 작업 수</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    class="settings-input-number"
                    min="1"
                    max="20"
                    value="${appState.settings.dailyGoal}"
                    onchange="updateSetting('dailyGoal', parseInt(this.value) || 5)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">📆</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">주간 목표</span>
                      <span class="settings-label-desc">일주일에 완료할 작업 수</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    class="settings-input-number"
                    min="1"
                    max="100"
                    value="${appState.settings.weeklyGoal}"
                    onchange="updateSetting('weeklyGoal', parseInt(this.value) || 25)"
                  >
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">🔔 알림 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌙</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">취침 알림</span>
                      <span class="settings-label-desc">취침 시간 전 알림 받기</span>
                    </div>
                  </div>
                  <button
                    class="btn-small ${appState.settings.bedtimeReminder ? 'complete' : ''}"
                    onclick="updateSetting('bedtimeReminder', !appState.settings.bedtimeReminder); renderStatic();"
                    style="min-width: 60px;"
                  >
                    ${appState.settings.bedtimeReminder ? 'ON' : 'OFF'}
                  </button>
                </div>

                ${appState.settings.bedtimeReminder ? `
                  <div class="settings-row">
                    <div class="settings-label">
                      <span class="settings-label-icon">⏰</span>
                      <div class="settings-label-text">
                        <span class="settings-label-title">알림 시간</span>
                        <span class="settings-label-desc">취침 몇 분 전에 알림</span>
                      </div>
                    </div>
                    <select
                      class="settings-input"
                      style="width: 100px;"
                      onchange="updateSetting('bedtimeReminderMinutes', parseInt(this.value))"
                    >
                      <option value="15" ${appState.settings.bedtimeReminderMinutes === 15 ? 'selected' : ''}>15분 전</option>
                      <option value="30" ${appState.settings.bedtimeReminderMinutes === 30 ? 'selected' : ''}>30분 전</option>
                      <option value="60" ${appState.settings.bedtimeReminderMinutes === 60 ? 'selected' : ''}>1시간 전</option>
                    </select>
                  </div>
                ` : ''}
              </div>

              <div class="settings-section">
                <div class="settings-section-title">💾 데이터 백업</div>
                <div class="settings-row" style="justify-content: center; gap: 12px;">
                  <button class="backup-btn export" onclick="exportData()" style="flex: 1;">
                    📤 내보내기
                  </button>
                  <button class="backup-btn import" onclick="importData()" style="flex: 1;">
                    📥 가져오기
                  </button>
                </div>
                <div class="settings-label-desc" style="text-align: center; margin-top: 8px; opacity: 0.6;">
                  주기적으로 백업하여 데이터를 안전하게 보관하세요
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <button class="backup-btn" onclick="restoreFromSyncBackup()" style="width: 100%; background: #f5576c22; border-color: #f5576c; color: #f5576c;" aria-label="동기화 백업에서 데이터 복원">
                    🔄 동기화 백업에서 복원
                  </button>
                  <div class="settings-label-desc" style="text-align: center; margin-top: 6px; opacity: 0.5; font-size: 15px;">
                    동기화 중 데이터가 유실된 경우 직전 상태로 복원
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-secondary" onclick="closeSettings(); startFeatureTour();">
                📖 기능 가이드
              </button>
              <button class="btn btn-primary" onclick="closeSettings()">
                ✓ 완료
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // 입력 이벤트 핸들러 등록
  setupInputHandlers();
}

/**
 * 입력 필드 이벤트 핸들러 등록
 */
function setupInputHandlers() {
  const quickInput = document.getElementById('quick-add-input');
  if (quickInput) {
    quickInput.oninput = (e) => {
      appState.quickAddValue = e.target.value;
    };
  }

  if (appState.showDetailedAdd) {
    const inputs = {
      title: document.getElementById('detailed-title'),
      description: document.getElementById('detailed-description'),
      startDate: document.getElementById('detailed-startDate'),
      deadline: document.getElementById('detailed-deadline'),
      time: document.getElementById('detailed-time'),
      revenue: document.getElementById('detailed-revenue'),
      link: document.getElementById('detailed-link'),
      organizer: document.getElementById('detailed-organizer'),
      eventType: document.getElementById('detailed-eventType')
    };

    if (inputs.title) inputs.title.oninput = (e) => appState.detailedTask.title = e.target.value;
    if (inputs.description) inputs.description.oninput = (e) => appState.detailedTask.description = e.target.value;
    if (inputs.startDate) inputs.startDate.onchange = (e) => appState.detailedTask.startDate = e.target.value;
    if (inputs.deadline) inputs.deadline.onchange = (e) => appState.detailedTask.deadline = e.target.value;
    if (inputs.time) inputs.time.oninput = (e) => appState.detailedTask.estimatedTime = parseInt(e.target.value) || 0;
    if (inputs.revenue) inputs.revenue.oninput = (e) => appState.detailedTask.expectedRevenue = e.target.value;
    if (inputs.link) inputs.link.oninput = (e) => appState.detailedTask.link = e.target.value;
    if (inputs.organizer) inputs.organizer.onchange = (e) => appState.detailedTask.organizer = e.target.value;
    if (inputs.eventType) inputs.eventType.onchange = (e) => appState.detailedTask.eventType = e.target.value;

    // 새 태그 입력 핸들러
    const tagInput = document.getElementById('new-tag-input');
    if (tagInput) {
      tagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNewTag(e.target.value);
          e.target.value = '';
        }
      };
    }

    // 서브태스크 입력 핸들러
    const subtaskInput = document.getElementById('new-subtask-input');
    if (subtaskInput) {
      subtaskInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtask(e.target.value);
          e.target.value = '';
        }
      };
    }
  }

  // 파일 임포트 핸들러
  const fileInput = document.getElementById('file-import');
  if (fileInput) {
    fileInput.onchange = handleFileImport;
  }
}

/**
 * 시간만 업데이트 (1초마다)
 */
function updateTime() {
  const now = new Date();
  const hour = now.getHours();
  const bedtime = new Date(now);
  bedtime.setHours(24, 0, 0, 0);
  const minutesUntilBed = Math.floor((bedtime - now) / (1000 * 60));

  const timeEl = document.getElementById('time-value');
  if (timeEl) {
    timeEl.textContent = `${Math.floor(minutesUntilBed / 60)}시간 ${minutesUntilBed % 60}분`;
  }

  // 현재 시간 시계 업데이트
  const clockEl = document.getElementById('current-clock');
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  // 모드 남은 시간 업데이트
  const modeTimeEl = document.getElementById('mode-time-remaining');
  if (modeTimeEl) {
    const mode = getCurrentMode();
    modeTimeEl.textContent = getModeTimeRemaining(mode, hour, now);
  }
}

