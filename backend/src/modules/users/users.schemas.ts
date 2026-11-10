import { z } from 'zod';

export const userIdSchema = z.uuid();

export const createUserSchema = z
  .strictObject({
    email: z.email().max(254),
    name: z.string().trim().min(1).max(100),
  })
  .meta({
    id: 'CreateUser',
    examples: [{ email: 'test@example.com', name: 'Alex' }],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userResponseSchema = z
  .object({
    id: userIdSchema,
    email: createUserSchema.shape.email,
    name: createUserSchema.shape.name,
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });

export const usersResponseSchema = z.array(userResponseSchema);
