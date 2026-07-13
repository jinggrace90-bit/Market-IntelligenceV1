import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';
import { conflict, unauthorized } from '../utils/http';

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

function toPublic(u: { id: string; email: string; name: string | null; createdAt: Date }): PublicUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt.toISOString() };
}

export async function register(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? null },
  });
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toPublic(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toPublic(user) };
}

export async function getMe(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toPublic(user) : null;
}
