<<<<<<< HEAD
=======
"use client";
>>>>>>> 8a4857bbd6805340ad535703c76c6b4690d27f5b
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
<<<<<<< HEAD
            router.push('/');
=======
            router.replace('/');
>>>>>>> 8a4857bbd6805340ad535703c76c6b4690d27f5b
            return;
          }
          
          const me = await r.json();
          if (me?.pageAccess?.[slug]) {
            setOk(true);
          } else {
            // No access → bounce to home
<<<<<<< HEAD
            router.push('/');
          }
        } catch (error) {
          console.error('Page access check failed:', error);
          router.push('/');
        }
      })();
    }, [router, slug]);
=======
            router.replace('/');
          }
        } catch (error) {
          console.error('Page access check failed:', error);
          router.replace('/');
        }
      })();
    }, [router]);
>>>>>>> 8a4857bbd6805340ad535703c76c6b4690d27f5b
    
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
