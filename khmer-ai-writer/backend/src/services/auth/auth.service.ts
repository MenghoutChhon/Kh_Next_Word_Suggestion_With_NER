import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Mock user storage
const mockUsers = new Map();

export const register = async (email: string, password: string, name?: string, tier: string = 'free') => {
  if (mockUsers.has(email)) {
    throw new Error('User already exists');
  }
  
  const user = {
    id: Date.now().toString(),
    email,
    full_name: name,
    role: 'user',
    tier: tier as 'free' | 'premium' | 'business',
    createdAt: new Date()
  };
  
  mockUsers.set(email, { ...user, password });
  return user;
};

export const login = async (email: string, password: string) => {
  const userData = mockUsers.get(email);
  
  // Demo login - accept any credentials, determine tier from email
  let tier: 'free' | 'premium' | 'business' = 'free';
  if (email.includes('premium')) tier = 'premium';
  if (email.includes('business')) tier = 'business';
  
  const user = userData || {
    id: 'demo-user-' + Date.now(),
    email,
    full_name: 'Demo User',
    role: 'user',
    tier,
    createdAt: new Date()
  };
  
  const token = jwt.sign({ sub: user.id, role: user.role, tier: user.tier }, config.jwt.accessSecret, {
    expiresIn: '7d',
  });
  
  return { user, token };
};

export default { register, login };