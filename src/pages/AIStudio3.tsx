import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter,
  Sparkles,
  Briefcase,
  FileText,
  Code,
  Languages,
  BarChart3,
  Scale,
  PenTool,
  DollarSign,
  Headphones,
  GraduationCap,
  Shield,
  Kanban,
  Grid3x3,
  Factory,
  Users,
  Mic,
  FileCheck,
  Presentation,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranslatorPlatform } from "@/components/translator/TranslatorPlatform";

type StudioSection = "agents" | "tools";
type AgentCategory = "all" | "language" | "assistant" | "documents" | "code" | "industrial";
type AgentType = "agent" | "developer";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory[];
  type: AgentType;
  instructions: string;
  placeholder: string;
  tags: string[];
  isLocal: boolean;
  icon: LucideIcon;
  featured?: boolean;
  gradient?: string;
  iconColor?: string;
}

const TengeIcon: LucideIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 5h14" />
    <path d="M7 9h10" />
    <path d="M12 9v10" />
  </svg>
);

const agents: Agent[] = [
  {
    id: "Presentation-Agent",
    name: "Создатель презентаций",
    description: "Превращает документ (.txt, .md, .docx, .pdf) в презентацию в стиле QazCloud Brand Guidelines (синяя палитра, типографика, тональность) и экспортирует PPTX/PDF под выбранный бренд.",
    category: ["documents"],
    type: "agent",
    instructions: "Specialized presentation builder. Принимает исходный текст, бренд-профиль и цель — выдаёт готовый outline + PPTX + PDF.",
    placeholder: "Загрузи документ и собери питч под QazCloud за минуту",
    tags: ["PPTX", "PDF", "Branding"],
    isLocal: false,
    icon: Presentation,
    featured: true,
    gradient: "from-primary/30 via-primary/15 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Transcriber",
    name: "Транскрибатор",
    description: "AI-сервис для автоматического преобразования аудио- и видеозаписей в текст с поддержкой деловой терминологии.",
    category: ["documents"],
    type: "agent",
    instructions: "Специалист по транскрибации. Преобразуй аудио и видео записи в точный текст, сохраняя структуру и пунктуацию.",
    placeholder: "Расшифруй прикрепленную аудиозапись",
    tags: ["Аудио", "Видео"],
    isLocal: true,
    icon: Mic,
    featured: true,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Summarizer",
    name: "Суммаризатор",
    description: "AI-сервис для автоматического создания кратких и структурированных резюме документов, переписок и расшифровок встреч с выделением ключевых моментов.",
    category: ["documents"],
    type: "agent",
    instructions: "Специалист по суммаризации текстов. Создавай краткие и информативные сводки, выделяй ключевые моменты и основные выводы.",
    placeholder: "Создай краткую сводку из прикрепленного документа",
    tags: ["Документы", "Анализ"],
    isLocal: true,
    icon: FileCheck,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Methodology",
    name: "Методология закупок 2.0",
    description: "AI-агент для методологов и специалистов по закупкам, который помогает ориентироваться в методологии закупок Самрук-Казына, находить и анализировать нормативные требования.",
    category: ["assistant"],
    type: "agent",
    instructions: "Консультант по методологии закупок. Помогай находить и разъяснять нормы закупочной деятельности Самрук-Казына.",
    placeholder: "Какие требования к закупкам свыше 5000 МРП?",
    tags: ["Закупки", "Методология"],
    isLocal: true,
    icon: Briefcase,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Translator",
    name: "Переводчик",
    description: "Платформа перевода документов: загрузка DOCX/PDF, правка сегментов, глоссарий и утверждение перевода (RUS / KAZ / ENG).",
    category: ["language"],
    type: "agent",
    instructions: "Профессиональный переводчик. Обеспечивай точный перевод с сохранением контекста и стиля оригинала.",
    placeholder: "Переведи техническую документацию с английского на казахский",
    tags: ["RUS", "KAZ", "ENG"],
    isLocal: true,
    icon: Languages,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Translator-2",
    name: "Переводчик 2.0",
    description: "Документный режим: перевод с сохранением структуры, цельный editable-документ и сверка оригинал/перевод (как DeepL Document).",
    category: ["language"],
    type: "agent",
    instructions: "Профессиональный переводчик документов. Сохраняй структуру и форматирование, переводи на целевой язык целиком.",
    placeholder: "Загрузи документ для перевода в документном режиме",
    tags: ["Документ", "WYSIWYG", "KAZ"],
    isLocal: true,
    icon: FileText,
    featured: true,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Legal-NPA-3",
    name: "Юридический консультант НПА 3.0",
    description: "AI-агент для юристов, обеспечивающий быстрый поиск, анализ и разъяснение норм НПА РК и корпоративных требований Самрук-Казына.",
    category: ["documents"],
    type: "agent",
    instructions: "Юридический консультант по НПА. Анализируй нормативные правовые акты РК, давай разъяснения и ссылки на конкретные статьи.",
    placeholder: "Найди требования к закупкам в Законе о государственных закупках",
    tags: ["НПА", "Право"],
    isLocal: true,
    icon: Scale,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "VND-Agent",
    name: "ВНД агент Самрук-Казына 3.0",
    description: "AI-агент для юристов, который помогает быстро находить, анализировать и сопоставлять внутренние нормативные документы Самрук-Казына.",
    category: ["documents"],
    type: "agent",
    instructions: "Специалист по внутренним нормативным документам Самрук-Казына. Помогай находить и анализировать ВНД.",
    placeholder: "Найди требования ВНД по согласованию договоров",
    tags: ["ВНД", "Самрук-Казына"],
    isLocal: true,
    icon: FileText,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Legal-NPA-SK",
    name: "Юридический консультант НПА Самрук-Казына",
    description: "AI-агент для юристов, обеспечивающий быстрый поиск, анализ и разъяснение норм НПА РК и корпоративных требований Самрук-Казына.",
    category: ["documents"],
    type: "agent",
    instructions: "Юридический консультант по НПА Самрук-Казына. Анализируй нормативные акты и корпоративные требования.",
    placeholder: "Разъясни требования НПА по корпоративному управлению",
    tags: ["НПА", "Самрук-Казына"],
    isLocal: false,
    icon: Scale,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Financial-Models",
    name: "Агент по финансовым моделям",
    description: "ИИ Агент кратко сообщает, найдена ли каждая метрика, и при необходимости показывает, где именно она встречается. Если ничего не найдено — уведомляет об этом.",
    category: ["industrial"],
    type: "agent",
    instructions: "Финансовый аналитик. Анализируй финансовые модели, находи метрики и показатели в документах.",
    placeholder: "Найди ключевые финансовые метрики в отчете",
    tags: ["Финансы", "Метрики"],
    isLocal: true,
    icon: TengeIcon,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
  {
    id: "Limits-Agent",
    name: "Агент для расчета лимитов 2.0",
    description: "AI-агент для автоматического заполнения Excel-шаблонов отчетности по лимитам/метрикам на основе входных источников. Находит и систематизирует данные.",
    category: ["industrial"],
    type: "agent",
    instructions: "Специалист по расчету лимитов. Заполняй шаблоны отчетности, находи и систематизируй данные по лимитам и метрикам.",
    placeholder: "Заполни шаблон отчетности по лимитам на основе входных данных",
    tags: ["Excel", "Лимиты"],
    isLocal: true,
    icon: BarChart3,
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconColor: "text-primary",
  },
];

const categories: { key: AgentCategory; label: string; count: number; icon: LucideIcon }[] = [
  { key: "all", label: "Все", count: agents.length, icon: Grid3x3 },
  { key: "language", label: "Языковые модели", count: agents.filter(a => a.category.includes("language")).length, icon: Languages },
  { key: "assistant", label: "Корпоративный ассистент", count: agents.filter(a => a.category.includes("assistant")).length, icon: Briefcase },
  { key: "documents", label: "Документы", count: agents.filter(a => a.category.includes("documents")).length, icon: FileText },
  { key: "code", label: "Код", count: agents.filter(a => a.category.includes("code")).length, icon: Code },
  { key: "industrial", label: "Промышленные", count: agents.filter(a => a.category.includes("industrial")).length, icon: Factory },
];

export default function AIStudio3() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState<StudioSection>("agents");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory>("all");
  const [selectedType, setSelectedType] = useState<AgentType>("agent");
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for smooth animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Фильтрация агентов
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Фильтр по типу (агенты/разработчики)
      if (agent.type !== selectedType) return false;

      // Фильтр по категории
      if (selectedCategory !== "all" && !agent.category.includes(selectedCategory)) {
        return false;
      }

      // Фильтр по поисковому запросу
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  // Trigger animation when filtered agents change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [filteredAgents.length]);

  // Обновление счетчиков категорий
  const categoryCounts = useMemo(() => {
    const counts: Record<AgentCategory, number> = {
      all: agents.filter(a => a.type === selectedType).length,
      language: agents.filter(a => a.type === selectedType && a.category.includes("language")).length,
      assistant: agents.filter(a => a.type === selectedType && a.category.includes("assistant")).length,
      documents: agents.filter(a => a.type === selectedType && a.category.includes("documents")).length,
      code: agents.filter(a => a.type === selectedType && a.category.includes("code")).length,
      industrial: agents.filter(a => a.type === selectedType && a.category.includes("industrial")).length,
    };
    return counts;
  }, [selectedType]);

  // Обработчик клика на карточку агента
  const handleCardClick = (e: React.MouseEvent, agent: Agent) => {
    // Не открываем чат, если клик был на бейдж оценки или внутри диалога
    if ((e.target as HTMLElement).closest('[data-rating-badge]') || 
        (e.target as HTMLElement).closest('[role="dialog"]')) {
      return;
    }
    // Переводчик — платформа документов, не чат
    if (agent.id === "Translator") {
      navigate("/agents/translator");
      return;
    }
    if (agent.id === "Translator-2") {
      navigate("/agents/translator-2");
      return;
    }
    navigate('/ai-studio-3-chat', {
      state: {
        agent: agent.name,
        agentId: agent.id,
        instructions: agent.instructions,
        placeholder: agent.placeholder,
      }
    });
  };
  
  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader 
        title="AI-Studio"
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative min-h-0">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/6 rounded-full blur-3xl animate-breathe" />
          <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] bg-primary/4 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '3s' }} />
        </div>
        <div className="h-full relative z-10 flex flex-col min-h-0">
          <div className="flex-shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>{t("ai-studio.section")}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={selectedSection === "agents" && selectedType === "agent" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedSection("agents");
                    setSelectedType("agent");
                  }}
                  className={cn(
                    "transition-all duration-200",
                    selectedSection === "agents" && selectedType === "agent"
                      ? "ring-2 ring-primary ring-offset-2 shadow-lg"
                      : "hover:bg-muted"
                  )}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t("ai-studio.agents")} ({categoryCounts.all})
                </Button>
                <Button
                  variant={selectedSection === "agents" && selectedType === "developer" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedSection("agents");
                    setSelectedType("developer");
                  }}
                  className={cn(
                    "transition-all duration-200",
                    selectedSection === "agents" && selectedType === "developer"
                      ? "ring-2 ring-primary ring-offset-2 shadow-lg"
                      : "hover:bg-muted"
                  )}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {t("ai-studio.developers")} ({agents.filter((a) => a.type === "developer").length})
                </Button>
                <Button
                  variant={selectedSection === "tools" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedSection("tools")}
                  className={cn(
                    "transition-all duration-200",
                    selectedSection === "tools"
                      ? "ring-2 ring-primary ring-offset-2 shadow-lg"
                      : "hover:bg-muted"
                  )}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  {t("ai-studio.tools")}
                </Button>
              </div>
            </div>
          </div>

          {selectedSection === "tools" ? (
            <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-6 py-4">
              <TranslatorPlatform />
            </div>
          ) : (
        <ScrollArea className="flex-1 min-h-0 relative">
          <div className="max-w-7xl mx-auto space-y-6 p-6">
          {/* Search Section */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('ai-studio.search')}
              className="pl-10 transition-all focus:ring-2 focus:ring-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Категории</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const CategoryIcon = cat.icon;
                return (
                  <Badge
                    key={cat.key}
                    variant={selectedCategory === cat.key ? "default" : "secondary"}
                    className={cn(
                      "cursor-pointer transition-all duration-200 px-3 py-1.5 flex items-center gap-2",
                      selectedCategory === cat.key 
                        ? "ring-2 ring-primary ring-offset-2 shadow-lg scale-105" 
                        : "hover:scale-105 hover:bg-muted"
                    )}
                    onClick={() => setSelectedCategory(cat.key)}
                  >
                    <CategoryIcon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      selectedCategory === cat.key 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {categoryCounts[cat.key]}
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Models Grid */}
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-2">Агенты не найдены</p>
              <p className="text-sm text-muted-foreground">
                Попробуйте изменить фильтры или поисковый запрос
              </p>
            </div>
          ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              {[...Array(10)].map((_, index) => (
                <Card key={index} className="overflow-hidden" style={{ borderRadius: '20px' }}>
              <CardHeader className="p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="skeleton h-10 w-10" style={{ borderRadius: '14px' }} />
                      <div className="skeleton h-4 w-28 rounded flex-1" />
                    </div>
                    <div className="skeleton h-3 w-full rounded mb-1" />
                    <div className="skeleton h-3 w-full rounded mb-1" />
                    <div className="skeleton h-3 w-4/5 rounded mb-2" />
                    <div className="flex flex-wrap gap-1">
                      <div className="skeleton h-4 w-14" style={{ borderRadius: '6px' }} />
                      <div className="skeleton h-4 w-12" style={{ borderRadius: '6px' }} />
                </div>
              </CardHeader>
            </Card>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              {filteredAgents.map((agent, index) => {
                const Icon = agent.icon;
                return (
            <Card
                  key={agent.id}
              className={cn(
                "card-glow relative overflow-hidden transition-all duration-300 cursor-pointer group",
                "bg-card/60 backdrop-blur-sm border-border/30",
                "hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10",
                agent.featured && "ring-1 ring-primary/40 shadow-md shadow-primary/5"
              )}
              style={{
                animationDelay: `${index * 30}ms`,
                animation: "fadeInUp 0.4s ease-out forwards",
                opacity: 0,
                borderRadius: '20px',
              }}
              onClick={(e) => handleCardClick(e, agent)}
            >
              {agent.gradient && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                    agent.gradient,
                    "opacity-30 group-hover:opacity-50"
                  )}
                  style={{ borderRadius: '20px' }}
                />
              )}
              <div className="pointer-events-none absolute top-0 left-3 right-3 z-[1] h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent group-hover:via-primary/60 transition-all duration-300" />

              {/* Front — в потоке: высота карточки = контент + одинаковые p-3 сверху и снизу */}
              <CardHeader className="relative z-[2] flex flex-col gap-1.5 space-y-0 p-3 transition-opacity duration-300 group-hover:pointer-events-none group-hover:opacity-0">
                <div className="flex gap-2.5 items-start">
                  <div className="relative flex-shrink-0 transition-all duration-500 flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-0.5">
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-md scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Icon className={cn("h-10 w-10 relative z-10", agent.iconColor || "text-primary")} style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                    <CardTitle className="text-sm font-bold leading-snug group-hover:text-primary transition-colors break-words hyphens-auto">
                      {agent.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 overflow-hidden">
                      {agent.description}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-1.5 overflow-hidden border-t border-border/30 pt-1.5">
                  {agent.tags.slice(0, 1).map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline" className="text-xs font-medium px-2.5 py-1 flex-shrink-0 whitespace-nowrap" style={{ borderRadius: 8 }}>
                      {tag}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 flex-shrink-0 whitespace-nowrap",
                      agent.isLocal
                        ? "bg-emerald-600/15 text-emerald-700 dark:bg-[#166534]/25 dark:text-[#bbf7d0] border-emerald-600/40 dark:border-[#22c55e]/40"
                        : "bg-[#002845]/15 text-[#002845] dark:bg-[#0E7490]/20 dark:text-[#67E8F9] border-[#002845]/40 dark:border-[#0E7490]/40"
                    )}
                    style={{ borderRadius: 8 }}
                  >
                    {agent.isLocal ? "Локальный" : "Внешний"}
                  </Badge>
                </div>
              </CardHeader>

              {/* Back - description with title (hidden by default, visible on hover) */}
              <div className="absolute inset-0 z-10 flex flex-col bg-card/95 p-3 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                {agent.gradient && (
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", agent.gradient)} style={{ borderRadius: '20px' }} />
                )}
                <div className="relative z-10 mb-2 flex items-start gap-2">
                  <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", agent.iconColor || "text-primary")} />
                  <span className="text-sm font-semibold leading-snug break-words">{agent.name}</span>
                </div>
                <p className="relative z-10 min-h-0 flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-muted-foreground">
                  {agent.description}
                </p>
              </div>
            </Card>
              )})}
                </div>
          )}
          </div>
        </ScrollArea>
          )}
        </div>
      </main>
    </div>
  );
}

