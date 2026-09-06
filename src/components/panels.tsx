import { useState, type FormEvent } from "react";
import type { SimState } from "../lib/sim";
import { fmtUptime } from "../lib/sim";
import { IconGear, IconKey, IconRadio, IconZap } from "./icons";
import { Led } from "./header";

const DEMO_TOKEN = "CHZ-DEMO-7F3K9Q2M5V8X1B4N6T0Y3R5E7W9A1S2D4F6G8H0J";

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="grid h-[56px] place-items-center font-mono text-[10px] tracking-[0.2em] text-ink-500 uppercase">
        накопление выборки…
      </div>
    );
  }
  const W = 240;
  const H = 56;
  const min = 5;
  const max = 46;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 5 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (H - 12);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[56px] w-full">
      <defs>
        <linearGradient id="pingfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-chz-400)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-chz-400)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill="url(#pingfill)" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-chz-400)" strokeWidth="1.8" />
      <circle
        cx={W}
        cy={Number(pts[pts.length - 1].split(",")[1])}
        r="2.6"
        fill="var(--color-chz-300)"
        className="animate-led-blink"
      />
    </svg>
  );
}

function InfoRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-700/50 py-2 last:border-0">
      <span className="text-[11px] tracking-wide text-ink-400">{label}</span>
      <span className={`font-mono text-xs font-semibold tabular-nums ${accent ? "text-chz-300" : "text-ink-100"}`}>
        {value}
      </span>
    </div>
  );
}

function TokenForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (token: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [token, setToken] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(token);
  };

  return (
    <form onSubmit={submit} className="mt-4 border border-warn-500/25 bg-ink-900/70 p-3.5">
      <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-ink-200">
        <IconKey width={13} height={13} className="text-warn-400" />
        Токен (введите, если модуль ещё не настроен)
      </label>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Вставьте токен из личного кабинета ЧЗ…"
        spellCheck={false}
        className="w-full border border-ink-600 bg-ink-950 px-3 py-2.5 font-mono text-xs text-ink-100 placeholder:text-ink-500 focus:border-brand-500/70 focus:outline-none"
      />
      {error && (
        <p className="animate-row-in mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-err-400">
          <IconZap width={11} height={11} /> {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className={`flex-1 border px-3 py-2.5 font-display text-[10.5px] font-semibold tracking-[0.14em] uppercase transition-all active:scale-[0.97] ${
            busy
              ? "cursor-wait border-warn-500/50 bg-warn-900 text-warn-300"
              : "border-ok-500/50 bg-ok-900 text-ok-300 hover:border-ok-400 hover:bg-ok-500/20"
          }`}
        >
          {busy ? "Инициализация…" : "Запустить инициализацию"}
        </button>
        <button
          type="button"
          onClick={() => setToken(DEMO_TOKEN)}
          className="border border-ink-600 bg-ink-800 px-3 py-2.5 font-mono text-[10px] tracking-wide text-ink-300 transition-colors hover:border-brand-500/50 hover:text-brand-300"
          title="Подставить демонстрационный токен"
        >
          демо-токен
        </button>
      </div>
    </form>
  );
}

export function ApiPanel({
  state,
  busyInit,
  initError,
  onInit,
  onReset,
  onLive,
}: {
  state: SimState;
  busyInit: boolean;
  initError: string | null;
  onInit: (token: string) => void;
  onReset: () => void;
  onLive: () => void;
}) {
  const reachable = state.api === "ready" || state.api === "not_configured";
  const ping = state.ping.length ? state.ping[state.ping.length - 1] : null;

  const statusLine =
    state.api === "ready"
      ? { text: "API: Готов к работе", tone: "text-ok-400" as const, led: "ok" as const }
      : state.api === "not_configured"
        ? { text: "API: Не настроен — введите токен", tone: "text-warn-400" as const, led: "warn" as const }
        : state.api === "probing"
          ? { text: "API: Опрос системы…", tone: "text-brand-400" as const, led: "info" as const }
          : { text: "API: Недоступно (порт 5995)", tone: "text-err-400" as const, led: "err" as const };

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "220ms" }}>
      <div className="flex items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconRadio className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">API Честного ЗНАКа</h2>
        <span className="ml-auto border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-[10px] tracking-wide text-ink-300">
          localhost:5995
        </span>
        <button
          onClick={onLive}
          disabled={state.live === "checking"}
          className={`flex items-center gap-1.5 border px-2 py-1 font-display text-[9px] font-semibold tracking-[0.12em] uppercase transition-all active:scale-95 ${
            state.live === "checking"
              ? "cursor-wait border-warn-500/50 bg-warn-900 text-warn-300"
              : "border-chz-500/50 bg-chz-900 text-chz-300 hover:border-chz-400 hover:bg-chz-500/20"
          }`}
          title="Запросить реальную версию у локального модуля на этом ПК"
        >
          <IconRadio width={11} height={11} className={state.live === "checking" ? "animate-led-blink" : ""} />
          {state.live === "checking" ? "Опрос…" : "LIVE-проверка"}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2.5">
          <Led tone={statusLine.led} pulse blink={state.api === "unreachable" || state.api === "probing"} />
          <span className={`font-mono text-[13px] font-semibold tracking-wide ${statusLine.tone}`}>
            {statusLine.text}
          </span>
        </div>

        <div className="mt-4">
          <InfoRow label="Версия ЛМ" value={reachable ? state.apiVersion : "нет связи"} accent={reachable} />
          <InfoRow label="ИНН организации" value={state.inn ?? "—"} />
          <InfoRow label="Токен сессии" value={state.tokenTail ? `принят ····${state.tokenTail}` : "не задан"} />
          <InfoRow
            label="Серийный № ККТ"
            value={state.kktSerial ?? "не задан"}
            accent={state.kktSerial !== null}
          />
          <InfoRow label="Опросов выполнено" value={String(state.totals.polls)} />
          {state.live !== "idle" && (
            <InfoRow
              label="LIVE · реальный ЛМ"
              value={
                state.live === "ok"
                  ? state.liveVersion ?? "n/a"
                  : state.live === "checking"
                    ? "опрос…"
                    : state.liveNote ?? "недоступен"
              }
              accent={state.live === "ok"}
            />
          )}
        </div>

        <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-ink-500">
          В демо-режиме версия берётся из симуляции ({state.apiVersion}); LIVE-проверка запрашивает
          реальный модуль на этом ПК (GET /api/v2/status, Basic-авторизация).
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
              Отклик API, мс
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-chz-300">
              {ping !== null ? ping : "—"}
            </span>
          </div>
          <div className="border border-ink-700/70 bg-ink-950/60 p-2">
            <Sparkline data={state.ping} />
          </div>
        </div>

        <div className="mt-auto">
          {state.configured ? (
            <div className="animate-row-in mt-4 flex items-center justify-between gap-3 border border-ok-500/25 bg-ink-900/70 px-3.5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-ok-400">
                  <Led tone="ok" size="h-1.5 w-1.5" pulse /> МОДУЛЬ АКТИВИРОВАН
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-ink-400">
                  токен ····{state.tokenTail} · ИНН {state.inn}
                </div>
              </div>
              <button
                onClick={onReset}
                className="shrink-0 border border-err-500/40 bg-ink-900 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-err-300 transition-colors hover:border-err-400 hover:bg-err-900"
                title="Сбросить конфигурацию модуля"
              >
                сброс
              </button>
            </div>
          ) : (
            <TokenForm onSubmit={onInit} busy={busyInit} error={initError} />
          )}
        </div>
      </div>
    </section>
  );
}

function Toggle({
  on,
  onToggle,
  label,
  hint,
  danger = false,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center gap-3 border border-ink-700/70 bg-ink-900/55 px-3 py-2.5 text-left transition-colors hover:border-ink-600 hover:bg-ink-850"
    >
      <span
        className={`relative h-5 w-9 shrink-0 border transition-colors ${
          on ? (danger ? "border-warn-500/70 bg-warn-900" : "border-ok-500/70 bg-ok-900") : "border-ink-600 bg-ink-800"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all duration-200 ${
            on
              ? `left-[18px] ${danger ? "bg-warn-400" : "bg-ok-400"}`
              : "left-0.5 bg-ink-400 group-hover:bg-ink-300"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-ink-100">{label}</span>
        <span className="block truncate font-mono text-[10px] text-ink-400">{hint}</span>
      </span>
      <span
        className={`ml-auto font-mono text-[10px] font-bold tracking-[0.14em] ${
          on ? (danger ? "text-warn-400" : "text-ok-400") : "text-ink-500"
        }`}
      >
        {on ? "ВКЛ" : "ВЫКЛ"}
      </span>
    </button>
  );
}

export function OpsPanel({
  state,
  uptime,
  onInterval,
  onToggleHeal,
  onToggleFaults,
}: {
  state: SimState;
  uptime: number;
  onInterval: (ms: number) => void;
  onToggleHeal: () => void;
  onToggleFaults: () => void;
}) {
  const stats: { label: string; value: string; tone?: string }[] = [
    { label: "Аптайм монитора", value: fmtUptime(uptime), tone: "text-brand-300" },
    { label: "Рестартов вручную", value: String(state.totals.restarts) },
    { label: "Авто-подъёмов", value: String(state.totals.autoStarts), tone: "text-warn-300" },
    { label: "Сбоев за сессию", value: String(state.totals.failures), tone: state.totals.failures ? "text-err-400" : undefined },
  ];

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconGear className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">Параметры и счётчики</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-ink-700/70 bg-ink-900/55 px-3 py-2.5">
            <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">{s.label}</div>
            <div className={`mt-1 font-mono text-lg leading-none font-bold tabular-nums ${s.tone ?? "text-ink-100"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-center gap-3 border border-ink-700/70 bg-ink-900/55 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink-100">Интервал опроса</div>
            <div className="font-mono text-[10px] text-ink-400">таймер обновления телеметрии</div>
          </div>
          <div className="ml-auto flex gap-1">
            {[2, 4, 10].map((s) => (
              <button
                key={s}
                onClick={() => onInterval(s * 1000)}
                className={`border px-2.5 py-1.5 font-mono text-[11px] font-semibold tabular-nums transition-all active:scale-95 ${
                  state.pollInterval === s * 1000
                    ? "border-brand-500/70 bg-brand-900 text-brand-300"
                    : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                }`}
              >
                {s}с
              </button>
            ))}
          </div>
        </div>

        <Toggle
          on={state.autoHeal}
          onToggle={onToggleHeal}
          label="Авто-восстановление"
          hint="Start-Service при обнаружении остановки"
        />
        <Toggle
          on={state.injectFaults}
          onToggle={onToggleFaults}
          label="Инжекция сбоев"
          hint="демо-режим: случайные падения служб и API"
          danger
        />
      </div>

      <div className="mt-auto border-t border-ink-700/70 px-5 py-3 font-mono text-[9.5px] leading-relaxed tracking-wide text-ink-500">
        «Правовой Статус» · ООО «ККТ34» · kkt34.ru — демо-симуляция телеметрии среды Windows
        (SCM + REST :5995). Заголовки: Authorization Basic ·•••
      </div>
    </section>
  );
}
