import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Car, 
  Wrench, 
  FileText, 
  Fuel, 
  Receipt, 
  Bell, 
  User, 
  CornerDownLeft,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isPlaceholder?: boolean;
}

interface AIAssistantViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ onNavigateTab }) => {
  const { selectedVehicle, vehicles } = useVehicle();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions from specification (Section 6)
  const suggestedQuestions = [
    'When is my next service?',
    'When does my insurance expire?',
    "What's my current mileage?",
    'How much did I spend this month?',
    'Show my recent service history',
    'Which documents are expiring soon?',
  ];

  // Quick Insights cards from specification (Section 9)
  const quickInsights = [
    {
      id: 'overview',
      title: 'Vehicle Overview',
      desc: 'Specs, odometer & active status',
      icon: Car,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/30',
      prompt: 'Give me a summary of my current vehicle',
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      desc: 'Service logs & intervals',
      icon: Wrench,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
      prompt: 'When is my next scheduled maintenance or service?',
    },
    {
      id: 'documents',
      title: 'Documents',
      desc: 'Insurance, PUC & registration',
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
      prompt: 'Which vehicle documents or certificates expire soon?',
    },
    {
      id: 'fuel',
      title: 'Fuel & Mileage',
      desc: 'Consumption & fill-ups',
      icon: Fuel,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      prompt: 'What is my average mileage and fuel consumption?',
    },
    {
      id: 'expenses',
      title: 'Expenses',
      desc: 'Cost breakdown & receipts',
      icon: Receipt,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      prompt: 'Break down my recent vehicle expenses',
    },
    {
      id: 'reminders',
      title: 'Reminders',
      desc: 'Upcoming deadlines & tasks',
      icon: Bell,
      color: 'text-red-400',
      bgColor: 'bg-red-950/40 border-red-500/30',
      prompt: 'Show all upcoming vehicle reminders and alerts',
    },
  ];

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Click suggestion chip -> Populates chat input & focuses
  const handleSelectSuggestion = (question: string) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  // Send message handler connected to Gemini backend
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation context from previous messages
      const historyPayload = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (res.status === 503 && data.unconfigured) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: data.response || 'AutoCare AI is not connected yet. Please configure the Gemini API connection.',
            timestamp: replyTime,
          },
        ]);
      } else if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: data.error || "Sorry, I couldn't process that request right now. Please try again.",
            timestamp: replyTime,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: data.response || 'I could not generate a response. Please try again.',
            timestamp: replyTime,
          },
        ]);
      }
    } catch {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: "Sorry, I couldn't process that request right now. Please check your connection and try again.",
          timestamp: replyTime,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    setInputMessage('');
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* ================================================== */}
      {/* 1. ASSISTANT HEADER (Section 3 & 10) */}
      {/* ================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-[#0d131f] via-[#101726] to-[#0d131f] p-6 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Assistant AI Avatar Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0c101a] flex items-center justify-center text-cyan-400">
                <Bot className="w-7 h-7" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>AutoCare AI</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  AI Assistant
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ready to help</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Your intelligent vehicle companion
              </p>
            </div>
          </div>

          {/* Active Vehicle Context Badge (Section 10) */}
          <div className="p-3 rounded-2xl bg-[#090c13]/80 border border-gray-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Current Vehicle
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px]">
                  {selectedVehicle ? selectedVehicle.name : 'No Vehicle Selected'}
                </div>
                {selectedVehicle && (
                  <div className="text-[11px] text-cyan-300 font-mono">
                    {selectedVehicle.vehicleNumber}
                  </div>
                )}
              </div>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('vehicles')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
              >
                Change →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. MAIN LAYOUT: CHAT INTERFACE & QUICK INSIGHTS */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Viewport (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-[#0f131c] border border-gray-800/80 shadow-xl overflow-hidden min-h-[580px] h-[650px]">
          {/* Chat Header Bar */}
          <div className="px-6 py-3.5 border-b border-gray-800/80 bg-[#0c1018] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-white">Conversation</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 font-mono text-[11px]">
                {messages.length === 0 ? 'New Session' : `${Math.ceil(messages.length / 2)} message pair(s)`}
              </span>
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleClearConversation}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-gray-800/80"
                title="Clear current conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Chat</span>
              </button>
            )}
          </div>

          {/* Chat Messages / Empty State Viewport */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              /* Empty Conversation State (Section 5) */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/10">
                    🚘
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black p-1.5 rounded-xl shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    How can I help with your vehicle?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Ask questions about your vehicle, maintenance, documents, fuel, expenses, and reminders.
                  </p>
                </div>

                {/* Suggested Questions Grid (Section 6) */}
                <div className="w-full space-y-2.5 text-left pt-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Suggested Questions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(question)}
                        className="p-3 rounded-2xl bg-[#0a0d14] hover:bg-[#121824] border border-gray-800 hover:border-cyan-500/40 text-left text-xs text-gray-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{question}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-2">
                  <Info className="w-3.5 h-3.5 text-gray-500" />
                  <span>Click any question to prefill the chat input below.</span>
                </div>
              </div>
            ) : (
              /* Message List (Section 8) */
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* Message Bubble Container */}
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      {msg.sender === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-md">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-lg shadow-cyan-500/10'
                            : 'bg-[#0a0d14] border border-gray-800/90 text-gray-200 rounded-bl-none shadow-md'
                        }`}
                      >
                        {msg.sender === 'assistant' && (
                          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-800/60 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            <span>AutoCare AI</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-500 px-2 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{msg.timestamp}</span>
                    </span>
                  </div>
                ))}

                {/* Animated Thinking Bubble when waiting for Gemini */}
                {isLoading && (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-md">
                        <Bot className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="p-4 rounded-3xl bg-[#0a0d14] border border-gray-800/90 text-gray-200 rounded-bl-none shadow-md">
                        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-800/60 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          <span>AutoCare AI</span>
                          <span className="text-[10px] text-gray-400 normal-case font-normal">Thinking...</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Bar (Section 7) */}
          <div className="p-4 bg-[#0a0d14] border-t border-gray-800/80">
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                disabled={isLoading}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isLoading ? "AutoCare AI is responding..." : "Ask AutoCare anything about your vehicle..."}
                className="w-full bg-[#0d1017] border border-gray-700/80 focus:border-cyan-400 rounded-2xl pl-4 pr-12 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-500/20"
                title="Send Message"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{isLoading ? "Thinking..." : "Send"}</span>
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 px-1">
              <span>Press <kbd className="bg-gray-800 px-1 py-0.5 rounded text-gray-400 font-mono text-[10px]">Enter</kbd> to submit</span>
              <span className="text-cyan-500/80 font-medium">AutoCare AI Assistant</span>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Insights & Assistant Controls (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Insights Cards (Section 9) */}
          <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Quick Insights</h3>
              </div>
              <span className="text-[11px] text-gray-400">Click to ask</span>
            </div>

            <p className="text-xs text-gray-400">
              Select any topic below to prefill automotive queries for your active vehicle.
            </p>

            <div className="space-y-2.5">
              {quickInsights.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    onClick={() => handleSelectSuggestion(card.prompt)}
                    className="w-full p-3 rounded-2xl bg-[#0a0d14] hover:bg-[#121824] border border-gray-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${card.bgColor} ${card.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {card.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assistant Info / Architecture Preview Card */}
          <div className="p-6 rounded-3xl bg-[#0f131c] border border-gray-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Vehicle Data Isolation</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              When full model intelligence is enabled in the next phase, queries will operate strictly on your authenticated Firestore documents and selected vehicle.
            </p>
            <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>No external data sharing or third-party tracking.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
