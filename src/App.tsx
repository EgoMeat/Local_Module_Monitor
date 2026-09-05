import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { KKT_PORTS, KKT_SERIAL_POOL, makeInitialState, reducer } from "./lib/sim";
import { Header, VerdictStrip } from "./components/header";
import { ServiceBoard } from "./components/services";
import { ApiPanel, OpsPanel } from "./components/panels";
import { LogPanel, Toasts, TrayPill, type ToastData } from "./components/log";
import { ToolPanel } from "./components/download";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [now, setNow] = useState(() => Date.now());
  const [uptime, setUptime] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [busyInit, setBusyInit] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastSeq = useRef(0);

  const addToast = useCallback((tone: ToastData["tone"], msg: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { id, tone, msg }]);
  }, []);
  const closeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* секундомер: часы + аптайм */
  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(Date.now());
      setUptime((u) => u + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  /* первичный опрос системы */
  useEffect(() => {
    const t = window.setTimeout(() => dispatch({ type: "POLL", now: Date.now() }), 900);
    return () => window.clearTimeout(t);
  }, []);

  /* периодический опрос (работает и в трей-режиме) */
  useEffect(() => {
    const t = window.setInterval(() => dispatch({ type: "POLL", now: Date.now() }), state.pollInterval);
    return () => window.clearInterval(t);
  }, [state.pollInterval]);

  /* рестарт одной службы: Stop → пауза → Start */
  const restartOne = useCallback(
    (id: string, baseDelay = 0) => {
      window.setTimeout(() => dispatch({ type: "SVC_STOP", id }), baseDelay);
      window.setTimeout(() => dispatch({ type: "SVC_START", id }), baseDelay + 1100);
      window.setTimeout(() => {
        dispatch({ type: "SVC_UP", id });
        addToast("ok", `Служба «${id}» перезапущена и отвечает`);
      }, baseDelay + 2400);
    },
    [addToast]
  );

  const restartAll = useCallback(() => {
    const eligible = state.services.filter(
      (s) => s.status === "running" || s.status === "stopped"
    );
    eligible.forEach((s, i) => restartOne(s.id, i * 170));
    addToast("info", `Массовый перезапуск: ${eligible.length} служб в очереди`);
  }, [state.services, restartOne, addToast]);

  /* опрос системы: поиск ККТ, подключённой к ПК */
  const scanKkt = useCallback(() => {
    dispatch({ type: "KKT_SCAN_START" });
    const serial = state.kktSerial ?? KKT_SERIAL_POOL[Math.floor(Math.random() * KKT_SERIAL_POOL.length)];
    const port = KKT_PORTS[Math.floor(Math.random() * KKT_PORTS.length)];
    window.setTimeout(() => {
      dispatch({ type: "KKT_SCAN_DONE", serial, port });
      addToast("ok", `На ${port} обнаружена ККТ: серийный № ${serial}`);
    }, 1800);
  }, [state.kktSerial, addToast]);

  const applyKkt = useCallback(
    (serial: string) => {
      dispatch({ type: "KKT_APPLY", serial });
      addToast("ok", `ККТ привязана к монитору: esm-cm-${serial}`);
    },
    [addToast]
  );

  const handleInit = useCallback(
    (token: string) => {
      const clean = token.trim();
      if (clean.length < 24) {
        setInitError("Токен слишком короткий — минимум 24 символа");
        addToast("err", "Токен пуст или некорректен. Инициализация отклонена.");
        return;
      }
      setInitError(null);
      setBusyInit(true);
      dispatch({ type: "INIT_START" });
      window.setTimeout(() => {
        dispatch({ type: "INIT_DONE", token: clean });
        setBusyInit(false);
        addToast("ok", "Инициализация выполнена: модуль ЧЗ готов к работе");
      }, 1500);
    },
    [addToast]
  );

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET_CONFIG" });
    addToast("warn", "Конфигурация ЛМ сброшена — введите токен заново");
  }, [addToast]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    addToast("info", "Монитор свёрнут в трей. Программа работает в фоновом режиме.");
  }, [addToast]);

  const handleExpand = useCallback(() => {
    setMinimized(false);
    addToast("ok", "Монитор развёрнут");
  }, [addToast]);

  const handleInterval = useCallback((ms: number) => dispatch({ type: "SET_INTERVAL", value: ms }), []);
  const handlePollNow = useCallback(() => dispatch({ type: "POLL", now: Date.now() }), []);

  return (
    <div className="relative min-h-screen">
      {/* фоновые слои */}
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
            <VerdictStrip state={state} now={now} onPollNow={handlePollNow} />

            <ToolPanel onToast={addToast} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <ServiceBoard
                  state={state}
                  onRestart={restartOne}
                  onRestartAll={restartAll}
                  onScan={scanKkt}
                  onApplyKkt={applyKkt}
                />
              </div>
              <ApiPanel
                state={state}
                busyInit={busyInit}
                initError={initError}
                onInit={handleInit}
                onReset={handleReset}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <LogPanel state={state} onClear={() => dispatch({ type: "CLEAR_LOGS" })} />
              </div>
              <OpsPanel
                state={state}
                uptime={uptime}
                onInterval={handleInterval}
                onToggleHeal={() => dispatch({ type: "TOGGLE_HEAL" })}
                onToggleFaults={() => dispatch({ type: "TOGGLE_FAULTS" })}
              />
            </div>

            <footer
              className="animate-rise flex flex-wrap items-center justify-between gap-2 pb-4 font-mono text-[10px] tracking-wide text-ink-500"
              style={{ animationDelay: "460ms" }}
            >
              <span>
                © {new Date().getFullYear()} ООО «Правовой Статус» (ККТ34) ·{" "}
                <span className="text-brand-400">kkt34.ru</span> · г. Волгоград · сервисное
                обслуживание ККТ
              </span>
              <span>
                GET /api/v2/status · POST /api/v2/init · {state.services.length} служб · интервал{" "}
                {state.pollInterval / 1000} с
              </span>
            </footer>
          </main>
        </div>
      )}

      <Toasts toasts={toasts} onClose={closeToast} />
    </div>
  );
}
