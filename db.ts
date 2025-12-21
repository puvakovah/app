import { UserProfile, Habit, DayPlan } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DB_KEY = 'ideal_twin_db_v1';
const SESSION_KEY = 'ideal_twin_current_session';

// --- DEVELOPER CONFIGURATION ---
const SUPABASE_URL = "https://zdzfopzntvnxsesucmnm.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZvcHpudHZueHNlc3VjbW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODY1NjIsImV4cCI6MjA3OTc2MjU2Mn0.QyeOTZibLYrHdiULid8p16OuTbfwAyv-LDrUILj6Nyw"; 

export interface DbResult {
  success: boolean;
  data?: any;
  message?: string;
  username?: string;
}

// Inicializácia klienta
let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Supabase connected");
  } catch (e) {
    console.error("❌ Failed to connect to Supabase:", e);
  }
} else {
  console.warn("⚠️ Supabase credentials chýbajú v db.ts. Aplikácia beží v Local Storage režime.");
}

// --- DEFAULT DATA ---
const DEFAULT_USER: UserProfile = {
  name: "User",
  goals: ["Zlepšiť spánok", "Viac pohybu"],
  preferences: "Ranné vtáča",
  avatarUrl: null,
  avatarConfig: {
      gender: 'Male',
      skin: 'Medium-Light',
      hairColor: 'Brown',
      hairStyle: 'Short',
      eyeColor: 'Brown',
      glasses: 'None',
      headwear: 'None',
      topType: 'T-Shirt',
      topColor: 'White',
      bottomType: 'Jeans',
      bottomColor: 'Blue',
      shoesType: 'Sneakers',
      shoesColor: 'White'
  },
  
  // Gamification Init
  twinLevel: 1,
  levelTitle: "Novice Twin",
  xp: 0,
  xpToNextLevel: 200,
  energy: 80,
  
  // Daily Limits Init
  lastActivityDate: new Date().toISOString().split('T')[0],
  dailyHabitCount: 0,
  dailyBlockCount: 0,
  dailyPlanCreated: false,

  messages: [
    {
      id: 'welcome-msg',
      sender: 'IdealTwin Team',
      subject: 'Vitaj v aplikácii!',
      body: '<p>Sme radi, že si tu. Nastav si svoje ciele a začni budovať lepšie návyky.</p>',
      date: new Date().toISOString(),
      read: false,
      type: 'welcome'
    }
  ]
};

const DEFAULT_HABITS: Habit[] = [
  { id: '1', title: 'Pitie vody', frequency: 'daily', streak: 0, completedDates: [], category: 'health' }
];

const DEFAULT_PLAN: DayPlan = {
  date: new Date().toISOString().split('T')[0],
  plannedBlocks: [],
  actualBlocks: [],
  score: 0
};

// Helper to sanitize/migrate user data
const sanitizeUser = (user: any): UserProfile => {
    if (!user) return DEFAULT_USER;
    return {
        ...DEFAULT_USER,
        ...user,
        // Ensure nested objects like avatarConfig are merged if missing
        avatarConfig: { ...DEFAULT_USER.avatarConfig, ...(user.avatarConfig || {}) },
        // Ensure gamification stats exist
        twinLevel: user.twinLevel || 1,
        xp: user.xp || 0,
        energy: user.energy !== undefined ? user.energy : 100,
        messages: user.messages || DEFAULT_USER.messages
    };
};

// --- IMPLEMENTATIONS ---

// 1. Local Storage Provider (Fallback)
const LocalStorageProvider = {
  type: 'local',
  getUsers: () => {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  register: async (data: any) => {
    const { username, password, email, firstName, lastName, dateOfBirth } = data;
    const users = LocalStorageProvider.getUsers();
    
    if (users[username]) {
      return { success: false, message: 'Používateľ s týmto menom už existuje.' };
    }
    
    users[username] = {
      password,
      data: {
        user: { 
          ...DEFAULT_USER, 
          name: username, 
          firstName, 
          lastName, 
          email, 
          dateOfBirth
        },
        habits: DEFAULT_HABITS,
        dayPlan: DEFAULT_PLAN
      }
    };

    localStorage.setItem(DB_KEY, JSON.stringify(users));
    return { success: true };
  },

  login: async (username: string, password: string) => {
    const users = LocalStorageProvider.getUsers();
    const user = users[username];

    if (!user) return { success: false, message: 'Používateľ neexistuje.' };
    if (user.password !== password) return { success: false, message: 'Nesprávne heslo.' };
    
    // Save session
    localStorage.setItem(SESSION_KEY, username);

    // Sanitize data on login
    const sanitizedUser = sanitizeUser(user.data.user);

    return { 
        success: true, 
        data: { ...user.data, user: sanitizedUser } 
    };
  },

  logout: async () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession: async () => {
    const savedUsername = localStorage.getItem(SESSION_KEY);
    if (!savedUsername) return { success: false };

    const users = LocalStorageProvider.getUsers();
    const user = users[savedUsername];

    if (user) {
        // Sanitize data on session restore
        const sanitizedUser = sanitizeUser(user.data.user);
        return { 
            success: true, 
            username: savedUsername, 
            data: { ...user.data, user: sanitizedUser } 
        };
    }
    return { success: false };
  },

  saveUserData: async (username: string, data: any) => {
    const users = LocalStorageProvider.getUsers();
    if (users[username]) {
      users[username].data = { ...users[username].data, ...data };
      localStorage.setItem(DB_KEY, JSON.stringify(users));
    }
  },

  deleteAccount: async (username: string) => {
      const users = LocalStorageProvider.getUsers();
      if (users[username]) {
          delete users[username];
          localStorage.setItem(DB_KEY, JSON.stringify(users));
          localStorage.removeItem(SESSION_KEY);
          return { success: true };
      }
      return { success: false, message: "User not found" };
  }
};

// 2. Supabase Provider (Production)
const SupabaseProvider = {
  type: 'supabase',
  register: async (data: any) => {
    if (!supabase) return { success: false, message: 'Supabase client not initialized' };
    const { username, password, email, firstName, lastName, dateOfBirth } = data;

    // 1. Sign up Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName, username, dateOfBirth },
        emailRedirectTo: window.location.origin 
      }
    });

    if (authError) return { success: false, message: authError.message };
    if (!authData.user) {
        return { success: false, message: "Registrácia začala. Skontrolujte email pre potvrdenie." };
    }

    // 2. Prepare Initial Data
    const initialData = {
      user: { 
          ...DEFAULT_USER, 
          name: username, 
          firstName, 
          lastName, 
          email, 
          dateOfBirth
      },
      habits: DEFAULT_HABITS,
      dayPlan: DEFAULT_PLAN
    };

    const { error: dbError } = await supabase
      .from('profiles')
      .insert([
        { id: authData.user.id, username: username, data: initialData }
      ]);

    if (dbError) {
      console.warn("Registration Insert skipped. Will retry on login.", dbError);
    }

    return { success: true };
  },

  login: async (username: string, password: string) => { 
    if (!supabase) return { success: false, message: 'Supabase client not initialized' };

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username, 
      password: password,
    });

    if (authError) return { success: false, message: "Nesprávny email alebo heslo." };
    if (!authData.user) return { success: false, message: "Login failed" };

    return await SupabaseProvider._fetchProfile(authData.user, username);
  },

  logout: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  getSession: async () => {
    if (!supabase) return { success: false };
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
        return { success: false };
    }

    const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || "User";
    
    return await SupabaseProvider._fetchProfile(session.user, username);
  },

  _fetchProfile: async (authUser: any, username: string) => {
    if (!supabase) return { success: false };

    let { data: profileData } = await supabase
      .from('profiles')
      .select('data')
      .eq('id', authUser.id)
      .maybeSingle(); 

    if (!profileData) {
      // Lazy Creation fallback
      const initialData = {
        user: { ...DEFAULT_USER, name: username, email: authUser.email },
        habits: DEFAULT_HABITS,
        dayPlan: DEFAULT_PLAN
      };
      
      await supabase
        .from('profiles')
        .insert([{ id: authUser.id, username: username, data: initialData }]);
        
      profileData = { data: initialData };
    }

    // Sanitize remote data
    const sanitizedUser = sanitizeUser(profileData?.data?.user);

    return { 
        success: true, 
        data: { ...profileData?.data, user: sanitizedUser }, 
        username: username 
    };
  },

  saveUserData: async (username: string, data: any) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ data: data })
        .eq('id', user.id);
    }
  },

  deleteAccount: async (username: string) => {
      // NOTE: Deleting Supabase users usually requires Admin API.
      // For this implementation, we will just delete the profile data and sign out.
      if (!supabase) return { success: false };
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          await supabase.from('profiles').delete().eq('id', user.id);
          // Optional: We could call a server function to delete Auth user, but client-side is limited.
          await supabase.auth.signOut();
      }
      return { success: true };
  }
};

export const db = {
  getProviderType: () => supabase ? 'supabase' : 'local',
  register: (data: any): Promise<DbResult> => (supabase ? SupabaseProvider.register(data) : LocalStorageProvider.register(data)) as Promise<DbResult>,
  login: (u: string, p: string): Promise<DbResult> => (supabase ? SupabaseProvider.login(u, p) : LocalStorageProvider.login(u, p)) as Promise<DbResult>,
  logout: () => (supabase ? SupabaseProvider.logout() : LocalStorageProvider.logout()),
  getSession: (): Promise<DbResult> => (supabase ? SupabaseProvider.getSession() : LocalStorageProvider.getSession()) as Promise<DbResult>,
  saveUserData: (u: string, d: any) => (supabase ? SupabaseProvider.saveUserData(u, d) : LocalStorageProvider.saveUserData(u, d)),
  deleteAccount: (u: string) => (supabase ? SupabaseProvider.deleteAccount(u) : LocalStorageProvider.deleteAccount(u))
};