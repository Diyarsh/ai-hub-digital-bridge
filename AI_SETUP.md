# Настройка AI для чата

## Быстрый старт

1. **Создайте файл `.env` в корне проекта** (скопируйте из `.env.example` если он есть):

```env
VITE_OPENAI_API_KEY=your-openai-api-key-here
VITE_AI_MODEL=gpt-3.5-turbo
```

2. **Получите API ключ OpenAI:**
   - Перейдите на https://platform.openai.com/api-keys
   - Создайте новый API ключ
   - Скопируйте его в файл `.env`

3. **Перезапустите dev сервер:**
   ```bash
   npm run dev
   ```

## Поддерживаемые провайдеры

### OpenAI (по умолчанию)
```env
VITE_OPENAI_API_KEY=sk-...
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_BASE_URL=https://api.openai.com/v1
VITE_AI_MODEL=gpt-3.5-turbo
```

### DeepSeek (OpenAI-совместимый API)
```env
VITE_OPENAI_API_KEY=sk-...
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_BASE_URL=https://api.deepseek.com/v1
VITE_AI_MODEL=deepseek-chat
```

### Кастомный прокси/сервер
```env
VITE_OPENAI_API_KEY=your-api-key
VITE_AI_PROVIDER=custom
VITE_OPENAI_API_BASE_URL=https://your-proxy.com/v1
VITE_AI_MODEL=your-model-name
```

## Доступные модели

- `gpt-3.5-turbo` - быстрая и экономичная модель (по умолчанию)
- `gpt-4` - более мощная модель
- `gpt-4-turbo` - улучшенная версия GPT-4
- `deepseek-chat` - альтернатива от DeepSeek

## Переводчик (AI-Studio → Инструменты)

Рекомендуемый **бесплатный** вариант для локальной разработки — **Groq**:

```bash
cp .env.example .env
```

```env
VITE_OPENAI_API_KEY=gsk_...
VITE_OPENAI_API_BASE_URL=https://api.groq.com/openai/v1
VITE_AI_MODEL=llama-3.3-70b-versatile
```

Ключ: https://console.groq.com/keys

В dev-режиме запросы идут через Vite-прокси `/api/ai` (без CORS-ошибок в браузере).

## Без API ключа

Если API ключ не настроен, чат будет работать в демо-режиме с моковыми ответами.

## Устранение проблем

### Ошибка "Invalid API key"
- Проверьте, что ключ правильно указан в `.env`
- Убедитесь, что файл `.env` находится в корне проекта
- Перезапустите dev сервер после изменения `.env`

### Ошибка сети
- Проверьте интернет соединение
- Для кастомных API проверьте URL в `VITE_OPENAI_API_BASE_URL`
- Убедитесь, что API поддерживает CORS или используйте прокси

### Долгие ответы
- Попробуйте другую модель (например, `gpt-3.5-turbo` вместо `gpt-4`)
- Уменьшите `maxTokens` в настройках чата



















