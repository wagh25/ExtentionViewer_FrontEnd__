import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import debounce from "lodash.debounce";
import Nav from "./Nav";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../Context/UserProvider";
import { useChatContext } from "../Context/ChatContext";
import { notifyError, notifySuccess } from "../utils/tostify";
import { socket } from "../Services/socket.io";
import { usePeerContext } from "../Context/PeerContext";
import { motion, AnimatePresence } from "framer-motion";
import JarvisOrb from "./JarvisOrb";
import { User, IncomingCallData } from "../types";
import { 
  FaPhoneAlt, 
  FaVideo, 
  FaComments,
  FaMicrophone, 
  FaSearch, 
  FaTimes, 
  FaUserEdit, 
  FaTrashAlt, 
  FaPhoneSlash, 
  FaCheck, 
  FaPhoneVolume,
  FaShieldAlt,
  FaSignal,
  FaPaperclip,
  FaPaperPlane,
  FaDownload,
  FaFileAlt,
  FaRobot
} from "react-icons/fa";

// Native Web Speech API Custom Hook for React 19 & TypeScript Compatibility
const useNativeSpeechRecognition = () => {
  const [transcript, setTranscript] = useState<string>("");
  const [listening, setListening] = useState<boolean>(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setBrowserSupportsSpeechRecognition(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.log("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          notifyError("Microphone permission denied. Click the mic icon in your browser address bar to allow access.");
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.log("Speech init error:", e);
      setBrowserSupportsSpeechRecognition(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setTranscript("");
        recognitionRef.current.start();
        setListening(true);
        notifySuccess("🎙️ Microphone active! Speak a name or extension...");
      } catch (err) {
        console.log("Start speech error:", err);
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setListening(true);
              notifySuccess("🎙️ Microphone active! Speak a name or extension...");
            } catch (e) {}
          }, 150);
        } catch (e) {}
      }
    } else {
      notifyError("Speech recognition is not supported in this browser");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setListening(false);
      } catch (err) {
        console.log("Stop speech error:", err);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    listening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  };
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [results, setResults] = useState<User[]>([]);
  const [onlineList, setOnlineList] = useState<string[]>([]);
  const [update, setUpdate] = useState<number | null>(null);
  const [deleteUser, setDeleteUser] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // Chat Drawer & Messaging State
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [chatInputText, setChatInputText] = useState<string>("");
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Jarvis AI Voice Assistant State
  const [jarvisActive, setJarvisActive] = useState<boolean>(false);
  const [jarvisStatus, setJarvisStatus] = useState<string>("");
  const lastProcessedTranscriptRef = useRef<string>("");

  const { user } = useUserContext();
  const { 
    conversations, 
    fileTransfers, 
    unreadCounts,
    markAsRead,
    sendDirectMessage, 
    sendDirectFile, 
    selectContact 
  } = useChatContext();
  const { peerRef, createOffer, createAnswer, handleAnswerReceived } = usePeerContext();
  const admin = user?.userType === "admin";

  const ringtoneAudioRef = useRef<any>(null);

  // Jarvis Text-to-Speech Helper
  const speakJarvis = useCallback((text: string) => {
    try {
      setJarvisStatus(text);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log("Jarvis TTS error:", e);
    }
  }, []);

  // Check for auto-open contact intent from post-login notification click
  useEffect(() => {
    const autoEmail = localStorage.getItem("autoOpenContactEmail");
    if (autoEmail) {
      localStorage.removeItem("autoOpenContactEmail");
      fetch("http://localhost:5000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: autoEmail }),
      })
        .then((res) => res.json())
        .then((data) => {
          const matches = Array.isArray(data) ? data : data.users || [];
          if (matches.length > 0) {
            setActiveChatUser(matches[0]);
            selectContact(matches[0]);
          }
        })
        .catch((err) => console.log("Auto open error:", err));
    }
  }, [selectContact]);

  // Scroll to bottom of active chat timeline on updates & clear unread
  useEffect(() => {
    if (activeChatUser) {
      markAsRead(activeChatUser.email);
      if (chatMessagesEndRef.current) {
        chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [activeChatUser, conversations, fileTransfers, markAsRead]);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUser) return;

    if (selectedChatFile) {
      sendDirectFile(activeChatUser.email, selectedChatFile);
      setSelectedChatFile(null);
    }

    if (chatInputText.trim()) {
      sendDirectMessage(activeChatUser.email, chatInputText.trim());
      setChatInputText("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedChatFile(e.target.files[0]);
    }
  };

  const {
    transcript,
    listening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useNativeSpeechRecognition();

  // Web Audio API Ringtone Synthesizer
  const playRingtone = useCallback(() => {
    try {
      if (ringtoneAudioRef.current) return;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2); // A5 note

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);

      ringtoneAudioRef.current = setInterval(() => {
        try {
          const oscLoop = audioCtx.createOscillator();
          const gainLoop = audioCtx.createGain();
          oscLoop.type = "sine";
          oscLoop.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscLoop.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
          gainLoop.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gainLoop.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
          oscLoop.connect(gainLoop);
          gainLoop.connect(audioCtx.destination);
          oscLoop.start();
          oscLoop.stop(audioCtx.currentTime + 0.8);
        } catch (e) {}
      }, 1200);
    } catch (err) {
      console.log("Ringtone synth error:", err);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneAudioRef.current) {
      clearInterval(ringtoneAudioRef.current);
      ringtoneAudioRef.current = null;
    }
  }, []);

  // Browser Notification Request
  useEffect(() => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Login Protection Check
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const requireAuth = useCallback((callback?: () => void): boolean => {
    if (!user?.isAuthenticated) {
      setShowLoginModal(true);
      return false;
    }
    if (callback) callback();
    return true;
  }, [user?.isAuthenticated]);

  // Initiate Call Action (Video or Audio)
  const handleCall = useCallback(
    async (touser: User, type: "video" | "audio" = "video") => {
      if (!user?.isAuthenticated) {
        setShowLoginModal(true);
        return;
      }
      try {
        notifySuccess(`Initiating ${type === "audio" ? "Audio" : "Video"} Call to ${touser.name}...`);
        const offer = await createOffer(type);
        socket.emit("callUser", {
          touser,
          offer,
          callType: type,
          message: `${user.name} is calling you`
        });
      } catch (err) {
        console.error("Error making offer:", err);
        notifyError("Camera/Microphone access required to initiate call");
      }
    },
    [createOffer, user?.name, user?.isAuthenticated]
  );

  // Search Extensions API
  const fetchSearch = async (text: string) => {
    if (!text) {
      setResults([]);
      return;
    }
    try {
      const resp = await fetch("http://localhost:5000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResults(Array.isArray(data) ? data : data.users || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    }
  };

  const debouncedSearch = useCallback(debounce((q: string) => fetchSearch(q), 400), []);

  // Jarvis AI Voice Intent Processor
  const executeJarvisCallIntent = useCallback(
    async (rawQuery: string, callType: "video" | "audio" = "video") => {
      let cleaned = rawQuery
        .toLowerCase()
        .replace(/hey/g, "")
        .replace(/jarvis/g, "")
        .replace(/please/g, "")
        .replace(/video call to/g, "")
        .replace(/audio call to/g, "")
        .replace(/video call/g, "")
        .replace(/audio call/g, "")
        .replace(/call to/g, "")
        .replace(/call/g, "")
        .replace(/extension/g, "")
        .trim();

      if (!cleaned) {
        speakJarvis("I heard call, but who would you like me to call?");
        return;
      }

      setSearchTerm(cleaned);
      speakJarvis(`Searching directory for ${cleaned}...`);

      try {
        const resp = await fetch("http://localhost:5000/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const matches = Array.isArray(data) ? data : data.users || [];
          setResults(matches);

          if (matches.length > 0) {
            const targetUser = matches[0];
            const isOnline = onlineList.includes(targetUser.email);

            if (isOnline) {
              if (!user?.isAuthenticated) {
                speakJarvis("Please log in to place calls.");
                setShowLoginModal(true);
                return;
              }
              speakJarvis(`${targetUser.name} is online. Placing ${callType} call now...`);
              setTimeout(() => {
                handleCall(targetUser, callType);
              }, 1400);
            } else {
              speakJarvis(`${targetUser.name} is currently offline. Opening chat drawer to send a call invite message.`);
              setTimeout(() => {
                if (!user?.isAuthenticated) {
                  setShowLoginModal(true);
                  return;
                }
                setActiveChatUser(targetUser);
                selectContact(targetUser);
                setChatInputText(`Hey ${targetUser.name}, please join call when online!`);
              }, 1400);
            }
          } else {
            speakJarvis(`Sorry, no extension found matching ${cleaned}.`);
          }
        }
      } catch (err) {
        console.error("Jarvis search error:", err);
        speakJarvis("Error searching extension directory.");
      }
    },
    [onlineList, handleCall, selectContact, speakJarvis, user?.isAuthenticated]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Handle Speech Recognition Transcript Updates
  useEffect(() => {
    if (!transcript) return;
    if (transcript === lastProcessedTranscriptRef.current) return;

    lastProcessedTranscriptRef.current = transcript;

    // Clean trailing periods/punctuation from speech recognition (e.g. "Manish." -> "Manish")
    const cleanedTranscript = transcript.replace(/[.?!,]+$/g, "").trim();
    setSearchTerm(cleanedTranscript);
    fetchSearch(cleanedTranscript);

    const lower = cleanedTranscript.toLowerCase();
    if (lower.includes("hey jarvis") || lower.includes("jarvis")) {
      setJarvisActive(true);
      if (lower.includes("call")) {
        const callType = lower.includes("audio") ? "audio" : "video";
        executeJarvisCallIntent(cleanedTranscript, callType);
      } else {
        speakJarvis("Hey, how can I help you?");
      }
    } else if (lower.includes("call ")) {
      setJarvisActive(true);
      const callType = lower.includes("audio") ? "audio" : "video";
      executeJarvisCallIntent(cleanedTranscript, callType);
    }
  }, [transcript, executeJarvisCallIntent, speakJarvis]);

  // Socket & WebRTC Listeners
  useEffect(() => {
    if (user?.email) {
      socket.emit("registerUser", user.email);
    }

    const handleConnect = () => {
      console.log("Connected to Socket server:", socket.id);
      if (user?.email) socket.emit("registerUser", user.email);
    };

    const handleOnlineUsers = (usersList: string[]) => {
      setOnlineList(usersList || []);
    };

    const handleReceiveMessage = (_data: any) => {
      // Message toasts are handled centrally in ChatContext
    };

    const handleIncomingCall = async (data: any) => {
      const { callerSocket, callerEmail, callerName, offer, callType, message } = data;
      playRingtone();

      if (Notification.permission === "granted") {
        new Notification("Incoming Call 📞", {
          body: message || `${callerName || "Peer"} is calling you`,
        });
      }

      setIncomingCall({ offer, callerSocket, callerEmail, callerName, callType, message });
    };

    const handleCallRejected = (data: any) => {
      stopRingtone();
      notifyError(data.message || "Call was declined");
      setIncomingCall(null);
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    };

    const handleCallAnswered = async (data: any) => {
      stopRingtone();
      const { answer, responderName } = data;
      notifySuccess(`${responderName || "Peer"} accepted the call`);
      await handleAnswerReceived(answer);
      navigate("/call");
    };

    const handleCallEnded = (data: any) => {
      stopRingtone();
      setIncomingCall(null);
      notifySuccess(data.message || "Call ended");
    };

    socket.on("connect", handleConnect);
    socket.on("getOnlineUsers", handleOnlineUsers);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callRejected", handleCallRejected);
    socket.on("callAnswered", handleCallAnswered);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("getOnlineUsers", handleOnlineUsers);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callRejected", handleCallRejected);
      socket.off("callAnswered", handleCallAnswered);
      socket.off("callEnded", handleCallEnded);
      stopRingtone();
    };
  }, [user?.email, navigate, playRingtone, stopRingtone, handleAnswerReceived, peerRef]);

  // Answer Call Action
  const onCallAnswer = async (data: IncomingCallData) => {
    stopRingtone();
    const { offer, callerSocket, callType } = data;
    try {
      const answer = await createAnswer(offer, callType || "video");
      socket.emit("answerCall", { answer, callerSocket });
      setIncomingCall(null);
      navigate("/call");
    } catch (err) {
      console.error("Error answering call:", err);
      notifyError("Failed to access media devices");
    }
  };

  // Reject Call Action
  const onCallReject = (data: IncomingCallData) => {
    stopRingtone();
    socket.emit("rejectCall", { callerSocket: data.callerSocket });
    setIncomingCall(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStartMic = () => {
    if (browserSupportsSpeechRecognition) {
      if (listening) {
        stopListening();
      } else {
        resetTranscript();
        lastProcessedTranscriptRef.current = "";
        startListening();
      }
    } else {
      notifyError("Speech recognition not supported in this browser");
    }
  };

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>, emailToDelete: string) => {
    e.preventDefault();
    try {
      const formJson = e.target as any;
      const password = formJson.password ? formJson.password.value : formJson[0].value;
      const response = await fetch("http://localhost:5000/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: user?.email,
          password,
          emailToDelete,
        }),
      });
      let res = await response.json();
      if (res.status) {
        notifySuccess(res.message);
        setDeleteUser(null);
        setResults([]);
        setSearchTerm("");
      } else {
        notifyError(res.message);
        setDeleteUser(null);
      }
    } catch (e) {
      notifyError("An unexpected error occurred");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, userEmail: string) => {
    e.preventDefault();
    try {
      const formJson = e.target as any;
      const newNumber = formJson.number ? formJson.number.value : formJson[0].value;
      const response = await fetch("http://localhost:5000/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          newNumber,
          adminEmail: user?.email,
        }),
      });
      if (response.ok) {
        let res = await response.json();
        setUpdate(null);
        setResults([]);
        setSearchTerm("");
        notifySuccess(res.message);
      } else {
        notifyError("Update Failed");
      }
    } catch (err) {
      notifyError("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-x-hidden">
      <Nav active="Home" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Hero & Search Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            <FaSignal className="animate-pulse text-emerald-400" /> Real-time Extension Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent mb-3">
            Connect Instantly with Anyone
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Search extensions by name or number. Speak to search or type below to start HD Video & Audio calls with direct Chat & File Sharing.
          </p>

          {/* Search Bar Container */}
          <div className="mt-8 relative flex items-center justify-center">
            <div className="relative w-full max-w-xl flex items-center">
              <FaSearch className="absolute left-4 text-slate-400 w-5 h-5 pointer-events-none" />
              
              <input
                type="text"
                value={searchTerm}
                onChange={handleTextChange}
                placeholder={listening ? "Listening to your voice..." : "Search name or 4-digit extension..."}
                className="w-full pl-12 pr-24 py-4 rounded-2xl glass-input text-base text-white placeholder-slate-400 shadow-xl focus:shadow-indigo-500/20 transition-all duration-300"
              />

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-14 text-slate-400 hover:text-white p-2"
                >
                  <FaTimes />
                </button>
              )}

              {/* Mic Voice Search Button */}
              <button
                onClick={handleStartMic}
                title="Click to speak search query"
                className={`absolute right-2 p-3 rounded-xl transition-all duration-300 ${
                  listening 
                    ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                }`}
              >
                <FaMicrophone className={listening ? "animate-bounce" : ""} />
              </button>
            </div>
          </div>
          {listening && (
            <p className="text-xs text-indigo-400 font-semibold mt-2 animate-pulse">
              🎙️ Listening... Speak now to search extension
            </p>
          )}
        </motion.div>

        {/* Results Grid */}
        <div className="mt-6">
          <AnimatePresence>
            {results.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {results.map((item, idx) => {
                  const isOnline = onlineList.includes(item.email);
                  const fullName = `${item.name} ${item.lastName || ""}`.trim();
                  const initials = item.name ? item.name.charAt(0).toUpperCase() : "U";

                  return (
                    <motion.div
                      key={item._id || idx}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-panel-interactive p-5 rounded-2xl flex flex-col justify-between gap-4 border border-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        {/* Avatar & User Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/20">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-white tracking-wide">{fullName}</h3>
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-full border border-slate-700">
                                  Offline
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>Ext:</span>
                              <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80 text-indigo-300 font-bold">
                                {item.number}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Call & Chat Action Buttons */}
                        {update !== idx && deleteUser !== idx && (
                          <div className="flex items-center gap-2">
                            {/* Card Chat Button - Opens Inline Chat Drawer */}
                            <button
                              onClick={() =>
                                requireAuth(() => {
                                  setActiveChatUser(item);
                                  selectContact(item);
                                  markAsRead(item.email);
                                })
                              }
                              title="Chat & View History"
                              className="relative p-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 transition-all shadow-sm group"
                            >
                              <FaComments className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              {(unreadCounts[item.email] || 0) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce shadow-md shadow-red-500/50">
                                  {unreadCounts[item.email]}
                                </span>
                              )}
                            </button>

                            {/* Audio Call Button */}
                            <button
                              onClick={() => requireAuth(() => handleCall(item, "audio"))}
                              title="Start Audio Call"
                              className="p-3 rounded-xl bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500 transition-all shadow-sm group"
                            >
                              <FaPhoneAlt className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>

                            {/* Video Call Button */}
                            <button
                              onClick={() => requireAuth(() => handleCall(item, "video"))}
                              title="Start HD Video Call"
                              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 transition-all shadow-md shadow-indigo-600/30 group"
                            >
                              <FaVideo className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Admin Controls & Inline Forms */}
                      {admin && (
                        <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                          {update === idx || deleteUser === idx ? (
                            <form
                              onSubmit={(e) => {
                                if (deleteUser === idx) handleDelete(e, item.email);
                                else handleUpdate(e, item.email);
                              }}
                              className="flex items-center gap-2 w-full"
                            >
                              <input
                                type={deleteUser === idx ? "password" : "text"}
                                name={deleteUser === idx ? "password" : "number"}
                                placeholder={deleteUser === idx ? "Admin password to delete..." : "New extension number..."}
                                className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                                required
                              />
                              <button
                                type="submit"
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${
                                  deleteUser === idx ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
                                }`}
                              >
                                {deleteUser === idx ? "Confirm Delete" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setUpdate(null); setDeleteUser(null); }}
                                className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <button
                                onClick={() => { setUpdate(idx); setDeleteUser(null); }}
                                className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                              >
                                <FaUserEdit /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteUser(idx); setUpdate(null); }}
                                className="flex items-center gap-1 hover:text-red-400 transition-colors"
                              >
                                <FaTrashAlt /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : searchTerm ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 glass-panel rounded-2xl border border-slate-800 max-w-md mx-auto"
              >
                <p className="text-slate-400 text-base font-medium">No matching extension found for "{searchTerm}"</p>
              </motion.div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                Type a name or extension number above to find contacts.
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Slide-over Animated Chat Drawer Modal */}
      <AnimatePresence>
        {activeChatUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">
                    {activeChatUser.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {activeChatUser.name} {activeChatUser.lastName || ""}
                    </h3>
                    <p className="text-xs text-indigo-400 font-mono flex items-center gap-2">
                      <span>Ext: {activeChatUser.number}</span>
                      {onlineList.includes(activeChatUser.email) ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Offline</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCall(activeChatUser, "audio")}
                    title="Audio Call"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors"
                  >
                    <FaPhoneAlt className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCall(activeChatUser, "video")}
                    title="Video Call"
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <FaVideo className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveChatUser(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conversation Message Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-950/40">
                {(!conversations[activeChatUser.email] || conversations[activeChatUser.email].length === 0) ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No previous messages with {activeChatUser.name}. Send a message or file below to start chatting!
                  </div>
                ) : (
                  conversations[activeChatUser.email].map((msg, index) => {
                    const isSelf = msg.isSelf;
                    const fileObj = msg.fileId ? fileTransfers[msg.fileId] : null;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs md:text-sm ${
                            isSelf
                              ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20"
                              : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60"
                          }`}
                        >
                          {msg.isFile ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 font-medium">
                                <FaFileAlt className="w-4 h-4 text-indigo-200" />
                                <span className="truncate max-w-[180px] font-bold">{msg.fileName}</span>
                                <span className="text-[10px] opacity-75">
                                  ({((msg.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              </div>

                              {/* File Transfer Progress or Download */}
                              {fileObj ? (
                                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-700/50 text-[11px] space-y-1">
                                  <div className="flex justify-between text-slate-300">
                                    <span>Status: {fileObj.status}</span>
                                    <span>{fileObj.speed}</span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-400 h-full transition-all duration-200"
                                      style={{ width: `${fileObj.progress}%` }}
                                    />
                                  </div>
                                  {fileObj.url && (
                                    <a
                                      href={fileObj.url}
                                      download={fileObj.name || msg.fileName}
                                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-emerald-400 transition-colors"
                                    >
                                      <FaDownload /> Download File
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] opacity-70 italic block">File transfer recorded</span>
                              )}
                            </div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          )}
                          <span className={`text-[9px] mt-1 block text-right ${isSelf ? "text-indigo-200" : "text-slate-400"}`}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Attachment preview badge if selected */}
              {selectedChatFile && (
                <div className="px-4 py-2 bg-indigo-950/80 border-t border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
                  <span className="truncate font-medium">📎 File attached: {selectedChatFile.name}</span>
                  <button onClick={() => setSelectedChatFile(null)} className="p-1 hover:text-white">
                    <FaTimes />
                  </button>
                </div>
              )}

              {/* Drawer Input Bar */}
              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Unlimited Size File"
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <FaPaperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder={`Message ${activeChatUser.name}...`}
                  className="flex-1 px-4 py-3 rounded-xl glass-input text-xs md:text-sm text-white placeholder-slate-400"
                />

                <button
                  type="submit"
                  disabled={!chatInputText.trim() && !selectedChatFile}
                  className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-6 right-6 z-50 glass-panel p-6 rounded-3xl border border-indigo-500/40 shadow-2xl shadow-indigo-500/30 max-w-sm w-full animate-ring-pulse"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                <FaPhoneVolume className="animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Incoming {incomingCall.callType === "audio" ? "Audio" : "Video"} Call
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {incomingCall.callerName || "Peer Connection"}
                </h3>
                <p className="text-xs text-slate-400">
                  {incomingCall.callerEmail || "Calling your extension..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => onCallReject(incomingCall)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 text-sm font-bold transition-all shadow-md"
              >
                <FaPhoneSlash /> Reject
              </button>
              <button
                onClick={() => onCallAnswer(incomingCall)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/30"
              >
                <FaCheck /> Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Jarvis AI Launcher Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => {
            const next = !jarvisActive;
            setJarvisActive(next);
            if (next) {
              resetTranscript();
              lastProcessedTranscriptRef.current = "";
              if (!listening && browserSupportsSpeechRecognition) {
                startListening();
              }
              speakJarvis("Hey, how can I help you?");
            } else {
              if (listening) {
                stopListening();
              }
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/40 hover:scale-105 transition-all border border-indigo-400/30 group"
        >
          <FaRobot className="w-4 h-4 group-hover:rotate-12 transition-transform text-indigo-200" />
          <span>Jarvis Voice AI</span>
        </button>
      </div>

      {/* Animated Jarvis HUD Overlay */}
      <AnimatePresence>
        {jarvisActive && (
          <div className="fixed bottom-20 left-6 z-50">
            <JarvisOrb
              isListening={listening}
              speechText={transcript}
              jarvisStatus={jarvisStatus}
              onToggleListen={() => {
                if (listening) {
                  stopListening();
                } else {
                  handleStartMic();
                }
              }}
              onClose={() => setJarvisActive(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Login Required Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-indigo-500/40 shadow-2xl shadow-indigo-500/30 max-w-md w-full text-center relative overflow-hidden"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 mx-auto flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg shadow-indigo-500/30">
                <FaShieldAlt />
              </div>

              <h3 className="text-2xl font-extrabold text-white tracking-tight mb-2">
                Authentication Required
              </h3>

              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                You can search and view extensions freely, but you must be logged in to place Audio/Video calls or send Chat messages.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate("/login");
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-indigo-600/40"
                >
                  Log In / Register
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
