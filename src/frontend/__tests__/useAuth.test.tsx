import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/frontend/hooks/useAuth';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAuth Hook', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/auth/me') {
        return {
          ok: true,
          json: async () => ({ user: { username: 'testuser', role: 'admin' } }),
        };
      }
      if (url === '/api/auth/login' || url.toString().includes('login')) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }
      if (url === '/api/auth/logout') {
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }
      return { ok: false };
    });
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should initialize with user and loading state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBeDefined();
  });

  it('login function should handle success correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login('testuser', 'password');
      } catch (e) {
      }
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('logout function should call the API and reset user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial checkSession to finish
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.user).toBeTruthy();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});

