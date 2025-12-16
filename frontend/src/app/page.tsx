import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import LandingStats from "@/components/LandingStats";

// Dynamic imports for heavy components (below the fold)
const HeroSection = dynamic(() => import("@/components/HeroSection"), {
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  ),
});

const Footer = dynamic(() => import("@/components/Footer"));

// ISR: Revalidate every hour for static content
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navigation animate={true} />
      <HeroSection />

      <LandingStats />

      <Footer />
    </main>
  );
}
