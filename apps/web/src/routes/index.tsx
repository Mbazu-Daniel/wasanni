import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Engines } from "@/components/landing/engines";
import { Features } from "@/components/landing/features";
import { Flow } from "@/components/landing/flow";
import { Leaderboard } from "@/components/landing/leaderboard";
import { Bracket } from "@/components/landing/bracket";
import { Replay } from "@/components/landing/replay";
import { Api } from "@/components/landing/api";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { ScrollProgress } from "@/components/motion-kit";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="relative min-h-screen bg-ink text-foreground">
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <Engines />
        <Features />
        <Flow />
        <Leaderboard />
        <Bracket />
        <Replay />
        <Api />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
