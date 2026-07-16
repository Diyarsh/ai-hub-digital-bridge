import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NodeType {
  type: string;
  category: string;
  label: string;
  icon: any;
  color: string;
  description: string;
  config?: Record<string, any>;
}

interface NodePaletteProps {
  nodeTypes: NodeType[];
  onDragStart: (nodeType: NodeType) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function NodePalette({
  nodeTypes,
  onDragStart,
  searchQuery = "",
  onSearchChange,
}: NodePaletteProps) {
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

  const filteredNodeTypes = nodeTypes.filter(
    (nt) =>
      nt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nt.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(
    new Set(filteredNodeTypes.map((nt) => nt.category))
  );

  const categoryLabels: Record<string, string> = {
    triggers: "Triggers",
    llm: "LLM/Chat",
    knowledge: "Knowledge",
    tools: "Tools",
    memory: "Memory",
    guardrails: "Guardrails",
    eval: "Eval/Observability",
    actions: "Actions/Deploy",
  };

  return (
    <div className="w-full h-full border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm mb-2">Node Palette</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {categories.map((category) => {
            const categoryNodes = filteredNodeTypes.filter(
              (nt) => nt.category === category
            );
            if (categoryNodes.length === 0) return null;

            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground uppercase hover:text-foreground transition-colors"
                >
                  {expandedCategories[category] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {categoryLabels[category] || category}
                </button>
                {expandedCategories[category] && (
                  <div className="space-y-1 mt-1">
                    {categoryNodes.map((nodeType) => (
                      <div
                        key={`${category}-${nodeType.label}`}
                        draggable
                        onDragStart={(e) => {
                          onDragStart(nodeType);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted cursor-move transition-colors group"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded flex items-center justify-center text-white shrink-0 mt-0.5",
                            nodeType.color
                          )}
                        >
                          <nodeType.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm block break-words">
                            {nodeType.label}
                          </span>
                          {nodeType.description && (
                            <span className="text-xs text-muted-foreground break-words block leading-relaxed">
                              {nodeType.description}
                            </span>
                          )}
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

