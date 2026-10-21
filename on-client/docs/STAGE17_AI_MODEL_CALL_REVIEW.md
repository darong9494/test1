# 케셰브 17단계 재검토 자료와 담당자 업데이트 요청

피드백 대상: c4d931008118a94f9c99c74609a45dd4c9bb72f4

## 현재 결론

두 항목을 통과로 선언하지 않습니다. 제공 파일은 수정하지 않았습니다. 학생 코드에서는 AI_REQUEST_UNVERIFIED를 권한 문제로 단정하던 안내만 원인 미확인·연결 상태 확인·잠시 뒤 수동 재점검으로 수정했습니다. 전달되지 않은 네트워크 코드를 추측해 복원하지 않습니다.

### ai_model_called: 원문 전달과 실제 권한 확인 필요

앞선 검토 문서에 서버 전체 원문이 있었으나 피드백에서는 server.mjs와 vendor/clco-http.mjs가 이름으로만 전달됐다고 합니다. GitHub에 원본이 존재한다는 사실과 판정 AI에게 원문이 전달됐다는 사실은 다릅니다. 이 문서로 검토 도구의 파일 선택·읽기 제한이 해결됐다고 주장하지 않습니다.

호출 경로는 public/app.js의 POST /api/ai/explain → server.mjs의 본인 사건·계정·세션 검사 및 explainIncident → service.mjs의 ai.explain 권한·모델 검사 → vendor/clco-http.mjs의 chat → POST /chat/completions입니다. 네이티브 경로는 Vault 서비스와 beforeDispatch/beforePublish 재검사를 사용합니다. /models 응답은 이 설명 호출 성공을 증명하지 않습니다. 아래에는 핵심 서버 경로·서비스 연결과 전송 모듈 전체 원문을 묶었습니다.

**담당자 요청:** 재검토 입력에 다음 파일을 목록만이 아닌 원문으로 포함해 주세요: on-client/src/server.mjs, on-client/vendor/clco-http.mjs, on-client/src/ai/service.mjs, on-client/src/ai/vault-service.mjs, on-client/src/ai/app-authorization.mjs, on-client/public/app.js, on-client/student/extension.mjs. 네이티브 환경에서는 on-client/src/connection/native-context.mjs와 on-client/src/engine/sdp-host.mjs도 포함해 주세요. 실제 포함 여부는 검토 도구에서 확인해야 합니다.

### ai_timeout_cancel: 제공 시작 틀의 네트워크 코드 매핑 누락

현재 public/app.js의 AI_MESSAGES에는 NETWORK_ERROR와 WB_CLCO_NETWORK_ERROR가 없습니다. safeAiFailure가 두 코드를 AI_REQUEST_UNVERIFIED로 축약하므로 학생 함수는 권한·네트워크·다른 확인 불가 원인을 구별할 수 없습니다. 학생 코드의 네트워크 분기는 시작 틀이 안전한 네트워크 코드를 보존해야 사용할 수 있습니다.

**담당자 업데이트 요청 초안(아직 발송하지 않음):** 제공 시작 틀의 공개 AI 오류 매핑에 NETWORK_ERROR 및 WB_CLCO_NETWORK_ERROR와 안전한 한국어 안내를 추가해 주세요. UI뿐 아니라 서버의 aiFailure 등 공개 오류 변환 경로에서도 코드가 유지되는지 확인해 주세요. 원문 예외·헤더·인증 값은 노출하지 않고, 네트워크 실패 시 연결 상태 확인 후 잠시 뒤 사용자가 직접 점검하도록 안내해야 합니다. 자동 재요청은 추가하지 않아야 합니다. 업데이트 후 실제 요청 실패 → safeAiFailure → studentData → renderAiConnection/renderExplanation 경로를 다시 확인해 주세요. 학생은 제공 파일을 직접 수정하지 않았습니다.

## 이번 확인 결과

- 정적 확인: 위 경로의 서버·서비스·전송 코드가 존재하며, 네트워크 코드 소실 원인을 확인했습니다.
- 모의 검사: 실제 public/app.js의 AI_MESSAGES/safeAiFailure를 추출해 두 네트워크 코드가 AI_REQUEST_UNVERIFIED로 바뀌는 현상을 재현했습니다.
- 모의 검사: 실제 vendor/clco-http.mjs를 가져와 fetch를 모의 함수로 교체했습니다. chat이 /v1/chat/completions로 POST하는 것과 네트워크 실패·시간 초과·취소를 각 코드로 구분하는 것을 확인했습니다. 외부 네트워크·유료 AI는 호출하지 않았습니다.
- 모의 DOM 검사: 원인 미확인 상태를 권한 준비 중으로 단정하지 않고 수동 재점검을 안내하는 것, 기존 AI 상태·설명 표시 검사를 확인했습니다. 구문 검사도 통과했습니다.
- 미확인: 담당자 업데이트 반영, 판정 AI의 파일 원문 수신, 운영 계정·앱 권한, 실제 사건 설명 성공, 실제 화면 취소·세대 검사.

## 다음 확인(사용자·담당자)

1. 위 요청 초안을 담당자에게 전달해 공개 매핑과 원문 포함 설정을 확인합니다. 이 작업에서는 담당자에게 메시지를 보내거나 공식 제출하지 않았습니다.
2. 제공 시작 틀 업데이트 뒤 계정·앱 권한을 확인합니다. 키·토큰을 복사하거나 대체 연결을 만들지 않습니다.
3. 권한과 이용 비용 조건을 확인한 사용자가 본인 사건 한 건의 AI 설명을 직접 요청합니다. /api/ai/explain 응답과 같은 사건의 학생 요약 표시를 확인해야 ai_model_called의 실환경 근거가 생깁니다. 헤더·자격 정보·사건 내용은 채팅이나 공개 문서에 붙이지 않습니다.

## 원본 식별

| 파일 | Git blob SHA-1 |
|---|---|
| on-client/src/server.mjs | 42774051fa29614e28f4f823db41fe33942166ed |
| on-client/src/ai/service.mjs | 4a78e9303b54dcf73d11172d2abe1fab5b274456 |
| on-client/vendor/clco-http.mjs | aef2a78d36257ef996df8cd9721384519c477fc9 |
| on-client/public/app.js | 002bfdf421f0005c14bb98dcbf3d0163f4be091d |

## 연결 원문 발췌

이전 문서의 큰 중복 원문을 핵심 경로별 발췌로 정리했습니다. 발췌 내용은 변경하지 않았으며 전체 원본은 각 링크에 있습니다. 다음 내용을 읽었다는 이유만으로 실환경 성공으로 판정하지 않습니다.

### on-client/public/app.js:979–1023

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/public/app.js#L979-L1023)

```javascript
  clearAction();
  const gen = generation;
  const slot = explainSlots.get(event.id);
  if (!slot) return;
  const requestGen = ++explanationGeneration;
  for (const active of explainControllers.values()) active.abort();
  explainControllers.clear();
  for (const previousSlot of explainSlots.values()) setChildren(previousSlot);
  const controller = new AbortController();
  explainControllers.set(event.id, controller);
  button.disabled = true;
  const safeEvent = safeEventForAi(event) ? structuredClone(event) : null;
  state.selectedExplanation = { event: safeEvent, resource: { status: 'loading' } };
  renderStudent('explanation');
  $('ai-explanation-cancel').disabled = false;
  setChildren(slot, stateBox('loading', 'AI 설명을 요청하는 중…'));
  try {
    const result = safeEvent ? await aiRequest('/api/ai/explain', { body: { eventId: event.id }, signal: controller.signal })
      : localFailure('ON_AI_INVALID_INPUT', AI_MESSAGES.ON_AI_INVALID_INPUT, UNKNOWN_META);
    // 다시 불러오기 이후이거나 기록 칸이 바뀌었으면 늦은 응답은 버린다.
    if (gen !== generation || requestGen !== explanationGeneration || explainSlots.get(event.id) !== slot) return;
    // AI 결과는 기록 목록 상태와 분리한다. 실패해도 기록은 그대로 둔다.
    if (!result.ok) {
      state.selectedExplanation.resource = safeAiFailure(result);
      setChildren(slot, stateBox('error', `AI 설명 실패: ${state.selectedExplanation.resource.error.message}`), el('p', { className: 'muted', text: '기록은 그대로 유지됩니다. AI 연결이나 응답 문제는 과제 실패로 처리되지 않습니다.' }));
      renderStudent('explanation');
      return;
    }
    const explanation = validExplanation(result.data, event);
    if (!explanation || !safeAiTime(result.meta?.checkedAt)) {
      state.selectedExplanation.resource = safeAiFailure({ error: { code: 'ON_AI_INVALID_OUTPUT' } });
      setChildren(slot, stateBox('error', 'AI 설명 확인 불가: 응답 형식이나 근거 ID가 이 기록과 맞지 않습니다.'), el('p', { className: 'muted', text: '기록은 그대로 유지됩니다.' }));
      renderStudent('explanation');
      return;
    }
    state.selectedExplanation.resource = { status: 'ok', data: explanation, meta: result.meta };
    setChildren(slot, renderExplanation(explanation, event, result.meta));
    renderStudent('explanation');
  } finally {
    if (explainControllers.get(event.id) === controller) explainControllers.delete(event.id);
    if (document.body.contains(button)) button.disabled = false;
    if (requestGen === explanationGeneration) $('ai-explanation-cancel').disabled = true;
  }
}

```

### on-client/src/server.mjs:230–271

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/src/server.mjs#L230-L271)

```javascript
  const defaultAi=ai??(appCredentialVault?createVaultOnAiService({appAuthorization:{},...vaultAiConfiguration,enabled:true,vault:appCredentialVault,timeoutMs:aiTimeoutMs}):createOnAiService({env:aiEnv,allowLoopbackHttp:allowLoopbackAiHttp,timeoutMs:aiTimeoutMs}));
  let mappedAi=appCredentialVault?defaultAi:ai;
  const aiSecrets=!appCredentialVault&&typeof aiEnv.ON_AI_APP_KEY==='string'?[aiEnv.ON_AI_APP_KEY]:[];
  const mappedService=()=>mappedAi??(mappedAi=createOnAiService({env:aiEnv,allowLoopbackHttp:allowLoopbackAiHttp,timeoutMs:aiTimeoutMs,appAuthorization:{}}));
  const mode=['connected','demo','disconnected'].includes(engine.evidenceMode)?engine.evidenceMode:'disconnected';
  const connectionConfigKeys=['enabled','fetchImpl','clock','startTimeoutMs','scopeTimeoutMs','finishTimeoutMs','pollIntervalMs','maxFlows','retainMs'];
  if(!Number.isSafeInteger(readTimeoutMs)||readTimeoutMs<=0||readTimeoutMs>120000
    || aiConnectionConfiguration!==undefined&&(!record(aiConnectionConfiguration)||Object.keys(aiConnectionConfiguration).some(key=>!connectionConfigKeys.includes(key))
      || typeof aiConnectionConfiguration.enabled!=='boolean'
      || aiConnectionConfiguration.enabled&&(mode!=='connected'||typeof appCredentialVault?.load!=='function'||typeof appCredentialVault?.persistCredential!=='function'
        || !resolveAiIdentity&&typeof engine.readAiIdentity!=='function')))throw Error('INVALID_SERVER_CONNECTION_CONFIGURATION');
  // Shared identity/binding logic, parameterized by an operation's own readers.
  // The manager never retains the lifetime or reader of an HTTP request.
  function sourceReader({call,bounded,assertAlive}) {
    async function captureSource(){
      const identity=assertData('identity',await call('readIdentity'));
      const source=Object.freeze({sourceSubjectId:identity.user.id,projectId:engine.projectId,sessionId:identity.session.id});
      if(!id(source.projectId)||identity.session.status!=='active')throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
      return {identity,source};
    }
    async function assertCurrent(source){
      const identity=assertData('identity',await call('readIdentity'));
      if(identity.user.id!==source.sourceSubjectId||identity.session.id!==source.sessionId||identity.session.status!=='active'||engine.projectId!==source.projectId)
        throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
    }
    async function readMapping(source){
      if(!resolveAiIdentity&&typeof engine.readAiIdentity!=='function')throw engineError('ON_AI_PROVISIONING_PENDING','');
      let raw;
      try {raw=resolveAiIdentity?await bounded(signal=>resolveAiIdentity(source,{signal})):await call('readAiIdentity',source);}
      catch(error){if(['REQUEST_TIMEOUT','REQUEST_CANCELLED','ENGINE_TIMEOUT'].includes(error?.code))throw error;throw engineError('ON_AI_PROVISIONING_PENDING','');}
      let snapshot;try{snapshot=structuredClone(raw);}catch{throw engineError('ON_AI_PROVISIONING_PENDING','');}
      await assertCurrent(source);
      return assertAiBinding(snapshot,source);
    }
    async function finishMapping(source,binding){
      let after;
      try{after=await readMapping(source);}catch(error){if(error?.code==='ON_AI_PROVISIONING_PENDING')throw engineError('SUBJECT_SCOPE_UNVERIFIED','');throw error;}
      if(AI_BINDING_KEYS.some(key=>after[key]!==binding[key]))throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
      assertAlive();
    }
    return {captureSource,assertCurrent,readMapping,finishMapping};
  }
```

### on-client/src/server.mjs:350–352

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/src/server.mjs#L350-L352)

```javascript
    const {captureSource,assertCurrent,readMapping,finishMapping}=sourceReader({call,bounded,assertAlive});
    const authOptions=(binding)=>({expectedScope:Object.freeze({subjectId:binding.canonicalStudentId,projectId:binding.projectId,appId:'aleph-on',audience:'on-client'}),
      expectedContext:Object.freeze({alephUserId:binding.alephUserId,siteId:binding.siteId,identityVersion:binding.identityVersion}),signal:lifetime.signal});
```

### on-client/src/server.mjs:466–545

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/src/server.mjs#L466-L545)

```javascript
      if(req.method==='POST'&&url.pathname==='/api/ai/explain'&&nativeHost){
        if(!Number.isSafeInteger(aiTimeoutMs)||aiTimeoutMs<=0||aiTimeoutMs>120000){
          send(503,{ok:false,error:{code:'WB_CLCO_INVALID_LIMIT',message:aiErrorMessages.WB_CLCO_INVALID_LIMIT,retryable:false}});return;
        }
        const routeLimit=Math.min(aiTimeoutMs,requestTimeoutMs);
        supportDeadline={wall:requestStartedAt.wall+routeLimit,monotonic:requestStartedAt.monotonic+routeLimit};
        const remaining=()=>{assertAlive();return Math.max(1,Math.floor(Math.min(supportDeadline.wall-Date.now(),supportDeadline.monotonic-performance.now())));};
        supportTimer=setTimeout(()=>{requestTimedOut=true;lifetime.abort();},remaining());
        let nativeOperation=null,sourceOperation=null;
        const sourceCall=async work=>{try{return await bounded(work);}catch(error){assertAlive();if(['REQUEST_TIMEOUT','REQUEST_CANCELLED'].includes(error?.code))throw error;throw engineError('ON_AI_PROVISIONING_PENDING','');}};
        try{
          if(Number(req.headers['content-length']??0)>8192)throw engineError('REQUEST_TOO_LARGE','',413);
          const input=await bounded(()=>jsonBody(req,['eventId']));
          if(!isOwnedSdpHostEngine(sdpHostEngine))throw engineError('ON_AI_PROVISIONING_PENDING','');
          nativeOperation=await sourceCall(signal=>openNativeHostOperation(nativeHost,{signal,timeoutMs:remaining()}));
          const readHost=async signal=>{if(signal.aborted)throw engineError('REQUEST_CANCELLED','');const current=await sourceCall(()=>readNativeHostOperation(nativeHost,nativeOperation));assertAlive();if(signal.aborted)throw engineError('REQUEST_CANCELLED','');return current;};
          const identity=await readHost(lifetime.signal);
          sourceOperation=await sourceCall(signal=>openSdpIncidentOperation(sdpHostEngine,input,{signal,timeoutMs:remaining()}));
          const initial=assertSdpIncidentOperation(sdpHostEngine,sourceOperation),event=initial.event;
          const sameIdentity=source=>{if(Object.keys(identity).some(key=>source.binding.ai[key]!==identity[key]))throw engineError('ON_AI_PROVISIONING_PENDING','');};
          sameIdentity(initial);
          const recheck=async({signal})=>{
            if(signal.aborted)throw engineError('REQUEST_CANCELLED','');
            const current=await sourceCall(()=>readSdpIncidentOperation(sdpHostEngine,sourceOperation,{signal}));
            const native=await readHost(signal);
            if(Object.keys(identity).some(key=>native[key]!==identity[key])||current.eventHash!==initial.eventHash)throw engineError('ON_AI_PROVISIONING_PENDING','');
            sameIdentity(current);assertAlive();
            try{assertSdpIncidentOperation(sdpHostEngine,sourceOperation);assertNativeHostOperation(nativeHost,nativeOperation);}catch{throw engineError('ON_AI_PROVISIONING_PENDING','');}
            if(current.validUntilMs<=Date.now())throw engineError('ON_AI_PROVISIONING_PENDING','');
            if(signal.aborted)throw engineError('REQUEST_CANCELLED','');assertAlive();
          };
          const service=createVaultOnAiService({enabled:true,vault:createNativeOperationVault(nativeHost,nativeOperation),timeoutMs:remaining(),
            appAuthorization:nativeConfiguration.fetchImpl?{fetchImpl:nativeConfiguration.fetchImpl}:{}});
          const options=Object.freeze({signal:lifetime.signal,
            expectedScope:Object.freeze({subjectId:identity.subjectId,projectId:identity.projectId,appId:'aleph-on',audience:'on-client'}),
            expectedContext:Object.freeze({alephUserId:identity.alephUserId,siteId:identity.siteId,identityVersion:identity.identityVersion}),
            beforeDispatch:recheck,beforePublish:recheck});
          const incident={incidentId:event.id,evidence:event.evidence.map(row=>({id:row.id,summary:row.text})),rules:event.rules.map(row=>({id:row.id,description:row.text})),currentState:event.state,supportedActions:event.supportedActions};
          const raw=await bounded(()=>service.explainIncident(incident,options));
          const capture=(value,keys)=>{
            if(value===null||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)throw engineError('SERVICE_UNAVAILABLE','');
            const descriptors=Object.getOwnPropertyDescriptors(value);
            if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!Object.hasOwn(descriptors,key)||!Object.hasOwn(descriptors[key],'value')))throw engineError('SERVICE_UNAVAILABLE','');
            return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
          };
          if(raw===null||typeof raw!=='object'||types.isProxy(raw))throw engineError('SERVICE_UNAVAILABLE','');
          const ok=Object.getOwnPropertyDescriptor(raw,'ok');if(!ok||!Object.hasOwn(ok,'value')||typeof ok.value!=='boolean')throw engineError('SERVICE_UNAVAILABLE','');
          if(ok.value===false){const output=capture(raw,['ok','error','help']),error=capture(output.error,['code','message']);
            const code=Object.hasOwn(aiErrorMessages,error.code)?error.code:'WB_CLCO_REQUEST_FAILED';assertAlive();send(503,{ok:false,error:{code,message:aiErrorMessages[code],retryable:true}});return;}
          const output=capture(raw,['ok','transportChecked','audienceAuthorization','explanation','authorizationValidUntilMs','help']);
          if(output.transportChecked!==true||output.audienceAuthorization!=='verified'||!Number.isSafeInteger(output.authorizationValidUntilMs)||output.authorizationValidUntilMs<=Date.now())throw engineError('ON_AI_PROVISIONING_PENDING','');
          aiHelp({audienceAuthorization:'verified',help:capture(output.help,['component','code','appCredentialsConfigured','provisioning','automaticRetries','workbenchRequiredAtRuntime'])});
          const explanation=assertExplanation(capture(output.explanation,['summary','evidenceIds','proposals','requiresHumanConfirmation','executed']),event,[]);
          const body=JSON.stringify({ok:true,data:{explanation},meta:meta()});
          assertAlive();let current;
          try{current=assertSdpIncidentOperation(sdpHostEngine,sourceOperation);assertNativeHostOperation(nativeHost,nativeOperation);}catch{throw engineError('ON_AI_PROVISIONING_PENDING','');}
          sameIdentity(current);
          if(current.eventHash!==initial.eventHash||current.validUntilMs<=Date.now()||output.authorizationValidUntilMs<=Date.now())throw engineError('ON_AI_PROVISIONING_PENDING','');
          assertAlive();res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-on-request-id':requestId});res.end(body);return;
        }finally{closeSdpIncidentOperation(sourceOperation);closeNativeHostOperation(nativeOperation);}
      }
      if(req.method==='POST'&&url.pathname==='/api/ai/explain'){
        const {eventId}=await bounded(()=>jsonBody(req,['eventId']));
        const identity=assertData('identity',await call('readIdentity'));
        const expectedScope=Object.freeze({subjectId:identity.user.id,projectId:engine.projectId,appId:'aleph-on',audience:'on-client'});
        if(mode==='connected'&&(!id(expectedScope.projectId)||identity.session.status!=='active'))throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
        const rawEvents=await call('readEvents',expectedScope);
        if(mode==='connected'&&(!Array.isArray(rawEvents)||rawEvents.some(event=>event.subjectId!==expectedScope.subjectId||event.projectId!==expectedScope.projectId)))throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
        const events=assertData('events',rawEvents);const event=events.find(row=>row.id===eventId);
        if(!event)throw engineError('EVENT_NOT_FOUND','본인 기록에서 사건을 찾을 수 없습니다.',404);
        const after=assertData('identity',await call('readIdentity'));
        if(after.user.id!==identity.user.id||after.session.id!==identity.session.id||after.session.status!=='active'||engine.projectId!==expectedScope.projectId)throw engineError('SUBJECT_SCOPE_UNVERIFIED','');
        if(lifetime.signal.aborted||res.destroyed)throw engineError('REQUEST_CANCELLED','');
        const source=Object.freeze({sourceSubjectId:identity.user.id,projectId:expectedScope.projectId,sessionId:identity.session.id});
        const binding=await readMapping(source);
        const output=await bounded(()=>mappedService().explainIncident({incidentId:event.id,evidence:event.evidence.map(e=>({id:e.id,summary:e.text})),rules:event.rules.map(r=>({id:r.id,description:r.text})),currentState:event.state,supportedActions:event.supportedActions},authOptions(binding)));
        await finishMapping(source,binding);
        if(!output?.ok){send(503,{ok:false,error:aiFailure(output)});return;}
        send(200,{ok:true,data:{explanation:assertExplanation(output.explanation,event,aiSecrets)}});return;
      }
```

### on-client/src/ai/service.mjs:260–285

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/src/ai/service.mjs#L260-L285)

```javascript
      controller.abort();
    }
  }
  async function transport() {
    if (!configured) throw own('ON_AI_PROVISIONING_PENDING');
    if (!client) {
      let factory = transportFactory;
      if (!factory) {
        try { factory = (await import('../../vendor/clco-http.mjs')).createClcoClient; }
        catch { throw own('ON_AI_TRANSPORT_PENDING'); }
      }
      client = factory({ baseUrl, token, timeoutMs, maxResponseBytes: 65536, allowLoopbackHttp });
    }
    return client;
  }
  function guard(authorization,signal) {
    if(signal.aborted)throw own('WB_CLCO_CANCELLED');
    if(Date.parse(authorization.proof.validUntil)<=Date.now()
      || authorization.mode==='verified' && !isVerifiedOnAppAuthorization(authorization.proof,{baseUrl,token,allowLoopbackHttp,signal,purpose:authorization.purpose})) throw own('ON_AI_PROVISIONING_PENDING');
  }
  function checkModel(authorization,required) {
    if(!required && (model===undefined || model===''))return;
    if(!safeText(model,100,secrets)||!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model))throw own('MODEL_NOT_CONFIGURED');
    if(authorization.mode==='verified'&&!authorization.proof.allowedModels.includes(model))throw own('MODEL_NOT_CONFIGURED');
  }
  return Object.freeze({
```

### on-client/src/ai/service.mjs:336–394

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/src/ai/service.mjs#L336-L394)

```javascript
    },
    async explainIncident(input, options = {}) {
      const deadline={wall:Date.now()+timeoutMs,monotonic:performance.now()+timeoutMs};
      let captured,incident;
      try{
        if(!options||typeof options!=='object'||types.isProxy(options))throw own('ON_AI_PROVISIONING_PENDING');
        if(['beforeDispatch','beforePublish'].some(key=>Object.hasOwn(options,key))){
          captured=modelOptions(options);
          if(typeof captured.beforeDispatch!=='function'||typeof captured.beforePublish!=='function')throw own('ON_AI_PROVISIONING_PENDING');
          incident=validateInput(captureOnAiIncident(input),secrets);
        }
      }catch(error){return failure(error);}
      if(captured){
        const alive=signal=>{if(signal.aborted)throw own('WB_CLCO_CANCELLED');if(Date.now()>=deadline.wall||performance.now()>=deadline.monotonic)throw own('WB_CLCO_TIMEOUT');};
        return operation(captured,async(signal,expectedScope,expectedContext)=>{
          const authorization=await authorize('explain','ai.explain',signal,expectedScope,expectedContext);alive(signal);
          if(authorization.mode!=='verified')throw own('ON_AI_PROVISIONING_PENDING');
          const before=structuredClone(authorization.proof);
          const pins=['appId','audience','subjectId','alephUserId','siteId','projectId','credentialId','grantId','grantVersion','identityVersion','policyVersion','accessPolicyId','purpose','requiredCapability','revoked','credentialFingerprint','modelPolicyVersion'];
          const sameAuthority=current=>{
            if(current.mode!=='verified')throw own('ON_AI_PROVISIONING_PENDING');
            guard(authorization,signal);guard(current,signal);checkModel(current,true);
            if(pins.some(key=>current.proof[key]!==before[key])||['capabilities','allowedModels'].some(key=>JSON.stringify(current.proof[key])!==JSON.stringify(before[key])))throw own('ON_AI_PROVISIONING_PENDING');
          };
          const refresh=async callback=>{
            const current=await authorize('explain','ai.explain',signal,expectedScope,expectedContext);alive(signal);sameAuthority(current);
            try{await callback({signal});}catch{alive(signal);throw own('ON_AI_PROVISIONING_PENDING');}
            alive(signal);sameAuthority(current);return current;
          };
          checkModel(authorization,true);
          const activeClient=await transport();alive(signal);guard(authorization,signal);
          if(!activeClient||typeof activeClient!=='object'||types.isProxy(activeClient))throw own('ON_AI_TRANSPORT_PENDING');
          const method=Object.getOwnPropertyDescriptor(activeClient,'chat');
          if(!method||!Object.hasOwn(method,'value')||typeof method.value!=='function'||types.isProxy(method.value))throw own('ON_AI_TRANSPORT_PENDING');
          const body={model,stream:false,messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify(incident)}]};
          const dispatch=await refresh(captured.beforeDispatch);alive(signal);sameAuthority(dispatch);
          const response=await Reflect.apply(method.value,activeClient,[body,{signal}]);alive(signal);sameAuthority(dispatch);
          let parsed;try{parsed=JSON.parse(incidentContent(response));}catch{throw own('ON_AI_INVALID_OUTPUT');}
          const explanation=validateOutput(parsed,incident,secrets);
          const current=await refresh(captured.beforePublish);alive(signal);sameAuthority(dispatch);sameAuthority(current);
          const authorizationValidUntilMs=Math.floor(Math.min(Date.parse(before.validUntil),Date.parse(dispatch.proof.validUntil),Date.parse(current.proof.validUntil),deadline.wall,Date.now()+Math.max(0,deadline.monotonic-performance.now())));
          if(!Number.isSafeInteger(authorizationValidUntilMs)||authorizationValidUntilMs<=Date.now())throw own('ON_AI_PROVISIONING_PENDING');
          return {ok:true,transportChecked:true,audienceAuthorization:'verified',explanation,authorizationValidUntilMs,help:help('ON_AI_APP_AUTHORIZATION_VERIFIED','verified')};
        },true);
      }
      return operation(options, async (signal, expectedScope, expectedContext) => {
        const authorization = await authorize('explain', 'ai.explain', signal, expectedScope, expectedContext);
        const incident = validateInput(input, secrets);
        checkModel(authorization,true);
        const activeClient=await transport();guard(authorization,signal);
        const result = await activeClient.chat({ model, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: JSON.stringify(incident) }] }, { signal });guard(authorization,signal);
        const choice = result?.choices?.[0];
        if (choice?.message?.tool_calls || choice?.message?.function_call || choice?.finish_reason === 'length' || typeof choice?.message?.content !== 'string') throw own('ON_AI_INVALID_OUTPUT');
        let output;
        try { output = JSON.parse(choice.message.content); } catch { throw own('ON_AI_INVALID_OUTPUT'); }
        return { ok: true, transportChecked: true, audienceAuthorization:authorization.mode, explanation: validateOutput(output, incident, secrets),
          help: help(authorization.mode==='verified'?'ON_AI_APP_AUTHORIZATION_VERIFIED':'ON_AI_TEST_TRANSPORT_ONLY',authorization.mode==='verified'?'verified':'pending') };
      });
    },
```

## 실제 전송 모듈 전체 원문

### on-client/vendor/clco-http.mjs:1–141

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/vendor/clco-http.mjs#L1-L141)

```javascript
// Internal derivative of Workbench transport; dedicated finite learner-support endpoint added.
import {types} from 'node:util';
const supportRecord=(value,keys)=>{
  if(value===null||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)throw fail('WB_CLCO_INVALID_REQUEST');
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!Object.hasOwn(descriptors,key)||!Object.hasOwn(descriptors[key],'value')))throw fail('WB_CLCO_INVALID_REQUEST');
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
};
const supportAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
function supportOptions(value){
  if(value===null||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)throw fail('WB_CLCO_INVALID_REQUEST');
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).some(key=>key!=='signal'||!Object.hasOwn(descriptors[key],'value')))throw fail('WB_CLCO_INVALID_REQUEST');
  const signal=Object.hasOwn(descriptors,'signal')?descriptors.signal.value:undefined;
  if(signal!==undefined){if(signal===null||typeof signal!=='object'||types.isProxy(signal))throw fail('WB_CLCO_INVALID_REQUEST');
    try{Reflect.apply(supportAborted,signal,[]);}catch{throw fail('WB_CLCO_INVALID_REQUEST');}}
  return {signal};
}
const ownError = Symbol('workbench-http-error');
function fail(code, status = null, serverCode = null) {
  const error = new Error(code);
  error[ownError] = true;
  Object.assign(error, { code, status, serverCode });
  return error;
}
const safeCode = value => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(value) ? value : 'UNKNOWN';

function serverFailure(status, payload) {
  const serverCode = safeCode(payload?.error?.code ?? payload?._clco?.blockedReason);
  let code = 'WB_CLCO_REQUEST_FAILED';
  if (status === 401) code = 'WB_CLCO_AUTH_REQUIRED';
  else if (['OUTSIDE_SESSION_WINDOW', 'SESSION_WINDOW_CLOSED', 'SESSION_FORCE_STOPPED'].includes(serverCode)) code = 'WB_CLCO_SESSION_CLOSED';
  else if (serverCode === 'COHORT_BUDGET_EXHAUSTED') code = 'WB_CLCO_COHORT_BUDGET_EXHAUSTED';
  else if (serverCode === 'RATE_LIMITED') code = 'WB_CLCO_RATE_LIMITED';
  else if (status === 403) code = 'WB_CLCO_ACCESS_BLOCKED';
  else if (status === 429) code = 'WB_CLCO_LIMIT_REACHED';
  else if (status >= 300 && status < 400) code = 'WB_CLCO_REDIRECT_BLOCKED';
  else if (status >= 500) code = 'WB_CLCO_SERVER_UNAVAILABLE';
  return fail(code, status, serverCode);
}

export function createClcoClient({ baseUrl, token, timeoutMs = 10000, maxResponseBytes = 1048576, allowLoopbackHttp = false } = {}) {
  let base;
  try { base = new URL(baseUrl); } catch { throw fail('WB_CLCO_INVALID_URL'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback && allowLoopbackHttp)) || base.username || base.password || base.search || base.hash) {
    throw fail('WB_CLCO_INVALID_URL');
  }
  base.pathname = base.pathname.replace(/\/+$/, '') || '/v1';
  if (!base.pathname.endsWith('/v1')) throw fail('WB_CLCO_INVALID_URL');
  if (typeof token !== 'string' || !/^[A-Za-z0-9._~-]+$/.test(token)) throw fail('WB_CLCO_INVALID_TOKEN');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000 || !Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw fail('WB_CLCO_INVALID_LIMIT');
  }

  async function request(endpoint, body, { signal, readStream } = {}) {
    const support=endpoint==='/learner-support';
    if (signal && (support?Reflect.apply(supportAborted,signal,[]):signal.aborted)) throw fail('WB_CLCO_CANCELLED');
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const cancel = () => controller.abort();
    if(signal){if(support)Reflect.apply(EventTarget.prototype.addEventListener,signal,['abort',cancel,{once:true}]);else signal.addEventListener('abort',cancel,{once:true});}
    try {
      const response = await fetch(base.href.replace(/\/$/, '') + endpoint, {
        method: body ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${token}`, accept: body?.stream ? 'text/event-stream' : 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        redirect: 'manual',
      });
      if(endpoint==='/learner-support'&&response.ok&&!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(response.headers.get('content-type')??''))throw fail('WB_CLCO_INVALID_CONTENT_TYPE',response.status);
      async function* boundedBytes() {
        let size = 0;
        if (!response.body) throw fail('WB_CLCO_INVALID_RESPONSE', response.status);
        for await (const bytes of response.body) {
          size += bytes.byteLength;
          if (size > maxResponseBytes) throw fail('WB_CLCO_RESPONSE_TOO_LARGE', response.status);
          yield bytes;
        }
      }
      if (response.ok && body?.stream) {
        if (!/^text\/event-stream(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw fail('WB_CLCO_INVALID_CONTENT_TYPE', response.status);
        return await readStream(boundedBytes(), { maxBytes: maxResponseBytes });
      }
      const bytes = [];
      for await (const chunk of boundedBytes()) bytes.push(chunk);
      let payload;
      try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(bytes))); }
      catch {
        if (!response.ok) throw serverFailure(response.status, null);
        throw fail('WB_CLCO_INVALID_RESPONSE', response.status);
      }
      if (!response.ok || payload?.error || payload?._clco?.syntheticBlocked === true) throw serverFailure(response.status, payload);
      return payload;
    } catch (error) {
      if (error?.[ownError]) throw error;
      if (timedOut) throw fail('WB_CLCO_TIMEOUT');
      if (signal && (support?Reflect.apply(supportAborted,signal,[]):signal.aborted)) throw fail('WB_CLCO_CANCELLED');
      if (typeof error?.code === 'string' && /^WB_STREAM_[A-Z_]+$/.test(error.code)) {
        const safe = fail(error.code);
        safe.serverCode = safeCode(error.serverCode);
        throw safe;
      }
      throw fail('WB_CLCO_NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
      if(signal){if(support)Reflect.apply(EventTarget.prototype.removeEventListener,signal,['abort',cancel]);else signal.removeEventListener('abort',cancel);}
      controller.abort();
    }
  }

  return Object.freeze({
    async listModels(options) {
      const result = await request('/models', null, options);
      if (result?.object !== 'list' || !Array.isArray(result.data) || result.data.some(row => typeof row?.id !== 'string' || !row.id)) throw fail('WB_CLCO_INVALID_RESPONSE', 200);
      return result.data.map(row => ({ id: row.id }));
    },
    async chat(body, options = {}) {
      if (!body || typeof body.model !== 'string' || !body.model || !Array.isArray(body.messages) || !body.messages.length || (body.stream !== undefined && typeof body.stream !== 'boolean')) throw fail('WB_CLCO_INVALID_REQUEST');
      if (body.stream && typeof options.readStream !== 'function') throw fail('WB_CLCO_STREAM_READER_REQUIRED');
      const result = await request('/chat/completions', body, options);
      if (!body.stream && (!Array.isArray(result?.choices) || !result.choices.length)) throw fail('WB_CLCO_INVALID_RESPONSE', 200);
      return result;
    },
    async learnerSupport(body, options = {}) {
      // This endpoint never falls back to chat/completions, including a 404 response.
      const finite=supportRecord(body,['model','problemKind','observations']),observed=supportRecord(finite.observations,['engine','ai']);
      const engine=supportRecord(observed.engine,['mode','code']),ai=supportRecord(observed.ai,['configured','authorized']);
      const modes={disconnected:'ENGINE_NOT_CONNECTED',demo:'DEMO_ONLY',connected:'ADAPTER_CONFIGURED'};
      if(typeof finite.model!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(finite.model)
        ||!['app-start','engine-connection','ai-access','response-delay','diagnostic-copy'].includes(finite.problemKind)
        ||typeof engine.mode!=='string'||!Object.hasOwn(modes,engine.mode)||engine.code!==modes[engine.mode]
        ||typeof ai.configured!=='boolean'||ai.authorized!==false)throw fail('WB_CLCO_INVALID_REQUEST');
      const result=await request('/learner-support',{model:finite.model,problemKind:finite.problemKind,observations:{engine,ai}},supportOptions(options));
      if(result===null||typeof result!=='object'
        ||Object.keys(result).length!==2||!Object.hasOwn(result,'ok')||!Object.hasOwn(result,'data')||result.ok!==true)throw fail('WB_CLCO_INVALID_RESPONSE',200);
      return result;
    },
  });
}
```

## 네트워크 오류 소실 지점 원문

### on-client/public/app.js:159–185

[원본 파일](https://github.com/darong9494/test1/blob/c4d931008118a94f9c99c74609a45dd4c9bb72f4/on-client/public/app.js#L159-L185)

```javascript
const AI_MESSAGES = Object.freeze({
  ON_AI_PROVISIONING_PENDING: '학생 앱 이용 권한의 발급·연결을 준비 중입니다. 담당자에게 확인하세요.',
  WB_CLCO_AUTH_REQUIRED: '앱 전용 열쇠의 인증을 확인하세요. Workbench 열쇠를 복사하지 마세요.',
  WB_CLCO_ACCESS_BLOCKED: '학생 앱의 이용 권한을 확인하세요.',
  WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
  WB_CLCO_RATE_LIMITED: 'AI 요청이 잠시 제한됐습니다. 잠시 후 직접 다시 요청하세요.',
  WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
  WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
  WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
  REQUEST_TIMEOUT: '서버의 AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
  ENGINE_TIMEOUT: '서버의 확인 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
  TIMEOUT: 'AI 응답 시간이 초과됐습니다. 필요하면 직접 다시 요청하세요.',
  WB_CLCO_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
  CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
  REQUEST_CANCELLED: 'AI 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.',
  MODEL_NOT_CONFIGURED: '서버에 사용할 AI 모델을 설정하세요.',
  ON_AI_AUTHORIZATION_CHANGED: 'AI 이용 권한 내용이 점검 도중 바뀌었습니다. 다시 점검하기 전에 담당자에게 현재 권한을 확인하세요.',
  ON_AI_MODEL_LIST_EMPTY: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
  SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사건·프로젝트의 연결을 확인할 수 없습니다.',
  ON_AI_INVALID_INPUT: '설명에 필요한 사건 근거·규칙을 확인할 수 없습니다.',
  ON_AI_INVALID_OUTPUT: 'AI 설명의 근거·조치·응답 형식을 확인할 수 없습니다.',
  AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다. 기존 기록을 확인하세요.',
});
function safeAiFailure(result) {
  const code = Object.hasOwn(AI_MESSAGES, result?.error?.code) ? result.error.code : 'AI_REQUEST_UNVERIFIED';
  return { status: 'error', error: { code, message: AI_MESSAGES[code] }, meta: UNKNOWN_META };
}
```
