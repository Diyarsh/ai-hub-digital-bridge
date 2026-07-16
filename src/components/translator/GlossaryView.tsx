import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GlossaryEntry, GlossaryKind } from "./types";

const BRONZE = {
  deep: "#A17436",
  mid: "#B8924F",
  bg: "#F7F1E8",
};

function newId() {
  return crypto.randomUUID();
}

export function GlossaryView({
  entries,
  onChange,
}: {
  entries: GlossaryEntry[];
  onChange: (next: GlossaryEntry[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | GlossaryKind>("all");
  const [source, setSource] = useState("");
  const [translation, setTranslation] = useState("");
  const [kind, setKind] = useState<GlossaryKind>("term");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = entries.filter((e) => {
    if (kindFilter !== "all" && e.kind !== kindFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return e.source.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q);
  });

  const terms = entries.filter((e) => e.kind === "term").length;
  const abbrs = entries.filter((e) => e.kind === "abbr").length;

  const addEntry = () => {
    if (!source.trim() || !translation.trim()) return;
    onChange([
      { id: newId(), source: source.trim(), translation: translation.trim(), kind },
      ...entries,
    ]);
    setSource("");
    setTranslation("");
  };

  const removeSelected = () => {
    onChange(entries.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "#1E293B" }}>
            Глоссарий
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => setKindFilter("all")}
              className="text-xs rounded-full px-2.5 py-1 border"
              style={{
                background: kindFilter === "all" ? BRONZE.bg : "white",
                borderColor: kindFilter === "all" ? BRONZE.mid : "#EDE6DC",
                color: BRONZE.deep,
              }}
            >
              {entries.length} всего
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("term")}
              className="text-xs rounded-full px-2.5 py-1 border"
              style={{
                background: kindFilter === "term" ? BRONZE.bg : "white",
                borderColor: kindFilter === "term" ? BRONZE.mid : "#EDE6DC",
                color: BRONZE.deep,
              }}
            >
              {terms} терминов
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("abbr")}
              className="text-xs rounded-full px-2.5 py-1 border"
              style={{
                background: kindFilter === "abbr" ? BRONZE.bg : "white",
                borderColor: kindFilter === "abbr" ? BRONZE.mid : "#EDE6DC",
                color: BRONZE.deep,
              }}
            >
              {abbrs} аббр.
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(kindFilter === "term" && "border-transparent text-white")}
            style={kindFilter === "term" ? { background: BRONZE.deep } : undefined}
            onClick={() => setKindFilter("term")}
          >
            Термины
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(kindFilter === "abbr" && "border-transparent text-white")}
            style={kindFilter === "abbr" ? { background: BRONZE.deep } : undefined}
            onClick={() => setKindFilter("abbr")}
          >
            Аббревиатуры
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/40"
            disabled={selected.size === 0}
            onClick={removeSelected}
          >
            Удалить
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm space-y-3" style={{ borderColor: "#EDE6DC" }}>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по источнику или переводу…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-2">
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Источник" />
          <Input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="Перевод"
          />
          <Select value={kind} onValueChange={(v) => setKind(v as GlossaryKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="term">Термин</SelectItem>
              <SelectItem value="abbr">Аббревиатура</SelectItem>
            </SelectContent>
          </Select>
          <Button className="text-white" style={{ background: BRONZE.deep }} onClick={addEntry}>
            Добавить
          </Button>
        </div>
      </div>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#EDE6DC" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#EDE6DC" }}>
          <h3 className="text-sm font-semibold">Записи</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-[11px] uppercase tracking-wide text-slate-400 border-b"
              style={{ borderColor: "#EDE6DC" }}
            >
              <th className="w-10 px-4 py-3" />
              <th className="text-left font-medium px-4 py-3">Источник</th>
              <th className="text-left font-medium px-4 py-3">Перевод</th>
              <th className="text-left font-medium px-4 py-3">Тип</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.id}
                className="border-b last:border-0 hover:bg-slate-50/70"
                style={{ borderColor: "#F1F5F9" }}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(entry.id);
                      else next.delete(entry.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-slate-800">{entry.source}</td>
                <td className="px-4 py-3 text-slate-700">{entry.translation}</td>
                <td className="px-4 py-3">
                  <Badge
                    className="border-0 text-[11px]"
                    style={{ background: BRONZE.bg, color: BRONZE.deep }}
                  >
                    {entry.kind === "term" ? "Термин" : "Аббр."}
                  </Badge>
                </td>
                <td className="px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400"
                    onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">Ничего не найдено</div>
        )}
      </section>
    </div>
  );
}
