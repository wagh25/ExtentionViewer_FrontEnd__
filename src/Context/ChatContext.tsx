import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { socket } from "../Services/socket.io";
import { useUserContext } from "./UserProvider";
import { notifySuccess } from "../utils/tostify";
import { User, ChatMessage, FileTransfer, ChatContextType } from "../types";

const ChatContext = createContext<ChatContextType | any>(null);

export const useChatContext = (): any => useContext(ChatContext);

const CHUNK_SIZE = 32768; // 32KB per chunk for Socket streaming safety

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useUserContext();

  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => {
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

  const [fileTransfers, setFileTransfers] = useState<Record<string, FileTransfer | any>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const incomingFilesRef = useRef<Record<string, any>>({});

  const playMessageChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);

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

  useEffect(() => {
    try {
      if (user?.email && Object.keys(conversations).length > 0) {
        localStorage.setItem(`ext_chats_${user.email}`, JSON.stringify(conversations));
      }
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [conversations, user?.email]);

  const markAsRead = useCallback((email: string) => {
    if (!email) return;
    setUnreadCounts((prev) => ({
      ...prev,
      [email]: 0,
    }));
  }, []);

  const selectContact = useCallback(
    (contact: User) => {
      setActiveContact(contact);
      if (contact?.email) {
        markAsRead(contact.email);
      }
    },
    [markAsRead]
  );

  const sendDirectMessage = useCallback(
    (recipientEmail: string, text: string) => {
      if (!text.trim() || !recipientEmail) return;

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const msgObj: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        text,
        senderEmail: user.email,
        senderName: user.name || "Me",
        timestamp,
        isSelf: true,
      } as any;

      socket.emit("directMessage", {
        recipientEmail,
        text,
      });

      setConversations((prev) => {
        const existing = prev[recipientEmail] || [];
        return {
          ...prev,
          [recipientEmail]: [...existing, msgObj],
        };
      });
    },
    [user.email, user.name]
  );

  const sendDirectFile = useCallback(
    (recipientEmail: string, file: File) => {
      if (!file || !recipientEmail) return;

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const startTime = Date.now();

      socket.emit("directFileMeta", {
        recipientEmail,
        id: fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        totalChunks,
      });

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
          recipientEmail,
        },
      }));

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const fileMsg: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        fileId,
        fileName: file.name,
        fileSize: file.size,
        isFile: true,
        senderEmail: user.email,
        senderName: user.name || "Me",
        timestamp,
        isSelf: true,
      } as any;

      setConversations((prev) => {
        const existing = prev[recipientEmail] || [];
        return {
          ...prev,
          [recipientEmail]: [...existing, fileMsg],
        };
      });

      let offset = 0;
      let bytesSent = 0;

      const readAndSendChunk = () => {
        if (offset >= file.size) {
          socket.emit("directFileEnd", { recipientEmail, id: fileId });
          setFileTransfers((prev) => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 100,
              status: "completed",
            },
          }));
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (!e.target || !e.target.result) return;
          socket.emit("directFileChunk", {
            recipientEmail,
            id: fileId,
            chunkData: e.target.result,
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
              speed: speedKbps > 1024 ? `${(speedKbps / 1024).toFixed(1)} MB/s` : `${speedKbps} KB/s`,
            },
          }));

          setTimeout(readAndSendChunk, 5);
        };

        reader.readAsArrayBuffer(slice);
      };

      readAndSendChunk();
    },
    [user.email, user.name]
  );

  useEffect(() => {
    const handleReceiveDirectMessage = (data: any) => {
      const { senderEmail, senderName, text, timestamp } = data;
      const formattedTime = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      playMessageChime();

      const snippet = text.length > 30 ? text.substring(0, 30) + "..." : text;
      notifySuccess(`💬 ${senderName || "Contact"}: ${snippet}`);

      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(`💬 Message from ${senderName || "Contact"}`, {
            body: text,
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `${window.location.origin}/login?inviteFrom=${encodeURIComponent(
              senderEmail
            )}&callerName=${encodeURIComponent(senderName || "Contact")}`;
          };
        } catch (e) {}
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [senderEmail]: (prev[senderEmail] || 0) + 1,
      }));

      setConversations((prev) => {
        const existing = prev[senderEmail] || [];
        return {
          ...prev,
          [senderEmail]: [
            ...existing,
            {
              id: `${Date.now()}_${Math.random()}`,
              text,
              senderEmail,
              senderName,
              timestamp: formattedTime,
              isSelf: false,
            } as any,
          ],
        };
      });
    };

    const handleReceiveDirectFileMeta = (data: any) => {
      const { id, name, size, mimeType, senderEmail, senderName } = data;

      playMessageChime();
      notifySuccess(`📁 Incoming file from ${senderName || "Contact"}: ${name}`);

      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(`📁 File from ${senderName || "Contact"}`, {
            body: `${name} (${(size / (1024 * 1024)).toFixed(2)} MB)`,
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `${window.location.origin}/login?inviteFrom=${encodeURIComponent(
              senderEmail
            )}&callerName=${encodeURIComponent(senderName || "Contact")}`;
          };
        } catch (e) {}
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [senderEmail]: (prev[senderEmail] || 0) + 1,
      }));

      incomingFilesRef.current[id] = {
        id,
        name,
        size,
        mimeType,
        chunks: [],
        receivedBytes: 0,
        startTime: Date.now(),
        senderEmail,
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
          senderEmail,
        },
      }));

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const fileMsg: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        fileId: id,
        fileName: name,
        fileSize: size,
        isFile: true,
        senderEmail,
        senderName: senderName || "Peer",
        timestamp,
        isSelf: false,
      } as any;

      setConversations((prev) => {
        const existing = prev[senderEmail] || [];
        return {
          ...prev,
          [senderEmail]: [...existing, fileMsg],
        };
      });
    };

    const handleReceiveDirectFileChunk = (data: any) => {
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
          speed: speedKbps > 1024 ? `${(speedKbps / 1024).toFixed(1)} MB/s` : `${speedKbps} KB/s`,
        },
      }));
    };

    const handleReceiveDirectFileEnd = (data: any) => {
      const { id } = data;
      const fileObj = incomingFilesRef.current[id];
      if (fileObj) {
        const blob = new Blob(fileObj.chunks, {
          type: fileObj.mimeType || "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);

        setFileTransfers((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            progress: 100,
            status: "completed",
            url,
          },
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
        sendDirectFile,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
