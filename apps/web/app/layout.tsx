import type { Metadata } from 'next';
import { Fascinate, Fira_Code, Noto_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin'],
  display: 'swap',
});

const fascinate = Fascinate({
  variable: '--font-fascinate',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

const firaCode = Fira_Code({
  variable: '--font-fira-code',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EventTix - Event Ticketing',
  description: 'Discover events and book tickets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${fascinate.variable} ${firaCode.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-4.75rem)]">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
