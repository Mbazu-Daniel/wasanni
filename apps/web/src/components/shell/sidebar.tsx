import {
  IconLayoutDashboard,
  IconDeviceGamepad2,
  IconLayout,
  IconBroadcast,
  IconLink,
  IconKey,
  IconMedal,
  IconSwords,
  IconList,
  IconRobot,
  IconChartBar,
  IconSettings,
  IconUsers,
  IconPlug,
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";
import type { DashboardPath } from "./dashboard-paths";

type NavItem = {
  label: string;
  icon: typeof IconLayoutDashboard;
  to: DashboardPath;
  exact?: boolean;
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
      { label: "Builder", to: "/$orgSlug/builder", icon: IconRobot },
    ],
  },
  {
    label: "Distribute",
    items: [
      { label: "Platforms", to: "/$orgSlug/platforms", icon: IconBroadcast },
      { label: "Assignments", to: "/$orgSlug/assignments", icon: IconLink },
      { label: "API keys", to: "/$orgSlug/keys", icon: IconKey },
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
    label: "Admin",
    items: [
      { label: "Members", to: "/$orgSlug/members", icon: IconUsers },
      { label: "Providers", to: "/$orgSlug/providers", icon: IconPlug },
      { label: "Settings", to: "/$orgSlug/settings", icon: IconSettings, exact: true },
    ],
  },
];

export function AppSidebar() {
  const { orgSlug } = useParams({ from: "/$orgSlug" });
  const matchRoute = useMatchRoute();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative">
        <OrgSwitcher />
        <SidebarTrigger
          aria-label="Toggle sidebar"
          className="absolute top-1/2 -right-4 z-20 size-7! -translate-y-1/2 rounded-full border border-border bg-sidebar shadow-sm hover:bg-sidebar-accent"
        />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label ?? group.items[0].label}>
            {group.label !== null && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = Boolean(
                    matchRoute({
                      to: item.to,
                      params: { orgSlug },
                      fuzzy: item.exact ? false : true,
                    }),
                  );
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-3! group-data-[collapsible=icon]:[&_svg]:size-5"
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
