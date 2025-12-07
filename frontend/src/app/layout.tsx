import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "600", "700"], // Reduced from 6 weights to 3 for faster loading
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Internly - Real Internship Reviews from Students",
    template: "%s | Internly",
  },
  description: "Read honest internship reviews from students who actually did the work. Get insights on interview processes, compensation, company culture, and real day-to-day experiences.",
  keywords: ["internship reviews", "student internships", "tech internships", "internship experiences", "company reviews", "interview tips"],
  authors: [{ name: "Internly Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://internly.app",
    title: "Internly - Real Internship Reviews from Students",
    description: "Read honest internship reviews from students who actually did the work.",
    siteName: "Internly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Internly - Real Internship Reviews from Students",
    description: "Read honest internship reviews from students who actually did the work.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
