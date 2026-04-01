import { useState, useEffect, useRef, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Sword, Package, Zap, Trophy, TrendingUp, Building2,
  Home, FileText, Scale, ClipboardList, Hammer, Upload, ScrollText, Users,
  Bell, Search, ArrowLeft, Radio, AlertTriangle, AlertCircle, FileEdit, Loader2, X, Map,
} from "lucide-react";
import {
  listEntities, fetchNotifications, setAdminToken, getAdminToken, clearAdminToken,
  type EntityType, type AdminNotification,
} from "../../lib/admin-api";
import { useVersion } from "../../hooks/useVersion";

interface SearchableEntity {
  id: string;
  name: string;
  entityType: EntityType;
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  items: "Item", creatures: "Creature", modifiers: "Modifier",
  skills: "Skill", "loot-tables": "Loot Table", factions: "Faction",
  rooms: "Room", narrative: "Narrative",
};

const SEARCHABLE_ENTITY_TYPES: EntityType[] = [
  "items", "creatures", "modifiers", "skills",
  "loot-tables", "factions", "rooms", "narrative",
];

const DISMISSED_KEY = "admin_dismissed_notifications";

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
      { path: "/admin/modifiers", icon: Zap, label: "Modifiers" },
      { path: "/admin/loot-tables", icon: Trophy, label: "Loot Tables" },
      { path: "/admin/skills", icon: TrendingUp, label: "Skills" },
      { path: "/admin/factions", icon: Building2, label: "Factions" },
      { path: "/admin/rooms", icon: Home, label: "Rooms" },
      { path: "/admin/zones", icon: Map, label: "Zones" },
      { path: "/admin/narrative", icon: FileText, label: "Narrative" },
      { path: "/admin/balance", icon: Scale, label: "Balance" },
      { path: "/admin/contracts", icon: ClipboardList, label: "Contracts" },
      { path: "/admin/recipes", icon: Hammer, label: "Recipes" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/admin/live-rooms", icon: Radio, label: "Live Rooms" },
      { path: "/admin/deploy", icon: Upload, label: "Deploy" },
      { path: "/admin/audit", icon: ScrollText, label: "Audit Log" },
      { path: "/admin/users", icon: Users, label: "Users" },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const version = useVersion();

  const [authenticated, setAuthenticated] = useState(() => !!getAdminToken());
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [allEntities, setAllEntities] = useState<SearchableEntity[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    async function loadEntities() {
      setSearchLoading(true);
      const results: SearchableEntity[] = [];
      await Promise.all(SEARCHABLE_ENTITY_TYPES.map(async (entityType) => {
        try {
          const entities = await listEntities<{ id: string; name?: string }>(entityType);
          for (const e of entities) results.push({ id: e.id, name: e.name || e.id, entityType });
        } catch { /* entity type may be empty */ }
      }));
      if (!cancelled) { setAllEntities(results); setSearchLoading(false); }
    }
    loadEntities();
    return () => { cancelled = true; };
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    async function loadNotifications() {
      setNotifLoading(true);
      try {
        const notifs = await fetchNotifications();
        if (!cancelled) setNotifications(notifs);
      } catch { /* bell shows 0 */ }
      finally { if (!cancelled) setNotifLoading(false); }
    }
    loadNotifications();
    return () => { cancelled = true; };
  }, [authenticated]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchResults = searchQuery.trim().length > 0
    ? allEntities.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  const activeNotifications = notifications.filter((n) => !dismissed.has(n.id));
  const notifCount = activeNotifications.length;

  const dismissNotification = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleSearchSelect = useCallback((result: SearchableEntity) => {
    setSearchQuery(""); setSearchOpen(false);
    navigate(`/admin/${result.entityType}/${result.id}`);
  }, [navigate]);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getNotifIcon = (type: AdminNotification["type"]) => {
    switch (type) {
      case "error": return <AlertCircle className="w-4 h-4 text-[#8B2500]" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-[#B8860B]" />;
      case "change": return <FileEdit className="w-4 h-4 text-[#3A7D7B]" />;
    }
  };

  const handleAdminLogin = async () => {
    if (!tokenInput.trim()) { setAuthError("Token is required"); return; }
    setAdminToken(tokenInput.trim());
    try {
      await fetchNotifications();
      setAuthenticated(true);
      setAuthError("");
    } catch {
      clearAdminToken();
      setAuthError("Invalid token — check your server's ADMIN_TOKEN env var");
    }
  };

  if (!authenticated) {
    return (
      <div className="h-screen bg-[#0A0B0F] flex items-center justify-center">
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 w-full max-w-sm">
          <h1 className="text-[#C9A84C] text-xl mb-2">
            ⚙ Ellmud Admin
          </h1>
          <p className="text-[#8A8B95] text-sm mb-6">Enter admin token to continue.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleAdminLogin(); }}>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setAuthError(""); }}
              placeholder="Admin Token"
              autoFocus
              className="w-full px-3 py-2 bg-[#1A1B25] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#555] text-sm mb-3 focus:outline-none focus:border-[#C9A84C]"
            />
            {authError && <p className="text-[#8B2500] text-xs mb-3">{authError}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#C9A84C] text-[#0A0B0F] rounded text-sm font-medium hover:bg-[#D4B85C] transition-colors"
            >
              Authenticate
            </button>
          </form>
          <Link to="/refuge" className="block text-center text-[#8A8B95] hover:text-[#C9A84C] text-xs mt-4 transition-colors">
            ← Back to game
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0A0B0F] flex flex-col">
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/refuge" className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors flex items-center gap-2" title="Back to Game">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-[#C9A84C] text-lg">⚙ Ellmud Content Admin</h1>
          <span className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded" style={{ fontFamily: "var(--font-sans)" }}>STAGING</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
            <input
              type="text"
              placeholder={searchLoading ? "Loading content..." : "Search content..."}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
              className="pl-10 pr-4 py-2 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#C9A84C] focus:outline-none w-64"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
            />
            {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55] animate-spin" />}

            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full mt-1 left-0 w-80 bg-[#12131A] border border-[#2A2B35] rounded-lg shadow-xl z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>No results for &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <ul>
                    {searchResults.map((result) => (
                      <li key={`${result.entityType}-${result.id}`}>
                        <button onClick={() => handleSearchSelect(result)} className="w-full text-left px-4 py-2.5 hover:bg-[#1C1D27] transition-colors flex items-center justify-between">
                          <span className="text-[#E8E0D0] text-sm truncate" style={{ fontFamily: "var(--font-sans)" }}>{result.name}</span>
                          <span className="text-[#4A4B55] text-xs ml-2 flex-shrink-0" style={{ fontFamily: "var(--font-sans)" }}>{ENTITY_TYPE_LABELS[result.entityType]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative text-[#8A8B95] hover:text-[#C9A84C] transition-colors">
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#8B2500] text-[#E8E0D0] text-[10px] font-bold rounded-full px-1" style={{ fontFamily: "var(--font-sans)" }}>
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute top-full mt-2 right-0 w-96 bg-[#12131A] border border-[#2A2B35] rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2A2B35] flex items-center justify-between">
                  <h3 className="text-[#E8E0D0] text-sm font-semibold" style={{ fontFamily: "var(--font-sans)" }}>Notifications</h3>
                  {notifCount > 0 && <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>{notifCount} unread</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-6 text-center"><Loader2 className="w-5 h-5 text-[#4A4B55] animate-spin mx-auto" /></div>
                  ) : activeNotifications.length === 0 ? (
                    <div className="p-6 text-center"><p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>All caught up — no notifications</p></div>
                  ) : (
                    <ul>
                      {activeNotifications.map((notif) => (
                        <li key={notif.id} className="px-4 py-3 border-b border-[#2A2B35] last:border-b-0 hover:bg-[#1C1D27] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                            <div className="flex-1 min-w-0">
                              {notif.entityType && notif.entityId ? (
                                <Link to={`/admin/${notif.entityType}/${notif.entityId}`} onClick={() => setNotifOpen(false)}
                                  className="text-[#E8E0D0] text-sm font-medium hover:text-[#C9A84C] transition-colors block truncate" style={{ fontFamily: "var(--font-sans)" }}>
                                  {notif.title}
                                </Link>
                              ) : (
                                <p className="text-[#E8E0D0] text-sm font-medium truncate" style={{ fontFamily: "var(--font-sans)" }}>{notif.title}</p>
                              )}
                              <p className="text-[#8A8B95] text-xs mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>{notif.message}</p>
                            </div>
                            <button onClick={() => dismissNotification(notif.id)} className="text-[#4A4B55] hover:text-[#8A8B95] transition-colors flex-shrink-0" title="Dismiss">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <span
            className="text-[#6A6555] text-xs cursor-default select-none"
            style={{ fontFamily: "var(--font-sans)" }}
            title={`Built: ${version.buildTime}`}
            aria-label={`Version ${version.version}, built ${version.buildTime}`}
            tabIndex={0}
          >
            v{version.version}
          </span>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0B0F] font-bold">J</div>
            <div>
              <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>Jane Doe</p>
              <p className="text-[#4A4B55] text-xs" style={{ fontFamily: "var(--font-sans)" }}>Lead Designer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 bg-[#12131A] border-r border-[#2A2B35] overflow-y-auto">
          <nav className="p-4 space-y-6">
            {navSections.map((section, i) => (
              <div key={i}>
                {section.label && (
                  <h3 className="text-[#4A4B55] text-xs uppercase tracking-wider mb-2 px-2" style={{ fontFamily: "var(--font-sans)" }}>{section.label}</h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path, 'exact' in item ? item.exact : undefined);
                    return (
                      <Link key={item.path} to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${active ? "bg-[#1C1D27] text-[#C9A84C]" : "text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0]"}`}
                        style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}>
                        <Icon className="w-4 h-4" /><span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0A0B0F]"><Outlet /></div>
      </div>
    </div>
  );
}