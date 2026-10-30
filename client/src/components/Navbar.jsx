import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, LogOut, Calendar, Menu, KeyRound } from 'lucide-react';
import DWLogo from './DWLogo';
import ChangePasswordModal from './ChangePasswordModal';

const ROLE_BADGES = {
  ADMIN: 'Super Admin',
  MANAGER: 'Department Manager',
  PROJECT_MANAGER: 'Project Manager',
  TECH_LEAD: 'Tech Lead',
  DEVELOPER: 'Developer',
  QA: 'QA Specialist',
  DEVOPS: 'DevOps Lead',
};

export default function Navbar({ currentPeriodName, isSidebarCollapsed, toggleSidebar }) {
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const roleLabel = (user && ROLE_BADGES[user.role]) || user?.role?.replace('_', ' ') || 'User';

  // Extract initials for modern avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DW';

  return (
    <header className="bg-[#0A0F23] border-b border-white/5 sticky top-0 z-40 h-14 flex-shrink-0 transition-all select-none">
      <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Brand & Navigation Toggle */}
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand sidebar (Ctrl/Cmd + B)' : 'Collapse sidebar (Ctrl/Cmd + B)'}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <DWLogo 
              className="h-6 w-auto flex-shrink-0" 
              idPrefix="navbar_logo" 
            />
            <span className="font-bold text-white tracking-tight text-base sm:text-lg whitespace-nowrap">
              Resource CRM
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-950/80 text-[#F3701B] border border-orange-800/60">
              DESIGNOWEB
            </span>
          </div>
        </div>

        {/* Right Side: Sprint Period & User Profile */}
        <div className="flex items-center gap-3.5">
          {currentPeriodName && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#F3701B] flex-shrink-0" />
              <span className="truncate max-w-xs">{currentPeriodName}</span>
            </div>
          )}

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D30902] via-[#ED6208] to-[#F3701B] text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm shadow-[#F3701B]/20 flex-shrink-0 ring-1 ring-white/15">
              {initials}
            </div>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{user?.name}</span>
                <span className="bg-orange-500/15 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  {roleLabel}
                </span>
                {user?.secondary_role && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    +{user.secondary_role}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.email}</span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />
          
          {/* Change Password button */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-orange-300 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-transparent hover:border-orange-500/20 transition-colors cursor-pointer"
            title="Change your account password"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Password</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
            title="Sign out of Resource CRM"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
}
