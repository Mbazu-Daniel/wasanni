import {
  IconArrowRight,
  IconBrandGithub,
  IconBrandGoogle,
  IconSparkles,
  IconTrophy,
  IconBolt,
  IconDeviceGamepad2,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Magnetic, Marquee, Reveal } from "@/components/motion-kit";

const icons = [IconTrophy, IconBolt, IconDeviceGamepad2, IconSparkles];

export function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-pink/20 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,46,136,0.22),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(46,123,255,0.22),transparent_55%)] px-6 py-16 text-center sm:px-12 sm:py-20">
            <Marquee className="absolute inset-x-0 top-0 opacity-20" speed="slow">
              {icons.map((Icon, index) => (
                <Icon key={index} className="mx-6 size-8 text-pink" />
              ))}
            </Marquee>

            <div className="relative">
              <Badge className="mx-auto">
                <IconSparkles className="size-3.5" />
                Public beta
              </Badge>
              <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
                Your game is ready.{" "}
                <span className="text-gradient-pink-blue">The arena is already running.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                Create an organization, add a platform, and ship the first
                session today. The free tier covers the first thousand sessions.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Magnetic>
                  <Button variant="gradient" size="lg" className="group gap-2">
                    Start building
                    <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Magnetic>
                <Button variant="outline" size="lg" className="gap-2">
                  <IconBrandGithub className="size-4" />
                  Read the docs
                </Button>
                <Button variant="ghost" size="lg" className="gap-2">
                  <IconBrandGoogle className="size-4" />
                  Sign in with Google
                </Button>
              </div>

              <motion.p
                className="mt-8 font-mono text-[11px] text-muted-foreground"
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                no credit card · one workspace · unlimited platforms on the free
                tier
              </motion.p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
