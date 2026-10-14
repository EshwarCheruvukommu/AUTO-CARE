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
  RotateCcw, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Clock, 
  TrendingUp, 
  Gauge, 
  Tag, 
  Zap, 
  Droplet, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Pause,
  Play,
  Loader2,
  X,
  Radio,
  Activity,
  Headphones
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { 
  startListening, 
  stopSpeaking, 
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  speakWithWebSpeech,
  playSpokenResponse, 
  VoiceState 
} from '../../services/voiceAssistant';
import { GeminiLiveVoiceClient, LiveVoiceStatus, LiveVoiceErrorCategory } from '../../services/liveVoiceClient';
import { GeminiLiveVoicePanel } from './GeminiLiveVoicePanel';
import { classifyQuestionIntent, getFastDirectAnswer } from '../../services/fastAnswers';

// Subtle blue/cyan audio wave visualizer
const AudioVisualizer: React.FC<{ isSpeaking?: boolean; isListening?: boolean }> = ({ isSpeaking, isListening }) => {
  const bars = [35, 75, 100, 60, 85, 45, 95, 55];
  return (
    <div className="flex items-center gap-0.5 h-4 px-1" aria-hidden="true">
      {bars.map((height, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full transition-all duration-150 ${
            isListening
              ? 'bg-[#00D9FF] animate-pulse'
              : isSpeaking
              ? 'bg-gradient-to-t from-[#1677FF] to-[#00D9FF] animate-bounce'
              : 'bg-[#71839A]/30 h-1'
          }`}
          style={{
            height: isListening || isSpeaking ? `${height}%` : '4px',
            animationDelay: `${i * 80}ms`,
            animationDuration: isListening ? '500ms' : '400ms',
          }}
        />
      ))}
    </div>
  );
};

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
  const { currentUser } = useAuth();
  const { 
    selectedVehicle, 
    vehicles,
    documents,
    services,
    fuelRecords,
    expenses,
    allReminders
  } = useVehicle();

  const [inputMessage, setInputMessage] = useState('');
  // Isolated conversations per vehicle ID to guarantee zero cross-vehicle data contamination
  const [conversationsByVehicle, setConversationsByVehicle] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Assistant state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceErrorCategory, setVoiceErrorCategory] = useState<LiveVoiceErrorCategory | null>(null);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const cancelListeningRef = useRef<(() => void) | null>(null);

  // Gemini Live API state
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveVoiceStatus>('disconnected');
  const [isLiveMuted, setIsLiveMuted] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const [liveVolumeSpeaker, setLiveVolumeSpeaker] = useState<'user' | 'model'>('user');
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveModelTranscript, setLiveModelTranscript] = useState('');
  const liveUserTranscriptRef = useRef('');
  const currentLiveModelMsgIdRef = useRef<string | null>(null);
  const liveClientRef = useRef<GeminiLiveVoiceClient | null>(null);

  const activeVehicleId = selectedVehicle?.id || '';
  const messages = activeVehicleId ? (conversationsByVehicle[activeVehicleId] || []) : [];

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // The 8 recommended natural questions as requested
  const defaultSuggestedQuestions = [
    'What is my current odometer reading?',
    'What was my last service?',
    'When is my next service due?',
    'What was my last fuel entry?',
    'How much did I spend on fuel?',
    'How much have I spent?',
    'What reminders do I have?',
    'When does my insurance expire?',
  ];

  const quickCategories = [
    'ALL',
    'VEHICLE',
    'SERVICE',
    'FUEL',
    'EXPENSES',
    'DOCUMENTS',
    'REMINDERS',
  ] as const;

  const allQuickQuestions = [
    // 1. VEHICLE
    {
      id: 'v_odo',
      category: 'VEHICLE',
      question: 'What is my current odometer reading?',
      desc: 'Checks latest verified odometer in KM',
      icon: Gauge,
      color: 'text-[#00D9FF]',
      bgColor: 'bg-[#1677FF]/15 border-[#1677FF]/35',
    },
    {
      id: 'v_which',
      category: 'VEHICLE',
      question: 'What vehicle am I using?',
      desc: 'Active vehicle make, model & variant',
      icon: Car,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
    },
    {
      id: 'v_reg',
      category: 'VEHICLE',
      question: 'What is my vehicle registration number?',
      desc: 'Official vehicle registration plate',
      icon: Tag,
      color: 'text-[#00D9FF]',
      bgColor: 'bg-[#1677FF]/15 border-[#1677FF]/35',
    },
    {
      id: 'v_fuel',
      category: 'VEHICLE',
      question: 'What fuel does my vehicle use?',
      desc: 'Petrol, Diesel, EV, or Hybrid spec',
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
    },

    // 2. SERVICE
    {
      id: 's_last',
      category: 'SERVICE',
      question: 'What was my last service?',
      desc: 'Latest maintenance date, work & center',
      icon: Wrench,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
    },
    {
      id: 's_next',
      category: 'SERVICE',
      question: 'When is my next service due?',
      desc: 'Scheduled service maintenance interval',
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
    },
    {
      id: 's_cost',
      category: 'SERVICE',
      question: 'How much did my last service cost?',
      desc: 'Total billed cost on latest service',
      icon: Receipt,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
    },
    {
      id: 's_count',
      category: 'SERVICE',
      question: 'How many services have I had?',
      desc: 'Total recorded maintenance history visits',
      icon: CheckCircle2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
    },

    // 3. FUEL
    {
      id: 'f_last',
      category: 'FUEL',
      question: 'What was my last fuel entry?',
      desc: 'Most recent refill volume, cost & type',
      icon: Fuel,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
    },
    {
      id: 'f_spent',
      category: 'FUEL',
      question: 'How much did I spend on fuel?',
      desc: 'Cumulative fuel refill expenditure',
      icon: Droplet,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
    },
    {
      id: 'f_mileage',
      category: 'FUEL',
      question: 'What is my average mileage?',
      desc: 'True interval km/L from refuel records',
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
    },
    {
      id: 'f_bought',
      category: 'FUEL',
      question: 'How much fuel did I buy?',
      desc: 'Total fuel volume logged in litres',
      icon: Fuel,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
    },

    // 4. EXPENSES
    {
      id: 'e_spent',
      category: 'EXPENSES',
      question: 'How much have I spent?',
      desc: 'Total recorded vehicle spending to date',
      icon: Receipt,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
    },
    {
      id: 'e_latest',
      category: 'EXPENSES',
      question: 'What is my latest expense?',
      desc: 'Most recent expense category & amount',
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
    },
    {
      id: 'e_most',
      category: 'EXPENSES',
      question: 'Where am I spending the most?',
      desc: 'Top category with highest expenses',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
    },

    // 5. DOCUMENTS
    {
      id: 'd_expires_next',
      category: 'DOCUMENTS',
      question: 'Which document expires next?',
      desc: 'Earliest expiring compliance document',
      icon: FileText,
      color: 'text-sky-400',
      bgColor: 'bg-sky-950/40 border-sky-500/30',
    },
    {
      id: 'd_insurance',
      category: 'DOCUMENTS',
      question: 'When does my insurance expire?',
      desc: 'Active insurance policy expiration date',
      icon: ShieldCheck,
      color: 'text-sky-400',
      bgColor: 'bg-sky-950/40 border-sky-500/30',
    },
    {
      id: 'd_all',
      category: 'DOCUMENTS',
      question: 'What documents do I have?',
      desc: 'Overview of stored Insurance, PUC & RC',
      icon: FileCheck,
      color: 'text-sky-400',
      bgColor: 'bg-sky-950/40 border-sky-500/30',
    },

    // 6. REMINDERS
    {
      id: 'r_all',
      category: 'REMINDERS',
      question: 'What reminders do I have?',
      desc: 'Active overdue and upcoming task reminders',
      icon: Bell,
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/40 border-rose-500/30',
    },
    {
      id: 'r_due',
      category: 'REMINDERS',
      question: 'What is due next?',
      desc: 'Earliest upcoming maintenance task',
      icon: Clock,
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/40 border-rose-500/30',
    },
    {
      id: 'r_overdue',
      category: 'REMINDERS',
      question: 'Do I have any overdue reminders?',
      desc: 'Check for overdue service or document items',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/40 border-rose-500/30',
    },
  ];

  // Active list shown in Quick Questions based on selected tab
  const displayedQuickQuestions = selectedCategory === 'ALL'
    ? allQuickQuestions.filter(q => defaultSuggestedQuestions.includes(q.question))
    : allQuickQuestions.filter(q => q.category === selectedCategory);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up voice assistant audio, Live API connection and listener on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      cancelListeningRef.current?.();
      if (liveClientRef.current) {
        liveClientRef.current.stop();
        liveClientRef.current = null;
      }
    };
  }, []);

  // Click suggestion chip -> Triggers question directly
  const handleSelectSuggestion = (question: string) => {
    handleSendMessage(undefined, question);
  };

  // Send message handler connected to Gemini backend
  const handleSendMessage = async (e?: React.FormEvent, customText?: string, speak?: boolean) => {
    if (e) e.preventDefault();
    const trimmed = (customText !== undefined ? customText : inputMessage).trim();
    if (!trimmed || isLoading) return;

    // Interrupt any active voice playback when a new message is sent
    stopSpeaking();
    setActiveAudioMessageId(null);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!currentUser) {
      if (activeVehicleId) {
        setConversationsByVehicle((prevMap) => ({
          ...prevMap,
          [activeVehicleId]: [
            ...(prevMap[activeVehicleId] || []),
            {
              id: `user-${Date.now()}`,
              sender: 'user',
              text: trimmed,
              timestamp: timeString,
            },
            {
              id: `ai-${Date.now()}`,
              sender: 'assistant',
              text: 'Please sign in to ask AutoCare AI about your vehicle records.',
              timestamp: timeString,
            },
          ],
        }));
      }
      setInputMessage('');
      setVoiceState('idle');
      return;
    }

    if (!selectedVehicle) {
      setInputMessage('');
      setVoiceState('idle');
      return;
    }

    const requestVehicleId = selectedVehicle.id;

    // 1. Add user message to this vehicle's thread
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: timeString,
    };

    setConversationsByVehicle((prevMap) => ({
      ...prevMap,
      [requestVehicleId]: [...(prevMap[requestVehicleId] || []), userMsg],
    }));
    setInputMessage('');

    // PERFORMANCE OPTIMIZATION: FAST PATH FOR DETERMINISTIC FACTUAL QUESTIONS
    // If the question is a direct query (odometer, registration, last service, fuel entries, etc.)
    // answer instantly directly from active vehicle state without sending the full database to Gemini.
    const intent = classifyQuestionIntent(trimmed);
    const directAnswer = getFastDirectAnswer(intent, {
      vehicle: selectedVehicle,
      documents,
      services,
      fuelRecords,
      expenses,
      reminders: allReminders,
    });

    if (directAnswer) {
      const aiMsgId = `ai-${Date.now()}`;
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setConversationsByVehicle((prevMap) => ({
        ...prevMap,
        [requestVehicleId]: [
          ...(prevMap[requestVehicleId] || []),
          {
            id: aiMsgId,
            sender: 'assistant',
            text: directAnswer,
            timestamp: replyTime,
          },
        ],
      }));

      // If voice was requested, speak immediately with Web Speech Synthesis API
      if (speak) {
        setVoiceState('speaking');
        setIsPaused(false);
        setActiveAudioMessageId(aiMsgId);
        speakWithWebSpeech(directAnswer, {
          onStart: () => {
            setVoiceState('speaking');
            setIsPaused(false);
            setActiveAudioMessageId(aiMsgId);
          },
          onEnd: () => {
            setVoiceState('idle');
            setIsPaused(false);
            setActiveAudioMessageId(null);
          },
          onPause: () => setIsPaused(true),
          onResume: () => setIsPaused(false),
          onError: () => {
            setVoiceState('idle');
            setActiveAudioMessageId(null);
          },
        });
      } else {
        setVoiceState('idle');
        setIsPaused(false);
      }
      setIsLoading(false);
      return;
    }

    // SMART PATH: Complex reasoning, trip readiness, recommendations, or deep analyses require Gemini
    setIsLoading(true);
    if (speak) {
      setVoiceState('understanding');
    }

    try {
      // Get fresh Firebase ID token for authentication
      const idToken = await currentUser.getIdToken();

      // Build conversation context strictly from this vehicle's previous messages
      const currentHistory = conversationsByVehicle[requestVehicleId] || [];
      const historyPayload = currentHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          vehicleId: requestVehicleId,
          speak: Boolean(speak),
          clientVehicleData: {
            vehicle: selectedVehicle,
            documents,
            services,
            fuelRecords,
            expenses,
            reminders: allReminders,
          },
        }),
      });

      const data = await res.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let replyText = '';
      if (res.status === 503 && data.unconfigured) {
        replyText = data.response || 'AutoCare AI is not connected yet. Please configure the Gemini API connection.';
      } else if (!res.ok) {
        replyText = data.error || "Sorry, I couldn't retrieve your vehicle information right now. Please try again.";
      } else {
        replyText = data.response || 'I could not generate a response. Please try again.';
      }

      const aiMsgId = `ai-${Date.now()}`;
      setConversationsByVehicle((prevMap) => ({
        ...prevMap,
        [requestVehicleId]: [
          ...(prevMap[requestVehicleId] || []),
          {
            id: aiMsgId,
            sender: 'assistant',
            text: replyText,
            timestamp: replyTime,
          },
        ],
      }));

      // If speak was requested, play natural female voice response
      if (speak && replyText) {
        setVoiceState('speaking');
        setIsPaused(false);
        setActiveAudioMessageId(aiMsgId);
        playSpokenResponse(
          replyText,
          data.audioBase64,
          () => {
            setVoiceState('speaking');
            setIsPaused(false);
            setActiveAudioMessageId(aiMsgId);
          },
          () => {
            setVoiceState('idle');
            setIsPaused(false);
            setActiveAudioMessageId(null);
          },
          () => {
            setIsPaused(true);
          },
          () => {
            setIsPaused(false);
          }
        );
      } else {
        setVoiceState('idle');
        setIsPaused(false);
      }
    } catch {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorReply = "Sorry, I couldn't retrieve your vehicle information right now. Please check your connection and try again.";
      setConversationsByVehicle((prevMap) => ({
        ...prevMap,
        [requestVehicleId]: [
          ...(prevMap[requestVehicleId] || []),
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: errorReply,
            timestamp: replyTime,
          },
        ],
      }));
      if (speak) {
        playSpokenResponse(errorReply);
      }
      setVoiceState('idle');
      setIsPaused(false);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // Start / Stop Real-Time Voice Conversation with Gemini Live API (gemini-3.8-live)
  const handleToggleLiveVoice = async () => {
    if (isLiveActive) {
      if (liveClientRef.current) {
        liveClientRef.current.stop();
        liveClientRef.current = null;
      }
      setIsLiveActive(false);
      setLiveStatus('disconnected');
      setVoiceState('idle');
      return;
    }

    // Stop standard Web Speech or TTS if active
    if (voiceState === 'listening') {
      cancelListeningRef.current?.();
    }
    stopSpeech();
    setActiveAudioMessageId(null);
    setVoiceError(null);
    setVoiceErrorCategory(null);

    if (!currentUser) {
      setVoiceError('Please sign in to start a real-time voice conversation.');
      setVoiceErrorCategory('AUTH_REQUIRED');
      return;
    }

    if (!selectedVehicle) {
      setVoiceError('Please select a vehicle before starting a real-time voice conversation.');
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();

      // Compact vehicle context for Live API prompt with deterministic figures
      const vName = selectedVehicle.name || `${selectedVehicle.brand} ${selectedVehicle.model}`;
      const odoStr = selectedVehicle.currentOdometer !== undefined && selectedVehicle.currentOdometer !== null
        ? `${Number(selectedVehicle.currentOdometer).toLocaleString('en-IN')} km`
        : '0 km';

      const totalFuelCost = fuelRecords.reduce((acc, f) => acc + (Number(f.totalCost) || 0), 0);
      const totalFuelLitres = fuelRecords.reduce((acc, f) => acc + (Number(f.litres) || 0), 0);
      const totalServiceCost = services.reduce((acc, s) => acc + (Number(s.cost) || 0), 0);
      const totalExpenseCost = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const sortedServices = [...services].sort(
        (a, b) => new Date(b.serviceDate || b.date || 0).getTime() - new Date(a.serviceDate || a.date || 0).getTime()
      );
      const lastService = sortedServices[0];
      const lastServiceInfo = lastService
        ? `${lastService.serviceType || 'Service'} on ${lastService.serviceDate || lastService.date || 'recorded date'} costing ₹${Number(lastService.cost || 0).toLocaleString('en-IN')}`
        : 'No services logged';

      const sortedFuel = [...fuelRecords].sort(
        (a, b) => new Date(b.fuelDate || 0).getTime() - new Date(a.fuelDate || 0).getTime()
      );
      const lastFuel = sortedFuel[0];
      const lastFuelInfo = lastFuel
        ? `${lastFuel.litres || 0}L on ${lastFuel.fuelDate || 'recent date'} costing ₹${Number(lastFuel.totalCost || 0).toLocaleString('en-IN')}`
        : 'No fuel entries logged';

      const overdueCount = allReminders.filter(
        r => r.status !== 'Completed' && r.dueDate && new Date(r.dueDate).getTime() < Date.now()
      ).length;
      const pendingReminders = allReminders.filter(r => r.status !== 'Completed');

      const liveVehicleContext = `Active Vehicle: ${vName} (${selectedVehicle.vehicleNumber || 'Unregistered'}).
Fuel: ${selectedVehicle.fuelType || 'Petrol'}.
Current Odometer: ${odoStr}.
Total Fuel Spent: ₹${totalFuelCost.toLocaleString('en-IN')} across ${fuelRecords.length} entries (${totalFuelLitres} Litres).
Total Service Maintenance Spent: ₹${totalServiceCost.toLocaleString('en-IN')} across ${services.length} records.
Total Other Expenses: ₹${totalExpenseCost.toLocaleString('en-IN')}.
Combined Vehicle Expenditure: ₹${(totalFuelCost + totalServiceCost + totalExpenseCost).toLocaleString('en-IN')}.
Last Service: ${lastServiceInfo}.
Last Fuel Refill: ${lastFuelInfo}.
Documents on file: ${documents.length}.
Active Reminders: ${pendingReminders.length} (${overdueCount} overdue).`;

      const vehicleId = selectedVehicle.id;

      const client = new GeminiLiveVoiceClient({
        onStatusChange: (status) => {
          setLiveStatus(status);
          if (status === 'connected') {
            setIsLiveActive(true);
            setVoiceState('listening');
          } else if (status === 'speaking') {
            setVoiceState('speaking');
          } else if (status === 'listening' || status === 'interrupted') {
            setVoiceState('listening');
          } else if (status === 'connecting') {
            setVoiceState('understanding');
          } else if (status === 'disconnected' || status === 'error') {
            setIsLiveActive(false);
            setVoiceState('idle');
          }
        },
        onTranscript: (speaker, text, isFinal) => {
          if (speaker === 'user') {
            setLiveUserTranscript(text);
            liveUserTranscriptRef.current = text;
            if (isFinal && text.trim()) {
              const finalUserSpeech = text.trim();
              liveUserTranscriptRef.current = '';
              const userMsg: ChatMessage = {
                id: `live-user-${Date.now()}`,
                sender: 'user',
                text: finalUserSpeech,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setConversationsByVehicle(prev => ({
                ...prev,
                [vehicleId]: [...(prev[vehicleId] || []), userMsg],
              }));
              currentLiveModelMsgIdRef.current = null;
            }
          } else if (speaker === 'model') {
            setLiveModelTranscript(text);
            if (text.trim()) {
              setConversationsByVehicle(prev => {
                const list = [...(prev[vehicleId] || [])];

                // If user speech had not been finalized before model started responding, commit user message first
                if (liveUserTranscriptRef.current.trim()) {
                  const pendingUserText = liveUserTranscriptRef.current.trim();
                  liveUserTranscriptRef.current = '';
                  list.push({
                    id: `live-user-${Date.now()}`,
                    sender: 'user',
                    text: pendingUserText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  });
                  currentLiveModelMsgIdRef.current = null;
                }

                const last = list[list.length - 1];
                if (
                  last &&
                  last.sender === 'assistant' &&
                  currentLiveModelMsgIdRef.current &&
                  last.id === currentLiveModelMsgIdRef.current
                ) {
                  let fullText = last.text;
                  if (!fullText) {
                    fullText = text.trim();
                  } else if (text.startsWith(fullText)) {
                    fullText = text.trim();
                  } else if (!fullText.endsWith(text.trim())) {
                    const needsSpace = !fullText.endsWith(' ') && !text.startsWith(' ') && !/^[,.?!:;]/.test(text);
                    fullText = (fullText + (needsSpace ? ' ' : '') + text).trim();
                  }
                  list[list.length - 1] = {
                    ...last,
                    text: fullText,
                  };
                } else {
                  const modelMsgId = `live-assistant-${Date.now()}`;
                  currentLiveModelMsgIdRef.current = modelMsgId;
                  list.push({
                    id: modelMsgId,
                    sender: 'assistant',
                    text: text.trim(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  });
                }

                return { ...prev, [vehicleId]: list };
              });
            }
          }
        },
        onVolumeChange: (vol, speaker) => {
          setLiveVolume(vol);
          setLiveVolumeSpeaker(speaker);
        },
        onError: (err, details) => {
          setVoiceError(err);
          setVoiceErrorCategory(details?.category || null);
          setIsLiveActive(false);
          setLiveStatus('error');
          setVoiceState('idle');
        },
      });

      liveClientRef.current = client;
      setIsLiveActive(true);
      setLiveStatus('connecting');
      setIsLiveMuted(false);
      setLiveUserTranscript('');
      setLiveModelTranscript('');
      await client.start({
        idToken,
        vehicleId: selectedVehicle.id,
        vehicleContextText: liveVehicleContext,
      });
    } catch (err: any) {
      console.warn('[LiveVoice] Error starting Gemini Live session:', err);
      const isAuth = err?.message?.includes('auth') || err?.message?.includes('token');
      setVoiceError(err?.message || 'Failed to start Gemini Live voice session.');
      setVoiceErrorCategory(isAuth ? 'AUTH_INVALID' : 'LIVE_CONNECTION_FAILED');
      setIsLiveActive(false);
      setLiveStatus('error');
      setVoiceState('idle');
    }
  };

  // Toggle voice recognition via Web Speech API
  const handleToggleVoice = () => {
    if (voiceState === 'listening') {
      cancelListeningRef.current?.();
      setVoiceState('idle');
      const spokenText = interimTranscript.trim() || inputMessage.trim();
      setInterimTranscript('');
      if (spokenText) {
        setVoiceState('understanding');
        handleSendMessage(undefined, spokenText, true);
      }
      return;
    }

    if (voiceState === 'speaking') {
      stopSpeech();
      setIsPaused(false);
      setActiveAudioMessageId(null);
      setVoiceState('idle');
    }

    setVoiceError(null);
    setInterimTranscript('');

    const cancel = startListening({
      onStateChange: (state) => {
        setVoiceState(state);
        if (state === 'idle') {
          setInterimTranscript('');
        }
      },
      onInterimTranscript: (interim) => {
        setInterimTranscript(interim);
        setInputMessage(interim);
      },
      onFinalTranscript: (final) => {
        setInterimTranscript('');
        setInputMessage('');
        setVoiceState('understanding');
        handleSendMessage(undefined, final, true);
      },
      onError: (err) => {
        setVoiceError(err);
        setTimeout(() => {
          setVoiceError((prev) => (prev === err ? null : prev));
        }, 6000);
      },
    });

    cancelListeningRef.current = cancel;
  };

  // Pause speech synthesis
  const handlePauseSpeech = () => {
    pauseSpeech();
    setIsPaused(true);
  };

  // Resume speech synthesis
  const handleResumeSpeech = () => {
    resumeSpeech();
    setIsPaused(false);
  };

  // Stop active AI speech playback
  const handleStopSpeaking = () => {
    stopSpeech();
    setIsPaused(false);
    setVoiceState('idle');
    setActiveAudioMessageId(null);
  };

  // Triggerable text-to-speech for any specific AI response using Web Speech Synthesis API
  const handleTriggerSpeakMessage = (messageId: string, text: string) => {
    if (activeAudioMessageId === messageId && voiceState === 'speaking') {
      if (isPaused) {
        handleResumeSpeech();
      } else {
        handlePauseSpeech();
      }
      return;
    }

    // Stop any existing speech first
    stopSpeech();
    setIsPaused(false);
    setVoiceState('speaking');
    setActiveAudioMessageId(messageId);

    speakWithWebSpeech(text, {
      onStart: () => {
        setVoiceState('speaking');
        setIsPaused(false);
        setActiveAudioMessageId(messageId);
      },
      onEnd: () => {
        setVoiceState('idle');
        setIsPaused(false);
        setActiveAudioMessageId(null);
      },
      onPause: () => {
        setIsPaused(true);
      },
      onResume: () => {
        setIsPaused(false);
      },
      onError: () => {
        setVoiceState('idle');
        setIsPaused(false);
        setActiveAudioMessageId(null);
      },
    });
  };

  const handleClearConversation = () => {
    if (activeVehicleId) {
      setConversationsByVehicle((prevMap) => ({
        ...prevMap,
        [activeVehicleId]: [],
      }));
    }
    setInputMessage('');
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* ================================================== */}
      {/* 1. ASSISTANT HEADER (Section 3 & 10) */}
      {/* ================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-[#1D3552] bg-[#0F1F35] p-6 sm:p-7 shadow-2xl card-3d group">
        {/* Dynamic Automotive AI Neural Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=85"
            alt="Automotive Artificial Intelligence Data Interface"
            className="w-full h-full object-cover object-center filter saturate-[1.2] contrast-[1.1] opacity-25 group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07111F] via-[#07111F]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-[#07111F]/50" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#1677FF]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 telemetry-grid opacity-25" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Assistant AI Avatar Emblem with Dynamic Voice Reactivity */}
            <div className={`w-16 h-16 rounded-2xl p-[2px] transition-all duration-300 shrink-0 overflow-hidden ${
              voiceState === 'listening'
                ? 'bg-[#00D9FF] shadow-[0_0_25px_rgba(0,217,255,0.7)] ring-2 ring-[#00D9FF] scale-105'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-[#1677FF] via-[#00D9FF] to-[#67E8F9] shadow-[0_0_25px_rgba(0,217,255,0.6)] ring-2 ring-[#00D9FF]/70 animate-pulse'
                : voiceState === 'understanding'
                ? 'bg-[#1677FF] shadow-[0_0_20px_rgba(22,119,255,0.5)] ring-2 ring-[#1677FF]'
                : 'bg-gradient-to-tr from-[#1677FF] via-[#2196FF] to-[#00D9FF] shadow-xl shadow-[#1677FF]/25 hover:scale-105'
            }`}>
              <div className="w-full h-full rounded-[14px] bg-[#07111F] overflow-hidden relative">
                <img
                  src="/src/assets/images/autocare_ai_avatar_1791025216006.jpg"
                  alt="AutoCare Intelligent AI Co-Pilot"
                  className="w-full h-full object-cover object-top transition-transform duration-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#F5F9FF] tracking-tight flex items-center gap-2">
                  <span>AutoCare AI</span>
                  {(voiceState === 'speaking' || voiceState === 'listening') && (
                    <AudioVisualizer isSpeaking={voiceState === 'speaking'} isListening={voiceState === 'listening'} />
                  )}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#1677FF]/15 text-[#00D9FF] border border-[#1677FF]/35">
                  Voice & Text AI
                </span>
                {voiceState === 'listening' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <span>Listening...</span>
                  </span>
                ) : voiceState === 'understanding' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#1677FF]/20 text-[#00D9FF] border border-[#1677FF]/40 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-[#00D9FF]" />
                    <span>Understanding...</span>
                  </span>
                ) : voiceState === 'speaking' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-[#00D9FF] animate-pulse" />
                    <span>Responding Aloud</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ready</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#A9B8CC] mt-1">
                Your intelligent vehicle companion • Voice & Text enabled
              </p>
            </div>
          </div>

          {/* Active Vehicle Context Badge (Section 10) */}
          <div className="p-3 rounded-2xl bg-[#0B1628] border border-[#1D3552] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1677FF]/15 border border-[#1677FF]/35 flex items-center justify-center text-[#00D9FF] shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#A9B8CC] uppercase tracking-wider">
                  Current Vehicle
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px]">
                  {selectedVehicle ? selectedVehicle.name : 'No Vehicle Selected'}
                </div>
                {selectedVehicle && (
                  <div className="text-[11px] text-[#00D9FF] font-mono">
                    {selectedVehicle.vehicleNumber}
                  </div>
                )}
              </div>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('vehicles')}
                className="text-[11px] text-[#00D9FF] hover:text-[#67E8F9] font-semibold px-2.5 py-1 rounded-lg bg-[#07111F] border border-[#1D3552] hover:border-[#1677FF]/50 transition-colors cursor-pointer shrink-0"
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
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-[#0F1F35] border border-[#1D3552] shadow-2xl overflow-hidden min-h-[580px] h-[650px]">
          {/* Chat Header Bar */}
          <div className="px-6 py-3.5 border-b border-[#1D3552] bg-[#0B1628] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#A9B8CC]">
              <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="font-semibold text-white">Conversation</span>
              <span className="text-[#1D3552]">•</span>
              <span className="text-[#A9B8CC] font-mono text-[11px]">
                {messages.length === 0 ? 'New Session' : `${Math.ceil(messages.length / 2)} message pair(s)`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Gemini Live API Real-Time Voice Button */}
              <button
                type="button"
                onClick={handleToggleLiveVoice}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  isLiveActive
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50 animate-pulse'
                    : 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF] hover:from-[#1360D4] hover:to-[#1677FF] text-white border border-[#00D9FF]/30 hover:scale-105 active:scale-95'
                }`}
                title={isLiveActive ? 'End Live Voice Session' : 'Start Real-Time Voice with Gemini Live API'}
              >
                <Radio className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">{isLiveActive ? 'Live Voice Active' : 'Gemini Live Voice'}</span>
                <span className="sm:hidden">{isLiveActive ? 'Live On' : 'Live'}</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearConversation}
                  className="text-xs text-[#A9B8CC] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-[#122A46]"
                  title="Clear current conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages / Empty State Viewport */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {/* Real-Time Gemini Live Audio Panel */}
            {isLiveActive && (
              <div className="mb-4">
                <GeminiLiveVoicePanel
                  status={liveStatus}
                  isMuted={isLiveMuted}
                  volume={liveVolume}
                  volumeSpeaker={liveVolumeSpeaker}
                  vehicleName={selectedVehicle ? selectedVehicle.name : 'Active Vehicle'}
                  vehicleNumber={selectedVehicle?.vehicleNumber}
                  userTranscript={liveUserTranscript}
                  modelTranscript={liveModelTranscript}
                  onToggleMute={() => {
                    if (liveClientRef.current) {
                      const newMuted = liveClientRef.current.toggleMute();
                      setIsLiveMuted(newMuted);
                    }
                  }}
                  onInterrupt={() => {
                    if (liveClientRef.current) {
                      liveClientRef.current.clearAudioQueue();
                      setVoiceState('listening');
                    }
                  }}
                  onEndLiveSession={handleToggleLiveVoice}
                  error={voiceError}
                  errorCategory={voiceErrorCategory}
                  onRetry={handleToggleLiveVoice}
                />
              </div>
            )}

            {messages.length === 0 && !interimTranscript ? (
              /* Empty Conversation State (Section 5) */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8 space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#1677FF]/20 via-[#2196FF]/20 to-[#00D9FF]/20 border border-[#1677FF]/40 flex items-center justify-center text-3xl shadow-xl shadow-[#1677FF]/15">
                    🚘
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#1677FF] text-white p-1.5 rounded-xl shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    How can I help with your vehicle?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A9B8CC] leading-relaxed">
                    Ask questions about your vehicle, maintenance, documents, fuel, expenses, and reminders.
                  </p>
                </div>

                {/* Prominent Voice Assistant CTAs */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleLiveVoice}
                    aria-label="Start Real-Time Voice with Gemini Live API"
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#2196FF] hover:from-[#1360D4] hover:to-[#1677FF] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#00D9FF]/25 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-[#00D9FF]/50"
                  >
                    <Radio className="w-4 h-4 text-white animate-pulse" />
                    <span>⚡ Real-Time Voice (Gemini Live)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    aria-label="Speak to AutoCare AI"
                    className="px-4 py-2.5 rounded-2xl bg-[#07111F] hover:bg-[#122A46] border border-[#1D3552] text-[#A9B8CC] hover:text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all hover:border-[#00D9FF]/50"
                  >
                    <Mic className="w-4 h-4 text-[#00D9FF]" />
                    <span>Quick Voice Input</span>
                  </button>
                </div>

                {/* Suggested Questions Grid (Section 6) */}
                <div className="w-full space-y-2.5 text-left pt-2">
                  <div className="text-[11px] font-bold text-[#A9B8CC] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#00D9FF]" />
                    <span>Suggested Questions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {defaultSuggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(question)}
                        className="p-3 rounded-2xl bg-[#07111F] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#00D9FF]/50 text-left text-xs text-[#A9B8CC] hover:text-[#00D9FF] transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate pr-2 font-medium">{question}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#71839A] group-hover:text-[#00D9FF] transition-transform group-hover:translate-x-0.5 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-[#71839A] flex items-center gap-1.5 pt-2">
                  <Info className="w-3.5 h-3.5 text-[#71839A]" />
                  <span>Click any question to ask AutoCare AI immediately.</span>
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
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] p-[1.5px] shrink-0 shadow-md">
                          <img
                            src="/src/assets/images/autocare_ai_avatar_1791025216006.jpg"
                            alt="AutoCare AI"
                            className="w-full h-full object-cover object-top rounded-[10px]"
                          />
                        </div>
                      )}

                      <div
                        className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-r from-[#1677FF] to-[#2196FF] text-white rounded-br-none shadow-lg shadow-[#1677FF]/20'
                            : 'bg-[#0B1628] border border-[#1D3552] text-[#F5F9FF] rounded-bl-none shadow-md'
                        }`}
                      >
                        {msg.sender === 'assistant' && (
                          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#1D3552] text-[10px] font-bold uppercase tracking-wider text-[#00D9FF]">
                            <span className="flex items-center gap-1.5">
                              <span>AutoCare AI</span>
                              {activeAudioMessageId === msg.id && voiceState === 'speaking' && (
                                <AudioVisualizer isSpeaking={true} />
                              )}
                            </span>

                            {activeAudioMessageId === msg.id && voiceState === 'speaking' ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPaused) {
                                      handleResumeSpeech();
                                    } else {
                                      handlePauseSpeech();
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 bg-[#1677FF]/30 hover:bg-[#1677FF]/50 text-[#00D9FF] border border-[#1677FF]/50 transition-colors cursor-pointer"
                                  title={isPaused ? "Resume speech" : "Pause speech"}
                                >
                                  {isPaused ? (
                                    <>
                                      <Play className="w-2.5 h-2.5 fill-current text-[#00D9FF]" />
                                      <span>Resume</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-2.5 h-2.5 fill-current text-amber-400" />
                                      <span>Pause</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopSpeaking();
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-colors cursor-pointer"
                                  title="Stop speech"
                                >
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                  <span>Stop</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleTriggerSpeakMessage(msg.id, msg.text)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 text-[#71839A] hover:text-[#00D9FF] hover:bg-[#122A46] transition-colors cursor-pointer"
                                title="Listen to response aloud"
                              >
                                <Volume2 className="w-3 h-3 text-[#00D9FF]" />
                                <span>Listen</span>
                              </button>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-[#71839A] px-2 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{msg.timestamp}</span>
                    </span>
                  </div>
                ))}

                {/* Live Recognized User Speech Preview (Real-time transcription while speaking) */}
                {interimTranscript && (
                  <div className="flex flex-col items-end space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#1677FF]/80 to-[#2196FF]/80 border border-[#00D9FF]/40 text-white rounded-br-none shadow-lg shadow-[#1677FF]/25">
                        <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/20 text-[10px] font-bold uppercase tracking-wider text-[#00D9FF]">
                          <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
                          <span>Recognizing speech...</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{interimTranscript}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#00D9FF] px-2 font-mono flex items-center gap-1 animate-pulse">
                      <Mic className="w-2.5 h-2.5" />
                      <span>Live Transcription</span>
                    </span>
                  </div>
                )}

                {/* Animated Thinking Bubble when waiting for Gemini */}
                {isLoading && (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] p-[1.5px] shrink-0 shadow-md">
                        <img
                          src="/src/assets/images/autocare_ai_avatar_1791025216006.jpg"
                          alt="AutoCare AI"
                          className="w-full h-full object-cover object-top rounded-[10px] animate-pulse"
                        />
                      </div>
                      <div className="p-4 rounded-3xl bg-[#0B1628] border border-[#1D3552] text-[#F5F9FF] rounded-bl-none shadow-md">
                        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-[#1D3552] text-[10px] font-bold uppercase tracking-wider text-[#00D9FF]">
                          <span>AutoCare AI</span>
                          <span className="text-[10px] text-[#A9B8CC] normal-case font-normal">Thinking...</span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input & Voice Bar (Section 7) */}
          <div className="p-4 bg-[#0B1628] border-t border-[#1D3552] space-y-2.5">
            {/* Live Voice State Indicator Banner */}
            {voiceState === 'listening' && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#07111F] to-[#0F1F35] border border-rose-500/40 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 relative" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <span>Listening... Speak naturally</span>
                      <AudioVisualizer isListening={true} />
                    </div>
                    <div className="text-[11px] text-[#A9B8CC] italic truncate">
                      {interimTranscript ? `"${interimTranscript}"` : 'Listening for questions about odometer, fuel, service, expenses...'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {voiceState === 'understanding' && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#1677FF]/15 border border-[#1677FF]/40 text-xs text-[#00D9FF] animate-in fade-in duration-200">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#00D9FF]" />
                <span className="font-medium">Understanding your question and reading vehicle data...</span>
              </div>
            )}

            {voiceState === 'speaking' && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#00D9FF]/10 border border-[#00D9FF]/35 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 text-xs text-[#00D9FF] font-medium min-w-0">
                  <Volume2 className="w-4 h-4 animate-pulse shrink-0" />
                  <span className="truncate">
                    {isPaused ? 'AutoCare AI speech paused' : 'AutoCare AI is speaking response...'}
                  </span>
                  {!isPaused && <AudioVisualizer isSpeaking={true} />}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={isPaused ? handleResumeSpeech : handlePauseSpeech}
                    className="px-2.5 py-1 rounded-xl bg-[#1677FF]/25 hover:bg-[#1677FF]/40 text-[#00D9FF] text-xs font-semibold border border-[#00D9FF]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={isPaused ? "Resume speech" : "Pause speech"}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-2.5 h-2.5 fill-current text-amber-400" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopSpeaking}
                    className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Stop speech"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            )}

            {voiceError && (
              <div className="flex items-start justify-between p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 animate-in fade-in duration-200 gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-bold text-amber-300 text-xs">
                      {voiceErrorCategory === 'MIC_PERMISSION_DENIED'
                        ? 'Microphone Permission Notice'
                        : voiceErrorCategory === 'GEMINI_PERMISSION_DENIED'
                        ? 'Gemini Live Permission Notice (403)'
                        : voiceErrorCategory === 'AUTH_INVALID'
                        ? 'Authentication Session Required'
                        : voiceErrorCategory === 'AUTH_REQUIRED'
                        ? 'Sign-In Required'
                        : 'Voice Feature Notice'}
                    </div>
                    <div className="text-[11px] leading-relaxed text-amber-200/90 break-words">
                      {voiceError}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleLiveVoice}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceError(null);
                      setVoiceErrorCategory(null);
                    }}
                    className="p-1 text-amber-400 hover:text-white transition-colors cursor-pointer"
                    title="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Redesigned Input Bar: Non-Overlapping Regions */}
            <form onSubmit={handleSendMessage} className="w-full">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Dedicated Real-Time Gemini Live API Button */}
                <button
                  type="button"
                  onClick={handleToggleLiveVoice}
                  aria-label="Toggle Gemini Live Real-Time Voice"
                  title={isLiveActive ? 'End Live Voice session' : 'Start Real-Time Voice (Gemini Live API)'}
                  className={`shrink-0 h-11 px-2.5 sm:px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] ${
                    isLiveActive
                      ? 'bg-rose-500/25 border-2 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse'
                      : 'bg-[#07111F] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#00D9FF]/40 text-[#00D9FF]'
                  }`}
                >
                  <Radio className={`w-4 h-4 ${isLiveActive ? 'animate-pulse text-rose-400' : 'text-[#00D9FF]'}`} />
                  <span className="hidden md:inline font-mono text-[11px] font-semibold">
                    {isLiveActive ? 'Live On' : 'Live'}
                  </span>
                </button>

                {/* Clearly Visible Microphone Button (Quick Voice Input) */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={isLoading && voiceState !== 'speaking'}
                  aria-label="Speak to AutoCare AI"
                  title={
                    voiceState === 'listening'
                      ? 'Stop listening'
                      : voiceState === 'speaking'
                      ? 'Stop speaking'
                      : 'Speak to AutoCare AI'
                  }
                  className={`shrink-0 h-11 px-2.5 sm:px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] ${
                    voiceState === 'listening'
                      ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse'
                      : voiceState === 'speaking'
                      ? 'bg-[#1677FF]/25 border-2 border-[#00D9FF] text-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.35)]'
                      : voiceState === 'understanding'
                      ? 'bg-[#1677FF]/20 border border-[#1677FF]/40 text-[#00D9FF]'
                      : 'bg-[#07111F] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#00D9FF]/40 text-[#A9B8CC] hover:text-[#00D9FF]'
                  }`}
                >
                  {voiceState === 'listening' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <Mic className="w-4 h-4 text-rose-400" />
                      <span className="hidden md:inline font-mono text-[11px]">Listening</span>
                    </>
                  ) : voiceState === 'speaking' ? (
                    <>
                      <Volume2 className="w-4 h-4 text-[#00D9FF] animate-pulse" />
                      <span className="hidden md:inline font-mono text-[11px]">Speaking</span>
                    </>
                  ) : voiceState === 'understanding' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#00D9FF]" />
                      <span className="hidden md:inline font-mono text-[11px]">Thinking</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-[#00D9FF]" />
                      <span className="hidden md:inline font-medium">Speak</span>
                    </>
                  )}
                </button>

                {/* Non-overlapping Text Input & Send Button Container */}
                <div className="flex-1 min-w-0 h-11 flex items-center gap-2 bg-[#07111F] border border-[#1D3552] focus-within:border-[#00D9FF] rounded-2xl p-1 pl-3.5 sm:pl-4 transition-colors shadow-inner">
                  {/* Text Input Region */}
                  <input
                    ref={inputRef}
                    type="text"
                    disabled={isLoading}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      isLoading
                        ? 'AutoCare AI is responding...'
                        : 'Ask AutoCare anything about your vehicle or tap Speak...'
                    }
                    className="flex-1 min-w-0 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-[#71839A] focus:outline-none focus:ring-0 py-1.5 leading-normal disabled:opacity-60"
                  />

                  {/* Send Button Region (Independent Layout Sibling, Cannot Overlap Input Text) */}
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="shrink-0 h-9 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#2196FF] hover:from-[#1360D4] hover:to-[#1677FF] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#1677FF]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                    title="Send Message"
                  >
                    {isLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline font-semibold">{isLoading ? 'Thinking...' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Helper Text and Status Bar with Responsive Alignment */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#71839A] gap-1.5 sm:gap-2 px-1 pt-0.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0 leading-relaxed text-left">
                <span>Press <kbd className="bg-[#0F1F35] border border-[#1D3552] px-1.5 py-0.5 rounded text-[#A9B8CC] font-mono text-[10px] shadow-sm">Enter</kbd> to send, or click <kbd className="bg-[#0F1F35] border border-[#1D3552] px-1.5 py-0.5 rounded text-[#A9B8CC] font-mono text-[10px] shadow-sm">Speak</kbd></span>
              </div>
              <div className="text-[#00D9FF] font-medium flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                <Mic className="w-3 h-3 text-[#00D9FF]" />
                <span>Voice & Text AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Suggested Questions & Quick Actions (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Suggested Questions Section */}
          <div className="p-6 rounded-3xl bg-[#0F1F35] border border-[#1D3552] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                <h3 className="text-base font-bold text-white">Suggested Questions</h3>
              </div>
              <span className="text-[11px] font-mono text-[#00D9FF] bg-[#1677FF]/15 px-2.5 py-0.5 rounded-full border border-[#1677FF]/30">
                {displayedQuickQuestions.length} questions
              </span>
            </div>

            <p className="text-xs text-[#A9B8CC]">
              Simple questions answered directly from your vehicle's live records.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#2196FF] text-white shadow-md shadow-[#1677FF]/25 border border-[#00D9FF]/40'
                      : 'bg-[#07111F] text-[#A9B8CC] hover:text-white border border-[#1D3552] hover:border-[#1677FF]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Questions List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {displayedQuickQuestions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item.question)}
                    className="w-full p-3 rounded-2xl bg-[#07111F] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#00D9FF]/50 text-left transition-all cursor-pointer group flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${item.bgColor} ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white group-hover:text-[#00D9FF] transition-colors truncate">
                          {item.question}
                        </div>
                        <div className="text-[11px] text-[#A9B8CC] truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#71839A] group-hover:text-[#00D9FF] transition-transform group-hover:translate-x-0.5 shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assistant Info / Architecture Preview Card */}
          <div className="p-6 rounded-3xl bg-[#0F1F35] border border-[#1D3552] shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#A9B8CC] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>Vehicle Data Isolation</span>
            </div>
            <p className="text-xs text-[#A9B8CC] leading-relaxed">
              Queries operate strictly on your authenticated Firestore records for your currently selected vehicle in real time. Read-only and completely private.
            </p>
            <div className="p-3 rounded-2xl bg-[#1677FF]/10 border border-[#1677FF]/25 text-[#00D9FF] text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-[#00D9FF]" />
              <span>No external data sharing or third-party tracking.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
