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
 * 라이프 리듬 히스토리 렌더링 — 캘린더 + 단일 상세 뷰
 */
function renderLifeRhythmHistory() {
  var now = new Date();
  var logicalToday = getLogicalDate();

  // 시간을 분으로 변환
  var toMins = function(t) { if (!t || typeof t !== 'string') return null; var p = t.split(':'); if (p.length !== 2) return null; var h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };
  var formatDur = function(mins) {
    if (!mins || mins <= 0) return null;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h ' + m + 'm';
  };

  // 30일 기록 맵 구축
  var recordMap = {};
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

    if (dayData) {
      if (dayData.workStart && !dayData.workArrive) dayData.workArrive = dayData.workStart;
      if (dayData.workEnd && !dayData.workDepart) dayData.workDepart = dayData.workEnd;
    }

    var hasMedData = dayData && dayData.medications && Object.values(dayData.medications).some(function(v) { return v; });
    var hasAnyData = dayData && (dayData.wakeUp || dayData.homeDepart || dayData.workArrive || dayData.workDepart || dayData.homeArrive || dayData.sleep || hasMedData);
    var isExplicitlyAdded = !isToday && appState.lifeRhythm.history.hasOwnProperty(dateStr);
    if (hasAnyData || isExplicitlyAdded) {
      recordMap[dateStr] = dayData;
    }
  }

  // 선택된 날짜 (기본: 오늘)
  var selectedDate = appState.rhythmHistoryDate || logicalToday;
  // 선택된 날짜가 유효한지 확인
  var selectedData = recordMap[selectedDate] || null;

  // 날짜 추가 / 통계 버튼
  var toolbarHtml = '<div class="rhythm-history-toolbar">' +
    '<button onclick="addRhythmHistoryDate()" class="btn btn-secondary btn-sm" aria-label="과거 날짜 기록 추가">📅 날짜 추가</button>' +
    '<button onclick="toggleRhythmStats()" class="btn btn-secondary btn-sm" aria-label="30일 통계 보기">' +
      (_rhythmStatsVisible ? '📊 통계 숨기기' : '📊 30일 통계') +
    '</button>' +
  '</div>';

  // 통계 섹션
  var statsSection = renderRhythmStats();

  // --- 최근 7일 요약 미니 차트 ---
  var recentHtml = '<div class="rhythm-recent-strip">';
  recentHtml += '<div class="rhythm-recent-title">최근 7일</div>';
  recentHtml += '<div class="rhythm-recent-days">';
  for (var d = 6; d >= 0; d--) {
    var rDate = new Date(now);
    rDate.setDate(now.getDate() - d);
    var rStr = getLocalDateStr(rDate);
    var rData = recordMap[rStr];
    var dayLabel = ['일','월','화','수','목','금','토'][rDate.getDay()];
    var wakeVal = rData ? (rData.wakeUp || '--:--') : '--:--';
    var sleepVal = rData ? (rData.sleep || '--:--') : '--:--';
    var hasData = rData && (rData.wakeUp || rData.sleep);
    var isSelected = rStr === selectedDate;
    recentHtml += '<div class="rhythm-recent-day' + (isSelected ? ' selected' : '') + (d === 0 ? ' today' : '') + '" onclick="selectRhythmDate(\'' + rStr + '\')">' +
      '<span class="rhythm-recent-day-label">' + dayLabel + '</span>' +
      '<span class="rhythm-recent-wake' + (hasData ? '' : ' empty') + '">☀️' + wakeVal + '</span>' +
      '<span class="rhythm-recent-sleep' + (hasData ? '' : ' empty') + '">🌙' + sleepVal + '</span>' +
    '</div>';
  }
  recentHtml += '</div></div>';

  // --- 미니 캘린더 (30일) ---
  var calViewYear = appState.rhythmCalYear !== undefined ? appState.rhythmCalYear : now.getFullYear();
  var calViewMonth = appState.rhythmCalMonth !== undefined ? appState.rhythmCalMonth : now.getMonth();
  var calFirst = new Date(calViewYear, calViewMonth, 1);
  var calLast = new Date(calViewYear, calViewMonth + 1, 0);
  var calDaysInMonth = calLast.getDate();
  var calStartDow = calFirst.getDay();
  var monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  var calendarHtml = '<div class="calendar-container rhythm-calendar">' +
    '<div class="calendar-header">' +
      '<span class="calendar-title">' + calViewYear + '년 ' + monthNames[calViewMonth] + '</span>' +
      '<div class="calendar-nav">' +
        '<button class="calendar-nav-btn" onclick="navigateRhythmCal(-1)" aria-label="이전 달">&lt;</button>' +
        '<button class="calendar-nav-btn" onclick="navigateRhythmCal(1)" aria-label="다음 달">&gt;</button>' +
      '</div>' +
    '</div>' +
    '<div class="calendar-weekdays">' +
      ['일','월','화','수','목','금','토'].map(function(d) { return '<span class="calendar-weekday">' + d + '</span>'; }).join('') +
    '</div>' +
    '<div class="calendar-days">';

  for (var e = 0; e < calStartDow; e++) calendarHtml += '<div class="calendar-day empty"></div>';
  for (var cd = 1; cd <= calDaysInMonth; cd++) {
    var cdStr = calViewYear + '-' + String(calViewMonth + 1).padStart(2,'0') + '-' + String(cd).padStart(2,'0');
    var cdIsToday = cdStr === logicalToday;
    var cdIsSelected = cdStr === selectedDate;
    var cdHasData = !!recordMap[cdStr];
    var cdClasses = 'calendar-day' + (cdIsToday ? ' today' : '') + (cdIsSelected ? ' selected' : '') + (cdHasData ? ' has-activity' : '');
    calendarHtml += '<div class="' + cdClasses + '" onclick="selectRhythmDate(\'' + cdStr + '\')">' +
      '<span class="calendar-day-number">' + cd + '</span>' +
      (cdHasData ? '<span class="calendar-day-dot"></span>' : '') +
    '</div>';
  }
  calendarHtml += '</div></div>';

  // --- 선택된 날짜 상세 ---
  var detailHtml = '';
  if (selectedData) {
    var selDate = new Date(selectedDate + 'T12:00:00');
    var selDayLabel = ['일','월','화','수','목','금','토'][selDate.getDay()];
    var selDateLabel = (selDate.getMonth() + 1) + '/' + selDate.getDate();
    var selIsToday = selectedDate === logicalToday;

    // 수면 시간 계산
    var selSleepDuration = null;
    var prevD = new Date(selDate);
    prevD.setDate(prevD.getDate() - 1);
    var prevDStr = getLocalDateStr(prevD);
    var prevDData = appState.lifeRhythm.history[prevDStr] || {};
    if (prevDData.sleep && selectedData.wakeUp) {
      var st = toMins(prevDData.sleep);
      var wt = toMins(selectedData.wakeUp);
      var dur = wt + (24 * 60 - st);
      if (st < 12 * 60) dur = wt - st;
      if (dur > 0 && dur < 16 * 60) selSleepDuration = formatDur(dur);
    }

    // 근무/통근 계산
    var selWorkDuration = null;
    if (selectedData.workArrive && selectedData.workDepart) {
      var wd = toMins(selectedData.workDepart) - toMins(selectedData.workArrive);
      if (wd > 0) selWorkDuration = formatDur(wd);
    }
    var selCommuteToWork = null;
    if (selectedData.homeDepart && selectedData.workArrive) {
      var ct = toMins(selectedData.workArrive) - toMins(selectedData.homeDepart);
      if (ct > 0 && ct < 180) selCommuteToWork = ct + '분';
    }
    var selCommuteToHome = null;
    if (selectedData.workDepart && selectedData.homeArrive) {
      var ch = toMins(selectedData.homeArrive) - toMins(selectedData.workDepart);
      if (ch > 0 && ch < 180) selCommuteToHome = ch + '분';
    }
    var selTotalOut = null;
    if (selectedData.homeDepart && selectedData.homeArrive) {
      var to = toMins(selectedData.homeArrive) - toMins(selectedData.homeDepart);
      if (to > 0) selTotalOut = formatDur(to);
    }
    var selCompletedTasks = ((appState.completionLog || {})[selectedDate] || []).length;

    detailHtml = '<div class="rhythm-history-item ' + (selIsToday ? 'today' : '') + '">' +
      '<div class="rhythm-history-date">' +
        '<span class="rhythm-history-day">' + selDayLabel + '</span>' +
        '<span class="rhythm-history-date-num">' + selDateLabel + '</span>' +
        (selIsToday ? '<span class="rhythm-history-today-badge">오늘</span>' : '') +
      '</div>' +
      '<div class="rhythm-history-timeline six-items">' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'wakeUp\')" title="기상">' + (selectedData.wakeUp ? '☀️' + selectedData.wakeUp : '<span class="empty">☀️--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'homeDepart\')" title="집출발">' + (selectedData.homeDepart ? '🚶' + selectedData.homeDepart : '<span class="empty">🚶--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'workArrive\')" title="근무시작">' + (selectedData.workArrive ? '🏢' + selectedData.workArrive : '<span class="empty">🏢--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'workDepart\')" title="근무종료">' + (selectedData.workDepart ? '🚀' + selectedData.workDepart : '<span class="empty">🚀--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'homeArrive\')" title="집도착">' + (selectedData.homeArrive ? '🏠' + selectedData.homeArrive : '<span class="empty">🏠--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(selectedDate) + '\', \'sleep\')" title="취침">' + (selectedData.sleep ? '🌙' + selectedData.sleep : '<span class="empty">🌙--:--</span>') + '</span>' +
      '</div>' +
      (function() {
        var medSlots = getMedicationSlots();
        if (!medSlots || medSlots.length === 0) return '';
        var meds = selectedData.medications || {};
        var hasMedData = medSlots.some(function(s) { return meds[s.id]; });
        if (!hasMedData && !selIsToday) return '';
        return '<div class="rhythm-history-meds">' +
          medSlots.map(function(s) {
            var taken = !!meds[s.id];
            return '<span class="rhythm-history-med ' + (taken ? 'taken' : 'missed') + '" ' +
              'onclick="editMedicationHistory(\'' + escapeAttr(selectedDate) + '\', \'' + escapeAttr(s.id) + '\')" ' +
              'title="' + escapeHtml(s.label) + (taken ? ' ' + meds[s.id] : '') + '">' +
              s.icon + (taken ? '✓' : '-') +
            '</span>';
          }).join('') +
        '</div>';
      })() +
      '<div class="rhythm-history-summary">' +
        (selSleepDuration ? '<span>💤' + selSleepDuration + '</span>' : '') +
        (selCommuteToWork ? '<span>🚌' + selCommuteToWork + '</span>' : '') +
        (selWorkDuration ? '<span>💼' + selWorkDuration + '</span>' : '') +
        (selCommuteToHome ? '<span>🏠' + selCommuteToHome + '</span>' : '') +
        (selTotalOut ? '<span class="total">📍' + selTotalOut + '</span>' : '') +
        (selCompletedTasks > 0 ? '<span>✅' + selCompletedTasks + '개</span>' : '') +
      '</div>' +
    '</div>';
  } else {
    detailHtml = '<div class="rhythm-history-item">' +
      '<div style="text-align: center; padding: 20px; color: var(--text-muted);">' +
        '<div style="font-size: 24px; margin-bottom: 8px;">📋</div>' +
        '<div>' + selectedDate + ' 기록 없음</div>' +
        '<div style="font-size: 13px; margin-top: 4px;">캘린더에서 기록이 있는 날짜를 선택하세요</div>' +
      '</div>' +
    '</div>';
  }

  return toolbarHtml + statsSection + recentHtml + calendarHtml + detailHtml;
}

/**
 * 리듬 히스토리 날짜 선택
 */
function selectRhythmDate(dateStr) {
  appState.rhythmHistoryDate = dateStr;
  renderStatic();
}
window.selectRhythmDate = selectRhythmDate;

/**
 * 리듬 캘린더 월 이동
 */
function navigateRhythmCal(delta) {
  var now = new Date();
  var year = appState.rhythmCalYear !== undefined ? appState.rhythmCalYear : now.getFullYear();
  var month = appState.rhythmCalMonth !== undefined ? appState.rhythmCalMonth : now.getMonth();
  month += delta;
  if (month < 0) { month = 11; year--; }
  if (month > 11) { month = 0; year++; }
  appState.rhythmCalYear = year;
  appState.rhythmCalMonth = month;
  renderStatic();
}
window.navigateRhythmCal = navigateRhythmCal;

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
