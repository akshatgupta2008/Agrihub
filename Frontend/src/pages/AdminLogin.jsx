import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { adminLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  const onChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const user = await adminLogin(formData);
    if (user) navigate("/dashboard/admin");
  };

  return (
    <div className="container py-16 flex justify-center">
      <div className="card w-full max-w-lg p-8">
        <h2 className="mb-2 text-center text-primary">Platform Admin Login</h2>
        <p className="text-muted text-center mb-8">Manage users, service providers, and AgriHub operations</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Mail size={16} /> Email
            </label>
            <input name="email" type="email" className="form-input" value={formData.email} onChange={onChange} required />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input name="password" type="password" className="form-input" value={formData.password} onChange={onChange} required />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isLoggingIn}>
            {isLoggingIn ? "Logging in..." : (
              <span className="flex items-center justify-center gap-2"><LogIn size={18} /> Login</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-muted">
          Need an admin account? <Link to="/admin/register" className="text-primary font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
