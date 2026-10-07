import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  Send, 
  Mic, 
  Square, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Trash2, 
  Volume2, 
  Sparkles, 
  CheckCheck, 
  Clock, 
  PhoneCall, 
  Users, 
  X,
  Store,
  Package,
  ShieldCheck,
  AlertCircle,
  Headphones,
  Signal,
  Wifi,
  ChevronDown,
  PhoneForwarded
} from 'lucide-react';
import { ChatMessage, Branch, UserSession } from '../types';
import { apiFetchMessages, apiSendMessage, apiClearMessages } from '../utils/api';
import { subscribeToChatMessages } from '../utils/firebase';
import { soundManager } from '../utils/audio';
import { compressImage } from '../utils/imageCompressor';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface CompanyChatViewProps {
  currentSession: UserSession;
  branches: Branch[];
  initialTargetChannel?: string;
  autoOpenWalkieTalkie?: boolean;
  onOpenVerifyModal?: (transferId: string) => void;
}

export const CompanyChatView: React.FC<CompanyChatViewProps> = ({
  currentSession,
  branches,
  initialTargetChannel,
  autoOpenWalkieTalkie,
}) => {
  // Target Channel: 'all' (company group) or specific branchId / 'auditor_main'
  const [selectedTarget, setSelectedTarget] = useState<string>(initialTargetChannel || 'all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Dedicated Walkie-Talkie Instant PTT Modal
  const [isWalkieTalkieModalOpen, setIsWalkieTalkieModalOpen] = useState<boolean>(Boolean(autoOpenWalkieTalkie));

  // Audio recording state (Voice Notes & Walkie-Talkie PTT)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isWalkieRecording, setIsWalkieRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current user sender ID & title
  const currentSenderId = currentSession.role === 'auditor' ? 'auditor_main' : currentSession.branchId || 'branch';
  const currentSenderName = currentSession.role === 'auditor' 
    ? 'المراجع المالي والإدارة' 
    : currentSession.userName || currentSession.branchName;

  // React to prop changes (e.g. from banner click)
  useEffect(() => {
    if (initialTargetChannel) {
      setSelectedTarget(initialTargetChannel);
    }
    if (autoOpenWalkieTalkie) {
      setIsWalkieTalkieModalOpen(true);
    }
  }, [initialTargetChannel, autoOpenWalkieTalkie]);

  // Initial load & Real-time Firestore Sync
  const loadMessages = async () => {
    const list = await apiFetchMessages();
    if (Array.isArray(list) && list.length > 0) {
      setMessages(list);
    }
  };

  useEffect(() => {
    loadMessages();

    // Instant real-time listener from Firebase Firestore across all devices
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = subscribeToChatMessages((firebaseMessages) => {
        if (Array.isArray(firebaseMessages)) {
          setMessages(firebaseMessages);
        }
      });
    } catch (err) {
      console.warn('Chat Firestore listener fallback:', err);
    }

    // Polling fallback every 3s
    const interval = setInterval(loadMessages, 3000);
    return () => {
      if (unsubFirestore) unsubFirestore();
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedTarget]);

  // Filter messages based on selected channel
  const filteredMessages = messages.filter((m) => {
    if (selectedTarget === 'all') {
      return m.targetBranchId === 'all';
    }
    // Direct 1-on-1 between current user and target
    const isSentToTarget = m.targetBranchId === selectedTarget && m.senderId === currentSenderId;
    const isReceivedFromTarget = m.targetBranchId === currentSenderId && m.senderId === selectedTarget;
    return isSentToTarget || isReceivedFromTarget;
  });

  // Calculate badge for incoming messages per channel
  const getChannelBadge = (branchId: string) => {
    const incoming = messages.filter(
      (m) => m.senderId === branchId && m.targetBranchId === currentSenderId
    );
    const hasWalkie = incoming.some((m) => m.isWalkieTalkie);
    return { count: incoming.length, hasWalkie };
  };

  // Target title & role label
  const getTargetDetails = () => {
    if (selectedTarget === 'all') {
      return {
        title: 'غرفة العمليات العامة (جميع المعارض والمخازن والمراجع)',
        sub: 'محادثة جماعية مفتوحة لكافة المعارض والمخازن',
        isGroup: true,
      };
    }
    if (selectedTarget === 'auditor_main') {
      return {
        title: 'المراجع المالي والإدارة',
        sub: 'محادثة ولاسلكي مباشر مع الإدارة المالية',
        isGroup: false,
      };
    }
    const b = branches.find((item) => item.id === selectedTarget);
    if (b) {
      const isStore = b.type === 'store';
      return {
        title: b.name,
        sub: b.defaultCashier || (isStore ? `كاشير ${b.name}` : `أمين ${b.name}`),
        isGroup: false,
      };
    }
    return { title: 'محادثة خاصة', sub: 'اتصال مباشر', isGroup: false };
  };

  const targetInfo = getTargetDetails();

  // Send Text Message
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const newMsg: Partial<ChatMessage> = {
      senderId: currentSenderId,
      senderName: currentSenderName,
      senderRole: currentSession.role,
      targetBranchId: selectedTarget,
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    const saved = await apiSendMessage(newMsg);
    if (saved) {
      setMessages((prev) => [...prev, saved]);
      soundManager.playSuccess();
    }
    setIsSending(false);
  };

  // Image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsSending(true);
        const compressed = await compressImage(file, 1000, 1000, 0.72);
        const newMsg: Partial<ChatMessage> = {
          senderId: currentSenderId,
          senderName: currentSenderName,
          senderRole: currentSession.role,
          targetBranchId: selectedTarget,
          text: '',
          imageUrl: compressed,
          createdAt: new Date().toISOString(),
        };

        const saved = await apiSendMessage(newMsg);
        if (saved) {
          setMessages((prev) => [...prev, saved]);
          soundManager.playSuccess();
        }
      } catch (err) {
        console.error('Failed to send image', err);
        alert('تعذر إرسال الصورة');
      } finally {
        setIsSending(false);
      }
    }
  };

  // Start Voice Recording (Walkie-Talkie PTT or Normal Voice Note)
  const startRecording = async (asWalkieTalkie = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      // Detect best supported MIME type across mobile devices (iOS Safari, Android Chrome)
      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          chosenMime = 'audio/webm';
        }
      }

      const mediaRecorder = chosenMime 
        ? new MediaRecorder(stream, { mimeType: chosenMime }) 
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const actualMime = mediaRecorder.mimeType || chosenMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const finalDuration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const msgPayload: Partial<ChatMessage> = {
            senderId: currentSenderId,
            senderName: currentSenderName,
            senderRole: currentSession.role,
            targetBranchId: selectedTarget,
            text: asWalkieTalkie ? '🎙️ بث لاسلكي فوري مباشر' : '🎵 تسجيل صوتي',
            audioUrl: base64Audio,
            audioDuration: finalDuration,
            isWalkieTalkie: asWalkieTalkie,
            createdAt: new Date().toISOString(),
          };

          const saved = await apiSendMessage(msgPayload);
          if (saved) {
            setMessages((prev) => [...prev, saved]);
            soundManager.playSuccess();
          }
          if (asWalkieTalkie) {
            setIsWalkieTalkieModalOpen(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsWalkieRecording(asWalkieTalkie);
      setRecordSeconds(0);

      if (asWalkieTalkie) {
        soundManager.playWalkieTalkieChirp();
      }

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('يرجى السماح بالوصول إلى الميكروفون للتحدث عبر اللاسلكي أو إرسال تسجيل صوتي');
    }
  };

  // Stop & Send Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsWalkieRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  // Audio Playback
  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      activeAudioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(url);
    audio.setAttribute('playsinline', 'true');
    activeAudioRef.current = audio;
    setPlayingAudioId(id);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
    };

    audio.play().catch(() => setPlayingAudioId(null));
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-2 pb-36 sm:pb-44 space-y-3 select-none animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. Destination Channel Selector Pills (العام vs المعارض vs المخازن vs المراجع) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-2xs space-y-2">
        <div className="text-[11px] font-bold text-slate-500 px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>اختر جهة المحادثة أو الاتصال:</span>
          </span>
          <span className="text-emerald-700 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
            🟢 الشبكة متصلة ومباشرة
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* Group: All (غرفة العمليات) */}
          <button
            type="button"
            onClick={() => setSelectedTarget('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedTarget === 'all'
                ? 'bg-blue-600 text-white shadow-xs scale-102'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>غرفة العمليات (الجميع)</span>
          </button>

          {/* Option: Auditor */}
          {currentSession.role !== 'auditor' && (
            <button
              type="button"
              onClick={() => setSelectedTarget('auditor_main')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 relative ${
                selectedTarget === 'auditor_main'
                  ? 'bg-emerald-600 text-white shadow-xs scale-102'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>المراجع المالي والإدارة</span>
              {getChannelBadge('auditor_main').count > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>
          )}

          {/* Showrooms & Warehouses */}
          {branches.map((b) => {
            // Don't show myself in target list
            if (b.id === currentSession.branchId) return null;
            const isStore = b.type === 'store';
            const badge = getChannelBadge(b.id);

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedTarget(b.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 relative ${
                  selectedTarget === b.id
                    ? 'bg-slate-900 text-white shadow-xs scale-102'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {isStore ? <Store className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-amber-500" />}
                <span>{b.name}</span>
                {badge.hasWalkie && (
                  <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-bounce">
                    🎙️ جديد
                  </span>
                )}
                {!badge.hasWalkie && badge.count > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Top WhatsApp Contact Bar with ONE-TAP Walkie-Talkie Button */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-3.5 sm:p-4 shadow-md border border-slate-700 flex items-center justify-between gap-3">
        
        {/* Contact Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            {targetInfo.isGroup ? <Users className="w-6 h-6" /> : <Radio className="w-6 h-6 animate-pulse" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white truncate">
              {targetInfo.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] text-emerald-300 font-semibold">{targetInfo.sub}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Walkie-Talkie PTT & Clear for Auditor */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Big Quick Call / Walkie-Talkie Button */}
          <button
            type="button"
            onClick={() => setIsWalkieTalkieModalOpen(true)}
            className="px-3.5 sm:px-4 py-2.5 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer transition-all"
            title="تحدث عبر اللاسلكي فوراً دون انتظار رد الشخص الآخر"
          >
            <Radio className="w-4 h-4 text-slate-950" />
            <span className="hidden sm:inline">اتصال لاسلكي سريع ⚡</span>
            <span className="sm:hidden">لاسلكي ⚡</span>
          </button>

          {/* Clear Chat for Auditor */}
          {currentSession.role === 'auditor' && (
            <button
              type="button"
              onClick={async () => {
                if (confirm('هل أنت متأكد من مسح وتفريغ سجل محادثات الدردشة واللاسلكي؟')) {
                  await apiClearMessages();
                  setMessages([]);
                  soundManager.playSuccess();
                }
              }}
              className="text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-750 p-2.5 rounded-2xl cursor-pointer transition-colors"
              title="تفريغ المحادثة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. WhatsApp-Style Messages Stream */}
      {/* ========================================================================= */}
      <div className="bg-slate-200/70 border border-slate-300/80 rounded-3xl p-3 sm:p-4 min-h-[360px] max-h-[500px] overflow-y-auto space-y-3 shadow-inner">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-20 space-y-2 text-slate-500">
            <Radio className="w-12 h-12 mx-auto text-slate-400 stroke-[1.5]" />
            <div className="font-bold text-slate-700 text-sm">لا توجد رسائل سابقة في هذه القناة</div>
            <p className="text-xs text-slate-500">
              اضغط على زر (اتصال لاسلكي سريع ⚡) للتحدث فورا أو اكتب رسالة من الأسفل
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentSenderId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
              >
                {/* Sender Title */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold px-2 mb-0.5">
                  <span>{msg.senderName}</span>
                  {msg.isWalkieTalkie && (
                    <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.2 rounded-full font-mono border border-amber-300 font-bold">
                      بث لاسلكي 📻
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-xs space-y-1.5 text-right ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs shadow-emerald-700/20'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs shadow-slate-200/50'
                  } ${msg.isWalkieTalkie ? (isMe ? 'ring-2 ring-amber-400' : 'ring-2 ring-amber-500 bg-amber-50/95') : ''}`}
                >
                  {/* Image Attachment */}
                  {msg.imageUrl && (
                    <div 
                      onClick={() => setLightboxImage({ url: msg.imageUrl!, title: `صورة من ${msg.senderName}` })}
                      className="cursor-pointer overflow-hidden rounded-xl border border-black/10 max-h-48"
                    >
                      <img src={msg.imageUrl} alt="مرفق" className="w-full object-cover" />
                    </div>
                  )}

                  {/* Audio Player (Voice note or Walkie-Talkie) */}
                  {msg.audioUrl && (
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl ${
                      isMe ? 'bg-emerald-700/70' : 'bg-slate-100 border border-slate-200'
                    }`}>
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(msg.id, msg.audioUrl!)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-transform active:scale-95 ${
                          isMe ? 'bg-white text-emerald-800' : 'bg-blue-600 text-white'
                        }`}
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 mr-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold flex items-center justify-between">
                          <span>{msg.isWalkieTalkie ? '🎙️ بث لاسلكي مسجل' : '🎵 رسالة صوتية'}</span>
                          {msg.audioDuration ? (
                            <span className="font-mono text-[10px] opacity-80">{msg.audioDuration} ث</span>
                          ) : null}
                        </div>
                        <div className="w-full bg-black/10 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${isMe ? 'bg-white' : 'bg-blue-600'} ${playingAudioId === msg.id ? 'animate-pulse w-full' : 'w-1/3'}`}
                          ></div>
                        </div>
                      </div>

                      {/* Quick Reply Button on direct messages */}
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.senderId !== 'all') {
                              setSelectedTarget(msg.senderId);
                            }
                            setIsWalkieTalkieModalOpen(true);
                          }}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
                          title="رد سريع باللاسلكي"
                        >
                          <PhoneForwarded className="w-3 h-3" />
                          <span>رد</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Text Message */}
                  {msg.text && (
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>
                  )}

                  {/* Time & Delivery Check */}
                  <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${
                    isMe ? 'text-emerald-100' : 'text-slate-400'
                  }`}>
                    <span className="font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                  </div>

                </div>

              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ========================================================================= */}
      {/* 4. WhatsApp-Style Input Bar (Text, Photos, Mic) */}
      {/* ========================================================================= */}
      <form onSubmit={handleSendText} className="bg-white border-2 border-slate-200 rounded-3xl p-2 shadow-md flex items-center gap-2">
        
        {/* Photo Attachment Button */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          className="hidden" 
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors cursor-pointer shrink-0"
          title="إرفاق صورة"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`اكتب رسالة إلى ${targetInfo.title}...`}
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />

        {/* Regular Voice Note Button */}
        {!inputText.trim() && !isRecording && (
          <button
            type="button"
            onClick={() => startRecording(false)}
            className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-colors cursor-pointer shrink-0"
            title="تسجيل رسالة صوتية (واتساب)"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {/* If currently recording regular voice note */}
        {isRecording && !isWalkieRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-2 bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer shrink-0"
          >
            <Square className="w-3.5 h-3.5" />
            <span>إرسال ({recordSeconds}ث)</span>
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className={`p-2.5 rounded-2xl text-white transition-all cursor-pointer shrink-0 shadow-sm ${
            inputText.trim() && !isSending
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              : 'bg-slate-300 cursor-not-allowed opacity-60'
          }`}
          title="إرسال"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* ========================================================================= */}
      {/* 5. FULLSCREEN / SLIDE-UP DEDICATED WALKIE-TALKIE MODAL (Push-To-Talk) */}
      {/* ========================================================================= */}
      {isWalkieTalkieModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 text-white shadow-2xl relative">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (isRecording) stopRecording();
                setIsWalkieTalkieModalOpen(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-1 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>جهاز اللاسلكي الفوري (PTT)</span>
              </div>
              <h3 className="text-lg font-black text-white pt-1">
                {targetInfo.title}
              </h3>
              <p className="text-xs text-slate-400">
                تحدث وسيقوم الجهاز بتشغيل صوتك فوراً في سماعة الهاتف الآخر ⚡
              </p>
            </div>

            {/* Visual Radar Waves */}
            <div className="relative py-6 flex items-center justify-center">
              {isRecording ? (
                <div className="absolute w-44 h-44 rounded-full bg-red-500/20 animate-ping"></div>
              ) : (
                <div className="absolute w-40 h-40 rounded-full bg-amber-500/10"></div>
              )}

              {/* Big Ergonomic Push-to-Talk Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={() => startRecording(true)}
                  className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 hover:scale-105 active:scale-95 text-slate-950 font-black shadow-2xl shadow-amber-500/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border-4 border-amber-300"
                >
                  <Radio className="w-10 h-10 text-slate-950 stroke-[2]" />
                  <span className="text-xs font-black">اضغط وتحدث</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black shadow-2xl shadow-red-600/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border-4 border-red-400 animate-pulse"
                >
                  <Square className="w-8 h-8 text-white fill-white" />
                  <span className="text-xs font-black">إنهاء وإرسال ({recordSeconds} ث)</span>
                </button>
              )}
            </div>

            {/* Live Status indicator */}
            <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-center gap-2 font-bold text-amber-300">
                <Volume2 className="w-4 h-4" />
                <span>
                  {isRecording ? `جاري البث المباشر (${recordSeconds} ثواني)...` : 'جاهز للإرسال الصوتي الفوري'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                لا يحتاج الطرف الآخر للرد بل يستمع لصوتك فوراً عبر مكبر الصوت!
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox for zooming photos */}
      {lightboxImage && (
        <PhotoLightboxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}

    </div>
  );
};
