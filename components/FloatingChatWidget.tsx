'use client';

import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useState, useEffect } from 'react';

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
        aria-label="Open chat"
      >
        {isOpen ? (
          // X icon when open
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Chat icon when closed
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Chat Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 rounded p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            {error ? (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Loading chat...</p>
                </div>
              </div>
            ) : (
              <ChatKit control={control} className="w-full h-full" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

