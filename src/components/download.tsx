import { useEffect, useState } from "react";
import { IconDownload, IconExternalLink, IconFileCode } from "./icons";

const FILE_NAME = "monitor-kkt34.html";
const FILE_PATH = "monitor-kkt34.html"; /* public/ — отдаётся с корня */

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center border border-brand-500/50 bg-brand-900 font-display text-sm font-bold text-brand-300">
        {n}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-100">{title}</div>
        <div className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-400">{text}</div>
      </div>
    </li>
  );
}

export function ToolPanel({ onToast }: { onToast: (tone: "ok" | "warn" | "err" | "info", msg: string) => void }) {
  const [meta, setMeta] = useState<{ kb: string; lines: number } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(FILE_PATH)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        if (alive && t) {
          setMeta({
            kb: (new Blob([t]).size / 1024).toFixed(1),
            lines: t.split("\n").length,
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(FILE_PATH);
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      const blob = new Blob([text], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = FILE_NAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      onToast("ok", `${FILE_NAME} скачан. Откройте файл двойным щелчком — он запустится в браузере.`);
    } catch {
      onToast("err", "Не удалось скачать файл. Попробуйте ссылку «Открыть в браузере» ниже.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      className="panel panel-tool animate-rise relative overflow-hidden border-brand-500/40"
      style={{ animationDelay: "100ms" }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600" />
      <div
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 opacity-60"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-7 p-5 md:flex-row md:items-center md:p-7">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2.5">
            <IconFileCode className="text-brand-400" width={17} height={17} />
            <span className="panel-title text-brand-300">Автономный инструмент · один файл</span>
          </div>
          <h2 className="font-display text-xl font-bold tracking-wide text-ink-50 sm:text-2xl">
            Монитор ЛМ <span className="text-brand-400">без установки</span>
          </h2>
          <p className="mt-2 max-w-2xl font-mono text-[11.5px] leading-relaxed text-ink-300">
            Весь монитор упакован в единый файл <span className="font-semibold text-brand-300">{FILE_NAME}</span> —
            как исходный .hta-скрипт, только современнее. Работает офлайн, не требует сервера, сборки
            и Node.js. Настройки (интервал, авто-восстановление) сохраняются локально в браузере.
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            <Step n={1} title="Скачайте" text="Кнопка справа сохранит файл на ваш компьютер." />
            <Step n={2} title="Откройте" text="Двойной щелчок по файлу — запустится в любом браузере." />
            <Step n={3} title="Пользуйтесь" text="Можно закрепить ярлык на рабочем столе кассира." />
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-3 md:w-[300px]">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="group flex items-center justify-center gap-3 border border-brand-400 bg-brand-500 px-5 py-4 font-display text-[13px] font-bold tracking-[0.1em] text-ink-950 uppercase transition-all hover:bg-brand-400 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            <IconDownload width={19} height={19} className="transition-transform group-hover:translate-y-0.5" />
            {downloading ? "Сохраняем…" : `Скачать ${FILE_NAME}`}
          </button>
          <a
            href={FILE_PATH}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2.5 border border-ink-600 bg-ink-800 px-5 py-3 font-display text-[11px] font-semibold tracking-[0.12em] text-ink-200 uppercase transition-all hover:border-brand-500/60 hover:text-brand-300 active:scale-[0.97]"
          >
            <IconExternalLink width={15} height={15} />
            Открыть в браузере
          </a>
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-wide text-ink-400">
            <span>{meta ? `${meta.kb} КБ · ${meta.lines} строк` : "один HTML-файл"}</span>
            <span className="text-ink-600">·</span>
            <span>HTML + CSS + JS внутри</span>
          </div>
        </div>
      </div>
    </section>
  );
}
