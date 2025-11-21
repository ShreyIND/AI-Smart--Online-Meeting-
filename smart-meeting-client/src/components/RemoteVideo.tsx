'use client';

import { useRef, useEffect } from 'react';

interface RemoteVideoProps {
    stream: MediaStream | null;
}

export default function RemoteVideo({ stream }: RemoteVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">👤</div>
                    <p className="text-white/60 text-lg font-medium">Waiting for peer...</p>
                </div>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
        />
    );
}
