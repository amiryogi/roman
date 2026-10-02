import { z } from 'zod';

import { emailSchema } from '../common.js';

export const PASSWORD_MIN_LENGTH = 12;

export const loginInputSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** The fields without cross-field rules, so forms can extend them (e.g. a confirmation field). */
export const changePasswordFieldsSchema = z.strictObject({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${String(PASSWORD_MIN_LENGTH)} characters`)
    .max(200),
});

export const newPasswordDiffers = {
  check: (value: { currentPassword: string; newPassword: string }) =>
    value.newPassword !== value.currentPassword,
  params: {
    path: ['newPassword'],
    error: 'The new password must be different from the current one',
  },
};

export const changePasswordInputSchema = changePasswordFieldsSchema.refine(
  newPasswordDiffers.check,
  newPasswordDiffers.params,
);
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const adminDtoSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  lastLoginAt: z.iso.datetime().optional(),
});
export type AdminDto = z.infer<typeof adminDtoSchema>;

export const authResponseDtoSchema = z.strictObject({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  admin: adminDtoSchema,
});
export type AuthResponseDto = z.infer<typeof authResponseDtoSchema>;
