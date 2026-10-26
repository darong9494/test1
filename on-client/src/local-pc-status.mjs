import { cpus, totalmem, freemem } from 'node:os';
import { statfs } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const appDirectory = fileURLToPath(new URL('../', import.meta.url));
const gib = 1024 ** 3;
const now = () => new Date().toISOString();
const round = (n) => Math.round(n * 100) / 100;
const unavailable = (error) => ({
  status: 'unverifiable', value: null, measuredAt: null, attemptedAt: now(),
  reason: ['EACCES', 'EPERM'].includes(error?.code) ? '일반 사용자 권한으로 읽을 수 없습니다.'
    : ['ENOSYS', 'ENOTSUP'].includes(error?.code) ? '현재 운영체제에서 이 측정 방법을 지원하지 않습니다.'
      : '운영체제에서 유효한 측정값을 읽지 못했습니다.',
});

async function cpu() {
  try {
    const before = cpus();
    await delay(500);
    const after = cpus();
    if (!before.length || before.length !== after.length) throw Error('CPU_UNAVAILABLE');
    let idle = 0, total = 0;
    for (let i = 0; i < after.length; i++) {
      for (const key of ['user', 'nice', 'sys', 'idle', 'irq']) {
        const delta = after[i].times[key] - before[i].times[key];
        if (!Number.isFinite(delta) || delta < 0) throw Error('CPU_UNAVAILABLE');
        total += delta;
        if (key === 'idle') idle += delta;
      }
    }
    if (total <= 0) throw Error('CPU_UNAVAILABLE');
    const value = round((1 - idle / total) * 100);
    return { status: 'ok', value, percent: value, unit: '%', measuredAt: now(),
      description: '전체 논리 CPU의 두 누적 시간 표본 차이로 계산한 구간 평균입니다. 표본 간 대기는 약 0.5초입니다.' };
  } catch (error) { return { ...unavailable(error), unit: '%' }; }
}

function memory() {
  try {
    const total = totalmem(), free = freemem();
    if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0 || free < 0 || free > total) throw Error('MEMORY_UNAVAILABLE');
    return { status: 'ok', value: round((total - free) / gib), total: round(total / gib),
      percent: round((total - free) / total * 100), unit: 'GiB', measuredAt: now(),
      description: '전체 물리 메모리에서 운영체제가 보고한 여유 메모리를 뺀 값입니다. 캐시 등을 포함할 수 있어 작업 관리자·활성 상태 보기의 사용량과 다를 수 있습니다.' };
  } catch (error) { return { ...unavailable(error), unit: 'GiB' }; }
}

async function disk() {
  try {
    const info = await statfs(appDirectory);
    const total = info.blocks * info.bsize, available = info.bavail * info.bsize;
    if (![total, available].every(Number.isFinite) || total <= 0 || available < 0 || available > total) throw Error('DISK_UNAVAILABLE');
    return { status: 'ok', value: round(available / gib), total: round(total / gib),
      percent: round(available / total * 100), unit: 'GiB', measuredAt: now(),
      description: '앱 폴더가 있는 파일시스템에서 일반 사용자에게 사용 가능한 공간입니다. 막대는 남은 공간 비율입니다.' };
  } catch (error) { return { ...unavailable(error), unit: 'GiB' }; }
}

// 동시에 들어온 조회는 같은 표본을 공유합니다. 관리자 명령·외부 요청·주기 수집은 없습니다.
let inFlight;
export function collectLocalPcStatus() {
  if (!inFlight) inFlight = Promise.all([cpu(), Promise.resolve(memory()), disk()])
    .then(([cpu, memory, disk]) => ({ source: 'local_pc', scope: 'app_server_host', cpu, memory, disk }))
    .finally(() => { inFlight = undefined; });
  return inFlight;
}
