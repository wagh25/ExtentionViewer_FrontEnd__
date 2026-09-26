import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePeerContext } from "../Context/PeerContext";
import { useUserContext } from "../Context/UserProvider";
import { socket } from "../Services/socket.io";
import { notifySuccess } from "../utils/tostify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
  FaComments,
  FaPaperclip,
  FaPaperPlane,
  FaDownload,
  FaFileAlt,
  FaTimes,
  FaVolumeUp,
  FaUser,
  FaCheckCircle
} from "react-icons/fa";

const Call = () => {
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    stream,
    remoteStream,
    callType,
    isMuted,
    isCameraOff,
    isScreenSharing,
    messages,
    fileTransfers,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
    sendFile,
    cleanupCall
  } = usePeerContext();

  const { user } = useUserContext();
  const navigate = useNavigate();

  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "files"
  const [inputText, setInputText] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // End Call Handler
  const handleEndcall = useCallback(
    (msg) => {
      if (typeof msg === "string") {
        notifySuccess(msg);
      } else {
        socket.emit("End Call", { id: socket.id });
      }
      cleanupCall();
      navigate("/");
    },
    [cleanupCall, navigate]
  );

  // Listen for socket call ended
  useEffect(() => {
    const handleCallEnded = (data) => {
      handleEndcall(data.message || "Call ended");
    };

    socket.on("callEnded", handleCallEnded);
    return () => {
      socket.off("callEnded", handleCallEnded);
    };
  }, [handleEndcall]);

  // Bind local stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Bind remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Chat message submit
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText, user.name || "Me");
    setInputText("");
  };

  // File selection submit
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendFile(file);
      notifySuccess(`Sending ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);
    }
  };

  const fileList = Object.values(fileTransfers);

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col justify-between">
      {/* Top Bar Header */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-4 glass-panel px-4 py-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wide">
            {callType === "audio" ? "Audio Call" : "HD Video Call"}
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-xs font-mono text-indigo-300 font-semibold">
          {formatDuration(callDuration)}
        </span>
      </div>

      {/* Main Video Grid Container */}
      <div className="relative flex-1 w-full h-full p-4 flex items-center justify-center">
        {/* Remote Video / Audio Display */}
        <div className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-500/20">
                  <FaUser />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-25" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Connecting Peer...</h2>
                <p className="text-slate-400 text-sm mt-1">Establishing secure P2P WebRTC Connection</p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                  <span className="audio-bar" />
                </div>
              </div>
            </div>
          )}

          {/* PIP Local Camera Preview (Floating Top Right) */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-6 right-6 z-20 w-48 h-36 rounded-2xl overflow-hidden glass-panel border border-indigo-500/30 shadow-2xl bg-slate-900/90 flex items-center justify-center"
          >
            {!isCameraOff && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <FaVideoSlash className="w-6 h-6 text-slate-500" />
                <span className="text-[11px] font-semibold">Camera Off</span>
              </div>
            )}
            {/* Local Badge */}
            <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-white font-bold backdrop-blur-sm border border-slate-800">
              You {isMuted && " (Muted)"}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 glass-panel px-6 py-3 rounded-3xl border border-slate-800/80 shadow-2xl">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`p-4 rounded-2xl transition-all duration-200 ${
            isMuted 
              ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white" 
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          {isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          title={isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
          className={`p-4 rounded-2xl transition-all duration-200 ${
            isCameraOff 
              ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white" 
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          {isCameraOff ? <FaVideoSlash className="w-5 h-5" /> : <FaVideo className="w-5 h-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          className={`p-4 rounded-2xl transition-all duration-200 ${
            isScreenSharing 
              ? "bg-indigo-600 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/30" 
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          <FaDesktop className="w-5 h-5" />
        </button>

        {/* Chat & File Share Drawer Toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          title="Toggle Chat & File Sharing Panel"
          className={`relative p-4 rounded-2xl transition-all duration-200 ${
            chatOpen 
              ? "bg-indigo-600 text-white border border-indigo-400/40 shadow-lg shadow-indigo-500/30" 
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          <FaComments className="w-5 h-5" />
          {messages.length > 0 && !chatOpen && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={() => handleEndcall()}
          title="End Call"
          className="p-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/40 border border-red-500/50 flex items-center gap-2 transition-all duration-200"
        >
          <FaPhoneSlash className="w-5 h-5" />
          <span className="text-sm">End Call</span>
        </button>
      </div>

      {/* Slide-Over Chat & Unlimited P2P File Sharing Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 z-40 w-full max-w-md h-full glass-panel border-l border-slate-800 shadow-2xl flex flex-col justify-between"
          >
            {/* Drawer Header & Tabs */}
            <div className="p-4 border-b border-slate-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">Call Workspace</h3>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "chat" 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Chat ({messages.length})
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "files" 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Unlimited File Transfer ({fileList.length})
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === "chat" ? (
                /* Chat Messages List */
                messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-1 px-1">
                        {msg.sender} • {msg.timestamp}
                      </span>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.isSelf
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <FaComments className="w-8 h-8 mb-2 opacity-50" />
                    <span>No messages yet. Start chatting!</span>
                  </div>
                )
              ) : (
                /* Unlimited P2P File Sharing Panel */
                <div className="space-y-4">
                  {/* File Upload Trigger Box */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer text-center transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <FaPaperclip className="w-8 h-8 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Send File (Unlimited Size)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct P2P DataChannel chunk streaming. Any file type or size.
                    </p>
                  </div>

                  {/* Active & Received File Transfers */}
                  {fileList.length > 0 ? (
                    fileList.map((file) => {
                      const isComplete = file.status === "completed";
                      return (
                        <div
                          key={file.id}
                          className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FaFileAlt className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                              <span className="text-xs font-bold text-white truncate max-w-[180px]">
                                {file.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                isComplete ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                              }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {isComplete ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <FaCheckCircle /> Transfer Completed
                                </span>
                              ) : (
                                `${file.progress}% • ${file.speed}`
                              )}
                            </span>
                            {isComplete && file.url && (
                              <a
                                href={file.url}
                                download={file.name}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow"
                              >
                                <FaDownload /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs text-slate-500 py-8">
                      No files shared yet in this call.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input Bar (Only when Chat Tab is Active) */}
            {activeTab === "chat" && (
              <form
                onSubmit={handleSendChat}
                className="p-4 border-t border-slate-800/80 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-400"
                />
                <button
                  type="submit"
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all"
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Call;



