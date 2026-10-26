// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView({ api } = {}) {
  const readPanels = new Map();
  const isText = value => typeof value === 'string' && value.trim().length > 0;
  const isTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const unique = rows => new Set(rows.map(row => row?.id)).size === rows.length;
  const textRows = rows => Array.isArray(rows) && rows.every(row => row && isText(row.id) && isText(row.text));
  const validDevices = rows => Array.isArray(rows) && unique(rows) && rows.every(row => row && isText(row.id)
    && isText(row.label) && ['compliant', 'noncompliant', 'unknown'].includes(row.status));
  const validSessions = rows => Array.isArray(rows) && unique(rows) && rows.every(row => row && isText(row.id)
    && ['active', 'expired', 'revoked', 'unknown'].includes(row.status));
  const validEvents = rows => Array.isArray(rows) && unique(rows) && rows.every(row => row && isText(row.id)
    && ['access', 'xdr'].includes(row.kind) && isTime(row.at) && isText(row.summary)
    && (row.appId == null || isText(row.appId)) && textRows(row.evidence) && textRows(row.rules)
    && ['allowed', 'denied', 'unknown'].includes(row.state?.access)
    && ['active', 'expired', 'revoked', 'unknown'].includes(row.state?.session)
    && ['compliant', 'noncompliant', 'unknown'].includes(row.state?.device)
    && Array.isArray(row.supportedActions) && row.supportedActions.every(isText));

  const append = (parent, tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    parent.appendChild(node);
    return node;
  };
  const normalizeRead = (result, validate) => {
    const mode = ['connected', 'demo', 'disconnected', 'unknown'].includes(result?.meta?.mode) ? result.meta.mode : 'unknown';
    const checkedAt = isTime(result?.meta?.checkedAt) ? result.meta.checkedAt : null;
    if (result?.ok === true && ['connected', 'demo'].includes(mode) && checkedAt && validate(result.data)) return { status: 'ok', mode, data: result.data, checkedAt };
    return { status: 'error', mode, checkedAt, error: result?.ok === true
      ? { code: 'CONTRACT_MISMATCH', message: '조회 응답 형식을 확인할 수 없습니다. 이전 값이나 예시 값으로 대체하지 않습니다.' }
      : { code: isText(result?.error?.code) ? result.error.code : 'REQUEST_UNVERIFIED',
        message: isText(result?.error?.message) ? result.error.message : '조회 요청이나 응답을 확인할 수 없습니다.' } };
  };

  // 학생 API의 허용된 GET만 사용합니다. 로컬 PC API·POST·전역 화면 조작은 하지 않습니다.
  function readAgainPanel(key, input, definitions, renderBody) {
    let panel = readPanels.get(key);
    if (!panel) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', key === 'events' ? '내 앱 · 보안 기록 다시 조회' : '내 앱 · 기기·세션 다시 조회');
      append(root, 'h3', key === 'events' ? '내 앱 · 보안 기록' : '내 앱 · 기기·세션');
      const button = append(root, 'button', '다시 조회');
      button.type = 'button';
      button.setAttribute('aria-label', key === 'events' ? '보안 기록 다시 조회' : '기기·세션 다시 조회');
      button.setAttribute('aria-controls', `student-reload-${key}-content`);
      const feedback = append(root, 'p');
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.setAttribute('aria-atomic', 'true');
      append(root, 'p', '학생 영역만 다시 조회합니다. 제공 화면·AI 설명 대상을 함께 갱신하려면 상단 「다시 불러오기」를 사용하세요. PC 실측이나 디스크 재조회 기능이 아닙니다.');
      const body = append(root, 'div');
      body.id = `student-reload-${key}-content`;
      const details = append(root, 'div');
      panel = { root, button, feedback, body, details, sequence: 0, busy: false, resources: null };
      readPanels.set(key, panel);
      button.addEventListener('click', async () => {
        if (panel.busy || panel.sourceBusy || typeof api?.get !== 'function') return;
        const sequence = ++panel.sequence;
        panel.busy = true;
        panel.resources = Object.fromEntries(panel.definitions.map(def => [def.key, { status: 'loading', mode: panel.sources[def.key]?.mode }]));
        panel.paint();
        const entries = await Promise.all(panel.definitions.map(async def => {
          try { return [def.key, normalizeRead(await api.get(def.path), def.validate)]; }
          catch { return [def.key, { status: 'error', mode: 'unknown', error: { code: 'REQUEST_UNVERIFIED', message: '조회 요청을 확인할 수 없습니다. 서버 실행 상태를 확인하세요.' } }]; }
        }));
        if (sequence !== panel.sequence) return;
        panel.resources = Object.fromEntries(entries);
        panel.busy = false;
        panel.paint();
        // 버튼 노드는 교체하지 않으며 전체 학생 화면을 다시 그리지 않습니다.
      });
    }
    const signature = JSON.stringify(input);
    if (signature !== panel.signature) {
      panel.sequence++;
      panel.signature = signature;
      panel.resources = null;
      panel.busy = false;
    }
    panel.sources = Object.fromEntries(definitions.map(def => [def.key, def.source(input)]));
    panel.sourceBusy = Object.values(panel.sources).some(resource => resource?.status === 'loading');
    panel.definitions = definitions;
    panel.paint = () => {
      const current = panel.resources ?? panel.sources;
      const waiting = panel.busy || !panel.resources && panel.sourceBusy;
      const available = typeof api?.get === 'function';
      // aria-disabled와 요청 가드로 중복 실행을 막고 키보드 포커스는 유지합니다.
      panel.button.setAttribute('aria-disabled', String(waiting || !available));
      panel.body.setAttribute('aria-busy', String(waiting));
      panel.details.replaceChildren();
      const failed = definitions.filter(def => current[def.key]?.status === 'error');
      panel.feedback.textContent = !available ? '다시 조회 확인 불가: 학생 조회 API가 제공되지 않았습니다. 제공 배포본을 확인하세요.'
        : waiting ? '새로 읽는 중… 이전 결과는 현재 결과가 아닙니다.'
          : failed.length ? `조회 실패 항목: ${failed.map(def => def.label).join(', ')}. 아래 이유와 다음 행동을 확인하세요.`
            : panel.resources ? '조회 응답을 받았습니다. 실제 연결·예제 여부와 각 항목 상태를 확인하세요.' : '필요하면 「다시 조회」를 누르세요.';
      for (const def of definitions) {
        const resource = current[def.key];
        if (resource?.status === 'error') {
          append(panel.details, 'h4', `${def.label} 조회 실패`);
          append(panel.details, 'p', `${resource.error?.code ?? 'REQUEST_UNVERIFIED'}: ${resource.error?.message ?? '조회 결과를 확인할 수 없습니다.'}`);
          append(panel.details, 'p', resource.mode === 'disconnected' || resource.error?.code === 'ENGINE_NOT_CONNECTED'
            ? '다음 행동: 담당자에게 연결 준비 상태를 확인한 뒤 「다시 조회」를 누르세요. 이 버튼이 SDP 연결을 설정하지는 않습니다.'
            : '다음 행동: 로컬 앱 실행 상태와 표시된 오류를 확인한 뒤 「다시 조회」를 누르세요. 권한이 필요한 경우 설정을 바꾸거나 관리자 실행을 하지 말고 담당자에게 문의하세요.');
        }
        if (resource?.status !== 'loading' && resource?.checkedAt) append(panel.details, 'p', `${def.label} 응답 확인 시각: ${resource.checkedAt} · PC 측정 시각 아님`);
      }
      panel.body.replaceChildren(renderBody(current, Boolean(panel.resources)));
    };
    panel.paint();
    return panel.root;
  }
  // 제공 화면이 안전한 code/message로 변환한 오류만 전달합니다.
  const aiRecovery = (code) => {
    switch (code) {
      case 'ON_AI_PROVISIONING_PENDING':
      case 'ON_AI_AUTHORIZATION_CHANGED':
      case 'SUBJECT_SCOPE_UNVERIFIED':
        return '권한 준비 중 또는 확인 불가: 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.';
      case 'AI_REQUEST_UNVERIFIED':
        return 'AI 연결 또는 응답 확인 불가: 전달된 정보만으로 원인을 구분할 수 없습니다. 연결 상태를 확인하고 잠시 뒤 직접 다시 점검하세요. 계속되면 담당자에게 문의하세요.';
      case 'WB_CLCO_AUTH_REQUIRED':
        return '인증 실패: 계정 연결을 다시 확인하고 담당자에게 확인을 요청하세요.';
      case 'WB_CLCO_ACCESS_BLOCKED':
        return '접근 제한: 담당자에게 앱 이용 권한 확인을 요청하세요.';
      case 'WB_CLCO_COHORT_BUDGET_EXHAUSTED':
      case 'WB_CLCO_LIMIT_REACHED':
        return '사용량·이용 한도: 담당자에게 사용량과 한도를 확인하세요.';
      case 'WB_CLCO_SESSION_CLOSED':
        return '현재 이용 시간이 아닙니다. 이용 시간을 확인하세요.';
      case 'WB_CLCO_RATE_LIMITED':
        return '요청 제한: 잠시 뒤 직접 다시 점검하세요.';
      case 'WB_CLCO_TIMEOUT':
      case 'REQUEST_TIMEOUT':
      case 'ENGINE_TIMEOUT':
      case 'TIMEOUT':
        return '시간 초과: 잠시 뒤 직접 다시 점검하세요.';
      case 'WB_CLCO_NETWORK_ERROR':
      case 'NETWORK_ERROR':
        return '네트워크 오류: 연결 상태를 확인하고 잠시 뒤 직접 다시 점검하세요.';
      case 'WB_CLCO_CANCELLED':
      case 'REQUEST_CANCELLED':
      case 'CANCELLED':
        return '요청이 취소되었습니다. 이전 응답은 현재 결과가 아닙니다.';
      case 'MODEL_NOT_CONFIGURED':
      case 'ON_AI_MODEL_LIST_EMPTY':
        return '사용 가능한 모델 없음: 담당자에게 모델 허용 설정을 확인하세요.';
      default:
        return '응답을 확인할 수 없습니다. 기존 기록을 확인하고 담당자에게 문의하세요.';
    }
  };
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '내 로그인·기기·세션 상태');
      const line = (value) => {
        const p = document.createElement('p');
        p.textContent = String(value);
        root.appendChild(p);
      };
      const inputs = [me, devices, sessions];
      if (inputs.some((entry) => entry?.mode === 'demo')) line('예제 자료: 실제 회사 계정 정보가 아닙니다.');
      if (inputs.some((entry) => entry?.mode === 'disconnected')) line('연결 없음: 실제 서버와 연결되지 않았습니다.');
      if (inputs.some((entry) => entry?.mode === 'unknown')) line('확인 불가: 연결 상태를 확인할 수 없습니다.');
      if (inputs.some((entry) => entry?.status === 'error')) {
        for (const entry of inputs) {
          if (entry?.status === 'error') line('연결 실패: ' + (entry.error?.message ?? '서버 정보를 확인할 수 없습니다.'));
        }
        return root;
      }
      if (inputs.some((entry) => entry?.status === 'loading')) {
        line('로그인·기기·세션 정보를 불러오는 중입니다.');
        return root;
      }
      if (inputs.some((entry) => entry?.status !== 'ok')) {
        line('확인 불가: 아직 검증된 로그인·기기·세션 정보가 없습니다.');
        return root;
      }
      const identity = me?.data;
      if (!identity?.user || !identity?.device || !identity?.session || !Array.isArray(devices?.data) || !Array.isArray(sessions?.data)) {
        line('확인 불가: 서버에서 필요한 정보를 받지 못했습니다.');
        return root;
      }
      const deviceStates = { compliant: '정상', noncompliant: '점검 필요', unknown: '확인 불가' };
      const sessionStates = { active: '사용 중', expired: '만료', revoked: '취소', unknown: '확인 불가' };
      const device = devices.data.find((entry) => entry?.id === identity.device.id) ?? identity.device;
      const session = sessions.data.find((entry) => entry?.id === identity.session.id) ?? identity.session;
      const deviceStatus = deviceStates[device?.status] ?? '확인 불가';
      const sessionStatus = sessionStates[session?.status] ?? '확인 불가';
      line('사용자: ' + (identity.user.label ?? '확인 불가'));
      line('기기: ' + (device.label ?? identity.device.label ?? '확인 불가') + ' / ' + deviceStatus + ' (' + (device.status ?? 'unknown') + ')');
      line('세션: ' + sessionStatus + ' (' + (session.status ?? 'unknown') + ')');
      if (deviceStatus !== '정상' || sessionStatus !== '사용 중') line('주의: 현재 기기 또는 세션을 정상 접속으로 확인할 수 없습니다.');
      return root;
    },
    renderDecision({ status = 'idle', appId, data, error } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '업무 앱 접근 판정');
      const line = (value) => {
        const p = document.createElement('p');
        p.textContent = value;
        root.appendChild(p);
      };
      const text = (value, fallback = '확인 불가') => typeof value === 'string' && value.trim() ? value : fallback;
      // appId는 요청 대상이며, 판정·이유·시각은 검증된 응답 data에서 받습니다.
      line('업무 앱: ' + text(appId));
      if (status === 'idle') {
        line('요청 전: 앱을 골라 접속을 요청하세요.');
        return root;
      }
      if (status === 'loading') {
        line('요청 중: 접근 판정 확인 중입니다.');
        return root;
      }
      if (status === 'error') {
        line('요청 실패: ' + text(error?.message, '서버의 접근 판정을 확인할 수 없습니다.'));
        line('요청 실패는 접근 거부 판정이 아닙니다.');
        return root;
      }
      if (status !== 'ok') {
        line('판정 확인 불가: 요청 상태를 확인할 수 없습니다.');
        return root;
      }
      const decisions = {
        allow: '접근 허용',
        deny: '접근 거부',
        challenge: '추가 인증 또는 확인 필요',
        unknown: '판정 확인 불가',
      };
      const receivedCode = text(data?.decision, 'unknown');
      const code = Object.hasOwn(decisions, receivedCode) ? receivedCode : 'unknown';
      line('판정 수신: ' + decisions[code] + ' (' + code + ')');
      if (receivedCode !== code) line('수신 판정 코드: ' + receivedCode);
      if (code === 'allow') line('정책상 접근 허용이며, 실제 앱 접속 성공을 보장하지 않습니다.');
      if (code === 'challenge') line('추가 인증 또는 확인이 필요하며, 이 앱이 확인 절차를 대신 수행하지 않습니다.');
      line('판정 이유: ' + text(data?.reason, '이유 정보 없음'));
      line('판정 시각: ' + text(data?.checkedAt));
      return root;
    },
    renderEvents(input = {}) {
      return readAgainPanel('events', input, [
        { key: 'events', label: '보안 기록', path: '/api/events', source: value => value, validate: validEvents },
      ], resources => {
      const { status = 'idle', mode, data, error } = resources.events;
      const root = document.createElement('section');
      root.setAttribute('aria-label', '본인 접속·XDR 기록');
      const append = (parent, tag, value) => {
        const node = document.createElement(tag);
        if (value !== undefined) node.textContent = String(value);
        parent.appendChild(node);
        return node;
      };
      if (mode === 'demo') append(root, 'p', '예제 자료: 실제 회사 기록이 아닙니다.');
      if (mode === 'disconnected') append(root, 'p', '연결 없음: 실제 서버와 연결되지 않았습니다.');
      if (mode === 'unknown') append(root, 'p', '확인 불가: 연결 상태를 확인할 수 없습니다.');
      if (status === 'error') {
        const message = error?.code === 'CONTRACT_MISMATCH'
          ? '확인 불가: 기록 응답이 입력 계약과 일치하지 않습니다. '
          : '기록을 불러오지 못했습니다: ';
        append(root, 'p', message + (error?.message ?? '오류 정보 없음'));
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        append(root, 'p', status === 'loading' ? '기록을 불러오는 중입니다.' : '확인 불가: 아직 검증된 기록이 없습니다.');
        return root;
      }
      // 정렬과 선택 상태는 이번 렌더에만 속하며 수신 자료는 변경하지 않습니다.
      const events = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const kinds = { access: '접속', xdr: 'XDR 경보' };
      const labels = {
        access: { allowed: '접속 허용', denied: '접속 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '세션 철회', unknown: '확인 불가' },
        device: { compliant: '보안 정책 준수', noncompliant: '보안 정책 미준수', unknown: '확인 불가' },
      };
      const stateText = (type, value) => `${labels[type][value] ?? '확인 불가'}(${value ?? 'unknown'})`;
      const filter = (name, values, display) => {
        const label = append(root, 'label', name);
        const select = append(label, 'select');
        select.setAttribute('aria-label', name);
        const all = append(select, 'option', '전체');
        all.value = 'all';
        for (const value of new Set(values.filter((value) => value != null))) {
          const option = append(select, 'option', display(value));
          option.value = value;
        }
        return select;
      };
      const kind = filter('기록 종류', events.map((event) => event.kind), (value) => `${kinds[value] ?? value} (${value})`);
      const app = filter('업무 앱', events.map((event) => event.appId), (value) => value);
      const access = filter('접속 상태', events.map((event) => event.state?.access), (value) => stateText('access', value));
      const list = append(root, 'ul');
      const detail = append(root, 'div');
      const showDetail = (event) => {
        detail.replaceChildren();
        const panel = append(detail, 'section');
        panel.setAttribute('data-student-event-detail', event.id);
        append(panel, 'h3', `${event.id} 상세`);
        append(panel, 'p', '업무 앱: ' + (event.appId ?? '앱 확인 불가'));
        for (const [key, title] of [['evidence', '근거 (evidence)'], ['rules', '규칙 (rules)']]) {
          const block = append(panel, 'section');
          append(block, 'h4', title);
          const entries = event[key] ?? [];
          if (!entries.length) append(block, 'p', '없음');
          else {
            const items = append(block, 'ul');
            for (const entry of entries) append(items, 'li', `${entry.id}: ${entry.text}`);
          }
        }
        for (const [key, title] of [['access', '접속'], ['session', '세션'], ['device', '기기']]) {
          append(panel, 'h4', `${title} (state.${key})`);
          append(panel, 'p', stateText(key, event.state?.[key]));
        }
        if (event.supportedActions?.length) {
          append(panel, 'p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중입니다.');
          for (const action of event.supportedActions) {
            const button = append(panel, 'button', `${action} 미지원`);
            button.type = 'button';
            button.disabled = true;
          }
        }
      };
      const renderList = () => {
        list.replaceChildren();
        detail.replaceChildren();
        const visible = events.filter((event) => (kind.value === 'all' || event.kind === kind.value)
          && (app.value === 'all' || event.appId === app.value)
          && (access.value === 'all' || event.state?.access === access.value));
        if (!visible.length) append(list, 'li', events.length ? '필터에 맞는 기록이 없습니다.' : '표시할 기록이 없습니다.');
        for (const event of visible) {
          const row = append(list, 'li');
          row.setAttribute('data-student-event-id', event.id);
          append(row, 'p', `ID: ${event.id} · 시각: ${event.at} · 종류: ${kinds[event.kind] ?? event.kind} (${event.kind}) · 앱: ${event.appId ?? '앱 확인 불가'} · 요약: ${event.summary}`);
          const button = append(row, 'button', `${event.id} 상세`);
          button.type = 'button';
          button.addEventListener('click', () => showDetail(event));
        }
      };
      for (const select of [kind, app, access]) select.addEventListener('change', renderList);
      renderList();
      return root;
      });
    },
    renderStatus(input = {}) {
      return readAgainPanel('status', input, [
        { key: 'devices', label: '기기', path: '/api/devices', source: value => value.devices, validate: validDevices },
        { key: 'sessions', label: '세션', path: '/api/sessions', source: value => value.sessions, validate: validSessions },
      ], (resources, local) => {
      const { devices, sessions } = resources;
      const { notifications = [], diagnostics } = input;
      const modesReceived = new Set([devices?.mode, sessions?.mode]);
      const mode = local ? (modesReceived.size === 1 ? devices?.mode : 'unknown') : input.mode;
      const root = document.createElement('section');
      root.setAttribute('aria-label', '기기·세션·알림·진단 상태');
      const append = (parent, tag, text) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = String(text);
        parent.appendChild(node);
        return node;
      };
      const demo = append(root, 'section');
      demo.setAttribute('aria-label', '시연 순서');
      append(demo, 'h3', '시연 순서');
      append(demo, 'p', '학생 작성 시연 계획 · 실제 시연 완료 기록이나 예시 측정값이 아닙니다.');
      const demoSteps = append(demo, 'ol');
      for (const title of ['내 PC 상태', '연결과 기록', '학생 영역 다시 조회']) {
        append(append(demoSteps, 'li'), 'strong', title);
      }
      const demoFacts = append(demo, 'dl');
      append(demoFacts, 'dt', '한계');
      append(demoFacts, 'dd', 'Windows 실제 조회·실제 SDP 연결·브라우저 시연은 미확인입니다. 경고·오류 건수는 침해 판정이 아니며 미조회 항목을 정상으로 바꾸지 않습니다.');
      append(demoFacts, 'dt', '근거');
      append(demoFacts, 'dd', '실측·로컬 API 실행 기록 확인 / 실제 브라우저 화면 캡처 미확인 / 패키지 미생성·확인된 패키지 경로 없음');
      append(demo, 'p', 'PC 실측값의 단위·측정 시각 → PC 조회와 SDP 분리 → 다시 조회의 대기·실패·다음 행동 순서로 보여 주세요. 실제 값은 시연할 때 새로 확인합니다.');
      append(demo, 'p', '상세 대본: docs/STUDENT_DEMO_GUIDE.md · 기능·근거·한계 정리: docs/STUDENT_DELIVERY_SUMMARY.md. 이 안내는 기능 화면을 자동 이동하거나 포장·설정 변경을 실행하지 않습니다.');
      const guide = append(root, 'section');
      guide.setAttribute('aria-label', '실행 안내 한 장');
      append(guide, 'h3', '실행 안내 한 장');
      append(guide, 'p', '학생 작성 실행 절차 · PC 측정값이나 오류 발생 기록이 아닙니다.');
      const steps = append(guide, 'ol');
      const folderStep = append(steps, 'li');
      append(folderStep, 'p', '기존 프로젝트의 on-client 폴더를 엽니다. package.json과 src/server.mjs가 있는 위치에서 새 터미널을 여세요. Windows에서는 탐색기 주소 표시줄에 powershell을 입력합니다.');
      const versionStep = append(steps, 'li');
      append(versionStep, 'p', 'Node.js 버전을 확인합니다. package.json의 요구 버전은 24.19.0입니다. 이 안내만으로 현재 설치 버전을 확인했다고 판단하지 않습니다.');
      append(append(versionStep, 'pre'), 'code', 'node --version');
      append(versionStep, 'p', '명령을 찾을 수 없거나 버전이 다르면 설치·실행 경로를 먼저 확인하세요. 현재 앱에는 외부 npm 의존성이 없어 설치 명령을 임의로 추가하지 않습니다.');
      const startStep = append(steps, 'li');
      append(startStep, 'p', '같은 폴더에서 앱을 켜고 첫 화면을 확인합니다. 이미 실행 중이면 중복 실행하지 말고 기존 화면을 새로고침하세요.');
      append(append(startStep, 'pre'), 'code', 'node src/server.mjs');
      const open = append(startStep, 'a', '기본 주소 http://127.0.0.1:5189/ 열기');
      open.href = 'http://127.0.0.1:5189/';
      append(startStep, 'p', '시작 메시지와 「보호 현황」을 확인하세요. 화면이 열려도 SDP·AI 연결 성공을 뜻하지 않습니다.');
      append(guide, 'p', '종료: 실행한 터미널에서 Ctrl+C. 재실행: 같은 폴더에서 실행 명령을 다시 입력합니다.');
      append(guide, 'p', '막혔을 때: 실행한 폴더·명령·첫 오류를 확인하세요. 키·토큰·비밀번호는 공유하지 마세요. 이 화면은 특정 오류가 발생했다고 가정하지 않습니다.');
      append(guide, 'p', '현재 제공 PowerShell 실행 도구에는 병합 충돌 표시가 남아 있어 위 직접 실행 방법을 안내합니다. 기본 포장 명령(package-app)과 설치형 실행은 아직 미확인·미구현 범위를 학생 설명서에서 확인하세요.');
      const packaging = append(root, 'section');
      packaging.setAttribute('aria-label', '포장 명령과 결과');
      append(packaging, 'h3', '포장 명령과 결과');
      append(packaging, 'p', '참고 안내 · 실제 실행 결과나 생성 파일 목록이 아닙니다.');
      append(packaging, 'p', '현재 상태: 이 배포본의 package.json에는 package-app 스크립트가 없습니다. --finish-materials를 지원하는 제공 도구도 확인하지 못했습니다. 아래 명령은 지금 실행하지 마세요.');
      append(append(packaging, 'pre'), 'code', 'npm run package-app -- --source . --out "내 앱 묶음" --finish-materials');
      append(packaging, 'p', '제공 도구 준비 후 사용할 참고 명령입니다. 실제 작업 위치·--source·--out 경로는 제공 도구 사용법과 본인 폴더를 확인해 정합니다. 원래 프로젝트와 기존 제출물은 덮어쓰지 않습니다.');
      const results = append(packaging, 'dl');
      for (const name of ['finish.commit.raw', 'finish.archive.tar.gz', 'app.zip', 'APP_PACKAGE_MANIFEST.json']) {
        append(results, 'dt', name);
        append(results, 'dd', '이번 작업에서 생성하지 않음 · 확인 불가');
      }
      append(results, 'dt', 'INSTALL.md · 설치 묶음 폴더');
      append(results, 'dd', '제공 도구의 출력 계약 확인 필요 · 아직 생성하지 않음');
      append(results, 'dt', '새 경로 설치 · 바로가기 실행');
      append(results, 'dd', '미확인 · 설치형 앱에서 이 학생 화면이 반영되는지도 확인 필요');
      append(packaging, 'p', '다음 행동: 최신 제공 포장 도구와 --finish-materials 지원을 먼저 확인하세요. 그다음 같은 커밋에서 산출물을 함께 만들고 압축을 풀거나 다른 버전의 파일을 섞지 마세요. 설치 프로그램(setup.exe)을 만들었다고 표시하지 않습니다.');
      append(packaging, 'p', '이 안내는 포장 명령을 자동 실행하지 않습니다. 도구가 없는 상태에서 예시 결과를 성공으로 대신 보여 주지 않습니다.');
      const value = (input) => typeof input === 'string' || typeof input === 'number' ? String(input) : '확인 불가';
      const modes = { demo: '예제 자료: 실제 회사 정보가 아닙니다.', disconnected: '연결 없음: 실제 서버와 연결되지 않았습니다.', unknown: '확인 불가: 연결 상태를 확인할 수 없습니다.' };
      if (modes[mode]) append(root, 'p', modes[mode]);
      const resourceSection = (title, resource) => {
        const block = append(root, 'section');
        append(block, 'h3', title);
        if (resource?.mode !== mode && modes[resource?.mode]) append(block, 'p', modes[resource.mode]);
        if (resource?.status === 'loading') append(block, 'p', `${title}를 불러오는 중입니다.`);
        else if (resource?.status === 'error') {
          const timeout = /TIMEOUT|TIMED_OUT/.test(resource.error?.code ?? '') ? '시간 초과: ' : '';
          append(block, 'p', `${title}를 불러오지 못했습니다: ${timeout}${value(resource.error?.message)} (${value(resource.error?.code)})`);
          append(block, 'p', '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.');
        } else if (resource?.status !== 'ok') append(block, 'p', `${title}: 아직 확인된 정보가 없습니다.`);
        return block;
      };
      const states = {
        devices: { compliant: '보안 정책 준수', noncompliant: '보안 정책 미준수', unknown: '확인 불가' },
        sessions: { active: '활성', expired: '만료', revoked: '세션 철회', unknown: '확인 불가' },
      };
      for (const [key, title, resource, empty] of [
        ['devices', '기기 정보', devices, '등록된 기기가 없습니다.'],
        ['sessions', '세션 정보', sessions, '현재 연결이 없습니다.'],
      ]) {
        const block = resourceSection(title, resource);
        if (key === 'sessions') append(block, 'p', '세션 정보는 현재 검증된 연결 하나에 대한 정보입니다.');
        if (resource?.status !== 'ok') continue;
        if (!Array.isArray(resource.data)) append(block, 'p', '확인 불가: 목록 형식이 입력 계약과 일치하지 않습니다.');
        else if (!resource.data.length) append(block, 'p', empty);
        else {
          const list = append(block, 'ul');
          for (const row of resource.data) {
            append(list, 'li', `${value(key === 'devices' ? row.label : row.id)}: ${states[key][row.status] ?? '확인 불가'}(${value(row.status)})`);
          }
        }
      }
      const notices = append(root, 'section');
      append(notices, 'h3', '알림 · 제공 화면이 전달한 자료');
      append(notices, 'p', '알림·진단은 제공 화면의 자료입니다. 이 학생 버튼의 기기·세션 재조회와 별개이며, 함께 갱신하려면 제공 버튼을 사용하세요.');
      if (!notifications.length) append(notices, 'p', '전달된 알림 없음: 재조회 실패나 미확인 상태를 정상으로 판단하지 마세요.');
      else {
        const list = append(notices, 'ul');
        for (const notice of notifications) append(list, 'li', `resource: ${value(notice.resource)} · code: ${value(notice.code)} · message: ${value(notice.message)}`);
      }
      const diagnosticBlock = resourceSection('진단 정보', diagnostics);
      let helpText = '';
      if (diagnostics?.status === 'ok') {
        const data = diagnostics.data;
        if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) {
          append(diagnosticBlock, 'p', '표시할 진단 정보가 없습니다.');
        } else {
          // 전달된 진단 객체 전체를 직렬화하지 않고 허용된 필드만 선택합니다.
          helpText = [
            ['requestId', data.requestId], ['component', data.component],
            ['version', data.version], ['checkedAt', data.checkedAt],
            ['engine.mode', data.engine?.mode], ['engine.code', data.engine?.code],
          ].map(([key, entry]) => `${key}: ${value(entry)}`).join('\n');
          append(diagnosticBlock, 'pre', helpText);
        }
      }
      append(diagnosticBlock, 'p', '도움 요청에 사용할 진단 정보를 복사합니다.');
      const copy = append(diagnosticBlock, 'button', '도움정보 복사');
      copy.type = 'button';
      copy.disabled = !helpText;
      const feedback = append(diagnosticBlock, 'p');
      feedback.setAttribute('aria-live', 'polite');
      copy.addEventListener('click', async () => {
        if (!helpText) return;
        try {
          await navigator.clipboard.writeText(helpText);
          feedback.textContent = '도움정보를 복사했습니다.';
        } catch {
          feedback.textContent = '도움정보를 복사하지 못했습니다. 표시된 진단 정보를 직접 선택해 복사하세요.';
        }
      });
      return root;
      });
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status = 'idle', mode, data, error, checkedAt, explanationAccepted = false } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', 'AI 연결 점검 결과');
      const line = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        root.appendChild(p);
      };
      if (mode === 'demo') line('예제 응답(demo): 실제 연결 확인 결과가 아닙니다.');
      if (status === 'idle') line('AI 연결 점검 전');
      else if (status === 'loading') line('AI 연결 점검 중');
      else if (status === 'error') {
        line(`${error?.code ?? 'AI_REQUEST_UNVERIFIED'}: ${error?.message ?? 'AI 연결 또는 응답을 확인할 수 없습니다.'}`);
        line(aiRecovery(error?.code));
      } else if (status === 'ok' && data?.transportChecked === true
        && ['test', 'verified'].includes(data.audienceAuthorization)) {
        line(data.audienceAuthorization === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)');
        line(`응답 모델 수(modelCount): ${data.modelCount}`);
        line(`점검 시각(checkedAt): ${checkedAt ?? '확인 불가'}`);
        // explanationAccepted는 연결 점검을 사건 설명 성공으로 바꾸지 않습니다.
        line('연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.');
      } else line('확인 불가: AI 연결 점검 결과를 확인할 수 없습니다.');
      line('다시 점검하려면 제공 화면의 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('section');
      root.setAttribute('aria-label', '보안 사건 AI 설명');
      const line = (text) => {
        const p = document.createElement('p');
        p.textContent = text;
        root.appendChild(p);
      };
      if (explanation?.status === 'ok' && event?.id && typeof explanation.data?.summary === 'string') {
        root.setAttribute('data-student-explanation-event', event.id);
        line(`사건 ID: ${event.id}`);
        line(explanation.data.summary);
      } else if (explanation?.status === 'error') {
        line(`${explanation.error?.code ?? 'AI_REQUEST_UNVERIFIED'}: ${explanation.error?.message ?? 'AI 설명 응답을 확인할 수 없습니다.'}`);
        line(aiRecovery(explanation.error?.code));
        line('AI 설명을 불러오지 못했습니다. 기존 보안 기록은 그대로입니다.');
      } else if (explanation?.status === 'loading') line('사건 설명을 불러오는 중입니다. 기존 보안 기록은 그대로입니다.');
      else line('아직 확인된 사건 설명이 없습니다. 기존 보안 기록은 그대로입니다.');
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
