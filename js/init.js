// ============================================
// 앱 초기화 (모든 모듈 로드 완료 후)
// ============================================
loadState();

// 알림 권한 상태 확인
if ('Notification' in window) {
  appState.notificationPermission = Notification.permission;
}

// 오프라인 상태 표시
function updateOnlineStatus() {
  let indicator = document.getElementById('offline-indicator');

  if (!navigator.onLine) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.className = 'offline-indicator';
      indicator.innerHTML = '📴 오프라인 모드 - 변경사항은 기기에 저장됩니다';
      document.body.prepend(indicator);
    }
    indicator.classList.remove('hidden');
  } else {
    if (indicator) {
      indicator.classList.add('hidden');
      setTimeout(() => indicator.remove(), 300);
    }
  }
}

window.addEventListener('online', async () => {
  updateOnlineStatus();
  // 온라인 복귀 시 클라우드 먼저 가져와서 병합 → 업로드 (loadFromFirebase 내부에서 syncToFirebase 호출)
  // ⚠️ syncToFirebase만 호출하면 다른 기기의 오프라인 변경사항을 덮어쓰는 위험
  if (appState.user) {
    showToast('온라인 복귀 - 동기화 중...', 'success');
    await loadFromFirebase();
    renderStatic();
  }
});
window.addEventListener('offline', () => {
  updateOnlineStatus();
  showToast('오프라인 모드 - 변경사항은 기기에 저장됩니다', 'warning');
});
updateOnlineStatus();

// 페이지 종료 시 localStorage만 동기 저장 (async Firebase는 브라우저가 기다리지 않음)
window.addEventListener('beforeunload', () => {
  _doSaveStateLocalOnly();
});

renderStatic();
registerServiceWorker();

// 기존 interval 정리 후 재등록 (중복 방지)
if (window._navIntervals) window._navIntervals.forEach(id => clearInterval(id));
window._navIntervals = [
  setInterval(updateTime, 1000),
  setInterval(checkDeadlinesAndNotify, 5 * 60 * 1000), // 5분마다 마감 체크
  // 반복 태스크 일일 초기화: 자정 넘김 감지 (1분마다 날짜 변경 체크)
  setInterval(() => {
    let changed = false;
    if (checkDailyReset()) {
      recomputeTodayStats();
      saveState(); // 모바일에서 beforeunload 미발생 시 데이터 유실 방지
      changed = true;
    }
    if (checkRhythmDayChange()) {
      changed = true;
    }
    if (changed) {
      renderStatic();
      showToast('🔄 새로운 하루! 반복 태스크가 초기화되었습니다', 'info');
    }
  }, 60000)
];
checkDeadlinesAndNotify(); // 초기 실행

// 탭 전환/숨김 시 대기 중인 Firebase 동기화 즉시 실행 + 탭 복귀 시 일일 초기화
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 탭 전환/앱 최소화: 리듬 데이터 로컬 백업 + 대기 중인 Firebase 동기화 즉시 플러시
    localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
    if (appState.user && syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
      _doSyncToFirebase();
    }
  } else {
    // 탭 복귀: 반복 태스크 일일 초기화 체크
    let changed = false;
    if (checkDailyReset()) {
      recomputeTodayStats();
      saveState(); // 모바일에서 beforeunload 미발생 시 데이터 유실 방지
      changed = true;
    }
    if (checkRhythmDayChange()) {
      changed = true;
    }
    if (changed) {
      renderStatic();
      showToast('🔄 새로운 하루! 반복 태스크가 초기화되었습니다', 'info');
    }
    // 탭 활성화 시 동기화 상태 확인 + 데이터 새로고침
    if (appState.user) {
      // 리스너가 죽어있으면 재연결
      if (!unsubscribeSnapshot) {
        console.log('[sync] 탭 활성화 → 리스너 재연결');
        startRealtimeSync();
      }
      // 마지막 동기화로부터 5분 이상 지났으면 강제 새로고침
      const fiveMinutes = 5 * 60 * 1000;
      if (!appState.lastSyncTime || (Date.now() - appState.lastSyncTime.getTime()) > fiveMinutes) {
        console.log('[sync] 탭 활성화 → 데이터 새로고침');
        loadFromFirebase().then(() => {
          recomputeTodayStats();
          renderStatic();
        }).catch(e => console.error('[sync] 새로고침 실패:', e));
      }
    }
  }
});

// 주간 리뷰 체크 (일요일 저녁)
setTimeout(() => checkWeeklyReview(), 3000);

// ============================================
// telegram-event-bot 연동: URL 파라미터 import
// ============================================
function checkUrlImport() {
  const urlParams = new URLSearchParams(window.location.search);
  const importData = urlParams.get('import');
  const autoImport = urlParams.get('autoImport') === 'true';

  if (importData) {
    try {
      // Unicode 안전한 Base64 디코딩
      const decoded = decodeURIComponent(escape(atob(importData)));
      const taskData = JSON.parse(decoded);

      if (autoImport) {
        // 자동 추가 — 확인 모달 없이 바로 Task 생성
        importTaskDirectly(taskData);
      } else {
        showImportConfirmModal(taskData);
      }

      // URL에서 파라미터 제거 (히스토리 정리)
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Import 파싱 오류:', error);
      showToast('잘못된 import 데이터입니다', 'error');
    }
  }
}

// autoImport용 — 확인 없이 바로 Task 추가
function importTaskDirectly(taskData) {
  try {
    const newTask = {
      id: generateId(),
      title: taskData.title || '이벤트 참여',
      category: taskData.category || '부업',
      estimatedTime: taskData.estimatedTime || 10,
      expectedRevenue: taskData.expectedRevenue || null,
      deadline: taskData.deadline || null,
      description: taskData.description || null,
      link: taskData.link || null,
      completed: false,
      pinned: false,
      source: taskData.source || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appState.tasks.unshift(newTask);
    saveState();
    renderStatic();
    showToast('✅ Task가 자동으로 추가되었습니다!', 'success');

    if (appState.user) {
      syncToFirebase();
    }
  } catch (error) {
    console.error('자동 Task 추가 오류:', error);
    showToast('Task 추가 실패', 'error');
  }
}

function showImportConfirmModal(taskData) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'import-confirm-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h2 style="display: flex; align-items: center; gap: 10px;">
          <span>📥</span> 이벤트에서 Task 추가
        </h2>
        <button class="modal-close" onclick="closeImportModal()">&times;</button>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">제목</div>
          <div style="font-size: 1.1rem; font-weight: bold;">${escapeHtml(taskData.title || '제목 없음')}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">카테고리</div>
            <div>${escapeHtml(taskData.category || '부업')}</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">마감일</div>
            <div>${escapeHtml(taskData.deadline || '없음')}</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">예상 시간</div>
            <div>${escapeHtml(String(taskData.estimatedTime || 10))}분</div>
          </div>
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary);">보상</div>
            <div style="color: var(--accent-green);">${escapeHtml(String(taskData.expectedRevenue || '-'))}</div>
          </div>
        </div>

        ${taskData.description ? `
          <div style="background: var(--bg-secondary); border-radius: 8px; padding: 10px; margin-bottom: 15px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 5px;">설명</div>
            <div style="font-size: 0.9rem; max-height: 100px; overflow-y: auto;">${escapeHtml(taskData.description)}</div>
          </div>
        ` : ''}

        ${taskData.link && sanitizeUrl(taskData.link) ? `
          <div style="margin-bottom: 15px;">
            <a href="${escapeHtml(sanitizeUrl(taskData.link))}" target="_blank" rel="noopener" style="color: var(--accent-blue); font-size: 0.9rem;">
              🔗 ${escapeHtml(taskData.link.substring(0, 50))}...
            </a>
          </div>
        ` : ''}

        <div style="background: rgba(74, 158, 255, 0.1); border-radius: 8px; padding: 10px; font-size: 0.85rem; color: var(--text-secondary);">
          📢 출처: ${escapeHtml(taskData.source?.channel || 'telegram-event-bot')}
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 15px 20px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-secondary" onclick="closeImportModal()">취소</button>
        <button class="btn btn-primary" onclick="confirmImportTask()">✅ Task 추가</button>
      </div>
    </div>
  `;

  // 데이터 저장
  modal.dataset.taskData = JSON.stringify(taskData);
  document.body.appendChild(modal);

  // 애니메이션
  requestAnimationFrame(() => modal.classList.add('active'));
}

function closeImportModal() {
  const modal = document.getElementById('import-confirm-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

async function confirmImportTask() {
  const modal = document.getElementById('import-confirm-modal');
  if (!modal) return;

  try {
    const taskData = JSON.parse(modal.dataset.taskData);

    // 새 Task 생성
    const newTask = {
      id: generateId(),
      title: taskData.title || '이벤트 참여',
      category: taskData.category || '부업',
      estimatedTime: taskData.estimatedTime || 10,
      expectedRevenue: taskData.expectedRevenue || null,
      deadline: taskData.deadline || null,
      description: taskData.description || null,
      link: taskData.link || null,
      completed: false,
      pinned: false,
      // telegram-event-bot 연동 정보
      source: taskData.source || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appState.tasks.unshift(newTask);
    saveState();
    renderStatic();

    closeImportModal();
    showToast('✅ Task가 추가되었습니다!', 'success');

    // Firebase 동기화
    if (appState.user) {
      syncToFirebase();
    }
  } catch (error) {
    console.error('Task 추가 오류:', error);
    showToast('Task 추가 실패', 'error');
  }
}

// Task 완료 시 연결된 이벤트 상태 업데이트 (Supabase + Firestore 역동기화)
async function updateLinkedEventStatus(task, participated) {
  if (!task.source || task.source.type !== 'telegram-event') return;

  const eventId = task.source.eventId;
  if (!eventId) return;

  // 1. Supabase REST API로 telegram_messages.participated 업데이트
  try {
    const res = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?id=eq.${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ participated })
      }
    );
    if (res.ok) {
      console.info(`Telegram 이벤트 #${eventId} participated=${participated} 동기화 완료`);
    } else {
      console.warn(`Telegram 이벤트 동기화 실패: ${res.status}`);
    }
  } catch (error) {
    console.error('Telegram 이벤트 Supabase 동기화 실패:', error);
  }

  // 2. Firestore도 업데이트 (로그인 시에만)
  if (!appState.user) return;

  try {
    const userDoc = window.firebaseDoc(window.firebaseDb, 'users', appState.user.uid);
    await window.firebaseRunTransaction(window.firebaseDb, async (transaction) => {
      const docSnap = await transaction.get(userDoc);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const events = Array.isArray(data.events) ? [...data.events] : [];
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) return;

      events[eventIndex] = { ...events[eventIndex], participated };
      transaction.set(userDoc, { events }, { merge: true });
    });
  } catch (error) {
    console.error('Firestore 업데이트 실패:', error);
  }
}

// ============================================
// 텔레그램 이벤트 목록 조회 + 선택 추가
// Supabase REST API로 telegram_messages 직접 조회
// ============================================
const TG_SUPABASE_URL = 'https://hgygyilcrkygnvaquvko.supabase.co';
const TG_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneWd5aWxjcmt5Z252YXF1dmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzE5NDIsImV4cCI6MjA4NDkwNzk0Mn0.iEVFwhZmfpjZqaaZyVVBiwK8GWNWfydXAtN-OaNsjFk';

// 날짜 포맷: YYYY-MM-DD → "2월 15일" (D-day 포함)
function formatTgDeadline(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  let dday = '';
  if (diff < 0) dday = ' <span style="color:#f5576c">D+' + Math.abs(diff) + '</span>';
  else if (diff === 0) dday = ' <span style="color:#f5576c">D-Day</span>';
  else if (diff <= 3) dday = ' <span style="color:#ff9500">D-' + diff + '</span>';
  else dday = ' D-' + diff;
  return month + '월 ' + day + '일' + dday;
}

async function showTelegramEvents() {
  showToast('🤖 텔레그램 이벤트 불러오는 중...', 'info');

  try {
    // 봇 export 기준과 동일: 미참여 + (starred OR deadline 있음) + 미아카이브
    const query = [
      'select=id,content,original_channel,deadline,urls,analysis,starred,participated,date',
      'archived_date=is.null',
      'participated=eq.false',
      'or=(starred.eq.true,deadline.not.is.null)',
      'order=deadline.asc.nullslast,date.desc',
      'limit=50'
    ].join('&');

    const response = await fetch(
      `${TG_SUPABASE_URL}/rest/v1/telegram_messages?${query}`,
      {
        headers: {
          'apikey': TG_SUPABASE_KEY,
          'Authorization': `Bearer ${TG_SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase 응답 오류: ${response.status}`);
    }

    const messages = await response.json();

    // 이미 추가된 eventId 목록
    const importedEventIds = new Set(
      appState.tasks
        .filter(t => t.source && t.source.type === 'telegram-event' && t.source.eventId)
        .map(t => String(t.source.eventId))
    );

    // Navigator 형식으로 변환
    const allEvents = messages.map(msg => {
      const analysis = msg.analysis || {};
      const firstLine = (msg.content || '').split('\n')[0].trim();
      return {
        id: msg.id,
        title: analysis.title || (firstLine.length > 50 ? firstLine.substring(0, 50) : firstLine) || '제목 없음',
        description: analysis.summary || (msg.content || '').substring(0, 200),
        content: (msg.content || '').substring(0, 500),
        category: '부업',
        deadline: msg.deadline,
        link: (msg.urls || [])[0] || null,
        urls: msg.urls || [],
        estimatedTime: analysis.time_minutes || (analysis.time_required ? parseInt(analysis.time_required) || 10 : 10),
        expectedRevenue: analysis.reward_usd ? `$${analysis.reward_usd}` : (analysis.reward || null),
        channel: msg.original_channel,
        project: analysis.project || null,
        organizer: analysis.organizer || null,
        type: analysis.type || null,
        difficulty: analysis.difficulty || null,
        actionItems: analysis.action_items || [],
        starred: msg.starred,
        date: msg.date,
        _imported: importedEventIds.has(String(msg.id))
      };
    });

    const pendingEvents = allEvents.filter(e => !e._imported);
    showTelegramEventsModal(pendingEvents, messages.length);
  } catch (error) {
    console.error('텔레그램 이벤트 조회 실패:', error);
    showToast('이벤트 목록을 불러올 수 없습니다', 'error');
  }
}

function showTelegramEventsModal(pendingEvents, totalCount = 0) {
  // 기존 모달 제거
  const existing = document.getElementById('telegram-events-modal');
  if (existing) existing.remove();

  const importedCount = totalCount - pendingEvents.length;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'telegram-events-modal';

  let listHtml = '';
  if (pendingEvents.length === 0) {
    if (totalCount === 0) {
      // 텔레그램 봇에서 이벤트를 아직 안 보낸 경우
      listHtml = `
        <div class="tg-event-empty">
          <div class="tg-event-empty-icon">🤖</div>
          <div style="font-size: 17px; margin-bottom: 8px;">텔레그램 연동 이벤트가 없습니다</div>
          <div style="font-size: 15px; color: var(--text-muted);">
            텔레그램 봇에서 이벤트를 보내면<br>여기에 자동으로 표시됩니다
          </div>
        </div>`;
    } else {
      // 전부 이미 추가된 경우
      listHtml = `
        <div class="tg-event-empty">
          <div class="tg-event-empty-icon">✅</div>
          <div style="font-size: 17px; margin-bottom: 8px;">모든 이벤트가 추가되었습니다</div>
          <div style="font-size: 15px; color: var(--text-muted);">
            총 ${totalCount}개 이벤트 중 ${importedCount}개 추가 완료
          </div>
        </div>`;
    }
  } else {
    listHtml = `
      <label class="tg-select-all" onclick="toggleAllTelegramEvents(this)">
        <input type="checkbox"> 전체 선택 (${pendingEvents.length}개)
      </label>
      <div class="tg-events-list">
        ${pendingEvents.map((event, i) => {
          const deadlineHtml = event.deadline ? formatTgDeadline(event.deadline) : '';
          const revenue = event.expectedRevenue ? escapeHtml(String(event.expectedRevenue)) : '';
          const channel = event.channel || '';
          const hasDetail = event.description || event.content || (event.actionItems && event.actionItems.length > 0) || (event.urls && event.urls.length > 0);
          return `
            <div class="tg-event-item" data-event-index="${i}">
              <div class="tg-event-row">
                <label class="tg-event-check" onclick="event.stopPropagation()">
                  <input type="checkbox" value="${i}">
                </label>
                <div class="tg-event-info" onclick="toggleTgEventDetail(this.closest('.tg-event-item'))" style="cursor:pointer">
                  <div class="tg-event-title">${event.starred ? '⭐ ' : ''}${escapeHtml(event.title || '제목 없음')}</div>
                  <div class="tg-event-meta">
                    ${deadlineHtml ? '<span>📅 ' + deadlineHtml + '</span>' : ''}
                    ${revenue ? '<span>💰 ' + revenue + '</span>' : ''}
                    ${channel ? '<span>📢 ' + escapeHtml(channel) + '</span>' : ''}
                    ${event.estimatedTime ? '<span>⏱ ' + event.estimatedTime + '분</span>' : ''}
                    ${event.type ? '<span>🏷 ' + escapeHtml(event.type) + '</span>' : ''}
                    ${event.difficulty ? '<span>' + (event.difficulty === 'easy' ? '🟢' : event.difficulty === 'hard' ? '🔴' : '🟡') + ' ' + escapeHtml(event.difficulty) + '</span>' : ''}
                  </div>
                </div>
                ${hasDetail ? '<button class="tg-event-expand" onclick="toggleTgEventDetail(this.closest(\'.tg-event-item\'))" title="상세 보기">▼</button>' : ''}
              </div>
              <div class="tg-event-detail" style="display:none">
                ${event.description ? '<div style="font-size:15px;color:var(--text-secondary);margin-bottom:8px;white-space:pre-line">' + escapeHtml(event.description) + '</div>' : ''}
                ${event.actionItems && event.actionItems.length > 0 ? '<div style="margin-bottom:8px"><div style="font-size:14px;color:var(--text-muted);margin-bottom:4px">할 일:</div>' + event.actionItems.map(a => '<div style="font-size:14px;padding:2px 0">• ' + escapeHtml(a) + '</div>').join('') + '</div>' : ''}
                ${event.urls && event.urls.length > 0 ? '<div style="margin-bottom:4px">' + event.urls.map(u => {
                  const safe = sanitizeUrl(u);
                  if (!safe) return '';
                  return '<a href="' + escapeHtml(safe) + '" target="_blank" rel="noopener" style="font-size:14px;color:var(--accent-blue);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🔗 ' + escapeHtml(String(u).substring(0, 60)) + '</a>';
                }).join('') + '</div>' : ''}
                ${event.project ? '<span style="font-size:14px;color:var(--text-muted)">프로젝트: ' + escapeHtml(event.project) + '</span>' : ''}
                ${event.organizer ? '<span style="font-size:14px;color:var(--text-muted);margin-left:8px">주최: ' + escapeHtml(event.organizer) + '</span>' : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  modal.innerHTML = `
    <div class="modal" style="max-width: 520px;">
      <div class="modal-header">
        <h2 style="display: flex; align-items: center; gap: 10px;">
          <span>🤖</span> 텔레그램 이벤트
        </h2>
        <button class="modal-close" onclick="closeTelegramEventsModal()">&times;</button>
      </div>
      <div class="modal-body" style="padding: 16px;">
        ${totalCount > 0 ? `
          <div style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px;">
            전체 ${totalCount}개 · 추가됨 ${importedCount}개 · 미추가 ${pendingEvents.length}개
          </div>
        ` : ''}
        ${listHtml}
      </div>
      ${pendingEvents.length > 0 ? `
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: space-between; padding: 15px 20px; border-top: 1px solid var(--border-color);">
          <button class="btn" style="color:#f5576c;background:rgba(245,87,108,0.1);border:1px solid rgba(245,87,108,0.3)" onclick="archiveSelectedTelegramEvents()">🗑 선택 삭제</button>
          <div style="display:flex;gap:10px">
            <button class="btn btn-secondary" onclick="closeTelegramEventsModal()">닫기</button>
            <button class="btn btn-primary" onclick="importSelectedTelegramEvents()">✅ 선택 추가</button>
          </div>
        </div>
      ` : `
        <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 15px 20px; border-top: 1px solid var(--border-color);">
          <button class="btn btn-secondary" onclick="closeTelegramEventsModal()">닫기</button>
        </div>
      `}
    </div>
  `;

  // 이벤트 데이터 저장
  modal.dataset.events = JSON.stringify(pendingEvents);
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('active'));
}

async function archiveSelectedTelegramEvents() {
  const modal = document.getElementById('telegram-events-modal');
  if (!modal) return;

  const events = JSON.parse(modal.dataset.events || '[]');
  const checkboxes = modal.querySelectorAll('.tg-events-list input[type="checkbox"]:checked');

  if (checkboxes.length === 0) {
    showToast('삭제할 이벤트를 선택해주세요', 'warning');
    return;
  }

  if (!confirm(`선택한 ${checkboxes.length}개 이벤트를 삭제(아카이브)할까요?`)) return;

  const now = new Date().toISOString();
  let archivedCount = 0;
  let failCount = 0;

  for (const cb of checkboxes) {
    const index = parseInt(cb.value);
    const event = events[index];
    if (!event) continue;

    // 보안상 브라우저에서 Supabase 직접 PATCH는 차단 (서버 프록시 경유 필요)
    console.info('Supabase 직접 아카이브는 비활성화됨:', event.id, now);
    failCount++;
  }

  if (archivedCount > 0) {
    showToast(`🗑 ${archivedCount}개 삭제 완료${failCount > 0 ? ' (' + failCount + '개 실패)' : ''}`, 'success');
    // 모달 닫고 새로고침
    closeTelegramEventsModal();
    setTimeout(() => showTelegramEvents(), 300);
  } else {
    showToast('보안 설정으로 직접 삭제가 차단되었습니다. 서버 프록시를 연결해주세요.', 'error');
  }
}

function closeTelegramEventsModal() {
  const modal = document.getElementById('telegram-events-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}

function toggleTgEventDetail(item) {
  const detail = item.querySelector('.tg-event-detail');
  const expand = item.querySelector('.tg-event-expand');
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if (expand) expand.textContent = isOpen ? '▼' : '▲';
}

function toggleAllTelegramEvents(label) {
  const checkbox = label.querySelector('input[type="checkbox"]');
  const modal = document.getElementById('telegram-events-modal');
  if (!modal) return;
  // label onclick은 체크박스 토글 전에 실행됨 → 반전된 값 사용
  const newState = !checkbox.checked;
  const checkboxes = modal.querySelectorAll('.tg-events-list input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = newState; });
}

async function importSelectedTelegramEvents() {
  const modal = document.getElementById('telegram-events-modal');
  if (!modal) return;

  const events = JSON.parse(modal.dataset.events || '[]');
  const checkboxes = modal.querySelectorAll('.tg-events-list input[type="checkbox"]:checked');

  if (checkboxes.length === 0) {
    showToast('추가할 이벤트를 선택해주세요', 'warning');
    return;
  }

  let addedCount = 0;
  checkboxes.forEach(cb => {
    const index = parseInt(cb.value);
    const event = events[index];
    if (!event) return;

    const newTask = {
      id: generateId(),
      title: event.title || '이벤트 참여',
      category: event.category || '부업',
      estimatedTime: event.estimatedTime || 10,
      expectedRevenue: event.expectedRevenue || null,
      deadline: event.deadline || null,
      description: event.description || null,
      link: event.link || null,
      completed: false,
      pinned: false,
      // telegram-event-bot exportToNavigator 형식과 동일
      source: {
        type: 'telegram-event',
        eventId: event.id,
        channel: event.channel || 'telegram',
        project: event.project || null,
        organizer: event.organizer || null
      },
      createdAt: new Date().toISOString()
    };

    appState.tasks.unshift(newTask);
    addedCount++;
  });

  if (addedCount > 0) {
    saveState();
    renderStatic();
    closeTelegramEventsModal();
    showToast(`✅ ${addedCount}개 이벤트가 추가되었습니다!`, 'success');

    if (appState.user) {
      syncToFirebase();
    }
  }
}

// 전역 함수 노출
window.showTelegramEvents = showTelegramEvents;
window.closeTelegramEventsModal = closeTelegramEventsModal;
window.toggleAllTelegramEvents = toggleAllTelegramEvents;
window.toggleTgEventDetail = toggleTgEventDetail;
window.importSelectedTelegramEvents = importSelectedTelegramEvents;
window.archiveSelectedTelegramEvents = archiveSelectedTelegramEvents;
window.closeImportModal = closeImportModal;
window.confirmImportTask = confirmImportTask;

// URL import 체크 (Firebase 로드 후 실행)
setTimeout(checkUrlImport, 500);

// Firebase 인증 상태 리스너
window.addEventListener('firebase-ready', () => {
  // URL import 파라미터 확인 (telegram-event-bot 연동)
  checkUrlImport();

  // 오프라인/타임아웃 대비: 5초 후에도 클라우드 로드가 안 됐으면 로컬 기반으로 checkDailyReset 실행
  setTimeout(() => {
    if (!initialCloudLoadComplete) {
      initialCloudLoadComplete = true;
      console.warn('[daily-reset] 클라우드 로드 타임아웃 → 로컬 데이터 기반으로 checkDailyReset 실행');
      const resetDone = checkDailyReset();
      if (resetDone) {
        recomputeTodayStats();
        saveState();
        renderStatic();
      }
    }
  }, 5000);

  window.firebaseOnAuthStateChanged(window.firebaseAuth, async (user) => {
    if (user) {
      appState.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };

      // 클라우드 데이터 로드 및 실시간 동기화 시작
      // (loadFromFirebase 내부에서 initialCloudLoadComplete=true + checkDailyReset 호출)
      await loadFromFirebase();
      startRealtimeSync();

      renderStatic();
    } else {
      // 비로그인: 클라우드 로드 없이 로컬 기반으로 checkDailyReset 실행
      if (!initialCloudLoadComplete) {
        initialCloudLoadComplete = true;
        const resetDone = checkDailyReset();
        if (resetDone) {
          recomputeTodayStats();
          saveState();
        }
        console.log('[daily-reset] 비로그인 → 로컬 기반 checkDailyReset 실행');
      }
      appState.user = null;
      appState.syncStatus = 'offline';
      renderStatic();
    }
  });
});
