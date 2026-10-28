import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconCode, IconShieldCheck, IconWebhook } from "@tabler/icons-react";
import { Tabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/primitives/page-header";
import { ScoreHmacTool } from "@/components/developer/score-hmac";
import { ScoreRequestTool } from "@/components/developer/score-request";
import { WebhookVerifyTool } from "@/components/developer/webhook-verify";

const TABS = [
  {
    value: "score-hmac",
    label: (
      <>
        <IconShieldCheck className="size-3.5" />
        Score HMAC
      </>
    ),
  },
  {
    value: "webhook",
    label: (
      <>
        <IconWebhook className="size-3.5" />
        Webhook signature
      </>
    ),
  },
  {
    value: "request",
    label: (
      <>
        <IconCode className="size-3.5" />
        Score request
      </>
    ),
  },
];

export const Route = createFileRoute("/o/$orgSlug/developer/")({
  head: () => ({ meta: [{ title: "Developer · Wasanni" }] }),
  component: DeveloperPage,
});

function DeveloperPage() {
  const [tab, setTab] = React.useState("score-hmac");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Developer"
        description="Verify your integration without leaving the dashboard. The math runs in your browser — nothing here is sent to a server."
      />

      <Tabs value={tab} onValueChange={setTab} items={TABS} />

      <div className="mt-6">
        {tab === "score-hmac" && <ScoreHmacTool />}
        {tab === "webhook" && <WebhookVerifyTool />}
        {tab === "request" && <ScoreRequestTool />}
      </div>
    </div>
  );
}
