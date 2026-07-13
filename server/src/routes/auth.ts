import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import * as authService from '../services/auth';
import { unauthorized } from '../utils/http';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);
    const result = await authService.register(email.toLowerCase(), password, name);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email.toLowerCase(), password);
    res.json(result);
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await authService.getMe(req.userId!);
    if (!user) throw unauthorized();
    res.json({ user });
  }),
);
