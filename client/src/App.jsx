import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import DWLogo from './components/DWLogo';
import ForceChangePasswordScreen from './pages/ForceChangePasswordScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllocationsMatrix from './pages/AllocationsMatrix';
import ProjectsList from './pages/ProjectsList';
import ResourceDirectory from './pages/ResourceDirectory';
import LeadershipBoard from './pages/LeadershipBoard';
import DevOpsChecks from './pages/DevOpsChecks';
import Scorecards from './pages/Scorecards';
import AuditLogs from './pages/AuditLogs';
import DeveloperWork from './pages/DeveloperWork';
import DeveloperScorecard from './pages/DeveloperScorecard';

function AppContent() {
  const { user, loading } = useAuth();
  
  // Set default tab based on user's role
  const getDefaultTab = (role) => {
    if (['DEVELOPER', 'QA'].includes(role)) return 'developer_view';
    if (role === 'PROJECT_MANAGER' || role === 'MANAGER') return 'dashboard';
    if (role === 'TECH_LEAD') return 'leadership';
    if (role === 'DEVOPS') return 'devops';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState('allocations');
  const [currentPeriodName, setCurrentPeriodName] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dw_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dw_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (user) {
      setActiveTab(getDefaultTab(user.role));
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F23] flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <DWLogo 
              className="h-9 w-auto mx-auto" 
              idPrefix="loading_logo" 
            />
          </div>
          <p className="text-white font-bold text-lg tracking-tight">Resource CRM</p>
          <p className="text-slate-400 text-sm mt-1">Designoweb Enterprise Resource Matrix</p>
          <div className="mt-4 flex justify-center">
            <div className="w-10 h-1 bg-gradient-to-r from-[#F3701B] to-[#D30902] rounded-full animate-pulse" />
          </div>
          <button
            type="button"
            onClick={() => {
              try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
              window.location.reload();
            }}
            className="mt-6 text-xs text-[#F3701B] hover:text-orange-300 underline underline-offset-2 transition"
          >
            Taking longer than usual? Reset
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen bg-[#0A0F23] flex flex-col font-sans overflow-hidden relative">
      <Navbar 
        currentPeriodName={currentPeriodName}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
          {activeTab === 'developer_view' && <DeveloperWork />}
          {activeTab === 'developer_scorecard' && <DeveloperScorecard />}
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'allocations' && <AllocationsMatrix onPeriodChange={setCurrentPeriodName} />}
          {activeTab === 'projects' && <ProjectsList />}
          {activeTab === 'resources' && <ResourceDirectory />}
          {activeTab === 'leadership' && <LeadershipBoard />}
          {activeTab === 'devops' && <DevOpsChecks />}
          {activeTab === 'scorecards' && <Scorecards />}
          {activeTab === 'audit' && <AuditLogs />}
        </main>
      </div>

      {/* Mandatory Password Change Popup on Dashboard */}
      {Boolean(user?.must_change_password) && user?.role !== 'ADMIN' && (
        <ForceChangePasswordScreen />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
