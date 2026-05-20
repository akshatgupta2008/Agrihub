import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, KeyRound, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    password: "",
    registerToken: "",
  });

  const { adminSignup, isSigningUp } = useAuthStore();
  const navigate = useNavigate();

  const onChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      hospitalName: formData.organizationName,
      email: formData.email,
      password: formData.password,
      registerToken: formData.registerToken,
    };
    const user = await adminSignup(payload);
    if (user) navigate("/dashboard/admin");
  };

  return (
    <div className="container py-12 flex justify-center">
      <div className="card w-full max-w-lg p-8">
        <h2 className="mb-2 text-center text-primary">Platform Admin Register</h2>
        <p className="text-muted text-center mb-8">Create an AgriHub operations account</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Building2 size={16} /> Organization Name
            </label>
            <input name="organizationName" className="form-input" value={formData.organizationName} onChange={onChange} required />
          </div>

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
            <input name="password" type="password" className="form-input" value={formData.password} onChange={onChange} minLength={6} required />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <KeyRound size={16} /> Register Token (if required)
            </label>
            <input name="registerToken" className="form-input" value={formData.registerToken} onChange={onChange} placeholder="Optional" />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSigningUp}>
            {isSigningUp ? "Creating..." : (
              <span className="flex items-center justify-center gap-2"><UserPlus size={18} /> Register</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-muted">
          Already have an admin account? <Link to="/admin/login" className="text-primary font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
