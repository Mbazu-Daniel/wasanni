import {
  IconLayoutDashboard,
  IconDeviceGamepad2,
  IconLayout,
  IconBroadcast,
  IconLink,
  IconKey,
  IconWebhook,
  IconMedal,
  IconSwords,
  IconList,
  IconRobot,
  IconChartBar,
  IconSettings,
} from "@tabler/icons-react";
import { Link, useMatchRoute, useParams } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";
import type { DashboardPath } from "./dashboard-paths";

type NavItem = {
  label: string;
  icon: typeof IconLayoutDashboard;
  to: DashboardPath;
};

const groups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ label: "Overview", to: "/$orgSlug/overview", icon: IconLayoutDashboard }],
  },
  {
    label: "Build",
    items: [
      { label: "Games", to: "/$orgSlug/games", icon: IconDeviceGamepad2 },
      { label: "Templates", to: "/$orgSlug/templates", icon: IconLayout },
      { label: "Builder", to: "/$orgSlug/agents", icon: IconRobot },
    ],
  },
  {
    label: "Distribute",
    items: [
      { label: "Platforms", to: "/$orgSlug/platforms", icon: IconBroadcast },
      { label: "Assignments", to: "/$orgSlug/assignments", icon: IconLink },
      { label: "API keys", to: "/$orgSlug/keys", icon: IconKey },
      { label: "Webhooks", to: "/$orgSlug/webhooks", icon: IconWebhook },
    ],
  },
  {
    label: "Compete",
    items: [
      { label: "Tournaments", to: "/$orgSlug/tournaments", icon: IconMedal },
      { label: "Matches", to: "/$orgSlug/matches", icon: IconSwords },
    ],
  },
  {
    label: "Observe",
    items: [
      { label: "Audit", to: "/$orgSlug/audit", icon: IconList },
      { label: "Usage", to: "/$orgSlug/usage", icon: IconChartBar },
    ],
  },
  {
    label: null,
    items: [{ label: "Settings", to: "/$orgSlug/settings", icon: IconSettings }],
  },
];

export function AppSidebar() {
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const matchRoute = useMatchRoute();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label ?? group.items[0].label}>
            {group.label !== null && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = Boolean(
                    matchRoute({ to: item.to, params: { orgSlug }, fuzzy: true }),
                  );
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link to={item.to} params={{ orgSlug }} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
