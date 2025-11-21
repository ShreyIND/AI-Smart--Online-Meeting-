'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { usePeerConnection } from '@/hooks/usePeerConnection';
import RemoteVideo from './RemoteVideo';

export default function SmartMeetingClient() {
    const webcamRef = useRef<Webcam>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [roomInput, setRoomInput] = useState<string>('');

    const { isFaceDetected, isMuted, modelLoaded, isAutoMuteEnabled, toggleAutoMute } =
        useFaceDetection(videoRef);

    const { peerStream, connectionState, roomId, errorMessage, connectToPeer, disconnectPeer } =
        usePeerConnection(mediaStream);

    // Get video element from Webcam component
    useEffect(() => {
        if (webcamRef.current?.video) {
            videoRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current?.video]);

    // Handle microphone muting
    useEffect(() => {
        if (mediaStream && isAutoMuteEnabled) {
            const audioTracks = mediaStream.getAudioTracks();
            audioTracks.forEach((track) => {
                track.enabled = !isMuted;
            });
        }
    }, [isMuted, mediaStream, isAutoMuteEnabled]);

    const handleUserMedia = (stream: MediaStream) => {
        setMediaStream(stream);
    };

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    };

    const handleCreateRoom = () => {
        const newRoomId = generateRoomId();
        setRoomInput(newRoomId);
        connectToPeer(newRoomId);
    };

    const handleJoinRoom = () => {
        if (roomInput.trim()) {
            connectToPeer(roomInput.trim());
        }
    };

    const handleDisconnect = () => {
        disconnectPeer();
        setRoomInput('');
    };

    const handleCopyRoomId = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId);
        }
    };

    const getStatusBadge = () => {
        if (!modelLoaded) {
            return {
                icon: '⚙️',
                text: 'Loading Model...',
                color: 'bg-gray-500/90',
            };
        }

        if (!isAutoMuteEnabled) {
            return {
                icon: '🟠',
                text: 'Manual Mode',
                color: 'bg-orange-500/90',
            };
        }

        if (isMuted) {
            return {
                icon: '🔴',
                text: 'Muted - No Face',
                color: 'bg-red-500/90',
            };
        }

        return {
            icon: '🟢',
            text: 'Live',
            color: 'bg-green-500/90',
        };
    };

    const getConnectionBadge = () => {
        switch (connectionState) {
            case 'connecting':
                return { icon: '🔄', text: 'Connecting...', color: 'bg-yellow-500/90' };
            case 'connected':
                return { icon: '🔗', text: 'Connected', color: 'bg-green-500/90' };
            case 'disconnected':
                return { icon: '⚠️', text: 'Disconnected', color: 'bg-red-500/90' };
            case 'error':
                return { icon: '❌', text: 'Error', color: 'bg-red-600/90' };
            default:
                return { icon: '⭕', text: 'Not Connected', color: 'bg-gray-500/90' };
        }
    };

    const status = getStatusBadge();
    const connectionBadge = getConnectionBadge();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-7xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
                        Smart Meeting Client
                    </h1>
                    <p className="text-purple-200 text-lg">
                        AI-powered face detection with WebRTC video streaming
                    </p>
                </div>

                {/* Room Controls */}
                {connectionState === 'idle' && (
                    <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="flex flex-col gap-6">
                            {/* Create Room Section */}
                            <div className="flex flex-col items-center gap-3">
                                <h3 className="text-white font-semibold text-lg">Create a New Room</h3>
                                <button
                                    onClick={handleCreateRoom}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                                >
                                    ✨ Create Room
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-white/20"></div>
                                <span className="text-white/60 font-medium">OR</span>
                                <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            {/* Join Room Section */}
                            <div className="flex flex-col items-center gap-3">
                                <h3 className="text-white font-semibold text-lg">Join an Existing Room</h3>
                                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
                                    <input
                                        type="text"
                                        value={roomInput}
                                        onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                                        placeholder="Enter Room ID"
                                        className="px-6 py-3 rounded-full bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 text-center sm:text-left"
                                    />
                                    <button
                                        onClick={handleJoinRoom}
                                        disabled={!roomInput.trim()}
                                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        🚀 Join Room
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 bg-red-500/20 backdrop-blur-lg rounded-2xl p-4 border border-red-500/50">
                        <p className="text-red-200 text-center font-medium">❌ {errorMessage}</p>
                    </div>
                )}

                {/* Main Video Grid */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    {/* Video Container - Split Screen */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                        {/* Local Video */}
                        <div className="relative aspect-video bg-black">
                            <Webcam
                                ref={webcamRef}
                                audio={true}
                                videoConstraints={{
                                    facingMode: 'user',
                                    width: 1280,
                                    height: 720,
                                }}
                                onUserMedia={handleUserMedia}
                                className="w-full h-full object-cover"
                                mirrored={true}
                            />

                            {/* Local Video Label */}
                            <div className="absolute top-4 left-4">
                                <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/30">
                                    📹 You
                                </div>
                            </div>

                            {/* Status Badge Overlay */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                <div
                                    className={`${status.color} text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg backdrop-blur-sm border border-white/30 transition-all duration-300`}
                                >
                                    <span className="mr-2">{status.icon}</span>
                                    {status.text}
                                </div>

                                {/* Face Detection Indicator */}
                                {modelLoaded && isAutoMuteEnabled && (
                                    <div
                                        className={`${isFaceDetected ? 'bg-green-500/90' : 'bg-gray-500/90'
                                            } text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm border border-white/30 transition-all duration-300`}
                                    >
                                        {isFaceDetected ? '👤 Face' : '❌ No Face'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Remote Video */}
                        <div className="relative aspect-video bg-black">
                            <RemoteVideo stream={peerStream} />

                            {/* Remote Video Label */}
                            {peerStream && (
                                <div className="absolute top-4 left-4">
                                    <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/30">
                                        👤 Peer
                                    </div>
                                </div>
                            )}

                            {/* Connection Status */}
                            <div className="absolute top-4 right-4">
                                <div
                                    className={`${connectionBadge.color} text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg backdrop-blur-sm border border-white/30 transition-all duration-300`}
                                >
                                    <span className="mr-2">{connectionBadge.icon}</span>
                                    {connectionBadge.text}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            {/* Info */}
                            <div className="text-white/90 text-sm">
                                {roomId && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold">Room ID:</span>
                                        <code className="bg-white/20 px-3 py-1 rounded-lg font-mono">{roomId}</code>
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                                            title="Copy Room ID"
                                        >
                                            📋
                                        </button>
                                    </div>
                                )}
                                {isAutoMuteEnabled ? (
                                    <p>
                                        <span className="font-semibold">Auto-Mute Active:</span> Mic
                                        mutes after 3s without face detection
                                    </p>
                                ) : (
                                    <p>
                                        <span className="font-semibold">Manual Mode:</span> Auto-mute
                                        disabled
                                    </p>
                                )}
                            </div>

                            {/* Control Buttons */}
                            <div className="flex gap-3 flex-wrap justify-center">
                                {/* Auto-Mute Toggle */}
                                <button
                                    onClick={toggleAutoMute}
                                    className={`${isAutoMuteEnabled
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                                        } text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95`}
                                >
                                    {isAutoMuteEnabled ? '🔓 Disable Auto-Mute' : '🔒 Enable Auto-Mute'}
                                </button>

                                {/* Disconnect Button */}
                                {connectionState !== 'idle' && (
                                    <button
                                        onClick={handleDisconnect}
                                        className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                                    >
                                        🔌 Disconnect
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center text-purple-200 text-sm">
                    <p>
                        🔒 All processing happens locally in your browser. Video streams via
                        peer-to-peer WebRTC.
                    </p>
                </div>
            </div>
        </div>
    );
}
