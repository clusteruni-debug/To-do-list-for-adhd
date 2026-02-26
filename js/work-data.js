// ============================================
// 본업 프로젝트 - 데이터/상태 관리
// ============================================

// 모달 상태
let workModalState = {
  type: null, // 'project', 'subcategory', 'task', 'log'
  projectId: null,
  stageIdx: null,
  subcategoryIdx: null,
  taskIdx: null
};

// 상태 목록
const WORK_STATUS = {
  'not-started': { label: '미시작', color: '#a0a0a0' },
  'in-progress': { label: '진행중', color: '#667eea' },
  'completed': { label: '완료', color: '#48bb78' },
  'blocked': { label: '보류', color: '#f5576c' }
};

/**
 * 프로젝트 저장
 */
function saveWorkProjects() {
  if (!appState.user) {
    localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
  }
  // Firebase 동기화 (로그인된 경우)
  if (appState.user) {
    syncToFirebase();
  }
}

/**
 * 프로젝트 불러오기
 */
function loadWorkProjects() {
  const saved = localStorage.getItem('navigator-work-projects');
  if (saved) {
    try {
      appState.workProjects = JSON.parse(saved);

      // 기존 프로젝트 마이그레이션: 단계에 name 필드 추가
      let needsSave = false;
      appState.workProjects.forEach(project => {
        if (project.stages) {
          project.stages.forEach((stage, idx) => {
            if (!stage.name) {
              // 기존 프로젝트: 전역 배열에서 이름 가져오기
              stage.name = appState.workProjectStages[idx] || `단계 ${idx + 1}`;
              needsSave = true;
            }
          });
        }
      });
      if (needsSave) {
        saveWorkProjects();
        console.log('프로젝트 단계 마이그레이션 완료');
      }

      // 첫 프로젝트 자동 선택
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        appState.activeWorkProject = appState.workProjects[0].id;
      }
    } catch (e) {
      console.error('프로젝트 로드 실패:', e);
      appState.workProjects = [];
    }
  }
}

/**
 * 단계 완료 토글
 */
function toggleStageComplete(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].completed = !project.stages[stageIdx].completed;

  // 완료된 단계 이후의 첫 미완료 단계를 현재 단계로 설정
  const firstIncomplete = project.stages.findIndex(s => !s.completed);
  project.currentStage = firstIncomplete >= 0 ? firstIncomplete : project.stages.length - 1;

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(project.stages[stageIdx].completed ? '단계 완료!' : '단계 완료 취소', 'success');
}
window.toggleStageComplete = toggleStageComplete;

/**
 * 프로젝트 복제
 */
function duplicateWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newProject = JSON.parse(JSON.stringify(project));
  newProject.id = generateId();
  newProject.name = project.name + ' (복사본)';
  newProject.createdAt = new Date().toISOString();
  newProject.updatedAt = new Date().toISOString();
  newProject.archived = false;

  // 모든 단계와 항목 초기화
  newProject.stages.forEach(stage => {
    stage.completed = false;
    (stage.subcategories || []).forEach(sub => {
      sub.tasks.forEach(task => {
        task.status = 'not-started';
        task.logs = [];
      });
    });
  });
  newProject.currentStage = 0;
  newProject.participantCount = 0;

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 복제됨', 'success');
}
window.duplicateWorkProject = duplicateWorkProject;

/**
 * 프로젝트 슬랙 형식으로 클립보드 복사
 * - 슬랙에 붙여넣기 용도의 체크리스트 텍스트 생성
 */
function copyProjectToSlack(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const statusLabel = {
    'not-started': '',
    'in-progress': '[진행중]',
    'completed': '[완료]',
    'blocked': '[보류]'
  };

  // 마감일 포맷 헬퍼
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = [];
  lines.push('[ ' + project.name + ' 진행 리스트 ]');
  lines.push('');

  project.stages.forEach((stage, stageIdx) => {
    const stageName = getStageName(project, stageIdx);
    const subcats = stage.subcategories || [];
    if (subcats.length === 0) return;

    // 단계별 완료율 계산
    const total = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
    const done = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
    const stageStatus = total > 0 && done === total ? ' ✅' : '';

    lines.push('■ ' + stageName + stageStatus);

    subcats.forEach(sub => {
      // 중분류명이 "일반"이면 생략하고 작업만 나열
      const isGeneral = sub.name === '일반';

      if (!isGeneral) {
        // 중분류에 작업이 있으면 중분류명을 상위 항목으로 표시
        const subDone = sub.tasks.filter(t => t.status === 'completed').length;
        const subStatus = sub.tasks.length > 0 && subDone === sub.tasks.length ? ' [완료]' : '';
        lines.push(sub.name + ':' + subStatus);

        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = '  ' + task.title;
          if (status) line += ' ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      } else {
        // "일반" 중분류: 작업을 최상위로 나열
        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = task.title;
          if (status) line += ': ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      }
    });

    lines.push(''); // 단계 사이 빈 줄
  });

  const text = lines.join('\n').trim();
  navigator.clipboard.writeText(text).then(() => {
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  }).catch(() => {
    // 클립보드 API 실패 시 fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  });
}
window.copyProjectToSlack = copyProjectToSlack;

/**
 * 본업 프로젝트 단계(stage) 단위 슬랙 복사
 */
function copyStageToSlack(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const stage = project.stages[stageIdx];
  const stageName = getStageName(project, stageIdx);
  const statusLabel = { 'not-started': '', 'in-progress': '[진행중]', 'completed': '[완료]', 'blocked': '[보류]' };
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = ['■ ' + stageName];
  (stage.subcategories || []).forEach(sub => {
    const isGeneral = sub.name === '일반';
    if (!isGeneral && sub.tasks.length > 0) {
      lines.push(sub.name + ':');
    }
    sub.tasks.forEach(task => {
      const status = statusLabel[task.status] || '';
      const deadline = fmtDeadline(task);
      const prefix = isGeneral ? '' : '  ';
      let line = prefix + task.title;
      if (status) line += ' ' + status;
      if (deadline) line += deadline;
      lines.push(line);
    });
  });

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('단계 복사됨 (슬랙용)', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('단계 복사됨 (슬랙용)', 'success');
  });
}
window.copyStageToSlack = copyStageToSlack;

/**
 * 프로젝트 이름 변경
 */
function renameWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newName = prompt('프로젝트 이름:', project.name);
  if (newName === null || !newName.trim()) return;

  project.name = newName.trim();
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 이름이 변경되었습니다', 'success');
}
window.renameWorkProject = renameWorkProject;

/**
 * 프로젝트 개요(설명) 편집
 */
function editProjectDescription(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const desc = prompt('프로젝트 개요:', project.description || '');
  if (desc === null) return;

  project.description = desc.trim() || '';
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(desc.trim() ? '프로젝트 개요가 저장되었습니다' : '프로젝트 개요가 삭제되었습니다', 'success');
}
window.editProjectDescription = editProjectDescription;

/**
 * 본업 프로젝트 개별 작업 슬랙 복사
 */
function copyWorkTaskToSlack(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories[subcatIdx]?.tasks[taskIdx];
  if (!task) return;

  const statusLabel = { 'not-started': '미시작', 'in-progress': '진행중', 'completed': '완료', 'blocked': '보류' };
  let text = task.title;
  text += ' [' + (statusLabel[task.status] || '미시작') + ']';
  if (task.deadline) {
    const d = new Date(task.deadline);
    text += ' ~' + (d.getMonth()+1) + '/' + d.getDate();
  }
  if (task.logs && task.logs.length > 0) {
    text += '\n최근 기록:';
    task.logs.slice(-3).forEach(log => {
      text += '\n  - ' + log.date + ': ' + log.content;
    });
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('작업 복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('작업 복사됨', 'success');
  });
}
window.copyWorkTaskToSlack = copyWorkTaskToSlack;

/**
 * 프로젝트 아카이브
 */
function archiveWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.archived = !project.archived;
  project.updatedAt = new Date().toISOString();

  if (project.archived && appState.activeWorkProject === projectId) {
    const active = appState.workProjects.find(p => !p.archived);
    appState.activeWorkProject = active ? active.id : null;
  }

  saveWorkProjects();
  renderStatic();
  showToast(project.archived ? '아카이브됨' : '아카이브 해제됨', 'success');
}
window.archiveWorkProject = archiveWorkProject;

/**
 * 프로젝트 보류 토글
 */
function holdWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.onHold = !project.onHold;
  project.updatedAt = new Date().toISOString();

  saveWorkProjects();
  renderStatic();
  showToast(project.onHold ? '보류 처리됨' : '보류 해제됨', 'success');
}
window.holdWorkProject = holdWorkProject;

/**
 * 템플릿으로 저장
 */
function saveAsTemplate(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const templateName = prompt('템플릿 이름을 입력하세요:', project.name + ' 템플릿');
  if (!templateName) return;

  const template = {
    id: generateId(),
    name: templateName,
    stageNames: project.stages.map(s => s.name || ''),
    stages: project.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => ({ title: t.title }))
      }))
    })),
    participantGoal: project.participantGoal,
    createdAt: new Date().toISOString()
  };

  appState.workTemplates.push(template);
  if (!appState.user) {
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
  }
  if (appState.user) { syncToFirebase(); }
  showToast('템플릿 저장됨', 'success');
}
window.saveAsTemplate = saveAsTemplate;

/**
 * 참여자 수 업데이트
 */
function updateParticipantCount(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const count = prompt('현재 참여자 수:', project.participantCount || 0);
  if (count === null) return;

  project.participantCount = parseInt(count) || 0;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.updateParticipantCount = updateParticipantCount;
