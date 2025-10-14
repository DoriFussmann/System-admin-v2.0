import type { Metadata } from 'next';
import Script from 'next/script';
import '../styles.css';

export const metadata: Metadata = {
  title: 'The Night Ventures',
  description: 'The Night Ventures',
  other: {
    'color-scheme': 'light only',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="root">{children}</div>
        <Script 
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

