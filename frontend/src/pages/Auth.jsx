import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scale, Loader2, AlertCircle } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Researcher'
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!isLogin && !formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Email format is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (validate()) {
      try {
        if (isLogin) {
          await login(formData.email, formData.password);
        } else {
          await signup(formData.name, formData.email, formData.password, formData.role);
        }
        navigate('/dashboard');
      } catch (err) {
        setErrors({ form: err.message });
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans w-full absolute top-0 left-0 z-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-14 h-14 bg-primary-blue rounded-xl flex items-center justify-center mb-5 shadow-sm">
          <Scale size={28} className="text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {isLogin ? 'Sign in to DocSummarizer' : 'Create an account'}
        </h2>
        <p className="mt-3 text-center text-sm text-slate-600 font-medium">
          {isLogin ? 'New to the platform? ' : 'Already have an account? '}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrors({}); }} 
            className="font-semibold text-primary-blue hover:text-blue-700 transition-colors"
          >
            {isLogin ? 'Create an account' : 'Sign in here'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200/60">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errors.form && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-600 font-medium animate-pulse">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {errors.form}
              </div>
            )}
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="mt-1">
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3.5 py-2.5 border ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:border-primary-blue focus:ring-blue-100 bg-white'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none sm:text-sm transition-colors`}
                    placeholder="Jane Doe"
                  />
                  {errors.name && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.name}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <div className="mt-1">
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3.5 py-2.5 border ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:border-primary-blue focus:ring-blue-100 bg-white'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-4 sm:text-sm transition-colors`}
                  placeholder="name@firm.com"
                />
                {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mt-4 mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                {isLogin && <a href="#" className="font-semibold text-primary-blue hover:text-blue-700 text-xs">Forgot Password?</a>}
              </div>
              <div className="mt-1">
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3.5 py-2.5 border ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50' : 'border-slate-300 focus:border-primary-blue focus:ring-blue-100 bg-white'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-4 sm:text-sm transition-colors`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.password}</p>}
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 mt-4">Your Role</label>
                <div className="mt-1 relative">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="appearance-none block w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-primary-blue sm:text-sm transition-colors bg-white font-medium text-slate-700"
                  >
                    <option value="Researcher">Researcher</option>
                    <option value="Student">Student</option>
                    <option value="Professional">Professional</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-blue hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'Sign in' : 'Create Account')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
