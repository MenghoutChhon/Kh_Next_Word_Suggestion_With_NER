import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  tier: 'free' | 'premium' | 'business';
  created_at: string;
}

class UserService {
  private usersFile = path.join(__dirname, '../../data/users.json');
  private users: User[] = [];

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const data = fs.readFileSync(this.usersFile, 'utf8');
        this.users = JSON.parse(data);
      } else {
        // Create directory if it doesn't exist
        const dir = path.dirname(this.usersFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.users = [];
        this.saveUsers();
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  private saveUsers() {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private determineTier(email: string): 'free' | 'premium' | 'business' {
    if (email.includes('premium') || email.includes('pro')) return 'premium';
    if (email.includes('business') || email.includes('enterprise')) return 'business';
    return 'free';
  }

  async signup(email: string, password: string, fullName: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    // Check if user exists
    const existingUser = this.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create user
    const user: User = {
      id: this.generateId(),
      email,
      password_hash,
      full_name: fullName,
      tier: this.determineTier(email),
      created_at: new Date().toISOString()
    };

    this.users.push(user);
    this.saveUsers();

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const user = this.users.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tier: user.tier },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = this.users.find(u => u.email === email);
    if (!user) return null;

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  verifyToken(token: string): { userId: string; email: string; tier: string } {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const userService = new UserService();