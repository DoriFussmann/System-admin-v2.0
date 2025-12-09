'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChatKit, useChatKit } from '@openai/chatkit-react';

export default function ChatKitPage() {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Initialize ChatKit with the hook
  const { control } = useChatKit({
    api: {
      async getClientSecret(currentSecret: string | null) {
        try {
          console.log('Getting client secret...', currentSecret ? 'reusing' : 'creating new');
          
          // Only create new session if we don't have a secret
          if (!currentSecret) {
            const response = await fetch('/api/chatkit/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('API error:', errorData);
              throw new Error(errorData.error || 'Failed to create session');
            }

            const data = await response.json();
            console.log('Session token received!');
            return data.client_secret;
          }

          return currentSecret;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('ChatKit session error:', err);
          setError(errorMessage);
          throw err;
        }
      },
    },
  });

  // Check if ChatKit web component is loaded
  useEffect(() => {
    const checkChatKitLoaded = () => {
      if (typeof window !== 'undefined' && window.customElements?.get('openai-chatkit')) {
        console.log('ChatKit web component is ready');
        setIsLoading(false);
      } else {
        setTimeout(checkChatKitLoaded, 100);
      }
    };
    checkChatKitLoaded();
  }, []);

  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', paddingTop: 16, paddingBottom: 16 }}>
        <div className="layout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                {user && user.projectLogo ? (
                  <img 
                    src={user.projectLogo} 
                    alt={user.projectName || 'Project Logo'} 
                    style={{ 
                      height: '24px', 
                      width: 'auto', 
                      maxWidth: '120px',
                      objectFit: 'contain'
                    }} 
                  />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 500 }}>The Night Ventures</span>
                )}
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link className="btn btn-sm" href="/">Home</Link>
              {user && user.isSuperadmin && (
                <Link className="btn btn-sm" href="/admin">Admin</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 1120, width: '100%', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 20, marginBottom: 20, color: '#171717' }}>
            Nübrace Customer Support Agent
          </h1>
          
          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              color: '#c33'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {isLoading && !error && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              fontSize: 16,
              color: '#666'
            }}>
              Loading chat assistant...
            </div>
          )}

          {/* ChatKit React Component */}
          {!isLoading && !error && (
            <div style={{ 
              flex: 1,
              minHeight: 0,
              width: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}>
                <ChatKit 
                  control={control}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

