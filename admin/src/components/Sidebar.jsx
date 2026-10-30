import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Coins, 
  FileText, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  Users, 
  ShoppingBag, 
  Trophy, 
  Bell, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const Sidebar = ({ activeTab, setActiveTab, pendingKycCount = 0, pendingPickupsCount = 0 }) => {
  const { adminUser, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
    { id: 'rates', title: 'Daily Gold Rates', icon: Coins },
    { id: 'schemes', title: '11+1 Schemes & Slots', icon: FileText },
    { 
      id: 'kyc', 
      title: 'KYC Compliance', 
      icon: ShieldCheck, 
      badge: pendingKycCount > 0 ? pendingKycCount : null 
    },
    { id: 'payments', title: 'Ledger & Payments', icon: CreditCard },
    { 
      id: 'pickups', 
      title: 'Doorstep Pickups', 
      icon: Truck, 
      badge: pendingPickupsCount > 0 ? pendingPickupsCount : null 
    },
    { id: 'users', title: 'Patrons Directory', icon: Users },
    { id: 'bookings', title: 'Bullion Coin Orders', icon: ShoppingBag },
    { id: 'draw', title: 'Monthly Lucky Draw', icon: Trophy },
    { id: 'broadcast', title: 'Broadcast Alerts', icon: Bell }
  ];

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-green-800 to-green-900 text-white shadow-2xl flex flex-col fixed top-0 left-0 z-50">
      {/* Brand Logo Header */}
      <div className="p-4 sm:p-6 border-b border-green-700/50 flex-shrink-0">
        <div className="flex items-center">
          <img
            src="/swastiklogo.svg"
            alt="Swastik Logo"
            className="w-32 h-12 sm:w-36 sm:h-14 object-contain"
          />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-4 flex-1 overflow-y-auto space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative text-sm cursor-pointer w-full text-left ${
                isActive
                  ? 'bg-yellow-500/20 text-yellow-400 shadow-lg font-bold'
                  : 'hover:bg-green-700/50 text-green-200 hover:text-white font-medium'
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-r"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <Icon size={18} className="flex-shrink-0 mr-3" />
              <span className="truncate flex-1">{item.title}</span>

              {item.badge && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-green-950">
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Admin User Profile & Sign Out Footer */}
      <div className="p-4 border-t border-green-700/50 bg-green-950/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center font-bold text-yellow-400 text-sm">
              {adminUser?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {adminUser?.username || 'Admin'}
              </p>
              <p className="text-xs text-yellow-400/90 capitalize">
                {adminUser?.role || 'Administrator'}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-green-200 hover:text-white hover:bg-green-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
