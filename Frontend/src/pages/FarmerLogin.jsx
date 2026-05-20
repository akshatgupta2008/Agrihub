import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fingerprint, Accessibility, CheckCircle2, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const FarmerLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const { patientLogin, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const user = await patientLogin(formData);
    if (user) {
      navigate(user.patientType === "general" ? "/dashboard/farmer" : "/dashboard/farmer-plus");
    }
  };

  return (
    <div className="container py-16 flex justify-center">
      <div className="card w-full max-w-lg p-8">
        <h2 className="mb-2 text-center text-primary">Farmer / User Login</h2>
        <p className="text-muted text-center mb-8">Access your AgriHub dashboard and bookings</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Mail size={16} /> Email Address
            </label>
            <input 
              name="email"
              type="email" 
              className="form-input" 
              placeholder="john@example.com" 
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input 
              name="password"
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isLoggingIn}>
            {isLoggingIn ? (
              <span className="flex items-center justify-center gap-2">Logging in...</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Verify and Secure Login</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-muted">
          New to AgriHub? <Link to="/farmer/register" className="text-primary font-medium">Create a farmer account</Link>
        </p>

        <div className="mt-8 flex gap-4 justify-center border-t py-6 grayscale opacity-60">
          <div className="flex flex-col items-center gap-1">
            <Fingerprint size={24} />
            <span style={{ fontSize: '0.75rem' }}>Secure Auth</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Accessibility size={24} />
            <span style={{ fontSize: '0.75rem' }}>Inclusive Design</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerLogin;
