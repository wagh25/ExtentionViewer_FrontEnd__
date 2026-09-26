import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { socket } from "../Services/socket.io";
import { useUserContext } from "./UserProvider";
import { notifySuccess } from "../utils/tostify";

const ChatContext = createContext(null);

export const useChatContext = () => useContext(ChatContext);

const CHUNK_SIZE = 32768; // 32KB per chunk for Socket streaming safety

export const ChatProvider = ({ children }) => {
  const { user } = useUserContext();
  
  // State: { [userEmail]: [ { id, text, fileId, senderEmail, senderName, timestamp, isSelf } ] }
  const [conversations, setConversations] = useState(() => {
    try {
      if (user?.email) {
        const saved = localStorage.getItem(`ext_chats_${user.email}`);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading chat history from localStorage:", e);
    }
    return {};
  });
  
  // State: { [fileId]: { id, name, size, bytesTransferred, progress, speed, status, url, isOutgoing, recipientEmail, senderEmail } }
  const [fileTransfers, setFileTransfers] = useState({});

  // Unread message counters per user email: { [userEmail]: count }
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Active selected contact user object for chat
  const [activeContact, setActiveContact] = useState(null);

  // Buffer for incoming file assembling: { [fileId]: { id, name, size, mimeType, chunks: [], receivedBytes, startTime, senderEmail } }
  const incomingFilesRef = useRef({});

  // Web Audio Chime Synthesizer for Incoming Chat & File Notifications
  const playMessageChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5 note

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log("Audio chime error:", e);
    }
  }, []);

  // Sync conversations to localStorage whenever changed
  useEffect(() => {
    try {
      if (user?.email && Object.keys(conversations).length > 0) {
        localStorage.setItem(`ext_chats_${user.email}`, JSON.stringify(conversations));
      }
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [conversations, user?.email]);

  // Clear unread count for contact
  const markAsRead = useCallback((email) => {
    if (!email) return;
    setUnreadCounts((prev) => ({
      ...prev,
      [email]: 0
    }));
  }, []);

  // Select Contact to start / view chat
  const selectContact = useCallback((contact) => {
    setActiveContact(contact);
    if (contact?.email) {
      markAsRead(contact.email);
    }
  }, [markAsRead]);

  // Send Direct Text Message
  const sendDirectMessage = useCallback((recipientEmail, text) => {
    if (!text.trim() || !recipientEmail) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = {
      id: Date.now() + Math.random(),
      text,
      senderEmail: user.email,
      senderName: user.name || "Me",
      timestamp,
      isSelf: true
    };

    // Emit socket event
    socket.emit("directMessage", {
      recipientEmail,
      text
    });

    // Update local conversation state
    setConversations((prev) => {
      const existing = prev[recipientEmail] || [];
      return {
        ...prev,
        [recipientEmail]: [...existing, msgObj]
      };
    });
  }, [user.email, user.name]);

  // Send Unlimited Size File over Sockets
  const sendDirectFile = useCallback((recipientEmail, file) => {
    if (!file || !recipientEmail) return;

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const startTime = Date.now();

    // 1. Send File Meta Header
    socket.emit("directFileMeta", {
      recipientEmail,
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      totalChunks
    });

    // Track outgoing transfer state
    setFileTransfers((prev) => ({
      ...prev,
      [fileId]: {
        id: fileId,
        name: file.name,
        size: file.size,
        bytesTransferred: 0,
        progress: 0,
        speed: "0 KB/s",
        status: "transferring",
        isOutgoing: true,
        recipientEmail
      }
    }));

    // Add file notice entry into conversation timeline
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fileMsg = {
      id: Date.now() + Math.random(),
      fileId,
      fileName: file.name,
      fileSize: file.size,
      isFile: true,
      senderEmail: user.email,
      senderName: user.name || "Me",
      timestamp,
      isSelf: true
    };

    setConversations((prev) => {
      const existing = prev[recipientEmail] || [];
      return {
        ...prev,
        [recipientEmail]: [...existing, fileMsg]
      };
    });

    // 2. Stream Chunks Sequentially
    let offset = 0;
    let bytesSent = 0;

    const readAndSendChunk = () => {
      if (offset >= file.size) {
        // 3. Send Completion Signal
        socket.emit("directFileEnd", { recipientEmail, id: fileId });
        setFileTransfers((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 100,
            status: "completed"
          }
        }));
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target.result) return;
        socket.emit("directFileChunk", {
          recipientEmail,
          id: fileId,
          chunkData: e.target.result
        });

        offset += slice.size;
        bytesSent += slice.size;

        const durationSec = (Date.now() - startTime) / 1000 || 0.001;
        const speedKbps = Math.round((bytesSent / 1024) / durationSec);
        const progress = Math.min(100, Math.round((bytesSent / file.size) * 100));

        setFileTransfers((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            bytesTransferred: bytesSent,
            progress,
            speed: speedKbps > 1024 ? `${(speedKbps / 1024).toFixed(1)} MB/s` : `${speedKbps} KB/s`
          }
        }));

        setTimeout(readAndSendChunk, 5); // 5ms pacing to allow socket buffer processing
      };

      reader.readAsArrayBuffer(slice);
    };

    readAndSendChunk();
  }, [user.email, user.name]);

  // Listen for socket direct chat & file transfer events
  useEffect(() => {
    // Direct Text Message Receiver
    const handleReceiveDirectMessage = (data) => {
      const { senderEmail, senderName, text, timestamp } = data;
      const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Trigger Notification Audio Chime
      playMessageChime();

      // Trigger Toast Notification
      const snippet = text.length > 30 ? text.substring(0, 30) + '...' : text;
      notifySuccess(`💬 ${senderName || "Contact"}: ${snippet}`);

      // Native Desktop Notification if granted
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(`💬 Message from ${senderName || "Contact"}`, {
            body: text
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `${window.location.origin}/login?inviteFrom=${encodeURIComponent(senderEmail)}&callerName=${encodeURIComponent(senderName || "Contact")}`;
          };
        } catch (e) {}
      }

      // Increment Unread Count
      setUnreadCounts((prev) => ({
        ...prev,
        [senderEmail]: (prev[senderEmail] || 0) + 1
      }));

      setConversations((prev) => {
        const existing = prev[senderEmail] || [];
        return {
          ...prev,
          [senderEmail]: [
            ...existing,
            {
              id: Date.now() + Math.random(),
              text,
              senderEmail,
              senderName,
              timestamp: formattedTime,
              isSelf: false
            }
          ]
        };
      });
    };

    // Direct File Meta Receiver
    const handleReceiveDirectFileMeta = (data) => {
      const { id, name, size, mimeType, senderEmail, senderName } = data;

      // Trigger Notification Audio Chime
      playMessageChime();

      // Trigger Toast Notification
      notifySuccess(`📁 Incoming file from ${senderName || "Contact"}: ${name}`);

      // Native Desktop Notification if granted
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(`📁 File from ${senderName || "Contact"}`, {
            body: `${name} (${(size / (1024 * 1024)).toFixed(2)} MB)`
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `${window.location.origin}/login?inviteFrom=${encodeURIComponent(senderEmail)}&callerName=${encodeURIComponent(senderName || "Contact")}`;
          };
        } catch (e) {}
      }

      // Increment Unread Count
      setUnreadCounts((prev) => ({
        ...prev,
        [senderEmail]: (prev[senderEmail] || 0) + 1
      }));

      incomingFilesRef.current[id] = {
        id,
        name,
        size,
        mimeType,
        chunks: [],
        receivedBytes: 0,
        startTime: Date.now(),
        senderEmail
      };

      setFileTransfers((prev) => ({
        ...prev,
        [id]: {
          id,
          name,
          size,
          bytesTransferred: 0,
          progress: 0,
          speed: "0 KB/s",
          status: "transferring",
          isOutgoing: false,
          senderEmail
        }
      }));

      // Add incoming file entry into conversation
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fileMsg = {
        id: Date.now() + Math.random(),
        fileId: id,
        fileName: name,
        fileSize: size,
        isFile: true,
        senderEmail,
        senderName: senderName || "Peer",
        timestamp,
        isSelf: false
      };

      setConversations((prev) => {
        const existing = prev[senderEmail] || [];
        return {
          ...prev,
          [senderEmail]: [...existing, fileMsg]
        };
      });
    };

    // Direct File Chunk Receiver
    const handleReceiveDirectFileChunk = (data) => {
      const { id, chunkData } = data;
      const fileObj = incomingFilesRef.current[id];
      if (!fileObj) return;

      fileObj.chunks.push(chunkData);
      fileObj.receivedBytes += chunkData.byteLength || chunkData.size || 0;

      const durationSec = (Date.now() - fileObj.startTime) / 1000 || 0.001;
      const speedKbps = Math.round((fileObj.receivedBytes / 1024) / durationSec);
      const progress = Math.min(100, Math.round((fileObj.receivedBytes / fileObj.size) * 100));

      setFileTransfers((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          bytesTransferred: fileObj.receivedBytes,
          progress,
          speed: speedKbps > 1024 ? `${(speedKbps / 1024).toFixed(1)} MB/s` : `${speedKbps} KB/s`
        }
      }));
    };

    // Direct File End Receiver
    const handleReceiveDirectFileEnd = (data) => {
      const { id } = data;
      const fileObj = incomingFilesRef.current[id];
      if (fileObj) {
        const blob = new Blob(fileObj.chunks, { type: fileObj.mimeType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        setFileTransfers((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            progress: 100,
            status: "completed",
            url
          }
        }));
        delete incomingFilesRef.current[id];
      }
    };

    socket.on("receiveDirectMessage", handleReceiveDirectMessage);
    socket.on("receiveDirectFileMeta", handleReceiveDirectFileMeta);
    socket.on("receiveDirectFileChunk", handleReceiveDirectFileChunk);
    socket.on("receiveDirectFileEnd", handleReceiveDirectFileEnd);

    return () => {
      socket.off("receiveDirectMessage", handleReceiveDirectMessage);
      socket.off("receiveDirectFileMeta", handleReceiveDirectFileMeta);
      socket.off("receiveDirectFileChunk", handleReceiveDirectFileChunk);
      socket.off("receiveDirectFileEnd", handleReceiveDirectFileEnd);
    };
  }, [playMessageChime]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        fileTransfers,
        unreadCounts,
        markAsRead,
        activeContact,
        selectContact,
        sendDirectMessage,
        sendDirectFile
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
