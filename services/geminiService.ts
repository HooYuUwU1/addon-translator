
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SupportLanguage } from "../types";

export class GeminiService {
  constructor() {}

  async translateLangFile(content: string, sourceLanguage: SupportLanguage, targetLanguage: SupportLanguage): Promise<string> {
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sourceText = sourceLanguage === SupportLanguage.AUTO ? "the detected source language" : sourceLanguage;
    const systemInstruction = `
      You are an expert Minecraft Bedrock Edition translator.
      Translate the following .lang file content from ${sourceText} into ${targetLanguage}.
      RULES:
      1. Keep the format "key=value".
      2. ONLY translate the "value" part.
      3. Maintain all special symbols like "%%", "§", and technical placeholders like "%s", "%1", etc.
      4. If the value looks like a technical ID, do not translate it.
      5. Make the translation sound natural for a Minecraft player.
      6. Return ONLY the translated content in the same .lang format.
    `;

    try {
      // Fix: response.text is a property, not a method. Use explicit type GenerateContentResponse.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: { systemInstruction, temperature: 0.1 },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      throw error;
    }
  }

  async translateJsonFile(content: string, sourceLanguage: SupportLanguage, targetLanguage: SupportLanguage): Promise<string> {
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sourceText = sourceLanguage === SupportLanguage.AUTO ? "the detected source language" : sourceLanguage;
    const systemInstruction = `
      You are an expert Minecraft Bedrock Edition translator.
      Translate the user-facing strings inside this JSON from ${sourceText} into ${targetLanguage}.
      RULES:
      1. ONLY translate values for keys like "name", "description", "display_name", "text", "label", "title", "subtitle", "value".
      2. DO NOT translate keys, identifiers, paths, or technical values like "minecraft:player".
      3. Maintain the exact JSON structure and types (booleans, numbers, arrays).
      4. Return ONLY the valid JSON string.
    `;

    try {
      // Fix: response.text is a property, not a method. Use explicit type GenerateContentResponse.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      throw error;
    }
  }

  async translateScriptFile(content: string, sourceLanguage: SupportLanguage, targetLanguage: SupportLanguage): Promise<string> {
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sourceText = sourceLanguage === SupportLanguage.AUTO ? "the detected source language" : sourceLanguage;
    const systemInstruction = `
      You are an expert Minecraft Script API translator. 
      Your task is to translate user-facing strings (messages, titles, lore) inside a JavaScript/TypeScript code block from ${sourceText} into ${targetLanguage}.
      RULES:
      1. ONLY translate string literals (text inside "", '', or \`\`) that are meant to be seen by players.
      2. DO NOT translate code keywords, variable names, function names, properties, or event names.
      3. Example: player.sendMessage("Hello world") -> player.sendMessage("Xin chào thế giới").
      4. DO NOT translate technical identifiers like "minecraft:zombie".
      5. DO NOT break the code syntax. If you are unsure if a string is technical or player-facing, do not translate it.
      6. Return ONLY the updated code block. No explanation.
    `;

    try {
      // Fix: response.text is a property, not a method. Use explicit type GenerateContentResponse.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: { systemInstruction, temperature: 0.1 },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response");
      // Remove potential markdown code blocks if the AI added them
      return text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
    } catch (error) {
      throw error;
    }
  }

  async translateMcFunctionFile(content: string, sourceLanguage: SupportLanguage, targetLanguage: SupportLanguage): Promise<string> {
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sourceText = sourceLanguage === SupportLanguage.AUTO ? "the detected source language" : sourceLanguage;
    const systemInstruction = `
      You are an expert Minecraft Bedrock command translator.
      Translate player-facing text inside this .mcfunction file from ${sourceText} into ${targetLanguage}.
      RULES:
      1. Translate text in /say, /tell, /msg, /w.
      2. Translate the "text" values inside /tellraw or /titleraw JSON structures.
      3. DO NOT translate command names, selectors (@a, @s), coordinates, or item/entity identifiers.
      4. Maintain the structure: one command per line.
      5. Return ONLY the updated commands.
    `;

    try {
      // Fix: response.text is a property, not a method. Use explicit type GenerateContentResponse.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: { systemInstruction, temperature: 0.1 },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      throw error;
    }
  }

  async translateTextFile(content: string, sourceLanguage: SupportLanguage, targetLanguage: SupportLanguage): Promise<string> {
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sourceText = sourceLanguage === SupportLanguage.AUTO ? "the detected source language" : sourceLanguage;
    const systemInstruction = `
      Translate this plain text file from ${sourceText} into ${targetLanguage}.
      Keep all formatting and technical terms intact.
    `;

    try {
      // Fix: response.text is a property, not a method. Use explicit type GenerateContentResponse.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: content,
        config: { systemInstruction, temperature: 0.2 },
      });
      const text = response.text;
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      throw error;
    }
  }
        }
      
