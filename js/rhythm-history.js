/**
 * 라이프 리듬 히스토리 모듈
 * rhythm.js에서 분리 — 히스토리 뷰 전환, 렌더링, 수정, 추가
 *
 * 의존성 (메인 HTML / 다른 모듈에서 제공):
 *   appState, renderStatic, showToast, escapeHtml, escapeAttr,
 *   getLocalDateStr, getLogicalDate,
 *   getMedicationSlots (rhythm-medication.js),
 *   renderRhythmStats (rhythm-stats.js),
 *   saveLifeRhythm (rhythm.js),
 *   _rhythmStatsVisible (rhythm.js)
 */

// ============================================
// 라이프 리듬 히스토리
// ============================================

/**
 * 히스토리 뷰 전환
 */
function setHistoryView(view) {
  appState.historyView = view;
  renderStatic();
}
window.setHistoryView = setHistoryView;

/**
 * 라이프 리듬 히스토리 렌더링 (6개 항목)
 */
function renderLifeRhythmHistory() {
  var now = new Date();
  var logicalToday = getLogicalDate();
  var records = [];

  // 시간을 분으로 변환
  var toMins = function(t) { if (!t || typeof t !== 'string') return null; var p = t.split(':'); if (p.length !== 2) return null; var h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };
  var formatDur = function(mins) {
    if (!mins || mins <= 0) return null;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h ' + m + 'm';
  };

  // 최근 30일 기록 수집
  for (var i = 0; i < 30; i++) {
    var date = new Date(now);
    date.setDate(now.getDate() - i);
    var dateStr = getLocalDateStr(date);
    var isToday = (dateStr === logicalToday);

    var dayData;
    if (isToday && appState.lifeRhythm.today.date === logicalToday) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = appState.lifeRhythm.history[dateStr];
    }

    // 기존 데이터 마이그레이션
    if (dayData) {
      if (dayData.workStart && !dayData.workArrive) dayData.workArrive = dayData.workStart;
      if (dayData.workEnd && !dayData.workDepart) dayData.workDepart = dayData.workEnd;
    }

    // 데이터가 있거나, 히스토리에 명시적으로 추가된 날짜면 표시
    var hasMedData = dayData && dayData.medications && Object.values(dayData.medications).some(function(v) { return v; });
    var hasAnyData = dayData && (dayData.wakeUp || dayData.homeDepart || dayData.workArrive || dayData.workDepart || dayData.homeArrive || dayData.sleep || hasMedData);
    var isExplicitlyAdded = !isToday && appState.lifeRhythm.history.hasOwnProperty(dateStr);
    if (hasAnyData || isExplicitlyAdded) {
      // 수면 시간 계산
      var sleepDuration = null;
      if (i < 29) {
        var prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        var prevDateStr = getLocalDateStr(prevDate);
        var prevData = appState.lifeRhythm.history[prevDateStr] || {};
        if (prevData.sleep && dayData.wakeUp) {
          var sleepTime = toMins(prevData.sleep);
          var wakeTime = toMins(dayData.wakeUp);
          var duration = wakeTime + (24 * 60 - sleepTime);
          if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
          if (duration > 0 && duration < 16 * 60) {
            sleepDuration = formatDur(duration);
          }
        }
      }

      // 근무 시간 계산
      var workDuration = null;
      var workArr = dayData.workArrive;
      var workDep = dayData.workDepart;
      if (workArr && workDep) {
        var dur = toMins(workDep) - toMins(workArr);
        if (dur > 0) workDuration = formatDur(dur);
      }

      // 출근 통근시간
      var commuteToWork = null;
      if (dayData.homeDepart && dayData.workArrive) {
        var dur2 = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
        if (dur2 > 0 && dur2 < 180) commuteToWork = dur2 + '분';
      }

      // 퇴근 통근시간
      var commuteToHome = null;
      if (dayData.workDepart && dayData.homeArrive) {
        var dur3 = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
        if (dur3 > 0 && dur3 < 180) commuteToHome = dur3 + '분';
      }

      // 총 외출시간
      var totalOut = null;
      if (dayData.homeDepart && dayData.homeArrive) {
        var dur4 = toMins(dayData.homeArrive) - toMins(dayData.homeDepart);
        if (dur4 > 0) totalOut = formatDur(dur4);
      }

      // 완료한 작업 수 (completionLog 기반)
      var completedTasks = ((appState.completionLog || {})[dateStr] || []).length;

      records.push({
        date: dateStr,
        dayLabel: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
        dateLabel: (date.getMonth() + 1) + '/' + date.getDate(),
        isToday: isToday,
        wakeUp: dayData.wakeUp,
        homeDepart: dayData.homeDepart,
        workArrive: dayData.workArrive,
        workDepart: dayData.workDepart,
        homeArrive: dayData.homeArrive,
        sleep: dayData.sleep,
        medications: dayData.medications || {},
        sleepDuration: sleepDuration,
        workDuration: workDuration,
        commuteToWork: commuteToWork,
        commuteToHome: commuteToHome,
        totalOut: totalOut,
        completedTasks: completedTasks
      });
    }
  }

  // 날짜 추가 버튼
  var addDateBtn = '<div class="rhythm-history-add-date" style="text-align: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
    '<button onclick="addRhythmHistoryDate()" class="btn btn-secondary" style="font-size: 13px; padding: 8px 16px;" aria-label="과거 날짜 기록 추가">' +
      '📅 과거 날짜 추가' +
    '</button>' +
  '</div>';

  // 통계 버튼
  var statsBtn = '<div style="text-align: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
    '<button onclick="toggleRhythmStats()" class="btn btn-secondary" style="font-size: 13px; padding: 8px 16px;" aria-label="30일 통계 보기">' +
      (_rhythmStatsVisible ? '📊 통계 숨기기' : '📊 30일 통계') +
    '</button>' +
  '</div>';

  // 통계 섹션
  var statsSection = renderRhythmStats();

  if (records.length === 0) {
    return addDateBtn + statsBtn + statsSection + '<div class="rhythm-history-empty"><div class="rhythm-history-empty-icon">😴</div><div>기록이 없습니다</div><div style="font-size: 13px; margin-top: 8px;">오늘 탭에서 리듬을 기록해보세요</div></div>';
  }

  return addDateBtn + statsBtn + statsSection + '<div class="rhythm-history-list">' + records.map(function(r) {
    return '<div class="rhythm-history-item ' + (r.isToday ? 'today' : '') + '">' +
      '<div class="rhythm-history-date">' +
        '<span class="rhythm-history-day">' + r.dayLabel + '</span>' +
        '<span class="rhythm-history-date-num">' + r.dateLabel + '</span>' +
        (r.isToday ? '<span class="rhythm-history-today-badge">오늘</span>' : '') +
      '</div>' +
      '<div class="rhythm-history-timeline six-items">' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'wakeUp\')" title="기상">' + (r.wakeUp ? '☀️' + r.wakeUp : '<span class="empty">☀️--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'homeDepart\')" title="집출발">' + (r.homeDepart ? '🚶' + r.homeDepart : '<span class="empty">🚶--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'workArrive\')" title="근무시작">' + (r.workArrive ? '🏢' + r.workArrive : '<span class="empty">🏢--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'workDepart\')" title="근무종료">' + (r.workDepart ? '🚀' + r.workDepart : '<span class="empty">🚀--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'homeArrive\')" title="집도착">' + (r.homeArrive ? '🏠' + r.homeArrive : '<span class="empty">🏠--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'sleep\')" title="취침">' + (r.sleep ? '🌙' + r.sleep : '<span class="empty">🌙--:--</span>') + '</span>' +
      '</div>' +
      // 복약 히스토리 행
      (function() {
        var medSlots = getMedicationSlots();
        if (!medSlots || medSlots.length === 0) return '';
        var meds = r.medications || {};
        var hasMedData = medSlots.some(function(s) { return meds[s.id]; });
        if (!hasMedData && !r.isToday) return '';
        return '<div class="rhythm-history-meds">' +
          medSlots.map(function(s) {
            var taken = !!meds[s.id];
            return '<span class="rhythm-history-med ' + (taken ? 'taken' : 'missed') + '" ' +
              'onclick="editMedicationHistory(\'' + escapeAttr(r.date) + '\', \'' + escapeAttr(s.id) + '\')" ' +
              'title="' + escapeHtml(s.label) + (taken ? ' ' + meds[s.id] : '') + '">' +
              s.icon + (taken ? '✓' : '-') +
            '</span>';
          }).join('') +
        '</div>';
      })() +
      '<div class="rhythm-history-summary">' +
        (r.sleepDuration ? '<span>💤' + r.sleepDuration + '</span>' : '') +
        (r.commuteToWork ? '<span>🚌' + r.commuteToWork + '</span>' : '') +
        (r.workDuration ? '<span>💼' + r.workDuration + '</span>' : '') +
        (r.commuteToHome ? '<span>🏠' + r.commuteToHome + '</span>' : '') +
        (r.totalOut ? '<span class="total">📍' + r.totalOut + '</span>' : '') +
        (r.completedTasks > 0 ? '<span>✅' + r.completedTasks + '개</span>' : '') +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
}

/**
 * 과거 날짜 라이프 리듬 수정 (6개 항목)
 */
function editLifeRhythmHistory(dateStr, type) {
  var today = getLogicalDate();
  var currentValue;

  if (dateStr === today && appState.lifeRhythm.today.date === today) {
    currentValue = appState.lifeRhythm.today[type];
  } else {
    var hist = appState.lifeRhythm.history[dateStr];
    currentValue = hist ? hist[type] : undefined;
  }

  var labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '근무시작', workDepart: '근무종료', homeArrive: '집도착', sleep: '취침' };
  var newTime = prompt(dateStr + ' ' + labels[type] + ' 시간을 입력하세요 (HH:MM):', currentValue || '');

  if (newTime === null) return;

  // 시간 형식 검증
  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 07:30)', 'error');
    return;
  }

  // 시간 정규화
  var normalizedTime = null;
  if (newTime) {
    var parts = newTime.split(':');
    normalizedTime = parts[0].padStart(2, '0') + ':' + parts[1];
  }

  // 저장
  if (dateStr === today) {
    if (appState.lifeRhythm.today.date !== today) {
      appState.lifeRhythm.today = { date: today, wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
    }
    appState.lifeRhythm.today[type] = normalizedTime;
  } else {
    if (!appState.lifeRhythm.history[dateStr]) {
      appState.lifeRhythm.history[dateStr] = { wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
    }
    appState.lifeRhythm.history[dateStr][type] = normalizedTime;
    // 히스토리 항목 수정 시점 기록 — 기기 간 병합에서 최신 판별용
    appState.lifeRhythm.history[dateStr].updatedAt = new Date().toISOString();
  }

  saveLifeRhythm();
  renderStatic();
  showToast(labels[type] + ' 시간이 수정되었습니다', 'success');
}
window.editLifeRhythmHistory = editLifeRhythmHistory;

/**
 * 과거 날짜 라이프 리듬 추가
 * 히스토리에 없는 날짜를 수동으로 추가
 */
function addRhythmHistoryDate() {
  var dateStr = prompt('추가할 날짜를 입력하세요 (YYYY-MM-DD):', '');
  if (!dateStr) return;

  // 날짜 형식 검증
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    showToast('올바른 날짜 형식이 아닙니다 (예: 2026-02-04)', 'error');
    return;
  }

  // 유효한 날짜인지 확인
  var date = new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) {
    showToast('유효하지 않은 날짜입니다', 'error');
    return;
  }

  // 미래 날짜 차단
  var today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    showToast('미래 날짜는 추가할 수 없습니다', 'error');
    return;
  }

  // 이미 데이터가 있으면 알림
  var localDateStr = getLocalDateStr(date);
  if (appState.lifeRhythm.history[localDateStr]) {
    showToast('이미 기록이 있는 날짜입니다. 해당 날짜를 클릭해서 수정하세요.', 'info');
    return;
  }

  // 빈 레코드 추가
  appState.lifeRhythm.history[localDateStr] = {
    wakeUp: null,
    homeDepart: null,
    workArrive: null,
    workDepart: null,
    homeArrive: null,
    sleep: null,
    medications: {}
  };

  saveLifeRhythm();
  renderStatic();
  showToast('📅 ' + localDateStr + ' 날짜가 추가되었습니다. 시간을 클릭해서 입력하세요.', 'success');
}
window.addRhythmHistoryDate = addRhythmHistoryDate;

/**
 * 과거 날짜 복약 기록 편집
 */
function editMedicationHistory(dateStr, slotId) {
  var today = getLogicalDate();
  var slots = getMedicationSlots();
  var slot = slots.find(function(s) { return s.id === slotId; });
  var label = slot ? slot.label : slotId;

  var currentValue;
  if (dateStr === today && appState.lifeRhythm.today.date === today) {
    currentValue = (appState.lifeRhythm.today.medications || {})[slotId];
  } else {
    var hist = appState.lifeRhythm.history[dateStr];
    currentValue = hist ? (hist.medications || {})[slotId] : null;
  }

  var newTime = prompt(dateStr + ' ' + label + ' 복용 시간 (HH:MM, 빈칸=삭제):', currentValue || '');
  if (newTime === null) return;

  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 08:30)', 'error');
    return;
  }

  var normalizedTime = null;
  if (newTime) {
    var parts = newTime.split(':');
    normalizedTime = parts[0].padStart(2, '0') + ':' + parts[1];
  }

  if (dateStr === today) {
    if (appState.lifeRhythm.today.date !== today) {
      appState.lifeRhythm.today = { date: today, wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
    }
    if (!appState.lifeRhythm.today.medications) appState.lifeRhythm.today.medications = {};
    appState.lifeRhythm.today.medications[slotId] = normalizedTime;
  } else {
    if (!appState.lifeRhythm.history[dateStr]) {
      appState.lifeRhythm.history[dateStr] = { wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };
    }
    if (!appState.lifeRhythm.history[dateStr].medications) appState.lifeRhythm.history[dateStr].medications = {};
    appState.lifeRhythm.history[dateStr].medications[slotId] = normalizedTime;
    // 히스토리 항목 수정 시점 기록
    appState.lifeRhythm.history[dateStr].updatedAt = new Date().toISOString();
  }

  saveLifeRhythm();
  renderStatic();
  showToast(label + ' 복용 기록이 수정되었습니다', 'success');
}
window.editMedicationHistory = editMedicationHistory;
