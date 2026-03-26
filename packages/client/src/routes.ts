import { createBrowserRouter, type RouteObject } from "react-router";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import CharacterSelect from "./pages/CharacterSelect";
import Refuge from "./pages/Refuge";
import ShardExploration from "./pages/ShardExploration";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorFallback } from "./components/ErrorFallback";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import CreaturesList from "./pages/admin/CreaturesList";
import CreatureDetail from "./pages/admin/CreatureDetail";
import ItemsList from "./pages/admin/ItemsList";
import ItemsDetail from "./pages/admin/ItemsDetail";
import BiomesList from "./pages/admin/BiomesList";
import BiomesDetail from "./pages/admin/BiomesDetail";
import ModifiersList from "./pages/admin/ModifiersList";
import ModifiersDetail from "./pages/admin/ModifiersDetail";
import LootTablesList from "./pages/admin/LootTablesList";
import LootTablesDetail from "./pages/admin/LootTablesDetail";
import SkillsList from "./pages/admin/SkillsList";
import SkillsDetail from "./pages/admin/SkillsDetail";
import FactionsList from "./pages/admin/FactionsList";
import FactionsDetail from "./pages/admin/FactionsDetail";
import RoomsList from "./pages/admin/RoomsList";
import RoomsDetail from "./pages/admin/RoomsDetail";
import LiveRooms from "./pages/admin/LiveRooms";
import LiveRoomDetail from "./pages/admin/LiveRoomDetail";
import ZonesList from "./pages/admin/ZonesList";
import ZonesDetail from "./pages/admin/ZonesDetail";
import NarrativeList from "./pages/admin/NarrativeList";
import NarrativeDetail from "./pages/admin/NarrativeDetail";
import Balance from "./pages/admin/Balance";
import ContractsList from "./pages/admin/ContractsList";
import RecipesList from "./pages/admin/RecipesList";
import Deploy from "./pages/admin/Deploy";
import AuditLog from "./pages/admin/AuditLog";
import UsersList from "./pages/admin/UsersList";

/** Exported for testing with createMemoryRouter. */
export const routes: RouteObject[] = [
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/auth/callback",
    Component: AuthCallback,
  },
  {
    Component: ProtectedRoute,
    ErrorBoundary: ErrorFallback,
    children: [
      {
        path: "/characters",
        Component: CharacterSelect,
      },
      {
        path: "/refuge",
        Component: Refuge,
      },
      {
        path: "/shard/:shardId",
        Component: ShardExploration,
      },
      {
        path: "/leaderboard",
        Component: Leaderboard,
      },
      {
        path: "/settings",
        Component: Settings,
      },
    ],
  },
  {
    Component: ProtectedRoute,
    ErrorBoundary: ErrorFallback,
    children: [
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          {
            index: true,
            Component: Dashboard,
          },
          {
            path: "creatures",
            Component: CreaturesList,
          },
          {
            path: "creatures/:id",
            Component: CreatureDetail,
          },
          {
            path: "items",
            Component: ItemsList,
          },
          {
            path: "items/:id",
            Component: ItemsDetail,
          },
          {
            path: "biomes",
            Component: BiomesList,
          },
          {
            path: "biomes/:id",
            Component: BiomesDetail,
          },
          {
            path: "modifiers",
            Component: ModifiersList,
          },
          {
            path: "modifiers/:id",
            Component: ModifiersDetail,
          },
          {
            path: "loot-tables",
            Component: LootTablesList,
          },
          {
            path: "loot-tables/:id",
            Component: LootTablesDetail,
          },
          {
            path: "skills",
            Component: SkillsList,
          },
          {
            path: "skills/:id",
            Component: SkillsDetail,
          },
          {
            path: "factions",
            Component: FactionsList,
          },
          {
            path: "factions/:id",
            Component: FactionsDetail,
          },
          {
            path: "rooms",
            Component: RoomsList,
          },
          {
            path: "rooms/:id",
            Component: RoomsDetail,
          },
          {
            path: "zones",
            Component: ZonesList,
          },
          {
            path: "zones/:slug",
            Component: ZonesDetail,
          },
          {
            path: "live-rooms",
            Component: LiveRooms,
          },
          {
            path: "live-rooms/:roomId",
            Component: LiveRoomDetail,
          },
          {
            path: "narrative",
            Component: NarrativeList,
          },
          {
            path: "narrative/:id",
            Component: NarrativeDetail,
          },
          {
            path: "balance",
            Component: Balance,
          },
          {
            path: "contracts",
            Component: ContractsList,
          },
          {
            path: "recipes",
            Component: RecipesList,
          },
          {
            path: "deploy",
            Component: Deploy,
          },
          {
            path: "audit",
            Component: AuditLog,
          },
          {
            path: "users",
            Component: UsersList,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
