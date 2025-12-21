import React, { useState, useEffect } from 'react';
import { db } from './db';
import { ArrowRight, UserPlus, LogIn, Loader2, AlertTriangle, MailCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (username: string, data: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false); // New state for registration success
  
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const providerType = db.getProviderType();

  // Predvyplnenie posledného známeho mena pri načítaní
  useEffect(() => {
    const lastUser = localStorage.getItem('ideal_twin_last_username');
    if (lastUser) {
        setUsername(lastUser);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsSuccess(false);

    try {
      if (isLogin) {
        const result = await db.login(username, password);
        if (result.success) {
          localStorage.setItem('ideal_twin_last_username', username); // Zapamätať si meno
          onLogin(username, result.data);
        } else {
          setError(result.message || 'Login failed');
        }
      } else {
        if (!firstName || !lastName || !email || !dateOfBirth || !username || !password) {
            setError('Prosím vyplňte všetky polia.');
            setLoading(false);
            return;
        }

        const result = await db.register({
            username,
            password,
            firstName,
            lastName,
            email,
            dateOfBirth
        });
        
        if (result.success) {
          if (providerType === 'supabase') {
              // Registration successful, show email confirmation message
              setIsSuccess(true);
          } else {
              // Local storage mode - auto login
              const loginResult = await db.login(username, password);
              if (loginResult.success) {
                 localStorage.setItem('ideal_twin_last_username', username);
                 onLogin(username, loginResult.data);
              } else {
                 setIsLogin(true);
                 setError('Registrácia úspešná. Prosím, prihláste sa.');
              }
          }
        } else {
          setError(result.message || 'Registration failed');
        }
      }
    } catch (err) {
      console.error(err);
      setError("Vyskytla sa neočakávaná chyba.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-canvas border border-txt-light/30 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-txt dark:bg-dark-canvas dark:text-txt-dark dark:border-txt-light/10";

  // Success Screen (Email Verification)
  if (isSuccess && !isLogin) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4 font-sans relative dark:bg-dark-canvas">
            <div className="bg-surface w-full max-w-md p-8 rounded-2xl shadow-sm border border-txt-light/10 my-8 text-center dark:bg-dark-surface dark:border-txt-light/10">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <MailCheck size={32} />
                </div>
                <h2 className="text-2xl font-bold text-txt mb-2 dark:text-txt-dark">Skontrolujte si email</h2>
                <p className="text-txt-muted mb-6 dark:text-txt-dark-muted">
                    Poslali sme potvrdzovací link na <strong>{email}</strong>. 
                    Kliknite naň pre aktiváciu vášho účtu.
                </p>
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl border border-blue-100 mb-6 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-900/30">
                    <p>Nedostal som email? Skontrolujte priečinok <strong>Spam</strong> alebo <strong>Reklamy</strong>.</p>
                </div>
                <button 
                    onClick={() => { setIsSuccess(false); setIsLogin(true); }}
                    className="text-primary font-bold hover:underline"
                >
                    Späť na prihlásenie
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 font-sans relative dark:bg-dark-canvas">
      <div className="bg-surface w-full max-w-md p-8 rounded-2xl shadow-sm border border-txt-light/10 my-8 dark:bg-dark-surface dark:border-txt-light/10">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 relative mb-2">
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                <circle cx="40" cy="50" r="35" className="fill-secondary" fillOpacity="0.85" />
                <circle cx="60" cy="50" r="35" className="fill-primary" fillOpacity="0.85" />
                <circle cx="82" cy="22" r="7" className="fill-habit stroke-surface stroke-2 dark:stroke-dark-surface" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-txt dark:text-txt-dark">IdealTwin</h1>
          <p className="text-txt-muted text-sm mt-1 dark:text-txt-dark-muted">
             Tvoj virtuálny spoločník
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">Meno</label>
                        <input 
                        type="text" 
                        required={!isLogin}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClass}
                        placeholder="Ján"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">Priezvisko</label>
                        <input 
                        type="text" 
                        required={!isLogin}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        placeholder="Novák"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">Email</label>
                    <input 
                    type="email" 
                    required={!isLogin}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="jan@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">Dátum narodenia</label>
                    <input 
                    type="date" 
                    required={!isLogin}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={inputClass}
                    />
                </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">
              {!isLogin ? 'Používateľské meno' : (providerType === 'supabase' ? 'Email' : 'Email / Username')}
            </label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder={!isLogin ? "janko123" : (providerType === 'supabase' ? "email@example.com" : "jannovak")}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-txt-muted mb-1 dark:text-txt-dark-muted">Heslo</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-4 dark:bg-primary dark:hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Prihlásiť sa' : 'Vytvoriť účet'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-txt-light/20 dark:border-txt-light/10">
          <p className="text-txt-muted text-sm dark:text-txt-dark-muted">
            {isLogin ? 'Ešte nemáš účet?' : 'Už máš vytvorený účet?'}
          </p>
          <button 
            onClick={() => { setError(''); setIsLogin(!isLogin); }}
            className="text-primary font-semibold text-sm mt-1 hover:text-primary-hover flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            {isLogin ? (
              <><UserPlus size={14} /> Zaregistruj sa zadarmo</>
            ) : (
              <><LogIn size={14} /> Prihlásiť sa</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;