import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ClientSideLayout } from '@/components/ClientSideLayout';

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track your expenses and manage your budget",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientSideLayout>
            {children}
          </ClientSideLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
