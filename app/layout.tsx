import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slidefox - AI Presentation Generator',
  description: 'Create beautiful presentations with AI',
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
