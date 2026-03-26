// ============================================
// 본업 프로젝트 - 템플릿 CRUD
// (work-data.js에서 분리)
// ============================================

/**
 * 템플릿 삭제 (soft-delete)
 */
function deleteWorkTemplate(templateId) {
  if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
  if (!appState.deletedIds.workTemplates) appState.deletedIds.workTemplates = {};
  appState.deletedIds.workTemplates[templateId] = new Date().toISOString();
  appState.workTemplates = appState.workTemplates.filter(t => t.id !== templateId);
  saveWorkTemplates();
  closeWorkModal();
  showWorkModal('template-manage');
  showToast('템플릿 삭제됨', 'success');
}
window.deleteWorkTemplate = deleteWorkTemplate;

/**
 * 템플릿 단계 추가
 */
function addTemplateStage(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  const name = prompt('새 단계 이름:');
  if (!name || !name.trim()) return;
  if (!template.stageNames) template.stageNames = [];
  if (!template.stages) template.stages = [];
  template.stageNames.push(name.trim());
  template.stages.push({ subcategories: [] });
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.addTemplateStage = addTemplateStage;

/**
 * 템플릿 단계 삭제
 */
function deleteTemplateStage(templateId, stageIdx) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  if (!confirm('이 단계를 삭제하시겠습니까?')) return;
  if (!template.stageNames) template.stageNames = [];
  template.stageNames.splice(stageIdx, 1);
  template.stages.splice(stageIdx, 1);
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.deleteTemplateStage = deleteTemplateStage;

/**
 * 템플릿 단계 이름 수정
 */
function renameTemplateStage(templateId, stageIdx) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  if (!template.stageNames) template.stageNames = [];
  const newName = prompt('단계 이름:', template.stageNames[stageIdx] || '');
  if (!newName || !newName.trim()) return;
  template.stageNames[stageIdx] = newName.trim();
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.renameTemplateStage = renameTemplateStage;

/**
 * 템플릿 단계 순서 이동
 */
function moveTemplateStage(templateId, stageIdx, direction) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;
  const newIdx = stageIdx + (direction === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= template.stages.length) return;
  // stageNames 스왑
  if (template.stageNames) {
    const tmp = template.stageNames[stageIdx];
    template.stageNames[stageIdx] = template.stageNames[newIdx];
    template.stageNames[newIdx] = tmp;
  }
  // stages 스왑
  const tmpStage = template.stages[stageIdx];
  template.stages[stageIdx] = template.stages[newIdx];
  template.stages[newIdx] = tmpStage;
  template.updatedAt = new Date().toISOString();
  saveWorkTemplates();
}
window.moveTemplateStage = moveTemplateStage;

/**
 * 커스텀 템플릿 생성
 */
function createCustomTemplate() {
  const name = prompt('새 템플릿 이름:');
  if (!name || !name.trim()) return;
  const template = {
    id: generateId(),
    name: name.trim(),
    stageNames: [],
    stages: [],
    participantGoal: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appState.workTemplates.push(template);
  saveWorkTemplates();
  showToast('템플릿 생성됨', 'success');
  showTemplateEditor(template.id);
}
window.createCustomTemplate = createCustomTemplate;

/**
 * 템플릿 선택 결과로 프로젝트 생성 (통합 흐름)
 */
function addWorkProjectWithTemplate(name, deadline, templateId) {
  let stages;
  let participantGoal = null;

  if (templateId) {
    const template = appState.workTemplates.find(t => t.id === templateId);
    if (!template) {
      showToast('템플릿을 찾을 수 없습니다', 'error');
      return;
    }
    const stageSource = template.stageNames || [];
    const stageCount = Math.max(stageSource.length, template.stages.length);
    stages = Array.from({ length: stageCount }, (_, idx) => ({
      name: stageSource[idx] || ('단계 ' + (idx + 1)),
      completed: false,
      startDate: null,
      endDate: null,
      subcategories: template.stages[idx]?.subcategories?.map(sub => ({
        id: generateId(),
        name: sub.name,
        startDate: null,
        endDate: null,
        tasks: sub.tasks.map(t => ({
          id: generateId(),
          title: t.title,
          status: 'not-started',
          owner: t.owner || 'me',
          estimatedTime: t.estimatedTime || 30,
          actualTime: null,
          completedAt: null,
          canStartEarly: t.canStartEarly || false,
          logs: []
        }))
      })) || []
    }));
    participantGoal = template.participantGoal || null;
  } else {
    stages = appState.workProjectStages.map(stageName => ({
      name: stageName,
      completed: false,
      subcategories: [],
      startDate: null,
      endDate: null
    }));
  }

  const newProject = {
    id: generateId(),
    name: name,
    currentStage: 0,
    deadline: deadline,
    meta: {},
    stages: stages,
    participantGoal: participantGoal,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  appState.workView = 'detail';
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 "' + escapeHtml(name) + '" 생성됨', 'success');
}
window.addWorkProjectWithTemplate = addWorkProjectWithTemplate;
