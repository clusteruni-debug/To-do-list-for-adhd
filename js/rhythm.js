/**
 * 라이프 리듬 트래커 — 코어 모듈
 * navigator-v5.html에서 분리된 모듈
 *
 * 서브 모듈 (이 파일보다 먼저 로드되어야 함):
 *   js/rhythm-medication.js — 복약/영양제 트래커
 *   js/rhythm-merge.js      — Firebase 병합 로직
 *   js/rhythm-stats.js      — 통계 계산/렌더링
 *   js/rhythm-history.js    — 히스토리 뷰/수정/추가
 *
 * 의존성 (메인 HTML에서 제공):
 *   appState, renderStatic, syncToFirebase, showToast, escapeAttr,
 *   getLocalDateStr, getLogicalDate, checkDailyReset, recomputeTodayStats, saveState
 *
 * 통근 트래커 의존 (js/commute.js):
 *   showCommuteTagPrompt (런타임 호출)
 */

// ============================================
// 삭제 필드 추적 — 병합 시 의도적 삭제 vs 미기록 구분
// ============================================

/** 의도적 삭제를 _deletedFields에 기록 */
function markFieldDeleted(target, field) {
  if (!target._deletedFields) target._deletedFields = [];
  if (!target._deletedFields.includes(field)) target._deletedFields.push(field);
}

/** 값 설정 시 _deletedFields에서 제거 */
function unmarkFieldDeleted(target, field) {
  if (target._deletedFields) {
    target._deletedFields = target._deletedFields.filter(function(f) { return f !== field; });
    if (target._deletedFields.length === 0) delete target._deletedFields;
  }
}

// ============================================
// 공통: 리듬 날짜 전환 (어제 -> 히스토리, 오늘 초기화)
// ============================================

/**
 * 리듬 today의 날짜가 logicalToday와 다르면 히스토리로 이동 + 빈 today 생성
 * @param {Object} rhythm - appState.lifeRhythm 또는 parsed 객체 (today/history 포함)
 * @param {string} logicalToday - getLogicalDate() 결과
 * @returns {boolean} 전환 발생 여부
 */
function transitionRhythmDay(rhythm, logicalToday) {
  if (!rhythm.today || !rhythm.today.date || rhythm.today.date === logicalToday) return false;

  var savedDate = rhythm.today.date;
  var hasData = Object.values(rhythm.today).some(function(v) {
    return v && v !== savedDate && typeof v !== 'object';
  }) || (rhythm.today.medications && Object.keys(rhythm.today.medications).length > 0);

  if (hasData) {
    if (!rhythm.history) rhythm.history = {};
    var historyEntry = Object.assign({}, rhythm.today);
    delete historyEntry.date;
    delete historyEntry._deletedFields; // 히스토리에는 삭제 메타 불필요
    // 기존 히스토리와 필드별 병합 (기존 값 보존, 새 값으로 보완)
    var existing = rhythm.history[savedDate] || {};
    var rhythmFields = ['wakeUp', 'homeDepart', 'workArrive', 'workDepart', 'homeArrive', 'sleep'];
    var merged = {};
    for (var i = 0; i < rhythmFields.length; i++) {
      var f = rhythmFields[i];
      merged[f] = historyEntry[f] || existing[f] || null;
    }
    // 복약 병합
    var newMeds = historyEntry.medications || {};
    var existMeds = existing.medications || {};
    var allSlots = new Set([...Object.keys(newMeds), ...Object.keys(existMeds)]);
    if (allSlots.size > 0) {
      merged.medications = {};
      for (var slot of allSlots) {
        merged.medications[slot] = newMeds[slot] || existMeds[slot] || null;
      }
    }
    if (existing.updatedAt || historyEntry.updatedAt) {
      merged.updatedAt = historyEntry.updatedAt || existing.updatedAt;
    }
    rhythm.history[savedDate] = merged;
    console.log('[rhythm] ' + savedDate + ' 데이터를 히스토리로 병합 이동');
  }

  rhythm.today = {
    date: logicalToday, wakeUp: null, homeDepart: null, workArrive: null,
    workDepart: null, homeArrive: null, sleep: null, medications: {}
  };
  return true;
}

// ============================================
// 라이프 리듬 트래커 함수
// ============================================

/**
 * 라이프 리듬 버튼 클릭 핸들러
 * - 기록 없으면: 현재 시간 기록
 * - 기록 있으면: 수정 모드
 */
function handleLifeRhythmClick(type, hasRecord, event) {
  if (hasRecord) {
    showRhythmActionMenu(type, event);
  } else {
    recordLifeRhythm(type);
  }
}
window.handleLifeRhythmClick = handleLifeRhythmClick;

/**
 * 리듬 기록 액션 메뉴 표시 (수정/삭제)
 */
function showRhythmActionMenu(type, event) {
  // 기존 메뉴 제거
  hideRhythmActionMenu();

  var labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '근무시작', workDepart: '근무종료', homeArrive: '집도착', sleep: '취침' };

  // 오버레이 (메뉴 바깥 클릭 시 닫기)
  var overlay = document.createElement('div');
  overlay.className = 'rhythm-action-menu-overlay';
  overlay.onclick = hideRhythmActionMenu;

  // 메뉴
  var menu = document.createElement('div');
  menu.className = 'rhythm-action-menu';
  menu.id = 'rhythm-action-menu';
  menu.innerHTML = '<button onclick="hideRhythmActionMenu(); editLifeRhythm(\'' + escapeAttr(type) + '\')">✏️ 시간 수정</button>' +
    '<button class="danger" onclick="hideRhythmActionMenu(); deleteLifeRhythm(\'' + escapeAttr(type) + '\')">🗑️ 기록 삭제</button>';

  document.body.appendChild(overlay);
  document.body.appendChild(menu);

  // 버튼 기준 위치 계산
  var btn = event.currentTarget;
  var rect = btn.getBoundingClientRect();
  var menuHeight = 96; // 대략적인 메뉴 높이
  var menuWidth = 140;

  // 화면 아래 공간 부족 시 위로 표시
  var top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  // 가로 위치 (버튼 중앙 기준)
  var left = rect.left + rect.width / 2 - menuWidth / 2;
  if (left < 8) left = 8;
  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - 8 - menuWidth;

  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}
window.showRhythmActionMenu = showRhythmActionMenu;

/**
 * 리듬 액션 메뉴 닫기
 */
function hideRhythmActionMenu() {
  var menu = document.getElementById('rhythm-action-menu');
  if (menu) menu.remove();
  var overlay = document.querySelector('.rhythm-action-menu-overlay');
  if (overlay) overlay.remove();
}
window.hideRhythmActionMenu = hideRhythmActionMenu;

/**
 * 리듬 기록 삭제
 */
function deleteLifeRhythm(type) {
  var today = getLogicalDate();
  if (appState.lifeRhythm.today.date === today) {
    var labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '근무시작', workDepart: '근무종료', homeArrive: '집도착', sleep: '취침' };
    appState.lifeRhythm.today[type] = null;
    markFieldDeleted(appState.lifeRhythm.today, type);
    saveLifeRhythm();
    renderStatic();
    showToast(labels[type] + ' 기록이 삭제되었습니다', 'success');
  }
}
window.deleteLifeRhythm = deleteLifeRhythm;

// ============================================
// 라이프 리듬 기록/수정
// ============================================

/**
 * 기상/취침 기록 시 목표 대비 차이 메시지 생성
 * - 취침 자정 넘김 처리 (00:00~05:00은 전날 밤 기준)
 */
function getTimeDiffMessage(type, timeStr) {
  var icons = { wakeUp: '☀️', sleep: '🌙' };
  var typeLabels = { wakeUp: '기상', sleep: '취침' };
  var targetTime = null;

  if (type === 'wakeUp') {
    targetTime = appState.settings.targetWakeTime || '07:00';
  } else if (type === 'sleep') {
    targetTime = appState.settings.targetBedtime || '23:00';
  } else {
    // 기상/취침 외에는 기존 메시지 유지
    return null;
  }

  var tParts = targetTime.split(':').map(Number);
  var aParts = timeStr.split(':').map(Number);

  var targetMins = tParts[0] * 60 + tParts[1];
  var actualMins = aParts[0] * 60 + aParts[1];

  // 취침 자정 넘김 처리: 00:00~05:00 기록은 +24시간으로 환산
  if (type === 'sleep') {
    if (targetMins >= 18 * 60 && actualMins < 5 * 60) {
      actualMins += 24 * 60;
    }
    if (actualMins >= 18 * 60 && targetMins < 5 * 60) {
      targetMins += 24 * 60;
    }
  }

  var diff = actualMins - targetMins;
  var absDiff = Math.abs(diff);
  var icon = icons[type];

  if (absDiff <= 5) {
    return icon + ' ' + typeLabels[type] + ' ' + timeStr + ' (목표 시간 딱 맞춰요! 👏)';
  } else if (diff > 0) {
    return icon + ' ' + typeLabels[type] + ' ' + timeStr + ' (목표보다 ' + absDiff + '분 늦음)';
  } else {
    return icon + ' ' + typeLabels[type] + ' ' + timeStr + ' (목표보다 ' + absDiff + '분 일찍 👍)';
  }
}

/**
 * 라이프 리듬 기록 (현재 시간)
 */
function recordLifeRhythm(type) {
  var now = new Date();
  var today = getLogicalDate(now);
  var timeStr = now.toTimeString().slice(0, 5); // HH:MM

  transitionRhythmDay(appState.lifeRhythm, today);

  // 시간 기록 — 삭제 마크 해제
  appState.lifeRhythm.today[type] = timeStr;
  unmarkFieldDeleted(appState.lifeRhythm.today, type);

  // 기상 기록 시 반복 태스크 자동 초기화 트리거
  if (type === 'wakeUp') {
    if (checkDailyReset()) {
      recomputeTodayStats();
      saveState(); // 모바일에서 beforeunload 미발생 시 데이터 유실 방지
      showToast('🔄 새로운 하루! 반복 태스크가 초기화되었습니다', 'info');
    }
  }

  // 저장 및 렌더링
  saveLifeRhythm();
  renderStatic();

  // 피드백 (기상/취침은 목표 대비 차이 포함)
  var labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '근무시작', workDepart: '근무종료', homeArrive: '집도착', sleep: '취침' };
  var diffMsg = getTimeDiffMessage(type, timeStr);
  showToast(diffMsg || labels[type] + ' 시간 기록: ' + timeStr, 'success');

  // 통근 루트 태그 프롬프트
  if (type === 'workArrive' && appState.lifeRhythm.today.homeDepart) {
    setTimeout(function() { showCommuteTagPrompt('morning'); }, 500);
  } else if (type === 'homeArrive' && appState.lifeRhythm.today.workDepart) {
    setTimeout(function() { showCommuteTagPrompt('evening'); }, 500);
  }

  // 햅틱 피드백
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}
window.recordLifeRhythm = recordLifeRhythm;

/**
 * 라이프 리듬 수정 (시간 직접 입력)
 */
function editLifeRhythm(type) {
  var today = getLogicalDate();
  var currentValue = appState.lifeRhythm.today.date === today ? appState.lifeRhythm.today[type] : null;

  var labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '근무시작', workDepart: '근무종료', homeArrive: '집도착', sleep: '취침' };
  var newTime = prompt(labels[type] + ' 시간을 입력하세요 (HH:MM):', currentValue || '');

  if (newTime === null) return; // 취소

  // 시간 형식 검증
  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 07:30)', 'error');
    return;
  }

  // 빈 값이면 삭제
  if (!newTime) {
    if (appState.lifeRhythm.today.date === today) {
      appState.lifeRhythm.today[type] = null;
      markFieldDeleted(appState.lifeRhythm.today, type);
    }
  } else {
    // 시간 정규화 (7:30 -> 07:30)
    var parts = newTime.split(':');
    var normalizedTime = parts[0].padStart(2, '0') + ':' + parts[1];

    transitionRhythmDay(appState.lifeRhythm, today);

    appState.lifeRhythm.today[type] = normalizedTime;
    unmarkFieldDeleted(appState.lifeRhythm.today, type);
  }

  saveLifeRhythm();
  renderStatic();
  showToast(labels[type] + ' 시간이 수정되었습니다', 'success');
}
window.editLifeRhythm = editLifeRhythm;

// ============================================
// 리듬 통계 표시 토글 상태 (rhythm-stats.js, rhythm-history.js에서 참조)
// ============================================
var _rhythmStatsVisible = false;

// ============================================
// 라이프 리듬 저장/불러오기/일 전환
// ============================================

/**
 * 라이프 리듬 하루 전환: 자정 넘김 시 어제 데이터를 히스토리로 이동 + 오늘 초기화
 * 앱을 안 끄고 자정을 넘길 때 setInterval/visibilitychange에서 호출
 * @returns {boolean} 전환 발생 여부
 */
function checkRhythmDayChange() {
  var localToday = getLogicalDate();
  if (!transitionRhythmDay(appState.lifeRhythm, localToday)) return false;

  // updatedAt 없이 로컬만 저장 (빈 데이터는 병합에서 항상 패배)
  localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
  if (appState.user) syncToFirebase(true); // 히스토리 이동만 전파
  console.log('[rhythm] 오늘(' + localToday + ') 리듬 초기화 (updatedAt 없음)');
  return true;
}

function saveLifeRhythm() {
  // 수정 시점 기록 — 기기 간 병합에서 최신 데이터 판별용
  if (appState.lifeRhythm.today) {
    appState.lifeRhythm.today.updatedAt = new Date().toISOString();
  }
  // 항상 localStorage에 저장 (로그인 여부 무관 — 오프라인 폴백 보장)
  localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
  if (appState.user) {
    // 리듬 기록은 즉시 동기화 — 디바운스 중 브라우저 닫기로 유실 방지
    syncToFirebase(true);
  }
}

/**
 * 라이프 리듬 불러오기 (기존 데이터 마이그레이션 포함)
 */
function loadLifeRhythm() {
  var saved = localStorage.getItem('navigator-life-rhythm');
  if (saved) {
    try {
      var parsed = JSON.parse(saved);

      // 기존 데이터 마이그레이션 (workStart -> workArrive, workEnd -> workDepart)
      var migrateData = function(data) {
        if (!data) return data;
        if (data.workStart && !data.workArrive) {
          data.workArrive = data.workStart;
          delete data.workStart;
        }
        if (data.workEnd && !data.workDepart) {
          data.workDepart = data.workEnd;
          delete data.workEnd;
        }
        // 새 필드 초기화
        if (data.homeDepart === undefined) data.homeDepart = null;
        if (data.homeArrive === undefined) data.homeArrive = null;
        // 복약 필드 초기화 (마이그레이션)
        if (data.medications === undefined) data.medications = {};
        // med_afternoon -> med_afternoon_adhd 마이그레이션 (ADHD약/영양제 분리)
        if (data.medications && data.medications.med_afternoon !== undefined) {
          data.medications.med_afternoon_adhd = data.medications.med_afternoon;
          delete data.medications.med_afternoon;
        }
        return data;
      };

      // today 마이그레이션
      if (parsed.today) {
        parsed.today = migrateData(parsed.today);
      }

      // history 마이그레이션
      if (parsed.history) {
        Object.keys(parsed.history).forEach(function(date) {
          parsed.history[date] = migrateData(parsed.history[date]);
        });
      }

      // 날짜 변경 시 오늘의 리듬 자동 리셋
      transitionRhythmDay(parsed, getLogicalDate());

      appState.lifeRhythm = Object.assign({}, appState.lifeRhythm, parsed, {
        today: parsed.today || appState.lifeRhythm.today,
        history: parsed.history || {},
        settings: Object.assign({}, appState.lifeRhythm.settings, parsed.settings)
      });

      // medicationSlots에서 med_afternoon -> med_afternoon_adhd + med_afternoon_nutrient 분리 마이그레이션
      var slots = appState.lifeRhythm.settings.medicationSlots;
      if (slots) {
        var oldIdx = slots.findIndex(function(s) { return s.id === 'med_afternoon'; });
        if (oldIdx !== -1) {
          slots.splice(oldIdx, 1,
            { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
            { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false }
          );
        }
      }

      // 마이그레이션된 데이터를 localStorage에만 저장 (updatedAt 갱신 안 함)
      // saveLifeRhythm()을 호출하면 updatedAt이 갱신되어,
      // loadFromFirebase 병합 시 빈 로컬 데이터가 클라우드 데이터를 덮어쓰는 버그 발생
      localStorage.setItem('navigator-life-rhythm', JSON.stringify(appState.lifeRhythm));
    } catch (e) {
      console.error('라이프 리듬 데이터 로드 실패:', e);
    }
  }
}
