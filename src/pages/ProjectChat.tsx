import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, ExternalLink, Pencil, Trash2, FolderOpen, Menu, Paperclip, ChevronLeft, ChevronRight, Plus, X, File, Check, PanelLeft, PanelRight } from "lucide-react";
import { ProjectSettingsDialog } from "@/components/ProjectSettingsDialog";
import { ChatComposer } from "@/components/ChatComposer";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { Modal } from "@/shared/components/Modal";
import { FileUpload } from "@/shared/components/Forms/FileUpload";
import { Badge } from "@/shared/components/Badge";
import { Disclaimer } from "@/components/chat/Disclaimer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { formatChatDateLabel, getDayKey } from "@/lib/chat-time";
import { FileDropOverlay } from "@/components/chat/FileDropOverlay";
import { sendChatMessage } from "@/shared/services/ai.service.ts";
import { useToast } from "@/shared/components/Toast";
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return `меньше часа назад`;
  if (diffHours < 24) return `${diffHours} часов назад`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дней назад`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} недель назад`;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO
  feedback?: 'correct' | 'partially-correct' | 'incorrect';
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: string; // ISO
  messages: Message[];
};

const LS_KEY = "projectChat.conversations";

export default function ProjectChat() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const location = useLocation();
  const passedProjectName = (location.state as { projectName?: string })?.projectName;
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("files");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState(passedProjectName || "My project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const startEditingName = () => {
    setEditingNameValue(projectName);
    setIsEditingName(true);
  };

  const confirmNameEdit = () => {
    if (editingNameValue.trim()) {
      setProjectName(editingNameValue.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      confirmNameEdit();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  // load/save to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Conversation[];
        setConversations(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  const createConversation = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const title = trimmed.slice(0, 60);
    const nowIso = new Date().toISOString();
    const firstUser: Message = { id: id + "u", role: "user", content: trimmed, createdAt: nowIso };
    const firstAssistant: Message = { id: id + "a", role: "assistant", content: "Принято. Чем ещё могу помочь по проекту?", createdAt: nowIso };
    const conv: Conversation = { id, title, updatedAt: nowIso, messages: [firstUser, firstAssistant] };
    setConversations(prev => [conv, ...prev]);
    setSelectedId(id);
    setActiveTab("conversations");
  };

  const appendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && attachedFiles.length === 0) return;
    if (isLoading) return;
    
    setIsLoading(true);
    const fileInfo = attachedFiles.length > 0 
      ? `\n\n📎 Прикреплено файлов: ${attachedFiles.length}\n${attachedFiles.map(f => `- ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}`
      : '';
    
    const fullContent = trimmed + fileInfo;
    const nowIso = new Date().toISOString();
    const loadingMsgId = Math.random().toString(36).slice(2);
    
    // if no conversation selected, create one
    if (!selectedId) {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const title = trimmed.slice(0, 60);
      const firstUser: Message = { id: id + "u", role: "user", content: fullContent, createdAt: nowIso };
      const loadingAssistant: Message = { id: loadingMsgId, role: "assistant", content: "", createdAt: nowIso };
      const conv: Conversation = { id, title, updatedAt: nowIso, messages: [firstUser, loadingAssistant] };
      setConversations(prev => [conv, ...prev]);
      setSelectedId(id);
      setActiveTab("conversations");
      setAttachedFiles([]);
      
      try {
        // Build detailed system prompt for project context
        const systemPrompt = `Ты полезный AI ассистент для платформы QC AI-HUB Enterprise Platform, работающий в контексте проекта "${projectName}".

ВАЖНО: Всегда давай РАЗВЁРНУТЫЕ, ДЕТАЛЬНЫЕ ответы минимум на 150-300 слов. Никогда не отвечай одним предложением.

Требования к ответам:
- Структурируй информацию с заголовками и подзаголовками (используй ** для выделения)
- Используй маркированные и нумерованные списки для лучшей читаемости
- Приводи конкретные примеры и практические рекомендации
- Объясняй концепции подробно, как эксперт в своей области
- Отвечай на русском языке профессионально и информативно
- Если вопрос короткий или простой, всё равно дай полный, развёрнутый ответ с контекстом и деталями
- Учитывай контекст проекта "${projectName}" при формулировании ответов`;
        
        // Convert messages to format expected by AI service
        const chatMessages: Array<{role: 'user' | 'assistant' | 'system'; content: string}> = [
          { role: 'user' as const, content: fullContent },
        ];
        
        // Call AI service with higher token limit for detailed responses
        const response = await sendChatMessage(chatMessages, {
          model: import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo',
          temperature: 0.8,
          maxTokens: 2000,
          systemPrompt,
        });
        
        // Replace loading message with actual response
        setConversations(prev => prev.map(c => {
          if (c.id !== id) return c;
          return {
            ...c,
            messages: c.messages.map(m => 
              m.id === loadingMsgId 
                ? { ...m, content: response.content }
                : m
            ),
            updatedAt: new Date().toISOString(),
          };
        }));
      } catch (error: any) {
        console.error('Error sending message:', error);
        // Replace loading message with error message
        setConversations(prev => prev.map(c => {
          if (c.id !== id) return c;
          return {
            ...c,
            messages: c.messages.map(m => 
              m.id === loadingMsgId 
                ? { ...m, content: `Ошибка: ${error.message || 'Не удалось получить ответ от AI'}` }
                : m
            ),
          };
        }));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Add user message and loading assistant message
    setConversations(prev => prev.map(c => {
      if (c.id !== selectedId) return c;
      const userMsg: Message = { id: Math.random().toString(36).slice(2), role: "user", content: fullContent, createdAt: nowIso };
      const loadingAssistant: Message = { id: loadingMsgId, role: "assistant", content: "", createdAt: nowIso };
      return { ...c, messages: [...c.messages, userMsg, loadingAssistant], updatedAt: nowIso, title: c.title || trimmed.slice(0, 60) };
    }));
    setAttachedFiles([]);
    
    try {
      const selected = conversations.find(c => c.id === selectedId);
      if (!selected) return;
      
      // Build detailed system prompt for project context
      const systemPrompt = `Ты полезный AI ассистент для платформы QC AI-HUB Enterprise Platform, работающий в контексте проекта "${projectName}".

ВАЖНО: Всегда давай РАЗВЁРНУТЫЕ, ДЕТАЛЬНЫЕ ответы минимум на 150-300 слов. Никогда не отвечай одним предложением.

Требования к ответам:
- Структурируй информацию с заголовками и подзаголовками (используй ** для выделения)
- Используй маркированные и нумерованные списки для лучшей читаемости
- Приводи конкретные примеры и практические рекомендации
- Объясняй концепции подробно, как эксперт в своей области
- Отвечай на русском языке профессионально и информативно
- Если вопрос короткий или простой, всё равно дай полный, развёрнутый ответ с контекстом и деталями
- Учитывай контекст проекта "${projectName}" при формулировании ответов`;
      
      // Convert messages to format expected by AI service
      const chatMessages: Array<{role: 'user' | 'assistant' | 'system'; content: string}> = [
        ...selected.messages.filter(m => m.role !== 'assistant' || m.content).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: fullContent },
      ];
      
      // Call AI service with higher token limit for detailed responses
      const response = await sendChatMessage(chatMessages, {
        model: import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 2000,
        systemPrompt,
      });
      
      // Replace loading message with actual response
      setConversations(prev => prev.map(c => {
        if (c.id !== selectedId) return c;
        return {
          ...c,
          messages: c.messages.map(m => 
            m.id === loadingMsgId 
              ? { ...m, content: response.content }
              : m
          ),
          updatedAt: new Date().toISOString(),
        };
      }));
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Replace loading message with error message
      setConversations(prev => prev.map(c => {
        if (c.id !== selectedId) return c;
        return {
          ...c,
          messages: c.messages.map(m => 
            m.id === loadingMsgId 
              ? { ...m, content: `Ошибка: ${error.message || 'Не удалось получить ответ от AI'}` }
              : m
          ),
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const renameConversation = (id: string) => {
    const current = conversations.find(c => c.id === id);
    const nextTitle = window.prompt("Переименовать чат", current?.title || "");
    if (nextTitle && nextTitle.trim()) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: nextTitle.trim(), updatedAt: new Date().toISOString() } : c));
    }
  };

  const deleteConversation = (id: string) => {
    if (!window.confirm("Удалить чат?")) return;
    setConversations(prev => prev.filter(c => c.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  };

  const handleCopy = (messageId: string) => {
    // MessageBubble handles copying and visual feedback internally
    // This callback is kept for compatibility but doesn't need to do anything
  };

  const selected = conversations.find(c => c.id === selectedId) || null;

  return <div className="flex flex-col h-screen">
      <PageHeader title={t('sidebar.projects')} />
      <main className="flex-1 flex min-h-0">
      {/* Project Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-60'} border-r border-t bg-muted/30 flex flex-col transition-all duration-200`} style={{ minWidth: sidebarCollapsed ? '48px' : '240px', maxWidth: sidebarCollapsed ? '48px' : '240px' }}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Header with collapse button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <h3 className="text-sm font-medium truncate flex-1 min-w-0 mr-2">{projectName}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(true)}
                className="h-7 w-7 flex-shrink-0"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>

        {/* Instructions Button */}
            <button
          onClick={() => setSettingsOpen(true)}
              className="mx-3 my-2 p-3 border rounded-xl text-left hover:bg-accent/40 hover:border-primary/40 transition-all duration-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Инструкции</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            Настройте инструкции для AI-HUB в этом проекте
          </p>
            </button>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 mx-3 mt-2 mb-2">
            <TabsTrigger value="files" className="text-xs">Файлы</TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs">Чаты</TabsTrigger>
          </TabsList>

              {activeTab === "files" && <div className="flex-1 p-3">
                  <Button variant="outline" className="w-full justify-center gap-2 mb-4 h-8 text-xs">
                    <Paperclip className="h-3.5 w-3.5" />
                Прикрепить
              </Button>
              
                  <div className="flex flex-col items-center justify-center py-4 text-center border border-border rounded-xl">
                    <FolderOpen className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <h3 className="font-medium mb-1 text-xs">Файлов пока нет</h3>
                    <p className="text-[10px] text-muted-foreground max-w-[180px]">
                      Прикрепите файлы к проекту
                </p>
              </div>
            </div>}

          {activeTab === "conversations" && <div className="flex flex-col h-full">
                  <div className="px-3 pb-2">
                    <Button variant="outline" className="w-full justify-start gap-2 text-[11px] h-8">
                  <Plus className="h-3.5 w-3.5" />
                  Новый чат
                </Button>
              </div>
                  <ScrollArea className="flex-1 px-2 pb-2">
              {conversations.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                      <Menu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Нет сохраненных чатов</p>
                    </div>
              ) : (
                    <div className="space-y-1">
                  {conversations.map(conv => (
                        <button 
                          key={conv.id} 
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors group hover:bg-muted/50 ${selectedId === conv.id ? "bg-muted border border-border" : "bg-transparent"}`} 
                          onClick={() => { setSelectedId(conv.id); setActiveTab("conversations"); }}
                        >
                          <div className="flex items-start gap-2 min-w-0 w-full">
                            <div className="flex-1 min-w-0 overflow-hidden pr-1">
                              <div className="text-[11px] font-medium text-foreground truncate">{conv.title || "Без названия"}</div>
                      </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                              title="Удалить"
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                          </div>
                        </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>}
            </Tabs>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6 pb-0">
            <div className="w-full max-w-3xl mx-auto">
              {selected ? (
                <div className="space-y-4 pb-0">
                  {selected.messages.map((m, index) => {
                    const dayKey = m.createdAt ? getDayKey(m.createdAt) : "";
                    const prevDayKey =
                      index > 0 && selected.messages[index - 1].createdAt
                        ? getDayKey(selected.messages[index - 1].createdAt)
                        : "";
                    const showDate = Boolean(dayKey && dayKey !== prevDayKey);

                    return (
                      <div key={m.id}>
                        {showDate && m.createdAt && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] font-medium text-muted-foreground/80 px-2.5 py-1 rounded-full bg-muted/70">
                              {formatChatDateLabel(m.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={m.role === 'user' ? 'flex justify-end' : ''}>
                          <MessageBubble
                            text={m.content || "..."}
                            role={m.role}
                            messageId={m.id}
                            isLoading={!m.content && m.role === 'assistant'}
                            createdAt={m.createdAt}
                            feedback={m.feedback}
                            onCopy={m.role === 'assistant' ? () => handleCopy(m.id) : undefined}
                            onFeedbackChange={(value, reasons, details) => {
                              if (m.role !== 'assistant') return;
                              setConversations(prev => prev.map(c => {
                                if (c.id !== selectedId) return c;
                                return {
                                  ...c,
                                  messages: c.messages.map(msg => 
                                    msg.id === m.id 
                                      ? { ...msg, feedback: value || undefined }
                                      : msg
                                  ),
                                };
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <h2 className="text-2xl font-semibold mb-2">Начать беседу</h2>
                  <p className="text-muted-foreground max-w-md">Задавайте вопросы, получайте помощь или обсуждайте ваш проект</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input at bottom when messages exist - фиксировано */}
        <div className="sticky bottom-0 px-4 pb-4 pt-0 z-10 bg-background/95 backdrop-blur-sm relative before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background/95 before:to-transparent before:backdrop-blur-sm before:pointer-events-none">
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
              onChange={setMessage}
              onSend={(text) => { 
                if (selected) {
                  appendMessage(text);
                } else {
                  appendMessage(text);
                }
                setMessage(""); 
              }}
              onAttachClick={() => setIsAttachModalOpen(true)}
              disabled={isLoading}
              canSendWithoutText={attachedFiles.length > 0}
              examples={[
                "Задайте вопрос по файлам проекта",
                "Попросите сгенерировать сводку по документам",
                "Уточните статус задач и рисков"
              ]}
            />
            <div className="pb-1">
              <Disclaimer />
            </div>
          </div>
        </div>
      </div>

      <ProjectSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

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
      </main>
    </div>;
}