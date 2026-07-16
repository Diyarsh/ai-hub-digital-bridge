import { useCallback, useState } from "react";
import {
  Zap,
  Play,
  Palette,
  Save,
  Rocket,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Activity,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { WorkflowCanvas } from "@/modules/laboratory3/agents/components/WorkflowCanvas";
import { LabNodePalette } from "./LabNodePalette";
import type { NodeType } from "@/modules/laboratory3/agents/components/NodePalette";
import { ContextualRightPanel } from "@/modules/laboratory3/agents/components/ContextualRightPanel";
import { TemplateGallery, WorkflowTemplate } from "@/modules/laboratory2/agents/components/TemplateGallery";
import { nodeTypesLibrary } from "@/modules/laboratory2/agents/nodes/nodeTypes";
import { WorkflowService } from "@/modules/laboratory2/agents/services/workflow.service";
import { DeploymentService } from "@/modules/laboratory2/agents/services/deployment.service";
import type { ExecutionLog } from "@/modules/laboratory2/agents/components/ExecutionPanel";
import { buildWorkflowFromTemplate } from "./workflow-templates";
import type { Dataset } from "@/modules/laboratory2/data/components/DatasetManager";

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    icon?: unknown;
    color?: string;
    config?: Record<string, unknown>;
    description?: string;
    breakpoint?: boolean;
  };
}

interface Connection {
  id: string;
  source: string;
  target: string;
}

interface LabAgentsStudioProps {
  selectedDataset?: Dataset | null;
}

function sortNodesForExecution(nodes: Node[], connections: Connection[]): Node[] {
  const incoming = new Map<string, number>();
  nodes.forEach((n) => incoming.set(n.id, 0));
  connections.forEach((c) => incoming.set(c.target, (incoming.get(c.target) ?? 0) + 1));

  const roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const visited = new Set<string>();
  const result: Node[] = [];

  const walk = (node: Node) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    result.push(node);
    connections
      .filter((c) => c.source === node.id)
      .forEach((c) => {
        const next = nodes.find((n) => n.id === c.target);
        if (next) walk(next);
      });
  };

  roots.forEach(walk);
  nodes.filter((n) => !visited.has(n.id)).forEach(walk);
  return result;
}

export function LabAgentsStudio({ selectedDataset }: LabAgentsStudioProps) {
  const { toast } = useToast();
  const [workflowId] = useState(() => `workflow-${Date.now()}`);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<NodeType | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [connecting, setConnecting] = useState<{
    source: string | null;
    target: string | null;
    mousePos?: { x: number; y: number };
  }>({ source: null, target: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowName, setWorkflowName] = useState("Новый агент");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [executingNode, setExecutingNode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNextSteps, setShowNextSteps] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const isEmpty = nodes.length === 0;
  const selectedNodeData = nodes.find((n) => n.id === selectedNode);
  const hasRightPanelContent =
    Boolean(error) ||
    isExecuting ||
    executionLogs.length > 0 ||
    Boolean(showNextSteps) ||
    Boolean(selectedNode) ||
    !isEmpty;
  const showRightPanel = rightPanelOpen && !focusMode && hasRightPanelContent;

  const handleDragStart = (nodeType: NodeType) => {
    setDraggedNode(nodeType);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggedNode) setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connecting.source) {
      const rect = e.currentTarget.getBoundingClientRect();
      setConnecting((prev) => ({
        ...prev,
        mousePos: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      }));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (connecting.source && !connecting.target) {
      setConnecting({ source: null, target: null });
    }

    if (draggedNode) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      if (x > 0 && y > 0) {
        const newNode: Node = {
          id: `node-${Date.now()}`,
          type: draggedNode.type,
          position: { x, y },
          data: {
            label: draggedNode.label,
            icon: draggedNode.icon,
            color: draggedNode.color,
            description: draggedNode.description,
            config: draggedNode.config ?? {},
          },
        };
        setNodes((prev) => [...prev, newNode]);
      }
    }
    setDraggedNode(null);
    setIsDragging(false);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setError(null);
    setShowNextSteps(null);
    setRightPanelOpen(true);
  };

  const handleNodeDrag = (nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position } : n)));
  };

  const handleStartConnection = (nodeId: string, handle: string) => {
    if (handle === "output") setConnecting({ source: nodeId, target: null });
  };

  const handleEndConnection = (nodeId: string, handle: string) => {
    if (handle === "input" && connecting.source && connecting.source !== nodeId) {
      const exists = connections.some(
        (c) => c.source === connecting.source && c.target === nodeId
      );
      if (!exists) {
        setConnections((prev) => [
          ...prev,
          { id: `conn-${Date.now()}`, source: connecting.source!, target: nodeId },
        ]);
      }
    }
    setConnecting({ source: null, target: null });
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<Node>) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode));
    setConnections((prev) =>
      prev.filter((c) => c.source !== selectedNode && c.target !== selectedNode)
    );
    setSelectedNode(null);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  };

  const handleAddNodeFromRecommendation = (nodeType: (typeof nodeTypesLibrary)[number]) => {
    const sourceNodeId = showNextSteps || selectedNode;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    const centerX = sourceNode ? sourceNode.position.x + 280 : 500;
    const centerY = sourceNode ? sourceNode.position.y : 320;
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeType.type,
      position: { x: centerX, y: centerY },
      data: {
        label: nodeType.label,
        icon: nodeType.icon,
        color: nodeType.color,
        description: nodeType.description,
        config: nodeType.config ?? {},
      },
    };
    setNodes((prev) => [...prev, newNode]);

    if (sourceNodeId && nodeType.type !== "trigger") {
      setConnections((prev) => [
        ...prev,
        { id: `conn-${Date.now()}`, source: sourceNodeId, target: newNode.id },
      ]);
    }

    setShowNextSteps(null);
    setSelectedNode(null);
  };

  const handleAddNodeClick = (nodeId: string) => {
    setShowNextSteps(nodeId);
    setSelectedNode(null);
    setRightPanelOpen(true);
  };

  const handleTriggerSelect = (trigger: { id: string }) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: "trigger",
      position: { x: 500, y: 320 },
      data: {
        label: "When clicking 'Execute workflow'",
        icon: Zap,
        color: "bg-green-500",
        description: "Manual execution trigger",
        config: { triggerType: trigger.id },
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode.id);
    setRightPanelOpen(true);
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    const built = buildWorkflowFromTemplate(template);
    setNodes(built.nodes);
    setConnections(built.connections);
    setWorkflowName(built.name);
    setSelectedNode(null);
    setShowNextSteps(null);
    toast({ title: "Шаблон загружен", description: template.description });
  };

  const handleSave = useCallback(() => {
    if (nodes.length === 0) {
      toast({ title: "Нечего сохранять", description: "Добавьте хотя бы один узел", variant: "destructive" });
      return;
    }
    WorkflowService.save({
      id: workflowId,
      name: workflowName,
      nodes,
      connections,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: selectedDataset ? [`dataset:${selectedDataset.name}`] : [],
    });
    setLastSavedAt(new Date());
    toast({ title: "Workflow сохранён", description: workflowName });
  }, [connections, nodes, selectedDataset, toast, workflowId, workflowName]);

  const handleExecute = useCallback(async () => {
    if (nodes.length === 0) {
      setError("Добавьте узлы перед запуском workflow");
      setRightPanelOpen(true);
      return;
    }
    setError(null);
    setIsExecuting(true);
    setExecutionLogs([]);
    setSelectedNode(null);
    setShowNextSteps(null);
    setRightPanelOpen(true);

    const ordered = sortNodesForExecution(nodes, connections);
    const logs: ExecutionLog[] = [
      {
        id: "log-start",
        timestamp: new Date(),
        level: "info",
        message: selectedDataset
          ? `Запуск с датасетом «${selectedDataset.name}»`
          : "Запуск workflow",
      },
    ];
    setExecutionLogs(logs);

    for (const node of ordered) {
      setExecutingNode(node.id);
      await new Promise((r) => setTimeout(r, 500));
      logs.push({
        id: `log-${node.id}`,
        timestamp: new Date(),
        level: "success",
        message: `Узел «${node.data.label}» выполнен`,
        nodeId: node.id,
        nodeName: node.data.label,
      });
      setExecutionLogs([...logs]);
    }

    logs.push({
      id: "log-done",
      timestamp: new Date(),
      level: "success",
      message: "Workflow завершён. Готов к развёртыванию.",
    });
    setExecutionLogs([...logs]);
    setIsExecuting(false);
    setExecutingNode(null);
  }, [connections, nodes, selectedDataset]);

  const handleDeploy = () => {
    if (executionLogs.length === 0) {
      toast({
        title: "Сначала запустите workflow",
        description: "Развёртывание доступно после тестового запуска",
        variant: "destructive",
      });
      return;
    }
    handleSave();
    DeploymentService.deploy(workflowId, "rest", { name: workflowName });
    setIsDeployed(true);
    toast({ title: "Агент развёрнут", description: `REST API: /api/workflows/${workflowId}` });
  };

  const toggleFocusMode = () => {
    setFocusMode((prev) => {
      if (!prev) {
        setLeftPanelOpen(false);
        setRightPanelOpen(false);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
      }
      return !prev;
    });
  };

  return (
    <div className="flex flex-col gap-3 -mx-2">
      {/* Compact stats row */}
      <div className="flex items-center gap-3 flex-wrap px-2">
        <div className="flex items-center gap-6 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">2</span> агентов
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">667ms</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">77K</span> токенов
          </span>
        </div>
        {selectedDataset && (
          <Badge variant="secondary" className="text-xs">
            Датасет: {selectedDataset.name}
          </Badge>
        )}
        {isDeployed && <Badge variant="outline" className="text-xs">Развёрнут</Badge>}
        {lastSavedAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            Сохранено {lastSavedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Studio shell — canvas-first layout */}
      <div className="relative flex border rounded-xl overflow-hidden bg-card min-h-[calc(100vh-14rem)]">
        {/* Left palette — overlay, не съедает ширину canvas */}
        {!focusMode && leftPanelOpen && (
          <div className="absolute left-0 top-0 bottom-0 z-20 w-80 border-r bg-card/95 backdrop-blur-sm shadow-sm flex flex-col">
            <LabNodePalette
              onDragStart={handleDragStart}
              onCreateFlow={() => setShowTemplates(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        {/* Canvas — занимает всю ширину */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 shrink-0">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="h-8 max-w-[200px] text-sm font-medium border-transparent bg-transparent hover:bg-muted/50 focus-visible:bg-background"
            />

            <div className="h-4 w-px bg-border mx-1" />

            <Badge variant="secondary" className="text-xs font-normal">
              {nodes.length === 0
                ? "Пустой workflow"
                : `${nodes.length} узл. · ${connections.length} связ.`}
            </Badge>

            <div className="flex-1" />

            {/* Panel toggles */}
            <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={leftPanelOpen ? "Скрыть палитру" : "Показать палитру"}
                onClick={() => setLeftPanelOpen((v) => !v)}
                disabled={focusMode}
              >
                {leftPanelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={rightPanelOpen ? "Скрыть панель" : "Показать панель"}
                onClick={() => setRightPanelOpen((v) => !v)}
                disabled={focusMode}
              >
                {rightPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant={focusMode ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title={focusMode ? "Выйти из фокуса" : "Режим фокуса — canvas на всю ширину"}
                onClick={toggleFocusMode}
              >
                {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
                title="Увеличить"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(z - 0.1, 0.4))}
                title="Уменьшить"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowTemplates(true)}>
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Шаблоны
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Сохранить
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDeploy}>
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              Развернуть
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleExecute} disabled={isExecuting}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {isExecuting ? "..." : "Запустить"}
            </Button>
          </div>

          {/* Canvas area */}
          <div
            className={cn(
              "flex-1 relative min-h-0",
              !focusMode && leftPanelOpen && !isEmpty && "pl-0"
            )}
          >
            <WorkflowCanvas
              nodes={nodes}
              connections={connections}
              zoom={zoom}
              pan={pan}
              selectedNode={selectedNode}
              isDragging={isDragging}
              connecting={connecting}
              onNodeClick={handleNodeClick}
              onNodeDrag={handleNodeDrag}
              onStartConnection={handleStartConnection}
              onEndConnection={handleEndConnection}
              onCanvasPan={setPan}
              onCanvasMouseDown={handleCanvasMouseDown}
              onCanvasMouseMove={handleCanvasMouseMove}
              onCanvasMouseUp={handleCanvasMouseUp}
              executingNode={executingNode}
              isEmpty={isEmpty}
              hideEmptyState
              onAddNodeClick={handleAddNodeClick}
            />

            {/* Floating toggle when palette hidden */}
            {!focusMode && !leftPanelOpen && (
              <Button
                variant="outline"
                size="icon"
                className="absolute left-3 top-3 z-10 h-8 w-8 bg-background/90 backdrop-blur-sm shadow-sm"
                onClick={() => setLeftPanelOpen(true)}
                title="Показать палитру узлов"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Right panel — overlay drawer */}
        {showRightPanel && (
          <div className="absolute right-0 top-0 bottom-0 z-20 shadow-lg border-l bg-card">
            <ContextualRightPanel
              isEmpty={isEmpty}
              selectedNode={selectedNodeData}
              nodes={nodes}
              connections={connections}
              isExecuting={isExecuting}
              executionLogs={executionLogs}
              error={error}
              showNextSteps={showNextSteps}
              onClose={() => {
                setSelectedNode(null);
                setShowNextSteps(null);
                setError(null);
              }}
              onUpdate={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onDeleteConnection={handleDeleteConnection}
              onAddNode={handleAddNodeFromRecommendation}
              onTriggerSelect={handleTriggerSelect}
              onClearLogs={() => {
                setExecutionLogs([]);
                setIsExecuting(false);
              }}
              onStopExecution={() => {
                setIsExecuting(false);
                setExecutingNode(null);
              }}
            />
          </div>
        )}

        {/* Floating toggle when right panel hidden */}
        {!focusMode && !rightPanelOpen && hasRightPanelContent && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-3 top-14 z-10 h-8 w-8 bg-background/90 backdrop-blur-sm shadow-sm"
            onClick={() => setRightPanelOpen(true)}
            title="Показать панель свойств"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showTemplates && (
        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
