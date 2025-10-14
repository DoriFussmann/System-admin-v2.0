"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function withPageAccess<T extends {}>(
  Wrapped: React.ComponentType<T>, 
  slug: string
) {
  return (props: T) => {
    const router = useRouter();
    const [ok, setOk] = useState<boolean | null>(null);
    
    useEffect(() => {
      (async () => {
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          if (!r.ok) {
            // Not logged in → bounce to home
            router.replace('/');
            return;
          }
          
          const me = await r.json();
          if (me?.pageAccess?.[slug]) {
            setOk(true);
          } else {
            // No access → bounce to home
            router.replace('/');
          }
        } catch (error) {
          console.error('Page access check failed:', error);
          router.replace('/');
        }
      })();
    }, [router]);
    
    // Show loading state while checking access
    if (ok === null) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: 16,
          color: '#666'
        }}>
          Checking access...
        </div>
      );
    }
    
    return <Wrapped {...props} />;
  };
}
