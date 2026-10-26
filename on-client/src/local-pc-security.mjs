import {networkInterfaces, platform} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {win32} from 'node:path';

const execute = promisify(execFile);
const script = fileURLToPath(new URL('../tools/read-pc-security.ps1', import.meta.url));
const now = () => new Date().toISOString();
const messages = {
  WINDOWS_ONLY: 'Windows 전용 항목입니다. 현재 운영체제에서는 읽지 않습니다.',
  ACCESS_DENIED: '일반 사용자 권한으로 읽을 수 없습니다. 권한을 높이거나 설정을 변경하지 않습니다.',
  COMMAND_UNAVAILABLE: '필요한 Windows 조회 명령을 사용할 수 없습니다.',
  TIMEOUT: '조회 제한 시간을 초과했습니다. 일부 기록을 전체 건수나 0건으로 표시하지 않습니다.',
  READ_FAILED: '유효한 조회 결과를 읽지 못했습니다. 실행 정책 등 환경 제한도 확인이 필요합니다.',
};
const failure = (code='READ_FAILED') => ({status:'unverifiable', reason:messages[code] ?? messages.READ_FAILED,
  code, measuredAt:null, attemptedAt:now()});
const time = x => typeof x === 'string' && Number.isFinite(Date.parse(x));

// PowerShell 출력은 고정 필드만 선택합니다. 원본 오류·이벤트 본문·계정·MAC은 반환하지 않습니다.
export function normalizeWindowsResult(kind, raw) {
  if (!raw || typeof raw !== 'object') return failure();
  if (raw.status !== 'ok') return failure(Object.hasOwn(messages, raw.code) ? raw.code : 'READ_FAILED');
  if (!time(raw.measuredAt)) return failure();
  if (kind === 'Firewall') {
    const names = ['Domain','Private','Public'];
    if (!Array.isArray(raw.profiles) || raw.profiles.length !== 3
      || new Set(raw.profiles.map(p=>p?.name)).size !== 3
      || raw.profiles.some(p=>!names.includes(p?.name) || !['enabled','disabled','unknown'].includes(p.enabled))) return failure();
    return {status:'ok', measuredAt:raw.measuredAt, profiles:raw.profiles.map(p=>({name:p.name, enabled:p.enabled})),
      description:'Windows 방화벽의 ActiveStore 프로필 설정입니다. 현재 적용 중인 네트워크 프로필이나 실제 통신 차단 효과를 판정하지 않습니다.'};
  }
  const count = x => x?.status === 'ok' && Number.isSafeInteger(x.value) && x.value >= 0 && x.unit === 'count' && time(x.measuredAt)
    ? {status:'ok',value:x.value,unit:'건',measuredAt:x.measuredAt}
    : failure(Object.hasOwn(messages, x?.code) ? x.code : 'READ_FAILED');
  const warning=count(raw.warning), error=count(raw.error);
  return {status:warning.status==='ok' && error.status==='ok' ? 'ok' : 'partial',
    warning, error, measuredAt:raw.measuredAt};
}

async function windowsQuery(kind, from, to) {
  if (platform() !== 'win32') return failure('WINDOWS_ONLY');
  try {
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const executable = win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const {stdout} = await execute(executable, ['-NoLogo','-NoProfile','-NonInteractive','-File',script,
      '-Kind',kind,'-FromIso',from,'-ToIso',to], {
      shell:false, windowsHide:true, timeout:6500, maxBuffer:256*1024,
      env:{SystemRoot:systemRoot,WINDIR:systemRoot,PATH:win32.join(systemRoot,'System32')},
    });
    return normalizeWindowsResult(kind,JSON.parse(stdout.replace(/^\uFEFF/, '').trim()));
  } catch (error) {
    return failure(error?.killed ? 'TIMEOUT' : error?.code==='ENOENT' ? 'COMMAND_UNAVAILABLE' : 'READ_FAILED');
  }
}

function network() {
  try {
    const interfaces=[];
    for (const [name, addresses] of Object.entries(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (!['IPv4','IPv6',4,6].includes(address.family)) continue;
        interfaces.push({name, address:address.address, family:address.family===4 ? 'IPv4' : address.family===6 ? 'IPv6' : address.family,
          cidr:address.cidr ?? null, internal:address.internal===true});
      }
    }
    return {status:'ok',interfaces,measuredAt:now(),description:'운영체제의 인터페이스 주소 목록입니다. 인터넷·SDP 연결 성공이나 기본 경로·DNS 설정 확인 결과가 아닙니다.'};
  } catch (error) { return failure(['EACCES','EPERM'].includes(error?.code) ? 'ACCESS_DENIED' : 'READ_FAILED'); }
}

let inFlight;
export function collectLocalPcSecurity() {
  if (inFlight) return inFlight;
  const to=now(), from=new Date(Date.parse(to)-24*60*60*1000).toISOString();
  const net=network();
  inFlight=Promise.all([windowsQuery('Firewall',from,to),windowsQuery('System',from,to),windowsQuery('Application',from,to)])
    .then(([firewall,System,Application])=>({source:'local_pc',scope:'app_server_host',readOnly:true,platform:platform(),network:net,
      firewall,events:{windowStart:from,windowEnd:to,unit:'건',System,Application,
        description:'조회 구간에 현재 보존된 System·Application 기록의 경고(Level 3)·오류(Level 2) 건수입니다. 침해나 공격 탐지 결과가 아닙니다. 삭제·순환된 기록은 포함하지 않습니다.'}}))
    .finally(()=>{inFlight=undefined;});
  return inFlight;
}
