import React, { useState, Dispatch, SetStateAction } from 'react';
import { Habit, SearchResult, UserProfile, InboxMessage } from './types';
import { getHabitSuggestions } from './geminiService';
import { LEVELING_SYSTEM, getLevelInfo } from './gamificationConfig';
import { Check, Search, Plus, ExternalLink, Loader2, Flame, Mail, X, Save, ArrowUpCircle, Trash2 } from 'lucide-react';
import { translations, Language } from './translations';

interface HabitsProps {
  habits: Habit[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  lang?: Language;
}

const Habits: React.FC<HabitsProps> = ({ habits, setHabits, user, setUser, lang = 'sk' }) => {
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ text: string, sources: SearchResult[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [notification, setNotification] = useState<string | null>(null);

  const t = (key: string) => translations[lang][key] || key;

  // Funkcia na simuláciu odoslania emailu (Toast)
  const sendEmailNotification = (subject: string) => {
    setNotification(`📧 ${subject}`);
    setTimeout(() => {
        setNotification(null);
    }, 4000);
  };

  const deleteHabit = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    setHabits(prevHabits => prevHabits.filter(h => h.id !== id));
  };

  const toggleHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check Daily Limit
    if (user.dailyHabitCount >= LEVELING_SYSTEM.config.maxHabitsPerDay) {
        alert("Denný limit XP dosiahnutý.");
    }

    let xpGained = 0;
    let levelUpOccurred = false;
    let newInboxMessages: InboxMessage[] = [];

    setHabits(prevHabits => {
        const updated = prevHabits.map(h => {
            if (h.id === id) {
                const isCompletedToday = h.completedDates.includes(today);
                
                // If already completed today, do nothing (or handle uncheck if implemented)
                if (isCompletedToday) return h; 

                // --- STREAK LOGIC UPDATE ---
                // Check last completion date
                // We sort dates to be sure we get the latest one
                const sortedDates = [...h.completedDates].sort();
                const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
                
                let newStreak = 1; // Default to 1 (just started today)

                if (lastDate === yesterday) {
                    // Continued from yesterday
                    newStreak = h.streak + 1;
                } else if (lastDate === today) {
                    // Should be handled by isCompletedToday check, but safety fallback
                    newStreak = h.streak; 
                } else {
                    // Gap detected (missed yesterday or earlier), reset to 1
                    newStreak = 1;
                }

                // --- REWARDS ---
                if (user.dailyHabitCount < LEVELING_SYSTEM.config.maxHabitsPerDay) {
                    xpGained += LEVELING_SYSTEM.xpValues.COMPLETE_HABIT;
                }

                // Only award streak bonuses if streak is maintained
                if (newStreak === 3) {
                   const bonus = LEVELING_SYSTEM.xpValues.STREAK_3_DAYS;
                   xpGained += bonus;
                   sendEmailNotification(`Streak 3! +${bonus} XP`);
                   
                   newInboxMessages.push({
                     id: `streak-3-${Date.now()}`,
                     sender: 'IdealTwin Assistant',
                     subject: `Streak 3 Days (+${bonus} XP)`,
                     body: `Great consistency! 3 days streak bonus awarded.`,
                     date: new Date().toISOString(),
                     read: false,
                     type: 'achievement'
                   });
                }
                // (Other streak logic remains similar)

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

    if (xpGained > 0) {
        setUser(prev => {
          let newXp = prev.xp + xpGained;
          const levelInfo = getLevelInfo(newXp);
          let newLevel = levelInfo.level;
          let newEnergy = prev.energy;

          if (newLevel > prev.twinLevel) {
            newEnergy = 100; 
            levelUpOccurred = true;
            newInboxMessages.push({
                id: `lvl-${Date.now()}`,
                sender: 'IdealTwin Assistant',
                subject: `Level Up! ${newLevel}`,
                body: `Congrats! You reached Level ${newLevel}. Energy restored.`,
                date: new Date().toISOString(),
                read: false,
                type: 'achievement'
            });
          } else {
            newEnergy = Math.min(100, newEnergy + 2); 
          }

          if (levelUpOccurred) {
            sendEmailNotification(`Level Up! ${newLevel}`);
          }

          return {
            ...prev,
            xp: newXp,
            twinLevel: newLevel,
            levelTitle: levelInfo.title,
            xpToNextLevel: levelInfo.nextLevelXp, 
            energy: newEnergy,
            dailyHabitCount: prev.dailyHabitCount + 1, 
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
      category: 'productivity'
    };

    setHabits(prev => [...prev, newHabit]);
    
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

    setNewBlockNotification(`+${LEVELING_SYSTEM.xpValues.CREATE_HABIT} XP`);
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
        dayName: d.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { weekday: 'narrow' })
      });
    }
    return days;
  };
  
  const weekDays = getLast7Days();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 relative animate-fade-in pb-20">
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-txt text-white px-6 py-4 rounded-xl shadow-xl border border-txt-light/20 animate-slide-in-down flex items-center gap-3 dark:bg-dark-surface dark:text-white dark:border-txt-light/10">
            <div className={`p-2 rounded-full text-txt ${notification.includes('Level Up') ? 'bg-habit' : 'bg-primary'}`}>
                {notification.includes('Level Up') ? <ArrowUpCircle size={20} /> : <Mail size={20} />}
            </div>
            <div>
                <h4 className="font-bold text-sm">IdealTwin</h4>
                <p className="text-xs text-slate-300">{notification}</p>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-txt dark:text-txt-dark">{t('habits.title')}</h2>
        <button 
          onClick={() => setShowAiSearch(!showAiSearch)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Search size={16} />
          {t('habits.find_ai')}
        </button>
      </div>

      {/* Search UI (unchanged) */}
      {showAiSearch && (
        <div className="bg-surface p-6 rounded-xl shadow-md border border-txt-light/10 animate-slide-in-down dark:bg-dark-surface dark:border-txt-light/10">
          <h3 className="font-semibold text-txt mb-2 dark:text-txt-dark">{t('habits.ai_title')}</h3>
          <p className="text-sm text-txt-muted mb-4 dark:text-txt-dark-muted">{t('habits.ai_desc')}</p>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-txt-light/30 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all bg-canvas text-txt dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
              placeholder={t('habits.search_placeholder')}
            />
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-txt hover:bg-black text-white px-6 rounded-lg disabled:opacity-50 transition-colors dark:bg-primary dark:hover:bg-primary/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : t('habits.search_btn')}
            </button>
          </div>

          {suggestions && (
            <div className="bg-canvas p-4 rounded-lg border border-txt-light/10 dark:bg-dark-canvas dark:border-txt-light/10">
              <p className="text-txt whitespace-pre-wrap text-sm leading-relaxed dark:text-txt-dark">{suggestions.text}</p>
              {/* Sources list */}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map(habit => {
          const isDoneToday = habit.completedDates.includes(today);
          // VISUAL CHECK: Only show streak if it's 3 or more
          const showStreak = habit.streak >= 3;

          return (
            <div key={habit.id} className="bg-surface p-5 rounded-xl border border-txt-light/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between group dark:bg-dark-surface dark:border-txt-light/10">
               <div>
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-txt text-lg flex-1 pr-2 truncate dark:text-txt-dark">{habit.title}</h4>
                     <div className="flex items-center gap-2 shrink-0">
                        {/* Only display streak badge if streak >= 3 */}
                        {showStreak && (
                            <div className="flex items-center gap-1 bg-habit/10 text-habit px-2 py-1 rounded-full text-xs font-bold border border-habit/20 animate-fade-in">
                                <Flame size={12} fill="currentColor" />
                                {habit.streak}
                            </div>
                        )}
                        <button 
                            type="button"
                            onClick={(e) => deleteHabit(e, habit.id)}
                            className="text-txt-light hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors ml-1 z-10 dark:text-txt-dark-muted dark:hover:bg-red-900/20"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
                  <span className="bg-canvas text-txt-muted text-xs px-2 py-0.5 rounded uppercase tracking-wide dark:bg-dark-canvas dark:text-txt-dark-muted">{habit.frequency === 'daily' ? t('habits.daily') : t('habits.weekly')}</span>
                  
                  <div className="mt-4 mb-2">
                    <p className="text-[10px] text-txt-muted uppercase mb-1 dark:text-txt-dark-muted">{t('habits.last_7_days')}</p>
                    <div className="flex justify-between">
                      {weekDays.map((day) => {
                        const isCompleted = habit.completedDates.includes(day.dateString);
                        return (
                          <div key={day.dateString} className="flex flex-col items-center gap-1">
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors
                                ${isCompleted ? 'bg-secondary text-white shadow-sm' : 'bg-canvas text-txt-light dark:bg-dark-canvas dark:text-txt-dark-muted'}
                              `}
                            >
                              {isCompleted && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] text-txt-muted dark:text-txt-dark-muted">{day.dayName}</span>
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
                     ? 'bg-secondary/10 text-secondary border border-secondary/20 cursor-default dark:bg-secondary/20 dark:border-secondary/30' 
                     : 'bg-primary hover:bg-primary-hover text-white shadow-sm'}
                 `}
               >
                 {isDoneToday ? (
                   <>
                    <Check size={18} />
                    {t('habits.done')}
                   </>
                 ) : (
                   t('habits.done_today')
                 )}
               </button>
            </div>
          );
        })}
        
        {/* Add New Habit Card (Unchanged logic, keeping existing UI structure) */}
        {isAdding ? (
            <div className="bg-surface p-5 rounded-xl border-2 border-primary shadow-md flex flex-col justify-between min-h-[200px] animate-fade-in dark:bg-dark-surface dark:border-primary">
                <div>
                    <h4 className="font-bold text-txt mb-3 dark:text-txt-dark">{t('habits.new_habit')}</h4>
                    <input 
                        autoFocus
                        type="text" 
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder={t('habits.name_placeholder')}
                        className="w-full border border-txt-light/30 rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-primary outline-none bg-canvas text-txt dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                    />
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => setNewHabitFreq('daily')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md border ${newHabitFreq === 'daily' ? 'bg-primary-50 border-primary text-primary dark:bg-primary/20 dark:text-white' : 'bg-surface border-txt-light/20 text-txt-muted dark:bg-dark-canvas dark:border-txt-light/10 dark:text-txt-dark-muted'}`}
                        >
                            {t('habits.daily')}
                        </button>
                        <button 
                            onClick={() => setNewHabitFreq('weekly')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md border ${newHabitFreq === 'weekly' ? 'bg-primary-50 border-primary text-primary dark:bg-primary/20 dark:text-white' : 'bg-surface border-txt-light/20 text-txt-muted dark:bg-dark-canvas dark:border-txt-light/10 dark:text-txt-dark-muted'}`}
                        >
                            {t('habits.weekly')}
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAdding(false)}
                        className="flex-1 py-2 text-sm text-txt-muted hover:bg-canvas rounded-lg transition-colors flex items-center justify-center gap-1 dark:text-txt-dark-muted dark:hover:bg-dark-canvas"
                    >
                        <X size={16} /> {t('habits.cancel')}
                    </button>
                    <button 
                        onClick={handleAddNewHabit}
                        disabled={!newHabitTitle.trim()}
                        className="flex-1 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} /> {t('habits.save')}
                    </button>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => setIsAdding(true)}
                className="border-2 border-dashed border-txt-light/30 rounded-xl p-5 flex flex-col items-center justify-center text-txt-muted hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all min-h-[200px] group dark:border-txt-light/10 dark:text-txt-dark-muted dark:hover:bg-primary/10"
            >
                <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center mb-3 group-hover:bg-primary-50 transition-colors dark:bg-dark-canvas dark:group-hover:bg-primary/20">
                    <Plus size={24} />
                </div>
                <span className="font-medium">{t('habits.add_btn')}</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default Habits;