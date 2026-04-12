
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { socket } from "../Services/socket.io";
import { nav } from "framer-motion/client";
const PeerContext = createContext(null);

export const usePeerContext = () => useContext(PeerContext);

export const PeerProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer ,setPeer] = useState(null);
  const peerRef = useRef(null);

  // const peer = useMemo(() => {
  //   return new RTCPeerConnection({
  //     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  //   });
  // }, []);

  const createPeerConnection = () => {
  const newPeer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // attach events again
  newPeer.ontrack = (event) => {
    setRemoteStream(event.streams[0]);
  };

  newPeer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerRef.current = newPeer;
  return newPeer;
};

  const createOffer = useCallback(async () => {
    let currentPeer = createPeerConnection();
    setPeer(currentPeer);
    await sendStream(currentPeer);
    const offer = await currentPeer.createOffer();
    await currentPeer.setLocalDescription(offer);
    return offer;
  }, [peer]);

  const createAnswer = useCallback(
    async (offer) => {
    let currentPeer = createPeerConnection();
    setPeer(currentPeer);
      await sendStream(currentPeer);
      await currentPeer.setRemoteDescription(offer);
      const answer = await currentPeer.createAnswer();
      await currentPeer.setLocalDescription(answer);
      return answer;
    },
    [peer],
  );

  const sendStream = useCallback(
    async (currentPeer) => {
        if (stream) return;
      const Stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(Stream);
      Stream.getTracks().forEach((track) => {
        currentPeer.addTrack(track, Stream);
      });
    },
    [peer],
  );

  // useEffect(() => {
  //   const handleTrackEvent = (event) => {
  //     const Stream = event.streams[0];
  //     console.log("Received remote stream:", event);
  //     setRemoteStream(Stream);
  //   };
  //   peer.addEventListener("track", handleTrackEvent);

  //   return () => {
  //     peer.removeEventListener("track", handleTrackEvent);
  //   };
  // }, [peer]);

  // useEffect(() => {
  //   peer.onconnectionstatechange = () => {
  //     console.log("Connection State:", peer.connectionState);
  //   };

  //   peer.oniceconnectionstatechange = () => {
  //     console.log("ICE State:", peer.iceConnectionState);
  //   };
  // }, [peer]);

  // useEffect(() => {
  //   peer.onicecandidate = (event) => {
  //     if (event.candidate) {
  //       socket.emit("ice-candidate", event.candidate);
  //     }
  //   };
  // }, [peer]);

  useEffect(() => {
  socket.on("ice-candidate", async (candidate) => {
    try {
      console.log("Received ICE candidate:", candidate);
      await peer.addIceCandidate(candidate);
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  });

  return () => {
    socket.off("ice-candidate");
  };
}, [peer]);

  return (
    <PeerContext.Provider
      value={{ peer, peerRef, createOffer, createAnswer, sendStream, remoteStream , stream }}
    >
      {children}
    </PeerContext.Provider>
  );
};
