import { useEffect, useState } from "react";
import type { ServiceInfo, ServiceStatus, SimState } from "../lib/sim";
import { SERIAL_RE, STATUS_META } from "../lib/sim";
import { IconReceipt, IconRestart, IconRestartAll, IconScan, IconServer } from "./icons";
import { Led, toneText, type Tone } from "./header";

function statusTone(s: ServiceStatus): Tone {
  const t = STATUS_META[s].tone;
  return t === "dim" ? "dim" : t;
}

function ServiceRow({
  s,
  index,
  busy,
  onRestart,
}: {
  s: ServiceInfo;
  index: number;
  busy: boolean;
  onRestart: (id: string) => void;
}) {
  const meta = STATUS_META[s.status];
  const tone = statusTone(s.status);
  const transitional = s.status === "starting" || s.status === "stopping";
  const dead = s.status === "not_found";

  return (
    <div
      className="group animate-row-in flex items-center gap-3 border border-ink-700/70 bg-ink-900/55 px-3 py-2.5 transition-all duration-200 hover:translate-x-1 hover:border-ink-600 hover:bg-ink-850"
      style={{ animationDelay: `${140 + index * 45}ms` }}
    >
      <Led
        tone={tone}
        pulse={s.status === "running"}
        blink={transitional}
        size="h-2.5 w-2.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-ink-100">{s.id}</span>
          {s.dynamic && (
            <span className="shrink-0 border border-brand-500/40 bg-brand-900 px-1.5 py-px font-mono text-[9px] tracking-[0.12em] text-brand-300 uppercase">
              ККТ
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-ink-400">{s.desc}</div>
      </div>

      <span
        className={`hidden w-[104px] shrink-0 text-right font-mono text-[10.5px] font-semibold tracking-[0.08em] sm:block ${toneText[tone]}`}
      >
        {meta.label}
      </span>

      <button
        onClick={() => onRestart(s.id)}
        disabled={dead || busy}
        title={dead ? "Служба не установлена на узле" : `Рестарт: ${s.id}`}
        className={`grid h-8 w-8 shrink-0 place-items-center border transition-all active:scale-90 ${
          dead
            ? "cursor-not-allowed border-ink-700/60 text-ink-600"
            : transitional
              ? "border-warn-500/60 bg-warn-900 text-warn-300"
              : "border-ink-600 bg-ink-800 text-ink-300 hover:border-brand-500/60 hover:bg-brand-900 hover:text-brand-300"
        }`}
      >
        <IconRestart width={14} height={14} className={transitional ? "animate-spin-slow" : ""} />
      </button>
    </div>
  );
}

/* ---- блок привязки ККТ: ручной ввод серийника + опрос системы ---- */
function KktBar({
  state,
  onScan,
  onApplyKkt,
}: {
  state: SimState;
  onScan: () => void;
  onApplyKkt: (serial: string) => void;
}) {
  const [serial, setSerial] = useState(state.kktSerial ?? "");
  const [error, setError] = useState<string | null>(null);
  const scanning = state.kktScan === "scanning";
  const detected = state.kktDetected;

  useEffect(() => {
    if (detected) {
      setSerial(detected.serial);
      setError(null);
    }
  }, [detected]);

  const apply = () => {
    const v = serial.trim().toUpperCase();
    if (!SERIAL_RE.test(v)) {
      setError("Серийный №: 6–20 символов — цифры и латинские буквы");
      return;
    }
    setError(null);
    onApplyKkt(v);
  };

  const hint = scanning
    ? { text: "Сканирование COM-портов…", cls: "text-warn-300 animate-led-blink" }
    : error
      ? { text: error, cls: "text-err-400" }
      : detected
        ? { text: `Обнаружена на ${detected.port} — проверьте номер и нажмите «Применить»`, cls: "text-chz-300" }
        : state.kktSerial
          ? { text: `Служба esm-cm-${state.kktSerial} отслеживается монитором`, cls: "text-ok-400" }
          : { text: "Введите номер вручную или нажмите «Опросить систему»", cls: "text-ink-400" };

  return (
    <div className="animate-row-in border-b border-ink-700/80 bg-ink-900/45 px-4 py-3.5 sm:px-5" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-wrap items-center gap-3">
        <IconReceipt className="shrink-0 text-brand-400" width={16} height={16} />
        <span className="panel-title">Серийный № ККТ</span>
        {state.kktSerial ? (
          <span className="border border-ok-500/40 bg-ok-900 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ok-300">
            esm-cm-{state.kktSerial}
          </span>
        ) : (
          <span className="border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-400">
            не привязана
          </span>
        )}

        <div className="ml-auto flex min-w-[260px] flex-1 flex-wrap items-center justify-end gap-2">
          <input
            value={serial}
            onChange={(e) => {
              setSerial(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
            }}
            placeholder="например: 100412345678"
            spellCheck={false}
            autoComplete="off"
            disabled={scanning}
            className={`h-9 w-full max-w-[240px] border bg-ink-950 px-3 font-mono text-xs tracking-wider text-ink-100 placeholder:text-ink-500 focus:outline-none disabled:opacity-60 ${
              error ? "border-err-500/70" : detected ? "border-chz-500/60" : "border-ink-600 focus:border-brand-500/70"
            }`}
          />
          <button
            onClick={onScan}
            disabled={scanning}
            className={`flex h-9 items-center gap-2 border px-3 font-display text-[10px] font-semibold tracking-[0.12em] uppercase transition-all active:scale-[0.95] ${
              scanning
                ? "cursor-wait border-warn-500/50 bg-warn-900 text-warn-300"
                : "border-chz-500/50 bg-chz-900 text-chz-300 hover:border-chz-400 hover:bg-chz-500/20"
            }`}
            title="Опросить систему: найти ККТ, подключённую к ПК"
          >
            <IconScan width={14} height={14} className={scanning ? "animate-spin-slow" : ""} />
            {scanning ? "Опрос…" : "Опросить систему"}
          </button>
          <button
            onClick={apply}
            disabled={scanning}
            className="flex h-9 items-center gap-2 border border-brand-400 bg-brand-500 px-4 font-display text-[10px] font-bold tracking-[0.12em] text-ink-950 uppercase transition-all hover:bg-brand-400 active:scale-[0.95] disabled:opacity-50"
          >
            Применить
          </button>
        </div>
      </div>
      <div className={`mt-2 flex items-center gap-2 font-mono text-[10.5px] tracking-wide ${hint.cls}`}>
        <Led
          tone={scanning ? "warn" : error ? "err" : detected ? "info" : state.kktSerial ? "ok" : "dim"}
          blink={scanning}
          pulse={!!state.kktSerial && !scanning}
          size="h-1.5 w-1.5"
        />
        {hint.text}
      </div>
    </div>
  );
}

export function ServiceBoard({
  state,
  onRestart,
  onRestartAll,
  onScan,
  onApplyKkt,
}: {
  state: SimState;
  onRestart: (id: string) => void;
  onRestartAll: () => void;
  onScan: () => void;
  onApplyKkt: (serial: string) => void;
}) {
  const busy = state.services.some((s) => s.status === "stopping" || s.status === "starting");
  const running = state.services.filter((s) => s.status === "running").length;
  const stopped = state.services.filter((s) => s.status === "stopped").length;
  const missing = state.services.filter((s) => s.status === "not_found").length;

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "140ms" }}>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconServer className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">Состояние служб</h2>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10.5px] tracking-wide">
          <span className="flex items-center gap-1.5 text-ok-400">
            <Led tone="ok" size="h-1.5 w-1.5" /> {running} в работе
          </span>
          <span className="text-ink-600">·</span>
          <span className={`flex items-center gap-1.5 ${stopped ? "text-err-400" : "text-ink-400"}`}>
            <Led tone={stopped ? "err" : "dim"} size="h-1.5 w-1.5" /> {stopped} стоит
          </span>
          <span className="text-ink-600">·</span>
          <span className="text-ink-400">{missing} не найдено</span>
        </div>
        <button
          onClick={onRestartAll}
          disabled={busy}
          className={`flex items-center gap-2 border px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.14em] uppercase transition-all active:scale-[0.95] ${
            busy
              ? "cursor-wait border-warn-500/40 bg-warn-900 text-warn-300"
              : "border-ink-600 bg-ink-800 text-ink-200 hover:border-warn-500/60 hover:bg-warn-900 hover:text-warn-300"
          }`}
        >
          <IconRestartAll width={13} height={13} className={busy ? "animate-spin-slow" : ""} />
          {busy ? "Выполняется…" : "Рестарт всех"}
        </button>
      </div>

      <KktBar state={state} onScan={onScan} onApplyKkt={onApplyKkt} />

      <div className="grid flex-1 grid-cols-1 gap-2 p-4 lg:grid-cols-2 lg:gap-x-4">
        {state.services.map((s, i) => (
          <ServiceRow key={s.id} s={s} index={i} busy={busy} onRestart={onRestart} />
        ))}
      </div>

      <div className="border-t border-ink-700/70 px-5 py-2.5 font-mono text-[10px] tracking-wide text-ink-500">
        sc query → {state.services.length} записей · при авто-восстановлении остановленные службы
        поднимаются на следующем опросе
      </div>
    </section>
  );
}
