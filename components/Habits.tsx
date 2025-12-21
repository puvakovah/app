
import React, { useState, Dispatch, SetStateAction } from 'react';
import { Habit, SearchResult, UserProfile, InboxMessage } from './types';
import { getHabitSuggestions } from './geminiService';
import { LEVELING_SYSTEM, getLevelInfo } from './gamificationConfig';
import { Check, Search, Plus, ExternalLink, Loader2, Flame, Mail, X, Save, ArrowUpCircle, Trash2 } from 'lucide-react';

interface HabitsProps {
  habits: Habit[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
}

const Habits: React.FC<HabitsProps> = ({ habits, setHabits, user, setUser }) => {
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ text: string, sources: SearchResult[] } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State for adding new habit
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');

  // State for email notification simulation
  const [notification, setNotification] = useState<string | null>(null);

  // Funkcia na simuláciu odoslania emailu (Toast)
  const sendEmailNotification = (subject: string) => {
    setNotification(`📧 Odosielam email na ${user.email || 'tvoj email'}: "${subject}"`);
    setTimeout(() => {
        setNotification(null);
    }, 4000);
  };

  const deleteHabit = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // Okamžité vymazanie
    setHabits(prevHabits => prevHabits.filter(h => h.id !== id));
  };

  const toggleHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check Daily Limit (Anti-Cheat)
    if (user.dailyHabitCount >= LEVELING_SYSTEM.config.maxHabitsPerDay) {
        // We still allow checking the habit, but 0 XP gained
        alert(`Denný limit XP pre návyky (${LEVELING_SYSTEM.config.maxHabitsPerDay}) dosiahnutý. Dnes už nezískaš XP, ale streak pokračuje.`);
    }

    let xpGained = 0;
    let levelUpOccurred = false;
    let newInboxMessages: InboxMessage[] = [];

    // Najprv vypočítame nový stav návykov
    setHabits(prevHabits => {
        const updated = prevHabits.map(h => {
            if (h.id === id) {
                const isCompletedToday = h.completedDates.includes(today);
                if (isCompletedToday) return h; // Already done

                const newStreak = h.streak + 1;
                
                // Base XP (if under limit)
                if (user.dailyHabitCount < LEVELING_SYSTEM.config.maxHabitsPerDay) {
                    xpGained += LEVELING_SYSTEM.xpValues.COMPLETE_HABIT;
                }

                // Check milestones (Streaks) - Extra XP!
                if (newStreak === 3) {
                   const bonus = LEVELING_SYSTEM.xpValues.STREAK_3_DAYS;
                   xpGained += bonus;
                   sendEmailNotification(`3-Dňový Streak! +${bonus} XP`);
                   
                   newInboxMessages.push({
                     id: `streak-3-${Date.now()}`,
                     sender: 'IdealTwin Assistant',
                     subject: `Streak 3 dní (+${bonus} XP)`,
                     body: `Konzistentnosť je kľúč! Udržuješ 3-dňovú sériu a získavaš bonus +${bonus} XP. Tvoj Ideal Twin je na teba hrdý.`,
                     date: new Date().toISOString(),
                     read: false,
                     type: 'achievement'
                   });
                }

                if (newStreak === 7) {
                   const bonus = LEVELING_SYSTEM.xpValues.STREAK_7_DAYS;
                   xpGained += bonus;
                   sendEmailNotification(`Týždenný Streak! +${bonus} XP`);

                   newInboxMessages.push({
                     id: `streak-7-${Date.now()}`,
                     sender: 'IdealTwin Assistant',
                     subject: `Streak 7 dní (+${bonus} XP)`,
                     body: `Týždenný Majster! Dokončil si celotýždňovú sériu. To je výkon! Pripisujeme ti +${bonus} XP bonus.`,
                     date: new Date().toISOString(),
                     read: false,
                     type: 'achievement'
                   });
                }
                
                // Add general encouragement to Inbox for other milestones
                if ([14, 30, 50, 100].includes(newStreak)) {
                   newInboxMessages.push({
                     id: `streak-${newStreak}-${Date.now()}`,
                     sender: 'IdealTwin Assistant',
                     subject: `Gratulujeme k ${newStreak} dňom!`,
                     body: `<p>Skvelá práca s návykom <strong>${h.title}</strong>. Udržal si ho už ${newStreak} dní v rade. Len tak ďalej!</p>`,
                     date: new Date().toISOString(),
                     read: false,
                     type: 'achievement'
                   });
                }

                return { 
                  ...h, 
                  streak: newStreak,
                  completedDates: [...h.completedDates, today]
                };
            }
            return h;
        });
        return updated;
    });

    // Update User XP & Level Logic
    if (xpGained > 0) {
        setUser(prev => {
          let newXp = prev.xp + xpGained;
          const currentDailyCount = prev.dailyHabitCount + 1;
          
          // Calculate Level Info
          const levelInfo = getLevelInfo(newXp);
          let newLevel = levelInfo.level;
          let newEnergy = prev.energy;
          let newLevelTitle = levelInfo.title;

          // Level Up Logic
          if (newLevel > prev.twinLevel) {
            newEnergy = 100; // Refill energy
            levelUpOccurred = true;

            // Unlock Rewards Logic
            const unlockMsg = levelInfo.unlock ? ` Odomknuté: ${levelInfo.unlock}.` : '';

            // Level Up Message
            newInboxMessages.push({
                id: `lvl-${Date.now()}`,
                sender: 'IdealTwin Assistant',
                subject: `Level Up! Úroveň ${newLevel} - ${newLevelTitle}`,
                body: `Gratulujeme! Dosiahol si Level ${newLevel} – ${newLevelTitle}. Tvoj Dvojník získal väčšiu veľkosť a energiu.${unlockMsg}`,
                date: new Date().toISOString(),
                read: false,
                type: 'achievement'
            });
          } else {
            newEnergy = Math.min(100, newEnergy + 2); // Small boost
          }

          if (levelUpOccurred) {
            sendEmailNotification(`Level Up! si teraz ${newLevelTitle}`);
          }

          return {
            ...prev,
            xp: newXp,
            twinLevel: newLevel,
            levelTitle: newLevelTitle,
            xpToNextLevel: levelInfo.nextLevelXp, // Dynamic
            energy: newEnergy,
            dailyHabitCount: currentDailyCount, // Increment daily count
            messages: [...prev.messages, ...newInboxMessages]
          };
        });
    }
  };

  const handleAddNewHabit = () => {
    if (!newHabitTitle.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title: newHabitTitle,
      frequency: newHabitFreq,
      streak: 0,
      completedDates: [],
      category: 'productivity' // Default category
    };

    setHabits(prev => [...prev, newHabit]);
    
    // Creation Reward (+10 XP) - No notification per requirement
    setUser(prev => {
        const newXp = prev.xp + LEVELING_SYSTEM.xpValues.CREATE_HABIT;
        const levelInfo = getLevelInfo(newXp);
        return {
            ...prev,
            xp: newXp,
            twinLevel: levelInfo.level,
            levelTitle: levelInfo.title,
            xpToNextLevel: levelInfo.nextLevelXp
        };
    });

    setNewBlockNotification(`Návyk vytvorený! +${LEVELING_SYSTEM.xpValues.CREATE_HABIT} XP`);

    // Reset form
    setNewHabitTitle('');
    setIsAdding(false);
  };

  const setNewBlockNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  }

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    const result = await getHabitSuggestions(searchQuery);
    setSuggestions(result);
    setLoading(false);
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateString: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('sk-SK', { weekday: 'narrow' })
      });
    }
    return days;
  };
  
  const weekDays = getLast7Days();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 relative">
      {/* Email Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-txt text-white px-6 py-4 rounded-xl shadow-xl border border-txt-light/20 animate-slide-in-down flex items-center gap-3">
            <div className={`p-2 rounded-full text-txt ${notification.includes('Level Up') ? 'bg-habit' : 'bg-primary'}`}>
                {notification.includes('Level Up') ? <ArrowUpCircle size={20} /> : <Mail size={20} />}
            </div>
            <div>
                <h4 className="font-bold text-sm">{notification.includes('Level Up') ? 'Nová úroveň!' : 'IdealTwin'}</h4>
                <p className="text-xs text-slate-300">{notification}</p>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-txt">Moje Návyky</h2>
        <button 
          onClick={() => setShowAiSearch(!showAiSearch)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Search size={16} />
          Nájdi nové návyky (AI)
        </button>
      </div>

      {showAiSearch && (
        <div className="bg-surface p-6 rounded-xl shadow-md border border-txt-light/10 animate-slide-in-down">
          <h3 className="font-semibold text-txt mb-2">Opýtaj sa Gemini</h3>
          <p className="text-sm text-txt-muted mb-4">Vyhľadaj najlepšie návyky pre tvoje ciele (napr. "ako lepšie spať"). Používame Google Search Grounding pre aktuálne dáta.</p>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-txt-light/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all bg-canvas text-txt"
              placeholder="Zadaj cieľ..."
            />
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-txt hover:bg-black text-white px-6 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Hľadať'}
            </button>
          </div>

          {suggestions && (
            <div className="bg-canvas p-4 rounded-lg border border-txt-light/10">
              <p className="text-txt whitespace-pre-wrap text-sm leading-relaxed">{suggestions.text}</p>
              
              {suggestions.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-txt-light/10">
                  <p className="text-xs font-bold text-txt-muted uppercase mb-2">Zdroje:</p>
                  <ul className="space-y-1">
                    {suggestions.sources.map((source, idx) => (
                      <li key={idx}>
                        <a href={source.uri} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink size={10} />
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map(habit => {
          const isDoneToday = habit.completedDates.includes(today);
          return (
            <div key={habit.id} className="bg-surface p-5 rounded-xl border border-txt-light/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between group">
               <div>
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-txt text-lg flex-1 pr-2 truncate">{habit.title}</h4>
                     <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-habit/10 text-habit px-2 py-1 rounded-full text-xs font-bold border border-habit/20">
                            <Flame size={12} fill="currentColor" />
                            {habit.streak}
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => deleteHabit(e, habit.id)}
                            className="text-txt-light hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors ml-1 z-10"
                            title="Odstrániť návyk"
                        >
                            <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
                  <span className="bg-canvas text-txt-muted text-xs px-2 py-0.5 rounded uppercase tracking-wide">{habit.frequency}</span>
                  
                  <div className="mt-4 mb-2">
                    <p className="text-[10px] text-txt-muted uppercase mb-1">Posledných 7 dní</p>
                    <div className="flex justify-between">
                      {weekDays.map((day) => {
                        const isCompleted = habit.completedDates.includes(day.dateString);
                        return (
                          <div key={day.dateString} className="flex flex-col items-center gap-1">
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors
                                ${isCompleted ? 'bg-secondary text-white shadow-sm' : 'bg-canvas text-txt-light'}
                              `}
                            >
                              {isCompleted && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] text-txt-muted">{day.dayName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
               </div>
               
               <button 
                 onClick={() => toggleHabit(habit.id)}
                 disabled={isDoneToday}
                 className={`w-full mt-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                   ${isDoneToday 
                     ? 'bg-secondary/10 text-secondary border border-secondary/20 cursor-default' 
                     : 'bg-primary hover:bg-primary-hover text-white shadow-sm'}
                 `}
               >
                 {isDoneToday ? (
                   <>
                    <Check size={18} />
                    Splnené
                   </>
                 ) : (
                   "Hotovo dnes (+15 XP)"
                 )}
               </button>
            </div>
          );
        })}
        
        {/* Add New Habit Card */}
        {isAdding ? (
            <div className="bg-surface p-5 rounded-xl border-2 border-primary shadow-md flex flex-col justify-between min-h-[200px] animate-fade-in">
                <div>
                    <h4 className="font-bold text-txt mb-3">Nový návyk</h4>
                    <input 
                        autoFocus
                        type="text" 
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Názov (napr. Čítanie)"
                        className="w-full border border-txt-light/30 rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-primary outline-none bg-canvas text-txt"
                    />
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setNewHabitFreq('daily')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md border ${newHabitFreq === 'daily' ? 'bg-primary-50 border-primary text-primary' : 'bg-surface border-txt-light/20 text-txt-muted'}`}
                        >
                            Denne
                        </button>
                        <button 
                            onClick={() => setNewHabitFreq('weekly')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md border ${newHabitFreq === 'weekly' ? 'bg-primary-50 border-primary text-primary' : 'bg-surface border-txt-light/20 text-txt-muted'}`}
                        >
                            Týždenne
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAdding(false)}
                        className="flex-1 py-2 text-sm text-txt-muted hover:bg-canvas rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                        <X size={16} /> Zrušiť
                    </button>
                    <button 
                        onClick={handleAddNewHabit}
                        disabled={!newHabitTitle.trim()}
                        className="flex-1 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} /> Uložiť
                    </button>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => setIsAdding(true)}
                className="border-2 border-dashed border-txt-light/30 rounded-xl p-5 flex flex-col items-center justify-center text-txt-muted hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all min-h-[200px] group"
            >
                <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3 group-hover:bg-primary-50 transition-colors">
                    <Plus size={24} />
                </div>
                <span className="font-medium">Pridať nový návyk (+10 XP)</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default Habits;
