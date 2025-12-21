
import React, { useState } from 'react';
import { DayPlan, TimeBlock, ActivityType, UserProfile, InboxMessage } from './types';
import { generateIdealDayPlan } from './geminiService';
import { LEVELING_SYSTEM, getLevelInfo } from './gamificationConfig';
import { Plus, Sparkles, CheckCircle, Circle, Clock, Loader2, WifiOff } from 'lucide-react';

interface PlannerProps {
  plan: DayPlan;
  setPlan: (plan: DayPlan) => void;
  userGoals: string[];
  userPreferences: string;
  user: UserProfile; // Added user for XP updates
  setUser: (u: UserProfile) => void; // Added setUser
}

const Planner: React.FC<PlannerProps> = ({ plan, setPlan, userGoals, userPreferences, user, setUser }) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'reality'>('plan');
  const [mode, setMode] = useState<'DIY' | 'AI'>('DIY');
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [newBlock, setNewBlock] = useState<Partial<TimeBlock>>({ startTime: '09:00', endTime: '10:00', title: '', type: 'work' });

  // Reward for Planning (Once per day)
  const awardPlanningXp = () => {
    if (!user.dailyPlanCreated) {
        setUser({
            ...user,
            dailyPlanCreated: true,
            xp: user.xp + LEVELING_SYSTEM.xpValues.PLAN_DAY
        });
        alert(`Denný plán vytvorený! +${LEVELING_SYSTEM.xpValues.PLAN_DAY} XP`);
    }
  };

  // DIY: Add Block
  const addBlock = () => {
    if (!newBlock.title) return;
    const block: TimeBlock = {
      id: Date.now().toString(),
      title: newBlock.title || 'New Task',
      startTime: newBlock.startTime || '00:00',
      endTime: newBlock.endTime || '01:00',
      type: newBlock.type as ActivityType || 'work',
      isCompleted: false
    };

    const updatedBlocks = [...plan.plannedBlocks, block].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setPlan({ ...plan, plannedBlocks: updatedBlocks, actualBlocks: updatedBlocks.map(b => ({...b})) });
    setNewBlock({ startTime: block.endTime, endTime: '', title: '', type: 'work' });
    
    awardPlanningXp();
  };

  // AI: Generate Plan
  const handleAiGenerate = async () => {
    setIsGenerating(true);
    setUsedFallback(false);
    try {
      const result = await generateIdealDayPlan(userGoals, userPreferences);
      
      if (result && result.blocks) {
        if (result.blocks[0]?.title === "Ranná rutina & Hydratácia") {
            setUsedFallback(true);
        }

        const generatedBlocks = result.blocks.map((b: any, idx: number) => ({
          id: `ai-${idx}`,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          type: b.type,
          isCompleted: false,
          notes: b.reason
        }));
        setPlan({ ...plan, plannedBlocks: generatedBlocks, actualBlocks: generatedBlocks.map((b:any) => ({...b})) });
        
        awardPlanningXp();
      }
    } catch (e) {
      alert("Nepodarilo sa vytvoriť plán. Skúste to manuálne.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Completion (Reality Mode) & Award Execution XP
  const toggleCompletion = (id: string, type: ActivityType, currentlyCompleted: boolean) => {
    // 1. Handle Unchecking (Correction) - Allow without penalty
    if (currentlyCompleted) {
        const updatedReality = plan.actualBlocks.map(b => 
            b.id === id ? { ...b, isCompleted: false } : b
        );
        setPlan({ ...plan, actualBlocks: updatedReality });
        return;
    }

    // 2. Handle Checking (Completion)
    // Check Block Limit
    if (user.dailyBlockCount >= LEVELING_SYSTEM.config.maxBlocksPerDay) {
        alert("Denný limit XP pre bloky dosiahnutý. Pokračuj, ale bez XP.");
    }

    // Determine XP Value
    let xpGain = 0;
    if (user.dailyBlockCount < LEVELING_SYSTEM.config.maxBlocksPerDay) {
        if (type === 'work' || type === 'exercise' || type === 'habit') {
            xpGain = LEVELING_SYSTEM.xpValues.COMPLETE_WORK_BLOCK;
        } else if (type === 'rest' || type === 'social' || type === 'health') {
            xpGain = LEVELING_SYSTEM.xpValues.COMPLETE_REST_BLOCK;
        } else {
            xpGain = LEVELING_SYSTEM.xpValues.TRACK_REALITY;
        }
    }

    const updatedReality = plan.actualBlocks.map(b => 
      b.id === id ? { ...b, isCompleted: true } : b
    );
    setPlan({ ...plan, actualBlocks: updatedReality });

    // Update User & Notifications
    if (xpGain > 0) {
        let currentXp = user.xp + xpGain;
        let newInboxMessages: InboxMessage[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        // Check for Perfect Day (Bonus)
        const allDone = updatedReality.every(b => b.isCompleted);
        const bonusXp = LEVELING_SYSTEM.xpValues.PERFECT_DAY_BONUS;

        // Min 3 blocks required for Perfect Day bonus
        if (allDone && updatedReality.length >= 3) {
             // Check if already awarded today to prevent spam
             const alreadyAwarded = user.messages.some(m => 
                m.type === 'achievement' && 
                m.subject.includes('Perfektný Deň') && 
                m.date.startsWith(today)
             );

             if (!alreadyAwarded) {
                 currentXp += bonusXp;
                 newInboxMessages.push({
                    id: `pd-${Date.now()}`,
                    sender: 'IdealTwin Assistant',
                    subject: `Perfektný Deň (+${bonusXp} XP)`,
                    body: `Perfektný Deň! Získal si bonus +${bonusXp} XP za dokončenie všetkých naplánovaných blokov. Len tak ďalej, ${user.firstName || user.name}!`,
                    date: new Date().toISOString(),
                    read: false,
                    type: 'achievement'
                 });
             }
        }

        const oldLevel = user.twinLevel;
        const finalLevelInfo = getLevelInfo(currentXp);
        
        // Level Up Check
        if (finalLevelInfo.level > oldLevel) {
            const unlockMsg = finalLevelInfo.unlock ? ` Odomknuté: ${finalLevelInfo.unlock}.` : '';
            newInboxMessages.push({
                id: `lvl-${Date.now()}`,
                sender: 'IdealTwin Assistant',
                subject: `Level Up! Úroveň ${finalLevelInfo.level} - ${finalLevelInfo.title}`,
                body: `Gratulujeme! Dosiahol si Level ${finalLevelInfo.level} – ${finalLevelInfo.title}. Tvoj Dvojník získal väčšiu veľkosť a energiu.${unlockMsg}`,
                date: new Date().toISOString(),
                read: false,
                type: 'achievement'
            });
        }

        setUser({
            ...user,
            xp: currentXp,
            twinLevel: finalLevelInfo.level,
            levelTitle: finalLevelInfo.title,
            xpToNextLevel: finalLevelInfo.nextLevelXp,
            dailyBlockCount: user.dailyBlockCount + 1,
            energy: finalLevelInfo.level > oldLevel ? 100 : user.energy, // Refill energy on level up
            messages: [...user.messages, ...newInboxMessages]
        });
    }
  };

  const currentBlocks = activeTab === 'plan' ? plan.plannedBlocks : plan.actualBlocks;

  const getBlockStyle = (type: ActivityType, isCompleted: boolean) => {
      const baseClass = "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between shadow-sm";
      
      if (activeTab === 'reality' && !isCompleted) {
          return `${baseClass} bg-surface border-txt-light/20 text-txt hover:border-primary/50`;
      }

      switch (type) {
          case 'work':
              return `${baseClass} bg-primary border-primary text-white`; // Work -> Primary (Slate Blue)
          case 'rest':
          case 'social':
              return `${baseClass} bg-secondary border-secondary text-white`; // Rest -> Secondary (Sage)
          case 'habit':
          case 'exercise':
          case 'health':
              return `${baseClass} bg-habit border-habit text-white`; // Habit -> Habit (Gold)
          default:
              return `${baseClass} bg-surface border-txt-light/20 text-txt`;
      }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-txt">Denný Plánovač</h2>
          <p className="text-txt-muted text-sm">Navrhni si svoj deň alebo nechaj AI rozhodnúť.</p>
        </div>
        <div className="flex bg-canvas p-1 rounded-lg border border-txt-light/10">
          <button 
            onClick={() => setMode('DIY')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'DIY' ? 'bg-surface shadow-sm text-txt' : 'text-txt-muted hover:text-txt'}`}
          >
            DIY (Manuálne)
          </button>
          <button 
            onClick={() => setMode('AI')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${mode === 'AI' ? 'bg-surface shadow-sm text-primary' : 'text-txt-muted hover:text-txt'}`}
          >
            <Sparkles size={16} />
            AI Asistent
          </button>
        </div>
      </div>

      {/* AI Controls */}
      {mode === 'AI' && (
        <div className="bg-primary-50/50 p-6 rounded-2xl border border-primary-50">
           <div className="flex items-start gap-4">
              <div className="bg-surface p-3 rounded-full shadow-sm text-primary">
                <Sparkles size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-txt">IdealTwin Thinking Mode</h3>
                <p className="text-txt-muted text-sm mt-1">
                  AI zanalyzuje tvoje ciele ({userGoals.length}) a preferencie, aby vytvorila najlepší možný rozvrh. (Odmena: 50 XP)
                </p>
                <div className="mt-4 flex flex-wrap gap-3 items-center">
                  <button 
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {isGenerating ? 'Premýšľam...' : 'Vygenerovať Ideálny Deň'}
                  </button>
                  
                  {usedFallback && (
                    <div className="flex items-center gap-2 text-xs text-habit bg-habit/10 px-3 py-2 rounded-lg border border-habit/20 font-medium">
                        <WifiOff size={14} />
                        <span>AI je offline (Zobrazený demo plán)</span>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* DIY Input */}
      {mode === 'DIY' && activeTab === 'plan' && (
        <div className="bg-surface p-4 rounded-xl border border-txt-light/20 flex flex-wrap gap-3 items-end shadow-sm">
          <div className="flex-1 min-w-[200px]">
             <label className="text-xs text-txt-muted block mb-1">Aktivita</label>
             <input 
               type="text" 
               className="w-full border border-txt-light/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-canvas"
               placeholder="Napr. Deep Work"
               value={newBlock.title}
               onChange={(e) => setNewBlock({...newBlock, title: e.target.value})}
             />
          </div>
          <div className="w-24">
             <label className="text-xs text-txt-muted block mb-1">Od</label>
             <input 
               type="time" 
               className="w-full border border-txt-light/30 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-canvas"
               value={newBlock.startTime}
               onChange={(e) => setNewBlock({...newBlock, startTime: e.target.value})}
             />
          </div>
          <div className="w-24">
             <label className="text-xs text-txt-muted block mb-1">Do</label>
             <input 
               type="time" 
               className="w-full border border-txt-light/30 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-canvas"
               value={newBlock.endTime}
               onChange={(e) => setNewBlock({...newBlock, endTime: e.target.value})}
             />
          </div>
          <button 
            onClick={addBlock}
            className="bg-primary hover:bg-primary-hover text-white p-2.5 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* Visualization: Plan vs Reality Tabs */}
      <div className="bg-surface rounded-2xl shadow-sm border border-txt-light/10 overflow-hidden min-h-[500px]">
        <div className="border-b border-txt-light/10 flex">
           <button 
             onClick={() => setActiveTab('plan')}
             className={`flex-1 py-4 text-sm font-semibold text-center transition-all ${activeTab === 'plan' ? 'text-primary border-b-2 border-primary bg-primary-50/20' : 'text-txt-muted hover:bg-canvas hover:text-txt'}`}
           >
             Plán (IdealTwin)
           </button>
           <button 
             onClick={() => setActiveTab('reality')}
             className={`flex-1 py-4 text-sm font-semibold text-center transition-all ${activeTab === 'reality' ? 'text-txt border-b-2 border-txt-light bg-canvas' : 'text-txt-muted hover:bg-canvas hover:text-txt'}`}
           >
             Realita (Ty)
           </button>
        </div>

        <div className="p-6 space-y-4">
           {currentBlocks.length === 0 ? (
             <div className="text-center py-20 text-txt-light">
               <Clock size={48} className="mx-auto mb-4 opacity-20" />
               <p>Zatiaľ žiadny plán na dnes.</p>
             </div>
           ) : (
             currentBlocks.map((block) => (
               <div key={block.id} className="flex items-start gap-4 group">
                  <div className="w-16 pt-1 text-right text-xs text-txt-muted font-mono">
                    {block.startTime}
                  </div>
                  
                  <div className="relative flex-1">
                    {/* Timeline connector */}
                    <div className="absolute left-[-23px] top-8 bottom-[-16px] w-px bg-txt-light/20 group-last:hidden"></div>
                    
                    <div 
                      onClick={() => activeTab === 'reality' && toggleCompletion(block.id, block.type, block.isCompleted)}
                      className={getBlockStyle(block.type, block.isCompleted)}
                    >
                       <div className="flex items-center justify-between w-full">
                          <div>
                            <h4 className={`font-semibold ${activeTab === 'reality' && block.isCompleted ? 'line-through opacity-70' : ''}`}>
                              {block.title}
                            </h4>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block border ${['work', 'rest', 'habit', 'health', 'exercise'].includes(block.type) && activeTab === 'plan' ? 'bg-white/20 border-white/30 text-white' : 'bg-canvas text-txt-muted border-txt-light/20'}`}>
                              {block.type}
                            </span>
                          </div>
                          {activeTab === 'reality' && (
                            <div className={`transition-colors ${block.isCompleted ? 'text-secondary' : 'text-txt-light'}`}>
                               {block.isCompleted ? <CheckCircle size={24} /> : <Circle size={24} />}
                            </div>
                          )}
                       </div>
                    </div>
                       {block.notes && (
                         <p className="text-xs text-txt-muted mt-2 ml-1 italic">
                           💡 Twin tip: {block.notes}
                         </p>
                       )}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default Planner;
