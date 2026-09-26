import React from "react";

export interface User {
  _id?: string;
  name: string;
  lastName?: string;
  email: string;
  number?: string;
  userType?: "admin" | "user" | string;
  isAuthenticated?: boolean;
}

export interface UserContextType {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
}

export interface ChatMessage {
  id?: string;
  text?: string;
  sender?: string;
  recipient?: string;
  timestamp?: string;
  isSelf?: boolean;
  isFile?: boolean;
  fileName?: string;
  fileSize?: number;
  fileId?: string;
}

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "sending" | "receiving" | "completed" | "error";
  speed?: string;
  url?: string;
}

export interface ChatContextType {
  activeContact: User | null;
  conversations: Record<string, ChatMessage[]>;
  fileTransfers: Record<string, FileTransfer>;
  unreadCounts: Record<string, number>;
  selectContact: (contact: User) => void;
  sendDirectMessage: (recipientEmail: string, text: string) => void;
  sendDirectFile: (recipientEmail: string, file: File) => void;
  markAsRead: (email: string) => void;
}

export interface IncomingCallData {
  offer: RTCSessionDescriptionInit;
  callerSocket: string;
  callerEmail?: string;
  callerName?: string;
  callType?: "audio" | "video";
  message?: string;
}

export interface PeerContextType {
  peerRef: React.RefObject<RTCPeerConnection | null>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  createOffer: (type?: "audio" | "video") => Promise<RTCSessionDescriptionInit>;
  createAnswer: (offer: RTCSessionDescriptionInit, type?: "audio" | "video") => Promise<RTCSessionDescriptionInit>;
  handleAnswerReceived: (answer: RTCSessionDescriptionInit) => Promise<void>;
  toggleMic: () => boolean;
  toggleCamera: (type?: "audio" | "video") => Promise<boolean>;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
  endCall: () => void;
}
