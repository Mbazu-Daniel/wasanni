import {
  IconBrandUnity,
  IconBrandHtml5,
  IconBrandJavascript,
  IconBrandPython,
  IconBox,
  IconDeviceGamepad,
} from "@tabler/icons-react";
import { Marquee } from "@/components/motion-kit";
import { Badge } from "@/components/ui/badge";

const engines = [
  { name: "Godot 4", icon: IconBox },
  { name: "Unity WebGL", icon: IconBrandUnity },
  { name: "HTML5", icon: IconBrandHtml5 },
  { name: "Construct 3", icon: IconDeviceGamepad },
  { name: "Pygame · pygbag", icon: IconBrandPython },
  { name: "Bare WebAssembly", icon: IconBrandJavascript },
];

export function Engines() {
  return (
    <section className="relative border-y border-border py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Badge variant="muted">Engine-agnostic by design</Badge>
          <p className="text-xs text-muted-foreground">
            One integration. Every engine that exports to the web.
          </p>
        </div>
        <Marquee className="mt-7" speed="slow">
          {engines.map((engine) => (
            <div
              key={engine.name}
              className="flex items-center gap-2.5 rounded-full border border-border bg-white/[0.02] px-5 py-2.5"
            >
              <engine.icon className="size-4 text-blue-soft" />
              <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
                {engine.name}
              </span>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
