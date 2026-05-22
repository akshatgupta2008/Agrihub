import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useShallow } from "zustand/react/shallow";
import Navbar from "./components/Navbar";
import AgriSceneBackground from "./components/AgriSceneBackground";
import Home from "./pages/Home";
import ProviderPortal from "./pages/ProviderPortal";
import FarmerLogin from "./pages/FarmerLogin";
import FarmerRegister from "./pages/FarmerRegister";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerPlusDashboard from "./pages/FarmerPlusDashboard";
import AssistiveSupport from "./pages/AssistiveSupport";
import Feedback from "./pages/Feedback";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminDashboard from "./pages/AdminDashboard";
import ProviderLogin from "./pages/ProviderLogin";
import ProviderDashboard from "./pages/ProviderDashboard";
import Accessibility from "./pages/Accessibility";
import VoiceAssistant from "./components/VoiceAssistant";
import AgriChatbot from "./components/AgriChatbot";
import { Loader } from "lucide-react";

const dashboardPathFor = (user) => {
  if (!user?.role) return "/";
  if (user.role === "admin") return "/dashboard/admin";
  if (user.role === "doctor") return "/dashboard/provider";
  if (user.role === "patient") return user.patientType === "special" ? "/dashboard/farmer-plus" : "/dashboard/farmer";
  return "/";
};

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore(
    useShallow((s) => ({
      authUser: s.authUser,
      checkAuth: s.checkAuth,
      isCheckingAuth: s.isCheckingAuth,
    }))
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative overflow-x-hidden">
        <AgriSceneBackground />
        <div className="pointer-events-none fixed inset-0 z-[1] agri-overlay" />

        <div className="relative z-10 min-h-screen">
          <Toaster position="top-center" reverseOrder={false} />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/providers" element={<ProviderPortal />} />
              <Route path="/doctors" element={<Navigate to="/providers" replace />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/feedback" element={<Feedback />} />

              {/* Public auth pages (redirect if already logged in) */}
              <Route path="/farmer/login" element={!authUser ? <FarmerLogin /> : <Navigate to={dashboardPathFor(authUser)} />} />
              <Route path="/farmer/register" element={!authUser ? <FarmerRegister /> : <Navigate to={dashboardPathFor(authUser)} />} />

              <Route path="/admin/login" element={!authUser ? <AdminLogin /> : <Navigate to={dashboardPathFor(authUser)} />} />
              <Route path="/admin/register" element={!authUser ? <AdminRegister /> : <Navigate to={dashboardPathFor(authUser)} />} />

              <Route path="/provider/login" element={!authUser ? <ProviderLogin /> : <Navigate to={dashboardPathFor(authUser)} />} />

              {/* Farmer dashboards (internally still patient role) */}
              <Route
                path="/dashboard/farmer"
                element={
                  authUser?.role === "patient" ? (
                    authUser.patientType === "general" ? <FarmerDashboard /> : <Navigate to="/dashboard/farmer-plus" />
                  ) : (
                    <Navigate to="/farmer/login" />
                  )
                }
              />
              <Route
                path="/dashboard/farmer-plus"
                element={
                  authUser?.role === "patient" ? (
                    authUser.patientType === "special" ? <FarmerPlusDashboard /> : <Navigate to="/dashboard/farmer" />
                  ) : (
                    <Navigate to="/farmer/login" />
                  )
                }
              />

              <Route
                path="/dashboard/farmer-plus/assistive-support"
                element={
                  authUser?.role === "patient" ? (
                    authUser.patientType === "special" ? <AssistiveSupport /> : <Navigate to="/dashboard/farmer" />
                  ) : (
                    <Navigate to="/farmer/login" />
                  )
                }
              />

              {/* Admin dashboard */}
              <Route
                path="/dashboard/admin"
                element={authUser?.role === "admin" ? <AdminDashboard /> : <Navigate to="/admin/login" />}
              />

              {/* Provider dashboard (internally still doctor role) */}
              <Route
                path="/dashboard/provider"
                element={authUser?.role === "doctor" ? <ProviderDashboard /> : <Navigate to="/provider/login" />}
              />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <VoiceAssistant />
          {authUser?.role === "patient" && <AgriChatbot />}
        </div>
      </div>
    </Router>
  );
}

export default App;
