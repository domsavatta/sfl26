import * as z from 'zod'

export const SignInFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Name must be at least 2 characters long.' })
    .trim(),

  password: z
    .string()
    .trim(),
})

export type FormState =
  | {
    errors?: {
      name?: string[]
      password?: string[]
    }
    message?: string
  }
  | undefined