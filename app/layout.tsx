import type { Metadata } from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'World Family Bingo — Fisterra',
  description:
    'Multilingual live Bingo host console, synchronized smartphone remote, and 16:9 beamer display for World Family Bar in Fisterra.',
  openGraph: {
    title: 'World Family Bingo — Fisterra',
    description:
      'Multilingual live Bingo host console, synchronized smartphone remote, and 16:9 beamer display for World Family Bar in Fisterra.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'World Family Bingo — Fisterra',
    description:
      'Multilingual live Bingo host console, synchronized smartphone remote, and 16:9 beamer display for World Family Bar in Fisterra.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-white text-[#171C26] font-sans antialiased selection:bg-[#C99B2B]/20 selection:text-[#171C26]"
      >
        {children}
      </body>
    </html>
  );
}
