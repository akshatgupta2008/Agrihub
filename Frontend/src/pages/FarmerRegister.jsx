import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Fingerprint, Accessibility, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const FarmerRegister = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    idNumber: '',
  });
  
  const { patientSignup, isSigningUp } = useAuthStore();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      patientType: activeTab,
      [activeTab === 'general' ? 'aadhaarNumber' : 'disabilityId']: formData.idNumber,
    };

    const user = await patientSignup(payload);
    if (user) {
      navigate(user.patientType === "general" ? "/dashboard/farmer" : "/dashboard/farmer-plus");
    }
  };

  return (
    <div className="container py-12 flex justify-center">
      <div className="card w-full max-w-lg p-8">
        <h2 className="mb-2 text-center text-primary">Join AgriHub</h2>
        <p className="text-muted text-center mb-8">Create your farmer or user account for local services</p>

        <div className="flex mb-8 gap-4 justify-center border-b pb-4">
          <button 
            type="button"
            className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('general')}
          >
            <Fingerprint size={18} className="mr-2" /> Farmer
          </button>
          <button 
            type="button"
            className={`btn ${activeTab === 'special' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('special')}
          >
            <Accessibility size={18} className="mr-2" /> Assisted Access
          </button>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <User size={16} /> Full Name
            </label>
            <input 
              name="fullName"
              type="text" 
              className="form-input" 
              placeholder="John Doe" 
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Mail size={16} /> Email Address
            </label>
            <input 
              name="email"
              type="email" 
              className="form-input" 
              placeholder="john@example.com" 
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
              onChange={handleInputChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {activeTab === 'general' ? 'Farmer ID / Aadhaar' : 'Village / Support ID'}
            </label>
            <input 
              name="idNumber"
              type="text" 
              className="form-input" 
              placeholder={activeTab === 'general' ? 'XXXX-XXXX-XXXX' : 'SUPPORT-XXXXX'} 
              onChange={handleInputChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSigningUp}>
            {isSigningUp ? "Creating Account..." : <span className="flex items-center justify-center gap-2"><UserPlus size={18} /> Register</span>}
          </button>
        </form>

        <p className="mt-6 text-center text-muted">
          Already have an account? <Link to="/farmer/login" className="text-primary font-medium">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default FarmerRegister;
