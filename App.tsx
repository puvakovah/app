import React, { useState, useEffect } from 'react';
import { AppView, DayPlan, UserProfile, Habit, UserPreferences } from './types';
import Dashboard from './Dashboard';
import Planner from './Planner';
import Habits from './Habits';
import TwinProfile from './TwinProfile';
import Inbox from './Inbox';
import Settings from './settings';
import Auth from './Auth';
import { db } from './db';
import { getLevelInfo, getAvatarState } from './gamificationConfig';
import { getPresetAvatarUrl } from './geminiService';
import { translations, Language } from './translations';
import { LayoutDashboard, Calendar, ListChecks, UserCircle, Zap, Star, LogOut, CloudCheck, Loader2, Mail, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';

const DEFAULT_PLAN: DayPlan = {
  date: new Date().toISOString().split('T')[0],
  plannedBlocks: [],
  actualBlocks: [],
  score: 0
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Helper for safe preference access
  const getUserPrefs = (): UserPreferences => {
    if (!user || !user.preferences) return { theme: 'light', language: 'sk', notificationsEmail: true, notificationsPush: false };
    if (typeof user.preferences === 'string') return { theme: 'light', language: 'sk', notificationsEmail: true, notificationsPush: false };
    return user.preferences as UserPreferences;
  }

  const prefs = getUserPrefs();
  const currentLang: Language = prefs.language || 'sk';
  
  // Translation Helper
  const t = (key: string): string => {
      return translations[currentLang][key] || key;
  }

  // --- THEME APPLICATION ---
  useEffect(() => {
      const root = window.document.documentElement;
      if (prefs.theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
  }, [prefs.theme]);


  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      setIsLoadingSession(true);
      try {
        const session: any = await db.getSession();
        if (session.success && session.data) {
          const username = session.username || session.data.user.name;
          handleLogin(username, session.data);
        }
      } catch (e) {
        console.error("Session restore failed", e);
      } finally {
        setIsLoadingSession(false);
      }
    };

    restoreSession();
  }, []);

  // Daily Reset Check
  useEffect(() => {
    if (user) {
        const today = new Date().toISOString().split('T')[0];
        if (user.lastActivityDate !== today) {
            // New Day! Reset counters and PLAN
            const newPlan = { ...DEFAULT_PLAN, date: today }; // Fresh plan for new day
            
            setUser(prev => prev ? ({
                ...prev,
                lastActivityDate: today,
                dailyHabitCount: 0,
                dailyBlockCount: 0,
                dailyPlanCreated: false,
                energy: 100 // Restore energy on new day
            }) : null);
            
            setDayPlan(newPlan); // Reset plan
        }
    }
  }, [user?.lastActivityDate]);

  const handleLogin = (username: string, data: any) => {
    setCurrentUsername(username);
    
    // Ensure gamification fields exist (migration for old data)
    const userData = data.user;
    if (!userData.xpToNextLevel) userData.xpToNextLevel = 200;
    if (!userData.twinLevel) userData.twinLevel = 1;
    if (!userData.lastActivityDate) userData.lastActivityDate = new Date().toISOString().split('T')[0];

    setUser(userData);
    setHabits(data.habits);
    setDayPlan(data.dayPlan);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await db.logout();
    setIsAuthenticated(false);
    setCurrentUsername(null);
    setUser(null);
    setHabits([]);
    setDayPlan(null);
    setLastSaved(null);
    setCurrentView(AppView.DASHBOARD);
  };

  useEffect(() => {
    if (isAuthenticated && currentUsername && user && dayPlan) {
      const timer = setTimeout(async () => {
        try {
          await db.saveUserData(currentUsername, {
            user,
            habits,
            dayPlan
          });
          setLastSaved(new Date());
        } catch (e) {
          console.error("Auto-save failed:", e);
        }
      }, 1000); 

      return () => clearTimeout(timer);
    }
  }, [user, habits, dayPlan, isAuthenticated, currentUsername]);

  const renderView = () => {
    if (!user || !dayPlan) return null;

    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard user={user} plan={dayPlan} onNavigate={setCurrentView} lang={currentLang} />;
      case AppView.PLANNER:
        return <Planner plan={dayPlan} setPlan={setDayPlan} userGoals={user.goals} userPreferences={user.preferences} user={user} setUser={setUser} lang={currentLang} />;
      case AppView.HABITS:
        return <Habits habits={habits} setHabits={setHabits} user={user} setUser={setUser} lang={currentLang} />;
      case AppView.PROFILE:
        return <TwinProfile user={user} setUser={setUser} lang={currentLang} />;
      case AppView.INBOX:
        return <Inbox user={user} setUser={setUser} lang={currentLang} />;
      case AppView.SETTINGS:
        return <Settings user={user} setUser={setUser} onLogout={handleLogout} lang={currentLang} />;
      default:
        return <Dashboard user={user} plan={dayPlan} onNavigate={setCurrentView} lang={currentLang} />;
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center dark:bg-dark-canvas">
        <div className="w-20 h-20 mb-6 relative">
             <svg viewBox="0 0 100 100" className="w-full h-full animate-pulse">
                <circle cx="40" cy="50" r="35" className="fill-secondary" fillOpacity="0.8" />
                <circle cx="60" cy="50" r="35" className="fill-primary" fillOpacity="0.8" />
                <circle cx="82" cy="22" r="7" className="fill-habit stroke-canvas stroke-2 dark:stroke-dark-canvas" />
             </svg>
        </div>
        <Loader2 className="animate-spin text-primary mb-2" size={32} />
        <p className="text-txt-muted font-medium dark:text-txt-dark-muted">Načítavam tvoj svet...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  // Calculate dynamic progress based on current level range
  const levelInfo = user ? getLevelInfo(user.xp) : { xpToNext: 1, nextLevelXp: 100, progressPercent: 0 };
  const xpPercentage = user ? Math.min(100, Math.max(0, levelInfo.progressPercent)) : 0;

  // Calculate Task Progress for Mood
  const completedTasks = dayPlan?.actualBlocks.filter(b => b.isCompleted).length || 0;
  const totalTasks = dayPlan?.plannedBlocks.length || 1;
  const taskProgress = Math.round((completedTasks / totalTasks) * 100);

  // --- GLOBAL AVATAR STATE LOGIC ---
  const avatarState = user ? getAvatarState(user.twinLevel, taskProgress) : { scale: 0.5, expression: 'happy' as any, displayEnergy: 100, isNight: false };
  const { scale, expression, displayEnergy, isNight } = avatarState;
  
  // Calculate if energy is low for UI feedback
  const isLowEnergy = displayEnergy < 40;

  // --- DYNAMIC AVATAR IMAGE ---
  let dynamicAvatarUrl = user.avatarUrl;
  if (user.avatarConfig) {
      const cfg = user.avatarConfig;
      dynamicAvatarUrl = getPresetAvatarUrl(
          cfg.gender, cfg.skin, 
          cfg.hairStyle, cfg.hairColor, cfg.eyeColor,
          cfg.glasses, cfg.headwear,
          cfg.topType, cfg.topColor,
          cfg.bottomType, cfg.bottomColor,
          cfg.shoesType, cfg.shoesColor,
          expression // Dynamic Expression!
      );
  }

  const getAvatarFilters = () => {
      switch (expression) {
          case 'sleepy': return 'brightness-95 grayscale-[20%]';
          case 'sleeping': return 'brightness-75 grayscale-[50%] contrast-110';
          case 'sad': return 'grayscale-[40%] contrast-90';
          case 'happy': default: return ''; 
      }
  };

  return (
    <div className={`min-h-screen bg-canvas text-txt flex flex-col md:flex-row font-sans selection:bg-primary-50 selection:text-primary overflow-x-hidden transition-colors duration-300
        dark:bg-dark-canvas dark:text-white dark:selection:bg-primary-900
    `}>
      {/* Mobile Navigation (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-txt-light/20 z-50 flex justify-around p-3 shadow-lg dark:bg-dark-surface dark:border-txt-light/10">
        <button onClick={() => setCurrentView(AppView.DASHBOARD)} className={`${currentView === AppView.DASHBOARD ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <LayoutDashboard size={24} />
        </button>
        <button onClick={() => setCurrentView(AppView.PLANNER)} className={`${currentView === AppView.PLANNER ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <Calendar size={24} />
        </button>
        <button onClick={() => setCurrentView(AppView.HABITS)} className={`${currentView === AppView.HABITS ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <ListChecks size={24} />
        </button>
        <button onClick={() => setCurrentView(AppView.INBOX)} className={`${currentView === AppView.INBOX ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <Mail size={24} />
        </button>
        <button onClick={() => setCurrentView(AppView.PROFILE)} className={`${currentView === AppView.PROFILE ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <UserCircle size={24} />
        </button>
        <button onClick={() => setCurrentView(AppView.SETTINGS)} className={`${currentView === AppView.SETTINGS ? 'text-primary' : 'text-txt-muted dark:text-gray-400'}`}>
          <SettingsIcon size={24} />
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 flex-shrink-0 bg-surface border-r border-txt-light/20 dark:bg-dark-surface dark:border-white/10">
        <div className="flex flex-col min-h-full p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 relative flex-shrink-0">
               <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Secondary Circle (Left) */}
                  <circle cx="40" cy="50" r="35" className="fill-secondary" fillOpacity="0.85" />
                  {/* Primary Circle (Right) */}
                  <circle cx="60" cy="50" r="35" className="fill-primary" fillOpacity="0.85" />
                  {/* Gold Accent (Top Right) */}
                  <circle cx="82" cy="22" r="7" className="fill-habit stroke-surface dark:stroke-dark-surface" strokeWidth="3" />
               </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-txt leading-none dark:text-white">IdealTwin</h1>
              <span className="text-[10px] text-secondary font-bold tracking-widest uppercase">AI Assistant</span>
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label={t('nav.dashboard')}
              active={currentView === AppView.DASHBOARD} 
              onClick={() => setCurrentView(AppView.DASHBOARD)} 
            />
            <NavItem 
              icon={<Calendar size={20} />} 
              label={t('nav.planner')}
              active={currentView === AppView.PLANNER} 
              onClick={() => setCurrentView(AppView.PLANNER)} 
            />
            <NavItem 
              icon={<ListChecks size={20} />} 
              label={t('nav.habits')}
              active={currentView === AppView.HABITS} 
              onClick={() => setCurrentView(AppView.HABITS)} 
            />
            <NavItem 
              icon={<Mail size={20} />} 
              label={t('nav.inbox')}
              active={currentView === AppView.INBOX} 
              onClick={() => setCurrentView(AppView.INBOX)} 
            />
            <NavItem 
              icon={<UserCircle size={20} />} 
              label={t('nav.profile')}
              active={currentView === AppView.PROFILE} 
              onClick={() => setCurrentView(AppView.PROFILE)} 
            />
            <NavItem 
              icon={<SettingsIcon size={20} />} 
              label={t('nav.settings')}
              active={currentView === AppView.SETTINGS} 
              onClick={() => setCurrentView(AppView.SETTINGS)} 
            />
          </nav>

          {/* Footer Actions */}
          <div className="space-y-2 mb-6 border-t border-txt-light/20 dark:border-white/10 pt-4 mt-auto">
              <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-txt-muted hover:text-red-500 hover:bg-red-50 transition-all dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                  <LogOut size={20} />
                  {t('nav.logout')}
              </button>
          </div>

          {/* Persistent Twin & Stats Container */}
          <div className="pt-6 border-t border-txt-light/20 dark:border-white/10">
             {/* Twin Visual */}
             {user && (
               <>
                 {/* Transparent Container - No Box */}
                 <div className="relative w-full h-64 mb-4 bg-transparent flex items-end justify-center">
                   {dynamicAvatarUrl ? (
                      <div className="w-full h-full flex items-end justify-center relative">
                          {/* Status Icon */}
                          <div className="absolute top-0 left-0 z-20">
                              {isNight ? (
                                  <div className="p-1 rounded-full text-indigo-200"><Moon size={12} fill="currentColor"/></div>
                              ) : (
                                  <div className="p-1 rounded-full text-habit"><Sun size={12} fill="currentColor"/></div>
                              )}
                          </div>

                          {/* Fatigue Animation */}
                          {(expression === 'sleepy' || expression === 'sleeping') && (
                              <div className="absolute top-4 right-4 z-20 animate-bounce text-sm font-bold text-slate-400 select-none">
                                  {expression === 'sleeping' ? 'Spí...' : 'Zzz'}
                              </div>
                          )}

                          {/* Scaled Avatar - Instant CSS Filters */}
                          <div 
                              style={{ 
                                  transform: `scale(${scale})`,
                                  transformOrigin: 'bottom center'
                              }}
                              className="w-full h-full flex items-end justify-center transition-all duration-700 ease-out p-2"
                          >
                              <img 
                                  src={dynamicAvatarUrl} 
                                  alt="Twin" 
                                  className={`w-full h-full object-contain drop-shadow-xl transition-all duration-1000 ${getAvatarFilters()}`} 
                              />
                          </div>
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center p-4">
                        <UserCircle size={48} className="mx-auto text-txt-muted mb-2" />
                        <p className="text-xs text-txt-muted text-center">Vytvor si dvojníka v profile</p>
                      </div>
                   )}
                   
                   {/* Level Badge - moved slightly to avoid overlap */}
                   <div className="absolute top-0 right-0 bg-txt/80 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm font-bold z-30">
                      Lvl {user.twinLevel}
                   </div>
                 </div>

                 {/* Stats Bars */}
                 <div className="space-y-3">
                   {/* Energy Bar */}
                   <div>
                     <div className="flex justify-between text-[10px] font-bold text-txt-muted uppercase mb-1 dark:text-gray-400">
                       <span className={`flex items-center gap-1 ${isLowEnergy ? 'text-red-400' : 'text-secondary'}`}>
                           <Zap size={10} fill="currentColor" /> Energia
                       </span>
                       <span>{displayEnergy}%</span>
                     </div>
                     <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden dark:bg-white/10">
                       <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${isLowEnergy ? 'bg-red-400' : 'bg-secondary'}`} 
                            style={{ width: `${displayEnergy}%` }}
                        ></div>
                     </div>
                   </div>

                   {/* XP Bar */}
                   <div>
                     <div className="flex justify-between text-[10px] font-bold text-txt-muted uppercase mb-1 dark:text-gray-400">
                       <span className="flex items-center gap-1"><Star size={10} className="text-habit" fill="currentColor" /> XP</span>
                       <span>{user.xp}/{levelInfo.nextLevelXp}</span>
                     </div>
                     <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden dark:bg-white/10">
                       <div className="bg-habit h-1.5 rounded-full transition-all duration-1000" style={{ width: `${xpPercentage}%` }}></div>
                     </div>
                   </div>

                   <div className="mt-4 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-xs font-bold text-primary uppercase">
                         {user.name.substring(0,1)}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-txt dark:text-white">{user.name}</p>
                       </div>
                     </div>
                     
                     {lastSaved && (
                       <div className="text-[10px] text-txt-muted flex items-center gap-1 dark:text-gray-400" title={`Uložené: ${lastSaved.toLocaleTimeString()}`}>
                         <CloudCheck size={14} className="text-secondary" />
                         <span className="hidden xl:inline">Uložené</span>
                       </div>
                     )}
                   </div>
                 </div>
               </>
             )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full relative">
        {renderView()}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group relative
      ${active 
        ? 'bg-primary-50 text-primary shadow-sm border border-primary-50 dark:bg-primary/20 dark:border-primary/10 dark:text-primary' 
        : 'text-txt-muted hover:bg-canvas hover:text-txt dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
  >
    <span className={`transition-colors ${active ? 'text-primary' : 'text-txt-light group-hover:text-txt-muted dark:text-primary'}`}>{icon}</span>
    {label}
  </button>
);

export default App;