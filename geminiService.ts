import { GoogleGenAI, Type } from "@google/genai";
import { 
    UserProfile, AvatarConfig, AvatarExpression
} from "./types";
import { Language } from "./translations";

/**
 * Generates a unique seed based on avatar configuration.
 */
const getDeterministicSeed = (config: AvatarConfig, level: number): number => {
  const seedString = `${config.gender}-${config.skin}-${config.hairStyle}-${config.hairColor}-${config.eyeColor}-${config.topType}-${config.topColor}-${config.bottomType}-${config.bottomColor}-${config.shoesType}-${config.shoesColor}-${level}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; 
  }
  return Math.abs(hash);
};

/**
 * Avatar generator in Pixar/Disney 3D style using Gemini API.
 */
export const getPresetAvatarUrl = async (
    user: UserProfile,
    expression: AvatarExpression = 'happy',
    lang: Language = 'en'
): Promise<string> => {
  const config = user.avatarConfig;
  if (!config) return "";

  const seedValue = getDeterministicSeed(config, user.twinLevel);

  let ageStage = "child";
  if (user.twinLevel >= 20) ageStage = "sophisticated adult";
  else if (user.twinLevel >= 10) ageStage = "cool teenager";

  let topDesc = `a ${config.topColor} ${config.topType.toLowerCase()}`;
  if (config.topType === 'Shirt') {
    topDesc = `an elegant ${config.topColor} button-up shirt with a crisp formal collar`;
  }

  let bottomDesc = `a pair of ${config.bottomColor} ${config.bottomType.toLowerCase()}`;
  if (config.bottomType === 'Skirt') {
    bottomDesc = `a stylish ${config.bottomColor} skirt`;
  } else if (config.bottomType === 'Leggings') {
    bottomDesc = `tight athletic ${config.bottomColor} performance leggings`;
  }

  let hairDesc = `${config.hairColor} ${config.hairStyle.toLowerCase()} hair`;
  if (config.hairStyle === 'Bald') hairDesc = "a completely smooth bald head, no hair";
  else if (config.hairStyle === 'Spiky') hairDesc = `modern spiky ${config.hairColor} styled hair`;
  else if (config.hairStyle === 'Ponytail') hairDesc = `${config.hairColor} hair tied back in a neat ponytail`;

  const prompt = `Full body 3D render in Pixar and Disney animation style of a ${ageStage} ${config.gender.toLowerCase()}. 
    Skin: ${config.skin.toLowerCase()} tone. 
    Eyes: ${config.eyeColor.toLowerCase()}, showing a ${expression} expression.
    Hair: ${hairDesc}.
    Clothing: ${topDesc} paired with ${bottomDesc}.
    Shoes: ${config.shoesColor.toLowerCase()} ${config.shoesType.toLowerCase()}.
    Technical: cinematic lighting, 8k resolution, highly detailed textures, solid neutral background, centered character.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        seed: seedValue,
        imageConfig: { aspectRatio: "1:1" }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Gemini Image Generation failed", e);
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${seedValue}&width=1024&height=1024&model=flux`; 
};

/**
 * Generates an ideal daily plan based on goals and preferences.
 */
export const generateIdealDayPlan = async (goals: string[], preferences: string, lang: Language = 'en') => {
    const langInstruction = lang === 'sk' ? "Odpovedaj výhradne v slovenskom jazyku." : "Respond strictly in English.";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate an ideal daily schedule for a user with goals: ${goals.join(', ')}. Preferences: ${preferences}. ${langInstruction}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        blocks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    startTime: { type: Type.STRING, description: "Format HH:MM" },
                                    endTime: { type: Type.STRING, description: "Format HH:MM" },
                                    type: { type: Type.STRING, description: "work, rest, habit, exercise, health" },
                                    reason: { type: Type.STRING, description: "Why this activity is important for user goals" }
                                },
                                required: ["title", "startTime", "endTime", "type"]
                            }
                        }
                    },
                    required: ["blocks"]
                }
            }
        });
        
        return JSON.parse(response.text || '{"blocks": []}');
    } catch (e) {
        console.error("AI Plan Generation failed:", e);
        return { blocks: [] };
    }
};

/**
 * Gets habit suggestions based on user query using search grounding.
 */
export const getHabitSuggestions = async (query: string, lang: Language = 'en') => {
    const langInstruction = lang === 'sk' ? "Odpovedaj výhradne v slovenskom jazyku." : "Respond strictly in English.";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ 
            model: "gemini-3-flash-preview",
            contents: `Suggest science-backed habits for: ${query}. Focus on practical steps. ${langInstruction}`,
            config: { 
                tools: [{ googleSearch: {} }] 
            }
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Source',
            uri: chunk.web?.uri || ''
        })).filter((s: any) => s.uri) || [];

        return { text: response.text || "", sources };
    } catch (e) {
        console.error("Habit search failed:", e);
        return { text: lang === 'sk' ? "Nepodarilo sa získať nápady." : "Failed to load suggestions.", sources: [] };
    }
};