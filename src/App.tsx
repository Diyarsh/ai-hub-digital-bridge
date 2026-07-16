import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AIStudio3 from "./pages/AIStudio3";
import AIStudio3Chat from "./pages/AIStudio3Chat";
import PresentationAgent from "./pages/PresentationAgent";
import TranslatorAgent from "./pages/TranslatorAgent";
import TranslatorAgentV2 from "./pages/TranslatorAgentV2";
import History from "./pages/History";
import HistoryChat from "./pages/HistoryChat";
import Projects from "./pages/Projects";
import ProjectChat from "./pages/ProjectChat";
import Lab from "./pages/Lab";
import Laboratory2 from "./pages/Laboratory2";
import Developer from "./pages/Developer";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <Toaster />
        <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/ai-studio-3" element={<AIStudio3 />} />
                    <Route path="/ai-studio-3-chat" element={<AIStudio3Chat />} />
                    <Route path="/agents/presentation" element={<PresentationAgent />} />
                    <Route path="/agents/translator" element={<TranslatorAgent />} />
                    <Route path="/agents/translator-2" element={<TranslatorAgentV2 />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/history-chat/:id" element={<HistoryChat />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/project-chat" element={<ProjectChat />} />
                    <Route path="/lab" element={<Lab />} />
                    <Route path="/laboratory2" element={<Laboratory2 />} />
                    <Route path="/developer" element={<Developer />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
