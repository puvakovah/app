import { GoogleGenAI } from "@google/genai";
import { 
    SearchResult, AvatarExpression, 
    AvatarGender, AvatarSkin, AvatarHairColor, AvatarHairStyle, 
    AvatarEyeColor, AvatarGlasses, AvatarHeadwear, AvatarTopType, 
    AvatarClothingColor, AvatarBottomType, AvatarShoesType 
} from "./types";

// --- GENERATIVE BUILDER (Pollinations AI) ---
export const getPresetAvatarUrl = (
    gender: AvatarGender, 
    skin: AvatarSkin, 
    
    hairStyle: AvatarHairStyle,
    hairColor: AvatarHairColor,
    eyeColor: AvatarEyeColor,
    glasses: AvatarGlasses,
    headwear: AvatarHeadwear,
    
    topType: AvatarTopType,
    topColor: AvatarClothingColor,
    bottomType: AvatarBottomType,
    bottomColor: AvatarClothingColor,
    shoesType: AvatarShoesType,
    shoesColor: AvatarClothingColor,

    expression: AvatarExpression = 'happy', 
    fallbackToDefault: boolean = false
): string => {
  
  // 1. Construct Physical Description
  const genderDesc = gender === 'Male' ? "handsome man" : "beautiful woman";
  const hairDesc = hairStyle === 'Bald' ? "bald head" : `${hairStyle} ${hairColor} hair`;
  
  // 2. Construct Outfit Description
  const topDesc = `${topColor} ${topType}`;
  const bottomDesc = `${bottomColor} ${bottomType}`;
  const shoesDesc = `${shoesColor} ${shoesType}`;
  const outfitDesc = `wearing a ${topDesc}, ${bottomDesc}, and ${shoesDesc}`;
  
  // 3. Accessories
  let accessoriesDesc = "";
  if (glasses !== 'None') accessoriesDesc += `wearing ${glasses}, `;
  if (headwear !== 'None') accessoriesDesc += `wearing a ${headwear}, `;

  // 4. Expression Logic
  let exprPrompt = "happy face, confident smile, looking at camera";
  switch (expression) {
      case 'sad': 
          exprPrompt = "sad face, disappointed expression, looking slightly down, frowning, low energy posture"; 
          break;
      case 'sleepy': 
          exprPrompt = "very tired face, sleepy eyes, yawning, bags under eyes, exhausted posture"; 
          break;
      case 'sleeping': 
          exprPrompt = "sleeping, eyes closed, peaceful dreaming expression, resting head, laying down"; 
          break;
      case 'happy': 
      default: 
          exprPrompt = "happy face, confident smile, energetic, upright posture, looking at camera"; 
          break;
  }

  // 5. Construct Prompt
  const prompt = `3D render of a ${genderDesc} with ${hairDesc} and ${eyeColor} eyes, ${outfitDesc}, ${accessoriesDesc} ${exprPrompt}, ${skin} skin tone, white background, soft lighting, Pixar Disney style, high quality 8k, adult proportions, full body shot, visible legs and shoes, standing pose`;

  // 6. Deterministic Seed (Identity Lock)
  // CRITICAL CHANGE: Excluded 'expression' from the seed string.
  // This ensures the "base character" (face, body type) stays exactly the same,
  // while the prompt changes the mood/pose.
  const uniqueString = `${gender}-${skin}-${hairStyle}-${hairColor}-${eyeColor}-${glasses}-${headwear}-${topType}-${topColor}-${bottomType}-${bottomColor}-${shoesType}-${shoesColor}`;
  
  let seed = 0;
  for (let i = 0; i < uniqueString.length; i++) {
    seed = (uniqueString.charCodeAt(i) + ((seed << 5) - seed));
  }
  seed = Math.abs(seed);
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${seed}&width=256&height=512&model=flux`; 
};


const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
        console.warn(`Operation timed out after ${ms}ms. Using fallback.`);
        resolve(fallbackValue);
    }, ms))
  ]);
};

const getAiClient = () => {
  try {
      return new GoogleGenAI({ 
          apiKey: process.env.API_KEY || ''
      });
  } catch (e) {
      return null;
  }
};

const FALLBACK_PLAN = {
  blocks: [
    { title: "Ranná rutina & Hydratácia", startTime: "07:00", endTime: "07:30", type: "habit", reason: "Štart dňa pre metabolizmus" },
    { title: "Hlboká práca (Deep Work)", startTime: "09:00", endTime: "11:00", type: "work", reason: "Najvyššia kognitívna kapacita ráno" },
    { title: "Zdravý obed & Prechádzka", startTime: "12:00", endTime: "13:00", type: "health", reason: "Doplnenie energie a pohyb" },
    { title: "Kreatívny blok / Učenie", startTime: "14:00", endTime: "15:30", type: "work", reason: "Rozvoj nových zručností" },
    { title: "Digitálny detox & Relax", startTime: "20:00", endTime: "21:00", type: "rest", reason: "Príprava na kvalitný spánok" }
  ]
};

export const generateIdealDayPlan = async (
  goals: string[],
  preferences: string
): Promise<any> => {
  const ai = getAiClient();
  if (!ai) return FALLBACK_PLAN;
  
  const prompt = `
    Create an optimized daily schedule (JSON) for a user with these goals: ${goals.join(", ")}.
    Preferences: ${preferences}.
    JSON format with "blocks" array. Each block: title, startTime, endTime, type, reason.
  `;

  try {
    const response = await withTimeout(
        ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: { responseMimeType: "application/json" },
        }),
        8000, 
        null 
    );

    if (!response) throw new Error("Timeout");
    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    if (!parsed.blocks) throw new Error("Invalid format");
    return parsed;

  } catch (error) {
    console.warn("AI Plan Generation Failed:", error);
    return FALLBACK_PLAN;
  }
};

export const getHabitSuggestions = async (goal: string): Promise<{ text: string; sources: SearchResult[] }> => {
  const ai = getAiClient();
  const fallback = { text: "Tip: Pite viac vody a hýbte sa. (Offline režim)", sources: [] };
  if (!ai) return fallback;
  
  try {
    const response = await withTimeout(
        ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Suggest 3 scientifically proven habits to help achieve: "${goal}".`,
            config: { tools: [{ googleSearch: {} }] },
        }),
        8000,
        null
    );
    if (!response) return fallback;
    const text = response.text || "Žiadne návrhy.";
    const sources: SearchResult[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ title: chunk.web.title || "Zdroj", uri: chunk.web.uri });
        }
      });
    }
    return { text, sources };
  } catch (error) {
    return fallback;
  }
};

export const generateMotivationVideo = async (prompt: string, imageBase64: string | null): Promise<string | null> => {
  const fallbackVideo = "https://cdn.pixabay.com/video/2023/10/22/186175-877660724_large.mp4";
  return fallbackVideo;
};