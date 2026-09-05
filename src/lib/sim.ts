/* Движок телеметрии монитора: службы ЛМ ЧЗ + стек АТОЛ, API на :5995, журнал. */

export type ServiceStatus = "running" | "stopped" | "starting" | "stopping" | "not_found";

export interface ServiceInfo {
  id: string;
  desc: string;
  status: ServiceStatus;
  restarts: number;
  dynamic?: boolean;
}

export type ApiState = "probing" | "ready" | "not_configured" | "unreachable";
export type LogLevel = "info" | "ok" | "warn" | "error" | "action";

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  msg: string;
}

export interface SimState {
  services: ServiceInfo[];
  configured: boolean;
  api: ApiState;
  apiVersion: string;
  inn: string | null;
  kktSerial: string;
  tokenTail: string | null;
  ping: number[];
  lastPoll: number | null;
  pollInterval: number;
  autoHeal: boolean;
  injectFaults: boolean;
  logs: LogEntry[];
  totals: { restarts: number; autoStarts: number; polls: number; failures: number };
}

export type SimAction =
  | { type: "POLL"; now: number }
  | { type: "SVC_STOP"; id: string }
  | { type: "SVC_START"; id: string }
  | { type: "SVC_UP"; id: string }
  | { type: "INIT_START" }
  | { type: "INIT_DONE"; token: string }
  | { type: "INIT_FAIL" }
  | { type: "RESET_CONFIG" }
  | { type: "SET_INTERVAL"; value: number }
  | { type: "TOGGLE_HEAL" }
  | { type: "TOGGLE_FAULTS" }
  | { type: "CLEAR_LOGS" };

export const KKT_SERIAL = "100412345678";
const API_VERSION = "2.4.1.386";
const DEMO_INN = "7724490000";

let logSeq = 100;

function pushLog(logs: LogEntry[], level: LogLevel, msg: string, ts = Date.now()): LogEntry[] {
  const next = [{ id: ++logSeq, ts, level, msg }, ...logs];
  return next.length > 220 ? next.slice(0, 220) : next;
}

function svc(id: string, desc: string, status: ServiceStatus, dynamic = false): ServiceInfo {
  return { id, desc, status, restarts: 0, dynamic };
}

export function makeInitialState(): SimState {
  const now = Date.now();
  return {
    services: [
      svc("regime", "Служба фискального режима", "running"),
      svc("yenisei", "Транспорт обмена с ОФД", "running"),
      svc("atol-service-agent", "Агент сервисов АТОЛ", "running"),
      svc("atol-service-agent-gui", "GUI-оболочка агента", "not_found"),
      svc("atol-service-agent-updater", "Канал обновлений агента", "running"),
      svc("atol-grpc-service", "gRPC-шлюз АТОЛ", "running"),
      svc("epc-bridge", "Мост электронных чеков", "starting"),
      svc("esm-lm-controller", "Контроллер локального модуля", "running"),
      svc("esm-orchestrator", "Оркестратор ESM", "running"),
      svc("uem-agent", "Агент UEM", "running"),
      svc("uem-updater", "Канал обновлений UEM", "stopped"),
      svc(`esm-cm-${KKT_SERIAL}`, "Контроллер ККТ · сер. " + KKT_SERIAL, "running", true),
    ],
    configured: false,
    api: "probing",
    apiVersion: API_VERSION,
    inn: null,
    kktSerial: KKT_SERIAL,
    tokenTail: null,
    ping: [],
    lastPoll: null,
    pollInterval: 4000,
    autoHeal: true,
    injectFaults: false,
    logs: pushLog(
      pushLog(
        pushLog([], "info", "Монитор запущен. Целевых служб в реестре: 12", now - 400),
        "info",
        `Автопоиск: обнаружена служба ККТ esm-cm-${KKT_SERIAL} (серийный № ${KKT_SERIAL})`,
        now - 250
      ),
      "action",
      "Первичный опрос системы: GET /api/v2/status (localhost:5995)…",
      now - 60
    ),
    totals: { restarts: 0, autoStarts: 0, polls: 0, failures: 0 },
  };
}

const rnd = Math.random;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

export function reducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case "POLL": {
      let { logs } = state;
      const totals = { ...state.totals, polls: state.totals.polls + 1 };
      const initiallyStopped = new Set(
        state.services.filter((s) => s.status === "stopped").map((s) => s.id)
      );

      let services = state.services.map((s) => {
        if (s.status === "starting") {
          logs = pushLog(logs, "ok", `«${s.id}»: служба запущена и отвечает`);
          return { ...s, status: "running" as ServiceStatus };
        }
        return s;
      });

      let failures = 0;
      if (state.injectFaults && rnd() < 0.18) {
        const victims = services.filter((s) => s.status === "running" && !s.dynamic);
        if (victims.length) {
          const victim = pick(victims);
          failures = 1;
          logs = pushLog(logs, "error", `Сбой: «${victim.id}» неожиданно остановлена (код -1073741819)`);
          services = services.map((s) =>
            s.id === victim.id ? { ...s, status: "stopped" as ServiceStatus } : s
          );
        }
      }

      if (state.autoHeal) {
        services = services.map((s) => {
          if (s.status === "stopped" && initiallyStopped.has(s.id)) {
            logs = pushLog(logs, "warn", `Авто-восстановление: запуск «${s.id}» (Start-Service)`);
            return { ...s, status: "starting" as ServiceStatus };
          }
          return s;
        });
        totals.autoStarts += services.filter(
          (s) => s.status === "starting" && initiallyStopped.has(s.id)
        ).length;
      }

      let api = state.api;
      let ping = state.ping;
      if (api === "probing") {
        api = state.configured ? "ready" : "not_configured";
        logs = pushLog(
          logs,
          api === "ready" ? "ok" : "warn",
          api === "ready"
            ? `API готов к работе. ИНН ${state.inn ?? DEMO_INN}`
            : "API: статус not_configured — модуль не инициализирован токеном"
        );
      } else if (api === "unreachable") {
        if (rnd() < 0.55) {
          api = state.configured ? "ready" : "not_configured";
          logs = pushLog(logs, "ok", "Связь с API восстановлена (localhost:5995)");
        } else if (totals.polls % 2 === 0) {
          logs = pushLog(logs, "warn", "API: порт 5995 не отвечает — повторная попытка…");
        }
      } else if (state.injectFaults && rnd() < 0.07) {
        api = "unreachable";
        logs = pushLog(logs, "error", "Потеря связи с API: http://localhost:5995 (таймаут 5000 мс)");
      }

      const reachable = api === "ready" || api === "not_configured";
      if (reachable) {
        ping = [...ping, Math.round(8 + rnd() * 30)];
        if (ping.length > 42) ping = ping.slice(-42);
      }

      totals.failures += failures;
      return { ...state, services, api, ping, logs, totals, lastPoll: action.now };
    }

    case "SVC_STOP": {
      const s = state.services.find((x) => x.id === action.id);
      if (!s || s.status === "not_found") return state;
      return {
        ...state,
        services: state.services.map((x) =>
          x.id === action.id ? { ...x, status: "stopping" as ServiceStatus, restarts: x.restarts + 1 } : x
        ),
        logs: pushLog(state.logs, "action", `Перезапуск «${action.id}»: Stop-Service -Force…`),
        totals: { ...state.totals, restarts: state.totals.restarts + 1 },
      };
    }

    case "SVC_START":
      return {
        ...state,
        services: state.services.map((x) =>
          x.id === action.id ? { ...x, status: "starting" as ServiceStatus } : x
        ),
        logs: pushLog(state.logs, "action", `«${action.id}»: Start-Service (ожидание поднятия)…`),
      };

    case "SVC_UP":
      return {
        ...state,
        services: state.services.map((x) =>
          x.id === action.id ? { ...x, status: "running" as ServiceStatus } : x
        ),
        logs: pushLog(state.logs, "ok", `«${action.id}»: служба работает, статус Running`),
      };

    case "INIT_START":
      return {
        ...state,
        logs: pushLog(state.logs, "action", "POST /api/v2/init — передача токена в локальный модуль…"),
      };

    case "INIT_DONE": {
      const tail = action.token.trim().slice(-4).toUpperCase();
      return {
        ...state,
        configured: true,
        api: "ready",
        inn: DEMO_INN,
        tokenTail: tail,
        logs: pushLog(
          state.logs,
          "ok",
          `Инициализация выполнена: API ready, ИНН ${DEMO_INN}, токен …${tail} принят`
        ),
      };
    }

    case "INIT_FAIL":
      return {
        ...state,
        api: state.configured ? "ready" : "not_configured",
        logs: pushLog(state.logs, "error", "Ошибка инициализации: токен отклонён (HTTP 401)"),
      };

    case "RESET_CONFIG":
      return {
        ...state,
        configured: false,
        inn: null,
        tokenTail: null,
        api: "not_configured",
        logs: pushLog(state.logs, "warn", "Конфигурация ЛМ сброшена — требуется повторная инициализация"),
      };

    case "SET_INTERVAL":
      return {
        ...state,
        pollInterval: action.value,
        logs: pushLog(state.logs, "info", `Интервал опроса изменён: ${action.value / 1000} с`),
      };

    case "TOGGLE_HEAL":
      return {
        ...state,
        autoHeal: !state.autoHeal,
        logs: pushLog(
          state.logs,
          "info",
          `Авто-восстановление остановленных служб: ${!state.autoHeal ? "ВКЛ" : "ВЫКЛ"}`
        ),
      };

    case "TOGGLE_FAULTS":
      return {
        ...state,
        injectFaults: !state.injectFaults,
        logs: pushLog(
          state.logs,
          !state.injectFaults ? "warn" : "info",
          `Инжекция сбоев (демо): ${!state.injectFaults ? "ВКЛ — возможны падения служб" : "ВЫКЛ"}`
        ),
      };

    case "CLEAR_LOGS":
      return { ...state, logs: pushLog([], "info", "Журнал событий очищен оператором") };

    default:
      return state;
  }
}

/* ---- производные представления ---- */

export const STATUS_META: Record<ServiceStatus, { label: string; tone: "ok" | "err" | "warn" | "info" | "dim" }> = {
  running: { label: "РАБОТАЕТ", tone: "ok" },
  stopped: { label: "ОСТАНОВЛЕНА", tone: "err" },
  starting: { label: "ЗАПУСК…", tone: "warn" },
  stopping: { label: "ОСТАНОВ…", tone: "warn" },
  not_found: { label: "НЕ НАЙДЕНА", tone: "dim" },
};

export type VerdictTone = "ok" | "warn" | "err" | "info";

export function computeVerdict(s: SimState): { label: string; tone: VerdictTone; detail: string } {
  const apiDown = s.lastPoll !== null && s.api === "unreachable";
  const bad = s.services.filter((x) => x.status === "stopped" || x.status === "stopping");
  const warming = s.services.filter((x) => x.status === "starting").length > 0 || s.api === "probing";

  if (apiDown)
    return { label: "АВАРИЯ СВЯЗИ", tone: "err", detail: "API на порту 5995 недоступно — касса вне контура ЧЗ" };
  if (bad.length)
    return {
      label: "ДЕГРАДАЦИЯ",
      tone: "warn",
      detail: `Вне штатного режима: ${bad.map((b) => b.id).join(", ")}`,
    };
  if (!s.configured)
    return { label: "НЕ НАСТРОЕН", tone: "info", detail: "Введите токен — модуль ожидает инициализации" };
  if (warming)
    return { label: "ПЕРЕХОДНЫЙ РЕЖИМ", tone: "info", detail: "Идёт запуск компонентов, идёт опрос API…" };
  return { label: "ШТАТНЫЙ РЕЖИМ", tone: "ok", detail: "Все службы в норме · API готов к работе" };
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
