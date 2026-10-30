import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { GoldRatesView } from './views/GoldRatesView.jsx';
import { SchemesView } from './views/SchemesView.jsx';
import { KycQueueView } from './views/KycQueueView.jsx';
import { PaymentsView } from './views/PaymentsView.jsx';
import { PickupsView } from './views/PickupsView.jsx';
import { UsersView } from './views/UsersView.jsx';
import { BookingsView } from './views/BookingsView.jsx';
import { LuckyDrawView } from './views/LuckyDrawView.jsx';
import { NotificationsView } from './views/NotificationsView.jsx';
import { api } from './services/api.js';

const MainVaultApp = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4fbf6] text-green-800 font-semibold text-sm">
        Loading Swastik CRM...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const tabTitles = {
    dashboard: { title: 'Executive Dashboard', subtitle: 'Overview of kitties, gold liabilities & collections' },
    rates: { title: 'Daily Gold Rates', subtitle: 'IBJA official benchmark per-gram pricing' },
    schemes: { title: '11+1 Schemes & 01–50 Slots', subtitle: 'Gold savings catalogs & atomic token allocations' },
    kyc: { title: 'PMLA / KYC Compliance Queue', subtitle: 'Patron government identity documents verification' },
    payments: { title: 'Financial Payments Ledger', subtitle: 'Reconciled gateway payments & counter cash collections' },
    pickups: { title: 'Doorstep Cash Pickups', subtitle: 'Logistics tracking with 4-digit OTP handover confirmation' },
    users: { title: 'Patrons Directory', subtitle: 'Customer passbooks, KYC states & contact records' },
    bookings: { title: 'Pure Gold & Bullion Orders', subtitle: 'Physical bullion delivery & dispatch tracking' },
    draw: { title: 'Monthly Lucky Draw', subtitle: 'Official draw console with winner broadcast automation' },
    broadcast: { title: 'Broadcast Alerts & Notifications', subtitle: 'In-app banners & push alerts dispatched to patron devices' }
  };

  const currentTabInfo = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <div className="flex h-screen bg-[#f4fbf6] overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        pendingKycCount={stats?.metrics?.pendingKyc || 0}
        pendingPickupsCount={stats?.metrics?.pendingPickups || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64 min-w-0">
        <Header
          title={currentTabInfo.title}
          subtitle={currentTabInfo.subtitle}
          rates={stats?.metrics?.currentRates}
          onRefresh={loadStats}
          onOpenRateModal={() => setActiveTab('rates')}
          onOpenBroadcastModal={() => setActiveTab('broadcast')}
          loading={loading}
        />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <DashboardView 
              stats={stats} 
              setActiveTab={setActiveTab}
              onOpenRateModal={() => setActiveTab('rates')}
            />
          )}
          {activeTab === 'rates' && (
            <GoldRatesView 
              currentRates={stats?.metrics?.currentRates} 
              onRateUpdated={() => loadStats()}
            />
          )}
          {activeTab === 'schemes' && <SchemesView />}
          {activeTab === 'kyc' && (
            <KycQueueView onKycReviewed={() => loadStats()} />
          )}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'pickups' && (
            <PickupsView onPickupConfirmed={() => loadStats()} />
          )}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'bookings' && <BookingsView />}
          {activeTab === 'draw' && <LuckyDrawView />}
          {activeTab === 'broadcast' && <NotificationsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainVaultApp />
    </AuthProvider>
  );
}
