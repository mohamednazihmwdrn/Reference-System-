import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Square, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  Trash2, 
  CheckCheck, 
  Users, 
  Store, 
  Package, 
  ShieldCheck, 
  ChevronDown,
  ChevronLeft,
  Volume2,
  Check,
  RotateCcw
} from 'lucide-react';
import { ChatMessage, Branch, UserSession } from '../types';
import { normalizeBranchName } from '../utils/storage';
import { apiFetchMessages, apiSendMessage, apiClearMessages } from '../utils/api';
import { subscribeToChatMessages } from '../utils/firebase';
import { soundManager } from '../utils/audio';
import { compressImage } from '../utils/imageCompressor';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface CompanyChatViewProps {
  currentSession: UserSession;
  branches: Branch[];
  initialTargetChannel?: string;
  onOpenVerifyModal?: (transferId: string) => void;
}

export const CompanyChatView: React.FC<CompanyChatViewProps> = ({
  currentSession,
  branches,
  initialTargetChannel,
}) => {
  // Target Channel: 'all' (company group) or specific branchId / 'auditor_main'
  const [selectedTarget, setSelectedTarget] = useState<string>(initialTargetChannel || 'all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // --- Voice Note Recording States (WhatsApp-Style) ---
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Audio Playback States for Chat Stream ---
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [id: string]: number }>({});
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<{ [id: string]: number }>({});
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Scroll container ref & file input
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
  }, [initialTargetChannel]);

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

  // Internal container scroll on new messages / target switch WITHOUT scrolling whole window/page!
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, selectedTarget]);

  // Keep window strictly anchored at the top when entering the chat view
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Cleanup audio preview URL when discarded or component unmounts
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (activeAudioRef.current) activeAudioRef.current.pause();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, [recordedAudioUrl]);

  // Filter messages: default to all messages visible to everyone (شات جماعي موحد)
  const filteredMessages = messages.filter((m) => {
    if (selectedTarget === 'all') {
      return true; // Show all messages to everyone in the group
    }
    // Filter view by specific branch or auditor if user clicks filter chip
    return m.senderId === selectedTarget || m.targetBranchId === selectedTarget;
  });

  // Calculate message count & audio activity per branch
  const getChannelBadge = (branchId: string) => {
    const list = messages.filter((m) => m.senderId === branchId);
    const hasVoice = list.some((m) => !!m.audioUrl);
    return { count: list.length, hasVoice };
  };

  // Target title & role label
  const getTargetDetails = () => {
    if (selectedTarget === 'all') {
      return {
        title: 'الشات الجماعي العام (جميع الفروع والمخازن والمراجع)',
        sub: 'محادثة جماعية موحدة — أي رسالة تُرسل هنا يراها الجميع فوراً',
        isGroup: true,
      };
    }
    if (selectedTarget === 'auditor_main') {
      return {
        title: 'رسائل المراجع المالي',
        sub: 'تصفية رسائل الإدارة المالية والمراجع العام',
        isGroup: false,
      };
    }
    const b = branches.find((item) => item.id === selectedTarget);
    if (b) {
      return {
        title: `رسائل ${b.name}`,
        sub: `تصفية الرسائل الصادرة والواردة لـ ${b.name}`,
        isGroup: false,
      };
    }
    return { title: 'محادثة جماعية', sub: 'اتصال موحد للجميع', isGroup: true };
  };

  const targetInfo = getTargetDetails();

  // --- Send Text Message (Always broadcast to all so everyone sees it) ---
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
      targetBranchId: 'all', // Always broadcast to the whole company
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await apiSendMessage(newMsg);
      if (saved) {
        setMessages((prev) => [...prev, saved]);
        soundManager.playSuccess();
      }
    } catch (err) {
      console.error('Failed to send text message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // --- Send Image Attachment ---
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      setIsSending(true);
      const compressedDataUrl = await compressImage(file, 1600, 1600, 0.85);

      const newMsg: Partial<ChatMessage> = {
        senderId: currentSenderId,
        senderName: currentSenderName,
        senderRole: currentSession.role,
        targetBranchId: 'all',
        text: '📷 صورة مرفقة',
        imageUrl: compressedDataUrl,
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
  };

  // --- Start Voice Note Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      // Detect best supported MIME type across mobile devices (iOS Safari, Android Chrome)
      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMime = 'audio/mp4';
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

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const actualMime = mediaRecorder.mimeType || chosenMime || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        setRecordedAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      mediaRecorder.start(100);
      setRecordingState('recording');
      setRecordSeconds(0);
      soundManager.playMessageReceived();

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('يرجى السماح بالوصول إلى الميكروفون لتسجيل وإرسال الرسائل الصوتية');
    }
  };

  // --- Stop Voice Recording (Transition to Preview Mode) ---
  const stopRecordingToPreview = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('preview');
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  // --- Discard / Cancel Voice Recording ---
  const cancelRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordingState('idle');
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordSeconds(0);
    setIsPreviewPlaying(false);
  };

  // --- Send Final Voice Note ---
  const sendVoiceNote = async (overrideBlob?: Blob) => {
    const blobToSend = overrideBlob || recordedAudioBlob;
    if (!blobToSend) {
      if (mediaRecorderRef.current && recordingState === 'recording') {
        // Direct Send while actively recording
        mediaRecorderRef.current.addEventListener('stop', () => {
          setTimeout(() => {
            const actualMime = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const freshBlob = new Blob(audioChunksRef.current, { type: actualMime });
            processAndSendBlob(freshBlob);
          }, 50);
        }, { once: true });
        mediaRecorderRef.current.stop();
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecordingState('idle');
        return;
      }
      return;
    }

    await processAndSendBlob(blobToSend);
  };

  const processAndSendBlob = async (blob: Blob) => {
    const finalDuration = Math.max(1, recordSeconds || Math.round((Date.now() - startTimeRef.current) / 1000));
    setIsSending(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      const msgPayload: Partial<ChatMessage> = {
        senderId: currentSenderId,
        senderName: currentSenderName,
        senderRole: currentSession.role,
        targetBranchId: 'all',
        text: '🎙️ تسجيل صوتي',
        audioUrl: base64Audio,
        audioDuration: finalDuration,
        createdAt: new Date().toISOString(),
      };

      try {
        const saved = await apiSendMessage(msgPayload);
        if (saved) {
          setMessages((prev) => [...prev, saved]);
          soundManager.playSuccess();
        }
      } catch (err) {
        console.error('Failed to send voice note:', err);
      } finally {
        cancelRecording();
        setIsSending(false);
      }
    };
    reader.readAsDataURL(blob);
  };

  // --- Toggle Preview Playback ---
  const togglePlayPreview = () => {
    if (!recordedAudioUrl) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(recordedAudioUrl);
      previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
    }
  };

  // --- Toggle Stream Audio Playback (Voice Notes) ---
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
    const currentSpeed = audioPlaybackSpeed[id] || 1;
    audio.playbackRate = currentSpeed;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setAudioProgress((prev) => ({ ...prev, [id]: pct }));
      }
    };

    audio.onended = () => {
      setPlayingAudioId(null);
      setAudioProgress((prev) => ({ ...prev, [id]: 0 }));
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
    };

    activeAudioRef.current = audio;
    setPlayingAudioId(id);

    audio.play().catch(() => setPlayingAudioId(null));
  };

  // --- Toggle Audio Speed (1x -> 1.5x -> 2x) ---
  const handleToggleSpeed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = audioPlaybackSpeed[id] || 1;
    let next = 1;
    if (current === 1) next = 1.5;
    else if (current === 1.5) next = 2;
    else next = 1;

    setAudioPlaybackSpeed((prev) => ({ ...prev, [id]: next }));
    if (activeAudioRef.current && playingAudioId === id) {
      activeAudioRef.current.playbackRate = next;
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full max-w-4xl mx-auto px-1 sm:px-4 select-none animate-in fade-in duration-200 overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. Destination Channel Selector Pills (العام vs المعارض vs المخازن vs المراجع) */}
      {/* ========================================================================= */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs space-y-1">
        <div className="text-[10px] font-bold text-slate-500 px-0.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-600" />
            <span>اختر جهة المحادثة:</span>
          </span>
          <span className="text-emerald-700 font-mono text-[9px] bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 font-bold">
            🟢 مباشر
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          {/* Group: All (غرفة العمليات) */}
          <button
            type="button"
            onClick={() => setSelectedTarget('all')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              selectedTarget === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>غرفة العمليات (الجميع)</span>
          </button>

          {/* Option: Auditor */}
          {currentSession.role !== 'auditor' && (
            <button
              type="button"
              onClick={() => setSelectedTarget('auditor_main')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 relative ${
                selectedTarget === 'auditor_main'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>المراجع المالي</span>
              {getChannelBadge('auditor_main').count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>
          )}

          {/* Showrooms & Warehouses */}
          {branches.map((b) => {
            if (b.id === currentSession.branchId) return null;
            const isStore = b.type === 'store';
            const badge = getChannelBadge(b.id);

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedTarget(b.id)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 relative ${
                  selectedTarget === b.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {isStore ? <Store className="w-3 h-3 text-blue-500" /> : <Package className="w-3 h-3 text-amber-500" />}
                <span>{b.name}</span>
                {badge.hasVoice && (
                  <span className="bg-emerald-500 text-white text-[8px] px-1 rounded-full font-bold">
                    🎙️
                  </span>
                )}
                {!badge.hasVoice && badge.count > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Compact Active Contact Header */}
      {/* ========================================================================= */}
      <div className="shrink-0 bg-slate-900 text-white rounded-xl px-3 py-1.5 shadow-xs border border-slate-800 flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            {targetInfo.isGroup ? <Users className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white truncate leading-tight">
              {targetInfo.title}
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300 font-medium truncate">{targetInfo.sub}</span>
            </div>
          </div>
        </div>

        {/* Auditor Action: Clear Chat */}
        {currentSession.role === 'auditor' && (
          <button
            type="button"
            onClick={async () => {
              if (confirm('هل أنت متأكد من مسح وتفريغ سجل المحادثات والتسجيلات الصوتية؟')) {
                await apiClearMessages();
                setMessages([]);
                soundManager.playSuccess();
              }
            }}
            className="text-slate-400 hover:text-red-400 bg-slate-800 p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
            title="تفريغ المحادثة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. Messages Stream (Chat Bubbles + Audio Notes) - Fills ALL available space */}
      {/* ========================================================================= */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-slate-100/90 border border-slate-200 rounded-2xl p-2.5 my-1.5 space-y-2 shadow-inner min-h-0"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 space-y-1.5 text-slate-500">
            <Mic className="w-7 h-7 mx-auto text-slate-400 stroke-[1.5]" />
            <div className="font-bold text-slate-700 text-xs sm:text-sm">لا توجد رسائل سابقة في هذه المحادثة</div>
            <p className="text-[11px] text-slate-400">
              اضغط على أيقونة الميكروفون 🎙️ بالأسفل لإرسال تسجيل صوتي فوري
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentSenderId;
            const progress = audioProgress[msg.id] || 0;
            const isPlaying = playingAudioId === msg.id;
            const speed = audioPlaybackSpeed[msg.id] || 1;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
              >
                {/* Sender Title */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold px-2 mb-0.5">
                  <span>{normalizeBranchName(msg.senderName)}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-md rounded-2xl p-2.5 shadow-xs space-y-1.5 text-right ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-blue-700/20'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs shadow-slate-200/50'
                  }`}
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

                  {/* WhatsApp-Style Voice Note Player */}
                  {msg.audioUrl && (
                    <div className={`p-2 rounded-xl flex items-center gap-2.5 ${
                      isMe ? 'bg-blue-700/80 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                    }`}>
                      {/* Play / Pause Circular Button */}
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(msg.id, msg.audioUrl!)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition-transform active:scale-95 ${
                          isMe ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                        }`}
                        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current mr-0.5" />
                        )}
                      </button>

                      {/* Waveform Scrubber & Duration */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-bold pb-1">
                          <span className="flex items-center gap-1">
                            <Mic className="w-3 h-3 text-emerald-400" />
                            <span>تسجيل صوتي</span>
                          </span>
                          <span className="font-mono opacity-85">
                            {msg.audioDuration ? `${msg.audioDuration} ث` : ''}
                          </span>
                        </div>

                        {/* Progress Bar / Waveform line */}
                        <div className="relative w-full bg-black/15 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-blue-600'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Speed Multiplier Button (1x, 1.5x, 2x) */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSpeed(msg.id, e)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 font-mono transition-colors cursor-pointer ${
                          isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                        title="تغيير سرعة الصوت"
                      >
                        {speed}x
                      </button>
                    </div>
                  )}

                  {/* Text Message Content */}
                  {msg.text && msg.text !== '🎙️ تسجيل صوتي' && msg.text !== '📷 صورة مرفقة' && (
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>
                  )}

                  {/* Time & Delivery Check */}
                  <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${
                    isMe ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    <span className="font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. WhatsApp-Style Input Bar (Fixed / Docked right above navigation bar) */}
      {/* ========================================================================= */}
      <div className="shrink-0 bg-white border border-slate-200/90 rounded-2xl p-2 shadow-md z-20 mb-1">
        
        {/* Hidden Photo File Input */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          className="hidden" 
        />

        {/* --- STATE A: Active Recording Bar (موجة صوتية حمراء وزر إلغاء وإرسال) --- */}
        {recordingState === 'recording' && (
          <div className="flex items-center justify-between gap-2 px-2 py-1 animate-in fade-in duration-150">
            {/* Delete / Cancel button */}
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="إلغاء وحذف التسجيل"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs font-bold hidden sm:inline">إلغاء</span>
            </button>

            {/* Recording Indicator & Timer */}
            <div className="flex items-center gap-2 text-red-600 font-bold text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="font-mono text-sm tracking-wider">{formatTime(recordSeconds)}</span>
              <span className="text-slate-500 text-xs hidden sm:inline">جاري التسجيل...</span>
            </div>

            {/* Actions: Stop to Preview OR Send Directly */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={stopRecordingToPreview}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold transition-all cursor-pointer"
                title="مراجعة الصوت قبل الإرسال"
              >
                مراجعة
              </button>
              <button
                type="button"
                onClick={() => sendVoiceNote()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center"
                title="إرسال التسجيل الصوتي الآن"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- STATE B: Recording Preview Mode (مراجعة الصوت قبل الإرسال) --- */}
        {recordingState === 'preview' && (
          <div className="flex items-center justify-between gap-2 px-2 py-1 animate-in fade-in duration-150">
            {/* Discard button */}
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="حذف التسجيل"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs font-bold">حذف</span>
            </button>

            {/* Play Preview Button */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <button
                type="button"
                onClick={togglePlayPreview}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPreviewPlaying ? 'إيقاف' : 'استماع للتسجيل'}</span>
              </button>
              <span className="font-mono text-xs text-slate-500">{formatTime(recordSeconds)}</span>
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => sendVoiceNote()}
              disabled={isSending}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs rounded-xl font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </div>
        )}

        {/* --- STATE C: Normal Input Bar (Text, Photo, and Mic button) --- */}
        {recordingState === 'idle' && (
          <form onSubmit={handleSendText} className="flex items-center gap-1.5">
            {/* Photo Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer shrink-0"
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
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />

            {/* Mic / Voice Note Button (when text input is empty) */}
            {!inputText.trim() && (
              <button
                type="button"
                onClick={startRecording}
                className="p-2 text-emerald-600 hover:bg-emerald-50 active:scale-95 rounded-xl transition-all cursor-pointer shrink-0"
                title="تسجيل رسالة صوتية (واتساب)"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* Text Send Button (when text input is entered) */}
            {inputText.trim() && (
              <button
                type="submit"
                disabled={isSending}
                className="p-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
                title="إرسال"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        )}

      </div>

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
