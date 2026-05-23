import { z } from "zod";

export const emailPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export type EmailPasswordCredentials = z.infer<typeof emailPasswordSchema>;

export function parseEmailPasswordForm(formData: FormData) {
  return emailPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
}
