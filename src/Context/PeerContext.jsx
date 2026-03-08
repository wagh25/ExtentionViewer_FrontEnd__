
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { socket } from "../Services/socket.io";
import { nav } from "framer-motion/client";
const PeerContext = createContext(null);

export const usePeerContext = () => useContext(PeerContext);

export const PeerProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peer = useMemo(() => {
    return new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  }, []);

  const createOffer = useCallback(async () => {
    await sendStream();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, []);

  const createAnswer = useCallback(
    async (offer) => {
      await sendStream();
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    [peer],
  );

  const sendStream = useCallback(
    async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(stream);
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
    },
    [peer],
  );

  useEffect(() => {
    const handleTrackEvent = (event) => {
      const Stream = event.streams[0];
      console.log("Received remote stream:", event);
      setRemoteStream(Stream);
    };
    peer.addEventListener("track", handleTrackEvent);

    return () => {
      peer.removeEventListener("track", handleTrackEvent);
    };
  }, [peer]);

  useEffect(() => {
    peer.onconnectionstatechange = () => {
      console.log("Connection State:", peer.connectionState);
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE State:", peer.iceConnectionState);
    };
  }, [peer]);

  useEffect(() => {
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };
  }, [peer]);

  return (
    <PeerContext.Provider
      value={{ peer, createOffer, createAnswer, sendStream, remoteStream , stream }}
    >
      {children}
    </PeerContext.Provider>
  );
};
