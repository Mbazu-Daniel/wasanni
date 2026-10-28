import { Nav } from "./nav";
import { Hero } from "./hero";
import { Engines } from "./engines";
import { Features } from "./features";
import { Flow } from "./flow";
import { Leaderboard } from "./leaderboard";
import { Bracket } from "./bracket";
import { Replay } from "./replay";
import { Api } from "./api";
import { CTA } from "./cta";
import { Footer } from "./footer";
import { ScrollProgress } from "@/components/motion-kit";

export function Landing() {
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
