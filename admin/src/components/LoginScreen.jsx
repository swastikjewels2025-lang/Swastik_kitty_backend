import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginScreen = () => {
  const [formData, setFormData] = useState({
    identifier: 'admin',
    password: 'admin123'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { loginWithCredentials } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithCredentials(formData.identifier, formData.password);
    } catch (err) {
      setError(err.message || 'Invalid administrative credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-green-900 to-green-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Swastik CRM Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <img
              src="/swastiklogo.svg"
              alt="Swastik Logo"
              className="w-36 h-14 object-contain"
            />
          </div>
          <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold mt-1">
            Gold Kitty & Scheme Management
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Login
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} onKeyDown={handleKeyPress} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.identifier || !formData.password}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-green-900 font-semibold py-3 rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 mt-2 shadow-lg"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-green-200/70">
                Default Credentials: <span className="text-yellow-400 font-mono">admin</span> / <span className="text-yellow-400 font-mono">admin123</span>
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};
