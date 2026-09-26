
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { socket } from "../Services/socket.io";

const PeerContext = createContext(null);

export const usePeerContext = () => useContext(PeerContext);

const CHUNK_SIZE = 32768; // 32KB per chunk for data channel safety

export const PeerProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callType, setCallType] = useState("video"); // "video" | "audio"
  
  // Media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Chat & File Transfer State
  const [messages, setMessages] = useState([]);
  const [fileTransfers, setFileTransfers] = useState({}); // { [fileId]: { id, name, size, bytesTransferred, progress, speed, status, url, isOutgoing } }
  
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const receivingFileRef = useRef(null); // { id, name, size, mimeType, chunks: [], receivedBytes, startTime }
  const screenTrackRef = useRef(null);

  // Flush queued ICE candidates after setRemoteDescription
  const flushIceCandidates = useCallback(async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    console.log(`Flushing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding queued ICE candidate:", err);
      }
    }
  }, []);

  // Setup DataChannel Event Handlers
  const setupDataChannel = useCallback((channel) => {
    channel.binaryType = "arraybuffer";
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("RTCDataChannel Connected!");
    };

    channel.onclose = () => {
      console.log("RTCDataChannel Closed.");
    };

    channel.onerror = (err) => {
      console.error("RTCDataChannel Error:", err);
    };

    channel.onmessage = (event) => {
      const data = event.data;

      // Handle binary chunks for incoming file transfer
      if (data instanceof ArrayBuffer) {
        const fileState = receivingFileRef.current;
        if (!fileState) return;

        fileState.chunks.push(data);
        fileState.receivedBytes += data.byteLength;

        const now = Date.now();
        const durationSec = (now - fileState.startTime) / 1000 || 0.001;
        const speedKbps = Math.round((fileState.receivedBytes / 1024) / durationSec);
        const progress = Math.min(100, Math.round((fileState.receivedBytes / fileState.size) * 100));

        setFileTransfers((prev) => ({
          ...prev,
          [fileState.id]: {
            id: fileState.id,
            name: fileState.name,
            size: fileState.size,
            bytesTransferred: fileState.receivedBytes,
            progress,
            speed: speedKbps > 1024 ? `${(speedKbps / 1024).toFixed(1)} MB/s` : `${speedKbps} KB/s`,
            status: "transferring",
            isOutgoing: false
          }
        }));
        return;
      }

      // Handle JSON control messages (text chat, file-meta, file-end)
      try {
        const payload = JSON.parse(data);
        if (payload.type === "chat") {
          setMessages((prev) => [...prev, {
            id: Date.now() + Math.random(),
            sender: payload.sender || "Peer",
            text: payload.text,
            timestamp: payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSelf: false
          }]);
        } else if (payload.type === "file-meta") {
          receivingFileRef.current = {
            id: payload.id,
            name: payload.name,
            size: payload.size,
            mimeType: payload.mimeType,
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now()
          };
          setFileTransfers((prev) => ({
            ...prev,
            [payload.id]: {
              id: payload.id,
              name: payload.name,
              size: payload.size,
              bytesTransferred: 0,
              progress: 0,
              speed: "0 KB/s",
              status: "transferring",
              isOutgoing: false
            }
          }));
        } else if (payload.type === "file-end") {
          const fileState = receivingFileRef.current;
          if (fileState && fileState.id === payload.id) {
            const blob = new Blob(fileState.chunks, { type: fileState.mimeType || "application/octet-stream" });
            const url = URL.createObjectURL(blob);

            setFileTransfers((prev) => ({
              ...prev,
              [payload.id]: {
                ...prev[payload.id],
                progress: 100,
                status: "completed",
                url
              }
            }));
            receivingFileRef.current = null;
          }
        }
      } catch (e) {
        console.error("Error parsing DataChannel message:", e);
      }
    };
  }, []);

  // Create RTCPeerConnection Instance
  const createPeerConnection = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
    }

    const newPeer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });

    newPeer.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    newPeer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    newPeer.ondatachannel = (event) => {
      console.log("Incoming DataChannel received");
      setupDataChannel(event.channel);
    };

    peerRef.current = newPeer;
    setPeer(newPeer);
    return newPeer;
  }, [setupDataChannel]);

  // Acquire Media Stream (Audio / Video)
  const acquireStream = useCallback(async (type = "video", currentPeer) => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      
      const constraints = type === "audio" 
        ? { audio: true, video: false }
        : { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } } };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(localStream);
      setCallType(type);
      setIsCameraOff(type === "audio");
      setIsMuted(false);

      if (currentPeer) {
        // Clear existing senders first
        const senders = currentPeer.getSenders();
        senders.forEach((sender) => currentPeer.removeTrack(sender));

        localStream.getTracks().forEach((track) => {
          currentPeer.addTrack(track, localStream);
        });
      }
      return localStream;
    } catch (err) {
      console.error("Error acquiring user media:", err);
      throw err;
    }
  }, [stream]);

  // Create Call Offer (Caller Side)
  const createOffer = useCallback(async (type = "video") => {
    iceCandidateQueueRef.current = [];
    const currentPeer = createPeerConnection();
    
    // Create RTCDataChannel for Chat & File Sharing
    const channel = currentPeer.createDataChannel("chatChannel");
    setupDataChannel(channel);

    await acquireStream(type, currentPeer);

    const offer = await currentPeer.createOffer();
    await currentPeer.setLocalDescription(offer);
    return offer;
  }, [createPeerConnection, acquireStream, setupDataChannel]);

  // Create Call Answer (Callee Side)
  const createAnswer = useCallback(async (offer, type = "video") => {
    iceCandidateQueueRef.current = [];
    const currentPeer = createPeerConnection();

    await acquireStream(type, currentPeer);

    await currentPeer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushIceCandidates(currentPeer);

    const answer = await currentPeer.createAnswer();
    await currentPeer.setLocalDescription(answer);
    return answer;
  }, [createPeerConnection, acquireStream, flushIceCandidates]);

  // Handle incoming remote answer
  const handleAnswerReceived = useCallback(async (answer) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await flushIceCandidates(peerRef.current);
    }
  }, [flushIceCandidates]);

  // Media Control Functions
  const toggleMic = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsMuted(!nextState);
      }
    }
  }, [stream]);

  const toggleCamera = useCallback(async () => {
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const videoTrack = videoTracks[0];
      if (videoTrack.readyState === "ended" || isCameraOff) {
        if (videoTrack.readyState === "ended") {
          try {
            const freshStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } }
            });
            const newVideoTrack = freshStream.getVideoTracks()[0];
            stream.removeTrack(videoTrack);
            stream.addTrack(newVideoTrack);

            if (peerRef.current) {
              const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) {
                sender.replaceTrack(newVideoTrack);
              } else {
                peerRef.current.addTrack(newVideoTrack, stream);
              }
            }
            setIsCameraOff(false);
          } catch (err) {
            console.error("Error re-enabling camera:", err);
          }
        } else {
          videoTrack.enabled = true;
          setIsCameraOff(false);
        }
      } else {
        videoTrack.enabled = false;
        setIsCameraOff(true);
      }
    } else {
      // Call was started as Audio-only -> Dynamically acquire camera video track
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } }
        });
        const newVideoTrack = freshStream.getVideoTracks()[0];
        stream.addTrack(newVideoTrack);

        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            peerRef.current.addTrack(newVideoTrack, stream);
          }
        }
        setIsCameraOff(false);
      } catch (err) {
        console.error("Error adding camera to audio call:", err);
      }
    }
  }, [stream, isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!peerRef.current || !stream) return;

    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      const videoTrack = stream.getVideoTracks()[0];
      const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = peerRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          peerRef.current.addTrack(screenTrack, screenStream);
        }

        screenTrack.onended = () => {
          const cameraTrack = stream.getVideoTracks()[0];
          if (sender && cameraTrack) {
            sender.replaceTrack(cameraTrack);
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  }, [isScreenSharing, stream]);

  // Send Text Message over DataChannel / Socket
  const sendChatMessage = useCallback((text, senderName = "Me") => {
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = { type: "chat", text, sender: senderName, timestamp };

    let sent = false;
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(msgObj));
      sent = true;
    } else {
      // Fallback via socket
      socket.emit("sendChatMessage", { text });
      sent = true;
    }

    if (sent) {
      setMessages((prev) => [...prev, {
        id: Date.now() + Math.random(),
        sender: senderName,
        text,
        timestamp,
        isSelf: true
      }]);
    }
  }, []);

  // Send Unlimited Size File over RTCDataChannel
  const sendFile = useCallback(async (file) => {
    if (!file) return;

    const dataChannel = dataChannelRef.current;
    if (!dataChannel || dataChannel.readyState !== "open") {
      alert("Peer connection data channel is not open yet!");
      return;
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const startTime = Date.now();

    // 1. Send File Meta
    const meta = {
      type: "file-meta",
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      totalChunks
    };
    dataChannel.send(JSON.stringify(meta));

    // Register outgoing state
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
        isOutgoing: true
      }
    }));

    // 2. Stream Chunks Sequentially with Backpressure Control
    let offset = 0;
    let bytesSent = 0;

    const readAndSendChunk = () => {
      if (offset >= file.size) {
        // 3. Send Completion Signal
        dataChannel.send(JSON.stringify({ type: "file-end", id: fileId }));
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

      // Pause if data channel buffer is full
      if (dataChannel.bufferedAmount > 8 * 1024 * 1024) {
        dataChannel.onbufferedamountlow = () => {
          dataChannel.onbufferedamountlow = null;
          readAndSendChunk();
        };
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target.result) return;
        dataChannel.send(e.target.result);
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

        setTimeout(readAndSendChunk, 0);
      };

      reader.readAsArrayBuffer(slice);
    };

    readAndSendChunk();
  }, []);

  // Cleanup Entire Call Session
  const cleanupCall = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setPeer(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setMessages([]);
    setFileTransfers({});
    iceCandidateQueueRef.current = [];
    receivingFileRef.current = null;
  }, [stream, remoteStream]);

  // Listen for socket ICE Candidates
  useEffect(() => {
    const handleIceCandidate = async (candidate) => {
      try {
        const pc = peerRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueueRef.current.push(candidate);
        }
      } catch (err) {
        console.error("ICE Candidate error:", err);
      }
    };

    const handleReceiveChatMessage = (data) => {
      setMessages((prev) => [...prev, {
        id: Date.now() + Math.random(),
        sender: data.sender || "Peer",
        text: data.text,
        timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false
      }]);
    };

    socket.on("ice-candidate", handleIceCandidate);
    socket.on("receiveChatMessage", handleReceiveChatMessage);

    return () => {
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("receiveChatMessage", handleReceiveChatMessage);
    };
  }, []);

  return (
    <PeerContext.Provider
      value={{
        peer,
        peerRef,
        stream,
        remoteStream,
        callType,
        isMuted,
        isCameraOff,
        isScreenSharing,
        messages,
        fileTransfers,
        createOffer,
        createAnswer,
        handleAnswerReceived,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        sendChatMessage,
        sendFile,
        cleanupCall
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

