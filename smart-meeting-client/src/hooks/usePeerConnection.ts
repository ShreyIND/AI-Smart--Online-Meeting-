'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';

const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3002';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function usePeerConnection(localStream: MediaStream | null) {
    const [peerStream, setPeerStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [roomId, setRoomId] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const remoteUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io(SIGNALING_SERVER_URL);

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        socket.on('joined-room', (room: string) => {
            console.log(`Joined room: ${room}`);
            setConnectionState('connecting');
        });

        socket.on('room-full', () => {
            console.log('Room is full');
            setConnectionState('error');
            setErrorMessage('Room is full (max 2 users)');
        });

        socket.on('user-connected', (userId: string) => {
            console.log(`User connected: ${userId}`);
            remoteUserIdRef.current = userId;

            // Initiate peer connection as the initiator
            if (localStream) {
                initializePeer(true, userId);
            }
        });

        socket.on('offer', ({ offer, from }) => {
            console.log(`Received offer from ${from}`);
            remoteUserIdRef.current = from;

            // Initialize peer as non-initiator and handle the offer
            if (localStream) {
                initializePeer(false, from, offer);
            }
        });

        socket.on('answer', ({ answer, from }) => {
            console.log(`Received answer from ${from}`);
            if (peerRef.current) {
                peerRef.current.signal(answer);
            }
        });

        socket.on('ice-candidate', ({ candidate, from }) => {
            console.log(`Received ICE candidate from ${from}`);
            if (peerRef.current) {
                peerRef.current.signal(candidate);
            }
        });

        socket.on('user-disconnected', (userId: string) => {
            console.log(`User disconnected: ${userId}`);
            setConnectionState('disconnected');
            setPeerStream(null);
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [localStream]);

    const initializePeer = (initiator: boolean, remoteUserId: string, offer?: any) => {
        if (!localStream || !socketRef.current) return;

        console.log(`Initializing peer connection (initiator: ${initiator})`);

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: localStream,
        });

        peer.on('signal', (data) => {
            console.log('Sending signal data');

            if (data.type === 'offer') {
                socketRef.current?.emit('offer', {
                    offer: data,
                    to: remoteUserId
                });
            } else if (data.type === 'answer') {
                socketRef.current?.emit('answer', {
                    answer: data,
                    to: remoteUserId
                });
            } else {
                // ICE candidate
                socketRef.current?.emit('ice-candidate', {
                    candidate: data,
                    to: remoteUserId
                });
            }
        });

        peer.on('stream', (stream) => {
            console.log('Received remote stream');
            setPeerStream(stream);
            setConnectionState('connected');
        });

        peer.on('connect', () => {
            console.log('Peer connection established');
            setConnectionState('connected');
        });

        peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            setConnectionState('error');
            setErrorMessage(err.message);
        });

        peer.on('close', () => {
            console.log('Peer connection closed');
            setConnectionState('disconnected');
            setPeerStream(null);
        });

        // If we received an offer, signal it to the peer
        if (offer) {
            peer.signal(offer);
        }

        peerRef.current = peer;
    };

    const connectToPeer = (room: string) => {
        if (!socketRef.current) return;

        setRoomId(room);
        setConnectionState('connecting');
        setErrorMessage('');
        socketRef.current.emit('join-room', room);
    };

    const disconnectPeer = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }

        if (socketRef.current && roomId) {
            socketRef.current.disconnect();
            socketRef.current = io(SIGNALING_SERVER_URL);
        }

        setPeerStream(null);
        setConnectionState('idle');
        setRoomId('');
        setErrorMessage('');
    };

    return {
        peerStream,
        connectionState,
        roomId,
        errorMessage,
        connectToPeer,
        disconnectPeer
    };
}
