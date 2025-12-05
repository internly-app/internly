import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Internly",
  description: "Internship reviews and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Always use dark mode
                  document.documentElement.classList.add('dark');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${inter.variable} font-sans antialiased`}>
          <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
