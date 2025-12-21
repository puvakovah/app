import React, { useState } from 'react';
import { UserProfile, UserPreferences } from './types';
import { Settings as SettingsIcon, User, Moon, Bell, Globe, Shield, LogOut, Trash2, Save, Check, Info, Sun, AlertTriangle } from 'lucide-react';
import { translations, Language } from './translations';
import { db } from './db';

interface SettingsProps {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  onLogout: () => void;
  lang: Language;
}

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'language' | 'privacy';

const Settings: React.FC<SettingsProps> = ({ user, setUser, onLogout, lang = 'sk' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  const t = (key: string): string => {
      return translations[lang][key] || key;
  }

  // Parse preferences safely
  const getPrefs = (): UserPreferences => {
      if (typeof user.preferences === 'string') {
          return {
              theme: 'light',
              language: 'sk',
              notificationsEmail: true,
              notificationsPush: false,
              bio: user.preferences
          };
      }
      return user.preferences as UserPreferences;
  };

  const [prefs, setPrefs] = useState<UserPreferences>(getPrefs());
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [email, setEmail] = useState(user.email || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
      setIsSaving(true);
      
      const updatedUser: UserProfile = {
          ...user,
          firstName,
          lastName,
          email,
          preferences: prefs
      };

      setUser(updatedUser);
      
      setTimeout(() => {
          setIsSaving(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
      }, 800);
  };

  const handleDeleteAccount = async () => {
      const confirmMessage = lang === 'sk' 
        ? "Ste si istý? Táto akcia je nezvratná a vymaže všetky vaše dáta." 
        : "Are you sure? This action is irreversible and will delete all your data.";

      if (window.confirm(confirmMessage)) {
          setIsDeleting(true);
          try {
              console.log("Deleting account for:", user.name);
              await db.deleteAccount(user.name);
              // We don't check result success here strictly, we assume we want to logout anyway
              
              // Force logout and reload to clear everything
              onLogout();
              window.location.reload(); 
          } catch (e) {
              console.error("Delete failed", e);
              // Force logout anyway
              onLogout();
              window.location.reload();
          } finally {
              setIsDeleting(false);
          }
      }
  };

  const TabButton = ({ id, icon, label }: { id: SettingsTab, icon: React.ReactNode, label: string }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all
            ${activeTab === id 
                ? 'bg-primary-50 text-primary shadow-sm border border-primary-50 dark:bg-primary/20 dark:border-primary/10 dark:text-primary' 
                : 'text-txt-muted hover:bg-canvas hover:text-txt dark:text-txt-dark-muted dark:hover:bg-white/5 dark:hover:text-white'}
        `}
      >
          <span className={activeTab === id ? 'text-primary' : 'text-txt-muted dark:text-txt-dark-muted'}>{icon}</span>
          {label}
      </button>
  );

  return (
    <div className="animate-fade-in space-y-6 pb-20 h-full flex flex-col">
        <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-txt flex items-center gap-2 dark:text-txt-dark">
                <SettingsIcon className="text-primary" /> {t('settings.title')}
            </h2>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-2 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-sm
                    ${saveSuccess ? 'bg-green-500' : 'bg-primary hover:bg-primary-hover'}
                    ${isSaving ? 'opacity-70 cursor-wait' : ''}
                `}
            >
                {saveSuccess ? <Check size={18} /> : <Save size={18} />}
                {saveSuccess ? t('settings.saved') : (isSaving ? t('settings.saving') : t('settings.save'))}
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
            
            {/* Left Column: Navigation */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-surface p-4 rounded-2xl shadow-sm border border-txt-light/10 dark:bg-dark-surface dark:border-txt-light/10">
                    <div className="flex items-center gap-4 mb-6 p-2 border-b border-txt-light/10 pb-4 dark:border-txt-light/10">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-txt dark:text-txt-dark">{user.name}</h3>
                            <p className="text-xs text-txt-muted dark:text-txt-dark-muted">{t('dash.level')} {user.twinLevel}</p>
                        </div>
                    </div>
                    <nav className="space-y-1">
                        <TabButton id="profile" icon={<User size={18}/>} label={t('settings.account')} />
                        <TabButton id="appearance" icon={<Moon size={18}/>} label={t('settings.appearance')} />
                        <TabButton id="notifications" icon={<Bell size={18}/>} label={t('settings.notifications')} />
                        <TabButton id="language" icon={<Globe size={18}/>} label={t('settings.language')} />
                        <TabButton id="privacy" icon={<Shield size={18}/>} label={t('settings.privacy')} />
                    </nav>
                </div>

                <div className="bg-surface p-4 rounded-2xl shadow-sm border border-txt-light/10 dark:bg-dark-surface dark:border-txt-light/10">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 font-medium text-sm transition-colors dark:hover:bg-red-900/20">
                        <LogOut size={18} /> {t('nav.logout')}
                    </button>
                </div>
            </div>

            {/* Right Column: Dynamic Content */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <section className="bg-surface p-8 rounded-2xl shadow-sm border border-txt-light/10 animate-fade-in dark:bg-dark-surface dark:border-txt-light/10">
                        <h3 className="text-lg font-bold text-txt mb-6 flex items-center gap-2 border-b border-txt-light/10 pb-4 dark:text-txt-dark dark:border-txt-light/10">
                            <User size={20} className="text-secondary" /> {t('settings.personal_info')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-2 dark:text-txt-dark-muted">{t('settings.name')}</label>
                                <input 
                                    type="text" 
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full border border-txt-light/30 rounded-lg px-4 py-3 text-sm bg-canvas focus:ring-2 focus:ring-primary outline-none transition-all dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-2 dark:text-txt-dark-muted">{t('settings.surname')}</label>
                                <input 
                                    type="text" 
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full border border-txt-light/30 rounded-lg px-4 py-3 text-sm bg-canvas focus:ring-2 focus:ring-primary outline-none transition-all dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-2 dark:text-txt-dark-muted">{t('settings.email')}</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border border-txt-light/30 rounded-lg px-4 py-3 text-sm bg-canvas focus:ring-2 focus:ring-primary outline-none transition-all dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-2 dark:text-txt-dark-muted">{t('settings.bio')}</label>
                                <textarea 
                                    value={prefs.bio || ''}
                                    onChange={(e) => setPrefs({...prefs, bio: e.target.value})}
                                    className="w-full border border-txt-light/30 rounded-lg px-4 py-3 text-sm bg-canvas focus:ring-2 focus:ring-primary outline-none min-h-[120px] transition-all resize-none dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                                    placeholder="Napr. Ranné vtáča, mám rád šport..."
                                />
                                <p className="text-xs text-txt-muted mt-2 flex items-center gap-1 dark:text-txt-dark-muted">
                                    <Info size={12} /> {t('settings.bio_hint')}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* --- APPEARANCE TAB --- */}
                {activeTab === 'appearance' && (
                    <section className="bg-surface p-8 rounded-2xl shadow-sm border border-txt-light/10 animate-fade-in dark:bg-dark-surface dark:border-txt-light/10">
                        <h3 className="text-lg font-bold text-txt mb-6 flex items-center gap-2 border-b border-txt-light/10 pb-4 dark:text-txt-dark dark:border-txt-light/10">
                            <Moon size={20} className="text-secondary" /> {t('settings.appearance')}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-txt dark:text-txt-dark">{t('settings.mode_title')}</p>
                                    <p className="text-xs text-txt-muted mt-1 dark:text-txt-dark-muted">{t('settings.mode_desc')}</p>
                                </div>
                                <div className="flex bg-canvas p-1 rounded-lg border border-txt-light/10 dark:bg-dark-canvas dark:border-txt-light/10">
                                    <button 
                                        onClick={() => setPrefs({...prefs, theme: 'light'})}
                                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${prefs.theme === 'light' ? 'bg-white shadow-sm text-primary' : 'text-txt-muted hover:text-txt dark:text-txt-dark-muted'}`}
                                    >
                                        <Sun size={14} /> {t('settings.light')}
                                    </button>
                                    <button 
                                        onClick={() => setPrefs({...prefs, theme: 'dark'})}
                                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${prefs.theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-txt-muted hover:text-txt dark:text-txt-dark-muted'}`}
                                    >
                                        <Moon size={14} /> {t('settings.dark')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* --- NOTIFICATIONS TAB --- */}
                {activeTab === 'notifications' && (
                    <section className="bg-surface p-8 rounded-2xl shadow-sm border border-txt-light/10 animate-fade-in dark:bg-dark-surface dark:border-txt-light/10">
                        <h3 className="text-lg font-bold text-txt mb-6 flex items-center gap-2 border-b border-txt-light/10 pb-4 dark:text-txt-dark dark:border-txt-light/10">
                            <Bell size={20} className="text-secondary" /> {t('settings.notifications')}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-canvas rounded-xl border border-txt-light/10 dark:bg-dark-canvas dark:border-txt-light/10">
                                <div>
                                    <p className="text-sm font-bold text-txt dark:text-txt-dark">{t('settings.notif_email_title')}</p>
                                    <p className="text-xs text-txt-muted mt-1 dark:text-txt-dark-muted">{t('settings.notif_email_desc')}</p>
                                </div>
                                <button 
                                    onClick={() => setPrefs({...prefs, notificationsEmail: !prefs.notificationsEmail})}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${prefs.notificationsEmail ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${prefs.notificationsEmail ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-canvas rounded-xl border border-txt-light/10 dark:bg-dark-canvas dark:border-txt-light/10">
                                <div>
                                    <p className="text-sm font-bold text-txt dark:text-txt-dark">{t('settings.notif_push_title')}</p>
                                    <p className="text-xs text-txt-muted mt-1 dark:text-txt-dark-muted">{t('settings.notif_push_desc')}</p>
                                </div>
                                <button 
                                    onClick={() => setPrefs({...prefs, notificationsPush: !prefs.notificationsPush})}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${prefs.notificationsPush ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${prefs.notificationsPush ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* --- LANGUAGE TAB --- */}
                {activeTab === 'language' && (
                    <section className="bg-surface p-8 rounded-2xl shadow-sm border border-txt-light/10 animate-fade-in dark:bg-dark-surface dark:border-txt-light/10">
                        <h3 className="text-lg font-bold text-txt mb-6 flex items-center gap-2 border-b border-txt-light/10 pb-4 dark:text-txt-dark dark:border-txt-light/10">
                            <Globe size={20} className="text-secondary" /> {t('settings.language')}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-txt dark:text-txt-dark">{t('settings.lang_title')}</p>
                                    <p className="text-xs text-txt-muted mt-1 dark:text-txt-dark-muted">{t('settings.lang_desc')}</p>
                                </div>
                                <select 
                                    value={prefs.language}
                                    onChange={(e) => setPrefs({...prefs, language: e.target.value as any})}
                                    className="bg-canvas border border-txt-light/30 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10"
                                >
                                    <option value="sk">Slovenčina (SK)</option>
                                    <option value="en">English (EN)</option>
                                </select>
                            </div>
                        </div>
                    </section>
                )}

                {/* --- PRIVACY TAB --- */}
                {activeTab === 'privacy' && (
                    <div className="space-y-6 animate-fade-in">
                        <section className="bg-surface p-8 rounded-2xl shadow-sm border border-txt-light/10 dark:bg-dark-surface dark:border-txt-light/10">
                            <h3 className="text-lg font-bold text-txt mb-6 flex items-center gap-2 border-b border-txt-light/10 pb-4 dark:text-txt-dark dark:border-txt-light/10">
                                <Shield size={20} className="text-secondary" /> {t('settings.privacy')}
                            </h3>
                            
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm mb-6 flex gap-3 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-900/40">
                                <Info className="shrink-0 mt-0.5" size={18} />
                                <div>
                                    <span className="font-bold">Info:</span> {t('settings.privacy_info') || "Data stored locally/Supabase."}
                                </div>
                            </div>
                        </section>

                        {/* Danger Zone */}
                        <section className="bg-red-50 p-8 rounded-2xl border border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
                            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2 dark:text-red-400">
                                <AlertTriangle size={20} /> {t('settings.danger_zone')}
                            </h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-red-900 dark:text-red-300">{t('settings.delete_account')}</p>
                                    <p className="text-xs text-red-700/70 mt-1 dark:text-red-400/70">{t('settings.delete_desc')}</p>
                                </div>
                                <button 
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 shadow-sm dark:bg-transparent dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900"
                                >
                                    <Trash2 size={16} /> 
                                    {isDeleting ? 'Deleting...' : t('settings.delete_btn')}
                                </button>
                            </div>
                        </section>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

export default Settings;