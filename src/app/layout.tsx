import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Classroom Seat Arranger - Smart Seating Solution",
  description: "Create the perfect classroom seating arrangement with preferences, auto-arrangement, and drag-and-drop layout customization.",
  keywords: ["classroom", "seating", "arrangement", "education", "students", "seats", "layout"],
  authors: [{ name: "Tergel" }],
  openGraph: {
    title: "Classroom Seat Arranger",
    description: "Smart seating solution for better classroom organization",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Classroom Seat Arranger",
    description: "Smart seating solution for better classroom organization",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
