import { useState } from "react";
import type { MonState } from "../lib/real";
import { psRestartAll, psServiceList, TARGET_SERVICES, TOOL_FILE } from "../lib/real";
import { IconCli, IconCopy, IconReceipt, IconRestartAll, IconServer } from "./icons";
import { Led } from "./header";

const SERIAL_RE = /^[0-9A-Z-]{6,20}$/i;

/* ---- поле серийного № ККТ (реальная служба esm-cm-<серийник>) ---- */
function SerialBar({
  serial,
  onApply,
}: {
  serial: string | null;
  onApply: (v: string) => void;
}) {
  const [value, setValue] = useState(serial ?? "");
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const v = value.trim().toUpperCase();
    if (v && !SERIAL_RE.test(v)) {
      setError("Серийный №: 6–20 символов — цифры и латинские буквы");
      return;
    }
    setError(null);
    onApply(v);
  };

  return (
    <div className="animate-row-in border-b border-ink-700/80 bg-ink-900/45 px-4 py-3.5 sm:px-5" style={{ animationDelay: "120ms" }}>
      <div className="flex flex-wrap items-center gap-3">
        <IconReceipt className="shrink-0 text-brand-400" width={16} height={16} />
        <span className="panel-title">Серийный № ККТ</span>
        {serial ? (
          <span className="border border-ok-500/40 bg-ok-900 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ok-300">
            esm-cm-{serial}
          </span>
        ) : (
          <span className="border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-400">
            не задан
          </span>
        )}

        <div className="ml-auto flex min-w-[240px] flex-1 flex-wrap items-center justify-end gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="например: 100412345678"
            spellCheck={false}
            autoComplete="off"
            className={`h-9 w-full max-w-[230px] border bg-ink-950 px-3 font-mono text-xs tracking-wider text-ink-100 placeholder:text-ink-500 focus:outline-none ${
              error ? "border-err-500/70" : serial ? "border-ok-500/50" : "border-ink-600 focus:border-brand-500/70"
            }`}
          />
          <button
            onClick={apply}
            className="flex h-9 items-center gap-2 border border-brand-400 bg-brand-500 px-4 font-display text-[10px] font-bold tracking-[0.12em] text-ink-950 uppercase transition-all hover:bg-brand-400 active:scale-[0.95]"
          >
            Принять
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 font-mono text-[10.5px] tracking-wide">
        <Led tone={error ? "err" : serial ? "ok" : "dim"} pulse={!!serial && !error} size="h-1.5 w-1.5" />
        <span className={error ? "text-err-400" : serial ? "text-ok-400" : "text-ink-400"}>
          {error ??
            (serial
              ? `Реальная служба esm-cm-${serial} будет в списке опроса реестра Windows`
              : "Укажите серийный № — служба esm-cm-<номер> добавится к мониторингу")}
        </span>
      </div>
    </div>
  );
}

/* ---- строка службы + копирование PowerShell-команды рестарта ---- */
function ServiceRow({
  id,
  desc,
  index,
  isKkt,
  onCopyRestart,
}: {
  id: string;
  desc: string;
  index: number;
  isKkt?: boolean;
  onCopyRestart: (id: string) => void;
}) {
  return (
    <div
      className="group animate-row-in flex items-center gap-3 border border-ink-700/70 bg-ink-900/55 px-3 py-2.5 transition-all duration-200 hover:translate-x-1 hover:border-ink-600 hover:bg-ink-850"
      style={{ animationDelay: `${140 + index * 40}ms` }}
    >
      <Led tone={isKkt ? "info" : "dim"} pulse={isKkt} size="h-2.5 w-2.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-ink-100">{id}</span>
          {isKkt && (
            <span className="shrink-0 border border-brand-500/40 bg-brand-900 px-1.5 py-px font-mono text-[9px] tracking-[0.12em] text-brand-300 uppercase">
              ККТ
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-ink-400">{desc}</div>
      </div>

      <span className="hidden w-[96px] shrink-0 text-right font-mono text-[10px] tracking-[0.06em] text-ink-500 sm:block">
        реестр Windows
      </span>

      <button
        onClick={() => onCopyRestart(id)}
        title={`Скопировать PowerShell-команду рестарта «${id}»`}
        className="grid h-8 w-8 shrink-0 place-items-center border border-ink-600 bg-ink-800 text-ink-300 transition-all hover:border-brand-500/60 hover:bg-brand-900 hover:text-brand-300 active:scale-90"
      >
        <IconCopy width={14} height={14} />
      </button>
    </div>
  );
}

export function ServiceBoard({
  state,
  onCopyRestart,
  onCopyCmd,
  onApplySerial,
}: {
  state: MonState;
  onCopyRestart: (id: string) => void;
  onCopyCmd: (cmd: string, what: string) => void;
  onApplySerial: (v: string) => void;
}) {
  const services = [...TARGET_SERVICES];
  if (state.kktSerial) {
    services.push({ id: `esm-cm-${state.kktSerial}`, desc: "Контроллер ККТ (по серийному №)" });
  }

  return (
    <section className="panel animate-rise flex h-full flex-col" style={{ animationDelay: "140ms" }}>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700/80 px-5 py-4">
        <IconServer className="text-brand-400" width={16} height={16} />
        <h2 className="panel-title">Службы реестра Windows</h2>
        <span className="border border-ink-700 bg-ink-900 px-2 py-0.5 font-mono text-[10px] tabular-nums text-ink-300">
          {services.length}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => onCopyCmd(psServiceList(services.map((s) => s.id)), "список служб")}
            className="flex items-center gap-2 border border-ink-600 bg-ink-800 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.14em] text-ink-200 uppercase transition-all hover:border-chz-500/60 hover:bg-chz-900 hover:text-chz-300 active:scale-[0.95]"
            title="Скопировать Get-Service по всем службам"
          >
            <IconCli width={13} height={13} />
            Get-Service
          </button>
          <button
            onClick={() => onCopyCmd(psRestartAll(services.map((s) => s.id)), "рестарт всех служб")}
            className="flex items-center gap-2 border border-ink-600 bg-ink-800 px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.14em] text-ink-200 uppercase transition-all hover:border-warn-500/60 hover:bg-warn-900 hover:text-warn-300 active:scale-[0.95]"
            title="Скопировать скрипт рестарта всего стека"
          >
            <IconRestartAll width={13} height={13} />
            Рестарт всех
          </button>
        </div>
      </div>

      <SerialBar serial={state.kktSerial} onApply={onApplySerial} />

      <div className="grid flex-1 grid-cols-1 gap-2 p-4 lg:grid-cols-2 lg:gap-x-4">
        {services.map((s, i) => (
          <ServiceRow
            key={s.id}
            id={s.id}
            desc={s.desc}
            index={i}
            isKkt={s.id.startsWith("esm-cm-")}
            onCopyRestart={onCopyRestart}
          />
        ))}
      </div>

      <div className="border-t border-ink-700/70 px-5 py-3 font-mono text-[10px] leading-relaxed tracking-wide text-ink-500">
        Браузер не имеет доступа к диспетчеру служб Windows (SCM). Кнопки копируют реальные
        PowerShell-команды — вставьте их в консоль от имени администратора. Полное управление службами
        «в один клик» — в автономном инструменте <span className="text-brand-400">{TOOL_FILE}</span>.
      </div>
    </section>
  );
}
