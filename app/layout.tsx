// app/layout.tsx - CLEANED VERSION
import type { Metadata } from 'next';
import './globals.css';
import RootLayoutClient from './layout-client';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'SIMS',
  description: 'Safety Information Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8F8FF]">
        <RootLayoutClient>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '8px',
              },
              success: {
                style: {
                  background: '#28a745',
                },
              },
              error: {
                style: {
                  background: '#dc3545',
                },
              },
            }}
          />
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}

// ✅ REMOVED the duplicate layout function at the bottom
