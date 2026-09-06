import { useState, type FormEvent } from "react";
import type { Field, MonState } from "../lib/real";
import { fmtUptime, LM_BASE, TOOL_FILE } from "../lib/real";
import { IconCheckCircle, IconGear, IconKey, IconRadio, IconWarnTriangle, IconXCircle, IconZap } from "./icons";
import { Led } from "./header";

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
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 5 - ((v - min) / span) * (H - 12);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[56px] w-full">
      <defs>
        <linearGradient id="latfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-400)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-brand-400)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill="url(#latfill)" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-brand-400)" strokeWidth="1.8" />
      <circle
        cx={W}
        cy={Number(pts[pts.length - 1].split(",")[1])}
        r="2.6"
        fill="var(--color-brand-300)"
        className="animate-led-blink"
      />
    </svg>
  );
}

function InfoRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-700/50 py-2 last:border-0">
      <span className="shrink-0 text-[11px] tracking-wide text-ink-400">{label}</span>
      <span className={`truncate font-mono text-xs font-semibold tabular-nums ${accent ? "text-brand-300" : "text-ink-100"}`}>
        {value}
      </span>
    </div>
  );
}

function FieldList({ title, fields }: { title: string; fields: Field[] }) {
  if (!fields.length) return null;
  return (
    <div className="mt-3">
      <div className="mb-1.5 font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">{title}</div>
      <div className="max-h-[180px] overflow-y-auto border border-ink-700/70 bg-ink-950/60">
        {fields.map((f) => (
          <div key={f.key} className="flex justify-between gap-3 border-b border-ink-800/70 px-3 py-1.5 last:border-0">
            <span className="truncate font-mono text-[10.5px] text-ink-400">{f.key}</span>
            <span className="shrink-0 font-mono text-[10.5px] font-semibold text-chz-300">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- форма токена ---- */
function TokenForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (token: string) => Promise<string | null>;
  busy: boolean;
  error: string | null;
}) {
  const [token, setToken] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = await onSubmit(token);
    setLocalErr(err);
  };

  const shownErr = localErr ?? error;

  return (
    <form onSubmit={submit} className="mt-4 border border-brand-500/25 bg-ink-900/70 p-3.5">
      <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-ink-200">
        <IconKey width={13} height={13} className="text-brand-400" />
        Токен инициализации ЛМ ЧЗ
      </label>
      <input
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          setLocalErr(null);
        }}
        placeholder="Вставьте токен из личного кабинета Честного ЗНАКа…"
        spellCheck={false}
        autoComplete="off"
        className="w-full border border-ink-600 bg-ink-950 px-3 py-2.5 font-mono text-xs text-ink-100 placeholder:text-ink-500 focus:border-brand-500/70 focus:outline-none"
      />
      {shownErr && (
        <p className="animate-row-in mt-2 flex items-start gap-1.5 font-mono text-[10.5px] leading-snug text-err-400">
          <IconZap width={11} height={11} className="mt-0.5 shrink-0" /> {shownErr}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className={`mt-3 w-full border px-3 py-2.5 font-display text-[10.5px] font-semibold tracking-[0.14em] uppercase transition-all active:scale-[0.97] ${
          busy
            ? "cursor-wait border-warn-500/50 bg-warn-900 text-warn-300"
            : "border-ok-500/50 bg-ok-900 text-ok-300 hover:border-ok-400 hover:bg-ok-500/20"
        }`}
      >
        {busy ? "Отправка и опрос загрузки…" : "Запустить инициализацию"}
      </button>
    </form>
  );
}

export function ApiPanel({
  state,
  now,
  onInit,
  onInitReset,
  onPoll,
  onApplySerial,
}: {
  state: MonState;
  now: number;
  onInit: (token: string) => Promise<string | null>;
  onInitReset: () => void;
  onPoll: () => void;
  onApplySerial: (v: string) => void;
}) {
  void onApplySerial;
  const reachable = state.api !== "unreachable" && state.api !== "boot";
  const ping = state.latency.length ? state.latency[state.latency.length - 1] : null;
  const init = state.init;
  const busy = init.phase === "sending" || init.phase === "loading";

  const statusLine =
    state.api === "ready"
      ? { text: "ЛМ: Готов к работе (ready)", tone: "text-ok-400" as const, led: "ok" as const }
      : state.api === "not_configured"
        ? { text: "ЛМ: Не настроен — отправьте токен", tone: "text-warn-400" as const, led: "warn" as const }
        : state.api === "unreachable"
          ? { text: "ЛМ: Недоступен (порт 5995)", tone: "text-err-400" as const, led: "err" as const }
          : state.api === "other"
            ? { text: `ЛМ: статус «${init.lastApiStatus ?? "нестандартный"}»`, tone: "text-brand-400" as const, led: "info" as const }
            : { text: "ЛМ: Опрос системы…", tone: "text-brand-400" as const, led: "info" as const };

  const sinceDown =
    state.api === "unreachable" && state.unreachableSince
      ? Math.max(0, Math.floor((now - state.unreachableSince) / 1000))
      : null;

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "220ms" }}>
      <div className="flex items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconRadio className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">API ЛМ Честного ЗНАКа</h2>
        <span className="ml-auto border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-[10px] tracking-wide text-ink-300">
          :5995
        </span>
        <button
          onClick={onPoll}
          className="flex items-center gap-1.5 border border-chz-500/50 bg-chz-900 px-2 py-1 font-display text-[9px] font-semibold tracking-[0.12em] text-chz-300 uppercase transition-all hover:border-chz-400 active:scale-95"
          title="Немедленный запрос к ЛМ"
        >
          <IconRadio width={11} height={11} />
          Опрос
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2.5">
          <Led
            tone={statusLine.led}
            pulse={reachable}
            blink={state.api === "unreachable"}
            size="h-2.5 w-2.5"
          />
          <span className={`font-mono text-[12.5px] font-semibold tracking-wide ${statusLine.tone}`}>
            {statusLine.text}
          </span>
        </div>
        {sinceDown !== null && (
          <p className="mt-1.5 font-mono text-[10px] text-ink-500">
            нет связи {sinceDown} с · HTTP {state.apiHttpStatus ?? "—"} · запросы идут реально, без CORS их не пустит браузер
          </p>
        )}

        <div className="mt-4">
          <InfoRow label="Версия ЛМ" value={state.version ?? (reachable ? "н/д" : "нет связи")} accent={!!state.version} />
          <InfoRow label="ИНН организации" value={state.inn ?? "—"} accent={!!state.inn} />
          <InfoRow label="HTTP-статус" value={state.apiHttpStatus ? String(state.apiHttpStatus) : "—"} />
          <InfoRow label="Серийный № ККТ" value={state.kktSerial ?? "не задан"} accent={!!state.kktSerial} />
          <InfoRow label="Опросов выполнено" value={String(state.totals.polls)} />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">Отклик ЛМ, мс</span>
            <span className="font-mono text-sm font-bold tabular-nums text-brand-300">{ping !== null ? ping : "—"}</span>
          </div>
          <div className="border border-ink-700/70 bg-ink-950/60 p-2">
            <Sparkline data={state.latency} />
          </div>
        </div>

        {/* ---- инициализация: реальный прогресс ---- */}
        {init.phase === "idle" && reachable && (
          <TokenForm onSubmit={onInit} busy={busy} error={init.note} />
        )}

        {init.phase === "sending" && (
          <div className="animate-row-in mt-4 border border-warn-500/30 bg-ink-900/70 p-3.5">
            <div className="flex items-center gap-2 font-mono text-[11.5px] font-semibold text-warn-300">
              <Led tone="warn" blink size="h-2 w-2" /> Отправка токена → POST {LM_BASE}/api/v2/init
            </div>
          </div>
        )}

        {init.phase === "loading" && (
          <div className="animate-row-in mt-4 border border-chz-500/30 bg-ink-900/70 p-3.5">
            <div className="flex items-center gap-2 font-mono text-[11.5px] font-semibold text-chz-300">
              <Led tone="info" blink size="h-2 w-2" /> Загрузка данных из ЛМ… статус: {init.lastApiStatus ?? "…"}
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-400">
              опрос #{init.polls} · каждые 1.5 с до статуса ready
            </div>
            <FieldList title="Поля, которые уже вернул ЛМ" fields={init.fields} />
          </div>
        )}

        {init.phase === "done" && (
          <div className="animate-row-in mt-4 border border-ok-500/40 bg-ink-900/70 p-3.5">
            <div className="flex items-center gap-2 font-mono text-[12px] font-bold text-ok-400">
              <IconCheckCircle width={15} height={15} /> Инициализация прошла успешно
            </div>
            <div className="mt-1 font-mono text-[10.5px] text-ink-300">
              ЛМ в статусе ready · данных в базе: {init.db.length ? `${init.db.length} показателей` : "ответ получен"}
            </div>
            <FieldList title="Данные в базе ЛМ" fields={init.db.length ? init.db : init.fields} />
            <button
              onClick={onInitReset}
              className="mt-3 border border-ink-600 bg-ink-800 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-300 transition-colors hover:border-brand-500/50 hover:text-brand-300"
            >
              скрыть отчёт
            </button>
          </div>
        )}

        {init.phase === "error" && (
          <div className="animate-row-in mt-4 border border-err-500/40 bg-ink-900/70 p-3.5">
            <div className="flex items-start gap-2 font-mono text-[11px] font-semibold leading-snug text-err-400">
              <IconXCircle width={14} height={14} className="mt-0.5 shrink-0" /> {init.note}
            </div>
            <button
              onClick={onInitReset}
              className="mt-3 border border-ink-600 bg-ink-800 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-300 transition-colors hover:border-brand-500/50 hover:text-brand-300"
            >
              повторить
            </button>
          </div>
        )}

        {state.api === "unreachable" && init.phase === "idle" && (
          <div className="mt-4 flex items-start gap-2 border border-err-500/30 bg-ink-900/70 p-3.5 font-mono text-[10.5px] leading-relaxed text-ink-300">
            <IconWarnTriangle width={14} height={14} className="mt-0.5 shrink-0 text-warn-400" />
            <span>
              Браузер не достучался до порта 5995 (ЛМ не запущен или блокирует CORS). Реальные запросы и
              управление службами работают в автономном инструменте <span className="text-brand-400">{TOOL_FILE}</span> —
              он обращается к ЛМ напрямую и к диспетчеру служб Windows.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export function OpsPanel({
  state,
  uptime,
  onInterval,
}: {
  state: MonState;
  uptime: number;
  onInterval: (ms: number) => void;
}) {
  const stats: { label: string; value: string; tone?: string }[] = [
    { label: "Аптайм монитора", value: fmtUptime(uptime), tone: "text-brand-300" },
    { label: "Запросов к ЛМ", value: String(state.totals.requests) },
    { label: "Успешных опросов", value: String(state.totals.polls), tone: "text-ok-400" },
    {
      label: "Ошибок",
      value: String(state.totals.errors),
      tone: state.totals.errors ? "text-err-400" : undefined,
    },
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
            <div className="text-xs font-semibold text-ink-100">Интервал опроса ЛМ</div>
            <div className="font-mono text-[10px] text-ink-400">реальный GET /api/v2/status</div>
          </div>
          <div className="ml-auto flex gap-1">
            {[2, 4, 10].map((s) => (
              <button
                key={s}
                onClick={() => onInterval(s * 1000)}
                className={`border px-2.5 py-1.5 font-mono text-[11px] font-semibold tabular-nums transition-all active:scale-95 ${
                  state.interval === s * 1000
                    ? "border-brand-500/70 bg-brand-900 text-brand-300"
                    : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                }`}
              >
                {s}с
              </button>
            ))}
          </div>
        </div>

        <div className="border border-ink-700/70 bg-ink-900/55 px-3 py-2.5">
          <div className="text-xs font-semibold text-ink-100">Команд скопировано</div>
          <div className="mt-1 font-mono text-lg leading-none font-bold tabular-nums text-chz-300">
            {state.totals.cmds}
          </div>
          <div className="mt-1 font-mono text-[9.5px] leading-relaxed text-ink-500">
            PowerShell-команды для служб — вставьте в консоль от администратора
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-ink-700/70 px-5 py-3 font-mono text-[9.5px] leading-relaxed tracking-wide text-ink-500">
        «Правовой Статус» · ООО «ККТ34» · kkt34.ru · режим реальных запросов, демо-данные отключены.
        Полное управление службами — {TOOL_FILE}.
      </div>
    </section>
  );
}
