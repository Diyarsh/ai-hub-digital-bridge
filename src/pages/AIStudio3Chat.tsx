import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronLeft, ChevronRight, X, File, FileDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatComposer } from "@/components/ChatComposer";
import { Modal } from "@/shared/components/Modal";
import { FileUpload } from "@/shared/components/Forms/FileUpload";
import { Badge } from "@/shared/components/Badge";
import { sendChatMessage } from "@/shared/services/ai.service.ts";
import { useToast } from "@/shared/components/Toast";
import { AgentHistorySidebar } from "@/components/AgentHistorySidebar";
import { AgentChatService } from "@/services/agent-chat.service";
import { AgentChatMessage } from "@/types/agent-chat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Disclaimer } from "@/components/chat/Disclaimer";
import { FileDropOverlay } from "@/components/chat/FileDropOverlay";
import { PresentationAgentPanel } from "@/components/presentation/PresentationAgentPanel";
import { TranslatorPlatform } from "@/components/translator/TranslatorPlatform";
import { TranslatorDocumentPlatform } from "@/components/translator/TranslatorDocumentPlatform";

export interface AIStudio3ChatProps {
  /** Прямой вход по `/agents/presentation` без state из каталога */
  presentationMode?: boolean;
}

type ChatNavState = {
  agent?: string;
  agentId?: string;
  placeholder?: string;
  initialMessage?: string;
  sessionId?: string;
  instructions?: string;
};

export default function AIStudio3Chat({
  presentationMode = false,
}: AIStudio3ChatProps = {}) {
  const {
    t
  } = useLanguage();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state || {}) as ChatNavState;
  const storedAgent =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("aihub-last-agent")
      : null;
  const agent = presentationMode
    ? "Создатель презентаций"
    : navState.agent || storedAgent || undefined;

  useEffect(() => {
    if (navState.agent) {
      sessionStorage.setItem("aihub-last-agent", navState.agent);
    }
    if (navState.agentId) {
      sessionStorage.setItem("aihub-last-agent-id", navState.agentId);
    }
  }, [navState.agent, navState.agentId]);

  const placeholder =
    navState.placeholder ??
    (presentationMode || agent === "Создатель презентаций"
      ? "Обсуди структуру презентации или задай вопрос по брендингу…"
      : undefined);
  const initialMessage = navState.initialMessage;
  const storedAgentId =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("aihub-last-agent-id")
      : null;
  const isPresentationAgent =
    presentationMode ||
    navState.agentId === "Presentation-Agent" ||
    agent === "Создатель презентаций";
  const isTranslatorAgent =
    navState.agentId === "Translator" ||
    navState.agentId === "Translator-2" ||
    agent === "Переводчик" ||
    agent === "Переводчик 2.0" ||
    agent === "Translation Master" ||
    agent === "Translator" ||
    (!navState.agent && storedAgentId === "Translator") ||
    (!navState.agent && storedAgentId === "Translator-2");

  // Переводчик — документный дашборд, не чат
  useEffect(() => {
    if (presentationMode) return;
    if (!isTranslatorAgent) return;
    const target =
      navState.agentId === "Translator-2" || agent === "Переводчик 2.0"
        ? "/agents/translator-2"
        : "/agents/translator";
    navigate(target, { replace: true });
  }, [isTranslatorAgent, navigate, presentationMode, navState.agentId, agent]);
  const [message, setMessage] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string; files?: File[]; isLoading?: boolean; durationMs?: number; feedback?: 'correct' | 'partially-correct' | 'incorrect'; feedbackReasons?: string[]; feedbackDetails?: string; isRegenerated?: boolean }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const examplePrompts = isPresentationAgent
    ? [
        "Как улучшить структуру этой презентации для инвесторов?",
        "Что убрать или сократить для аудитории C-level?",
        "Подскажи формулировки в tone of voice выбранного бренда",
        "Как усилить блок про безопасность и compliance?",
      ]
    : ["Сформируй краткую сводку по рынку за Q3 2025", "Подготовь анализ конкурентов в сфере e-commerce", "Предложи 3 риск-фактора для проекта AI", "Составь план внедрения чата-бота в службу поддержки"];
  
  const loadSession = useCallback((sessionId: string) => {
    const savedMessages = AgentChatService.getMessages(sessionId);
    if (savedMessages.length > 0) {
      const convertedMessages = savedMessages.map(m => ({
        id: m.id,
        role: m.role,
        text: m.text,
        files: [], // Cannot restore File objects from localStorage
        isLoading: false,
        durationMs: m.durationMs,
        feedback: m.feedback,
      }));
      setMessages(convertedMessages);
      setCurrentSessionId(sessionId);
    }
  }, []);

  // Load sessions and messages on mount or when agent changes
  useEffect(() => {
    if (!agent) return;

    // Load sessions for this agent
    const sessions = AgentChatService.getSessions(agent);
    if (sessions.length === 0) {
      // Generate mock data if empty
      AgentChatService.generateMockSessions(agent);
    }

    // If there's a session in URL state, load it
    const sessionIdFromState = navState.sessionId;
    if (sessionIdFromState) {
      loadSession(sessionIdFromState);
    }
  }, [agent, navState.sessionId, loadSession]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Сессия для создателя презентаций — чтобы история сохранялась до первого сообщения в ленте */
  useEffect(() => {
    if (!isPresentationAgent || !agent) return;
    if (currentSessionId) return;
    const session = AgentChatService.createSession(agent, "Презентация");
    setCurrentSessionId(session.id);
  }, [isPresentationAgent, agent, currentSessionId]);

  // Save messages to localStorage when they change (debounced)
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;

    const timeoutId = setTimeout(() => {
      const messagesToSave: AgentChatMessage[] = messages
        .filter(m => !m.isLoading)
        .map(m => ({
          id: m.id,
          role: m.role,
          text: m.text,
          files: m.files?.map(f => ({ name: f.name, size: f.size })),
          createdAt: new Date().toISOString(),
          durationMs: m.durationMs,
          feedback: m.feedback,
        }));

      AgentChatService.saveMessages(currentSessionId, messagesToSave);

      // Update session metadata
      if (agent) {
        const lastUserMessage = messages.filter(m => m.role === 'user' && !m.isLoading).pop();
        if (lastUserMessage) {
          AgentChatService.updateSession(currentSessionId, agent, {
            lastMessage: lastUserMessage.text.slice(0, 100),
            messageCount: messagesToSave.length,
          });
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [messages, currentSessionId, agent]);

  const handleNewSession = () => {
    if (!agent) return;
    const newSession = AgentChatService.createSession(agent);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const handleSessionSelect = (sessionId: string) => {
    loadSession(sessionId);
  };

  const appendPresentationMessages = useCallback(
    (items: { role: "user" | "assistant"; text: string }[]) => {
      setMessages((prev) => [
        ...prev,
        ...items.map((item) => ({
          ...item,
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2),
        })),
      ]);
    },
    []
  );

  const handleExportReport = useCallback(() => {
    if (messages.length === 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Collect user questions and assistant answers
    const userMessages = messages.filter(m => m.role === 'user' && !m.isLoading);
    const assistantMessages = messages.filter(m => m.role === 'assistant' && !m.isLoading);

    const question = userMessages.map(m => m.text).join('\n\n');
    const shortAnswer = assistantMessages.length > 0 ? assistantMessages[0].text.slice(0, 300) : '';
    const fullAnswer = assistantMessages.map(m => m.text).join('\n\n---\n\n');

    const report = `ЗАКЛЮЧЕНИЕ
ИИ-агента по правовому сопровождению деятельности АО «Самрук-Қазына»

г. Астана                                                           ${dateStr}

═══════════════════════════════════════════════════════════════

Агент:                    ${agent || 'AI-ассистент'}

Наименование вопроса:     ${question.slice(0, 200)}

───────────────────────────────────────────────────────────────

КРАТКИЙ ОТВЕТ:
${shortAnswer}

───────────────────────────────────────────────────────────────

ПОДРОБНЫЙ ОТВЕТ:
${fullAnswer}

───────────────────────────────────────────────────────────────

ИСТОЧНИКИ:
1. Источники НПА
2. Источники ВНД

───────────────────────────────────────────────────────────────

ВЫВОДЫ:
Проекты представленных документов по вопросу соответствуют нормам и требованиям
нормативных правовых актов Республики Казахстан и внутренних нормативных документов
АО «Самрук-Қазына»

═══════════════════════════════════════════════════════════════
Дата формирования: ${dateStr}
Сформировано автоматически платформой QC AI-HUB
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Заключение_ИИ_${dateStr.replace(/\./g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Отчёт выгружен', 'success');
  }, [messages, agent, showToast]);

  // Handle copy message text (callback for MessageBubble, no toast needed)
  const handleCopy = useCallback((messageId: string) => {
    // MessageBubble handles copying and visual feedback internally
    // This callback is kept for compatibility but doesn't need to do anything
  }, []);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.map(msg => 
      msg.isLoading ? { ...msg, text: 'Генерация остановлена', isLoading: false } : msg
    ));
  }, []);

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? message).trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;
    
    // Create or get current session
    if (!currentSessionId && agent) {
      // Создаем сессию с названием из первого сообщения (сокращаем до 35 символов)
      const firstMessage = text || `Прикреплено ${attachedFiles.length} файл(ов)`;
      const title = firstMessage.slice(0, 35).trim();
      const newSession = AgentChatService.createSession(agent, title || 'Новый чат');
      setCurrentSessionId(newSession.id);
    }
    
    setIsLoading(true);
    
    // Добавляем сообщение пользователя
    const userMsg = {
      id: Math.random().toString(36).slice(2),
      role: 'user' as const,
      text: text || `Прикреплено ${attachedFiles.length} файл(ов)`,
      files: [...attachedFiles]
    };
    
    const loadingMsgId = Math.random().toString(36).slice(2);
    const loadingMsg = {
      id: loadingMsgId,
      role: 'assistant' as const,
      text: '',
      isLoading: true,
    };
    
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setMessage("");
    setAttachedFiles([]);
    
    try {
      const startedAt = performance.now();
      // Build detailed system prompt based on agent
      let systemPrompt = agent 
        ? `Ты ${agent} - профессиональный эксперт AI ассистент высокого уровня. 

ВАЖНО: Всегда давай РАЗВЁРНУТЫЕ, ДЕТАЛЬНЫЕ ответы минимум на 150-300 слов. Никогда не отвечай одним предложением.

Требования к ответам:
- Структурируй информацию с заголовками и подзаголовками (используй ** для выделения)
- Используй маркированные и нумерованные списки для лучшей читаемости
- Приводи конкретные примеры и практические рекомендации
- Объясняй концепции подробно, как эксперт в своей области
- Отвечай на русском языке профессионально и информативно
- Если вопрос короткий или простой, всё равно дай полный, развёрнутый ответ с контекстом и деталями`
        : `Ты полезный AI ассистент для платформы QC AI-HUB Enterprise Platform.

ВАЖНО: Всегда давай РАЗВЁРНУТЫЕ, ДЕТАЛЬНЫЕ ответы минимум на 150-300 слов. Никогда не отвечай одним предложением.

Требования к ответам:
- Структурируй информацию с заголовками и подзаголовками
- Используй маркированные и нумерованные списки
- Приводи конкретные примеры и рекомендации
- Отвечай на русском языке профессионально и дружелюбно
- Даже на простые вопросы давай полные, информативные ответы`;

      if (isPresentationAgent) {
        const instr = navState.instructions?.trim();
        systemPrompt = `${instr ? `${instr}\n\n` : ""}${systemPrompt}

Контекст Presentation Agent: пользователь формирует презентацию из документа в боковой панели (на широком экране справа; на узком экране — блок под подсказками). Готовые файлы PPTX и PDF он скачивает из панели после генерации. Твоя задача в чате — советовать по структуре слайдов, формулировкам, логике storytelling и соответствию корпоративному тону; не выдумывай конкретные цифры из документа, если их не было в переписке.`;
      }
      
      // Convert messages to format expected by AI service
      const chatMessages: Array<{role: 'user' | 'assistant' | 'system'; content: string}> = [
        ...messages.filter(m => !m.isLoading).map(m => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text + (m.files && m.files.length > 0 ? `\n\nПрикреплено файлов: ${m.files.map(f => f.name).join(', ')}` : ''),
        })),
        { role: 'user' as const, content: text || `Прикреплено ${attachedFiles.length} файл(ов)` },
      ];
      
      // Call AI service with higher token limit for detailed responses
      const response = await sendChatMessage(chatMessages, {
        model: import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 2000,
        systemPrompt,
      });
      const durationMs = performance.now() - startedAt;
      
      // Replace loading message with actual response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsgId 
          ? { id: loadingMsgId, role: 'assistant' as const, text: response.content, durationMs }
          : msg
      ));

      // Update session title if this is the first message
      // Обновляем название сессии из первого сообщения, если оно еще "Новый чат"
      if (currentSessionId && agent) {
        const session = AgentChatService.getSession(currentSessionId, agent);
        if (session && (session.title === 'Новый чат' || !session.title || session.title.trim() === '')) {
          const title = text.slice(0, 35).trim();
          if (title) {
            AgentChatService.updateSession(currentSessionId, agent, { title });
          }
        }
      }
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Replace loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsgId 
          ? { id: loadingMsgId, role: 'assistant' as const, text: `Ошибка: ${error.message || 'Не удалось получить ответ от AI'}` }
          : msg
      ));
      
      showToast(error.message || 'Ошибка при отправке сообщения', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // preload initial message from navigation (e.g., Dashboard)
  if (initialMessage && !hasInitialized) {
    setTimeout(() => {
      handleSend(initialMessage);
      setHasInitialized(true);
    }, 0);
  }

  if (isTranslatorAgent) {
    const isV2 =
      navState.agentId === "Translator-2" || agent === "Переводчик 2.0";
    return (
      <div className="flex flex-col h-full min-h-0">
        <PageHeader
          title="AI-Studio"
          subtitle={isV2 ? "Переводчик 2.0 · документный режим" : "Платформа перевода документов"}
        />
        <main className="flex-1 min-h-0 p-4 md:p-6">
          {isV2 ? <TranslatorDocumentPlatform /> : <TranslatorPlatform />}
        </main>
      </div>
    );
  }

  return <div className="flex flex-col h-screen">
      <PageHeader title="AI-Studio" subtitle={isPresentationAgent ? "Создатель презентаций · мастер и экспорт в этом чате" : undefined} />
      <main className="flex-1 flex min-h-0">
        {/* Agent History Sidebar - слева */}
        {agent && (
          <AgentHistorySidebar
            agentId={agent}
            activeSessionId={currentSessionId || undefined}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            position="left"
          />
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Chat Area */}
          {/* Chat header with export */}
          {messages.length > 0 && !isPresentationAgent && (
            <div className="flex items-center justify-end px-6 py-2 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportReport}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <FileDown className="h-4 w-4" />
                Выгрузка отчёта
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6 pb-0">
              <div className="w-full max-w-3xl mx-auto">
                {messages.length === 0 && !isPresentationAgent ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <h2 className="text-2xl font-semibold mb-2">{agent ? `Чат с агентом: ${agent}` : 'Начать беседу'}</h2>
                    <p className="text-muted-foreground max-w-md">
                      Задавайте вопросы выбранному агенту из AI Studio
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-24">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={msg.role === 'user' ? 'flex justify-end' : ''}
                      >
                        <MessageBubble
                          text={msg.text}
                          role={msg.role}
                          messageId={msg.id}
                          isLoading={msg.isLoading}
                          files={msg.files?.map(f => ({ name: f.name, type: f.type }))}
                          feedback={msg.feedback}
                          feedbackDetails={msg.feedbackDetails}
                          onCopy={msg.role === 'assistant' ? () => handleCopy(msg.id) : undefined}
                          onFeedbackChange={(value, reasons, details) => {
                            if (msg.role !== 'assistant') return;
                            setMessages(prev => prev.map(m => 
                              m.id === msg.id 
                                ? { 
                                    ...m, 
                                    feedback: value || undefined,
                                    feedbackReasons: reasons,
                                    feedbackDetails: details || "",
                                  } 
                                : m
                            ));
                          }}
                        />
                      </div>
                    ))}
                    {isPresentationAgent && (
                      <PresentationAgentPanel
                        key={currentSessionId ?? "presentation-draft"}
                        inlineInChat
                        appendChatMessages={appendPresentationMessages}
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input at bottom when messages exist - фиксировано */}
          <div className="sticky bottom-0 px-4 pb-4 pt-8 z-10 bg-background/95 backdrop-blur-sm border-t border-border/60 relative before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background/95 before:to-transparent before:backdrop-blur-sm before:pointer-events-none">
            <div className="w-full max-w-3xl mx-auto space-y-2">
              {/* Отображение прикрепленных файлов */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((file, index) => (
                    <Badge key={index} variant="default" className="flex items-center gap-2 px-2 py-1">
                      <File className="h-3 w-3" />
                      <span className="text-xs max-w-[150px] truncate">{file.name}</span>
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <ChatComposer
                value={message}
                placeholder={placeholder}
                examples={examplePrompts}
                onChange={setMessage}
                onSend={() => handleSend()}
                onAttachClick={() => setIsAttachModalOpen(true)}
                onStop={handleStop}
                disabled={isLoading}
                isLoading={isLoading}
                canSendWithoutText={attachedFiles.length > 0}
              />
              <div className="pb-1">
                <Disclaimer />
              </div>
            </div>
          </div>
        </div>
      </main>

      <FileDropOverlay
        onFilesDropped={(files) => setAttachedFiles(prev => [...prev, ...files])}
        enabled={!isLoading}
      />

      {/* Modal для прикрепления файлов */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        title="Прикрепить файлы"
        size="md"
      >
        <FileUpload
          key={isAttachModalOpen ? "open" : "closed"}
          onFilesSelected={(files) => {
            setAttachedFiles(prev => [...prev, ...files]);
            setIsAttachModalOpen(false);
          }}
          acceptedTypes={[".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"]}
          multiple={true}
          maxSizeMB={50}
        />
      </Modal>
    </div>;
}

