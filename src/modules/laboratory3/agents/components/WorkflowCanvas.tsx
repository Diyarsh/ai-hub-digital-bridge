import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    icon?: any;
    color?: string;
    config?: Record<string, any>;
    description?: string;
    breakpoint?: boolean;
  };
}

interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowCanvasProps {
  nodes: Node[];
  connections: Connection[];
  zoom: number;
  pan: { x: number; y: number };
  selectedNode: string | null;
  isDragging: boolean;
  connecting: { source: string | null; target: string | null; mousePos?: { x: number; y: number } };
  onNodeClick: (nodeId: string) => void;
  onNodeDrag: (nodeId: string, position: { x: number; y: number }) => void;
  onStartConnection: (nodeId: string, handle: string) => void;
  onEndConnection: (nodeId: string, handle: string) => void;
  onCanvasPan: (pan: { x: number; y: number }) => void;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseUp: (e: React.MouseEvent) => void;
  debugMode?: boolean;
  executingNode?: string | null;
  isEmpty?: boolean;
  onAddNodeClick?: (nodeId: string) => void;
  hideEmptyState?: boolean;
}

export function WorkflowCanvas({
  nodes,
  connections,
  zoom,
  pan,
  selectedNode,
  isDragging,
  connecting,
  onNodeClick,
  onNodeDrag,
  onStartConnection,
  onEndConnection,
  onCanvasPan,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  debugMode = false,
  executingNode = null,
  isEmpty = false,
  onAddNodeClick,
  hideEmptyState = false,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    nodeId: string | null;
    startPos: { x: number; y: number };
    offset: { x: number; y: number };
  } | null>(null);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      const nodeX = node.position.x * zoom + pan.x;
      const nodeY = node.position.y * zoom + pan.y;

      setDragState({
        nodeId,
        startPos: { x: startX, y: startY },
        offset: { x: startX - nodeX, y: startY - nodeY },
      });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragState && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const currentX = moveEvent.clientX - rect.left;
          const currentY = moveEvent.clientY - rect.top;

          const nodeX = (currentX - pan.x) / zoom;
          const nodeY = (currentY - pan.y) / zoom;

          onNodeDrag(nodeId, { x: nodeX, y: nodeY });
        }
      };

      const handleMouseUp = () => {
        setDragState(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [nodes, zoom, pan, onNodeDrag, dragState]
  );

  const getConnectionPath = (conn: Connection) => {
    const sourceNode = nodes.find((n) => n.id === conn.source);
    const targetNode = nodes.find((n) => n.id === conn.target);
    if (!sourceNode || !targetNode) return null;

    const sx = sourceNode.position.x + 200;
    const sy = sourceNode.position.y + 40;
    const tx = targetNode.position.x;
    const ty = targetNode.position.y + 40;

    return `M ${sx} ${sy} C ${sx + 50} ${sy} ${tx - 50} ${ty} ${tx} ${ty}`;
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden bg-muted/20"
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* Grid Background */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <defs>
          <pattern
            id="grid-workflow-3"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-border opacity-30"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-workflow-3)" />
      </svg>

      {/* Connections */}
      {!isEmpty && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {connections.map((conn) => {
            const path = getConnectionPath(conn);
            if (!path) return null;

            const isActive = debugMode && executingNode === conn.target;

            return (
              <path
                key={conn.id}
                d={path}
                fill="none"
                stroke={isActive ? "hsl(var(--primary))" : "hsl(var(--primary))"}
                strokeWidth={isActive ? "3" : "2"}
                markerEnd="url(#arrowhead-workflow-3)"
                className={cn(
                  "transition-all",
                  isActive && "drop-shadow-lg animate-pulse"
                )}
              />
            );
          })}
          {connecting.source && connecting.mousePos && (
            <path
              d={`M ${
                nodes.find((n) => n.id === connecting.source)?.position.x! + 200
              } ${
                nodes.find((n) => n.id === connecting.source)?.position.y! + 40
              } L ${(connecting.mousePos.x - pan.x) / zoom} ${(connecting.mousePos.y - pan.y) / zoom}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.7"
              className="pointer-events-none"
            />
          )}
          <defs>
            <marker
              id="arrowhead-workflow-3"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
            </marker>
          </defs>
        </svg>
      )}

      {/* Nodes */}
      {!isEmpty && nodes.map((node) => {
        const isSelected = selectedNode === node.id;
        const isExecuting = executingNode === node.id;
        const hasBreakpoint = node.data.breakpoint && debugMode;

        return (
          <div
            key={node.id}
            className={cn(
              "absolute w-[200px] bg-card border-2 rounded-lg shadow-lg cursor-move transition-all hover:shadow-xl",
              isSelected && "border-primary ring-2 ring-primary/20",
              !isSelected && "border-border",
              isExecuting && "ring-4 ring-primary/50 animate-pulse",
              hasBreakpoint && "border-yellow-500"
            )}
            style={{
              left: node.position.x * zoom + pan.x,
              top: node.position.y * zoom + pan.y,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(node.id);
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            <div className="p-3">
              {hasBreakpoint && (
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-500 rounded-full border-2 border-card" />
              )}

              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center text-white",
                    node.data.color || "bg-gray-500"
                  )}
                >
                  {node.data.icon && <node.data.icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {node.data.label}
                  </h4>
                  {node.data.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {node.data.description}
                    </p>
                  )}
                </div>
                {isExecuting && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full bg-green-500 cursor-crosshair hover:bg-green-600 hover:scale-125 transition-all",
                    connecting.source === node.id && "ring-2 ring-green-400 ring-offset-2 scale-125"
                  )}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onStartConnection(node.id, "output");
                  }}
                  title="Drag from Output to connect"
                />
                <div className="flex-1 text-xs text-muted-foreground">
                  Output
                </div>
                {/* Add Node Button (+ icon) */}
                {onAddNodeClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onAddNodeClick(node.id);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-border bg-background hover:bg-muted hover:border-primary transition-colors flex items-center justify-center group"
                    title="Add next step"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                )}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full bg-blue-500 cursor-crosshair hover:bg-blue-600 hover:scale-125 transition-all",
                    connecting.source && connecting.source !== node.id && "ring-2 ring-blue-400 ring-offset-2 scale-125"
                  )}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (connecting.source && connecting.source !== node.id) {
                      onEndConnection(node.id, "input");
                    }
                  }}
                  title="Drop here to connect"
                />
                <div className="text-xs text-muted-foreground">Input</div>
              </div>

              {debugMode && isSelected && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Node ID: {node.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Type: {node.type}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty State - n8n style */}
      {isEmpty && !hideEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="lg"
              className="h-32 w-48 border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-muted/50 transition-colors"
              onClick={() => {
                // Trigger node palette or workflow starter
              }}
            >
              <Plus className="h-8 w-8" />
              <span className="text-base font-medium">Add first step...</span>
            </Button>

            <span className="text-muted-foreground">or</span>

            <Button
              variant="outline"
              size="lg"
              className="h-32 w-48 border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-muted/50 transition-colors"
              onClick={() => {
                // Build with AI
              }}
            >
              <Sparkles className="h-8 w-8" />
              <span className="text-base font-medium">Build with AI</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
