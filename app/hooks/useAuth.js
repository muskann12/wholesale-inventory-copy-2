import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) router.push('/login');
        else setIsLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  return isLoading;
}