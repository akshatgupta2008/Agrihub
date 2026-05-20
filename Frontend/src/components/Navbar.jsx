import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useShallow } from "zustand/react/shallow";

const dashboardPathFor = (user) => {
  if (!user?.role) return "/";
  if (user.role === "admin") return "/dashboard/admin";
  if (user.role === "doctor") return "/dashboard/provider";
  if (user.role === "patient") return user.patientType === "special" ? "/dashboard/farmer-plus" : "/dashboard/farmer";
  return "/";
};

const roleLabelFor = (user) => {
  if (!user?.role) return "User";
  if (user.role === "patient") return "Farmer / User";
  if (user.role === "doctor") return "Service Provider";
  if (user.role === "admin") return "Platform Admin";
  return "User";
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, logout } = useAuthStore(useShallow((s) => ({ authUser: s.authUser, logout: s.logout })));
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  const activeLoginSection = (() => {
    const p = location.pathname;
    if (p.startsWith("/farmer/")) return "user";
    if (p.startsWith("/admin/")) return "admin";
    if (p.startsWith("/provider/")) return "provider";
    return null;
  })();

  const loginBtnClass = (isSelected) =>
    isSelected
      ? "px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all"
      : "px-4 py-2 rounded-full border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all";

  const onLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Hide navbar on dashboard routes
  if (location.pathname.startsWith("/dashboard")) {
    return null;
  }

  const navLinks = (
    <div className="nav-links flex items-center gap-6">
      <Link to="/" className={isActive("/")}>Home</Link>
      <Link to="/providers" className={isActive("/providers")}>Machines & Providers</Link>
      <Link to="/accessibility" className={isActive("/accessibility")}>Support Tools</Link>
    </div>
  );

  const userInitial = authUser?.fullName?.charAt(0)?.toUpperCase() || "U";
  const userRoleLabel = roleLabelFor(authUser);

  const userMenu = (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold">
          {userInitial}
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-800 truncate">{authUser?.fullName}</p>
            <p className="text-xs text-slate-500">{userRoleLabel}</p>
          </div>
          <Link
            to={dashboardPathFor(authUser)}
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            <Activity size={14} /> Dashboard
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );

  const authSection = !authUser ? (
    <div className="flex items-center gap-2">
      <Link to="/farmer/login" className={loginBtnClass(activeLoginSection === "user")}>Farmer Login</Link>
      <Link to="/provider/login" className={loginBtnClass(activeLoginSection === "provider")}>Service Provider Login</Link>
      <Link to="/admin/login" className={loginBtnClass(activeLoginSection === "admin")}>Platform Admin</Link>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      {userMenu}
    </div>
  );

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">AgriHub</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center justify-between flex-1 ml-10">
          {navLinks}
          <div className="ml-auto">{authSection}</div>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-slate-600 hover:text-teal-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 px-6 py-4 space-y-3">
          {navLinks}
          <div className="pt-3 border-t border-slate-100">
            {authSection}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
