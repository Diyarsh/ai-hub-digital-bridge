import { Zap } from "lucide-react";
import { labNodeLibrary } from "./lab-node-library";
import type { WorkflowTemplate } from "@/modules/laboratory2/agents/components/TemplateGallery";

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    icon?: unknown;
    color?: string;
    config?: Record<string, unknown>;
    description?: string;
  };
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

function findNode(label: string) {
  return labNodeLibrary.find((n) => n.label === label);
}

function makeNode(
  id: string,
  label: string,
  x: number,
  y: number,
  overrides?: Partial<WorkflowNode["data"]>
): WorkflowNode {
  const type = findNode(label);
  return {
    id,
    type: type?.type ?? "tool",
    position: { x, y },
    data: {
      label: type?.label ?? label,
      icon: type?.icon,
      color: type?.color,
      description: type?.description,
      config: type?.config ?? {},
      ...overrides,
    },
  };
}

function chain(
  labels: string[],
  startX = 200,
  startY = 280,
  gapX = 220
): { nodes: WorkflowNode[]; connections: WorkflowConnection[] } {
  const nodes = labels.map((label, i) =>
    makeNode(`node-${i + 1}`, label, startX + i * gapX, startY)
  );
  const connections = nodes.slice(0, -1).map((node, i) => ({
    id: `conn-${i + 1}`,
    source: node.id,
    target: nodes[i + 1].id,
  }));
  return { nodes, connections };
}

const manualTrigger = (): WorkflowNode => ({
  id: "node-trigger",
  type: "trigger",
  position: { x: 400, y: 300 },
  data: {
    label: "When clicking 'Execute workflow'",
    icon: Zap,
    color: "bg-green-500",
    description: "Manual execution trigger",
    config: { triggerType: "manual" },
  },
});

export function buildWorkflowFromTemplate(template: WorkflowTemplate): {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  name: string;
} {
  const trigger = manualTrigger();

  switch (template.id) {
    case "faq-bot": {
      const rest = chain(["RAG Search", "Chat GPT", "REST API"], 620, 300);
      return {
        name: template.name,
        nodes: [trigger, ...rest.nodes],
        connections: [
          { id: "conn-0", source: trigger.id, target: rest.nodes[0].id },
          ...rest.connections.map((c, i) => ({ ...c, id: `conn-${i + 1}` })),
        ],
      };
    }
    case "email-processor": {
      const rest = chain(["Webhook", "Claude", "Email"], 620, 300);
      return {
        name: template.name,
        nodes: [trigger, ...rest.nodes],
        connections: [
          { id: "conn-0", source: trigger.id, target: rest.nodes[0].id },
          ...rest.connections.map((c, i) => ({ ...c, id: `conn-${i + 1}` })),
        ],
      };
    }
    case "data-assistant": {
      const rest = chain(["Few-shot", "SQL Query", "Metrics"], 620, 300);
      return {
        name: template.name,
        nodes: [trigger, ...rest.nodes],
        connections: [
          { id: "conn-0", source: trigger.id, target: rest.nodes[0].id },
          ...rest.connections.map((c, i) => ({ ...c, id: `conn-${i + 1}` })),
        ],
      };
    }
    case "content-assistant": {
      const rest = chain(["Gemini", "Content Filter", "REST API"], 620, 300);
      return {
        name: template.name,
        nodes: [trigger, ...rest.nodes],
        connections: [
          { id: "conn-0", source: trigger.id, target: rest.nodes[0].id },
          ...rest.connections.map((c, i) => ({ ...c, id: `conn-${i + 1}` })),
        ],
      };
    }
    case "incident-bot": {
      const rest = chain(["Webhook", "HTTP Request", "Slack Bot"], 620, 300);
      return {
        name: template.name,
        nodes: [trigger, ...rest.nodes],
        connections: [
          { id: "conn-0", source: trigger.id, target: rest.nodes[0].id },
          ...rest.connections.map((c, i) => ({ ...c, id: `conn-${i + 1}` })),
        ],
      };
    }
    default:
      return { name: template.name, nodes: [trigger], connections: [] };
  }
}
