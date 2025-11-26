import { Inter, JetBrains_Mono, DM_Sans, Cardo } from 'next/font/google';
import { Providers } from '@/components/providers';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

const cardo = Cardo({
  variable: '--font-cardo',
  subsets: ['latin', 'greek'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'AGORA - Privacy-Preserving Governance Platform',
  description:
    'A privacy-preserving governance platform using Zama\'s Fully Homomorphic Encryption (FHE) for anonymous voting in decentralized spaces.',
  keywords: [
    'privacy',
    'governance',
    'FHE',
    'anonymous voting',
    'decentralized spaces',
    'DAOs',
    'proposals',
    'Zama',
    'Fully Homomorphic Encryption',
  ],
  authors: [{ name: 'Agora Labs' }],
  creator: 'Agora Labs',
  openGraph: {
    type: 'website',
    locale: 'en_UK',
    url: 'https://agora.xyz',
    title: 'AGORA - Privacy-Preserving Governance Platform',
    description:
      'A privacy-preserving governance platform using Zama\'s Fully Homomorphic Encryption (FHE) for anonymous voting in decentralized spaces.',
    siteName: 'AGORA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AGORA - Privacy-Preserving Governance Platform',
    description:
      'A privacy-preserving governance platform using Zama\'s Fully Homomorphic Encryption (FHE) for anonymous voting in decentralized spaces.',
    creator: '@AgoraLabs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Script
          src={process.env.NEXT_PUBLIC_RELAYER_SDK_URL}
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${dmSans.variable} ${cardo.variable} antialiased h-full`}
      >
        <Providers>
          <div id="root" role="application" aria-label="Agora App">
            {children}
          </div>
        </Providers>
        
        {/* Live region for announcements */}
        <div id="live-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
        <div id="live-announcer-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
