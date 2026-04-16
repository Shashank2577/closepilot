import type { Metadata } from 'next';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'Closepilot - Autonomous B2B Deal Flow',
  description: 'Automated deal flow engine for service businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-900">Closepilot</h1>
                  <nav className="flex space-x-4">
                    <a href="/" className="text-gray-700 hover:text-gray-900">
                      Dashboard
                    </a>
                    <a href="/approvals" className="text-gray-700 hover:text-gray-900">
                      Approvals
                    </a>
                  </nav>
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
