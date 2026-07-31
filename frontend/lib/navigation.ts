import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Users,
  Receipt,
  BarChart3,
  Layers,
  FileText,
  MessageSquare,
  Settings2,
  Building2,
  ShieldCheck,
  Image as ImageIcon,
  Key,
  type LucideIcon,
} from "lucide-react";

export interface NavChild {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  permission?: string;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavChild[];
  permission?: string;
}

export const getNavigation = (t: Record<string, string>): NavItem[] => [
  {
    label: t.dashboard,
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: t.inbox,
    href: "/inbox",
    icon: MessageSquare,
    permission: "cms.inbox",
  },
  {
    label: t.bookings || "Bookings",
    href: "/bookings",
    icon: CalendarDays,
    permission: "bookings.view",
  },
  {
    label: t.clients_directory,
    href: "/customers",
    icon: Users,
    permission: "customers.clients_directory",
  },
  {
    label: t.services,
    href: "/services",
    icon: Layers,
    permission: "cms.services",
  },
  {
    label: t.articles,
    href: "/articles",
    icon: FileText,
    permission: "cms.articles",
  },
  {
    label: t.comments,
    href: "/comments",
    icon: MessageSquare,
    permission: "cms.comments",
  },
  {
    label: t.settings,
    icon: Settings2,
    children: [
      {
        label: t.workspace,
        href: "/settings/general",
        icon: Building2,
        permission: "settings.workspace",
      },
      {
        label: t.team_roles,
        href: "/settings/team",
        icon: ShieldCheck,
        permission: "settings.team",
      },
      {
        label: t.media,
        href: "/settings/media",
        icon: ImageIcon,
        permission: "settings.media",
      },
      {
        label: t.api_keys,
        href: "/settings/apikeys",
        icon: Key,
        permission: "settings.api_key",
      },
    ],
  },
];
