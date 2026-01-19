import { z } from "zod";

export const ProofRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ProofRowValidated = z.infer<typeof ProofRowSchema>;

export const ProofRowArraySchema = z.array(ProofRowSchema);

export const ProofRowPartialSchema = ProofRowSchema.pick({
  id: true,
  title: true,
  tags: true,
});

export type ProofRowPartial = z.infer<typeof ProofRowPartialSchema>;

export const validateProofRow = (data: unknown): ProofRowValidated => {
  return ProofRowSchema.parse(data);
};

export const validateProofRows = (data: unknown): ProofRowValidated[] => {
  return ProofRowArraySchema.parse(data);
};

export const safeValidateProofRow = (
  data: unknown,
):
  | { success: true; data: ProofRowValidated }
  | { success: false; error: z.ZodError } => {
  const result = ProofRowSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};

export const safeValidateProofRows = (
  data: unknown,
):
  | { success: true; data: ProofRowValidated[] }
  | { success: false; error: z.ZodError } => {
  const result = ProofRowArraySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};
