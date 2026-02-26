// ============================================
// 렌더링 - 폼 관련 헬퍼
// ============================================

/**
 * 반복 설정 필드 HTML을 반환한다.
 * renderStatic()에서 사용하던 repeatField 변수를 함수로 추출.
 */
function getRepeatField() {
  return `
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
}

/**
 * 카테고리별 입력 필드 HTML을 반환한다.
 * renderStatic()에서 사용하던 categoryFields 객체를 함수로 추출.
 */
function getCategoryFields() {
  var repeatField = getRepeatField();
  return {
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
}
