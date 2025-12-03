import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, ChevronRight, Layers, Eye, Activity, Play, Hand } from 'lucide-react';
import { Viewer, type GestureControls } from '../3d/Viewer';
import { HandGestureController } from '../3d/HandGestureController';
import { PrimaryButton } from '../ui/PrimaryButton';
import { QuizCard } from '../ui/QuizCard';

export function SimulatorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<'normal' | 'dissection' | 'pathology'>('normal');
  const [selectedOrgan, setSelectedOrgan] = useState<OrganId>('heart');
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number>();
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [gestureControls, setGestureControls] = useState<GestureControls | null>(null);

  const organs = [
    { id: 'heart', name: 'Heart', category: 'Cardiovascular' },
    { id: 'brain', name: 'Brain', category: 'Nervous' },
    { id: 'lungs', name: 'Lungs', category: 'Respiratory' },
    { id: 'liver', name: 'Liver', category: 'Digestive' },
    { id: 'kidneys', name: 'Kidneys', category: 'Urinary' },
    { id: 'stomach', name: 'Stomach', category: 'Digestive' },
  ];

  type OrganId = 'heart' | 'brain' | 'lungs' | 'liver' | 'kidneys' | 'stomach';
  type OrganInfo = {
    [key in OrganId]: {
      name: string;
      description: string;
      facts: string[];
    };
  };

  const organInfo: OrganInfo = {
    heart: {
      name: 'Heart',
      description: 'The heart is a muscular organ that pumps blood throughout the body via the circulatory system.',
      facts: ['Beats ~100,000 times per day', 'Pumps ~5 liters of blood per minute', '4 chambers: 2 atria, 2 ventricles'],
    },
    brain: {
      name: 'Brain',
      description: 'The brain is the control center of the nervous system, responsible for thought, memory, and emotion.',
      facts: ['Contains ~86 billion neurons', 'Weighs about 1.4 kg', 'Controls all bodily functions'],
    },
    lungs: {
      name: 'Lungs',
      description: 'The lungs are organs of respiration, responsible for gas exchange between air and blood.',
      facts: ['Right lung has 3 lobes, left has 2', 'Surface area ~70 m²', 'Essential for oxygenation'],
    },
    liver: {
      name: 'Liver',
      description: 'The liver is a vital organ that processes nutrients, detoxifies, and produces bile.',
      facts: ['Largest internal organ', 'Regenerates itself', 'Over 500 functions'],
    },
    kidneys: {
      name: 'Kidneys',
      description: 'The kidneys filter blood, remove waste, and balance fluids and electrolytes.',
      facts: ['About 1 million nephrons each', 'Regulate blood pressure', 'Produce urine'],
    },
    stomach: {
      name: 'Stomach',
      description: 'The stomach breaks down food with acid and enzymes before it enters the intestines.',
      facts: ['Can expand to hold ~1 liter', 'Secretes gastric acid', 'Starts protein digestion'],
    },
  };

  const quizQuestion = {
    question: 'Which chamber of the heart receives oxygenated blood from the lungs?',
    options: ['Right Atrium', 'Left Atrium', 'Right Ventricle', 'Left Ventricle'],
    correctAnswer: 1,
  };

  return (
    <div className="fixed inset-0 top-16 flex">
      {/* Sidebar - Organ Library */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 bg-card border-r border-border flex flex-col"
          >
            <div className="p-4 border-b border-border">
              <h3 className="mb-4">Organ Library</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search organs..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-[#00A896]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {organs.map((organ) => (
                <motion.button
                  key={organ.id}
                  onClick={() => setSelectedOrgan(organ.id as OrganId)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedOrgan === organ.id
                      ? 'bg-[#00A896] text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{organ.name}</p>
                      <p className={`text-xs ${selectedOrgan === organ.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {organ.category}
                      </p>
                    </div>
                    <ChevronRight size={16} />
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-2">
              <h4 className="text-sm mb-2">View Mode</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal', icon: Eye },
                  { id: 'dissection', label: 'Dissect', icon: Layers },
                  { id: 'pathology', label: 'Disease', icon: Activity },
                ].map((modeOption) => (
                  <button
                    key={modeOption.id}
                    onClick={() => setMode(modeOption.id as any)}
                    className={`p-2 rounded-xl text-xs flex flex-col items-center gap-1 transition-all ${
                      mode === modeOption.id
                        ? 'bg-[#00A896] text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <modeOption.icon size={16} />
                    {modeOption.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3D Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <h3>3D Simulation: {organInfo[selectedOrgan]?.name || 'Organ'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGestureEnabled(!gestureEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                gestureEnabled
                  ? 'bg-[#00A896] text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <Hand size={16} />
              {gestureEnabled ? 'Gesture: ON' : 'Gesture: OFF'}
            </button>
            <PrimaryButton onClick={() => setQuizMode(!quizMode)} icon={Play} className="text-sm px-4 py-2">
              {quizMode ? 'Exit Quiz' : 'Start Quiz'}
            </PrimaryButton>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 relative p-6">
          <Viewer 
            key={selectedOrgan} 
            mode={gestureControls?.mode || mode} 
            selectedOrgan={selectedOrgan}
            gestureControls={gestureControls}
            gestureEnabled={gestureEnabled}
          />
          
          {/* Hand Gesture Controller */}
          <HandGestureController
            enabled={gestureEnabled}
            onGestureChange={(controls) => {
              setGestureControls(controls);
              // Sync mode from gesture
              if (controls.mode !== mode) {
                setMode(controls.mode);
              }
            }}
          />

          {/* Floating Controls */}
          {mode === 'dissection' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-10 bottom-10 bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-4 space-y-3 z-30"
            >
              <h4 className="text-sm">Dissection Tools</h4>
              <div className="flex gap-2">
                {['Scalpel', 'Forceps', 'Retractor'].map((tool) => (
                  <button
                    key={tool}
                    className="px-3 py-2 rounded-xl bg-muted hover:bg-[#00A896] hover:text-white transition-all text-sm"
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Layer Depth</label>
                <input type="range" className="w-full" min="0" max="100" />
              </div>
            </motion.div>
          )}

          {mode === 'pathology' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-10 bottom-10 bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-4 z-30"
            >
              <h4 className="text-sm mb-3">Condition View</h4>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm">
                  Healthy
                </button>
                <button className="px-4 py-2 rounded-xl bg-muted hover:bg-[#EF476F] hover:text-white transition-all text-sm">
                  Diseased
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {infoPanelOpen && (
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="h-64 bg-card border-t border-border p-6 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between mb-4">
                  <h3>{organInfo.heart.name}</h3>
                  <button onClick={() => setInfoPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="rotate-90" size={20} />
                  </button>
                </div>
                <p className="text-muted-foreground mb-4">{organInfo.heart.description}</p>
                <h4 className="mb-2">Key Facts</h4>
                <ul className="space-y-1 text-muted-foreground text-sm">
                  {organInfo.heart.facts.map((fact, i) => (
                    <li key={i}>• {fact}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>

      {/* Quiz Overlay */}
      <AnimatePresence>
        {quizMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-16 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full"
            >
              <QuizCard
                question={quizQuestion.question}
                options={quizQuestion.options}
                selectedAnswer={selectedAnswer}
                correctAnswer={quizQuestion.correctAnswer}
                onSelect={setSelectedAnswer}
                showResult={selectedAnswer !== undefined}
              />
              {selectedAnswer !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex gap-3 justify-end"
                >
                  <button
                    onClick={() => setSelectedAnswer(undefined)}
                    className="px-6 py-2 bg-muted rounded-xl hover:bg-muted/80"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setQuizMode(false)}
                    className="px-6 py-2 bg-[#00A896] text-white rounded-xl hover:bg-[#008f7f]"
                  >
                    Continue
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
