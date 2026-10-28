import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/motion-kit";

export function CTA() {
  return (
    <section className="relative overflow-hidden bg-night">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-signal/18 blur-[110px]"
      />
      <div className="relative mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-28">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-poster text-5xl font-black uppercase leading-[0.92] tracking-[-0.02em] text-chalk sm:text-7xl">
            Your game deserves <span className="text-signal">a platform.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-chalk/85">
            Create a workspace, deploy your first build, and give it a play URL.
            Wasanni is in public beta, with the hosting and competition APIs ready
            for your next browser game.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link to="/sign-up" className="action px-8 py-4 text-base">
              Start hosting a game
            </Link>
            <Link to="/sign-in" className="action-quiet px-6 py-3 text-sm">
              Sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
