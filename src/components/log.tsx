import { useEffect, useMemo, useState } from "react";
import type { LogEntry, LogLevel, SimState } from "../lib/sim";
import { computeVerdict, fmtClock } from "../lib/sim";
import { IconBroom, IconCheckCircle, IconInfoDot, IconTerminal, IconTrayUp, IconWarnTriangle, IconXCircle } from "./icons";
import { Led, toneBg, toneText, type Tone } from "./header";

const LEVEL_META: Record<LogLevel, { label: string; cls: string }> = {
  action: { label: "ДЕЙСТВИЕ", cls: "border-brand-500/40 bg-brand-900 text-brand-300" },
  ok: { label: "ОК", cls: "border-ok-500/40 bg-ok-900 text-ok-300" },
  warn: { label: "ВНИМАНИЕ", cls: "border-warn-500/40 bg-warn-900 text-warn-300" },
  error: { label: "ОШИБКА", cls: "border-err-500/40 bg-err-900 text-err-300" },
  info: { label: "ИНФО", cls: "border-ink-600 bg-ink-800 text-ink-300" },
};

const FILTERS: { key: LogLevel | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "action", label: "Действия" },
  { key: "ok", label: "ОК" },
  { key: "warn", label: "Внимание" },
  { key: "error", label: "Ошибки" },
  { key: "info", label: "Инфо" },
];

function Entry({ e }: { e: LogEntry }) {
  const meta = LEVEL_META[e.level];
  return (
    <li className="animate-row-in grid grid-cols-[76px_86px_1fr] items-baseline gap-3 border-b border-ink-800/80 px-4 py-[7px] transition-colors hover:bg-ink-850/70 sm:grid-cols-[86px_96px_1fr]">
      <span className="font-mono text-[10.5px] tabular-nums text-ink-400">{fmtClock(e.ts)}</span>
      <span className={`justify-self-start border px-1.5 py-px text-center font-mono text-[8.5px] font-bold tracking-[0.12em] ${meta.cls}`}>
        {meta.label}
      </span>
      <span className="truncate font-mono text-[11.5px] text-ink-200" title={e.msg}>
        {e.msg}
      </span>
    </li>
  );
}

export function LogPanel({ state, onClear }: { state: SimState; onClear: () => void }) {
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  const entries = useMemo(
    () => (filter === "all" ? state.logs : state.logs.filter((l) => l.level === filter)),
    [state.logs, filter]
  );

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "380ms" }}>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconTerminal className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">Журнал событий</h2>
        <span className="border border-ink-700 bg-ink-900 px-2 py-0.5 font-mono text-[10px] tabular-nums text-ink-300">
          {entries.length}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`border px-2 py-1 text-[10px] font-semibold tracking-wide transition-all active:scale-95 ${
                filter === f.key
                  ? "border-brand-500/60 bg-brand-900 text-brand-300"
                  : "border-transparent text-ink-400 hover:border-ink-600 hover:text-ink-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={onClear}
            title="Очистить журнал"
            className="ml-1 grid h-7 w-7 place-items-center border border-ink-600 bg-ink-800 text-ink-300 transition-all hover:border-err-500/50 hover:text-err-300 active:scale-90"
          >
            <IconBroom width={13} height={13} />
          </button>
        </div>
      </div>

      <ul className="max-h-[300px] flex-1 overflow-y-auto">
        {entries.length ? (
          entries.map((e) => <Entry key={e.id} e={e} />)
        ) : (
          <li className="px-5 py-10 text-center font-mono text-[11px] tracking-wide text-ink-500">
            по выбранному фильтру записей нет
          </li>
        )}
      </ul>
    </section>
  );
}

/* ---- тосты (аналог BalloonTip) ---- */

export interface ToastData {
  id: number;
  tone: "ok" | "warn" | "err" | "info";
  msg: string;
}

const TOAST_ICON = {
  ok: IconCheckCircle,
  warn: IconWarnTriangle,
  err: IconXCircle,
  info: IconInfoDot,
} as const;

function ToastItem({ t, onClose }: { t: ToastData; onClose: (id: number) => void }) {
  useEffect(() => {
    const h = setTimeout(() => onClose(t.id), 4400);
    return () => clearTimeout(h);
  }, [t.id, onClose]);

  const Icon = TOAST_ICON[t.tone];
  return (
    <button
      onClick={() => onClose(t.id)}
      className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 border bg-ink-850/95 px-3.5 py-3 text-left shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md ${
        t.tone === "ok"
          ? "border-ok-500/50"
          : t.tone === "warn"
            ? "border-warn-500/50"
            : t.tone === "err"
              ? "border-err-500/50"
              : "border-brand-500/50"
      }`}
      title="Закрыть уведомление"
    >
      <Icon width={15} height={15} className={`mt-px shrink-0 ${toneText[t.tone as Tone]}`} />
      <span className="font-mono text-[11.5px] leading-snug text-ink-100">{t.msg}</span>
    </button>
  );
}

export function Toasts({ toasts, onClose }: { toasts: ToastData[]; onClose: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex w-[calc(100vw-40px)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={onClose} />
      ))}
    </div>
  );
}

/* ---- трей-режим ---- */

export function TrayPill({
  state,
  now,
  onExpand,
}: {
  state: SimState;
  now: number;
  onExpand: () => void;
}) {
  const verdict = computeVerdict(state);
  const running = state.services.filter((s) => s.status === "running").length;

  return (
    <button
      onClick={onExpand}
      className="animate-toast-in group fixed right-5 bottom-5 z-50 flex items-center gap-3 border border-ink-600 bg-ink-850/95 py-3 pr-5 pl-4 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all hover:border-brand-500/60 hover:bg-ink-800"
      title="Развернуть монитор"
    >
      <Led tone={verdict.tone} pulse size="h-3 w-3" />
      <span className="text-left leading-tight">
        <span className="block font-display text-[11px] font-semibold tracking-[0.16em] text-ink-50">
          МОНИТОР ЛМ · ФОН
        </span>
        <span className="block font-mono text-[10px] tabular-nums text-ink-300">
          {running}/{state.services.length} служб · {fmtClock(now)}
        </span>
      </span>
      <IconTrayUp
        width={16}
        height={16}
        className={`${toneText[verdict.tone]} transition-transform group-hover:-translate-y-0.5`}
      />
      <span className={`absolute inset-x-0 bottom-0 h-[2px] ${toneBg[verdict.tone]}`} />
    </button>
  );
}
