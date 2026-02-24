// ============================================
// 우선순위 계산 로직
// ============================================

/**
 * 작업의 우선순위 점수 계산
 * 점수가 높을수록 우선순위 높음
 */
function calculatePriority(task) {
  let score = 0;
  const now = new Date();
  const hasDeadline = !!task.deadline;

  // 1. 마감시간 기반 점수 (가장 중요)
  if (hasDeadline) {
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) score -= 100;      // 이미 지남: 패널티
    else if (hoursLeft < 3) score += 100; // 3시간 내: 최우선
    else if (hoursLeft < 24) score += 70; // 하루 내: 높은 우선순위
    else if (hoursLeft < 72) score += 40; // 3일 내: 중간 우선순위
    else score += 20;                     // 마감 있지만 여유 있음
  }

  // 2. 카테고리 기본 점수 (마감 유무에 따라 차등)
  if (task.category === '본업') {
    score += hasDeadline ? 40 : 15;  // 마감 없으면 하단으로
  } else if (task.category === '부업') {
    score += hasDeadline ? 35 : 12;
  } else if (task.category === '일상') {
    score += hasDeadline ? 25 : 10;
  } else if (task.category === '가족') {
    score += hasDeadline ? 25 : 10;
  }

  // 3. 부업의 경우 ROI 계산 (수익/시간)
  if (task.category === '부업' && task.expectedRevenue) {
    const roi = task.expectedRevenue / task.estimatedTime;
    score += Math.min(roi * 0.1, 30); // 최대 30점까지
  }

  // 4. 짧은 작업 우대 (빠른 성취감)
  if (task.estimatedTime <= 10) score += 10;

  return score;
}

/**
 * 작업의 긴급도 레벨 반환
 */
function getUrgencyLevel(task) {
  if (!task.deadline) return 'normal';
  
  const now = new Date();
  const deadline = new Date(task.deadline);
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) return 'expired';   // 마감 지남
  if (hoursLeft < 3) return 'urgent';    // 긴급 (빨강)
  if (hoursLeft < 24) return 'warning';  // 주의 (주황)
  return 'normal';                       // 일반
}

// ============================================
// 모드 및 필터링
// ============================================

/**
 * 시간 문자열(HH:MM)을 시간(hour)으로 변환
 */
function parseTimeToHour(timeStr) {
  const [hour] = timeStr.split(':').map(Number);
  return hour;
}

/**
 * 현재 시간대 기반 모드 결정
 * 설정된 시간 기준으로 계산
 */
function getCurrentMode() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=일, 6=토
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const settings = appState.settings;

  const workStart = parseTimeToHour(settings.workStartTime);
  const workEnd = parseTimeToHour(settings.workEndTime);
  const bedtime = parseTimeToHour(settings.targetBedtime);
  const wakeTime = parseTimeToHour(settings.targetWakeTime);

  // 주말은 휴식 모드 (단, 취침 시간 가까우면 생존 모드)
  if (isWeekend) {
    if (!appState.shuttleSuccess && hour >= bedtime - 2 && hour < bedtime + 1) return '생존';
    return '주말';
  }

  // 회사 시간 (평일만)
  if (hour >= workStart && hour < workEnd) return '회사';

  // 셔틀 성공 시 여유 모드 (퇴근 후 ~ 취침)
  if (appState.shuttleSuccess && hour >= workEnd - 1 && hour < bedtime) return '여유';

  // 셔틀 실패 시 생존 모드 (취침 2시간 전부터)
  if (!appState.shuttleSuccess && hour >= bedtime - 2 && hour < bedtime + 1) return '생존';

  // 출근 전 시간 (기상 ~ 회사 시작)
  if (hour >= wakeTime && hour < workStart) return '출근';

  // 그 외는 휴식
  return '휴식';
}

/**
 * 모드별 시간 레이블 반환
 */
function getModeTimeLabel(mode, hour) {
  switch(mode) {
    case '회사': return '퇴근까지';
    case '여유': return '취침까지';
    case '생존': return '취침까지';
    case '출근': return '출근까지';
    case '주말': return '오늘 남은 시간';
    case '휴식': return '기상까지';
    default: return '남은 시간';
  }
}

/**
 * 모드별 남은 시간 계산 (설정 기반)
 */
function getModeTimeRemaining(mode, hour, now) {
  const settings = appState.settings;
  const workEnd = parseTimeToHour(settings.workEndTime);
  const bedtime = parseTimeToHour(settings.targetBedtime);
  const wakeTime = parseTimeToHour(settings.targetWakeTime);
  const workStart = parseTimeToHour(settings.workStartTime);

  let endHour;
  switch(mode) {
    case '회사': endHour = workEnd; break;
    case '여유': endHour = bedtime; break;
    case '생존': endHour = bedtime; break;
    case '출근': endHour = workStart; break;
    case '주말': endHour = bedtime; break;
    case '휴식': endHour = wakeTime; break;
    default: endHour = 24;
  }

  let hoursLeft, minutesLeft;

  // 휴식 모드: 기상 시간까지 계산
  if (mode === '휴식') {
    if (hour >= 0 && hour < wakeTime) {
      // 자정 이후 ~ 기상시간 전
      hoursLeft = wakeTime - hour - 1;
      minutesLeft = 60 - now.getMinutes();
      if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
    } else {
      // 자정 이전
      hoursLeft = (24 - hour) + wakeTime - 1;
      minutesLeft = 60 - now.getMinutes();
      if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
    }
  } else {
    hoursLeft = endHour - hour - 1;
    minutesLeft = 60 - now.getMinutes();
    if (minutesLeft === 60) { minutesLeft = 0; hoursLeft++; }
  }

  if (hoursLeft < 0) hoursLeft = 0;
  if (minutesLeft < 0) minutesLeft = 0;

  return `${hoursLeft}시간 ${minutesLeft}분`;
}

/**
 * 현재 모드에 맞게 작업 필터링 및 정렬
 */
function getFilteredTasks() {
  const mode = getCurrentMode();
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  let filtered = appState.tasks.filter(t => {
    // 완료된 작업 제외
    if (t.completed) return false;

    // 반복 작업 중 미래 마감일(내일 이후)인 작업 제외
    // 이렇게 해야 오늘 완료한 반복 작업의 "다음 회차"가 오늘 목록에 안 나옴
    if (t.deadline && t.repeatType && t.repeatType !== 'none') {
      const deadline = new Date(t.deadline);
      if (deadline > todayEnd) {
        return false; // 내일 이후 마감인 반복 작업은 숨김
      }
    }

    return true;
  });

  // 우선순위와 긴급도 계산
  filtered = filtered.map(t => ({
    ...t,
    priority: calculatePriority(t),
    urgency: getUrgencyLevel(t)
  }));

  // 우선순위 기준 정렬 (높은 순)
  filtered.sort((a, b) => b.priority - a.priority);

  // 모드별 필터링
  if (mode === '회사') {
    filtered = filtered.filter(t => t.category === '본업');
  } else if (mode === '생존') {
    // 생존 모드: 짧고 긴급한 것만
    filtered = filtered.filter(t => t.estimatedTime <= 15 || t.priority > 90);
  }

  // 검색 및 카테고리 필터 적용
  filtered = getSearchFilteredTasks(filtered);

  // 퀵 필터 적용
  if (appState.quickFilter) {
    switch (appState.quickFilter) {
      case '2min':
        filtered = filtered.filter(t => t.estimatedTime && t.estimatedTime <= 2);
        break;
      case '5min':
        filtered = filtered.filter(t => t.estimatedTime && t.estimatedTime <= 5);
        break;
      case 'urgent':
        filtered = filtered.filter(t => {
          if (!t.deadline) return false;
          const hoursLeft = (new Date(t.deadline) - new Date()) / (1000 * 60 * 60);
          return hoursLeft <= 24 && hoursLeft > 0;
        });
        break;
    }
  }

  return filtered;
}

/**
 * 카테고리별 통계 계산
 */
function getCategoryStats() {
  const categories = ['본업', '부업', '일상'];
  return categories.map(cat => {
    const allTasks = appState.tasks.filter(t => t.category === cat);
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { 
      category: cat, 
      total: total - completed,  // 남은 작업
      completed, 
      percentage 
    };
  });
}

/**
 * 수익 통계 계산 (월별/카테고리별)
 */
function getRevenueStats() {
  // 월별 수익 (최근 6개월)
  const monthlyRevenue = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[key] = { month: key, label: `${d.getMonth() + 1}월`, revenue: 0, count: 0 };
  }

  // 카테고리별 수익
  const categoryRevenue = { '부업': 0, '본업': 0, '일상': 0, '가족': 0 };

  // 총 수익
  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  let taskCount = 0;
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1) completionLog 기반 — 모든 과거+현재 완료 기록 포함
  const loggedDates = new Set();
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (!Array.isArray(entries)) continue;
    const monthKey = dateKey.slice(0, 7); // "YYYY-MM"

    entries.forEach(e => {
      if (e._summary) {
        // 압축된 데이터 — totalRevenue만 사용 (카테고리별 분배 불가)
        const rev = e.totalRevenue || 0;
        totalRevenue += rev;
        taskCount += e.count || 0;
        if (monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey].revenue += rev;
          monthlyRevenue[monthKey].count += e.count || 0;
        }
        if (monthKey === thisMonthKey) thisMonthRevenue += rev;
      } else {
        const rev = e.rv || 0;
        taskCount++;
        if (rev > 0) {
          totalRevenue += rev;
          if (monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey].revenue += rev;
            monthlyRevenue[monthKey].count++;
          }
          if (monthKey === thisMonthKey) thisMonthRevenue += rev;
          if (e.c && categoryRevenue.hasOwnProperty(e.c)) {
            categoryRevenue[e.c] += rev;
          }
        }
      }
    });
    loggedDates.add(dateKey);
  }

  // 2) appState.tasks 보완 — completionLog 도입 전 완료된 태스크
  appState.tasks.forEach(task => {
    if (!task.completed || !task.expectedRevenue) return;
    const revenue = parseInt(task.expectedRevenue) || 0;
    if (revenue <= 0) return;

    const completedDate = task.completedAt ? new Date(task.completedAt) : null;
    if (!completedDate) return; // completedAt 없으면 날짜 불명 → 이미 log에 있을 가능성 높음
    const dateKey = getLocalDateStr(completedDate);
    if (loggedDates.has(dateKey)) return; // 해당 날짜에 log가 있으면 이미 집계됨

    totalRevenue += revenue;
    taskCount++;
    const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey].revenue += revenue;
      monthlyRevenue[monthKey].count++;
    }
    if (monthKey === thisMonthKey) thisMonthRevenue += revenue;
    if (categoryRevenue.hasOwnProperty(task.category)) {
      categoryRevenue[task.category] += revenue;
    }
  });

  // 월별 데이터를 배열로 변환
  const monthlyData = Object.values(monthlyRevenue);
  const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

  // 카테고리별 데이터를 배열로 변환
  const categoryData = Object.entries(categoryRevenue)
    .filter(([_, v]) => v > 0)
    .map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    thisMonthRevenue,
    monthlyData,
    maxMonthlyRevenue,
    categoryData,
    taskCount
  };
}

/**
 * 자산관리 앱으로 수익 내보내기
 * 완료된 부업 Task의 수익을 자산관리 transaction 형식으로 변환
 */
function exportToAssetManager() {
  const completedTasks = appState.tasks.filter(t =>
    t.completed &&
    t.expectedRevenue &&
    parseInt(t.expectedRevenue) > 0
  );

  if (completedTasks.length === 0) {
    showToast('내보낼 수익 데이터가 없습니다', 'warning');
    return;
  }

  // 자산관리 transaction 형식으로 변환
  const transactions = completedTasks.map(task => {
    const completedDate = task.completedAt ? new Date(task.completedAt) : new Date();
    return {
      type: 'income',
      category: task.category === '부업' ? '에어드랍' : (task.category === '본업' ? '급여' : '기타수입'),
      amount: parseInt(task.expectedRevenue),
      title: task.title,
      description: `[Navigator] ${task.category} - ${task.title}`,
      date: getLocalDateStr(completedDate),
      tags: ['navigator', task.category.toLowerCase()],
      source: 'navigator'
    };
  });

  // JSON으로 변환
  const exportData = {
    source: 'navigator',
    exportedAt: new Date().toISOString(),
    summary: {
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      taskCount: transactions.length
    },
    transactions: transactions
  };

  // 클립보드에 복사
  const jsonStr = JSON.stringify(exportData, null, 2);

  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast(`${transactions.length}개 수익 데이터가 클립보드에 복사되었습니다.\n자산관리 앱에서 가져오기 해주세요.`, 'success');
  }).catch(() => {
    // 클립보드 접근 실패 시 다운로드 제공
    downloadAssetExport(exportData);
  });
}

/**
 * 수익 데이터 JSON 다운로드
 */
function downloadAssetExport(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `navigator-revenue-${getLocalDateStr()}.json`;
  document.body.appendChild(a);
  try { a.click(); } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  showToast('수익 데이터 파일이 다운로드되었습니다', 'success');
}

// 전역 함수로 노출
window.exportToAssetManager = exportToAssetManager;

/**
 * 긴급 작업 목록 반환
 */
function getUrgentTasks() {
  return appState.tasks
    .filter(t => !t.completed && t.deadline)
    .map(t => ({
      ...t,
      urgency: getUrgencyLevel(t)
    }))
    .filter(t => t.urgency === 'urgent' || t.urgency === 'warning')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

// ============================================
// 데이터 인사이트 함수
// ============================================

/**
 * 시간대별 생산성 분석
 */
function getHourlyProductivity() {
  const hourlyData = {};
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = 0;
  }

  // completionLog 기반 시간대별 집계
  for (const entries of Object.values(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (e._summary) return; // 압축된 데이터는 시간 정보 없음
      const hour = parseInt(e.at.split(':')[0], 10);
      if (hour >= 0 && hour < 24) hourlyData[hour]++;
    });
  }

  // 가장 생산적인 시간대 찾기
  let maxHour = 0;
  let maxCount = 0;
  for (let i = 0; i < 24; i++) {
    if (hourlyData[i] > maxCount) {
      maxCount = hourlyData[i];
      maxHour = i;
    }
  }

  // 시간대별 그룹화 (아침/점심/오후/저녁/밤)
  const periods = {
    morning: { name: '아침 (6-11시)', count: 0, hours: [6, 7, 8, 9, 10, 11] },
    lunch: { name: '점심 (11-14시)', count: 0, hours: [11, 12, 13, 14] },
    afternoon: { name: '오후 (14-18시)', count: 0, hours: [14, 15, 16, 17, 18] },
    evening: { name: '저녁 (18-22시)', count: 0, hours: [18, 19, 20, 21, 22] },
    night: { name: '밤 (22-6시)', count: 0, hours: [22, 23, 0, 1, 2, 3, 4, 5] }
  };

  for (let i = 0; i < 24; i++) {
    if (i >= 6 && i < 11) periods.morning.count += hourlyData[i];
    else if (i >= 11 && i < 14) periods.lunch.count += hourlyData[i];
    else if (i >= 14 && i < 18) periods.afternoon.count += hourlyData[i];
    else if (i >= 18 && i < 22) periods.evening.count += hourlyData[i];
    else periods.night.count += hourlyData[i];
  }

  // 가장 생산적인 시간대
  let bestPeriod = 'morning';
  let bestCount = 0;
  Object.keys(periods).forEach(key => {
    if (periods[key].count > bestCount) {
      bestCount = periods[key].count;
      bestPeriod = key;
    }
  });

  return {
    hourlyData,
    peakHour: maxHour,
    peakCount: maxCount,
    periods,
    bestPeriod: periods[bestPeriod],
    totalCompleted: Object.values(hourlyData).reduce((a, b) => a + b, 0)
  };
}

/**
 * 카테고리별 완료 분배
 */
function getCategoryDistribution() {
  const distribution = {};
  let total = 0;

  // completionLog 기반 카테고리 분포
  for (const entries of Object.values(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (e._summary) {
        // 압축된 데이터 — 카테고리별 count 사용
        if (e.categories) {
          Object.entries(e.categories).forEach(([cat, cnt]) => {
            distribution[cat] = (distribution[cat] || 0) + cnt;
            total += cnt;
          });
        }
        return;
      }
      const cat = e.c || '기타';
      distribution[cat] = (distribution[cat] || 0) + 1;
      total++;
    });
  }
  const result = Object.keys(distribution).map(cat => ({
    category: cat,
    count: distribution[cat],
    percentage: total > 0 ? Math.round((distribution[cat] / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  return { distribution: result, total };
}

/**
 * 요일별 생산성 분석
 */
function getDayOfWeekProductivity() {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayData = [0, 0, 0, 0, 0, 0, 0];

  // completionLog 기반 요일별 집계
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    const day = new Date(dateKey + 'T12:00:00').getDay(); // UTC 시차 방지
    let count = 0;
    (entries || []).forEach(e => {
      count += (e._summary && e.count) ? e.count : 1;
    });
    dayData[day] += count;
  }

  const maxDay = dayData.indexOf(Math.max(...dayData));

  return {
    data: dayNames.map((name, i) => ({ name, count: dayData[i] })),
    bestDay: dayNames[maxDay],
    bestDayCount: dayData[maxDay]
  };
}

// ============================================
// 히스토리 / 캘린더 관련 함수
// ============================================

/**
 * 특정 날짜의 완료된 작업 목록 가져오기
 */
function getCompletedTasksByDate(dateStr) {
  const results = [];
  const seen = new Set();

  // 1. completionLog에서 조회 (영구 기록) — 동일 제목+시간도 각각 표시
  const logEntries = (appState.completionLog || {})[dateStr] || [];
  logEntries.forEach((e, idx) => {
    if (e._summary) return; // 압축된 요약 데이터 건너뛰기
    const key = 'log|' + idx + '|' + e.t + '|' + e.at;
    seen.add(key);
    // tasks 중복 체크용 별도 키도 등록
    const dedupKey = e.t + '|' + e.at;
    seen.add(dedupKey);
    results.push({
      title: e.t,
      category: e.c,
      completedAt: dateStr + 'T' + e.at,
      repeatType: e.r || null,
      expectedRevenue: e.rv || 0,
      estimatedTime: 0,
      fromLog: true,
      logIndex: idx  // completionLog 내 원래 인덱스 (수정/삭제용)
    });
  });

  // 2. appState.tasks에서 보완 (completionLog에 없는 항목)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const completedDate = getLocalDateStr(new Date(t.completedAt));
    if (completedDate !== dateStr) return;
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const key = t.title + '|' + timeStr;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(t);
    }
  });

  return results.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

/**
 * 날짜별 완료 작업 수 맵 생성
 * @param {string} [habitTitle] - 특정 습관만 필터 (없으면 전체)
 */
function getCompletionMap(habitTitle) {
  const map = {};
  // completionLog 기반 (과거 영구 기록 포함)
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (habitTitle && e.t !== habitTitle) return;
      if (e._summary) {
        if (!habitTitle) map[dateKey] = (map[dateKey] || 0) + (e.count || 0);
      } else {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    });
  }
  // appState.tasks 현재 데이터로 보완 (completionLog와 중복되지 않는 항목만 추가)
  appState.tasks.forEach(t => {
    if (habitTitle && t.title !== habitTitle) return;
    if (t.completed && t.completedAt) {
      const dateKey = getLocalDateStr(new Date(t.completedAt));
      const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
      const logEntries = (appState.completionLog || {})[dateKey] || [];
      // completionLog에 같은 제목+시간 항목이 없는 경우만 카운트
      const isDuplicate = logEntries.some(e => e.t === t.title && e.at === timeStr);
      if (!isDuplicate) {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    }
  });
  return map;
}

/**
 * 주간 통계 계산
 */
function getWeeklyStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // 이번 주 일요일
  weekStart.setHours(0, 0, 0, 0);

  // completionLog 기반 일별 완료 수 계산
  const completionMap = getCompletionMap();
  const dailyCounts = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStr = getLocalDateStr(day);
    dailyCounts.push(completionMap[dayStr] || 0);
  }

  const totalCompleted = dailyCounts.reduce((a, b) => a + b, 0);
  const daysWithActivity = dailyCounts.filter(c => c > 0).length;
  const avgPerDay = daysWithActivity > 0 ? (totalCompleted / daysWithActivity).toFixed(1) : 0;

  return {
    total: totalCompleted,
    avgPerDay: avgPerDay,
    activeDays: daysWithActivity,
    dailyCounts: dailyCounts
  };
}

/**
 * 캘린더 이전 달로 이동
 */
function prevMonth() {
  appState.historyState.viewingMonth--;
  if (appState.historyState.viewingMonth < 0) {
    appState.historyState.viewingMonth = 11;
    appState.historyState.viewingYear--;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}

/**
 * 캘린더 다음 달로 이동
 */
function nextMonth() {
  appState.historyState.viewingMonth++;
  if (appState.historyState.viewingMonth > 11) {
    appState.historyState.viewingMonth = 0;
    appState.historyState.viewingYear++;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}

/**
 * 캘린더에서 날짜 선택
 */
function selectDate(dateStr) {
  if (appState.historyState.selectedDate === dateStr) {
    appState.historyState.selectedDate = null;
  } else {
    appState.historyState.selectedDate = dateStr;
  }
  renderStatic();
}

/**
 * 히스토리에서 날짜 그룹 토글
 */
function toggleHistoryDate(dateStr) {
  appState.historyState.expandedDates[dateStr] = !appState.historyState.expandedDates[dateStr];
  renderStatic();
}

/**
 * 캘린더 렌더링 HTML 생성
 */
function renderCalendar() {
  const year = appState.historyState.viewingYear;
  const month = appState.historyState.viewingMonth;
  const completionMap = getCompletionMap();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const today = new Date();
  const todayStr = getLocalDateStr(today);

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
                      '7월', '8월', '9월', '10월', '11월', '12월'];

  let daysHtml = '';

  // 빈 칸 (이전 달)
  for (let i = 0; i < startDayOfWeek; i++) {
    daysHtml += '<div class="calendar-day empty"></div>';
  }

  // 날짜 칸
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = completionMap[dateStr] || 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === appState.historyState.selectedDate;

    // 활동 레벨 (1-4)
    let level = 0;
    if (count > 0) level = 1;
    if (count >= 3) level = 2;
    if (count >= 5) level = 3;
    if (count >= 7) level = 4;

    const classes = [
      'calendar-day',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      count > 0 ? 'has-activity' : '',
      count > 0 ? `level-${level}` : ''
    ].filter(Boolean).join(' ');

    daysHtml += `
      <div class="${classes}" onclick="selectDate('${dateStr}')">
        <span class="calendar-day-number">${day}</span>
        ${count > 0 ? '<span class="calendar-day-dot"></span>' : ''}
      </div>
    `;
  }

  return `
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="calendar-title">${year}년 ${monthNames[month]}</div>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" onclick="prevMonth()">◀</button>
          <button class="calendar-nav-btn" onclick="nextMonth()">▶</button>
        </div>
      </div>
      <div class="calendar-weekdays">
        <div class="calendar-weekday">일</div>
        <div class="calendar-weekday">월</div>
        <div class="calendar-weekday">화</div>
        <div class="calendar-weekday">수</div>
        <div class="calendar-weekday">목</div>
        <div class="calendar-weekday">금</div>
        <div class="calendar-weekday">토</div>
      </div>
      <div class="calendar-days">
        ${daysHtml}
      </div>
      <div class="calendar-legend">
        <div class="legend-item"><div class="legend-box empty"></div>없음</div>
        <div class="legend-item"><div class="legend-box level-1"></div>1-2개</div>
        <div class="legend-item"><div class="legend-box level-2"></div>3-4개</div>
        <div class="legend-item"><div class="legend-box level-3"></div>5-6개</div>
        <div class="legend-item"><div class="legend-box level-4"></div>7+개</div>
      </div>
    </div>
  `;
}

/**
 * 시간 입력 편의 파싱: 1430→14:30, 930→09:30, 9→09:00, 14:30→14:30
 */
function parseTimeInput(input) {
  if (!input) return null;
  const s = input.trim().replace(/[：]/, ':'); // 전각 콜론도 처리
  // 이미 HH:MM 형식
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    return null;
  }
  // 숫자만 입력
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  let h, m;
  if (digits.length === 4) { h = parseInt(digits.slice(0, 2)); m = parseInt(digits.slice(2)); }       // 1430
  else if (digits.length === 3) { h = parseInt(digits.slice(0, 1)); m = parseInt(digits.slice(1)); }   // 930
  else if (digits.length <= 2) { h = parseInt(digits); m = 0; }                                        // 9, 14
  else return null;
  if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  return null;
}

/**
 * completionLog 항목 추가 (과거 날짜에 완료 기록 추가)
 */
function addCompletionLogEntry(dateStr) {
  const title = prompt('제목:');
  if (title === null) return; // 취소
  if (!title.trim()) { showToast('제목을 입력해주세요', 'error'); return; }

  const categories = ['본업', '부업', '일상', '가족'];
  const catIdx = prompt('카테고리 (1:본업, 2:부업, 3:일상, 4:가족):', '3');
  if (catIdx === null) return;
  const cat = categories[parseInt(catIdx) - 1] || '일상';

  // 오늘이면 현재 시간, 과거 날짜면 12:00 기본값
  const todayStr = getLocalDateStr(new Date());
  const defaultTime = dateStr === todayStr ? new Date().toTimeString().slice(0, 5) : '12:00';
  const time = prompt('완료 시간 (예: 1430, 930, 9, 14:30):', defaultTime);
  if (time === null) return;
  const parsed = parseTimeInput(time);
  if (!parsed && time.trim()) {
    showToast('시간 형식이 올바르지 않아 기본값을 사용합니다', 'warning');
  }
  const finalTime = parsed || defaultTime;

  const revenueStr = prompt('수익 (원, 없으면 0):', '0');
  if (revenueStr === null) return;
  const revenue = parseInt(revenueStr) || 0;

  // completionLog에 추가
  if (!appState.completionLog) appState.completionLog = {};
  if (!appState.completionLog[dateStr]) appState.completionLog[dateStr] = [];
  appState.completionLog[dateStr].push({
    t: title.trim(),
    c: cat,
    at: finalTime,
    rv: revenue
  });

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 추가되었습니다', 'success');
}
window.addCompletionLogEntry = addCompletionLogEntry;

/**
 * completionLog 항목 삭제 (과거 완료 기록 삭제)
 */
function deleteCompletionLogEntry(dateStr, index) {
  const entries = (appState.completionLog || {})[dateStr];
  if (!entries || !entries[index]) return;

  if (!confirm(`"${entries[index].t}" 기록을 삭제하시겠습니까?`)) return;

  entries.splice(index, 1);
  // 해당 날짜에 기록이 0개면 날짜 키 자체 제거
  if (entries.length === 0) delete appState.completionLog[dateStr];

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 삭제되었습니다', 'success');
}
window.deleteCompletionLogEntry = deleteCompletionLogEntry;

/**
 * completionLog 항목 수정 (날짜/시간 변경)
 */
function editCompletionLogEntry(dateStr, index) {
  const entries = (appState.completionLog || {})[dateStr];
  if (!entries || !entries[index]) return;
  const entry = entries[index];

  // 모달 HTML
  const modalId = 'edit-log-modal';
  document.getElementById(modalId)?.remove();

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:10000';
  modal.innerHTML = `
    <div class="modal" style="max-width:340px">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">📝 기록 수정</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()" aria-label="닫기">×</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div style="margin-bottom:12px;font-size:16px;color:var(--text-secondary)">${escapeHtml(entry.t)}</div>
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">날짜</label>
        <input type="date" id="edit-log-date" value="${dateStr}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px;margin-bottom:12px">
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">시간</label>
        <input type="text" id="edit-log-time" value="${escapeHtml(entry.at || '12:00')}" placeholder="HH:MM (예: 1430, 9:30)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px">
      </div>
      <div class="modal-footer" style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">취소</button>
        <button class="btn btn-primary" onclick="applyEditCompletionLog('${dateStr}', ${index})">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // 오버레이 클릭으로 닫기
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.getElementById('edit-log-time').focus();
}
window.editCompletionLogEntry = editCompletionLogEntry;

function applyEditCompletionLog(origDate, origIndex) {
  const entries = (appState.completionLog || {})[origDate];
  if (!entries || !entries[origIndex]) return;
  const entry = entries[origIndex];

  const newDate = document.getElementById('edit-log-date').value;
  const rawTime = document.getElementById('edit-log-time').value;
  const newTime = parseTimeInput(rawTime);

  if (!newDate) { showToast('날짜를 입력해주세요', 'error'); return; }
  if (!newTime) { showToast('올바른 시간을 입력해주세요 (예: 14:30, 930)', 'error'); return; }

  // 기존 위치에서 제거
  entries.splice(origIndex, 1);
  if (entries.length === 0) delete appState.completionLog[origDate];

  // 새 위치에 추가
  if (!appState.completionLog[newDate]) appState.completionLog[newDate] = [];
  appState.completionLog[newDate].push({ ...entry, at: newTime });

  // 모달 닫기
  const modal = document.getElementById('edit-log-modal');
  if (modal) modal.remove();

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 수정되었습니다', 'success');
}
window.applyEditCompletionLog = applyEditCompletionLog;

/**
 * 선택된 날짜의 상세 정보 렌더링
 */
function renderDayDetail() {
  const selectedDate = appState.historyState.selectedDate;
  if (!selectedDate) return '';

  const tasks = getCompletedTasksByDate(selectedDate);
  const date = new Date(selectedDate);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 ${dayNames[date.getDay()]}요일`;

  // 총 소요 시간 + 수익 계산
  const totalTime = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalRevenue = tasks.reduce((sum, t) => sum + (t.expectedRevenue || 0), 0);

  // 라이프 리듬 정보 (해당 날짜)
  const rhythmData = (appState.lifeRhythm.history || {})[selectedDate];
  // 복약 정보
  const medsData = rhythmData ? (rhythmData.medications || {}) : {};
  const medSlots = getMedicationSlots ? getMedicationSlots() : [];

  return `
    <div class="day-detail">
      <div class="day-detail-header">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="day-detail-date">${dateTitle}</div>
          <button onclick="addCompletionLogEntry('${selectedDate}')"
            style="background:var(--accent-color);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:15px;cursor:pointer;white-space:nowrap;"
            aria-label="이 날짜에 기록 추가">${svgIcon('plus', 16)} 기록 추가</button>
        </div>
        <div class="day-detail-stats">
          <div class="day-detail-stat completed">✓ ${tasks.length}개 완료</div>
          ${totalRevenue > 0 ? `<div class="day-detail-stat">💰 ${totalRevenue.toLocaleString()}원</div>` : ''}
          ${totalTime > 0 ? `<div class="day-detail-stat">⏱ ${totalTime}분</div>` : ''}
        </div>
      </div>
      ${rhythmData ? `
        <div class="day-detail-rhythm" style="padding: 8px 12px; margin-bottom: 8px; background: var(--bg-secondary); border-radius: 8px; font-size: 15px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${rhythmData.wakeUp ? `<span>☀️ ${rhythmData.wakeUp}</span>` : ''}
            ${rhythmData.homeDepart ? `<span>🏠→ ${rhythmData.homeDepart}</span>` : ''}
            ${rhythmData.workArrive ? `<span>🏢 ${rhythmData.workArrive}</span>` : ''}
            ${rhythmData.workDepart ? `<span>🏢→ ${rhythmData.workDepart}</span>` : ''}
            ${rhythmData.homeArrive ? `<span>→🏠 ${rhythmData.homeArrive}</span>` : ''}
            ${rhythmData.sleep ? `<span>🌙 ${rhythmData.sleep}</span>` : ''}
          </div>
          ${Object.keys(medsData).length > 0 ? `
            <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px;">
              ${medSlots.map(slot => {
                const taken = medsData[slot.id];
                return taken ? `<span style="color: var(--accent-color);">${slot.icon || '💊'} ${slot.label} ${taken}</span>` :
                  `<span style="color: var(--text-muted);">${slot.icon || '💊'} ${slot.label} -</span>`;
              }).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${tasks.length > 0 ? `
        <div class="day-detail-list">
          ${tasks.map(task => {
            const completedTime = new Date(task.completedAt);
            const timeStr = completedTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const cat = task.category || '기타';
            const revenue = task.expectedRevenue || 0;
            return `
              <div class="day-task-item">
                <div class="day-task-time">${timeStr}</div>
                <div class="day-task-content">
                  <div class="day-task-title completed">${escapeHtml(task.title)}</div>
                  <div class="day-task-meta">
                    <span class="category ${cat}">${escapeHtml(cat)}</span>
                    ${revenue > 0 ? ` · 💰${revenue.toLocaleString()}` : ''}
                    ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                  </div>
                </div>
                ${task.fromLog && task.logIndex !== undefined ? `
                  <div class="day-task-actions" style="display:flex;gap:4px;align-items:center;">
                    <button onclick="editCompletionLogEntry('${selectedDate}', ${task.logIndex})"
                      style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;"
                      aria-label="기록 수정" title="수정">${svgIcon('edit', 14)}</button>
                    <button onclick="deleteCompletionLogEntry('${selectedDate}', ${task.logIndex})"
                      style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;"
                      aria-label="기록 삭제" title="삭제">❌</button>
                  </div>
                ` : `<div class="day-task-status">✅</div>`}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="day-empty">
          <div class="day-empty-icon">📭</div>
          <div>이 날 완료한 작업이 없습니다</div>
          <button onclick="addCompletionLogEntry('${selectedDate}')"
            style="margin-top:12px;background:var(--accent-color);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:16px;cursor:pointer;"
            aria-label="이 날짜에 기록 추가">${svgIcon('plus', 16)} 기록 추가</button>
        </div>
      `}
    </div>
  `;
}

/**
 * 최근 기록 리스트 렌더링
 */
function renderRecentHistory() {
  // completionLog + appState.tasks 통합 조회 (날짜별 그룹화)
  const grouped = {};

  // 1. completionLog 기반 (영구 기록)
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (!Array.isArray(entries)) continue; // 압축 데이터 스킵
    if (!grouped[dateKey]) grouped[dateKey] = [];
    entries.forEach((e, idx) => {
      if (e._summary) return; // 압축된 요약 데이터 건너뛰기
      grouped[dateKey].push({
        title: e.t,
        category: e.c,
        completedAt: dateKey + 'T' + e.at,
        expectedRevenue: e.rv || 0,
        _logDate: dateKey,
        _logIndex: idx
      });
    });
  }

  // 2. appState.tasks 보완 (completionLog에 없는 항목)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    if (!grouped[dateKey]) grouped[dateKey] = [];
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const exists = grouped[dateKey].some(e => {
      const eTime = new Date(e.completedAt).toTimeString().slice(0, 5);
      return e.title === t.title && eTime === timeStr;
    });
    if (!exists) {
      grouped[dateKey].push(t);
    }
  });

  const allDates = Object.keys(grouped);
  if (allDates.length === 0) {
    return `
      <div class="day-empty">
        <div class="day-empty-icon">📝</div>
        <div>아직 완료한 작업이 없습니다</div>
        <div style="margin-top: 10px; font-size: 16px; color: var(--text-secondary);">
          작업을 완료하면 여기에 기록됩니다
        </div>
      </div>
    `;
  }

  // 최근 날짜순 정렬 — 30일
  const sortedDates = allDates.sort((a, b) => new Date(b) - new Date(a));
  const recentDates = sortedDates.slice(0, 30);

  return `
    <div class="history-list">
      ${recentDates.map(dateStr => {
        const tasks = grouped[dateStr].sort((a, b) =>
          new Date(a.completedAt) - new Date(b.completedAt)
        );
        const date = new Date(dateStr);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const isToday = dateStr === getLocalDateStr();
        const isYesterday = dateStr === getLocalDateStr(new Date(Date.now() - 86400000));

        let dateTitle;
        if (isToday) dateTitle = '오늘';
        else if (isYesterday) dateTitle = '어제';
        else dateTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;

        const isExpanded = appState.historyState.expandedDates[dateStr];
        const dayRevenue = tasks.reduce((s, t) => s + (t.expectedRevenue || 0), 0);

        return `
          <div class="history-date-group">
            <div class="history-date-header" onclick="toggleHistoryDate('${dateStr}')">
              <div class="history-date-title">${dateTitle}</div>
              <div class="history-date-count">✓ ${tasks.length}개${dayRevenue > 0 ? ` · 💰${dayRevenue.toLocaleString()}` : ''} ${isExpanded ? '▲' : '▼'}</div>
            </div>
            <div class="history-date-tasks ${isExpanded ? 'show' : ''}">
              ${tasks.map(task => {
                const time = new Date(task.completedAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit', minute: '2-digit'
                });
                const hasLog = task._logDate !== undefined && task._logIndex !== undefined;
                return `
                  <div class="history-task">
                    <span class="history-task-check">✓</span>
                    <span class="history-task-title">${escapeHtml(task.title)}</span>
                    ${hasLog ? `<span class="history-task-time" onclick="editCompletionLogEntry('${task._logDate}', ${task._logIndex})" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px" title="클릭하여 날짜/시간 수정">${time}</span>` : `<span class="history-task-time">${time}</span>`}
                    ${hasLog ? `<button class="btn-small delete" onclick="deleteCompletionLogEntry('${task._logDate}', ${task._logIndex})" title="기록 삭제" aria-label="기록 삭제" style="padding:2px 6px;font-size:14px;min-width:28px;min-height:28px;opacity:0.4;margin-left:4px;">×</button>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

