import {
  IconBolt,
  IconTrophy,
  IconRotateClockwise,
  IconShieldCheck,
  IconCloudUpload,
  IconSwords,
  IconApi,
  IconWebhook,
  IconChartBar,
  IconGauge,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal, ShimmerText, TiltCard } from "@/components/motion-kit";

const features = [
  {
    icon: IconBolt,
    title: "Realtime sessions",
    body: "Signed tokens, one WebSocket, and events buffered in Redis. Reconnect and keep the run.",
    tag: "play",
  },
  {
    icon: IconTrophy,
    title: "Tournaments that run themselves",
    body: "Leaderboards and brackets. Seed, advance winners, and close the final round automatically.",
    tag: "compete",
  },
  {
    icon: IconRotateClockwise,
    title: "Replays that survive",
    body: "Events pack into R2 as compressed blocks. The score row keeps the offset, so a replay is one range read.",
    tag: "archive",
  },
  {
    icon: IconShieldCheck,
    title: "Flags, not rejections",
    body: "Every score is stored. Rules add flags like late or client_source. A game that asks for verification is the only one that gets a refusal.",
    tag: "trust",
  },
  {
    icon: IconCloudUpload,
    title: "Host it or keep it",
    body: "Upload a Godot or Unity bundle and Wasanni serves it with the headers those engines need. Or keep the game on your own servers.",
    tag: "hosting",
  },
  {
    icon: IconSwords,
    title: "Matches and teams",
    body: "Group sessions into a match. Placement comes from participants, not from a separate result table.",
    tag: "matches",
  },
  {
    icon: IconApi,
    title: "API keys per platform",
    body: "Organization-owned keys with scoped permissions. The secret is shown once and never stored.",
    tag: "access",
  },
  {
    icon: IconWebhook,
    title: "Webhooks with an event ID",
    body: "HMAC-signed deliveries with exponential retry. Every event carries an ID so a repeat is safe.",
    tag: "events",
  },
  {
    icon: IconChartBar,
    title: "One score per player",
    body: "A leaderboard keeps the best score each player holds, and every score keeps its own reasons. A flagged score still ranks.",
    tag: "rank",
  },
  {
    icon: IconGauge,
    title: "Usage you can meter",
    body: "Sessions, scores, storage, and bandwidth counted per organization and platform. Quotas enforce before the write.",
    tag: "operate",
  },
];

export function Features() {
  return (
    <section id="platform" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <Badge variant="blue">The platform</Badge>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            The pieces every game <ShimmerText>ends up rebuilding</ShimmerText>.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Wasanni gives them once. Sessions, scores, tournaments, matches,
            replays, and the keys and webhooks around them. You keep making the
            game.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.04}>
              <TiltCard intensity={5} className="h-full">
                <Card className="group h-full overflow-hidden border-border/80 bg-card/50 transition-colors duration-300 hover:border-pink/30">
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <motion.div
                      className="grid size-11 place-items-center rounded-xl border border-border bg-white/[0.03] text-blue-soft"
                      whileHover={{ rotate: 8, scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <feature.icon className="size-5" />
                    </motion.div>
                    <Badge variant="muted">{feature.tag}</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </CardContent>
                  <div className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,46,136,0.35),rgba(46,123,255,0.35),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
