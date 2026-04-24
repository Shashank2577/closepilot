import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { getAccessToken } from '@/lib/auth/oauth';
import { AuthNav } from '@/components/auth/AuthNav';
import { Providers } from '@/components/Providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Closepilot - Autonomous B2B Deal Flow',
  description: 'Automated deal flow engine for service businesses',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessToken = await getAccessToken();
  const isAuthenticated = !!accessToken;

  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <Providers>
          <div className="min-h-screen bg-surface">
            <header className="sticky top-0 z-40 bg-surface-raised/80 backdrop-blur-lg border-b border-border">
              <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <a href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                      <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-lg font-bold text-text-primary tracking-tight group-hover:text-primary-600 transition-colors duration-200">
                      Closepilot
                    </span>
                  </a>
                  <AuthNav isAuthenticated={isAuthenticated} />
                </div>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
