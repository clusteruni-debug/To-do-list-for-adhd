# Navigator 핵심 테스트 시나리오

> CLAUDE.md에서 이동. 코드 수정 후 영향받는 항목을 검증.

## 1. 작업 CRUD
- 퀵 추가: 입력 → 엔터 → 목록에 표시 + saveState
- 상세 추가: 모든 필드 → 저장 → 새로고침 후 유지
- 수정: 편집 → 저장 → 변경 반영 (editingTaskId 정리)
- 삭제: 삭제 → confirm → trash 이동 + deletedIds 기록
- 완료: 체크 → completedAt + completionLog + todayStats 증가
- 완료 취소: undoComplete → completionLog 제거 + todayStats 감소
- 브레인덤프: 여러 줄 → 각 줄 개별 Task (#카테고리 파싱)

## 2. 반복 작업
- daily/weekdays/weekends/weekly/monthly 반복
- 일일 리셋: checkDailyReset() → 완료 초기화
- 리셋 후 재완료: completionLog 중복 없음

## 3. Firebase 동기화
- 로그인 → loadFromFirebase → 병합 + migrateNumericIds
- 로컬 변경 → syncToFirebase (1.5초 디바운스)
- 다른 기기 변경 → onSnapshot → 병합 + 토스트
- 오프라인 → 온라인 복귀 자동 동기화
- 핑퐁 방지: lastOwnWriteTimestamp
- deletedIds: 삭제 항목 부활 방지
- 비로그인: localStorage만

## 4. ID 호환성
- 숫자 ID → migrateNumericIds → UUID 변환
- generateId() UUID 형식
- find(t => t.id === id) === 비교

## 5. 본업 프로젝트
- 프로젝트 CRUD + stages 자동 생성
- 중분류 CRUD + updatedAt 갱신
- 프로젝트 아카이브/복원/전환

## 6. 라이프 리듬
- recordLifeRhythm → today 업데이트 + history
- 자정 후 today 초기화
- 복약 기록 토글
- 7일/30일 평균 (NaN 방어)

## 7. 통근 트래커
- 루트 CRUD
- 소요시간: departTime/arriveTime → duration (음수 방어)

## 8. UI 렌더링
- 탭 전환 시 해당 탭만 렌더링
- renderStatic 후 스크롤/포커스 보존
- XSS: escapeHtml() 통과
- 빈 상태 메시지 (에러 아님)

## 9. 데이터 내보내기/가져오기
- exportData → JSON 다운로드
- importData → validateTasks → 병합/덮어쓰기
- 파일 검증: JSON 아닌 파일 → 에러

## 10. 엣지 케이스
- 더블클릭 중복 처리 방지
- 빈 제목 → 에러 토스트
- visibilitychange → checkDailyReset
- 모달 중첩 방지
- 터치 changedTouches 확인
- setInterval 중복 등록 방지
