import React, { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { usePeerContext } from '../Context/PeerContext';
import { nav } from 'framer-motion/client';



const Call = () => {
    const [stream, setStream] = React.useState(null);
    const videoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const { peer , sendStream , remoteStream } = usePeerContext();
    const Navigate = useNavigate();

    const handleEndcall=useCallback(()=>{
      stream && stream.getTracks().forEach((track) => track.stop());
      Navigate('/')
    },[]);



    const getStream = useCallback(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);

        sendStream(mediaStream);
        console.log("Media Stream obtained:", mediaStream);
        // Attach stream to video element
        if (videoRef.current) {

          videoRef.current.srcObject = mediaStream;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
          console.log("Stream",stream ,"remoteStream",remoteStream);

      } catch (e) {
        console.error("Error getting media stream:", e);
      }
    }, []);

    React.useEffect(() => {
      getStream();
    }, []);

    React.useEffect(() => {
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } }, []);


  return (
    <div>
      <h1>me</h1>
      {stream ? <video ref={videoRef} autoPlay  playsInline style={{width: '500px',height: '500px'}}/>
      : ""}
        <h1>remote</h1>
      {remoteStream ? <video ref={remoteVideoRef} autoPlay  playsInline style={{width: '500px',height: '500px'}}/>
      : ""}
      <button onClick={handleEndcall}>End Call</button> 
    </div>
  )
}

export default Call


