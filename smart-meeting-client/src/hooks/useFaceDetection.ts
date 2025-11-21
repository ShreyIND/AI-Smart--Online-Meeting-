'use client';

import { useEffect, useRef, useState } from 'react';
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

export function useFaceDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [isFaceDetected, setIsFaceDetected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [isAutoMuteEnabled, setIsAutoMuteEnabled] = useState(true);

    const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
    const lastFaceDetectedTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | null>(null);


    // Load the Blazeface model
    useEffect(() => {
        let mounted = true;

        async function loadModel() {
            try {
                const model = await blazeface.load();
                if (mounted) {
                    modelRef.current = model;
                    setModelLoaded(true);
                    console.log('✅ Blazeface model loaded');
                }
            } catch (error) {
                console.error('❌ Error loading Blazeface model:', error);
            }
        }

        loadModel();

        return () => {
            mounted = false;
        };
    }, []);

    // Face detection loop
    useEffect(() => {
        if (!modelLoaded || !videoRef.current || !isAutoMuteEnabled) {
            return;
        }

        const detectFaces = async () => {
            const video = videoRef.current;
            if (!video || !modelRef.current || video.readyState !== 4) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
                return;
            }

            try {
                const predictions = await modelRef.current.estimateFaces(video, false);
                const faceFound = predictions.length > 0;

                setIsFaceDetected(faceFound);

                if (faceFound) {
                    // Face detected - update timestamp and unmute immediately
                    lastFaceDetectedTimeRef.current = Date.now();
                    if (isMuted) {
                        setIsMuted(false);
                        console.log('🟢 Face detected - Unmuting');
                    }

                } else {
                    // No face detected - check if we should mute
                    const timeSinceLastFace = Date.now() - lastFaceDetectedTimeRef.current;
                    if (timeSinceLastFace >= 3000 && !isMuted) {
                        setIsMuted(true);
                        console.log('🔴 No face for 3s - Muting');
                    }
                }
            } catch (error) {
                console.error('Error during face detection:', error);
            }

            animationFrameRef.current = requestAnimationFrame(detectFaces);
        };

        detectFaces();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

        };
    }, [modelLoaded, videoRef, isMuted, isAutoMuteEnabled]);

    const toggleAutoMute = () => {
        setIsAutoMuteEnabled((prev) => !prev);
        if (!isAutoMuteEnabled) {
            // Re-enabling auto-mute
            lastFaceDetectedTimeRef.current = Date.now();
            setIsMuted(false);
        }
    };

    return {
        isFaceDetected,
        isMuted,
        modelLoaded,
        isAutoMuteEnabled,
        toggleAutoMute,
    };
}
