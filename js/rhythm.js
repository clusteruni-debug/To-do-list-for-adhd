/**
 * 라이프 리듬 트래커 + 복약/영양제 트래커
 * navigator-v5.html에서 분리된 모듈
 *
 * 의존성 (메인 HTML에서 제공):
 *   appState, renderStatic, syncToFirebase, showToast, escapeHtml,
 *   getLocalDateStr, generateId, checkDailyReset, recomputeTodayStats, saveState
 *
 * 통근 트래커 의존 (js/commute.js):
 *   showCommuteTagPrompt (런타임 호출)
 */

// ============================================
// Firebase 동기화용 라이프 리듬 병합
// ============================================

/**
 * 라이프 리듬 히스토리 병합 (날짜별 + 필드별)
 * 같은 날짜의 기록은 필드별로 병합 (값이 있는 쪽 우선)
 */
function mergeRhythmHistory(localHistory, cloudHistory) {
  const local = localHistory || {};
  const cloud = cloudHistory || {};
  const allDates = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const merged = {};
  const rhythmFields = ['wakeUp', 'homeDepart', 'workArrive', 'workDepart', 'homeArrive', 'sleep'];

  for (const date of allDates) {
    const l = local[date] || {};
    const c = cloud[date] || {};

    // updatedAt 기반 "last writer wins" — 히스토리 편집/삭제도 정상 전파
    const lUp = l.updatedAt || null;
    const cUp = c.updatedAt || null;
    let winner = null;
    if (lUp && cUp) {
      winner = lUp >= cUp ? l : c;
    } else if (lUp && !cUp) {
      winner = l;
    } else if (!lUp && cUp) {
      winner = c;
    }

    if (winner) {
      // 최신 기기 데이터 그대로 사용 (null = 삭제 전파)
      merged[date] = {};
      for (const f of rhythmFields) {
        merged[date][f] = winner[f] !== undefined ? winner[f] : null;
      }
      const wMeds = { ...(winner.medications || {}) };
      if (wMeds.med_afternoon !== undefined) { wMeds.med_afternoon_adhd = wMeds.med_afternoon; delete wMeds.med_afternoon; }
      if (Object.keys(wMeds).length > 0) merged[date].medications = wMeds;
      merged[date].updatedAt = winner.updatedAt;
      continue;
    }

    // 하위호환: 양쪽 다 updatedAt 없으면 기존 || 병합
    merged[date] = {
      wakeUp: l.wakeUp || c.wakeUp || null,
      homeDepart: l.homeDepart || c.homeDepart || null,
      workArrive: l.workArrive || c.workArrive || null,
      workDepart: l.workDepart || c.workDepart || null,
      homeArrive: l.homeArrive || c.homeArrive || null,
      sleep: l.sleep || c.sleep || null
    };
    const lMeds = l.medications || {};
    const cMeds = c.medications || {};
    if (lMeds.med_afternoon !== undefined) { lMeds.med_afternoon_adhd = lMeds.med_afternoon; delete lMeds.med_afternoon; }
    if (cMeds.med_afternoon !== undefined) { cMeds.med_afternoon_adhd = cMeds.med_afternoon; delete cMeds.med_afternoon; }
    const allSlots = new Set([...Object.keys(lMeds), ...Object.keys(cMeds)]);
    if (allSlots.size > 0) {
      merged[date].medications = {};
      for (const slot of allSlots) {
        merged[date].medications[slot] = lMeds[slot] || cMeds[slot] || null;
      }
    }
  }

  return merged;
}

/**
 * 라이프 리듬 "today" 병합 (날짜 비교 포함)
 * - 날짜가 다르면 → 새로운 날짜가 today, 오래된 데이터는 history로 보존
 * - 날짜가 같으면 → 필드별 병합 (값이 있는 쪽 우선)
 * - history에 이미 같은 날짜 데이터가 있으면 필드별 merge
 * @param {Object} localToday - 로컬 오늘 데이터
 * @param {Object} cloudToday - 클라우드 오늘 데이터
 * @param {Object} mergedHistory - 이미 병합된 히스토리
 * @returns {{ today: Object, history: Object }}
 */
function mergeRhythmToday(localToday, cloudToday, mergedHistory) {
  const lt = localToday || {};
  const ct = cloudToday || {};
  const history = mergedHistory || {};
  const rhythmFields = ['wakeUp', 'homeDepart', 'workArrive', 'workDepart', 'homeArrive', 'sleep'];

  // 날짜가 다른 경우: 새로운 날짜가 today, 오래된 날짜 데이터는 history로 이동
  if (lt.date && ct.date && lt.date !== ct.date) {
    let newer, older, olderDate;
    if (lt.date > ct.date) {
      newer = lt; older = ct; olderDate = ct.date;
    } else {
      newer = ct; older = lt; olderDate = lt.date;
    }
    // 오래된 today 데이터를 history에 필드별 병합 (기존 history 보존)
    const existingHist = history[olderDate] || {};
    const mergedOlder = {};
    for (const f of rhythmFields) {
      mergedOlder[f] = older[f] || existingHist[f] || null;
    }
    // 복약 기록도 history에 병합
    const olderMeds = older.medications || {};
    const existingMeds = existingHist.medications || {};
    const allMedSlots = new Set([...Object.keys(olderMeds), ...Object.keys(existingMeds)]);
    if (allMedSlots.size > 0) {
      mergedOlder.medications = {};
      for (const slot of allMedSlots) {
        mergedOlder.medications[slot] = olderMeds[slot] || existingMeds[slot] || null;
      }
    }
    history[olderDate] = mergedOlder;
    return { today: newer, history };
  }

  // 날짜가 같거나 한쪽만 있는 경우
  // updatedAt 기반 "last writer wins" — 삭제(null)도 정상 전파되도록
  const lUpdated = lt.updatedAt || null;
  const cUpdated = ct.updatedAt || null;

  // 양쪽 다 updatedAt이 있으면 → 최신 쪽이 today 전체를 지배 (null 필드 = 의도적 삭제)
  // 한쪽만 updatedAt이 있으면 → 그쪽이 최신 코드 (우선)
  // 양쪽 다 없으면 → 기존 || 병합 (하위호환)
  let winner = null;
  if (lUpdated && cUpdated) {
    winner = lUpdated >= cUpdated ? lt : ct;
  } else if (lUpdated && !cUpdated) {
    winner = lt;
  } else if (!lUpdated && cUpdated) {
    winner = ct;
  }

  if (winner) {
    // 최신 기기의 데이터를 그대로 사용 (null 포함 — 삭제가 전파됨)
    const today = { date: winner.date || lt.date || ct.date || null };
    for (const f of rhythmFields) {
      today[f] = winner[f] !== undefined ? winner[f] : null;
    }
    // 복약 데이터도 최신 기기 우선
    const wMeds = { ...(winner.medications || {}) };
    if (wMeds.med_afternoon !== undefined) { wMeds.med_afternoon_adhd = wMeds.med_afternoon; delete wMeds.med_afternoon; }
    today.medications = wMeds;
    today.updatedAt = winner.updatedAt;
    return { today, history };
  }

  // 하위호환: 양쪽 다 updatedAt 없으면 기존 || 병합
  const lMeds = { ...(lt.medications || {}) };
  const cMeds = { ...(ct.medications || {}) };
  if (lMeds.med_afternoon !== undefined) { lMeds.med_afternoon_adhd = lMeds.med_afternoon; delete lMeds.med_afternoon; }
  if (cMeds.med_afternoon !== undefined) { cMeds.med_afternoon_adhd = cMeds.med_afternoon; delete cMeds.med_afternoon; }
  const allMedSlots = new Set([...Object.keys(lMeds), ...Object.keys(cMeds)]);
  const mergedMeds = {};
  for (const slot of allMedSlots) {
    mergedMeds[slot] = lMeds[slot] || cMeds[slot] || null;
  }

  const today = { date: lt.date || ct.date || null };
  for (const f of rhythmFields) {
    today[f] = lt[f] || ct[f] || null;
  }
  today.medications = mergedMeds;

  return { today, history };
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

  const labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '회사도착', workDepart: '회사출발', homeArrive: '집도착', sleep: '취침' };

  // 오버레이 (메뉴 바깥 클릭 시 닫기)
  const overlay = document.createElement('div');
  overlay.className = 'rhythm-action-menu-overlay';
  overlay.onclick = hideRhythmActionMenu;

  // 메뉴
  const menu = document.createElement('div');
  menu.className = 'rhythm-action-menu';
  menu.id = 'rhythm-action-menu';
  menu.innerHTML = `
    <button onclick="hideRhythmActionMenu(); editLifeRhythm('${type}')">✏️ 시간 수정</button>
    <button class="danger" onclick="hideRhythmActionMenu(); deleteLifeRhythm('${type}')">🗑️ 기록 삭제</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(menu);

  // 버튼 기준 위치 계산
  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const menuHeight = 96; // 대략적인 메뉴 높이
  const menuWidth = 140;

  // 화면 아래 공간 부족 시 위로 표시
  let top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  // 가로 위치 (버튼 중앙 기준)
  let left = rect.left + rect.width / 2 - menuWidth / 2;
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
  const menu = document.getElementById('rhythm-action-menu');
  if (menu) menu.remove();
  const overlay = document.querySelector('.rhythm-action-menu-overlay');
  if (overlay) overlay.remove();
}
window.hideRhythmActionMenu = hideRhythmActionMenu;

/**
 * 리듬 기록 삭제
 */
function deleteLifeRhythm(type) {
  const today = getLocalDateStr();
  if (appState.lifeRhythm.today.date === today) {
    const labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '회사도착', workDepart: '회사출발', homeArrive: '집도착', sleep: '취침' };
    appState.lifeRhythm.today[type] = null;
    saveLifeRhythm();
    renderStatic();
    showToast(labels[type] + ' 기록이 삭제되었습니다', 'success');
  }
}
window.deleteLifeRhythm = deleteLifeRhythm;

// ============================================
// 복약/영양제 트래커
// ============================================

/**
 * 복약 슬롯 설정 가져오기 (기본값 포함)
 */
function getMedicationSlots() {
  return (appState.lifeRhythm.settings && appState.lifeRhythm.settings.medicationSlots) || [
    { id: 'med_morning', label: 'ADHD약(아침)', icon: '💊', required: true },
    { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
    { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false },
    { id: 'med_evening', label: '영양제(저녁)', icon: '🌿', required: false }
  ];
}

/**
 * 복약 기록 (현재 시간)
 */
function recordMedication(slotId) {
  const now = new Date();
  const today = getLocalDateStr(now);
  const timeStr = now.toTimeString().slice(0, 5);

  // 오늘 날짜 확인
  if (appState.lifeRhythm.today.date !== today) {
    // 어제 기록을 히스토리로 이동
    if (appState.lifeRhythm.today.date) {
      appState.lifeRhythm.history[appState.lifeRhythm.today.date] = { ...appState.lifeRhythm.today };
      delete appState.lifeRhythm.history[appState.lifeRhythm.today.date].date;
    }
    appState.lifeRhythm.today = {
      date: today, wakeUp: null, homeDepart: null, workArrive: null,
      workDepart: null, homeArrive: null, sleep: null, medications: {}
    };
  }

  if (!appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications = {};
  }
  appState.lifeRhythm.today.medications[slotId] = timeStr;

  saveLifeRhythm();
  renderStatic();

  const slots = getMedicationSlots();
  const slot = slots.find(s => s.id === slotId);
  const label = slot ? slot.label : slotId;
  showToast(slot ? slot.icon + ' ' + label + ' 복용 기록: ' + timeStr : '복용 기록: ' + timeStr, 'success');

  if (navigator.vibrate) navigator.vibrate(30);
}
window.recordMedication = recordMedication;

/**
 * 복약 시간 수정 (직접 입력)
 */
function editMedication(slotId) {
  const today = getLocalDateStr();
  const currentValue = (appState.lifeRhythm.today.date === today && appState.lifeRhythm.today.medications)
    ? appState.lifeRhythm.today.medications[slotId] : null;

  const slots = getMedicationSlots();
  const slot = slots.find(s => s.id === slotId);
  const label = slot ? slot.label : slotId;

  const newTime = prompt(label + ' 복용 시간을 입력하세요 (HH:MM):', currentValue || '');
  if (newTime === null) return;

  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 08:30)', 'error');
    return;
  }

  // 자정 넘김 방어: 날짜가 바뀌었으면 today 갱신
  if (appState.lifeRhythm.today.date !== today) {
    if (appState.lifeRhythm.today.date) {
      appState.lifeRhythm.history[appState.lifeRhythm.today.date] = { ...appState.lifeRhythm.today };
      delete appState.lifeRhythm.history[appState.lifeRhythm.today.date].date;
    }
    appState.lifeRhythm.today = {
      date: today, wakeUp: null, homeDepart: null, workArrive: null,
      workDepart: null, homeArrive: null, sleep: null, medications: {}
    };
  }

  if (!appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications = {};
  }

  if (!newTime) {
    appState.lifeRhythm.today.medications[slotId] = null;
  } else {
    const [h, m] = newTime.split(':');
    appState.lifeRhythm.today.medications[slotId] = h.padStart(2, '0') + ':' + m;
  }

  saveLifeRhythm();
  renderStatic();
  showToast(label + ' 복용 시간이 수정되었습니다', 'success');
}
window.editMedication = editMedication;

/**
 * 복약 기록 삭제
 */
function deleteMedication(slotId) {
  const today = getLocalDateStr();
  if (appState.lifeRhythm.today.date === today && appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications[slotId] = null;
    saveLifeRhythm();
    renderStatic();

    const slots = getMedicationSlots();
    const slot = slots.find(s => s.id === slotId);
    showToast((slot ? slot.label : '복약') + ' 기록이 삭제되었습니다', 'success');
  }
}
window.deleteMedication = deleteMedication;

/**
 * 복약 버튼 클릭 핸들러
 * - 기록 없으면: 현재 시간 기록
 * - 기록 있으면: 수정/삭제 메뉴
 */
function handleMedicationClick(slotId, hasRecord, event) {
  if (hasRecord) {
    showMedicationActionMenu(slotId, event);
  } else {
    recordMedication(slotId);
  }
}
window.handleMedicationClick = handleMedicationClick;

/**
 * 복약 액션 메뉴 표시 (수정/삭제)
 * 기존 rhythm-action-menu 패턴 재사용
 */
function showMedicationActionMenu(slotId, event) {
  hideRhythmActionMenu(); // 기존 메뉴 닫기

  const overlay = document.createElement('div');
  overlay.className = 'rhythm-action-menu-overlay';
  overlay.onclick = hideRhythmActionMenu;

  const menu = document.createElement('div');
  menu.className = 'rhythm-action-menu';
  menu.id = 'rhythm-action-menu';
  menu.innerHTML = `
    <button onclick="hideRhythmActionMenu(); editMedication('${escapeAttr(slotId)}')">✏️ 시간 수정</button>
    <button class="danger" onclick="hideRhythmActionMenu(); deleteMedication('${escapeAttr(slotId)}')">🗑️ 기록 삭제</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(menu);

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const menuHeight = 96;
  const menuWidth = 140;

  let top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  if (left < 8) left = 8;
  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - 8 - menuWidth;

  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}
window.showMedicationActionMenu = showMedicationActionMenu;

/**
 * 복약 슬롯 추가 (설정)
 */
function addMedicationSlot() {
  const label = prompt('복약/영양제 이름:', '');
  if (!label) return;

  const icon = prompt('아이콘 (예: 💊, 🌿, 💉):', '💊') || '💊';
  const required = confirm('필수 복약인가요? (확인=필수, 취소=선택)');

  if (!appState.lifeRhythm.settings) appState.lifeRhythm.settings = {};
  if (!appState.lifeRhythm.settings.medicationSlots) {
    appState.lifeRhythm.settings.medicationSlots = getMedicationSlots();
  }

  const id = 'med_' + generateId();
  appState.lifeRhythm.settings.medicationSlots.push({ id, label, icon, required });

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 추가되었습니다: ' + label, 'success');
}
window.addMedicationSlot = addMedicationSlot;

/**
 * 복약 슬롯 편집 (설정)
 */
function editMedicationSlot(idx) {
  if (!appState.lifeRhythm.settings) appState.lifeRhythm.settings = {};
  if (!appState.lifeRhythm.settings.medicationSlots) {
    appState.lifeRhythm.settings.medicationSlots = getMedicationSlots();
  }

  const slots = appState.lifeRhythm.settings.medicationSlots;
  if (idx < 0 || idx >= slots.length) return;

  const slot = slots[idx];
  const newLabel = prompt('복약/영양제 이름:', slot.label);
  if (newLabel === null) return;
  if (!newLabel) { showToast('이름은 비워둘 수 없습니다', 'error'); return; }

  const newIcon = prompt('아이콘:', slot.icon) || slot.icon;
  const newRequired = confirm('필수 복약인가요? (확인=필수, 취소=선택)');

  slot.label = newLabel;
  slot.icon = newIcon;
  slot.required = newRequired;

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 수정되었습니다', 'success');
}
window.editMedicationSlot = editMedicationSlot;

/**
 * 복약 슬롯 삭제 (설정)
 */
function deleteMedicationSlot(idx) {
  if (!appState.lifeRhythm.settings || !appState.lifeRhythm.settings.medicationSlots) return;

  const slots = appState.lifeRhythm.settings.medicationSlots;
  if (idx < 0 || idx >= slots.length) return;

  const slot = slots[idx];
  if (!confirm(slot.label + ' 슬롯을 삭제하시겠습니까?\n(기존 기록은 유지됩니다)')) return;

  slots.splice(idx, 1);

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 삭제되었습니다', 'success');
}
window.deleteMedicationSlot = deleteMedicationSlot;

/**
 * 필수 복약 연속일 계산
 * 필수(required) 슬롯을 모두 복용한 날이 연속으로 며칠인지 계산
 */
function getMedicationStreak() {
  const slots = getMedicationSlots();
  const requiredSlots = slots.filter(s => s.required);
  if (requiredSlots.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const todayStr = getLocalDateStr(today);

  // 오늘부터 역순으로 확인
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);

    let dayMeds;
    if (dateStr === todayStr && appState.lifeRhythm.today.date === todayStr) {
      dayMeds = appState.lifeRhythm.today.medications || {};
    } else {
      const histEntry = appState.lifeRhythm.history[dateStr];
      dayMeds = histEntry ? (histEntry.medications || {}) : {};
    }

    // 필수 슬롯 모두 복용했는지 확인
    const allTaken = requiredSlots.every(s => dayMeds[s.id]);
    if (allTaken) {
      streak++;
    } else {
      // 오늘은 아직 복용 안 했을 수 있으므로 스킵
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

// ============================================
// 라이프 리듬 기록/수정/통계
// ============================================

/**
 * 기상/취침 기록 시 목표 대비 차이 메시지 생성
 * - 취침 자정 넘김 처리 (00:00~05:00은 전날 밤 기준)
 */
function getTimeDiffMessage(type, timeStr) {
  const icons = { wakeUp: '☀️', sleep: '🌙' };
  const typeLabels = { wakeUp: '기상', sleep: '취침' };
  let targetTime = null;

  if (type === 'wakeUp') {
    targetTime = appState.settings.targetWakeTime || '07:00';
  } else if (type === 'sleep') {
    targetTime = appState.settings.targetBedtime || '23:00';
  } else {
    // 기상/취침 외에는 기존 메시지 유지
    return null;
  }

  const [tH, tM] = targetTime.split(':').map(Number);
  const [aH, aM] = timeStr.split(':').map(Number);

  let targetMins = tH * 60 + tM;
  let actualMins = aH * 60 + aM;

  // 취침 자정 넘김 처리: 00:00~05:00 기록은 +24시간으로 환산
  if (type === 'sleep') {
    if (targetMins >= 18 * 60 && actualMins < 5 * 60) {
      actualMins += 24 * 60;
    }
    if (actualMins >= 18 * 60 && targetMins < 5 * 60) {
      targetMins += 24 * 60;
    }
  }

  const diff = actualMins - targetMins;
  const absDiff = Math.abs(diff);
  const icon = icons[type];

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
  const now = new Date();
  const today = getLocalDateStr(now);
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM

  // 오늘 날짜 확인 및 초기화
  if (appState.lifeRhythm.today.date !== today) {
    // 어제 기록을 히스토리로 이동
    if (appState.lifeRhythm.today.date) {
      appState.lifeRhythm.history[appState.lifeRhythm.today.date] = { ...appState.lifeRhythm.today };
      delete appState.lifeRhythm.history[appState.lifeRhythm.today.date].date;
    }
    // 오늘 초기화
    appState.lifeRhythm.today = {
      date: today,
      wakeUp: null,
      homeDepart: null,
      workArrive: null,
      workDepart: null,
      homeArrive: null,
      sleep: null,
      medications: {}
    };
  }

  // 시간 기록
  appState.lifeRhythm.today[type] = timeStr;

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
  const labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '회사도착', workDepart: '회사출발', homeArrive: '집도착', sleep: '취침' };
  const diffMsg = getTimeDiffMessage(type, timeStr);
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
  const today = getLocalDateStr();
  const currentValue = appState.lifeRhythm.today.date === today ? appState.lifeRhythm.today[type] : null;

  const labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '회사도착', workDepart: '회사출발', homeArrive: '집도착', sleep: '취침' };
  const newTime = prompt(labels[type] + ' 시간을 입력하세요 (HH:MM):', currentValue || '');

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
    }
  } else {
    // 시간 정규화 (7:30 → 07:30)
    const [h, m] = newTime.split(':');
    const normalizedTime = h.padStart(2, '0') + ':' + m;

    // 오늘 날짜 확인 및 초기화
    if (appState.lifeRhythm.today.date !== today) {
      if (appState.lifeRhythm.today.date) {
        appState.lifeRhythm.history[appState.lifeRhythm.today.date] = { ...appState.lifeRhythm.today };
        delete appState.lifeRhythm.history[appState.lifeRhythm.today.date].date;
      }
      appState.lifeRhythm.today = {
        date: today,
        wakeUp: null,
        homeDepart: null,
        workArrive: null,
        workDepart: null,
        homeArrive: null,
        sleep: null,
        medications: {}
      };
    }

    appState.lifeRhythm.today[type] = normalizedTime;
  }

  saveLifeRhythm();
  renderStatic();
  showToast(labels[type] + ' 시간이 수정되었습니다', 'success');
}
window.editLifeRhythm = editLifeRhythm;

/**
 * 라이프 리듬 통계 계산 (최근 7일)
 */
function getLifeRhythmStats() {
  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const sleepData = [];
  const homeDepartTimes = [];
  const workArriveTimes = [];
  const workDepartTimes = [];
  const homeArriveTimes = [];
  const workHours = [];
  const commuteToWorkTimes = [];
  const commuteToHomeTimes = [];
  const totalOutTimes = [];
  const wakeUpTimes = [];
  const bedtimes = [];

  // 시간을 분으로 변환하는 헬퍼
  const toMins = (t) => t ? parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]) : null;

  // 최근 7일 데이터 수집
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);
    const isToday = i === 0;

    let dayData;
    if (isToday && appState.lifeRhythm.today.date === dateStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = appState.lifeRhythm.history[dateStr] || {};
    }

    // 기존 데이터 마이그레이션 (workStart → workArrive, workEnd → workDepart)
    if (dayData.workStart && !dayData.workArrive) dayData.workArrive = dayData.workStart;
    if (dayData.workEnd && !dayData.workDepart) dayData.workDepart = dayData.workEnd;

    // 수면 시간 계산 (전날 취침 ~ 당일 기상)
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = getLocalDateStr(prevDate);
    const prevData = appState.lifeRhythm.history[prevDateStr] || {};
    let sleepHours = null;

    if (prevData.sleep && dayData.wakeUp) {
      const sleepTime = toMins(prevData.sleep);
      const wakeTime = toMins(dayData.wakeUp);
      let duration = wakeTime + (24 * 60 - sleepTime);
      if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
      if (duration > 0 && duration < 16 * 60) {
        sleepHours = duration / 60;
      }
    }

    sleepData.push({
      date: dateStr,
      dayLabel: dayNames[date.getDay()],
      hours: sleepHours,
      isToday: isToday
    });

    // 시간 수집
    if (dayData.homeDepart) homeDepartTimes.push(toMins(dayData.homeDepart));
    if (dayData.workArrive) workArriveTimes.push(toMins(dayData.workArrive));
    if (dayData.workDepart) workDepartTimes.push(toMins(dayData.workDepart));
    if (dayData.homeArrive) homeArriveTimes.push(toMins(dayData.homeArrive));
    if (dayData.wakeUp) wakeUpTimes.push(toMins(dayData.wakeUp));
    // 취침: 자정 넘김 처리 (00:00~05:00은 +24시간)
    if (dayData.sleep) {
      let sleepMins = toMins(dayData.sleep);
      if (sleepMins < 5 * 60) sleepMins += 24 * 60;
      bedtimes.push(sleepMins);
    }

    // 근무 시간 계산
    if (dayData.workArrive && dayData.workDepart) {
      const dur = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur > 0) workHours.push(dur / 60);
    }

    // 출근 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      const dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur > 0 && dur < 180) commuteToWorkTimes.push(dur);
    }

    // 퇴근 통근 시간
    if (dayData.workDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur > 0 && dur < 180) commuteToHomeTimes.push(dur);
    }

    // 총 외출 시간
    if (dayData.homeDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.homeDepart);
      if (dur > 0) totalOutTimes.push(dur / 60);
    }
  }

  // 평균 계산 헬퍼
  const calcAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const validSleepData = sleepData.filter(d => d.hours !== null);
  const avgSleep = calcAvg(validSleepData.map(d => d.hours)) || 0;

  const avgHomeDepart = calcAvg(homeDepartTimes);
  const avgWorkArrive = calcAvg(workArriveTimes);
  const avgWorkDepart = calcAvg(workDepartTimes);
  const avgHomeArrive = calcAvg(homeArriveTimes);
  const avgWorkHrs = calcAvg(workHours);
  const avgCommuteToWork = calcAvg(commuteToWorkTimes);
  const avgCommuteToHome = calcAvg(commuteToHomeTimes);
  const avgTotalOut = calcAvg(totalOutTimes);

  // 집출발 시간 편차 계산
  let homeDepartDeviation = null;
  if (homeDepartTimes.length >= 2) {
    const mean = calcAvg(homeDepartTimes);
    const variance = homeDepartTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / homeDepartTimes.length;
    homeDepartDeviation = Math.round(Math.sqrt(variance));
  }

  // 기상/취침 평균 및 목표 대비 계산
  const avgWakeUpMins = calcAvg(wakeUpTimes);
  const avgBedtimeMins = calcAvg(bedtimes);

  const targetWakeMins = (() => {
    const t = appState.settings.targetWakeTime || '07:00';
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  })();
  const targetBedMins = (() => {
    const t = appState.settings.targetBedtime || '23:00';
    const [h, m] = t.split(':').map(Number);
    // 자정 넘김 기준 통일 (목표가 00:00~05:00이면 +24시간)
    return (h < 5) ? h * 60 + m + 24 * 60 : h * 60 + m;
  })();

  // 목표 대비 차이 (양수 = 늦음, 음수 = 일찍)
  const wakeTimeDiff = avgWakeUpMins !== null ? Math.round(avgWakeUpMins - targetWakeMins) : null;
  const bedtimeDiff = avgBedtimeMins !== null ? Math.round(avgBedtimeMins - targetBedMins) : null;

  // 인사이트 생성
  const insights = [];

  // 수면 vs 완료율 상관관계
  const completionByDay = {};
  appState.tasks.forEach(task => {
    if (task.completed && task.completedAt) {
      const completedDate = task.completedAt.split('T')[0];
      completionByDay[completedDate] = (completionByDay[completedDate] || 0) + 1;
    }
  });

  const goodSleepDays = sleepData.filter(d => d.hours && d.hours >= 7);
  const badSleepDays = sleepData.filter(d => d.hours && d.hours < 6);

  if (goodSleepDays.length >= 2 && badSleepDays.length >= 1) {
    const goodSleepCompletion = goodSleepDays.reduce((sum, d) => sum + (completionByDay[d.date] || 0), 0) / goodSleepDays.length;
    const badSleepCompletion = badSleepDays.reduce((sum, d) => sum + (completionByDay[d.date] || 0), 0) / badSleepDays.length;

    if (goodSleepCompletion > badSleepCompletion * 1.2) {
      const diff = Math.round((goodSleepCompletion / Math.max(badSleepCompletion, 0.1) - 1) * 100);
      insights.push({
        type: 'positive',
        icon: '📈',
        text: '7시간 이상 수면한 날, 작업 완료가 ' + diff + '% 더 많았어요'
      });
    }
  }

  if (avgSleep > 0 && avgSleep < 6) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      text: '평균 수면이 6시간 미만이에요. 충분한 수면이 생산성에 도움됩니다'
    });
  }

  if (homeDepartDeviation !== null && homeDepartDeviation <= 15) {
    insights.push({
      type: 'positive',
      icon: '✨',
      text: '출발 시간이 일정해요! 규칙적인 루틴이 유지되고 있습니다'
    });
  }

  // 통근시간 인사이트
  if (avgCommuteToWork && avgCommuteToHome) {
    const totalCommute = avgCommuteToWork + avgCommuteToHome;
    if (totalCommute > 120) {
      insights.push({
        type: 'info',
        icon: '🚌',
        text: '하루 평균 통근 ' + Math.round(totalCommute) + '분. 이동 중 팟캐스트나 독서를 해보세요'
      });
    }
  }

  // 시간 포맷팅 헬퍼
  const formatTime = (mins) => {
    if (mins === null) return null;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };

  const formatDur = (mins) => {
    if (mins === null) return null;
    return Math.round(mins) + '분';
  };

  return {
    hasData: validSleepData.length > 0 || homeDepartTimes.length > 0,
    sleepData,
    avgSleep,
    avgHomeDepart: formatTime(avgHomeDepart),
    avgWorkArrive: formatTime(avgWorkArrive),
    avgWorkDepart: formatTime(avgWorkDepart),
    avgHomeArrive: formatTime(avgHomeArrive),
    avgWorkHours: avgWorkHrs,
    avgCommuteToWork: formatDur(avgCommuteToWork),
    avgCommuteToHome: formatDur(avgCommuteToHome),
    avgTotalOut: avgTotalOut ? avgTotalOut.toFixed(1) + '시간' : null,
    homeDepartDeviation,
    avgWakeUp: formatTime(avgWakeUpMins),
    avgBedtime: formatTime(avgBedtimeMins !== null && avgBedtimeMins >= 24 * 60 ? avgBedtimeMins - 24 * 60 : avgBedtimeMins),
    wakeTimeDiff,
    bedtimeDiff,
    targetSleepHours: (() => {
      // 설정 기반 목표 수면 시간 (기상 - 취침, 자정 넘김 처리)
      let dur = targetWakeMins - targetBedMins;
      if (dur <= 0) dur += 24 * 60;
      return dur / 60;
    })(),
    insights
  };
}

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
  const today = new Date();
  const records = [];

  // 시간을 분으로 변환
  const toMins = (t) => t ? parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]) : null;
  const formatDur = (mins) => {
    if (!mins || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h + 'h ' + m + 'm';
  };

  // 최근 30일 기록 수집
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);
    const isToday = i === 0;

    let dayData;
    if (isToday && appState.lifeRhythm.today.date === dateStr) {
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
    const hasMedData = dayData && dayData.medications && Object.values(dayData.medications).some(v => v);
    const hasAnyData = dayData && (dayData.wakeUp || dayData.homeDepart || dayData.workArrive || dayData.workDepart || dayData.homeArrive || dayData.sleep || hasMedData);
    const isExplicitlyAdded = !isToday && appState.lifeRhythm.history.hasOwnProperty(dateStr);
    if (hasAnyData || isExplicitlyAdded) {
      // 수면 시간 계산
      let sleepDuration = null;
      if (i < 29) {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = getLocalDateStr(prevDate);
        const prevData = appState.lifeRhythm.history[prevDateStr] || {};
        if (prevData.sleep && dayData.wakeUp) {
          const sleepTime = toMins(prevData.sleep);
          const wakeTime = toMins(dayData.wakeUp);
          let duration = wakeTime + (24 * 60 - sleepTime);
          if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
          if (duration > 0 && duration < 16 * 60) {
            sleepDuration = formatDur(duration);
          }
        }
      }

      // 근무 시간 계산
      let workDuration = null;
      const workArr = dayData.workArrive;
      const workDep = dayData.workDepart;
      if (workArr && workDep) {
        const dur = toMins(workDep) - toMins(workArr);
        if (dur > 0) workDuration = formatDur(dur);
      }

      // 출근 통근시간
      let commuteToWork = null;
      if (dayData.homeDepart && dayData.workArrive) {
        const dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
        if (dur > 0 && dur < 180) commuteToWork = dur + '분';
      }

      // 퇴근 통근시간
      let commuteToHome = null;
      if (dayData.workDepart && dayData.homeArrive) {
        const dur = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
        if (dur > 0 && dur < 180) commuteToHome = dur + '분';
      }

      // 총 외출시간
      let totalOut = null;
      if (dayData.homeDepart && dayData.homeArrive) {
        const dur = toMins(dayData.homeArrive) - toMins(dayData.homeDepart);
        if (dur > 0) totalOut = formatDur(dur);
      }

      // 완료한 작업 수 (completionLog 기반)
      const completedTasks = ((appState.completionLog || {})[dateStr] || []).length;

      records.push({
        date: dateStr,
        dayLabel: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
        dateLabel: (date.getMonth() + 1) + '/' + date.getDate(),
        isToday,
        wakeUp: dayData.wakeUp,
        homeDepart: dayData.homeDepart,
        workArrive: dayData.workArrive,
        workDepart: dayData.workDepart,
        homeArrive: dayData.homeArrive,
        sleep: dayData.sleep,
        medications: dayData.medications || {},
        sleepDuration,
        workDuration,
        commuteToWork,
        commuteToHome,
        totalOut,
        completedTasks
      });
    }
  }

  // 날짜 추가 버튼
  const addDateBtn = '<div class="rhythm-history-add-date" style="text-align: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
    '<button onclick="addRhythmHistoryDate()" class="btn btn-secondary" style="font-size: 13px; padding: 8px 16px;" aria-label="과거 날짜 기록 추가">' +
      '📅 과거 날짜 추가' +
    '</button>' +
  '</div>';

  // 통계 버튼
  const statsBtn = '<div style="text-align: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
    '<button onclick="toggleRhythmStats()" class="btn btn-secondary" style="font-size: 13px; padding: 8px 16px;" aria-label="30일 통계 보기">' +
      (_rhythmStatsVisible ? '📊 통계 숨기기' : '📊 30일 통계') +
    '</button>' +
  '</div>';

  // 통계 섹션
  const statsSection = renderRhythmStats();

  if (records.length === 0) {
    return addDateBtn + statsBtn + statsSection + '<div class="rhythm-history-empty"><div class="rhythm-history-empty-icon">😴</div><div>기록이 없습니다</div><div style="font-size: 13px; margin-top: 8px;">오늘 탭에서 리듬을 기록해보세요</div></div>';
  }

  return addDateBtn + statsBtn + statsSection + '<div class="rhythm-history-list">' + records.map(r => {
    return '<div class="rhythm-history-item ' + (r.isToday ? 'today' : '') + '">' +
      '<div class="rhythm-history-date">' +
        '<span class="rhythm-history-day">' + r.dayLabel + '</span>' +
        '<span class="rhythm-history-date-num">' + r.dateLabel + '</span>' +
        (r.isToday ? '<span class="rhythm-history-today-badge">오늘</span>' : '') +
      '</div>' +
      '<div class="rhythm-history-timeline six-items">' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'wakeUp\')" title="기상">' + (r.wakeUp ? '☀️' + r.wakeUp : '<span class="empty">☀️--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'homeDepart\')" title="집출발">' + (r.homeDepart ? '🚶' + r.homeDepart : '<span class="empty">🚶--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'workArrive\')" title="회사도착">' + (r.workArrive ? '🏢' + r.workArrive : '<span class="empty">🏢--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'workDepart\')" title="회사출발">' + (r.workDepart ? '🚀' + r.workDepart : '<span class="empty">🚀--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'homeArrive\')" title="집도착">' + (r.homeArrive ? '🏠' + r.homeArrive : '<span class="empty">🏠--:--</span>') + '</span>' +
        '<span class="rhythm-history-time" onclick="editLifeRhythmHistory(\'' + escapeAttr(r.date) + '\', \'sleep\')" title="취침">' + (r.sleep ? '🌙' + r.sleep : '<span class="empty">🌙--:--</span>') + '</span>' +
      '</div>' +
      // 복약 히스토리 행
      (() => {
        const medSlots = getMedicationSlots();
        if (!medSlots || medSlots.length === 0) return '';
        const meds = r.medications || {};
        const hasMedData = medSlots.some(s => meds[s.id]);
        if (!hasMedData && !r.isToday) return '';
        return '<div class="rhythm-history-meds">' +
          medSlots.map(s => {
            const taken = !!meds[s.id];
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

// 리듬 통계 표시 토글 상태
let _rhythmStatsVisible = false;

/**
 * 라이프 리듬 30일 통계 계산
 */
function calculateRhythmStats(days = 30) {
  const toMins = (t) => t ? parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]) : null;
  const today = new Date();
  const history = appState.lifeRhythm.history || {};
  const todayStr = getLocalDateStr(today);
  const medSlots = getMedicationSlots();

  // 데이터 수집
  const data = { wakeUp: [], sleep: [], homeDepart: [], workArrive: [], workDepart: [], homeArrive: [], commuteToWork: [], commuteToHome: [], sleepDuration: [], workDuration: [] };
  const weekday = { wakeUp: [], sleep: [], commuteToWork: [], commuteToHome: [] };
  const weekend = { wakeUp: [], sleep: [] };
  const medStats = {}; // slotId → { total, taken, required }
  medSlots.forEach(s => { medStats[s.id] = { total: 0, taken: 0, required: s.required, label: s.label, icon: s.icon }; });

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(date);
    const dayOfWeek = date.getDay(); // 0=일, 6=토
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let dayData;
    if (i === 0 && appState.lifeRhythm.today.date === todayStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = history[dateStr];
    }
    if (!dayData) continue;

    // 시간 데이터 수집
    if (dayData.wakeUp) {
      const m = toMins(dayData.wakeUp);
      data.wakeUp.push(m);
      if (isWeekend) weekend.wakeUp.push(m); else weekday.wakeUp.push(m);
    }
    if (dayData.sleep) {
      let m = toMins(dayData.sleep);
      // 자정 넘긴 취침 보정 (00:00~05:00 → +24h)
      if (m < 5 * 60) m += 24 * 60;
      data.sleep.push(m);
      if (isWeekend) weekend.sleep.push(m); else weekday.sleep.push(m);
    }
    if (dayData.homeDepart) data.homeDepart.push(toMins(dayData.homeDepart));
    if (dayData.workArrive) data.workArrive.push(toMins(dayData.workArrive));
    if (dayData.workDepart) data.workDepart.push(toMins(dayData.workDepart));
    if (dayData.homeArrive) data.homeArrive.push(toMins(dayData.homeArrive));

    // 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      const dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur > 0 && dur < 180) {
        data.commuteToWork.push(dur);
        if (!isWeekend) weekday.commuteToWork.push(dur);
      }
    }
    if (dayData.workDepart && dayData.homeArrive) {
      const dur = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur > 0 && dur < 180) {
        data.commuteToHome.push(dur);
        if (!isWeekend) weekday.commuteToHome.push(dur);
      }
    }

    // 수면 시간 (전날 취침 ~ 오늘 기상)
    if (i < days - 1 && dayData.wakeUp) {
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStr = getLocalDateStr(prevDate);
      const prevData = history[prevStr] || {};
      if (prevData.sleep) {
        const sleepTime = toMins(prevData.sleep);
        const wakeTime = toMins(dayData.wakeUp);
        let duration = wakeTime + (24 * 60 - sleepTime);
        if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
        if (duration > 0 && duration < 16 * 60) {
          data.sleepDuration.push(duration);
        }
      }
    }

    // 근무 시간
    if (dayData.workArrive && dayData.workDepart) {
      const dur = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur > 0) data.workDuration.push(dur);
    }

    // 복약 통계
    const meds = dayData.medications || {};
    medSlots.forEach(s => {
      medStats[s.id].total++;
      if (meds[s.id]) medStats[s.id].taken++;
    });
  }

  // 평균 계산 헬퍼
  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const minsToTime = (m) => {
    if (m === null) return '--:--';
    const adjusted = m % (24 * 60);
    return String(Math.floor(adjusted / 60)).padStart(2, '0') + ':' + String(adjusted % 60).padStart(2, '0');
  };
  const minsToHM = (m) => {
    if (m === null) return '--';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? h + 'h ' + min + 'm' : min + '분';
  };

  return {
    days,
    dataPoints: Math.max(data.wakeUp.length, data.sleep.length, 1),
    avgWakeUp: minsToTime(avg(data.wakeUp)),
    avgSleep: minsToTime(avg(data.sleep)),
    avgHomeDepart: minsToTime(avg(data.homeDepart)),
    avgWorkArrive: minsToTime(avg(data.workArrive)),
    avgWorkDepart: minsToTime(avg(data.workDepart)),
    avgHomeArrive: minsToTime(avg(data.homeArrive)),
    avgCommuteToWork: minsToHM(avg(data.commuteToWork)),
    avgCommuteToHome: minsToHM(avg(data.commuteToHome)),
    avgSleepDuration: minsToHM(avg(data.sleepDuration)),
    avgWorkDuration: minsToHM(avg(data.workDuration)),
    commuteToWorkCount: data.commuteToWork.length,
    commuteToHomeCount: data.commuteToHome.length,
    // 주중 vs 주말
    weekdayWakeUp: minsToTime(avg(weekday.wakeUp)),
    weekendWakeUp: minsToTime(avg(weekend.wakeUp)),
    weekdaySleep: minsToTime(avg(weekday.sleep)),
    weekendSleep: minsToTime(avg(weekend.sleep)),
    weekdayCommuteToWork: minsToHM(avg(weekday.commuteToWork)),
    weekdayCommuteToHome: minsToHM(avg(weekday.commuteToHome)),
    // 복약
    medStats
  };
}

/**
 * 라이프 리듬 통계 토글
 */
function toggleRhythmStats() {
  _rhythmStatsVisible = !_rhythmStatsVisible;
  renderStatic();
}
window.toggleRhythmStats = toggleRhythmStats;

/**
 * 라이프 리듬 통계 섹션 렌더링
 */
function renderRhythmStats() {
  if (!_rhythmStatsVisible) return '';

  const stats = calculateRhythmStats(30);

  let medRows = '';
  const medEntries = Object.values(stats.medStats);
  if (medEntries.length > 0) {
    medRows = medEntries.map(s => {
      const rate = s.total > 0 ? Math.round((s.taken / s.total) * 100) : 0;
      const color = rate >= 80 ? 'var(--accent-success)' : rate >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
      return `<tr>
        <td>${s.icon} ${escapeHtml(s.label)}${s.required ? ' <span style="color: var(--accent-danger); font-size: 10px;">필수</span>' : ''}</td>
        <td style="color: ${color}; font-weight: 600;">${rate}% <span style="font-size: 11px; color: var(--text-muted);">(${s.taken}/${s.total})</span></td>
      </tr>`;
    }).join('');
  }

  return `
    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 14px;">📊 30일 통계 <span style="font-size: 12px; color: var(--text-muted);">(${stats.dataPoints}일 데이터)</span></div>

      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">☀️ 평균 기상</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgWakeUp}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">🌙 평균 취침</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgSleep}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">💤 평균 수면</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgSleepDuration}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">🚶 평균 출발</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgHomeDepart}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">🚌 출근 통근</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgCommuteToWork} <span style="font-size: 11px; color: var(--text-muted);">(${stats.commuteToWorkCount}회)</span></td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">🏠 퇴근 통근</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgCommuteToHome} <span style="font-size: 11px; color: var(--text-muted);">(${stats.commuteToHomeCount}회)</span></td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 8px 4px; color: var(--text-secondary);">💼 평균 근무</td>
          <td style="padding: 8px 4px; font-weight: 600;">${stats.avgWorkDuration}</td>
        </tr>
      </table>

      <div style="font-size: 14px; font-weight: 600; margin: 16px 0 10px;">📅 주중 vs 주말</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 6px 4px; color: var(--text-secondary);"></td>
          <td style="padding: 6px 4px; font-weight: 600; color: var(--accent-primary);">주중</td>
          <td style="padding: 6px 4px; font-weight: 600; color: var(--accent-warning);">주말</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 6px 4px; color: var(--text-secondary);">☀️ 기상</td>
          <td style="padding: 6px 4px;">${stats.weekdayWakeUp}</td>
          <td style="padding: 6px 4px;">${stats.weekendWakeUp}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 6px 4px; color: var(--text-secondary);">🌙 취침</td>
          <td style="padding: 6px 4px;">${stats.weekdaySleep}</td>
          <td style="padding: 6px 4px;">${stats.weekendSleep}</td>
        </tr>
        <tr>
          <td style="padding: 6px 4px; color: var(--text-secondary);">🚌 통근</td>
          <td style="padding: 6px 4px;">${stats.weekdayCommuteToWork}</td>
          <td style="padding: 6px 4px;">-</td>
        </tr>
      </table>

      ${medRows ? `
        <div style="font-size: 14px; font-weight: 600; margin: 16px 0 10px;">💊 복약 준수율</div>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          ${medRows}
        </table>
      ` : ''}
    </div>
  `;
}

/**
 * 과거 날짜 라이프 리듬 수정 (6개 항목)
 */
function editLifeRhythmHistory(dateStr, type) {
  const today = getLocalDateStr();
  let currentValue;

  if (dateStr === today && appState.lifeRhythm.today.date === today) {
    currentValue = appState.lifeRhythm.today[type];
  } else {
    currentValue = appState.lifeRhythm.history[dateStr]?.[type];
  }

  const labels = { wakeUp: '기상', homeDepart: '집출발', workArrive: '회사도착', workDepart: '회사출발', homeArrive: '집도착', sleep: '취침' };
  const newTime = prompt(dateStr + ' ' + labels[type] + ' 시간을 입력하세요 (HH:MM):', currentValue || '');

  if (newTime === null) return;

  // 시간 형식 검증
  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 07:30)', 'error');
    return;
  }

  // 시간 정규화
  let normalizedTime = null;
  if (newTime) {
    const [h, m] = newTime.split(':');
    normalizedTime = h.padStart(2, '0') + ':' + m;
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
  const dateStr = prompt('추가할 날짜를 입력하세요 (YYYY-MM-DD):', '');
  if (!dateStr) return;

  // 날짜 형식 검증
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    showToast('올바른 날짜 형식이 아닙니다 (예: 2026-02-04)', 'error');
    return;
  }

  // 유효한 날짜인지 확인
  const date = new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) {
    showToast('유효하지 않은 날짜입니다', 'error');
    return;
  }

  // 미래 날짜 차단
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    showToast('미래 날짜는 추가할 수 없습니다', 'error');
    return;
  }

  // 이미 데이터가 있으면 알림
  const localDateStr = getLocalDateStr(date);
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
  const today = getLocalDateStr();
  const slots = getMedicationSlots();
  const slot = slots.find(s => s.id === slotId);
  const label = slot ? slot.label : slotId;

  let currentValue;
  if (dateStr === today && appState.lifeRhythm.today.date === today) {
    currentValue = (appState.lifeRhythm.today.medications || {})[slotId];
  } else {
    const hist = appState.lifeRhythm.history[dateStr];
    currentValue = hist ? (hist.medications || {})[slotId] : null;
  }

  const newTime = prompt(dateStr + ' ' + label + ' 복용 시간 (HH:MM, 빈칸=삭제):', currentValue || '');
  if (newTime === null) return;

  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 08:30)', 'error');
    return;
  }

  let normalizedTime = null;
  if (newTime) {
    const [h, m] = newTime.split(':');
    normalizedTime = h.padStart(2, '0') + ':' + m;
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

// ============================================
// 라이프 리듬 저장/불러오기/일 전환
// ============================================

/**
 * 라이프 리듬 하루 전환: 자정 넘김 시 어제 데이터를 히스토리로 이동 + 오늘 초기화
 * 앱을 안 끄고 자정을 넘길 때 setInterval/visibilitychange에서 호출
 * @returns {boolean} 전환 발생 여부
 */
function checkRhythmDayChange() {
  const localToday = getLocalDateStr();
  const savedDate = appState.lifeRhythm.today.date;

  if (!savedDate || savedDate === localToday) return false;

  // 어제 데이터를 히스토리로 이동
  const hasData = Object.values(appState.lifeRhythm.today).some(v =>
    v && v !== savedDate && typeof v !== 'object'
  ) || (appState.lifeRhythm.today.medications && Object.keys(appState.lifeRhythm.today.medications).length > 0);

  if (hasData) {
    if (!appState.lifeRhythm.history) appState.lifeRhythm.history = {};
    const historyEntry = { ...appState.lifeRhythm.today };
    delete historyEntry.date;
    appState.lifeRhythm.history[savedDate] = historyEntry;
    console.log('[rhythm] ' + savedDate + ' 데이터를 히스토리로 이동');
  }

  // 오늘 초기화
  appState.lifeRhythm.today = {
    date: localToday, wakeUp: null, homeDepart: null, workArrive: null,
    workDepart: null, homeArrive: null, sleep: null, medications: {}
  };
  saveLifeRhythm();
  console.log('[rhythm] 오늘(' + localToday + ') 리듬 초기화');
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
    syncToFirebase();
  }
}

/**
 * 라이프 리듬 불러오기 (기존 데이터 마이그레이션 포함)
 */
function loadLifeRhythm() {
  const saved = localStorage.getItem('navigator-life-rhythm');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // 기존 데이터 마이그레이션 (workStart → workArrive, workEnd → workDepart)
      const migrateData = (data) => {
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
        // med_afternoon → med_afternoon_adhd 마이그레이션 (ADHD약/영양제 분리)
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
        Object.keys(parsed.history).forEach(date => {
          parsed.history[date] = migrateData(parsed.history[date]);
        });
      }

      // 날짜 변경 시 오늘의 리듬 자동 리셋
      // 저장된 today.date가 오늘 로컬 날짜와 다르면 히스토리로 이동 후 초기화
      if (parsed.today && parsed.today.date) {
        const localToday = getLocalDateStr();
        const savedDate = parsed.today.date;
        if (savedDate !== localToday) {
          const hasData = Object.values(parsed.today).some(v =>
            v && v !== savedDate && typeof v !== 'object'
          ) || (parsed.today.medications && Object.keys(parsed.today.medications).length > 0);

          if (hasData) {
            // 기존 데이터를 히스토리로 이동
            if (!parsed.history) parsed.history = {};
            const historyEntry = { ...parsed.today };
            delete historyEntry.date; // 히스토리에는 date 키 없이 저장
            parsed.history[savedDate] = historyEntry;
            console.log(`[loadLifeRhythm] ${savedDate} 데이터를 히스토리로 이동`);
          }

          // 오늘 날짜로 초기화
          parsed.today = {
            date: localToday,
            wakeUp: null,
            homeDepart: null,
            workArrive: null,
            workDepart: null,
            homeArrive: null,
            sleep: null,
            medications: {}
          };
          console.log(`[loadLifeRhythm] 오늘(${localToday}) 리듬 초기화`);
        }
      }

      appState.lifeRhythm = {
        ...appState.lifeRhythm,
        ...parsed,
        today: parsed.today || appState.lifeRhythm.today,
        history: parsed.history || {},
        settings: { ...appState.lifeRhythm.settings, ...parsed.settings }
      };

      // medicationSlots에서 med_afternoon → med_afternoon_adhd + med_afternoon_nutrient 분리 마이그레이션
      const slots = appState.lifeRhythm.settings.medicationSlots;
      if (slots) {
        const oldIdx = slots.findIndex(s => s.id === 'med_afternoon');
        if (oldIdx !== -1) {
          slots.splice(oldIdx, 1,
            { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
            { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false }
          );
        }
      }

      // 마이그레이션된 데이터 저장
      saveLifeRhythm();
    } catch (e) {
      console.error('라이프 리듬 데이터 로드 실패:', e);
    }
  }
}
