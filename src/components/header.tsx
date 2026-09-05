import type { ReactNode } from "react";
import type { SimState, VerdictTone } from "../lib/sim";
import { computeVerdict, fmtClock } from "../lib/sim";
import { IconPulse, IconRestart, IconTrayDown, LogoMark } from "./icons";

export type Tone = "ok" | "warn" | "err" | "info" | "dim";

export const toneText: Record<Tone, string> = {
  ok: "text-ok-400",
  warn: "text-warn-400",
  err: "text-err-400",
  info: "text-brand-400",
  dim: "text-ink-400",
};

export const toneBg: Record<Tone, string> = {
  ok: "bg-ok-400",
  warn: "bg-warn-400",
  err: "bg-err-400",
  info: "bg-brand-400",
  dim: "bg-ink-500",
};

/* Живой светодиод статуса */
export function Led({
  tone,
  pulse = false,
  blink = false,
  size = "h-2.5 w-2.5",
  className = "",
}: {
  tone: Tone;
  pulse?: boolean;
  blink?: boolean;
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${size} ${toneText[tone]} ${toneBg[tone]} ${
        pulse ? "animate-led-pulse" : ""
      } ${blink ? "animate-led-blink" : ""} ${className}`}
    />
  );
}

export function Header({
  state,
  now,
  onMinimize,
}: {
  state: SimState;
  now: number;
  onMinimize: () => void;
}) {
  const verdict = computeVerdict(state);
  const running = state.services.filter((s) => s.status === "running").length;
  const reachable = state.api === "ready" || state.api === "not_configured";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center border border-brand-500/45 bg-brand-900 text-brand-400">
            <LogoMark width={26} height={26} />
            <span className="absolute -right-2 -bottom-1.5 border border-brand-400/60 bg-ink-950 px-1 font-mono text-[8px] font-bold tracking-[0.14em] text-brand-400">
              ККТ34
            </span>
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-[0.18em] text-ink-50 md:text-base">
              МОНИТОР&nbsp;ЛМ
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-ink-400 uppercase">
              «Правовой Статус» · Волгоград · сервис АТОЛ
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2.5 md:gap-4">
          <div className="hidden items-center gap-1.5 border border-ink-700 bg-ink-850 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-300 lg:flex">
            <span className="text-brand-400">АТОЛ</span>
            <span className="text-ink-600">|</span>
            <span className="text-chz-400">Честный ЗНАК</span>
          </div>

          <div className="hidden items-center gap-2 border border-ink-700 bg-ink-850 px-3 py-1.5 lg:flex">
            <Led tone={reachable ? "ok" : "err"} pulse={reachable} size="h-2 w-2" />
            <span className="font-mono text-xs text-ink-200">
              ЛМ {reachable ? state.apiVersion : "нет связи"}
            </span>
          </div>

          <div className="hidden items-center gap-2 border border-ink-700 bg-ink-850 px-3 py-1.5 sm:flex">
            <Led tone={verdict.tone} pulse size="h-2 w-2" />
            <span className="font-mono text-xs text-ink-200">
              {running}/{state.services.length} служб
            </span>
          </div>

          <div className="border border-ink-700 bg-ink-850 px-3 py-1.5 font-mono text-base font-semibold tabular-nums text-ink-50 md:text-lg">
            {fmtClock(now)}
          </div>

          <button
            onClick={onMinimize}
            className="group flex items-center gap-2 border border-ink-600 bg-ink-800 px-3 py-2 text-xs font-semibold text-ink-200 transition-all hover:border-brand-500/60 hover:bg-ink-750 hover:text-brand-300 active:scale-[0.96]"
            title="Свернуть в трей"
          >
            <IconTrayDown className="transition-transform group-hover:translate-y-0.5" />
            <span className="hidden md:inline">В трей</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const verdictToneText: Record<VerdictTone, string> = {
  ok: "text-ok-400",
  warn: "text-warn-400",
  err: "text-err-400",
  info: "text-brand-400",
};

function Chip({ label, value }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-[104px] flex-col gap-0.5 border border-ink-700 bg-ink-900/70 px-3 py-2">
      <span className="font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-ink-100">{value}</span>
    </div>
  );
}

export function VerdictStrip({
  state,
  now,
  onPollNow,
}: {
  state: SimState;
  now: number;
  onPollNow: () => void;
}) {
  const verdict = computeVerdict(state);
  const ok = state.services.filter((s) => s.status === "running").length;
  const total = state.services.length;
  const apiLabel =
    state.api === "ready"
      ? "READY"
      : state.api === "not_configured"
        ? "NOT CONFIG"
        : state.api === "probing"
          ? "PROBING"
          : "OFFLINE";
  const ping = state.ping.length ? state.ping[state.ping.length - 1] : null;

  const elapsed = state.lastPoll ? now - state.lastPoll : 0;
  const progress = state.lastPoll ? Math.min(100, (elapsed / state.pollInterval) * 100) : 0;
  const secsLeft = state.lastPoll ? Math.max(0, Math.ceil((state.pollInterval - elapsed) / 1000)) : null;

  return (
    <section className="panel animate-rise relative overflow-hidden" style={{ animationDelay: "60ms" }}>
      <div className={`absolute inset-x-0 top-0 h-[3px] ${toneBg[verdict.tone]}`} />
      <div className="flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-7">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2.5">
            <IconPulse className={verdictToneText[verdict.tone]} width={15} height={15} />
            <span className="panel-title">Сводный статус системы</span>
          </div>
          <div className="flex items-center gap-4">
            <Led
              tone={verdict.tone}
              pulse
              size="h-4 w-4 md:h-5 md:w-5"
              className={verdict.tone === "err" ? "animate-led-blink" : ""}
            />
            <h1
              className={`font-display text-[26px] leading-none font-bold tracking-wide sm:text-4xl xl:text-[44px] ${verdictToneText[verdict.tone]}`}
            >
              {verdict.label}
            </h1>
          </div>
          <p className="mt-3 max-w-xl truncate font-mono text-xs text-ink-300 md:text-[13px]">
            {verdict.detail}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Chip label="Службы" value={`${ok}/${total}`} />
            <Chip label="API :5995" value={apiLabel} />
            <Chip label="Пинг" value={ping !== null ? `${ping} мс` : "—"} />
            <Chip label="Опрос" value={state.totals.polls ? `#${state.totals.polls}` : "…"} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onPollNow}
              className="flex items-center gap-2 border border-brand-500/50 bg-brand-900 px-4 py-2.5 font-display text-[11px] font-semibold tracking-[0.14em] text-brand-300 uppercase transition-all hover:border-brand-400 hover:bg-brand-500/20 hover:text-brand-200 active:scale-[0.96]"
            >
              <IconRestart width={14} height={14} />
              Опросить сейчас
            </button>
            <div className="min-w-0 flex-1">
              <div className="relative h-1.5 overflow-hidden bg-ink-800">
                {state.lastPoll ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-400 transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                ) : (
                  <div className="animate-sweep absolute inset-y-0 w-1/4 bg-brand-400/80" />
                )}
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] tracking-wide text-ink-400">
                {state.lastPoll
                  ? `автоопрос через ${secsLeft} с · интервал ${state.pollInterval / 1000} с`
                  : "установление связи с локальным модулем…"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
