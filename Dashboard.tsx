import React from 'react';
import { UserProfile, DayPlan } from './types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Trophy, Flame, Target, Moon, Sun, Zap } from 'lucide-react';
import { getAvatarState } from './gamificationConfig';
import { getPresetAvatarUrl } from './geminiService';
import { translations, Language } from './translations';

interface DashboardProps {
  user: UserProfile;
  plan: DayPlan;
  onNavigate: (view: any) => void;
  lang?: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ user, plan, onNavigate, lang = 'sk' }) => {
  const t = (key: string) => translations[lang][key] || key;
  
  const completedTasks = plan.actualBlocks.filter(b => b.isCompleted).length;
  const totalTasks = plan.plannedBlocks.length || 1; // avoid divide by zero
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const data = [
    { name: t('dash.completed'), value: completedTasks },
    { name: t('dash.remaining'), value: totalTasks - completedTasks },
  ];
  const COLORS = ['#4A6D88', '#e2e8f0']; // Primary, Slate-200

  // --- AVATAR STATE LOGIC ---
  const avatarState = user ? getAvatarState(user.twinLevel, user.energy) : { scale: 0.5, expression: 'happy' as any, displayEnergy: 100, isNight: false };
  const { scale, expression, displayEnergy, isNight } = avatarState;
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
          expression // Dynamic Expression based on energy/mood
      );
  }

  // --- CSS FILTERS FOR MOOD ---
  const getAvatarFilters = () => {
      switch (expression) {
          // Sleepy: Slightly darker, slightly desaturated (tired)
          case 'sleepy': return 'brightness-95 grayscale-[20%]'; 
          // Sleeping: Darker (night), more desaturated
          case 'sleeping': return 'brightness-75 grayscale-[50%] contrast-110';
          // Sad: Slightly gray to look "down"
          case 'sad': return 'grayscale-[40%] contrast-90';
          // Happy: NO FILTERS - Show original colors exactly
          case 'happy': default: return ''; 
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-txt-light/10 flex items-center justify-between dark:bg-dark-surface dark:border-txt-light/10">
        <div>
          <h1 className="text-2xl font-bold text-txt dark:text-txt-dark">{t('dash.welcome')}, {user.name}!</h1>
          <p className="text-txt-muted mt-1 dark:text-txt-dark-muted">
            "{t('dash.quote')}" — IdealTwin
          </p>
        </div>
        <button 
          onClick={() => onNavigate('planner')}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          {t('dash.open_planner')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Chart */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-txt-light/10 flex flex-col items-center justify-center relative dark:bg-dark-surface dark:border-txt-light/10">
          <h3 className="absolute top-4 left-4 text-sm font-semibold text-txt-light uppercase tracking-wider dark:text-txt-dark-muted">{t('dash.progress')}</h3>
          <div className="h-40 w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="text-center">
             <span className="text-3xl font-bold text-txt dark:text-txt-dark">{progress}%</span>
          </div>
        </div>

        {/* Twin Status */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-txt-light/10 flex flex-col items-center justify-between min-h-[400px] relative overflow-hidden dark:bg-dark-surface dark:border-txt-light/10">
           {/* Header with Icons */}
           <div className="flex justify-between items-start z-10 w-full">
               <h3 className="text-left text-sm font-semibold text-txt-light uppercase tracking-wider dark:text-txt-dark-muted">{t('dash.twin_status')}</h3>
               {/* Time Status Icon */}
               {isNight ? (
                    <div className="bg-slate-900/10 p-1.5 rounded-full text-indigo-900 dark:bg-white/10 dark:text-indigo-200" title="Noc"><Moon size={16} fill="currentColor"/></div>
                ) : (
                    <div className="bg-habit/10 p-1.5 rounded-full text-habit" title="Deň"><Sun size={16} fill="currentColor"/></div>
                )}
           </div>
           
           {/* Avatar Container */}
           <div className="w-full flex-1 flex items-end justify-center relative mt-2 min-h-[250px]">
             {dynamicAvatarUrl ? (
                <div 
                    style={{ 
                        transform: `scale(${scale})`,
                        transformOrigin: 'bottom center'
                    }}
                    className="w-full h-full flex items-end justify-center transition-all duration-700 ease-out"
                >
                    <img 
                        src={dynamicAvatarUrl} 
                        alt="Twin" 
                        className={`max-h-[320px] h-full object-contain drop-shadow-2xl transition-all duration-1000 ${getAvatarFilters()}`} 
                    />
                </div>
             ) : (
                <div className="w-full h-40 flex items-center justify-center text-txt-muted opacity-20 dark:text-txt-dark-muted">
                   <Target size={48} />
                </div>
             )}
             
             {(expression === 'sleepy' || expression === 'sleeping') && (
                <div className="absolute top-10 right-4 z-20 animate-bounce text-xl font-bold text-slate-400 select-none dark:text-slate-500">
                    {expression === 'sleeping' ? 'Spí...' : 'Zzz'}
                </div>
             )}
           </div>

           <div className="mt-4 z-10 w-full">
             <div className="flex justify-between items-center mb-1">
                 <p className="text-txt font-bold text-lg dark:text-txt-dark">{t('dash.level')} {user.twinLevel}</p>
                 <span className="text-xs font-medium uppercase tracking-wide text-txt-muted px-2 py-0.5 bg-transparent border border-txt-light/20 rounded-lg dark:text-txt-dark-muted dark:border-txt-light/10">
                    {expression === 'happy' && t('dash.active')}
                    {expression === 'sad' && t('dash.sad')}
                    {expression === 'sleepy' && t('dash.tired')}
                    {expression === 'sleeping' && t('dash.sleeping')}
                 </span>
             </div>
             
             {/* Horizontal Energy Bar */}
             <div className="w-full bg-canvas rounded-full h-2.5 overflow-hidden border border-txt-light/10 dark:bg-white/5">
                 <div 
                    className={`h-full rounded-full transition-all duration-500 ${isLowEnergy ? 'bg-red-400' : 'bg-secondary'}`} 
                    style={{ width: `${displayEnergy}%` }}
                 ></div>
             </div>
             <div className="flex justify-between items-center mt-1">
                 <span className="text-[10px] font-bold text-txt-muted uppercase flex items-center gap-1 dark:text-txt-dark-muted">
                    <Zap size={10} fill="currentColor" className={isLowEnergy ? 'text-red-400' : 'text-secondary'} /> 
                    {t('dash.energy')}
                 </span>
                 <span className="text-[10px] font-bold text-txt-muted dark:text-txt-dark-muted">{displayEnergy}%</span>
             </div>
           </div>
        </div>

        {/* Gamification Stats */}
        <div className="grid grid-rows-2 gap-4">
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-txt-light/10 flex items-center space-x-4 dark:bg-dark-surface dark:border-txt-light/10">
            <div className="p-3 bg-habit/10 text-habit rounded-lg">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-sm text-txt-muted dark:text-txt-dark-muted">{t('dash.streak')}</p>
              <p className="text-xl font-bold text-txt dark:text-txt-dark">5 Dní</p>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl shadow-sm border border-txt-light/10 flex items-center space-x-4 dark:bg-dark-surface dark:border-txt-light/10">
            <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-sm text-txt-muted dark:text-txt-dark-muted">{t('dash.points')}</p>
              <p className="text-xl font-bold text-txt dark:text-txt-dark">1,240</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;