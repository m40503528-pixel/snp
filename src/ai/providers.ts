import { KnowledgeEntry, searchKnowledge, getAllKnowledge } from '../db/knowledgeBase';

// Local AI - works offline using knowledge base + pattern matching
export class LocalAI {
  private knowledge: KnowledgeEntry[] = [];
  private conversationHistory: { role: string; content: string }[] = [];
  
  constructor() {
    this.initPatterns();
  }
  
  private patterns: { regex: RegExp; responses: string[]; }[] = [];
  
  private initPatterns() {
    this.patterns = [
      { regex: /^(привет|здравствуй|хай|хелло|hello|hi|hey|добрый\s*(день|вечер|утро))/i, responses: [
        'Привет! 👋 Я NeuroMind AI — ваша локальная нейросеть. Чем могу помочь?',
        'Здравствуйте! Рад вас видеть! Я работаю полностью офлайн. Что вас интересует?',
        'Привет! 🧠 Я ваш локальный AI-ассистент. Моя база знаний содержит информацию, которую вы мне дали. Задавайте вопросы!',
      ]},
      { regex: /как (дела|ты|поживаешь|жизнь|настроение)/i, responses: [
        'Отлично! Все системы работают на 100%. Моя база знаний растёт с каждым днём! 📈',
        'Прекрасно! Готов обрабатывать запросы и помогать вам. А у вас как дела?',
        'Функционирую превосходно! Нейронные связи в норме, база знаний доступна. Чем помочь?',
      ]},
      { regex: /что (ты )?(умеешь|можешь|делаешь)|возможности|функции|помощь|help|кто ты/i, responses: [
        '🧠 **Мои возможности:**\n\n• Отвечаю на вопросы из моей базы знаний\n• Ищу информацию по ключевым словам\n• Работаю полностью офлайн\n• Учусь на новых данных, которые вы добавляете\n• Запоминаю контекст разговора\n\n💡 Чем больше знаний вы мне дадите, тем умнее я буду!',
        'Я — NeuroMind, локальная нейросеть! Вот что я умею:\n\n📚 Поиск по базе знаний\n🔍 Семантический поиск по ключевым словам\n💬 Ведение диалога\n📝 Обучение на новых данных\n🌐 Работа без интернета\n\nДобавляйте знания через раздел "Обучение"!',
      ]},
      { regex: /(спасибо|благодар|thanks|thank you|мерси)/i, responses: [
        'Пожалуйста! 😊 Рад был помочь! Если будут ещё вопросы — обращайтесь.',
        'Не за что! Я всегда здесь, когда нужна помощь. 🤖',
        'Рад помочь! 💪 Добавляйте новые знания, и я стану ещё полезнее!',
      ]},
      { regex: /(пока|до свидания|bye|goodbye|прощай|увидимся)/i, responses: [
        'До свидания! 👋 Возвращайтесь, когда понадобится помощь! Моя база знаний всегда доступна.',
        'Пока! Я буду здесь, когда понадоблюсь. Все мои знания сохранены локально. 🧠',
        'До встречи! 💫 Не забывайте добавлять новые знания — так я становлюсь умнее!',
      ]},
      { regex: /сколько (знаний|информации|данных)|размер базы/i, responses: [
        'Количество знаний в моей базе растёт! Проверьте точное число в разделе "База знаний" или "Статистика" в разделе "Обучение".',
      ]},
      { regex: /как (добавить|научить|обучить|загрузить)/i, responses: [
        '📚 **Как меня обучить:**\n\n1. Перейдите в раздел "Обучение"\n2. Вставьте URL статьи — я загружу и сохраню текст\n3. Или введите тему и содержание вручную\n4. Укажите теги для лучшего поиска\n\nПосле этого я смогу использовать эти знания при ответах!',
      ]},
      { regex: /расскажи (о|про) (себе|нейроминд|neuromind)/i, responses: [
        '🧠 **NeuroMind AI** — это локальная нейросеть, которая:\n\n• Работает прямо в вашем браузере\n• Не требует интернета для базовых функций\n• Хранит все данные на вашем устройстве\n• Учитесь на любых данных из интернета\n• Использует несколько AI-моделей (бесплатно!)\n\nЯ постоянно развиваюсь благодаря вашим знаниям!',
      ]},
      { regex: /(расскажи шутку|шутк|анекдот|смешно)/i, responses: [
        '😄 Почему программист ушёл с работы? Потому что он не получил массив (повышение)!',
        '🤖 Два байта встретились. Один спрашивает: "Ты не болен?" Второй отвечает: "Нет, просто бит не в ту сторону."',
        '💻 — Сколько программистов нужно, чтобы вкрутить лампочку?\n— Ни одного, это аппаратная проблема!',
        '🧠 Мой нейрон: "Я думаю, следовательно... перезапущусь."',
      ]},
      { regex: /(время|дата|день|число|сегодня)/i, responses: [
        `Сейчас ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Время: ${new Date().toLocaleTimeString('ru-RU')}`,
      ]},
    ];
  }
  
  async loadKnowledge(): Promise<void> {
    this.knowledge = await getAllKnowledge();
  }
  
  private detectIntent(input: string): { matched: boolean; response?: string } {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(input)) {
        const responses = pattern.responses;
        return { matched: true, response: responses[Math.floor(Math.random() * responses.length)] };
      }
    }
    return { matched: false };
  }
  
  async respond(input: string): Promise<string> {
    // Check patterns first
    const intentResult = this.detectIntent(input);
    if (intentResult.matched && intentResult.response) {
      return intentResult.response;
    }
    
    // Search knowledge base
    const results = await searchKnowledge(input);
    
    if (results.length > 0) {
      const topResults = results.slice(0, 3);
      let response = `📚 Найдено в базе знаний (${results.length} результатов):\n\n`;
      
      topResults.forEach((entry, index) => {
        const content = entry.content.length > 500 ? entry.content.slice(0, 500) + '...' : entry.content;
        response += `**${entry.topic}**\n${content}\n`;
        if (entry.tags.length > 0) {
          response += `Теги: ${entry.tags.map(t => `#${t}`).join(' ')}\n`;
        }
        if (index < topResults.length - 1) response += '\n---\n\n';
      });
      
      if (results.length > 3) {
        response += `\n\n...и ещё ${results.length - 3} результатов. Уточните запрос для более точного поиска.`;
      }
      
      return response;
    }
    
    // Smart fallback
    const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (words.length === 0) {
      return 'Я вас не совсем понял. Попробуйте переформулировать вопрос или добавьте больше знаний в мою базу! 🧠';
    }
    
    return `🤔 Я пока не знаю ответа на вопрос: "${input}"\n\n💡 **Как меня научить:**\n1. Перейдите в раздел **"Обучение"**\n2. Добавьте информацию по теме "${words[0]}"\n3. Или загрузите статью из интернета по URL\n\nПосле этого я смогу отвечать на похожие вопросы!\n\n📊 Сейчас в моей базе: ${this.knowledge.length} записей`;
  }
}

// HuggingFace API (free, no key required)
export async function queryHuggingFace(model: string, input: string, context?: string): Promise<string> {
  const API_URL = `https://api-inference.huggingface.co/models/${model}`;
  
  let prompt: string;
  if (context) {
    prompt = `<s>[INST] Используй следующий контекст для ответа на вопрос пользователя. Отвечай на русском языке.\n\nКонтекст: ${context}\n\nВопрос: ${input} [/INST]`;
  } else {
    prompt = `<s>[INST] ${input} [/INST]`;
  }
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { 
        max_new_tokens: 512, 
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      }
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 503) {
      throw new Error('Модель загружается, попробуйте через минуту...');
    }
    if (response.status === 429) {
      throw new Error('Превышен лимит запросов. Подождите или используйте локальную модель.');
    }
    throw new Error(errorData.error || `Ошибка API: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  if (data.generated_text) {
    return data.generated_text;
  }
  if (data.error) {
    throw new Error(data.error);
  }
  
  return 'Не удалось получить ответ от модели.';
}

// DuckDuckGo AI Chat (free, no key)
export async function queryDuckDuckGo(model: string, input: string, context?: string): Promise<string> {
  // DDG AI Chat uses different models: gpt-4o-mini, claude-3-haiku, llama-3.1-70b, mixtral-8x7b
  const modelMap: Record<string, string> = {
    'ddg-gpt4': 'gpt-4o-mini',
    'ddg-claude': 'claude-3-haiku-20240307',
    'ddg-llama': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    'ddg-mixtral': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  };

  const messages: any[] = [];
  
  if (context) {
    messages.push({
      role: 'system',
      content: `Ты полезный AI-ассистент. Отвечай на русском языке. Используй следующий контекст из базы знаний пользователя:\n\n${context}`
    });
  } else {
    messages.push({
      role: 'system',
      content: 'Ты полезный AI-ассистент NeuroMind. Отвечай на русском языке, будь информативным и дружелюбным.'
    });
  }
  
  messages.push({ role: 'user', content: input });
  
  try {
    const vqdToken = await getDuckDuckGoToken();
    
    const response = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vqd-4': vqdToken,
      },
      body: JSON.stringify({
        model: modelMap[model] || model,
        messages: messages,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }
    
    const text = await response.text();
    // Parse SSE response
    const lines = text.split('\n').filter(l => l.startsWith('data: '));
    let result = '';
    
    for (const line of lines) {
      const jsonStr = line.slice(6);
      if (jsonStr === '[DONE]') break;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) {
          result += parsed.message;
        }
      } catch {}
    }
    
    return result || 'Не удалось получить ответ.';
  } catch (error) {
    throw error;
  }
}

let ddgTokenCache = '';
async function getDuckDuckGoToken(): Promise<string> {
  if (ddgTokenCache) return ddgTokenCache;
  
  try {
    const statusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
      headers: { 'x-vqd-accept': '1' },
    });
    const token = statusRes.headers.get('x-vqd-4') || '';
    ddgTokenCache = token;
    return token;
  } catch {
    return '';
  }
}

// Free AI providers
export interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  isLocal: boolean;
  respond: (input: string, context?: string) => Promise<string>;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'local',
    name: 'NeuroMind Local',
    description: 'Локальная нейросеть. Работает офлайн, использует вашу базу знаний.',
    icon: '🧠',
    isLocal: true,
    respond: async (input: string) => {
      const ai = new LocalAI();
      await ai.loadKnowledge();
      return ai.respond(input);
    }
  },
  {
    id: 'ddg-gpt4',
    name: 'GPT-4o Mini',
    description: 'Бесплатный доступ к GPT-4o Mini через DuckDuckGo AI Chat.',
    icon: '🤖',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryDuckDuckGo('ddg-gpt4', input, context);
    }
  },
  {
    id: 'ddg-claude',
    name: 'Claude 3 Haiku',
    description: 'Бесплатный Claude 3 Haiku через DuckDuckGo. Быстрый и умный.',
    icon: '🎭',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryDuckDuckGo('ddg-claude', input, context);
    }
  },
  {
    id: 'ddg-llama',
    name: 'Llama 3.3 70B',
    description: 'Meta Llama 3.3 — мощная открытая модель от Meta.',
    icon: '🦙',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryDuckDuckGo('ddg-llama', input, context);
    }
  },
  {
    id: 'ddg-mixtral',
    name: 'Mixtral 8x7B',
    description: 'Mistral Mixtral — экспертная модель от Mistral AI.',
    icon: '🌊',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryDuckDuckGo('ddg-mixtral', input, context);
    }
  },
  {
    id: 'hf-mistral',
    name: 'Mistral 7B (HF)',
    description: 'Mistral через HuggingFace Inference API.',
    icon: '⚡',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryHuggingFace('mistralai/Mistral-7B-Instruct-v0.3', input, context);
    }
  },
  {
    id: 'hf-qwen',
    name: 'Qwen 2.5 (HF)',
    description: 'Qwen 2.5 — мультиязычная модель с хорошей поддержкой русского.',
    icon: '🐉',
    isLocal: false,
    respond: async (input: string, context?: string) => {
      return queryHuggingFace('Qwen/Qwen2.5-7B-Instruct', input, context);
    }
  },
];
