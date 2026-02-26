/**
 * 라이프 리듬 통계 모듈
 * rhythm.js에서 분리 — 7일/30일 통계 계산 및 렌더링
 *
 * 의존성 (메인 HTML / 다른 모듈에서 제공):
 *   appState, renderStatic, escapeHtml, getLocalDateStr,
 *   getMedicationSlots (rhythm-medication.js)
 *
 * rhythm.js에서 제공:
 *   _rhythmStatsVisible (모듈 변수)
 */

// ============================================
// 라이프 리듬 통계
// ============================================

/**
 * 라이프 리듬 통계 계산 (최근 7일)
 */
function getLifeRhythmStats() {
  var today = new Date();
  var dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  var sleepData = [];
  var homeDepartTimes = [];
  var workArriveTimes = [];
  var workDepartTimes = [];
  var homeArriveTimes = [];
  var workHours = [];
  var commuteToWorkTimes = [];
  var commuteToHomeTimes = [];
  var totalOutTimes = [];
  var wakeUpTimes = [];
  var bedtimes = [];

  // 시간을 분으로 변환하는 헬퍼
  var toMins = function(t) { if (!t || typeof t !== 'string') return null; var p = t.split(':'); if (p.length !== 2) return null; var h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };

  // 최근 7일 데이터 수집
  for (var i = 6; i >= 0; i--) {
    var date = new Date(today);
    date.setDate(today.getDate() - i);
    var dateStr = getLocalDateStr(date);
    var isToday = i === 0;

    var dayData;
    if (isToday && appState.lifeRhythm.today.date === dateStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = appState.lifeRhythm.history[dateStr] || {};
    }

    // 기존 데이터 마이그레이션 (workStart -> workArrive, workEnd -> workDepart)
    if (dayData.workStart && !dayData.workArrive) dayData.workArrive = dayData.workStart;
    if (dayData.workEnd && !dayData.workDepart) dayData.workDepart = dayData.workEnd;

    // 수면 시간 계산 (전날 취침 ~ 당일 기상)
    var prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    var prevDateStr = getLocalDateStr(prevDate);
    var prevData = appState.lifeRhythm.history[prevDateStr] || {};
    var sleepHours = null;

    if (prevData.sleep && dayData.wakeUp) {
      var sleepTime = toMins(prevData.sleep);
      var wakeTime = toMins(dayData.wakeUp);
      var duration = wakeTime + (24 * 60 - sleepTime);
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
      var sleepMins = toMins(dayData.sleep);
      if (sleepMins < 5 * 60) sleepMins += 24 * 60;
      bedtimes.push(sleepMins);
    }

    // 근무 시간 계산
    if (dayData.workArrive && dayData.workDepart) {
      var dur = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur > 0) workHours.push(dur / 60);
    }

    // 출근 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      var dur2 = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur2 > 0 && dur2 < 180) commuteToWorkTimes.push(dur2);
    }

    // 퇴근 통근 시간
    if (dayData.workDepart && dayData.homeArrive) {
      var dur3 = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur3 > 0 && dur3 < 180) commuteToHomeTimes.push(dur3);
    }

    // 총 외출 시간
    if (dayData.homeDepart && dayData.homeArrive) {
      var dur4 = toMins(dayData.homeArrive) - toMins(dayData.homeDepart);
      if (dur4 > 0) totalOutTimes.push(dur4 / 60);
    }
  }

  // 평균 계산 헬퍼
  var calcAvg = function(arr) { return arr.length > 0 ? arr.reduce(function(a, b) { return a + b; }, 0) / arr.length : null; };

  var validSleepData = sleepData.filter(function(d) { return d.hours !== null; });
  var avgSleep = calcAvg(validSleepData.map(function(d) { return d.hours; })) || 0;

  var avgHomeDepart = calcAvg(homeDepartTimes);
  var avgWorkArrive = calcAvg(workArriveTimes);
  var avgWorkDepart = calcAvg(workDepartTimes);
  var avgHomeArrive = calcAvg(homeArriveTimes);
  var avgWorkHrs = calcAvg(workHours);
  var avgCommuteToWork = calcAvg(commuteToWorkTimes);
  var avgCommuteToHome = calcAvg(commuteToHomeTimes);
  var avgTotalOut = calcAvg(totalOutTimes);

  // 집출발 시간 편차 계산
  var homeDepartDeviation = null;
  if (homeDepartTimes.length >= 2) {
    var mean = calcAvg(homeDepartTimes);
    var variance = homeDepartTimes.reduce(function(sum, t) { return sum + Math.pow(t - mean, 2); }, 0) / homeDepartTimes.length;
    homeDepartDeviation = Math.round(Math.sqrt(variance));
  }

  // 기상/취침 평균 및 목표 대비 계산
  var avgWakeUpMins = calcAvg(wakeUpTimes);
  var avgBedtimeMins = calcAvg(bedtimes);

  var targetWakeMins = (function() {
    var t = appState.settings.targetWakeTime || '07:00';
    var parts = t.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  })();
  var targetBedMins = (function() {
    var t = appState.settings.targetBedtime || '23:00';
    var parts = t.split(':').map(Number);
    // 자정 넘김 기준 통일 (목표가 00:00~05:00이면 +24시간)
    return (parts[0] < 5) ? parts[0] * 60 + parts[1] + 24 * 60 : parts[0] * 60 + parts[1];
  })();

  // 목표 대비 차이 (양수 = 늦음, 음수 = 일찍)
  var wakeTimeDiff = avgWakeUpMins !== null ? Math.round(avgWakeUpMins - targetWakeMins) : null;
  var bedtimeDiff = avgBedtimeMins !== null ? Math.round(avgBedtimeMins - targetBedMins) : null;

  // 인사이트 생성
  var insights = [];

  // 수면 vs 완료율 상관관계
  var completionByDay = {};
  appState.tasks.forEach(function(task) {
    if (task.completed && task.completedAt) {
      var completedDate = task.completedAt.split('T')[0];
      completionByDay[completedDate] = (completionByDay[completedDate] || 0) + 1;
    }
  });

  var goodSleepDays = sleepData.filter(function(d) { return d.hours && d.hours >= 7; });
  var badSleepDays = sleepData.filter(function(d) { return d.hours && d.hours < 6; });

  if (goodSleepDays.length >= 2 && badSleepDays.length >= 1) {
    var goodSleepCompletion = goodSleepDays.reduce(function(sum, d) { return sum + (completionByDay[d.date] || 0); }, 0) / goodSleepDays.length;
    var badSleepCompletion = badSleepDays.reduce(function(sum, d) { return sum + (completionByDay[d.date] || 0); }, 0) / badSleepDays.length;

    if (goodSleepCompletion > badSleepCompletion * 1.2) {
      var diff = Math.round((goodSleepCompletion / Math.max(badSleepCompletion, 0.1) - 1) * 100);
      insights.push({
        type: 'positive',
        icon: '\u{1F4C8}',
        text: '7시간 이상 수면한 날, 작업 완료가 ' + diff + '% 더 많았어요'
      });
    }
  }

  if (avgSleep > 0 && avgSleep < 6) {
    insights.push({
      type: 'warning',
      icon: '\u26A0\uFE0F',
      text: '평균 수면이 6시간 미만이에요. 충분한 수면이 생산성에 도움됩니다'
    });
  }

  if (homeDepartDeviation !== null && homeDepartDeviation <= 15) {
    insights.push({
      type: 'positive',
      icon: '\u2728',
      text: '출발 시간이 일정해요! 규칙적인 루틴이 유지되고 있습니다'
    });
  }

  // 통근시간 인사이트
  if (avgCommuteToWork && avgCommuteToHome) {
    var totalCommute = avgCommuteToWork + avgCommuteToHome;
    if (totalCommute > 120) {
      insights.push({
        type: 'info',
        icon: '\u{1F68C}',
        text: '하루 평균 통근 ' + Math.round(totalCommute) + '분. 이동 중 팟캐스트나 독서를 해보세요'
      });
    }
  }

  // 시간 포맷팅 헬퍼
  var formatTime = function(mins) {
    if (mins === null) return null;
    var h = Math.floor(mins / 60);
    var m = Math.round(mins % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };

  var formatDur = function(mins) {
    if (mins === null) return null;
    return Math.round(mins) + '분';
  };

  return {
    hasData: validSleepData.length > 0 || homeDepartTimes.length > 0,
    sleepData: sleepData,
    avgSleep: avgSleep,
    avgHomeDepart: formatTime(avgHomeDepart),
    avgWorkArrive: formatTime(avgWorkArrive),
    avgWorkDepart: formatTime(avgWorkDepart),
    avgHomeArrive: formatTime(avgHomeArrive),
    avgWorkHours: avgWorkHrs,
    avgCommuteToWork: formatDur(avgCommuteToWork),
    avgCommuteToHome: formatDur(avgCommuteToHome),
    avgTotalOut: avgTotalOut ? avgTotalOut.toFixed(1) + '시간' : null,
    homeDepartDeviation: homeDepartDeviation,
    avgWakeUp: formatTime(avgWakeUpMins),
    avgBedtime: formatTime(avgBedtimeMins !== null && avgBedtimeMins >= 24 * 60 ? avgBedtimeMins - 24 * 60 : avgBedtimeMins),
    wakeTimeDiff: wakeTimeDiff,
    bedtimeDiff: bedtimeDiff,
    targetSleepHours: (function() {
      // 설정 기반 목표 수면 시간 (기상 - 취침, 자정 넘김 처리)
      var dur = targetWakeMins - targetBedMins;
      if (dur <= 0) dur += 24 * 60;
      return dur / 60;
    })(),
    insights: insights
  };
}

/**
 * 라이프 리듬 30일 통계 계산
 */
function calculateRhythmStats(days) {
  if (days === undefined) days = 30;
  var toMins = function(t) { if (!t || typeof t !== 'string') return null; var p = t.split(':'); if (p.length !== 2) return null; var h = parseInt(p[0], 10), m = parseInt(p[1], 10); return isNaN(h) || isNaN(m) ? null : h * 60 + m; };
  var today = new Date();
  var history = appState.lifeRhythm.history || {};
  var todayStr = getLocalDateStr(today);
  var medSlots = getMedicationSlots();

  // 데이터 수집
  var data = { wakeUp: [], sleep: [], homeDepart: [], workArrive: [], workDepart: [], homeArrive: [], commuteToWork: [], commuteToHome: [], sleepDuration: [], workDuration: [] };
  var weekday = { wakeUp: [], sleep: [], commuteToWork: [], commuteToHome: [] };
  var weekend = { wakeUp: [], sleep: [] };
  var medStats = {}; // slotId -> { total, taken, required }
  medSlots.forEach(function(s) { medStats[s.id] = { total: 0, taken: 0, required: s.required, label: s.label, icon: s.icon }; });

  for (var i = 0; i < days; i++) {
    var date = new Date(today);
    date.setDate(today.getDate() - i);
    var dateStr = getLocalDateStr(date);
    var dayOfWeek = date.getDay(); // 0=일, 6=토
    var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    var dayData;
    if (i === 0 && appState.lifeRhythm.today.date === todayStr) {
      dayData = appState.lifeRhythm.today;
    } else {
      dayData = history[dateStr];
    }
    if (!dayData) continue;

    // 시간 데이터 수집
    if (dayData.wakeUp) {
      var m = toMins(dayData.wakeUp);
      data.wakeUp.push(m);
      if (isWeekend) weekend.wakeUp.push(m); else weekday.wakeUp.push(m);
    }
    if (dayData.sleep) {
      var sm = toMins(dayData.sleep);
      // 자정 넘긴 취침 보정 (00:00~05:00 -> +24h)
      if (sm < 5 * 60) sm += 24 * 60;
      data.sleep.push(sm);
      if (isWeekend) weekend.sleep.push(sm); else weekday.sleep.push(sm);
    }
    if (dayData.homeDepart) data.homeDepart.push(toMins(dayData.homeDepart));
    if (dayData.workArrive) data.workArrive.push(toMins(dayData.workArrive));
    if (dayData.workDepart) data.workDepart.push(toMins(dayData.workDepart));
    if (dayData.homeArrive) data.homeArrive.push(toMins(dayData.homeArrive));

    // 통근 시간
    if (dayData.homeDepart && dayData.workArrive) {
      var dur = toMins(dayData.workArrive) - toMins(dayData.homeDepart);
      if (dur > 0 && dur < 180) {
        data.commuteToWork.push(dur);
        if (!isWeekend) weekday.commuteToWork.push(dur);
      }
    }
    if (dayData.workDepart && dayData.homeArrive) {
      var dur2 = toMins(dayData.homeArrive) - toMins(dayData.workDepart);
      if (dur2 > 0 && dur2 < 180) {
        data.commuteToHome.push(dur2);
        if (!isWeekend) weekday.commuteToHome.push(dur2);
      }
    }

    // 수면 시간 (전날 취침 ~ 오늘 기상)
    if (i < days - 1 && dayData.wakeUp) {
      var prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      var prevStr = getLocalDateStr(prevDate);
      var prevData = history[prevStr] || {};
      if (prevData.sleep) {
        var sleepTime = toMins(prevData.sleep);
        var wakeTime = toMins(dayData.wakeUp);
        var duration = wakeTime + (24 * 60 - sleepTime);
        if (sleepTime < 12 * 60) duration = wakeTime - sleepTime;
        if (duration > 0 && duration < 16 * 60) {
          data.sleepDuration.push(duration);
        }
      }
    }

    // 근무 시간
    if (dayData.workArrive && dayData.workDepart) {
      var dur3 = toMins(dayData.workDepart) - toMins(dayData.workArrive);
      if (dur3 > 0) data.workDuration.push(dur3);
    }

    // 복약 통계
    var meds = dayData.medications || {};
    medSlots.forEach(function(s) {
      medStats[s.id].total++;
      if (meds[s.id]) medStats[s.id].taken++;
    });
  }

  // 평균 계산 헬퍼
  var avg = function(arr) { return arr.length ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length) : null; };
  var minsToTime = function(m) {
    if (m === null || m === undefined || isNaN(m)) return '--:--';
    var adjusted = Math.round(m) % (24 * 60);
    return String(Math.floor(adjusted / 60)).padStart(2, '0') + ':' + String(adjusted % 60).padStart(2, '0');
  };
  var minsToHM = function(m) {
    if (m === null || m === undefined || isNaN(m)) return '--';
    var rounded = Math.round(m);
    var h = Math.floor(rounded / 60);
    var min = rounded % 60;
    return h > 0 ? h + 'h ' + min + 'm' : min + '분';
  };

  return {
    days: days,
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
    medStats: medStats
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

  var stats = calculateRhythmStats(30);

  var medRows = '';
  var medEntries = Object.values(stats.medStats);
  if (medEntries.length > 0) {
    medRows = medEntries.map(function(s) {
      var rate = s.total > 0 ? Math.round((s.taken / s.total) * 100) : 0;
      var color = rate >= 80 ? 'var(--accent-success)' : rate >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
      return '<tr>' +
        '<td>' + s.icon + ' ' + escapeHtml(s.label) + (s.required ? ' <span style="color: var(--accent-danger); font-size: 10px;">필수</span>' : '') + '</td>' +
        '<td style="color: ' + color + '; font-weight: 600;">' + rate + '% <span style="font-size: 11px; color: var(--text-muted);">(' + s.taken + '/' + s.total + ')</span></td>' +
      '</tr>';
    }).join('');
  }

  return '<div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">' +
    '<div style="font-size: 16px; font-weight: 600; margin-bottom: 14px;">📊 30일 통계 <span style="font-size: 12px; color: var(--text-muted);">(' + stats.dataPoints + '일 데이터)</span></div>' +
    '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">☀️ 평균 기상</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgWakeUp + '</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">🌙 평균 취침</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgSleep + '</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">💤 평균 수면</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgSleepDuration + '</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">🚶 평균 출발</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgHomeDepart + '</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">🚌 출근 통근</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgCommuteToWork + ' <span style="font-size: 11px; color: var(--text-muted);">(' + stats.commuteToWorkCount + '회)</span></td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">🏠 퇴근 통근</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgCommuteToHome + ' <span style="font-size: 11px; color: var(--text-muted);">(' + stats.commuteToHomeCount + '회)</span></td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 8px 4px; color: var(--text-secondary);">💼 평균 근무</td><td style="padding: 8px 4px; font-weight: 600;">' + stats.avgWorkDuration + '</td></tr>' +
    '</table>' +
    '<div style="font-size: 14px; font-weight: 600; margin: 16px 0 10px;">📅 주중 vs 주말</div>' +
    '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 6px 4px; color: var(--text-secondary);"></td><td style="padding: 6px 4px; font-weight: 600; color: var(--accent-primary);">주중</td><td style="padding: 6px 4px; font-weight: 600; color: var(--accent-warning);">주말</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 6px 4px; color: var(--text-secondary);">☀️ 기상</td><td style="padding: 6px 4px;">' + stats.weekdayWakeUp + '</td><td style="padding: 6px 4px;">' + stats.weekendWakeUp + '</td></tr>' +
      '<tr style="border-bottom: 1px solid var(--border-light);"><td style="padding: 6px 4px; color: var(--text-secondary);">🌙 취침</td><td style="padding: 6px 4px;">' + stats.weekdaySleep + '</td><td style="padding: 6px 4px;">' + stats.weekendSleep + '</td></tr>' +
      '<tr><td style="padding: 6px 4px; color: var(--text-secondary);">🚌 통근</td><td style="padding: 6px 4px;">' + stats.weekdayCommuteToWork + '</td><td style="padding: 6px 4px;">-</td></tr>' +
    '</table>' +
    (medRows ? '<div style="font-size: 14px; font-weight: 600; margin: 16px 0 10px;">💊 복약 준수율</div>' +
      '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">' + medRows + '</table>' : '') +
  '</div>';
}
