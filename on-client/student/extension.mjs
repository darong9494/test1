// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
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
    renderEvents({ status = 'idle', mode, data, error } = {}) {
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
    },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
