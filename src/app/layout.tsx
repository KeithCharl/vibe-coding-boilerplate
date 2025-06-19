import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Enterprise Knowledge Platform | AI-Powered Business Intelligence",
  description: "Advanced multi-tenant knowledge management platform with AI-powered analytics, secure document processing, and enterprise-grade collaboration tools.",
  keywords: ["enterprise software", "knowledge management", "business intelligence", "AI platform", "document management"],
  authors: [{ name: "Enterprise Solutions Team" }],
  robots: "index, follow",
  openGraph: {
    title: "Enterprise Knowledge Platform",
    description: "Transform your organization's knowledge management with AI-powered insights and secure collaboration.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
