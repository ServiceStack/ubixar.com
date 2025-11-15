import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreInitializer } from "@/components/StoreInitializer";
import { Header, ToastProvider } from "@/components";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ubixar - AI Workflow Platform",
  description: "Generate images and audio with AI workflows powered by ServiceStack",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <ToastProvider>
          <StoreInitializer />
          <Header />
          <main role="main" className="animate-fade-in">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
