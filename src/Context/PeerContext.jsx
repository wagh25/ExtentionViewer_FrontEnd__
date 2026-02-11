import { createContext, useContext, useMemo } from "react";

const PeerContext = createContext();

export const usePeerContext = () => {
  return useContext(PeerContext);
};

export const PeerProvider = ({ children }) => {
  const peer = useMemo(() => {
    return new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  }, []);

  // const stream = useMemo(async () => {
  //   return await navigator.mediaDevices.getUserMedia({
  //     video: true,
  //     audio: true,
  //   });
  // }, []);

  const createOffer = async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  };

  // stream.getTracks().forEach((track) => {
  //   peer.addTrack(track, stream);
  // }, []);

  return (
    <PeerContext.Provider value={{ peer, createOffer }}>
      {children}
    </PeerContext.Provider>
  );
};
