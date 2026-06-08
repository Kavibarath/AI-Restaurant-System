import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Restaurant Management System',
  description: 'Smart restaurant management with AI-driven insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
