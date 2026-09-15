import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, MessageSquare, Database, Settings, Send, Plus, Trash2, 
  Search, Wifi, WifiOff, BookOpen, Sparkles, Globe, Download,
  ChevronRight, X, Menu, Zap, Bot, User, Layers, ArrowRight,
  Cpu, Shield, Infinity as InfinityIcon
} from 'lucide-react';
import { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import ParticleBackground from './components/ParticleBackground';
import { GlassCard, GlowButton, AnimatedInput, StaggerContainer, StaggerItem } from './components/UI';
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
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [learnTopic, setLearnTopic] = useState('');
  const [learnContent, setLearnContent] = useState('');
  const [learnCategory, setLearnCategory] = useState('general');
  const [learnTags, setLearnTags] = useState('');
  const [learnUrl, setLearnUrl] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [learnStatus, setLearnStatus] = useState('');

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

  useEffect(() => { scrollToBottom(); }, [currentSession?.messages]);

  async function loadData() {
    const [sessionsData, knowledgeData, settings] = await Promise.all([
      getAllSessions(), getAllKnowledge(), getSetting('defaultModel'),
    ]);
    setSessions(sessionsData);
    setKnowledge(knowledgeData);
    if (settings) {
      const provider = AI_PROVIDERS.find(p => p.id === settings);
      if (provider) setSelectedProvider(provider);
    }
  }

  function scrollToBottom() { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }

  async function createNewSession() {
    const session: ChatSession = {
      id: Date.now().toString(), title: 'Новый чат', messages: [],
      createdAt: Date.now(), model: selectedProvider.id,
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
        id: Date.now().toString(), title: inputMessage.slice(0, 50),
        messages: [], createdAt: Date.now(), model: selectedProvider.id,
      };
    }
    const userMessage: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: inputMessage, timestamp: Date.now(),
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
      let context = '';
      if (!selectedProvider.isLocal) {
        const relevantKnowledge = await searchKnowledge(inputMessage);
        if (relevantKnowledge.length > 0) {
          context = relevantKnowledge.slice(0, 3).map(k => `${k.topic}: ${k.content}`).join('\n');
        }
      }
      const response = await selectedProvider.respond(inputMessage, context);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: response, timestamp: Date.now(), model: selectedProvider.name,
      };
      const finalSession = { ...updatedSession, messages: [...updatedSession.messages, assistantMessage] };
      setCurrentSession(finalSession);
      await saveSession(finalSession);
      const updatedSessions = sessions.map(s => s.id === finalSession.id ? finalSession : s);
      if (!sessions.find(s => s.id === finalSession.id)) updatedSessions.unshift(finalSession);
      setSessions(updatedSessions);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `⚠️ Ошибка: ${error.message}. ${!isOnline ? 'Используйте локальную модель.' : 'Попробуйте другую модель.'}`,
        timestamp: Date.now(),
      };
      const errorSession = { ...updatedSession, messages: [...updatedSession.messages, errorMessage] };
      setCurrentSession(errorSession);
      await saveSession(errorSession);
    }
    setIsLoading(false);
  }

  async function learnFromText() {
    if (!learnTopic.trim() || !learnContent.trim()) return;
    await addKnowledge({ topic: learnTopic, content: learnContent, source: 'manual', timestamp: Date.now(), category: learnCategory, tags: learnTags.split(',').map(t => t.trim()).filter(Boolean) });
    setLearnTopic(''); setLearnContent(''); setLearnTags('');
    setLearnStatus('✅ Знание добавлено!');
    setKnowledge(await getAllKnowledge());
    setTimeout(() => setLearnStatus(''), 3000);
  }

  async function learnFromUrl() {
    if (!learnUrl.trim()) return;
    setIsLearning(true); setLearnStatus('🌐 Загружаю данные...');
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(learnUrl)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
      const text = doc.body?.textContent || doc.documentElement?.textContent || '';
      const cleanedText = text.replace(/\s+/g, ' ').trim().slice(0, 5000);
      if (cleanedText.length < 50) { setLearnStatus('⚠️ Недостаточно текста'); setIsLearning(false); return; }
      const title = doc.querySelector('title')?.textContent || learnUrl;
      await addKnowledge({ topic: title, content: cleanedText, source: learnUrl, timestamp: Date.now(), category: 'web', tags: ['internet', 'web'] });
      setLearnUrl(''); setLearnStatus('✅ Данные добавлены!');
      setKnowledge(await getAllKnowledge());
    } catch (error: any) { setLearnStatus(`⚠️ ${error.message}`); }
    setIsLearning(false);
    setTimeout(() => setLearnStatus(''), 5000);
  }

  async function removeKnowledge(id: number) { await deleteKnowledge(id); setKnowledge(await getAllKnowledge()); }
  async function removeSession(id: string) {
    await deleteSession(id);
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSession?.id === id) setCurrentSession(null);
  }

  const filteredKnowledge = searchQuery 
    ? knowledge.filter(k => k.topic.toLowerCase().includes(searchQuery.toLowerCase()) || k.content.toLowerCase().includes(searchQuery.toLowerCase()) || k.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    : knowledge;

  const navItems = [
    { id: 'chat' as Tab, icon: MessageSquare, label: 'Чат с AI', desc: 'Диалог с нейросетью' },
    { id: 'knowledge' as Tab, icon: Database, label: 'База знаний', desc: `${knowledge.length} записей` },
    { id: 'learn' as Tab, icon: BookOpen, label: 'Обучение', desc: 'Добавить знания' },
    { id: 'settings' as Tab, icon: Settings, label: 'Настройки', desc: 'Конфигурация' },
  ];

  return (
    <ParticlesProvider init={async (engine: any) => { await loadSlim(engine); }}>
      <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
        {/* Noise overlay */}
        <div className="noise-overlay" />
        
        {/* Animated Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px]" />
          <ParticleBackground />
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          <motion.aside
            initial={false}
            animate={{ x: sidebarOpen ? 0 : typeof window !== 'undefined' && window.innerWidth >= 768 ? 0 : -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed md:relative z-30 w-72 h-full
              bg-black/40 backdrop-blur-2xl
              border-r border-white/[0.06]
              flex flex-col
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              transition-transform duration-300 md:transition-none
            `}
          >
            {/* Logo */}
            <div className="p-5 border-b border-white/[0.06]">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div 
                  className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
                  whileHover={{ rotate: 180, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Brain className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                </motion.div>
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                    NeuroMind
                  </h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Platform</p>
                </div>
              </motion.div>
            </div>

            {/* Navigation */}
            <nav className="p-3 space-y-1 flex-1">
              <StaggerContainer>
                {navItems.map((item) => (
                  <StaggerItem key={item.id}>
                    <motion.button
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3.5 rounded-xl 
                        transition-all duration-300 group relative overflow-hidden
                        ${activeTab === item.id 
                          ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10' 
                          : 'hover:bg-white/[0.04] border border-transparent'
                        }
                      `}
                    >
                      {activeTab === item.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/10 rounded-xl"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <item.icon className={`w-5 h-5 relative z-10 ${activeTab === item.id ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                      <div className="relative z-10 text-left">
                        <p className={`font-medium text-sm ${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{item.label}</p>
                        <p className="text-[10px] text-gray-600">{item.desc}</p>
                      </div>
                    </motion.button>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-white/[0.06]">
              <GlassCard className="p-3 !rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-amber-400 shadow-lg shadow-amber-400/50'} animate-pulse`} />
                  <span className="text-xs text-gray-400">{isOnline ? 'Онлайн' : 'Офлайн'}</span>
                </div>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{knowledge.length}</p>
                    <p className="text-[10px] text-gray-600">знаний</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{sessions.length}</p>
                    <p className="text-[10px] text-gray-600">чатов</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{AI_PROVIDERS.length}</p>
                    <p className="text-[10px] text-gray-600">моделей</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.aside>
        </AnimatePresence>

        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Header */}
          <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarOpen(true)} 
                className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
              >
                <Menu className="w-5 h-5" />
              </motion.button>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                  {activeTab === 'chat' && <MessageSquare className="w-4 h-4 text-purple-400" />}
                  {activeTab === 'knowledge' && <Database className="w-4 h-4 text-blue-400" />}
                  {activeTab === 'learn' && <BookOpen className="w-4 h-4 text-cyan-400" />}
                  {activeTab === 'settings' && <Settings className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <h2 className="text-sm font-semibold">
                    {activeTab === 'chat' && 'Диалог с AI'}
                    {activeTab === 'knowledge' && 'База знаний'}
                    {activeTab === 'learn' && 'Обучение нейросети'}
                    {activeTab === 'settings' && 'Настройки'}
                  </h2>
                </div>
              </motion.div>
            </div>
            
            {activeTab === 'chat' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <GlowButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowProviderSelect(!showProviderSelect)}
                  icon={<span className="text-base">{selectedProvider.icon}</span>}
                >
                  <span className="hidden sm:inline">{selectedProvider.name}</span>
                  <ChevronRight className="w-3 h-3 rotate-90" />
                </GlowButton>
              </motion.div>
            )}
          </header>

          {/* Provider Selector Dropdown */}
          <AnimatePresence>
            {showProviderSelect && activeTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-16 right-5 z-50 w-96"
              >
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      AI Модели
                    </h3>
                    <button onClick={() => setShowProviderSelect(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {AI_PROVIDERS.map((provider, i) => (
                      <motion.button
                        key={provider.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ x: 4 }}
                        onClick={() => { setSelectedProvider(provider); setShowProviderSelect(false); }}
                        className={`
                          w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left
                          ${selectedProvider.id === provider.id 
                            ? 'bg-purple-500/15 border border-purple-500/30 shadow-lg shadow-purple-500/10' 
                            : 'hover:bg-white/[0.05] border border-transparent'
                          }
                        `}
                      >
                        <span className="text-2xl mt-0.5">{provider.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{provider.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              provider.isLocal 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {provider.isLocal ? '🟢 Офлайн' : '🌐 Онлайн'}
                            </span>
                            <span className="text-[10px] text-gray-600">Бесплатно</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full"
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {!currentSession || currentSession.messages.length === 0 ? (
                        <motion.div 
                          className="flex flex-col items-center justify-center h-full text-center px-4"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <motion.div
                            animate={{ 
                              boxShadow: ['0 0 40px rgba(168,85,247,0.3)', '0 0 80px rgba(99,102,241,0.4)', '0 0 40px rgba(168,85,247,0.3)']
                            }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 flex items-center justify-center mb-8 relative"
                          >
                            <Sparkles className="w-12 h-12 text-white" />
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
                          </motion.div>
                          
                          <motion.h3 
                            className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-violet-300 to-blue-300 bg-clip-text text-transparent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            NeuroMind AI
                          </motion.h3>
                          <motion.p 
                            className="text-gray-500 max-w-md mb-10 text-sm leading-relaxed"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            Выберите AI модель и начните диалог. Локальная модель работает без интернета, а облачные — бесплатно и без ключей.
                          </motion.p>
                          
                          <motion.div 
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            {AI_PROVIDERS.map((p, i) => (
                              <motion.button
                                key={p.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.08 }}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedProvider(p)}
                                className={`
                                  p-4 rounded-2xl border text-left transition-all relative overflow-hidden group
                                  ${selectedProvider.id === p.id 
                                    ? 'border-purple-500/40 bg-purple-500/10 shadow-lg shadow-purple-500/10' 
                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                  }
                                `}
                              >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-2xl">{p.icon}</span>
                                <p className="font-medium text-sm mt-2">{p.name}</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {p.isLocal ? '🟢 Работает офлайн' : '🌐 Бесплатно, без ключей'}
                                </p>
                              </motion.button>
                            ))}
                          </motion.div>

                          {/* Features */}
                          <motion.div 
                            className="flex flex-wrap justify-center gap-6 mt-12"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                          >
                            {[
                              { Icon: Shield, text: 'Приватность', color: 'text-emerald-400' },
                              { Icon: InfinityIcon, text: 'Бесплатно', color: 'text-purple-400' },
                              { Icon: Layers, text: '7 AI моделей', color: 'text-blue-400' },
                              { Icon: Cpu, text: 'Офлайн режим', color: 'text-cyan-400' },
                            ].map((f, i) => {
                              const IconComp = f.Icon;
                              return (
                                <motion.div 
                                  key={f.text}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.9 + i * 0.1 }}
                                  className="flex items-center gap-2 text-xs text-gray-500"
                                >
                                  <IconComp className={`w-4 h-4 ${f.color}`} />
                                  {f.text}
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </motion.div>
                      ) : (
                        <div className="max-w-3xl mx-auto space-y-5">
                          {currentSession.messages.map((msg, i) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                            >
                              {msg.role === 'assistant' && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20"
                                >
                                  <Bot className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                              <motion.div 
                                className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                                  msg.role === 'user' 
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20' 
                                    : 'bg-white/[0.04] backdrop-blur-sm border border-white/[0.08]'
                                }`}
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                {msg.model && (
                                  <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-600'}`}>
                                    {msg.model}
                                  </p>
                                )}
                              </motion.div>
                              {msg.role === 'user' && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
                                >
                                  <User className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                            </motion.div>
                          ))}
                          
                          {isLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3"
                            >
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl px-5 py-4">
                                <div className="flex gap-1.5">
                                  {[0, 1, 2].map(i => (
                                    <motion.div
                                      key={i}
                                      animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                      className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"
                                    />
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/[0.06] bg-black/20 backdrop-blur-xl">
                      <div className="flex gap-2 max-w-3xl mx-auto">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={createNewSession}
                          className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30 transition-all"
                          title="Новый чат"
                        >
                          <Plus className="w-5 h-5 text-gray-400" />
                        </motion.button>
                        <div className="flex-1 relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
                          <input
                            type="text"
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder={`Спросите ${selectedProvider.name}...`}
                            className="relative w-full px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/40 outline-none text-sm placeholder-gray-500 transition-all duration-300"
                          />
                        </div>
                        <GlowButton
                          onClick={sendMessage}
                          disabled={isLoading || !inputMessage.trim()}
                          icon={<Send className="w-4 h-4" />}
                        >
                          <span className="hidden sm:inline">Отправить</span>
                        </GlowButton>
                      </div>
                    </div>
                  </div>

                  {/* Sessions sidebar */}
                  <div className="hidden xl:flex flex-col w-64 border-l border-white/[0.06] bg-black/20 backdrop-blur-xl">
                    <div className="p-4 border-b border-white/[0.06]">
                      <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-wider">История</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      <AnimatePresence>
                        {sessions.map((session, i) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: i * 0.03 }}
                            className={`
                              group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all
                              ${currentSession?.id === session.id 
                                ? 'bg-purple-500/10 border border-purple-500/20' 
                                : 'hover:bg-white/[0.04] border border-transparent'
                              }
                            `}
                            onClick={() => setCurrentSession(session)}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                            <span className="text-xs truncate flex-1 text-gray-300">{session.title}</span>
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={e => { e.stopPropagation(); removeSession(session.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* KNOWLEDGE TAB */}
              {activeTab === 'knowledge' && (
                <motion.div
                  key="knowledge"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col p-5 overflow-hidden"
                >
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Поиск по базе знаний..."
                        className="relative w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/40 outline-none text-sm placeholder-gray-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {filteredKnowledge.length === 0 ? (
                      <motion.div 
                        className="flex flex-col items-center justify-center h-full text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-5 border border-blue-500/20">
                          <Database className="w-10 h-10 text-blue-400" />
                        </div>
                        <p className="text-gray-500 text-sm">
                          {searchQuery ? 'Ничего не найдено' : 'База знаний пуста. Перейдите в "Обучение" чтобы добавить знания.'}
                        </p>
                      </motion.div>
                    ) : (
                      <StaggerContainer className="space-y-3">
                        {filteredKnowledge.map(entry => (
                          <StaggerItem key={entry.id}>
                            <GlassCard className="p-4" hover>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">{entry.topic}</h4>
                                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{entry.content}</p>
                                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-400">
                                      {entry.category}
                                    </span>
                                    {entry.tags.slice(0, 3).map(tag => (
                                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                                        #{tag}
                                      </span>
                                    ))}
                                    {entry.source !== 'manual' && (
                                      <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> web
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeKnowledge(entry.id!)}
                                  className="p-2 rounded-lg hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </GlassCard>
                          </StaggerItem>
                        ))}
                      </StaggerContainer>
                    )}
                  </div>
                </motion.div>
              )}

              {/* LEARN TAB */}
              {activeTab === 'learn' && (
                <motion.div
                  key="learn"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-5"
                >
                  <div className="max-w-2xl mx-auto space-y-5">
                    {/* URL Learning */}
                    <GlassCard className="p-6" delay={0}>
                      <div className="flex items-center gap-3 mb-5">
                        <motion.div 
                          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20"
                          whileHover={{ rotate: 10, scale: 1.05 }}
                        >
                          <Globe className="w-5 h-5 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="font-semibold text-sm">Обучение из интернета</h3>
                          <p className="text-[11px] text-gray-500">Загрузите данные с любого веб-сайта</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <AnimatedInput
                          value={learnUrl}
                          onChange={setLearnUrl}
                          placeholder="https://example.com/article"
                          icon={<Globe className="w-4 h-4" />}
                          className="flex-1"
                        />
                        <GlowButton
                          onClick={learnFromUrl}
                          disabled={isLearning || !learnUrl.trim()}
                          icon={isLearning ? <Zap className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        >
                          {isLearning ? 'Загрузка...' : 'Загрузить'}
                        </GlowButton>
                      </div>
                    </GlassCard>

                    {/* Manual Learning */}
                    <GlassCard className="p-6" delay={0.1}>
                      <div className="flex items-center gap-3 mb-5">
                        <motion.div 
                          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20"
                          whileHover={{ rotate: -10, scale: 1.05 }}
                        >
                          <BookOpen className="w-5 h-5 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="font-semibold text-sm">Добавить знания вручную</h3>
                          <p className="text-[11px] text-gray-500">Введите информацию для базы знаний</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <AnimatedInput value={learnTopic} onChange={setLearnTopic} placeholder="Тема (например: Квантовая физика)" />
                        <AnimatedInput value={learnContent} onChange={setLearnContent} placeholder="Содержание..." multiline rows={5} />
                        <div className="grid grid-cols-2 gap-3">
                          <AnimatedInput value={learnCategory} onChange={setLearnCategory} placeholder="Категория" />
                          <AnimatedInput value={learnTags} onChange={setLearnTags} placeholder="Теги (через запятую)" />
                        </div>
                        <GlowButton onClick={learnFromText} disabled={!learnTopic.trim() || !learnContent.trim()} icon={<Plus className="w-4 h-4" />} className="w-full">
                          Добавить в базу знаний
                        </GlowButton>
                      </div>
                    </GlassCard>

                    {/* Status */}
                    <AnimatePresence>
                      {learnStatus && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className={`p-4 rounded-2xl text-center text-sm font-medium border ${
                            learnStatus.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            learnStatus.includes('⚠️') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {learnStatus}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Stats */}
                    <GlassCard className="p-6" delay={0.2}>
                      <h3 className="font-semibold text-sm mb-5 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        Статистика базы знаний
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { value: knowledge.length, label: 'Записей', color: 'from-purple-400 to-violet-400' },
                          { value: new Set(knowledge.map(k => k.category)).size, label: 'Категорий', color: 'from-blue-400 to-cyan-400' },
                          { value: knowledge.filter(k => k.source !== 'manual').length, label: 'Из интернета', color: 'from-emerald-400 to-green-400' },
                          { value: knowledge.reduce((sum, k) => sum + k.tags.length, 0), label: 'Тегов', color: 'from-pink-400 to-rose-400' },
                        ].map((stat, i) => (
                          <motion.div 
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                          >
                            <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{stat.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-5"
                >
                  <div className="max-w-2xl mx-auto space-y-5">
                    <GlassCard className="p-6" delay={0}>
                      <h3 className="font-semibold text-sm mb-5 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        Модель по умолчанию
                      </h3>
                      <div className="space-y-2">
                        {AI_PROVIDERS.map((provider, i) => (
                          <motion.label
                            key={provider.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ x: 4 }}
                            className={`
                              flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all
                              ${selectedProvider.id === provider.id 
                                ? 'bg-purple-500/10 border border-purple-500/30 shadow-lg shadow-purple-500/5' 
                                : 'hover:bg-white/[0.03] border border-transparent'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="model"
                              value={provider.id}
                              checked={selectedProvider.id === provider.id}
                              onChange={() => setSelectedProvider(provider)}
                              className="accent-purple-500"
                            />
                            <span className="text-xl">{provider.icon}</span>
                            <div>
                              <p className="font-medium text-sm">{provider.name}</p>
                              <p className="text-[11px] text-gray-500">{provider.description}</p>
                            </div>
                          </motion.label>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-6" delay={0.1}>
                      <h3 className="font-semibold text-sm mb-5 flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        Данные
                      </h3>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        Все данные хранятся локально в IndexedDB вашего браузера. Сделайте бэкап перед очисткой данных.
                      </p>
                      <GlowButton
                        variant="success"
                        onClick={() => {
                          const data = { knowledge, sessions, exportDate: new Date().toISOString() };
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'neuromind-backup.json'; a.click();
                          URL.revokeObjectURL(url);
                        }}
                        icon={<Download className="w-4 h-4" />}
                      >
                        Экспорт базы знаний
                      </GlowButton>
                    </GlassCard>

                    <GlassCard className="p-6" delay={0.2}>
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        О NeuroMind
                      </h3>
                      <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
                        <p>🧠 <strong className="text-gray-300">NeuroMind AI</strong> — локальная AI-платформа с базой знаний.</p>
                        <p>• Работает в браузере без установки</p>
                        <p>• Офлайн режим с локальной моделью</p>
                        <p>• 7 бесплатных AI моделей (GPT-4o, Claude, Llama и др.)</p>
                        <p>• Обучение на данных из интернета</p>
                        <p>• Все данные хранятся на вашем устройстве</p>
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ParticlesProvider>
  );
}

export default App;
