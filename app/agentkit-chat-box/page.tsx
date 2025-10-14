'use client';

import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useEffect, useState } from 'react';

export default function AgentKitChatBoxPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { control } = useChatKit({
    api: {
      async getClientSecret(currentSecret: string | null) {
        try {
          if (!currentSecret) {
            const response = await fetch('/api/chatkit/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create session');
            }

            const data = await response.json();
            return data.client_secret;
          }

          return currentSecret;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          throw err;
        }
      },
    },
  });

  useEffect(() => {
    const checkChatKitLoaded = () => {
      if (window.customElements?.get('openai-chatkit')) {
        setIsLoading(false);
      } else {
        setTimeout(checkChatKitLoaded, 100);
      }
    };
    checkChatKitLoaded();
  }, []);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '8px', padding: '24px', maxWidth: '400px' }}>
          <h2 style={{ color: '#c00', fontWeight: 600, marginBottom: '8px' }}>Error Loading Chat</h2>
          <p style={{ color: '#c00' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #333',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666' }}>Loading AgentKit...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e5e5', padding: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>AgentKit Assistant</h1>
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <ChatKit 
          control={control} 
          style={{ width: '100%', height: '100%' }}
        />
      </main>
    </div>
  );
}
