import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { NodeType } from "@/modules/laboratory3/agents/components/NodePalette";
import { labCategoryTitles, labNodeLibrary } from "./lab-node-library";

interface LabNodePaletteProps {
  onDragStart: (nodeType: NodeType) => void;
  onCreateFlow?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function LabNodePalette({
  onDragStart,
  onCreateFlow,
  searchQuery = "",
  onSearchChange,
}: LabNodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    triggers: true,
    llm: true,
    knowledge: false,
    tools: false,
    memory: false,
    guardrails: false,
    eval: false,
    actions: false,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filtered = labNodeLibrary.filter(
    (nt) =>
      nt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (labCategoryTitles[nt.category] ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(filtered.map((nt) => nt.category)));

  return (
    <div className="w-full h-full flex flex-col bg-card">
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Библиотека узлов</h3>
          <Button size="sm" className="bg-primary h-8" onClick={onCreateFlow}>
            <Plus className="h-4 w-4 mr-2" />
            Создать флоу
          </Button>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск узлов..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {categories.map((category) => {
            const categoryNodes = filtered.filter((nt) => nt.category === category);
            if (categoryNodes.length === 0) return null;

            return (
              <div key={category}>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-muted/50"
                >
                  {expandedCategories[category] ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {labCategoryTitles[category] ?? category}
                  </span>
                </button>

                {expandedCategories[category] && (
                  <div className="ml-5 space-y-1">
                    {categoryNodes.map((nodeType) => (
                      <div
                        key={`${category}-${nodeType.label}`}
                        draggable
                        onDragStart={(e) => {
                          onDragStart(nodeType);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="flex items-center gap-3 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                      >
                        <nodeType.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{nodeType.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {nodeType.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
