import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import OfferWalls from "./pages/OfferWalls";
import DailyBonus from "./pages/DailyBonus";
import Leaderboard from "./pages/Leaderboard";
import RewardsShop from "./pages/RewardsShop";
import Referrals from "./pages/Referrals";
import Achievements from "./pages/Achievements";
import PointsLedger from "./pages/PointsLedger";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import CategoryOffers from "./pages/CategoryOffers";
// Admin pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminRewards from "./pages/admin/AdminRewards";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import AdminAchievements from "./pages/admin/AdminAchievements";
import AdminProviders from "./pages/admin/AdminProviders";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBulkImport from "./pages/admin/AdminBulkImport";
import EarningsDashboard from "./pages/admin/EarningsDashboard";
import FraudManagement from "./pages/admin/FraudManagement";
import WebhookSimulator from "./pages/admin/WebhookSimulator";
import PostbackMonitoring from "./pages/admin/PostbackMonitoring";
import AdminTracking from "./pages/AdminTracking";
import AdminCategoryOrder from "./pages/AdminCategoryOrder";
import { NetworkPerformanceLeaderboard } from "./pages/admin/NetworkPerformanceLeaderboard";
import AffiliateNetworks from "./pages/admin/AffiliateNetworks";

import { PostbackAuditLogs } from "./pages/admin/PostbackAuditLogs";
import SignInPage from "./pages/auth/SignIn";
import SignUpPage from "./pages/auth/SignUp";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      {/* Clerk Auth - Use nested routing support */}
      <Route path="/auth/sign-in/:any*">
        <SignInPage />
      </Route>
      <Route path="/auth/sign-up/:any*">
        <SignUpPage />
      </Route>
      
      {/* Authenticated user pages */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/missions" component={Missions} />
      <Route path="/category/:category" component={CategoryOffers} />
      <Route path="/offer-walls" component={OfferWalls} />
      <Route path="/daily-bonus" component={DailyBonus} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/rewards" component={RewardsShop} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/ledger" component={PointsLedger} />
      <Route path="/profile" component={Profile} />
      <Route path="/notifications" component={Notifications} />
      {/* Admin panel */}
      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/tasks" component={AdminTasks} />
      <Route path="/admin/rewards" component={AdminRewards} />
      <Route path="/admin/redemptions" component={AdminRedemptions} />
      <Route path="/admin/achievements" component={AdminAchievements} />
      <Route path="/admin/providers" component={AdminProviders} />
      <Route path="/admin/broadcast" component={AdminBroadcast} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/admin/bulk-import" component={AdminBulkImport} />
        <Route path="/admin/earnings" component={EarningsDashboard} />
      <Route path="/admin/fraud" component={FraudManagement} />
      <Route path="/admin/webhook-simulator" component={WebhookSimulator} />
      <Route path="/admin/postback-monitoring" component={PostbackMonitoring} />
      <Route path="/admin/postback-audit-logs" component={PostbackAuditLogs} />
      <Route path="/admin/tracking" component={AdminTracking} />
      <Route path="/admin/category-order" component={AdminCategoryOrder} />
      <Route path="/admin/network-leaderboard" component={NetworkPerformanceLeaderboard} />
      <Route path="/admin/networks" component={AffiliateNetworks} />
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
