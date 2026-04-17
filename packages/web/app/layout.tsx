import type { Metadata } from 'next';
import { getAccessToken } from '@/lib/auth/oauth';
import { AuthNav } from '@/components/auth/AuthNav';
import { Providers } from '@/components/Providers';

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
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-900">Closepilot</h1>
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
