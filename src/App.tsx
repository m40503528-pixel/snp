import { useState, useEffect, useRef } from 'react';
import { 
  Brain, MessageSquare, Database, Settings, Send, Plus, Trash2, 
  Search, Wifi, WifiOff, BookOpen, Sparkles, Globe, Download,
  ChevronRight, X, Menu, Zap, Bot, User
} from 'lucide-react';
import { 
  addKnowledge, getAllKnowledge, deleteKnowledge, searchKnowledge,
  saveSession, getAllSessions, deleteSession, getSetting, saveSetting,
  KnowledgeEntry, ChatSession, ChatMessage
} from './db/knowledgeBase';
import { AI_PROVIDERS, AIProvider } from './ai/providers';

type Tab = 'chat' | 'knowledge' | 'learn' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(AI_PROVIDERS[0]);
  const [showProviderSelect, setShowProviderSelect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Knowledge state
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Learn state
  const [learnTopic, setLearnTopic] = useState('');
  const [learnContent, setLearnContent] = useState('');
  const [learnCategory, setLearnCategory] = useState('general');
  const [learnTags, setLearnTags] = useState('');
  const [learnUrl, setLearnUrl] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [learnStatus, setLearnStatus] = useState('');
  
  // Settings
  const [defaultModel, setDefaultModel] = useState('local');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadData();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  async function loadData() {
    const [sessionsData, knowledgeData, settings] = await Promise.all([
      getAllSessions(),
      getAllKnowledge(),
      getSetting('defaultModel'),
    ]);
    
    setSessions(sessionsData);
    setKnowledge(knowledgeData);
    
    if (settings) {
      setDefaultModel(settings);
      const provider = AI_PROVIDERS.find(p => p.id === settings);
      if (provider) setSelectedProvider(provider);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function createNewSession() {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now(),
      model: selectedProvider.id,
    };
    
    setCurrentSession(session);
    await saveSession(session);
    setSessions([session, ...sessions]);
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;
    
    let session = currentSession;
    if (!session) {
      session = {
        id: Date.now().toString(),
        title: inputMessage.slice(0, 50),
        messages: [],
        createdAt: Date.now(),
        model: selectedProvider.id,
      };
    }
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };
    
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMessage],
      title: session.messages.length === 0 ? inputMessage.slice(0, 50) : session.title,
    };
    
    setCurrentSession(updatedSession);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Get context from knowledge base
      let context = '';
      if (!selectedProvider.isLocal) {
        const relevantKnowledge = await searchKnowledge(inputMessage);
        if (relevantKnowledge.length > 0) {
          context = relevantKnowledge.slice(0, 3).map(k => 
            `${k.topic}: ${k.content}`
          ).join('\n');
        }
      }
      
      const response = await selectedProvider.respond(inputMessage, context);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        model: selectedProvider.name,
      };
      
      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      };
      
      setCurrentSession(finalSession);
      await saveSession(finalSession);
      
      // Update sessions list
      const updatedSessions = sessions.map(s => 
        s.id === finalSession.id ? finalSession : s
      );
      if (!sessions.find(s => s.id === finalSession.id)) {
        updatedSessions.unshift(finalSession);
      }
      setSessions(updatedSessions);
      
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Ошибка: ${error.message}. ${!isOnline ? 'Вы офлайн - используйте локальную модель NeuroMind.' : 'Попробуйте другую модель или проверьте подключение.'}`,
        timestamp: Date.now(),
      };
      
      const errorSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMessage],
      };
      
      setCurrentSession(errorSession);
      await saveSession(errorSession);
    }
    
    setIsLoading(false);
  }

  async function learnFromText() {
    if (!learnTopic.trim() || !learnContent.trim()) return;
    
    await addKnowledge({
      topic: learnTopic,
      content: learnContent,
      source: 'manual',
      timestamp: Date.now(),
      category: learnCategory,
      tags: learnTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    
    setLearnTopic('');
    setLearnContent('');
    setLearnTags('');
    setLearnStatus('✅ Знание добавлено!');
    const updatedKnowledge = await getAllKnowledge();
    setKnowledge(updatedKnowledge);
    
    setTimeout(() => setLearnStatus(''), 3000);
  }

  async function learnFromUrl() {
    if (!learnUrl.trim()) return;
    setIsLearning(true);
    setLearnStatus('🌐 Загружаю данные из интернета...');
    
    try {
      // Use a CORS proxy to fetch content
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(learnUrl)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // Extract text from HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove scripts and styles
      doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
      
      const text = doc.body?.textContent || doc.documentElement?.textContent || '';
      const cleanedText = text.replace(/\s+/g, ' ').trim().slice(0, 5000);
      
      if (cleanedText.length < 50) {
        setLearnStatus('⚠️ Не удалось извлечь достаточно текста');
        setIsLearning(false);
        return;
      }
      
      const title = doc.querySelector('title')?.textContent || learnUrl;
      
      await addKnowledge({
        topic: title,
        content: cleanedText,
        source: learnUrl,
        timestamp: Date.now(),
        category: 'web',
        tags: ['internet', 'web'],
      });
      
      setLearnUrl('');
      setLearnStatus('✅ Данные из интернета добавлены в базу знаний!');
      const updatedKnowledge = await getAllKnowledge();
      setKnowledge(updatedKnowledge);
      
    } catch (error: any) {
      setLearnStatus(`⚠️ Ошибка: ${error.message}`);
    }
    
    setIsLearning(false);
    setTimeout(() => setLearnStatus(''), 5000);
  }

  async function removeKnowledge(id: number) {
    await deleteKnowledge(id);
    const updated = await getAllKnowledge();
    setKnowledge(updated);
  }

  async function removeSession(id: string) {
    await deleteSession(id);
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSession?.id === id) {
      setCurrentSession(null);
    }
  }

  async function saveSettings() {
    await saveSetting('defaultModel', defaultModel);
    const provider = AI_PROVIDERS.find(p => p.id === defaultModel);
    if (provider) setSelectedProvider(provider);
  }

  const filteredKnowledge = searchQuery 
    ? knowledge.filter(k => 
        k.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : knowledge;

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-72 h-full transition-transform duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">NeuroMind</h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Локальная нейросеть</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {[
            { id: 'chat' as Tab, icon: MessageSquare, label: 'Чат с AI' },
            { id: 'knowledge' as Tab, icon: Database, label: 'База знаний' },
            { id: 'learn' as Tab, icon: BookOpen, label: 'Обучение' },
            { id: 'settings' as Tab, icon: Settings, label: 'Настройки' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                  : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="mt-auto p-4 border-t border-inherit">
          <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isOnline ? 'Онлайн' : 'Офлайн режим'}</span>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Знаний: {knowledge.length} | Сессий: {sessions.length}
          </p>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-700">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {activeTab === 'chat' && '💬 Чат с AI'}
              {activeTab === 'knowledge' && '📚 База знаний'}
              {activeTab === 'learn' && '🎓 Обучение'}
              {activeTab === 'settings' && '⚙️ Настройки'}
            </h2>
          </div>
          
          {activeTab === 'chat' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProviderSelect(!showProviderSelect)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <span>{selectedProvider.icon}</span>
                <span className="hidden sm:inline">{selectedProvider.name}</span>
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>
          )}
        </header>

        {/* Provider Selector */}
        {showProviderSelect && activeTab === 'chat' && (
          <div className={`absolute top-16 right-4 z-40 w-80 rounded-xl shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-3 space-y-2`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Выберите AI модель</h3>
              <button onClick={() => setShowProviderSelect(false)} className="p-1 rounded hover:bg-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {AI_PROVIDERS.map(provider => (
              <button
                key={provider.id}
                onClick={() => { setSelectedProvider(provider); setShowProviderSelect(false); }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                  selectedProvider.id === provider.id 
                    ? 'bg-purple-600/20 border border-purple-500' 
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{provider.description}</p>
                  {!provider.isLocal && !isOnline && (
                    <p className="text-xs text-orange-400 mt-1">⚠️ Требуется интернет</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex h-full">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!currentSession || currentSession.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6">
                        <Sparkles className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">NeuroMind AI</h3>
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} max-w-md`}>
                        Выберите модель AI и начните диалог. Локальная модель работает без интернета!
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg">
                        {AI_PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedProvider(p)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedProvider.id === p.id 
                                ? 'border-purple-500 bg-purple-500/10' 
                                : darkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-xl">{p.icon}</span>
                            <p className="font-medium text-sm mt-1">{p.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {p.isLocal ? '🟢 Офлайн' : '🌐 Онлайн'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    currentSession.messages.map(msg => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                            : darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                          {msg.model && (
                            <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-purple-200' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {msg.model}
                            </p>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className={`rounded-2xl px-4 py-3 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex gap-2 max-w-4xl mx-auto">
                    <button
                      onClick={createNewSession}
                      className={`p-3 rounded-xl transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title="Новый чат"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder={`Спросите ${selectedProvider.name}...`}
                      className={`flex-1 px-4 py-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700 focus:border-purple-500' : 'bg-white border-gray-200 focus:border-purple-500'} outline-none transition-colors`}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sessions List */}
              <div className={`hidden lg:flex flex-col w-64 border-l ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="p-3 border-b border-inherit">
                  <h3 className="font-semibold text-sm px-2">История чатов</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        currentSession?.id === session.id 
                          ? darkMode ? 'bg-gray-700' : 'bg-gray-200' 
                          : darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentSession(session)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0 text-purple-400" />
                      <span className="text-sm truncate flex-1">{session.title}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeSession(session.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Tab */}
          {activeTab === 'knowledge' && (
            <div className="h-full flex flex-col p-4 overflow-hidden">
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по базе знаний..."
                    className={`w-full pl-10 pr-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} outline-none`}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3">
                {filteredKnowledge.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Database className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400">
                      {searchQuery ? 'Ничего не найдено' : 'База знаний пуста. Перейдите в раздел "Обучение" чтобы добавить знания.'}
                    </p>
                  </div>
                ) : (
                  filteredKnowledge.map(entry => (
                    <div key={entry.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-400">{entry.topic}</h4>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-3`}>
                            {entry.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                              {entry.category}
                            </span>
                            {entry.tags.map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                                #{tag}
                              </span>
                            ))}
                            {entry.source !== 'manual' && (
                              <span className="text-xs text-blue-400 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {entry.source.slice(0, 30)}...
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeKnowledge(entry.id!)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Learn Tab */}
          {activeTab === 'learn' && (
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Learn from URL */}
                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Обучение из интернета</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Загрузите данные с любого веб-сайта</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={learnUrl}
                      onChange={e => setLearnUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} outline-none`}
                    />
                    <button
                      onClick={learnFromUrl}
                      disabled={isLearning || !learnUrl.trim()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLearning ? <Zap className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isLearning ? 'Загрузка...' : 'Загрузить'}
                    </button>
                  </div>
                </div>

                {/* Manual Entry */}
                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Добавить знания вручную</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Введите информацию для базы знаний</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={learnTopic}
                      onChange={e => setLearnTopic(e.target.value)}
                      placeholder="Тема (например: Квантовая физика)"
                      className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} outline-none`}
                    />
                    <textarea
                      value={learnContent}
                      onChange={e => setLearnContent(e.target.value)}
                      placeholder="Содержание... (чем больше информации, тем лучше AI будет отвечать)"
                      rows={5}
                      className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} outline-none resize-none`}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={learnCategory}
                        onChange={e => setLearnCategory(e.target.value)}
                        placeholder="Категория"
                        className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} outline-none`}
                      />
                      <input
                        type="text"
                        value={learnTags}
                        onChange={e => setLearnTags(e.target.value)}
                        placeholder="Теги (через запятую)"
                        className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} outline-none`}
                      />
                    </div>
                    <button
                      onClick={learnFromText}
                      disabled={!learnTopic.trim() || !learnContent.trim()}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить в базу знаний
                    </button>
                  </div>
                </div>

                {/* Status */}
                {learnStatus && (
                  <div className={`p-4 rounded-xl text-center font-medium ${
                    learnStatus.includes('✅') ? 'bg-green-500/20 text-green-400' : 
                    learnStatus.includes('⚠️') ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {learnStatus}
                  </div>
                )}

                {/* Stats */}
                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className="font-semibold mb-4">📊 Статистика базы знаний</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-400">{knowledge.length}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Всего записей</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {new Set(knowledge.map(k => k.category)).size}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Категорий</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {knowledge.filter(k => k.source !== 'manual').length}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Из интернета</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-pink-400">
                        {knowledge.reduce((sum, k) => sum + k.tags.length, 0)}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Тегов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className="font-semibold mb-4">🤖 Модель по умолчанию</h3>
                  <div className="space-y-2">
                    {AI_PROVIDERS.map(provider => (
                      <label key={provider.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        defaultModel === provider.id 
                          ? 'bg-purple-500/20 border border-purple-500' 
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="model"
                          value={provider.id}
                          checked={defaultModel === provider.id}
                          onChange={() => setDefaultModel(provider.id)}
                          className="accent-purple-500"
                        />
                        <span className="text-xl">{provider.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{provider.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{provider.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className="font-semibold mb-4">🎨 Оформление</h3>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Тёмная тема</span>
                    <div className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-purple-600' : 'bg-gray-300'} relative`}
                      onClick={() => setDarkMode(!darkMode)}>
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className="font-semibold mb-4">💾 Данные</h3>
                  <div className="space-y-3">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Все данные хранятся локально в IndexedDB вашего браузера. При удалении данных браузера база знаний будет потеряна.
                    </p>
                    <button
                      onClick={() => {
                        const data = { knowledge, sessions };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'neuromind-backup.json';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Экспорт базы знаний
                    </button>
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium"
                >
                  Сохранить настройки
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
