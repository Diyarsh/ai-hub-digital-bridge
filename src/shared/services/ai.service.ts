/**
 * AI Service for chat interactions
 * Supports multiple AI providers (OpenAI, Anthropic, etc.)
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** When false, errors are thrown instead of returning demo mock responses */
  allowMock?: boolean;
}

interface ChatResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Get API configuration from environment
const getApiConfig = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const apiBaseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'openai').toLowerCase();
  
  return { apiKey, apiBaseUrl, provider };
};

export function isAiApiConfigured(): boolean {
  return Boolean(getApiConfig().apiKey);
}

export function getAiProviderSummary(): {
  configured: boolean;
  model: string;
  label: string;
} {
  const { apiKey, apiBaseUrl, provider } = getApiConfig();
  const model = import.meta.env.VITE_AI_MODEL || "gpt-3.5-turbo";
  const host = (() => {
    try {
      return new URL(apiBaseUrl).hostname;
    } catch {
      return apiBaseUrl;
    }
  })();

  let label = provider;
  if (host.includes("groq.com")) label = "Groq";
  else if (host.includes("deepseek.com")) label = "DeepSeek";
  else if (host.includes("openai.com")) label = "OpenAI";
  else if (provider === "custom") label = host;

  return { configured: Boolean(apiKey), model, label };
}

function getChatCompletionsUrl(apiBaseUrl: string): string {
  if (import.meta.env.DEV) {
    return "/api/ai/chat/completions";
  }
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/chat/completions`;
}

/**
 * Send chat message to AI model
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatResponse> {
  const { apiKey, apiBaseUrl, provider } = getApiConfig();
  const allowMock = options.allowMock !== false;
  
  // If no API key is configured, return mock response for demo
  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        "AI API не настроен. Добавьте VITE_OPENAI_API_KEY в файл .env для работы переводчика."
      );
    }
    console.warn('No AI API key configured. Using mock response. Add VITE_OPENAI_API_KEY to .env file for real AI responses.');
    // Simulate network delay so the loading/stop button is visible
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    return getMockResponse(messages);
  }

  const {
    model = import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo',
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt,
  } = options;

  // Build messages array with system prompt if provided
  const fullMessages: ChatMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  try {
    if (provider === 'openai' || provider === 'deepseek' || provider === 'custom') {
      return await sendOpenAICompatibleRequest(apiBaseUrl, apiKey, fullMessages, {
        model,
        temperature,
        maxTokens,
      });
    }
    
    // Add support for other providers here (Anthropic, etc.)
    throw new Error(`Unsupported AI provider: ${provider}`);
  } catch (error: any) {
    console.error('AI API Error:', error);
    
    if (!allowMock) {
      throw error instanceof Error ? error : new Error(error?.message || 'AI API error');
    }
    
    // Return mock response on network errors for graceful degradation
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.name === 'TypeError') {
      console.warn('Network error detected. Falling back to mock response.');
      return getMockResponse(messages);
    }
    
    // Return mock response on API errors for graceful degradation
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('API authentication error. Falling back to mock response.');
      return getMockResponse(messages);
    }
    
    // For other errors, still return mock response instead of throwing
    console.warn('AI API error occurred. Falling back to mock response:', error.message);
    return getMockResponse(messages);
  }
}

/**
 * Send request to OpenAI-compatible API
 */
async function sendOpenAICompatibleRequest(
  apiBaseUrl: string,
  apiKey: string,
  messages: ChatMessage[],
  options: { model: string; temperature: number; maxTokens: number }
): Promise<ChatResponse> {
  const response = await fetch(getChatCompletionsUrl(apiBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || 'No response generated',
    model: data.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Mock response for demo mode (when no API key is configured)
 * Returns detailed, realistic responses for demonstration purposes
 */
async function getMockResponse(messages: ChatMessage[]): Promise<ChatResponse> {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Simulate AI thinking delay (2-4 seconds)
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
  
  let mockResponse = getDetailedMockResponse(lastUserMessage);
  
  return {
    content: mockResponse,
    model: 'demo-mode',
  };
}

/**
 * Generate detailed mock responses based on user query
 */
function getDetailedMockResponse(userQuery: string): string {
  const query = userQuery.toLowerCase();
  
  // Greeting responses
  if (query.includes('привет') || query.includes('hello') || query.includes('здравствуй')) {
    return `Здравствуйте! Рад приветствовать вас в AI-HUB Enterprise Platform.

## Чем я могу помочь?

Я — ваш персональный AI-ассистент, специализирующийся на различных задачах:

**Аналитика и исследования:**
- Анализ данных и подготовка отчётов
- Исследование рынка и конкурентов
- Прогнозирование и моделирование

**Документы и тексты:**
- Подготовка и редактирование документов
- Перевод и локализация
- Создание контента для маркетинга

**Разработка и технологии:**
- Консультации по архитектуре систем
- Помощь с кодом и отладкой
- Автоматизация процессов

Задайте мне вопрос, и я постараюсь дать максимально полезный и развёрнутый ответ. Чем конкретнее вопрос, тем точнее будет мой ответ!`;
  }
  
  // GDPR related
  if (query.includes('gdpr') || query.includes('персональн') || query.includes('защита данных')) {
    return `## GDPR: Общий регламент по защите данных

**Что такое GDPR?**

GDPR (General Data Protection Regulation) — это регламент Европейского союза, вступивший в силу 25 мая 2018 года. Он устанавливает правила сбора, хранения и обработки персональных данных граждан ЕС.

### Ключевые принципы GDPR:

**1. Законность и прозрачность**
- Обработка данных должна быть законной и прозрачной
- Пользователи должны быть информированы о целях сбора данных
- Необходимо получить явное согласие на обработку

**2. Ограничение цели**
- Данные собираются для конкретных, явных и законных целей
- Использование данных не должно противоречить заявленным целям

**3. Минимизация данных**
- Собираются только те данные, которые необходимы
- Избегайте избыточного сбора информации

### Права субъектов данных:

1. **Право на доступ** — пользователь может запросить копию своих данных
2. **Право на исправление** — возможность исправить неточные данные
3. **Право на удаление** ("право быть забытым") — удаление персональных данных
4. **Право на переносимость** — получение данных в машиночитаемом формате
5. **Право на возражение** — отказ от определённых видов обработки

### Штрафы за нарушение:

- До **20 млн евро** или **4% годового оборота** (в зависимости от того, что больше)
- Применяется к компаниям любого размера, работающим с данными граждан ЕС

### Рекомендации по соответствию:

- Проведите аудит всех процессов обработки данных
- Назначьте ответственного за защиту данных (DPO)
- Внедрите технические и организационные меры защиты
- Разработайте процедуры реагирования на утечки данных
- Обновите политику конфиденциальности

Нужна более детальная информация по какому-либо аспекту GDPR?`;
  }
  
  // Analysis related
  if (query.includes('анализ') || query.includes('исследовани') || query.includes('отчёт') || query.includes('отчет')) {
    return `## Комплексный подход к анализу

Для проведения качественного анализа предлагаю следующую методологию:

### 1. Определение целей и задач

**Ключевые вопросы:**
- Какую проблему мы решаем?
- Какие решения нужно принять на основе анализа?
- Кто является целевой аудиторией результатов?

### 2. Сбор данных

**Источники данных:**
- Внутренние базы данных и CRM-системы
- Маркетинговые исследования и опросы
- Открытые источники и аналитические отчёты
- Данные социальных сетей и web-аналитики

### 3. Методы анализа

**Количественные методы:**
- Статистический анализ (описательная статистика, корреляции)
- Регрессионный анализ для выявления зависимостей
- Кластерный анализ для сегментации
- Временные ряды для прогнозирования

**Качественные методы:**
- Контент-анализ текстовых данных
- SWOT-анализ сильных/слабых сторон
- Экспертные интервью и фокус-группы

### 4. Визуализация результатов

- Дашборды с ключевыми метриками
- Графики трендов и динамики
- Тепловые карты и географические визуализации
- Воронки конверсии

### 5. Выводы и рекомендации

- Краткое резюме основных находок
- Конкретные рекомендации к действию
- Оценка рисков и возможностей
- План дальнейших шагов

Хотите, чтобы я подготовил анализ по конкретной теме или области?`;
  }
  
  // Development/creation related
  if (query.includes('создать') || query.includes('разработать') || query.includes('сделать') || query.includes('построить')) {
    return `## План разработки и реализации

Отлично! Для успешной реализации вашей задачи предлагаю структурированный подход:

### Этап 1: Анализ требований

**Что нужно определить:**
- Функциональные требования (что система должна делать)
- Нефункциональные требования (производительность, безопасность, масштабируемость)
- Ограничения и зависимости
- Целевая аудитория и пользовательские сценарии

### Этап 2: Проектирование

**Ключевые артефакты:**
- Архитектурная схема системы
- Модель данных и структура БД
- API-контракты и интерфейсы
- UX/UI прототипы

### Этап 3: Разработка

**Лучшие практики:**
- Итеративная разработка с короткими спринтами
- Code review и парное программирование
- Автоматизированное тестирование (unit, integration, e2e)
- CI/CD пайплайны для непрерывной доставки

### Этап 4: Тестирование

**Виды тестирования:**
- Функциональное тестирование
- Нагрузочное тестирование
- Тестирование безопасности
- UAT (приёмочное тестирование)

### Этап 5: Внедрение

**Стратегии деплоя:**
- Blue-green deployment для минимизации простоя
- Canary releases для постепенного раскатывания
- Feature flags для управления функционалом

### Этап 6: Поддержка и развитие

- Мониторинг и алертинг
- Сбор обратной связи от пользователей
- Регулярные обновления и улучшения
- Документирование и база знаний

Уточните, пожалуйста, что именно вы хотите создать — это поможет дать более конкретные рекомендации!`;
  }
  
  // Chatbot related — whole words only (avoid matching "обработка", "работает", etc.)
  if (/\b(чат-бот|chatbot|чатбот)\b/i.test(query) || /\bnlp\b/i.test(query)) {
    return `## Разработка чат-бота с использованием NLP

Отличный выбор! Чат-боты с обработкой естественного языка (NLP) — мощный инструмент для автоматизации клиентского сервиса.

### Архитектура современного чат-бота

**Основные компоненты:**

1. **NLU (Natural Language Understanding)**
   - Распознавание намерений (intent recognition)
   - Извлечение сущностей (entity extraction)
   - Анализ тональности (sentiment analysis)

2. **Диалоговый движок**
   - Управление контекстом разговора
   - Слоты и формы для сбора информации
   - Обработка многошаговых сценариев

3. **Интеграции**
   - CRM-системы (Salesforce, Bitrix24)
   - Базы знаний и FAQ
   - Внешние API для получения данных

### Технологический стек

**Готовые платформы:**
- Dialogflow (Google)
- Amazon Lex
- Microsoft Bot Framework
- Rasa (open-source)

**Модели NLP:**
- BERT, GPT для понимания контекста
- spaCy для быстрой обработки
- Transformers для сложных задач

### Рекомендации по реализации

**Фаза 1: MVP (2-4 недели)**
- Определите 5-10 основных сценариев
- Создайте простые диалоги
- Интегрируйте с одним каналом (web-чат)

**Фаза 2: Расширение (1-2 месяца)**
- Добавьте сложные сценарии
- Подключите дополнительные каналы (Telegram, WhatsApp)
- Реализуйте передачу на оператора

**Фаза 3: Оптимизация (ongoing)**
- Анализируйте логи диалогов
- Улучшайте модели на основе данных
- A/B тестирование ответов

### Метрики успеха

- **Containment rate** — % решённых без оператора
- **CSAT** — удовлетворённость клиентов
- **Среднее время ответа**
- **Точность распознавания намерений**

Хотите детализировать какой-то конкретный аспект разработки чат-бота?`;
  }
  
  // Default detailed response
  return `## Анализ вашего запроса

Благодарю за обращение! Позвольте предоставить развёрнутый ответ на ваш вопрос: "${userQuery}"

### Понимание контекста

Ваш запрос затрагивает важную тему, которая требует комплексного рассмотрения. Для качественного ответа необходимо учитывать несколько ключевых аспектов:

**1. Определение целей**
- Какой конечный результат вы хотите достичь?
- Какие ресурсы доступны для реализации?
- Какие есть ограничения по времени?

**2. Анализ текущей ситуации**
- Каковы начальные условия?
- Какой опыт уже имеется в данной области?
- Какие решения уже пробовались?

### Возможные подходы к решению

**Вариант A: Системный подход**
- Детальный анализ всех факторов
- Пошаговый план реализации
- Регулярный мониторинг и корректировка

**Вариант B: Итеративный подход**
- Быстрое создание прототипа
- Тестирование гипотез
- Постепенное улучшение

**Вариант C: Комбинированный подход**
- Сочетание планирования и гибкости
- Адаптация под изменяющиеся условия

### Рекомендации

1. **Уточните задачу** — чем конкретнее формулировка, тем точнее будет решение
2. **Определите приоритеты** — что критически важно, а что можно отложить
3. **Начните с малого** — протестируйте подход на небольшом масштабе

### Следующие шаги

Для более детального ответа, пожалуйста, уточните:
- Контекст и предметную область вашего вопроса
- Конкретные требования или ограничения
- Желаемый формат результата

Я готов предоставить более детальную консультацию по любому из аспектов!`;
}

/**
 * Stream chat completion (for real-time responses)
 * This is a placeholder for future streaming support
 */
export async function* streamChatMessage(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
  // TODO: Implement streaming when needed
  const response = await sendChatMessage(messages, options);
  yield response.content;
}



















