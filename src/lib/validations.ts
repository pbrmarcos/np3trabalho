import { z } from "zod";

// ============================================
// SCHEMAS DE VALIDAÇÃO CENTRALIZADOS
// ============================================

// Schema base para email
export const emailSchema = z.string().email("Email inválido");

// Schema base para senha simples (login)
export const passwordSimpleSchema = z.string().min(6, "Senha deve ter no mínimo 6 caracteres");

// Schema completo para senha forte (signup/reset)
export const passwordStrongSchema = z.string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, "Senha deve conter pelo menos um símbolo especial");

// Schema de login (senha simples)
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSimpleSchema,
});

// Schema de signup (senha forte + confirmação)
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordStrongSchema,
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  confirmPassword: z.string(),
  whatsapp: z.string().optional(),
  companyName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

// Schema de reset de senha
export const resetPasswordSchema = z.object({
  password: passwordStrongSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

// Tipos inferidos dos schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
