import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken, signToken } from '@/backend/auth/jwt';
import { SignJWT } from 'jose';

// Create a simple JWT test
describe('Auth Utility - JWT', () => {
  const secretKey = 'test-secret-key-that-is-at-least-32-chars-long';
  
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', secretKey);
  });

  it('should create and verify a JWT token successfully', async () => {
    const payload = {
      id: 'usr-1',
      username: 'testuser',
      role: 'admin',
      name: 'Test Admin',
      hospitalId: 'hosp-1'
    };

    // Create token
    const token = await signToken(payload as any);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Verify token
    const verified = await verifyToken(token);
    expect(verified).toBeDefined();
    expect(verified?.username).toBe('testuser');
    expect(verified?.role).toBe('admin');
  });

  it('should return null for invalid tokens', async () => {
    const result = await verifyToken('invalid.token.here');
    expect(result).toBeNull();
  });

  it('should throw an error if JWT_SECRET is missing', async () => {
    vi.stubEnv('JWT_SECRET', '');
    await expect(signToken({ id: '1', username: 'test', role: 'client', name: 'Test' } as any)).rejects.toThrow("JWT_SECRET environment variable is not set");
  });
});
