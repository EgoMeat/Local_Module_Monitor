/* Реальный клиент монитора: HTTP к локальному модулю ЧЗ (localhost:5995).
   Никакой симуляции — только фактические запросы, ответы и ошибки.
   Управление службами Windows из браузера невозможно (нет доступа к SCM),
   поэтому для служб формируются реальные PowerShell-команды, а полное
   управление живёт в автономном инструменте monitor-kkt34.hta. */

export type LogLevel = "info" | "ok" | "warn" | "error" | "action";

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  msg: string;
}

export interface ServiceDef {
  id: string;
  desc: string;
}

/* Базовый список служб из обработки + автопоиск esm-cm* */
export const TARGET_SERVICES: ServiceDef[] = [
  { id: "regime", desc: "Служба фискального режима" },
  { id: "yenisei", desc: "Транспорт обмена с ОФД" },
  { id: "atol-service-agent", desc: "Агент сервисов АТОЛ" },
  { id: "atol-service-agent-gui", desc: "GUI-оболочка агента" },
  { id: "atol-service-agent-updater", desc: "Канал обновлений агента" },
  { id: "atol-grpc-service", desc: "gRPC-шлюз АТОЛ" },
  { id: "epc-bridge", desc: "Мост электронных чеков" },
  { id: "esm-lm-controller", desc: "Контроллер локального модуля" },
  { id: "esm-orchestrator", desc: "Оркестратор ESM" },
  { id: "uem-agent", desc: "Агент UEM" },
  { id: "uem-updater", desc: "Канал обновлений UEM" },
];

export const LM_BASE = "http://localhost:5995";
export const LM_AUTH = "Basic YWRtaW46YWRtaW4="; /* admin:admin — как в обработке */
export const TOOL_FILE = "monitor-kkt34.hta";

export type ApiPhase = "boot" | "checking" | "ready" | "not_configured" | "other" | "unreachable";

export interface Field {
  key: string;
  value: string;
}

export interface InitState {
  phase: "idle" | "sending" | "loading" | "done" | "error";
  startedAt: number | null;
  httpStatus: number | null;
  lastApiStatus: string | null;
  fields: Field[];
  db: Field[];
  note: string | null;
  polls: number;
}

export interface MonState {
  api: ApiPhase;
  apiRaw: string | null;
  apiHttpStatus: number | null;
  version: string | null;
  inn: string | null;
  latency: number[];
  lastPoll: number | null;
  unreachableSince: number | null;
  interval: number;
  kktSerial: string | null;
  logs: LogEntry[];
  init: InitState;
  totals: { polls: number; requests: number; errors: number; cmds: number };
}

export type MonAction =
  | { type: "API_RESULT"; ok: boolean; httpStatus: number; data: Record<string, unknown> | null; raw: string; ms: number; now: number }
  | { type: "API_FAIL"; reason: string; now: number }
  | { type: "LOG"; level: LogLevel; msg: string }
  | { type: "SET_INTERVAL"; value: number }
  | { type: "SET_SERIAL"; value: string }
  | { type: "CMD_COPIED"; what: string }
  | { type: "INIT_SENDING" }
  | { type: "INIT_HTTP"; httpStatus: number; raw: string }
  | { type: "INIT_PROGRESS"; apiStatus: string; fields: Field[] }
  | { type: "INIT_DB"; db: Field[] }
  | { type: "INIT_DONE" }
  | { type: "INIT_ERROR"; note: string }
  | { type: "INIT_RESET" }
  | { type: "CLEAR_LOGS" };

let logSeq = 0;
function pushLog(logs: LogEntry[], level: LogLevel, msg: string): LogEntry[] {
  const next = [{ id: ++logSeq, ts: Date.now(), level, msg }, ...logs];
  return next.length > 220 ? next.slice(0, 220) : next;
}

export const IDLE_INIT: InitState = {
  phase: "idle",
  startedAt: null,
  httpStatus: null,
  lastApiStatus: null,
  fields: [],
  db: [],
  note: null,
  polls: 0,
};

export function makeInitialState(): MonState {
  return {
    api: "boot",
    apiRaw: null,
    apiHttpStatus: null,
    version: null,
    inn: null,
    latency: [],
    lastPoll: null,
    unreachableSince: null,
    interval: 4000,
    kktSerial: null,
    logs: pushLog(
      pushLog(
        [],
        "info",
        "Монитор запущен. Режим реальных запросов: демо-данные отключены"
      ),
      "action",
      `Ожидание первого запроса к ЛМ: GET ${LM_BASE}/api/v2/status`
    ),
    init: IDLE_INIT,
    totals: { polls: 0, requests: 0, errors: 0, cmds: 0 },
  };
}

export function reducer(state: MonState, action: MonAction): MonState {
  switch (action.type) {
    case "API_RESULT": {
      const totals = { ...state.totals, polls: state.totals.polls + 1, requests: state.totals.requests + 1 };
      const latency = [...state.latency, action.ms].slice(-42);
      const data = action.data ?? {};
      const version = typeof data.version === "string" || typeof data.version === "number" ? String(data.version) : state.version;
      const inn = typeof data.inn === "string" || typeof data.inn === "number" ? String(data.inn) : state.inn;
      const st = typeof data.status === "string" ? data.status : null;

      let api: ApiPhase = "other";
      if (st === "ready") api = "ready";
      else if (st === "not_configured") api = "not_configured";

      let logs = state.logs;
      if (api !== state.api || st !== state.init.lastApiStatus) {
        if (state.api === "unreachable") logs = pushLog(logs, "ok", "Связь с ЛМ восстановлена");
        if (api === "ready") logs = pushLog(logs, "ok", `ЛМ: статус ready · версия ${version ?? "н/д"}${inn ? ` · ИНН ${inn}` : ""}`);
        else if (api === "not_configured") logs = pushLog(logs, "warn", "ЛМ: статус not_configured — модуль не инициализирован токеном");
        else if (api === "other" && st) logs = pushLog(logs, "info", `ЛМ: статус «${st}» (${action.ms} мс)`);
      }

      return {
        ...state,
        api,
        apiRaw: action.raw,
        apiHttpStatus: action.httpStatus,
        version,
        inn,
        latency,
        lastPoll: action.now,
        unreachableSince: null,
        logs,
        totals,
      };
    }

    case "API_FAIL": {
      const totals = { ...state.totals, requests: state.totals.requests + 1, errors: state.totals.errors + 1 };
      let logs = state.logs;
      const unreachableSince = state.unreachableSince ?? action.now;
      const polls = state.totals.polls;
      if (state.api !== "unreachable" || polls % 5 === 0) {
        logs = pushLog(logs, "error", `ЛМ не отвечает: ${action.reason}`);
      }
      return { ...state, api: "unreachable", unreachableSince, lastPoll: action.now, logs, totals };
    }

    case "LOG":
      return { ...state, logs: pushLog(state.logs, action.level, action.msg) };

    case "SET_INTERVAL":
      return {
        ...state,
        interval: action.value,
        logs: pushLog(state.logs, "info", `Интервал опроса изменён: ${action.value / 1000} с`),
      };

    case "SET_SERIAL":
      return {
        ...state,
        kktSerial: action.value || null,
        logs: pushLog(
          state.logs,
          "ok",
          action.value ? `Серийный № ККТ для мониторинга: ${action.value} (служба esm-cm-${action.value})` : "Серийный № ККТ сброшен"
        ),
      };

    case "CMD_COPIED":
      return {
        ...state,
        totals: { ...state.totals, cmds: state.totals.cmds + 1 },
        logs: pushLog(state.logs, "action", `PowerShell-команда скопирована: ${action.what}`),
      };

    case "INIT_SENDING":
      return {
        ...state,
        init: { ...IDLE_INIT, phase: "sending", startedAt: Date.now() },
        logs: pushLog(state.logs, "action", `POST ${LM_BASE}/api/v2/init — отправка токена в локальный модуль…`),
      };

    case "INIT_HTTP":
      return {
        ...state,
        totals: { ...state.totals, requests: state.totals.requests + 1 },
        init: { ...state.init, phase: "loading", httpStatus: action.httpStatus },
        logs: pushLog(state.logs, "ok", `ЛМ принял запрос инициализации (HTTP ${action.httpStatus}). Опрос загрузки данных…`),
      };

    case "INIT_PROGRESS":
      return { ...state, init: { ...state.init, lastApiStatus: action.apiStatus, fields: action.fields, polls: state.init.polls + 1 } };

    case "INIT_DB":
      return { ...state, init: { ...state.init, db: action.db } };

    case "INIT_DONE":
      return {
        ...state,
        init: { ...state.init, phase: "done" },
        logs: pushLog(state.logs, "ok", "Инициализация ЛМ завершена успешно: статус ready, данные загружены"),
      };

    case "INIT_ERROR":
      return {
        ...state,
        init: { ...state.init, phase: "error", note: action.note },
        totals: { ...state.totals, errors: state.totals.errors + 1 },
        logs: pushLog(state.logs, "error", `Инициализация не завершена: ${action.note}`),
      };

    case "INIT_RESET":
      return { ...state, init: IDLE_INIT };

    case "CLEAR_LOGS":
      return { ...state, logs: pushLog([], "info", "Журнал событий очищен оператором") };

    default:
      return state;
  }
}

/* ---- реальные HTTP-запросы к ЛМ ---- */

export interface LmResult {
  ok: boolean;
  httpStatus: number;
  data: Record<string, unknown> | null;
  raw: string;
  ms: number;
  reason: string | null;
}

export async function lmRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  timeoutMs = 5000
): Promise<LmResult> {
  const url = `${LM_BASE}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: LM_AUTH,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const raw = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = null;
    }
    return { ok: res.ok, httpStatus: res.status, data, raw, ms: Math.round(performance.now() - t0), reason: null };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      httpStatus: 0,
      data: null,
      raw: "",
      ms: Math.round(performance.now() - t0),
      reason: aborted
        ? `таймаут ${timeoutMs} мс`
        : "ЛМ не запущен, занят порт 5995 или браузер блокирует запрос (CORS/mixed-content)",
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/* Плоские поля ответа ЛМ — показываем оператору ровно то, что вернул модуль */
export function flattenFields(data: Record<string, unknown> | null): Field[] {
  if (!data) return [];
  const out: Field[] = [];
  for (const key of Object.keys(data)) {
    const v = data[key];
    const t = typeof v;
    if (v === null || v === undefined) out.push({ key, value: "—" });
    else if (t === "string" || t === "number" || t === "boolean") out.push({ key, value: String(v) });
    else if (Array.isArray(v)) out.push({ key, value: `массив · ${v.length} элем.` });
    else if (t === "object") out.push({ key, value: `объект · ${Object.keys(v as object).length} полей` });
  }
  return out;
}

/* ---- реальные PowerShell-команды для служб (браузер не управляет SCM напрямую) ---- */

export function psServiceList(ids: string[]): string {
  const names = ids.map((i) => `'${i}'`).join(",");
  return `Get-Service -Name ${names}, 'esm-cm*' -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType, DisplayName | Format-Table -AutoSize`;
}

export function psRestartOne(id: string): string {
  return `Restart-Service -Name '${id}' -Force -ErrorAction SilentlyContinue; Get-Service -Name '${id}' -ErrorAction SilentlyContinue | Select-Object Name, Status`;
}

export function psRestartAll(ids: string[]): string {
  const lines = ids.map((id) => `Restart-Service -Name '${id}' -Force -ErrorAction SilentlyContinue`).join("\n");
  return `# Рестарт стека ЛМ ЧЗ и АТОЛ (PowerShell от имени администратора)\n${lines}\nGet-Service -Name ${ids.map((i) => `'${i}'`).join(",")}, 'esm-cm*' -ErrorAction SilentlyContinue | Select-Object Name, Status | Format-Table -AutoSize`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ---- сводный вердикт ---- */

export type VerdictTone = "ok" | "warn" | "err" | "info";

export function computeVerdict(s: MonState): { label: string; tone: VerdictTone; detail: string } {
  switch (s.api) {
    case "boot":
      return { label: "ОПРОС СИСТЕМЫ", tone: "info", detail: "Установление связи с локальным модулем ЧЗ…" };
    case "checking":
      return { label: "ОПРОС СИСТЕМЫ", tone: "info", detail: "Выполняется запрос к ЛМ…" };
    case "ready":
      return {
        label: "ШТАТНЫЙ РЕЖИМ",
        tone: "ok",
        detail: `ЛМ готов к работе · версия ${s.version ?? "н/д"}${s.inn ? ` · ИНН ${s.inn}` : ""}`,
      };
    case "not_configured":
      return { label: "НЕ НАСТРОЕН", tone: "warn", detail: "ЛМ на связи, но не инициализирован — отправьте токен" };
    case "unreachable":
      return {
        label: "НЕТ СВЯЗИ С ЛМ",
        tone: "err",
        detail: "Порт 5995 не отвечает из браузера: ЛМ не запущен либо блокируется CORS. Службы — через monitor-kkt34.hta",
      };
    default:
      return { label: "СТАТУС ЛМ", tone: "info", detail: "Модуль вернул нестандартный статус — смотрите ответ ниже" };
  }
}

export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour12: false });
}

export function fmtUptime(sec: number): string {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
