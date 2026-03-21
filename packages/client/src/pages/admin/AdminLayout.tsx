import { Link, Outlet, useLocation } from "react-router";
import {
  LayoutDashboard,
  Sword,
  Package,
  Mountain,
  Zap,
  Trophy,
  TrendingUp,
  Building2,
  Home,
  FileText,
  Scale,
  ClipboardList,
  Hammer,
  Upload,
  ScrollText,
  Users,
  Bell,
  Search,
  ArrowLeft,
} from "lucide-react";

const navSections = [
  {
    items: [
      { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true as const },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/admin/creatures", icon: Sword, label: "Creatures" },
      { path: "/admin/items", icon: Package, label: "Items" },
      { path: "/admin/biomes", icon: Mountain, label: "Biomes" },
      { path: "/admin/modifiers", icon: Zap, label: "Modifiers" },
      { path: "/admin/loot-tables", icon: Trophy, label: "Loot Tables" },
      { path: "/admin/skills", icon: TrendingUp, label: "Skills" },
      { path: "/admin/factions", icon: Building2, label: "Factions" },
      { path: "/admin/rooms", icon: Home, label: "Rooms" },
      { path: "/admin/narrative", icon: FileText, label: "Narrative" },
      { path: "/admin/balance", icon: Scale, label: "Balance" },
      { path: "/admin/contracts", icon: ClipboardList, label: "Contracts" },
      { path: "/admin/recipes", icon: Hammer, label: "Recipes" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/admin/deploy", icon: Upload, label: "Deploy" },
      { path: "/admin/audit", icon: ScrollText, label: "Audit Log" },
      { path: "/admin/users", icon: Users, label: "Users" },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-[#0A0B0F] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/refuge"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors flex items-center gap-2"
            title="Back to Game"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1
            className="text-[#C9A84C] text-lg"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            ⚙ Ellmud Content Admin
          </h1>
          <span
            className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            STAGING
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
            <input
              type="text"
              placeholder="Search content..."
              className="pl-10 pr-4 py-2 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#C9A84C] focus:outline-none w-64"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
            />
          </div>
          <button className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0B0F] font-bold">
              J
            </div>
            <div>
              <p
                className="text-[#E8E0D0] text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Jane Doe
              </p>
              <p
                className="text-[#4A4B55] text-xs"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Lead Designer
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-[#12131A] border-r border-[#2A2B35] overflow-y-auto">
          <nav className="p-4 space-y-6">
            {navSections.map((section, i) => (
              <div key={i}>
                {section.label && (
                  <h3
                    className="text-[#4A4B55] text-xs uppercase tracking-wider mb-2 px-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {section.label}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path, 'exact' in item ? item.exact : undefined);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                          active
                            ? "bg-[#1C1D27] text-[#C9A84C]"
                            : "text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0]"
                        }`}
                        style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#0A0B0F]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}