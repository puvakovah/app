import { AvatarExpression } from "./types";

// Gamification System Configuration - "Fokusovaná Hĺbka"

export const LEVELING_SYSTEM = {
    config: {
      maxHabitsPerDay: 10,  // Anti-cheat limit
      maxBlocksPerDay: 12   // Anti-burnout limit (approx 12 hours)
    },
    xpValues: {
      PLAN_DAY: 50,
      CREATE_HABIT: 10,
      COMPLETE_WORK_BLOCK: 20,
      COMPLETE_REST_BLOCK: 10,
      COMPLETE_HABIT: 15,
      TRACK_REALITY: 5,
      PERFECT_DAY_BONUS: 100,
      STREAK_3_DAYS: 150,
      STREAK_7_DAYS: 500
    },
    levels: [
      { level: 1, minXp: 0, title: "Novice Twin", unlock: null },
      { level: 2, minXp: 200, title: "Beginner Twin", unlock: null },
      { level: 3, minXp: 500, title: "Planner Twin", unlock: "New Avatar Pose" },
      { level: 4, minXp: 900, title: "Focused Twin", unlock: null },
      { level: 5, minXp: 1400, title: "Pro Twin", unlock: "Dark Mode Theme" },
      { level: 6, minXp: 2000, title: "Consistent Twin", unlock: null },
      { level: 7, minXp: 2700, title: "Reliable Twin", unlock: "Golden Habit Border" },
      { level: 8, minXp: 3500, title: "Advanced Twin", unlock: null },
      { level: 9, minXp: 4400, title: "Elite Twin", unlock: null },
      { level: 10, minXp: 5400, title: "Master of Time", unlock: "Master Badge" },
      { level: 11, minXp: 6500, title: "Grandmaster Twin", unlock: null },
      { level: 12, minXp: 7700, title: "Virtuoso", unlock: null },
      { level: 13, minXp: 9000, title: "Sage Twin", unlock: "Mystic Aura Avatar" },
      { level: 14, minXp: 10400, "title": "Architect of Life", unlock: null },
      { level: 15, minXp: 11900, title: "Visionary", unlock: "Platinum UI Theme" },
      { level: 16, minXp: 13500, title: "Legendary Twin", unlock: null },
      { level: 17, minXp: 15200, title: "Mythic Twin", unlock: null },
      { level: 18, minXp: 17000, title: "Transcendent", unlock: null },
      { level: 19, minXp: 18900, title: "Timeless Entity", unlock: null },
      { level: 20, minXp: 21000, title: "The Ideal Twin", unlock: "Developer Mode / God Mode" }
    ]
  };
  
  export const getLevelInfo = (xp: number) => {
    const currentLevel = [...LEVELING_SYSTEM.levels]
      .reverse()
      .find(l => xp >= l.minXp) || LEVELING_SYSTEM.levels[0];
      
    const currentLevelIndex = LEVELING_SYSTEM.levels.findIndex(l => l.level === currentLevel.level);
    const nextLevel = LEVELING_SYSTEM.levels[currentLevelIndex + 1];
  
    let xpToNext = 0;
    let progressPercent = 100;
  
    if (nextLevel) {
      const xpInCurrentLevel = xp - currentLevel.minXp;
      const levelSpan = nextLevel.minXp - currentLevel.minXp;
      xpToNext = nextLevel.minXp - xp;
      progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / levelSpan) * 100));
    }
  
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      unlock: currentLevel.unlock,
      xpToNext,
      nextLevelXp: nextLevel ? nextLevel.minXp : xp,
      progressPercent
    };
  };

  // --- NEW AVATAR LOGIC (Energy & Mood Simulation) ---
  export const getAvatarState = (level: number, taskProgress: number) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 1. Growth Logic: Start 50% + 5% per level
    const baseScale = 0.5;
    const scale = baseScale + (level - 1) * 0.05;
  
    // 2. Energy Simulation (0% at Night, 100% at 06:00, depletes until 23:00)
    let simulatedEnergy = 0;
    
    if (currentHour >= 6 && currentHour < 23) {
        // Active Day (06:00 - 23:00 = 17 hours)
        const hoursAwake = (currentHour - 6) + (currentMinute / 60);
        const depletionRate = 100 / 17; // Drops ~5.8% per hour
        simulatedEnergy = Math.max(0, 100 - (hoursAwake * depletionRate));
    } else {
        // Night (23:00 - 06:00)
        simulatedEnergy = 0; 
    }

    const displayEnergy = Math.round(simulatedEnergy);

    // 3. Determine Expression (Mood)
    let expression: AvatarExpression = 'happy';
    let isNight = currentHour >= 20 || currentHour < 6;

    // Priority 1: Sleeping (Night hours)
    if (currentHour >= 23 || currentHour < 6) {
        expression = 'sleeping';
    } 
    // Priority 2: Sad (Lagging behind on tasks in the afternoon)
    // If it is past 2 PM (14:00) and less than 30% of tasks are done, avatar is sad/disappointed
    else if (currentHour >= 14 && taskProgress < 30) {
        expression = 'sad';
    }
    // Priority 3: Sleepy (Late evening or Very low energy)
    else if (currentHour >= 21 || displayEnergy < 40) {
        expression = 'sleepy';
    }
    // Priority 4: Happy (Default active state)
    else {
        expression = 'happy';
    }
  
    return { 
        scale, 
        expression, 
        displayEnergy, 
        isNight
    };
  };