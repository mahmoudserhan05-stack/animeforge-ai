import { z } from "zod";

// Centralized, server-side-enforced input validation. Every API route parses
// its body through one of these before touching the database or an AI
// provider — never trust client-side validation alone.

export const registerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200),
});

export const createProjectSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(8, "اكتب فكرة أوضح قليلًا (8 أحرف على الأقل)")
    .max(500, "الفكرة طويلة جدًا (500 حرف كحد أقصى)"),
});

export const updateProjectOptionsSchema = z.object({
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  animeStyle: z.string().trim().min(1).max(60),
  language: z.string().trim().min(1).max(20),
  voiceId: z.string().trim().min(1).max(60),
});

export const updateScriptSchema = z.object({
  script: z.string().trim().min(20, "السيناريو قصير جدًا").max(8000),
});

export const updateSceneSchema = z.object({
  description: z.string().trim().min(1).max(1000).optional(),
  character: z.string().trim().max(200).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  dialogue: z.string().trim().max(1000).nullable().optional(),
  imagePrompt: z.string().trim().min(1).max(1000).optional(),
});

export const voiceOptionsSchema = z.object({
  voiceId: z.string().trim().min(1).max(60),
  musicMood: z.string().trim().min(1).max(60).optional(),
  sfxEnabled: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectOptionsInput = z.infer<typeof updateProjectOptionsSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type VoiceOptionsInput = z.infer<typeof voiceOptionsSchema>;
