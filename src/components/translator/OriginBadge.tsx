import { BookMarked, Sparkles, Globe2, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TranslationOrigin } from "./types";

const STYLES: Record<
  NonNullable<TranslationOrigin>,
  { label: string; hint: string; bg: string; color: string; border: string }
> = {
  memory: {
    label: "Memory",
    hint: "Из утверждённой истории",
    bg: "#ECFDF5",
    color: "#047857",
    border: "#A7F3D0",
  },
  llm: {
    label: "LLM",
    hint: "Сгенерировала модель",
    bg: "#EFF6FF",
    color: "#1D4ED8",
    border: "#BFDBFE",
  },
  online: {
    label: "Online",
    hint: "Онлайн-переводчик",
    bg: "#FFF7ED",
    color: "#C2410C",
    border: "#FED7AA",
  },
  local: {
    label: "Local",
    hint: "Локальный словарь",
    bg: "#F8FAFC",
    color: "#475569",
    border: "#E2E8F0",
  },
};

function OriginIcon({ origin, className }: { origin: TranslationOrigin; className?: string }) {
  if (origin === "memory") return <BookMarked className={className} />;
  if (origin === "llm") return <Sparkles className={className} />;
  if (origin === "online") return <Globe2 className={className} />;
  return <HardDrive className={className} />;
}

export function OriginBadge({
  origin,
  className,
  showHint,
}: {
  origin?: TranslationOrigin | null;
  className?: string;
  showHint?: boolean;
}) {
  if (!origin) return null;
  const style = STYLES[origin];
  return (
    <Badge
      title={style.hint}
      className={cn("border text-[10px] h-5 font-medium gap-1 px-1.5", className)}
      style={{ background: style.bg, color: style.color, borderColor: style.border }}
    >
      <OriginIcon origin={origin} className="h-3 w-3" />
      {style.label}
      {showHint && <span className="opacity-70 font-normal hidden sm:inline">· {style.hint}</span>}
    </Badge>
  );
}

export function OriginMetricChips({
  memory,
  llm,
  memoryPct,
  llmPct,
}: {
  memory: number;
  llm: number;
  memoryPct: number;
  llmPct: number;
}) {
  return (
    <>
      <div
        className="rounded-lg border px-3 py-2 min-w-[104px] bg-white"
        style={{ borderColor: "#A7F3D0", background: "#ECFDF5" }}
        title="Взято из утверждённой истории переводов"
      >
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "#047857" }}>
          Memory
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold" style={{ color: "#047857" }}>
            {memory}
          </span>
          <span className="text-xs font-medium" style={{ color: "#059669" }}>
            {memoryPct}%
          </span>
        </div>
      </div>
      <div
        className="rounded-lg border px-3 py-2 min-w-[104px] bg-white"
        style={{ borderColor: "#BFDBFE", background: "#EFF6FF" }}
        title="Сгенерировала языковая модель"
      >
        <div className="text-[10px] uppercase tracking-wide" style={{ color: "#1D4ED8" }}>
          LLM
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold" style={{ color: "#1D4ED8" }}>
            {llm}
          </span>
          <span className="text-xs font-medium" style={{ color: "#2563EB" }}>
            {llmPct}%
          </span>
        </div>
      </div>
    </>
  );
}
