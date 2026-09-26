import React, { useState, useEffect, useRef } from "react";
import Nav from "./Nav";
import { useChatContext } from "../Context/ChatContext";
import { useUserContext } from "../Context/UserProvider";
import { usePeerContext } from "../Context/PeerContext";
import { useNavigate } from "react-router-dom";
import { socket } from "../Services/socket.io";
import { notifySuccess, notifyError } from "../utils/tostify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaComments,
  FaSearch,
  FaPaperclip,
  FaPaperPlane,
  FaPhoneAlt,
  FaVideo,
  FaDownload,
  FaFileAlt,
  FaCheckCircle,
  FaUser,
  FaCircle,
  FaSignal
} from "react-icons/fa";

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const { createOffer } = usePeerContext();
  const {
    conversations,
    fileTransfers,
    activeContact,
    selectContact,
    sendDirectMessage,
    sendDirectFile
  } = useChatContext();

  const [contacts, setContacts] = useState([]);
  const [onlineList, setOnlineList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState("messages"); // "messages" | "files"

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch initial extensions list
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const resp = await fetch("http://localhost:5000/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "a" }), // fetch contacts
        });
        if (resp.ok) {
          const data = await resp.json();
          const list = Array.isArray(data) ? data : data.users || [];
          setContacts(list.filter((c) => c.email !== user.email));
          if (list.length > 0 && !activeContact) {
            selectContact(list.find((c) => c.email !== user.email) || list[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching contacts:", err);
      }
    };
    fetchContacts();
  }, [user.email, activeContact, selectContact]);

  // Listen for socket online users
  useEffect(() => {
    const handleOnlineUsers = (list) => {
      setOnlineList(list || []);
    };
    socket.emit("getOnlineUsers");
    socket.on("getOnlineUsers", handleOnlineUsers);
    return () => {
      socket.off("getOnlineUsers", handleOnlineUsers);
    };
  }, []);

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) =>
    `${c.name} ${c.lastName} ${c.number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active messages list for selected contact
  const activeMessages = activeContact ? conversations[activeContact.email] || [] : [];
  
  // Active file transfers list for selected contact
  const activeFiles = Object.values(fileTransfers).filter(
    (f) => f.recipientEmail === activeContact?.email || f.senderEmail === activeContact?.email
  );

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  // Handle Text Message Submit
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeContact) return;
    sendDirectMessage(activeContact.email, messageText);
    setMessageText("");
  };

  // Handle File Select Submit (Unlimited Size)
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && activeContact) {
      sendDirectFile(activeContact.email, file);
      notifySuccess(`Sending ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);
    }
  };

  // One-click convert chat to Audio/Video Call
  const handleCallFromChat = async (type = "video") => {
    if (!activeContact) return;
    try {
      notifySuccess(`Initiating ${type === "audio" ? "Audio" : "Video"} Call to ${activeContact.name}...`);
      const offer = await createOffer(type);
      socket.emit("callUser", {
        touser: activeContact,
        offer,
        callType: type,
        message: `${user.name} is calling you`
      });
    } catch (err) {
      console.error(err);
      notifyError("Camera/Microphone access required to initiate call");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Nav active="Chat" />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex gap-6 h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Contacts Sidebar */}
        <div className="w-full md:w-80 glass-panel rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl flex-shrink-0">
          <div className="p-4 border-b border-slate-800/80">
            <h2 className="text-lg font-extrabold text-white tracking-wide mb-3 flex items-center gap-2">
              <FaComments className="text-indigo-400" /> Contacts & Chat
            </h2>
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-500 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extension..."
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredContacts.map((contact) => {
              const isOnline = onlineList.includes(contact.email);
              const isSelected = activeContact?.email === contact.email;
              const initials = contact.name ? contact.name.charAt(0).toUpperCase() : "U";
              const lastMsgArr = conversations[contact.email] || [];
              const lastMsg = lastMsgArr[lastMsgArr.length - 1];

              return (
                <div
                  key={contact._id || contact.email}
                  onClick={() => selectContact(contact)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                      : "hover:bg-slate-800/60 border border-transparent text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow">
                        {initials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                          isOnline ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-white truncate">
                        {contact.name} {contact.lastName}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {lastMsg ? lastMsg.text : `Ext: ${contact.number}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300 border border-slate-700">
                    {contact.number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Chat Workspace */}
        {activeContact ? (
          <div className="flex-1 glass-panel rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
            {/* Header Bar */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-base shadow">
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      {activeContact.name} {activeContact.lastName}
                    </h3>
                    <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono font-bold">
                      Ext: {activeContact.number}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <FaCircle className={`w-2 h-2 ${onlineList.includes(activeContact.email) ? "text-emerald-400 animate-pulse" : "text-slate-600"}`} />
                    {onlineList.includes(activeContact.email) ? "Online now" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Quick Launch Call Actions & Tabs */}
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "messages" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab("files")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === "files" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Files ({activeFiles.length})
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-800" />

                <button
                  onClick={() => handleCallFromChat("audio")}
                  title="Audio Call"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all shadow"
                >
                  <FaPhoneAlt className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCallFromChat("video")}
                  title="HD Video Call"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 transition-all shadow shadow-indigo-600/30"
                >
                  <FaVideo className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Thread / File Workspace */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === "messages" ? (
                activeMessages.length > 0 ? (
                  activeMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-1 px-1">
                        {msg.isSelf ? "You" : msg.senderName} • {msg.timestamp}
                      </span>
                      <div
                        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.isSelf
                            ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20"
                            : "bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/80"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                    <FaComments className="w-12 h-12 mb-3 opacity-40 text-indigo-400" />
                    <span>No messages yet. Send a message to start chatting!</span>
                  </div>
                )
              ) : (
                /* Independent File Transfer Workspace */
                <div className="space-y-4 max-w-xl mx-auto py-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-3xl bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer text-center transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <FaPaperclip className="w-10 h-10 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-extrabold text-base text-white">Send File (Unlimited Size)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct 1-on-1 chunked WebSocket transfer. Stream videos, archives, or docs of any size!
                    </p>
                  </div>

                  {/* Active Files List */}
                  {activeFiles.length > 0 ? (
                    activeFiles.map((file) => {
                      const isComplete = file.status === "completed";
                      return (
                        <div
                          key={file.id}
                          className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FaFileAlt className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                              <div>
                                <h5 className="text-xs font-bold text-white truncate max-w-[220px]">
                                  {file.name}
                                </h5>
                                <span className="text-[10px] text-slate-400">
                                  {file.isOutgoing ? "Outgoing File" : "Incoming File"}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 font-mono font-bold">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>

                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                isComplete ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                              }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                            <span>
                              {isComplete ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <FaCheckCircle /> Completed
                                </span>
                              ) : (
                                `${file.progress}% • ${file.speed}`
                              )}
                            </span>
                            {isComplete && file.url && (
                              <a
                                href={file.url}
                                download={file.name}
                                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
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
                      No files shared with {activeContact.name} yet.
                    </p>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Bar */}
            {activeTab === "messages" && (
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-slate-800/80 flex items-center gap-3 bg-slate-950/60"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach File (Unlimited Size)"
                  className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all"
                >
                  <FaPaperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Type a message to ${activeContact.name}...`}
                  className="flex-1 px-4 py-3 rounded-2xl glass-input text-sm text-white placeholder-slate-400"
                />
                <button
                  type="submit"
                  className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex-1 glass-panel rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center p-8">
            <FaComments className="w-16 h-16 text-indigo-400/40 mb-4" />
            <h3 className="text-xl font-bold text-white">Select a Contact to Start Chatting</h3>
            <p className="text-slate-400 text-xs mt-1">
              Choose an extension contact from the left list to send messages or share files of unlimited size.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Chat;
