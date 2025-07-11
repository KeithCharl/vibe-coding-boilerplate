import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "bSmart | Work smart. Automate everything.",
  description: "Your smarter way to work. Automate testing, streamline finance, and accelerate business delivery with bSmart by bancon.",
  keywords: ["AI agents", "enterprise automation", "business intelligence", "bancon", "bSmart"],
  authors: [{ name: "bancon Innovation Hub" }],
  robots: "index, follow",
  openGraph: {
    title: "bSmart | Work smart. Automate everything.",
    description: "Your smarter way to work. Transform your organization with intelligent automation.",
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
      <body 
        className="min-h-screen antialiased"
        style={{
          background: 'linear-gradient(to right, #F4F7FA, #FFFFFF)',
          fontFamily: 'Montserrat, "Open Sans", system-ui, sans-serif'
        }}
      >
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
