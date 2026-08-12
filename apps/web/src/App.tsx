import { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/features/auth/AuthContext";
import { Toaster } from "@/components/ui/toast";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppShellLayout } from "@/layouts/AppShellLayout";
import { RequireAuth, RequireGuest, RequireRole } from "@/routes/guards";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const ProblemsListPage = lazy(() => import("@/pages/ProblemsListPage"));
const ProblemDetailPage = lazy(() => import("@/pages/ProblemDetailPage"));
const MinesListPage = lazy(() => import("@/pages/MinesListPage"));
const MineDetailPage = lazy(() => import("@/pages/MineDetailPage"));
const WasteListPage = lazy(() => import("@/pages/WasteListPage"));
const WasteDetailPage = lazy(() => import("@/pages/WasteDetailPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForbiddenPage = lazy(() => import("@/pages/ForbiddenPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminProblemsPage = lazy(() => import("@/pages/admin/AdminProblemsPage"));
const AdminProblemFormPage = lazy(() => import("@/pages/admin/AdminProblemFormPage"));
const AdminProblemProposalsPage = lazy(() => import("@/pages/admin/AdminProblemProposalsPage"));
const AdminProposalsPage = lazy(() => import("@/pages/admin/AdminProposalsPage"));
const AdminWastePage = lazy(() => import("@/pages/admin/AdminWastePage"));
const AdminWasteFormPage = lazy(() => import("@/pages/admin/AdminWasteFormPage"));

const UserDashboardPage = lazy(() => import("@/pages/user/UserDashboardPage"));
const UserProposalsPage = lazy(() => import("@/pages/user/UserProposalsPage"));

const ConnectionsPage = lazy(() => import("@/pages/ConnectionsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

const SuperAdminDashboardPage = lazy(() => import("@/pages/superadmin/SuperAdminDashboardPage"));
const SuperAdminUsersPage = lazy(() => import("@/pages/superadmin/SuperAdminUsersPage"));
const SuperAdminAdminsPage = lazy(() => import("@/pages/superadmin/SuperAdminAdminsPage"));
const SuperAdminProblemsPage = lazy(() => import("@/pages/superadmin/SuperAdminProblemsPage"));
const SuperAdminProposalsPage = lazy(() => import("@/pages/superadmin/SuperAdminProposalsPage"));
const SuperAdminMinesPage = lazy(() => import("@/pages/superadmin/SuperAdminMinesPage"));
const SuperAdminMineFormPage = lazy(() => import("@/pages/superadmin/SuperAdminMineFormPage"));
const SuperAdminWastePage = lazy(() => import("@/pages/superadmin/SuperAdminWastePage"));

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-center" />
            <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/problems" element={<ProblemsListPage />} />
                  <Route path="/problems/:problemId" element={<ProblemDetailPage />} />
                  <Route path="/mines" element={<MinesListPage />} />
                  <Route path="/mines/:mineId" element={<MineDetailPage />} />
                  <Route path="/waste" element={<WasteListPage />} />
                  <Route path="/waste/:wasteId" element={<WasteDetailPage />} />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path="*" element={<NotFoundPage />} />

                  <Route element={<RequireGuest />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>
                </Route>

                <Route element={<RequireAuth />}>
                  <Route element={<AppShellLayout />}>
                    <Route path="/app/profile" element={<ProfilePage />} />
                    <Route path="/app/connections" element={<ConnectionsPage />} />

                    <Route element={<RequireRole roles={["ADMIN"]} />}>
                      <Route path="/app/admin" element={<AdminDashboardPage />} />
                      <Route path="/app/admin/problems" element={<AdminProblemsPage />} />
                      <Route path="/app/admin/proposals" element={<AdminProposalsPage />} />
                      <Route path="/app/admin/problems/new" element={<AdminProblemFormPage />} />
                      <Route path="/app/admin/problems/:problemId/edit" element={<AdminProblemFormPage />} />
                      <Route path="/app/admin/problems/:problemId/proposals" element={<AdminProblemProposalsPage />} />
                      <Route path="/app/admin/waste" element={<AdminWastePage />} />
                      <Route path="/app/admin/waste/new" element={<AdminWasteFormPage />} />
                    </Route>

                    <Route element={<RequireRole roles={["USER"]} />}>
                      <Route path="/app/user" element={<UserDashboardPage />} />
                      <Route path="/app/problems" element={<ProblemsListPage />} />
                      <Route path="/app/problems/:problemId" element={<ProblemDetailPage />} />
                      <Route path="/app/user/proposals" element={<UserProposalsPage />} />
                    </Route>

                    <Route element={<RequireRole roles={["SUPERADMIN"]} />}>
                      <Route path="/superadmin" element={<SuperAdminDashboardPage />} />
                      <Route path="/superadmin/users" element={<SuperAdminUsersPage />} />
                      <Route path="/superadmin/admins" element={<SuperAdminAdminsPage />} />
                      <Route path="/superadmin/problems" element={<SuperAdminProblemsPage />} />
                      <Route path="/superadmin/proposals" element={<SuperAdminProposalsPage />} />
                      <Route path="/superadmin/mines" element={<SuperAdminMinesPage />} />
                      <Route path="/superadmin/mines/new" element={<SuperAdminMineFormPage />} />
                      <Route path="/superadmin/waste" element={<SuperAdminWastePage />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
