import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GestureControls {
  rotationX: number;
  rotationY: number;
  zoom: number;
  mode: 'normal' | 'dissection' | 'pathology';
}

interface ViewerProps {
  mode?: 'normal' | 'dissection' | 'pathology';
  selectedOrgan?: string;
  gestureControls?: GestureControls | null;
  gestureEnabled?: boolean;
}

export function Viewer({ mode = 'normal', selectedOrgan, gestureControls: gestureControlsProp = null, gestureEnabled: gestureEnabledProp = false }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  const gestureControlsRef = useRef(gestureControlsProp);
  const gestureEnabledRef = useRef(gestureEnabledProp);

  useEffect(() => {
    gestureControlsRef.current = gestureControlsProp;
  }, [gestureControlsProp]);

  useEffect(() => {
    gestureEnabledRef.current = gestureEnabledProp;
  }, [gestureEnabledProp]);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    import('./three').then(({
      Scene,
      Color,
      PerspectiveCamera,
      WebGLRenderer,
      AmbientLight,
      DirectionalLight,
      PointLight,
    }) => {
      if (!mounted || !containerRef.current) return;

      const scene = new Scene();
      scene.background = new Color(mode === 'normal' ? 0x1a1a1a : 0x0a0a0a);
      sceneRef.current = scene;

      const camera = new PerspectiveCamera(
        65,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        2000
      );
      
      if (selectedOrgan === 'heart') {
        camera.position.set(0, 10, 60);
      } else {
        camera.position.set(0, 5, 50);
      }
      
      cameraRef.current = camera;

      const renderer = new WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const ambientLight = new AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const directionalLight = new DirectionalLight(0xffffff, 1.5);
      directionalLight.position.set(5, 8, 5);
      scene.add(directionalLight);

      const directionalLight2 = new DirectionalLight(0xffffff, 1);
      directionalLight2.position.set(-5, 5, -5);
      scene.add(directionalLight2);

      const pointLight = new PointLight(0x00a896, 2, 100);
      pointLight.position.set(0, 10, 8);
      scene.add(pointLight);

      const loader = new GLTFLoader();

  // Determine model path and scale based on selected organ
  // Default to heart model (kept as-is) at correct scale
  let modelPath = '/heart.glb';
  let modelScale = { x: 1000, y: 1000, z: 1000 };

if (selectedOrgan === 'brain') {
        modelPath = '/brain.glb';
        modelScale = { x: 0.1, y: 0.1, z: 0.1 };
      }

      loader.load(
        modelPath,
        (gltf: any) => {
          if (!mounted) return;
          const model = gltf.scene;
          model.scale.set(modelScale.x, modelScale.y, modelScale.z);
          model.position.set(0, 0, 0);
          scene.add(model);
          meshRef.current = model;
          setIsLoading(false);
        },
        undefined,
        (error: any) => {
          console.error('Error loading model:', error);
          setIsLoading(false);
        }
      );

      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };

      const onMouseDown = (e: MouseEvent) => {
        if (gestureEnabledRef.current) return; // Disable mouse control when gestures are active
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseMove = (e: MouseEvent) => {
        if (gestureEnabledRef.current || !isDragging || !meshRef.current) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        meshRef.current.rotation.y += deltaX * 0.01;
        meshRef.current.rotation.x += deltaY * 0.01;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        isDragging = false;
      };

      containerRef.current.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const autoRotate = !gestureEnabledRef.current && !isDragging;
        
        // Apply gesture controls if active
        if (gestureEnabledRef.current && gestureControlsRef.current && meshRef.current) {
          // Apply rotation directly from gesture (already in radians)
          meshRef.current.rotation.x = gestureControlsRef.current.rotationX;
          meshRef.current.rotation.y = gestureControlsRef.current.rotationY;
          
          // Apply zoom by scaling the model
          const scale = gestureControlsRef.current.zoom;
          if (selectedOrgan === 'brain') {
            meshRef.current.scale.set(0.1 * scale, 0.1 * scale, 0.1 * scale);
          } else {
            meshRef.current.scale.set(1000 * scale, 1000 * scale, 1000 * scale);
          }
        } else if (meshRef.current && autoRotate) {
          // Auto-rotate when not in gesture mode
          meshRef.current.rotation.y += 0.005;
        }
        
        renderer.render(scene, camera);
      };

      animate();

      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize);
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousedown', onMouseDown);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        cancelAnimationFrame(animationId);
        if (containerRef.current && rendererRef.current?.domElement) {
          try {
            containerRef.current.removeChild(rendererRef.current.domElement);
          } catch (e) {}
        }
        renderer.dispose();
      };
    }).catch((error) => {
      console.error('Failed to load Three.js:', error);
      setIsLoading(false);
    });

      return () => {
      mounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [mode, selectedOrgan]);  return (
    <div className="relative w-full h-full bg-black/5 dark:bg-black/20 rounded-2xl overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#00A896] border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading 3D {selectedOrgan === 'brain' ? 'Brain' : 'Heart'} Model...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      
      <motion.div
        className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <p className="text-sm">
          Mode: <span className="text-[#00A896]">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
        </p>
      </motion.div>

      <motion.div 
        className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <p className="font-semibold text-foreground mb-1">{selectedOrgan === 'brain' ? '🧠' : '🫀'} Interactive 3D {selectedOrgan === 'brain' ? 'Brain' : 'Heart'} Model</p>
        {gestureEnabledProp ? (
          <>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00A896] rounded-full animate-pulse" />
              Hand gesture control active
            </p>
            <p>✋ Move hand to rotate & zoom</p>
            {gestureControlsProp && (
              <p className="text-[#00A896] mt-1">
                Rotation: {gestureControlsProp.rotationY.toFixed(1)}° | Zoom: {gestureControlsProp.zoom.toFixed(2)}x
              </p>
            )}
          </>
        ) : (
          <>
            <p>🖱️ Click & Drag - Rotate model</p>
            <p>⚡ Auto-rotating when idle</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
