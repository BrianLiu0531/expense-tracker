import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Region, User } from '../types';
import { api, ApiError } from './api';

const ME_KEY = ['me'];

export function useAuth() {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const setUser = (user: User | null) => queryClient.setQueryData(ME_KEY, user);

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    async login(email: string, password: string) {
      const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', json: { email, password } });
      setUser(user);
    },
    async register(input: { name: string; email: string; password: string; region: Region }) {
      const { user } = await api<{ user: User }>('/auth/register', { method: 'POST', json: input });
      setUser(user);
    },
    async updateProfile(input: { name?: string; region?: Region }) {
      const { user } = await api<{ user: User }>('/auth/me', { method: 'PATCH', json: input });
      setUser(user);
      // Region changes GST and FY calculations, so refetch everything
      await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
    async logout() {
      await api('/auth/logout', { method: 'POST' });
      queryClient.clear();
      setUser(null);
    },
  };
}
