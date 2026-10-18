import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../lib/api.js";

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVideoMatch(token) {
  const [status, setStatus] = useState("idle");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const wantsMatchRef = useRef(false);
  const joinPendingRef = useRef(false);
  const queuedCandidatesRef = useRef([]);
  const reconnectTimerRef = useRef(null);

  const closePeer = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;
    queuedCandidatesRef.current = [];
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    setRemoteStream(null);
    setPartnerId(null);
  }, []);

  const emitJoin = useCallback(() => {
    const socket = socketRef.current;
    if (!wantsMatchRef.current || !socket?.connected || joinPendingRef.current) return;
    joinPendingRef.current = true;
    setStatus("searching");
    socket.emit("match:join");
  }, []);

  const createPeer = useCallback((socket, matchedPartnerId) => {
    closePeer();
    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    peerRef.current = peer;
    setPartnerId(matchedPartnerId);
    const stream = localStreamRef.current;
    stream?.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("webrtc:ice-candidate", candidate.toJSON());
    };
    peer.ontrack = ({ streams }) => {
      if (streams?.[0]) setRemoteStream(streams[0]);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("connected");
      if (peer.connectionState === "failed") {
        setError("The video connection couldn’t be established. Try the next person.");
      }
    };
    return peer;
  }, [closePeer]);

  const attachSocketHandlers = useCallback((socket) => {
    socket.on("connect", () => {
      joinPendingRef.current = false;
      emitJoin();
    });
    socket.on("connect_error", (reason) => {
      joinPendingRef.current = false;
      setStatus("error");
      setError(reason.message === "Authentication required" || reason.message === "Invalid access Token"
        ? "Your sign-in has expired. Sign out and sign back in to continue."
        : "Couldn’t connect to the video server. Check that it’s running and try again.");
    });
    socket.on("match:waiting", () => {
      setStatus("searching");
      setError("");
    });
    socket.on("match:found", async ({ partnerSocketId }) => {
      joinPendingRef.current = false;
      setError("");
      setStatus("connecting");
      const peer = createPeer(socket, partnerSocketId);
      const shouldOffer = socket.id.localeCompare(partnerSocketId) < 0;
      if (!shouldOffer) return;
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("webrtc:offer", offer);
      } catch {
        setError("Couldn’t start the video connection. Try the next person.");
      }
    });
    socket.on("webrtc:offer", async ({ from, offer }) => {
      try {
        const peer = peerRef.current || createPeer(socket, from);
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        for (const candidate of queuedCandidatesRef.current.splice(0)) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc:answer", answer);
      } catch {
        setError("Couldn’t accept the video connection. Try the next person.");
      }
    });
    socket.on("webrtc:answer", async ({ answer }) => {
      try {
        const peer = peerRef.current;
        if (!peer) return;
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        for (const candidate of queuedCandidatesRef.current.splice(0)) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch {
        setError("The video connection was interrupted. Try the next person.");
      }
    });
    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      if (!candidate) return;
      const peer = peerRef.current;
      if (!peer?.remoteDescription) {
        queuedCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // A stale ICE candidate can arrive while a match is ending.
      }
    });
    socket.on("signaling:error", ({ message }) => setError(message || "Video signaling failed."));
    socket.on("match:ended", () => {
      closePeer();
      joinPendingRef.current = false;
      if (!wantsMatchRef.current) {
        setStatus("idle");
        return;
      }
      setStatus("searching");
      reconnectTimerRef.current = window.setTimeout(emitJoin, 300);
    });
    socket.on("disconnect", () => {
      joinPendingRef.current = false;
      if (wantsMatchRef.current) {
        closePeer();
        setStatus("searching");
      }
    });
  }, [closePeer, createPeer, emitJoin]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Video calls need a secure browser connection. Open this site on localhost or HTTPS.");
      return;
    }
    setError("");
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraOn(true);
      setMicOn(true);
      wantsMatchRef.current = true;
      let socket = socketRef.current;
      if (!socket) {
        socket = io(SOCKET_URL, {
          auth: { token },
          autoConnect: false,
          withCredentials: true,
        });
        socketRef.current = socket;
        attachSocketHandlers(socket);
      } else {
        socket.auth = { token };
      }
      setStatus("searching");
      if (!socket.connected) socket.connect();
      else emitJoin();
    } catch (mediaError) {
      setStatus("error");
      setError(mediaError.name === "NotAllowedError"
        ? "Allow camera and microphone access in your browser to start a video conversation."
        : "Couldn’t start your camera. Check that it’s connected and try again.");
    }
  }, [attachSocketHandlers, emitJoin, token]);

  const next = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    wantsMatchRef.current = true;
    window.clearTimeout(reconnectTimerRef.current);
    closePeer();
    joinPendingRef.current = false;
    setError("");
    setStatus("searching");
    socket.emit("match:leave");
  }, [closePeer]);

  const stop = useCallback(() => {
    wantsMatchRef.current = false;
    window.clearTimeout(reconnectTimerRef.current);
    const socket = socketRef.current;
    if (socket?.connected) socket.emit("match:leave");
    joinPendingRef.current = false;
    closePeer();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setCameraOn(true);
    setMicOn(true);
    setStatus("idle");
  }, [closePeer]);

  const toggleCamera = useCallback(() => {
    const nextValue = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextValue; });
    setCameraOn(nextValue);
  }, [cameraOn]);

  const toggleMic = useCallback(() => {
    const nextValue = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = nextValue; });
    setMicOn(nextValue);
  }, [micOn]);

  useEffect(() => () => {
    wantsMatchRef.current = false;
    window.clearTimeout(reconnectTimerRef.current);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
    socketRef.current?.disconnect();
  }, []);

  return {
    status,
    localStream,
    remoteStream,
    partnerId,
    error,
    cameraOn,
    micOn,
    start,
    next,
    stop,
    toggleCamera,
    toggleMic,
  };
}
