import { useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { motion, AnimatePresence } from 'motion/react';

export interface GestureControls {
  rotationX: number;
  rotationY: number;
  zoom: number;
  mode: 'normal' | 'dissection' | 'pathology';
}

interface HandGestureControllerProps {
  enabled: boolean;
  onGestureChange: (controls: GestureControls) => void;
}

export function HandGestureController({ enabled, onGestureChange }: HandGestureControllerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [gestureMode, setGestureMode] = useState<'normal' | 'dissection' | 'pathology'>('normal');
  const [currentGesture, setCurrentGesture] = useState<string>('Show your hand');
  const [error, setError] = useState<string | null>(null);
  
  // Store rotation and zoom state
  const rotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);
  const lastHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Clean up camera and hands when disabled
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      setIsInitialized(false);
      setCurrentGesture('Show your hand');
      lastHandPosRef.current = null;
      initializingRef.current = false;
      setError(null);
      return;
    }

    // Prevent multiple initializations
    if (initializingRef.current || handsRef.current) {
      return;
    }

    let mounted = true;
    initializingRef.current = true;

    // Initialize MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    // Initialize camera
    if (videoRef.current && mounted) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current && mounted) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });
      
      camera.start().then(() => {
        if (mounted) {
          setIsInitialized(true);
          initializingRef.current = false;
          setError(null);
        }
      }).catch((err) => {
        console.error('Camera initialization failed:', err);
        if (mounted) {
          setIsInitialized(false);
          initializingRef.current = false;
          setError('Camera access denied or not available');
        }
      });
      
      cameraRef.current = camera;
    }

    return () => {
      mounted = false;
      initializingRef.current = false;
      
      // Stop camera first
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.warn('Error stopping camera:', e);
        }
        cameraRef.current = null;
      }
      
      // Close hands detection
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {
          console.warn('Error closing hands:', e);
        }
        handsRef.current = null;
      }
      
      setIsInitialized(false);
    };
  }, [enabled]);

  function onResults(results: Results) {
    if (!canvasRef.current || !enabled) return;

    const canvasCtx = canvasRef.current.getContext('2d', { 
      willReadFrequently: false,
      desynchronized: true 
    });
    if (!canvasCtx) return;

    try {
      // Clear canvas
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw the video frame
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Process hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand skeleton
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: '#00A896',
        lineWidth: 3
      });
      drawLandmarks(canvasCtx, landmarks, {
        color: '#00FFE0',
        lineWidth: 1,
        radius: 4
      });

      // Detect gestures and update controls
      const gesture = detectGesture(landmarks);
      setCurrentGesture(gesture.name);
      
      // Update mode based on gesture
      if (gesture.mode !== gestureMode) {
        setGestureMode(gesture.mode);
      }

      // Calculate rotation from hand position movement
      const palmCenter = landmarks[9]; // Middle finger base (palm center approximation)
      
      if (lastHandPosRef.current) {
        // Calculate movement delta
        const deltaX = (palmCenter.x - lastHandPosRef.current.x);
        const deltaY = (palmCenter.y - lastHandPosRef.current.y);
        
        // Only apply rotation if there's actual movement and gesture supports it
        if (gesture.name.includes('Rotate') || gesture.name.includes('Pointing')) {
          rotationRef.current.y += deltaX * 10; // Horizontal sensitivity
          rotationRef.current.x -= deltaY * 10; // Vertical sensitivity (inverted for natural feel)
        }
      }
      
      lastHandPosRef.current = { x: palmCenter.x, y: palmCenter.y };
      
      // Update zoom based on pinch distance
      if (gesture.name.includes('Pinch')) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) + 
          Math.pow(thumbTip.y - indexTip.y, 2)
        );
        // Map distance to zoom: close = zoom in, far = zoom out
        zoomRef.current = Math.max(0.3, Math.min(2.5, 1 / (distance * 15)));
      } else {
        // Gradually return to normal zoom when not pinching
        zoomRef.current = zoomRef.current * 0.95 + 1.0 * 0.05;
      }

      // Send controls to parent on every frame for smooth updates
      onGestureChange({
        rotationX: rotationRef.current.x,
        rotationY: rotationRef.current.y,
        zoom: zoomRef.current,
        mode: gesture.mode
      });
    } else {
      setCurrentGesture('Show your hand');
      lastHandPosRef.current = null;
    }

    canvasCtx.restore();
    } catch (error) {
      console.error('Error processing hand gesture:', error);
    }
  }

  function detectGesture(landmarks: any[]): { name: string; mode: 'normal' | 'dissection' | 'pathology' } {
    // Get finger tips and knuckles
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbKnuckle = landmarks[2];
    const indexKnuckle = landmarks[5];
    const middleKnuckle = landmarks[9];
    const ringKnuckle = landmarks[13];
    const pinkyKnuckle = landmarks[17];

    // Calculate if finger is extended (tip is farther from palm than knuckle)
    const wrist = landmarks[0];
    
    const thumbExtended = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y) > 
                          Math.hypot(thumbKnuckle.x - wrist.x, thumbKnuckle.y - wrist.y) + 0.05;
    const indexExtended = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) > 
                          Math.hypot(indexKnuckle.x - wrist.x, indexKnuckle.y - wrist.y) + 0.05;
    const middleExtended = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) > 
                           Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y) + 0.05;
    const ringExtended = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) > 
                         Math.hypot(ringKnuckle.x - wrist.x, ringKnuckle.y - wrist.y) + 0.05;
    const pinkyExtended = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y) > 
                          Math.hypot(pinkyKnuckle.x - wrist.x, pinkyKnuckle.y - wrist.y) + 0.05;

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Pinch gesture - thumb and index close together (zoom control)
    const pinchDistance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    
    if (pinchDistance < 0.06 && !middleExtended && !ringExtended && !pinkyExtended) {
      return { name: '🤏 Pinch - Zoom Active', mode: gestureMode };
    }

    // All 5 fingers extended = Dissection mode
    if (extendedCount === 4 && thumbExtended) {
      return { name: '✋ Open Hand - Dissection Mode', mode: 'dissection' };
    }

    // Fist (no fingers extended) = Normal mode
    if (extendedCount === 0 && !thumbExtended) {
      return { name: '✊ Fist - Normal Mode', mode: 'normal' };
    }

    // Peace sign (index + middle only) = Pathology mode
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      return { name: '✌️ Peace Sign - Pathology Mode', mode: 'pathology' };
    }

    // Open palm (3-4 fingers) = Rotate
    if (extendedCount >= 3) {
      return { name: '🖐️ Open Palm - Rotate Model', mode: gestureMode };
    }

    // Pointing (index only)
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { name: '👆 Pointing - Rotate Model', mode: gestureMode };
    }

    return { name: 'Show a clear gesture', mode: gestureMode };
  }

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {enabled && (
        <>
          {/* Webcam Preview - Bottom Right */}
          <motion.div
            className="fixed bottom-4 right-4 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="bg-background/95 backdrop-blur-sm border-2 border-[#00A896] rounded-xl overflow-hidden shadow-2xl">
              <div className="relative w-64 h-48">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  style={{ display: 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  width={640}
                  height={480}
                />
                
                {!isInitialized && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#00A896] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <div className="text-white text-sm">Starting camera...</div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center px-4">
                      <div className="text-red-500 text-2xl mb-2">⚠️</div>
                      <div className="text-white text-sm">{error}</div>
                      <div className="text-white/60 text-xs mt-1">Check camera permissions</div>
                    </div>
                  </div>
                )}
                
                {/* Current Gesture Overlay */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <div className="text-[#00A896] font-bold text-xs">{currentGesture}</div>
                  <div className="text-white/70 text-xs mt-0.5">Mode: {gestureMode}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Gesture Guide - Top Right */}
          <motion.div
            className="fixed top-20 left-4 z-40 w-72"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                <div className="w-2 h-2 bg-[#00A896] rounded-full animate-pulse" />
                <h3 className="text-sm font-bold text-[#00A896]">🤚 Gesture Controls Active</h3>
              </div>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">🤏</span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Pinch to Zoom</div>
                    <div className="text-muted-foreground">Bring thumb & index together</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">🖐️</span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Move to Rotate</div>
                    <div className="text-muted-foreground">Open palm & move hand</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">✋</span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Dissection Mode</div>
                    <div className="text-muted-foreground">Spread all 5 fingers wide</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">✌️</span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Pathology Mode</div>
                    <div className="text-muted-foreground">Show peace sign (2 fingers)</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-2xl">✊</span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Normal Mode</div>
                    <div className="text-muted-foreground">Close your fist</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <p>💡 <strong>Tip:</strong> Move hand slowly for better tracking</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
