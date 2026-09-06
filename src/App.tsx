import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  LM_BASE,
  copyText,
  flattenFields,
  lmRequest,
  makeInitialState,
  psRestartOne,
  reducer,
  TARGET_SERVICES,
} from "./lib/real";
import { Header, VerdictStrip } from "./components/header";
import { ServiceBoard } from "./components/services";
import { ApiPanel, OpsPanel } from "./components/panels";
import { LogPanel, Toasts, TrayPill, type ToastData } from "./components/log";
import { ToolPanel } from "./components/download";

const LS_SERIAL = "kkt34mon.web.serial";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [now, setNow] = useState(() => Date.now());
  const [uptime, setUptime] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastSeq = useRef(0);
  const initTimer = useRef<number | null>(null);

  const addToast = useCallback((tone: ToastData["tone"], msg: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, tone, msg }]);
  }, []);
  const closeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* часы + аптайм */
  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
      setUptime((u) => u + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  /* реальный опрос ЛМ */
  const pollOnce = useCallback(async () => {
    const r = await lmRequest("GET", "/api/v2/status");
    if (r.ok || r.httpStatus > 0) {
      dispatch({
        type: "API_RESULT",
        ok: r.ok,
        httpStatus: r.httpStatus,
        data: r.data,
        raw: r.raw,
        ms: r.ms,
        now: Date.now(),
      });
    } else {
      dispatch({ type: "API_FAIL", reason: r.reason ?? "нет ответа", now: Date.now() });
    }
  }, []);

  useEffect(() => {
    pollOnce();
    const t = window.setInterval(pollOnce, state.interval);
    return () => window.clearInterval(t);
  }, [pollOnce, state.interval]);

  /* восстановление сохранённого серийника */
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SERIAL);
      if (s) dispatch({ type: "SET_SERIAL", value: s });
    } catch {
      /* приватный режим */
    }
  }, []);

  const applySerial = useCallback(
    (serial: string) => {
      const v = serial.trim().toUpperCase();
      dispatch({ type: "SET_SERIAL", value: v });
      try {
        if (v) localStorage.setItem(LS_SERIAL, v);
        else localStorage.removeItem(LS_SERIAL);
      } catch {
        /* noop */
      }
      if (v) addToast("ok", `Серийный № принят: в реестре будет отслеживаться esm-cm-${v}`);
    },
    [addToast]
  );

  /* копирование реальных PowerShell-команд */
  const copyCmd = useCallback(
    async (cmd: string, what: string) => {
      const ok = await copyText(cmd);
      if (ok) {
        dispatch({ type: "CMD_COPIED", what });
        addToast("info", `Команда «${what}» скопирована — вставьте в PowerShell (от администратора)`);
      } else {
        addToast("err", "Не удалось скопировать команду в буфер обмена");
      }
    },
    [addToast]
  );

  const restartCmd = useCallback(
    (id: string) => copyCmd(psRestartOne(id), `рестарт ${id}`),
    [copyCmd]
  );

  /* реальная инициализация токеном: POST init → прогресс загрузки → данные из базы */
  const initToken = useCallback(
    async (token: string): Promise<string | null> => {
      const clean = token.trim();
      if (clean.length < 24) return "Токен слишком короткий — минимум 24 символа";
      dispatch({ type: "INIT_SENDING" });

      const r = await lmRequest("POST", "/api/v2/init", { token: clean }, 8000);
      if (r.httpStatus === 0) {
        const note = "ЛМ не принял запрос: модуль не запущен или браузер блокирует обращение (CORS). Используйте monitor-kkt34.hta";
        dispatch({ type: "INIT_ERROR", note });
        return note;
      }
      if (!r.ok) {
        const note = `ЛМ отклонил инициализацию: HTTP ${r.httpStatus}${r.raw ? ` · ${r.raw.slice(0, 120)}` : ""}`;
        dispatch({ type: "INIT_ERROR", note });
        return note;
      }
      dispatch({ type: "INIT_HTTP", httpStatus: r.httpStatus, raw: r.raw });

      /* опрос загрузки: реальный статус каждые 1.5 с, до ready или таймаута 180 с */
      const startedAt = Date.now();
      const tick = async () => {
        const s = await lmRequest("GET", "/api/v2/status", undefined, 5000);
        if (s.httpStatus > 0) {
          const st = s.data && typeof s.data.status === "string" ? s.data.status : `HTTP ${s.httpStatus}`;
          dispatch({ type: "INIT_PROGRESS", apiStatus: st, fields: flattenFields(s.data) });
          if (st === "ready") {
            /* дотягиваем реальные данные о наполнении базы */
            const probes = ["/api/v2/sync/state", "/api/v2/stats", "/api/v2/db/info", "/api/v2/info"];
            const db = [...flattenFields(s.data)];
            for (const p of probes) {
              const pr = await lmRequest("GET", p, undefined, 2000);
              if (pr.httpStatus > 0 && pr.ok && pr.data) {
                for (const f of flattenFields(pr.data)) {
                  if (!db.some((d) => d.key === f.key)) db.push({ key: `${p} → ${f.key}`, value: f.value });
                }
              }
            }
            dispatch({ type: "INIT_DB", db });
            dispatch({ type: "INIT_DONE" });
            addToast("ok", "Инициализация прошла успешно: данные загружены, ЛМ в статусе ready");
            return;
          }
        }
        if (Date.now() - startedAt > 180000) {
          dispatch({ type: "INIT_ERROR", note: "Таймаут 180 с — ЛМ не перешёл в статус ready. Проверьте журнал модуля" });
          return;
        }
        initTimer.current = window.setTimeout(tick, 1500);
      };
      initTimer.current = window.setTimeout(tick, 1200);
      return null;
    },
    [addToast]
  );

  useEffect(() => () => {
    if (initTimer.current) window.clearTimeout(initTimer.current);
  }, []);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    addToast("info", "Монитор свёрнут в трей. Программа работает в фоновом режиме.");
  }, [addToast]);
  const handleExpand = useCallback(() => {
    setMinimized(false);
    addToast("ok", "Монитор развёрнут");
  }, [addToast]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="animate-float-slow absolute -top-44 -left-44 h-[580px] w-[580px]"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12), transparent 66%)" }}
        />
        <div
          className="animate-float-slow absolute -right-44 -bottom-52 h-[640px] w-[640px]"
          style={{
            background: "radial-gradient(circle, rgba(31,185,168,0.09), transparent 66%)",
            animationDelay: "-8s",
          }}
        />
        <div className="bg-gridlines absolute inset-0" />
        <div className="scan-band" />
        <div className="bg-scanlines absolute inset-0" />
        <div className="bg-noise absolute inset-0" />
      </div>

      {minimized ? (
        <TrayPill state={state} now={now} onExpand={handleExpand} />
      ) : (
        <div className="relative z-10">
          <Header state={state} now={now} onMinimize={handleMinimize} />

          <main className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-6 md:px-8">
            <VerdictStrip state={state} now={now} onPollNow={pollOnce} />

            <ToolPanel onToast={addToast} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ServiceBoard
                  state={state}
                  onCopyRestart={restartCmd}
                  onCopyCmd={copyCmd}
                  onApplySerial={applySerial}
                />
              </div>
              <ApiPanel
                state={state}
                now={now}
                onInit={initToken}
                onInitReset={() => dispatch({ type: "INIT_RESET" })}
                onPoll={pollOnce}
                onApplySerial={applySerial}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <LogPanel state={state} onClear={() => dispatch({ type: "CLEAR_LOGS" })} />
              </div>
              <OpsPanel
                state={state}
                uptime={uptime}
                onInterval={(ms) => dispatch({ type: "SET_INTERVAL", value: ms })}
              />
            </div>

            <footer
              className="animate-rise flex flex-wrap items-center justify-between gap-2 pb-4 font-mono text-[10px] tracking-wide text-ink-500"
              style={{ animationDelay: "460ms" }}
            >
              <span>
                © {new Date().getFullYear()} ООО «Правовой Статус» (ККТ34) ·{" "}
                <span className="text-brand-400">kkt34.ru</span> · г. Волгоград · режим реальных
                запросов
              </span>
              <span>
                GET {LM_BASE}/api/v2/status · POST /api/v2/init · {TARGET_SERVICES.length}+ служб ·
                интервал {state.interval / 1000} с
              </span>
            </footer>
          </main>
        </div>
      )}

      <Toasts toasts={toasts} onClose={closeToast} />
    </div>
  );
}
