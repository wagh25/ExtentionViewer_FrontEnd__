import React, { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { usePeerContext } from '../Context/PeerContext';
import {socket} from "../Services/socket.io";
import { notifyError,notifySuccess  } from '../utils/tostify';


const Call = () => {
    const videoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const { peer , sendStream , remoteStream , stream } = usePeerContext();
    const Navigate = useNavigate();

    const handleEndcall=useCallback((msg)=>{
      console.log('msg',msg );
      msg && notifySuccess(msg);
      stream && stream.getTracks().forEach((track) => track.stop());
      console.log("typeof msg",typeof(msg)  );
      typeof(msg) != 'string' ? socket.emit('End Call',{id:socket.id}) : null;
      Navigate('/')
    },[stream,Navigate]);


    // React.useEffect(() => {
    //   const handleTrackEvent = (event) => {
    //     const Stream = event.streams[0];
    //     console.log("Received remote stream:", event);
    //     setRemoteStream(Stream);
    //   } }, [setRemoteStream]);

    React.useEffect(()=>{
      socket.on('callEnded',(data)=>{
        handleEndcall(data.message);
      })

      return ()=>{
        socket.off('callEnded');
      }
    },[handleEndcall]);

    React.useEffect(() => {

        console.log("Stream",stream ,"remoteStream",remoteStream);

      if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

          console.log("videoRef",videoRef.current.srcObject ,"remoteVideoRef",remoteVideoRef.current.srcObject);


    
    }, [stream, remoteStream]);


  return (
    <div>
      <h1>me</h1>
       <video ref={videoRef} autoPlay  playsInline style={{width: '2000px',height: '500px'}}/>
        <h1>remote</h1>
       <video ref={remoteVideoRef} autoPlay  playsInline style={{width: '2000px',height: '500px'}}/>
      <button onClick={handleEndcall}>End Call</button> 
    </div>
  )
}

export default Call


