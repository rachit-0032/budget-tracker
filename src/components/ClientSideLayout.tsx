'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export function ClientSideLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  console.log('ClientSideLayout:', { user, loading, pathname });

  // Don't show sidebar on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (loading) {
    console.log('Auth is still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not logged in and not on login page, children components will handle redirect
  if (!user) {
    console.log('No user found, showing children without sidebar');
    return <>{children}</>;
  }

  console.log('User is logged in, showing sidebar layout');
  // Show sidebar layout when logged in
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
} 