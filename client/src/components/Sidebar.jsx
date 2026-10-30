import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FolderKanban, 
  Users2, 
  Award, 
  Activity, 
  CheckSquare, 
  History, 
  Briefcase, 
  ShieldCheck, 
  PanelLeftClose, 
  PanelLeftOpen 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isCollapsed: externalCollapsed, toggleCollapse: externalToggle }) {
  const { user } = useAuth();

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('dw_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (externalToggle) {
      externalToggle();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try { localStorage.setItem('dw_sidebar_collapsed', String(next)); } catch (e) {}
        return next;
      });
    }
  };

  // Role-based categorized navigation
  const getNavSections = () => {
    if (user?.role === 'QA') {
      return [
        {
          title: 'QA WORKSPACE & TESTING',
          items: [
            { id: 'developer_view', label: 'My QA Deliverables', icon: Briefcase, badge: 'Sprint' },
            { id: 'projects', label: 'QA Projects & Test Sheets', icon: FolderKanban, badge: 'Sheets' },
            { id: 'developer_scorecard', label: 'My Scorecard', icon: Award, badge: null }
          ]
        },
        {
          title: 'TEAM & SPRINT MATRIX',
          items: [
            { id: 'allocations', label: 'Resource Matrix', icon: CalendarDays, badge: 'View' },
            { id: 'leadership', label: 'Tech Leadership Board', icon: Award, badge: 'TL' }
          ]
        }
      ];
    }

    if (user?.role === 'DEVELOPER') {
      const sections = [
        {
          title: 'DEVELOPER WORKSPACE',
          items: [
            { id: 'developer_view', label: 'My Assigned Work', icon: Briefcase, badge: 'Sprint' },
            { id: 'developer_scorecard', label: 'My Scorecard', icon: Award, badge: null },
          ]
        },
        {
          title: 'TEAM & MATRIX',
          items: [
            { id: 'leadership', label: 'Tech Leadership Board', icon: Award, badge: 'TL' },
            { id: 'allocations', label: 'Resource Matrix', icon: CalendarDays, badge: 'View' }
          ]
        }
      ];

      // Dual-Role Support: If user is Developer + DevOps (e.g. Deepanshu Tyagi)
      if (user?.secondary_role === 'DEVOPS' || user?.email?.includes('deepanshu')) {
        sections.push({
          title: 'DEVOPS & INFRASTRUCTURE',
          items: [
            { id: 'devops', label: 'DevOps Health & CI/CD', icon: Activity, badge: 'DevOps' },
            { id: 'projects', label: 'Deployment Channels', icon: FolderKanban, badge: 'Infra' }
          ]
        });
      }

      if (user?.secondary_role === 'QA') {
        sections[0].items.splice(1, 0, { id: 'projects', label: 'QA Projects & Sheets', icon: FolderKanban, badge: 'QA' });
      }

      return sections;
    }

    if (user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') {
      return [
        {
          title: 'EXECUTIVE & TEAM DASHBOARD',
          items: [
            { id: 'dashboard', label: 'Department Dashboard', icon: LayoutDashboard, badge: 'KPIs' },
            { id: 'allocations', label: 'Weekly Resource Matrix', icon: CalendarDays, badge: 'Active' },
            { id: 'resources', label: 'Team Directory', icon: Users2, badge: 'Team' },
            { id: 'projects', label: 'Project Portfolio', icon: FolderKanban, badge: null }
          ]
        },
        {
          title: 'HANDS-ON & APPRAISALS',
          items: [
            { id: 'developer_view', label: 'My Hands-On Tasks', icon: Briefcase, badge: 'Dev' },
            { id: 'developer_scorecard', label: 'My Scorecard', icon: Award, badge: null },
            { id: 'scorecards', label: 'Team Scorecards', icon: CheckSquare, badge: null },
            { id: 'leadership', label: 'Leadership Board', icon: Award, badge: null }
          ]
        },
        {
          title: 'GOVERNANCE & AUDIT',
          items: [
            { id: 'audit', label: 'Security & Audit Logs', icon: History, badge: 'Audit' }
          ]
        }
      ];
    }

    if (user?.role === 'TECH_LEAD') {
      return [
        {
          title: 'TECHNICAL LEADERSHIP',
          items: [
            { id: 'leadership', label: 'Leadership Board', icon: Award, badge: 'TL' },
            { id: 'allocations', label: 'Resource Allocations', icon: CalendarDays, badge: 'Notes' },
            { id: 'projects', label: 'Technical Projects', icon: FolderKanban, badge: null },
            { id: 'resources', label: 'Team Skills Matrix', icon: Users2, badge: null }
          ]
        }
      ];
    }

    if (user?.role === 'DEVOPS') {
      return [
        {
          title: 'INFRASTRUCTURE & CI/CD',
          items: [
            { id: 'devops', label: 'DevOps Health Checks', icon: Activity, badge: 'CI/CD' },
            { id: 'projects', label: 'Deployment Channels', icon: FolderKanban, badge: null },
            { id: 'developer_view', label: 'My Assignments', icon: Briefcase, badge: null }
          ]
        }
      ];
    }

    // Default: Super Admin (Kalash Pachauri & Bhavik Agarwal)
    return [
      {
        title: 'EXECUTIVE OVERVIEW',
        items: [
          { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, badge: null },
          { id: 'allocations', label: 'Weekly Allocations', icon: CalendarDays, badge: 'Matrix' },
          { id: 'projects', label: 'Project Portfolio', icon: FolderKanban, badge: null }
        ]
      },
      {
        title: 'TEAM & PERFORMANCE',
        items: [
          { id: 'resources', label: 'Team & Role Management', icon: Users2, badge: 'Admin' },
          { id: 'scorecards', label: 'Scorecards & Access', icon: CheckSquare, badge: null },
          { id: 'leadership', label: 'Leadership Board', icon: Award, badge: null }
        ]
      },
      {
        title: 'INFRASTRUCTURE & AUDIT',
        items: [
          { id: 'devops', label: 'DevOps & Backups', icon: Activity, badge: null },
          { id: 'audit', label: 'Security Audit Trail', icon: History, badge: 'Logs' }
        ]
      }
    ];
  };

  const sections = getNavSections();

  const getRoleDescription = () => {
    if (user?.secondary_role === 'DEVOPS') return 'Dual-Role Lead: Managing core dev deliverables and DevOps infrastructure.';
    if (user?.secondary_role !== 'DEVOPS' && user?.role === 'DEVELOPER') return 'Hands-on developer. Assigned projects, capacity, and scorecard tracking.';
    if (user?.role === 'QA') return 'Quality assurance workflows, test passes, and milestone releases.';
    if (user?.role === 'MANAGER') return 'Department Manager: Hands-on developer writing code & managing team timelines.';
    if (user?.role === 'PROJECT_MANAGER') return 'Project Manager: Team timelines, resource distribution & delivery tracking.';
    if (user?.role === 'TECH_LEAD') return 'Tech Lead: Architecture oversight, code reviews & technical leadership.';
    if (user?.role === 'DEVOPS') return 'DevOps Lead: CI/CD pipelines, container orchestration & cloud infrastructure.';
    if (user?.role === 'ADMIN') return 'Super Admin Governance: Full RBAC authorization across users, matrix & systems.';
    return 'Enterprise CRM permissions active.';
  };

  const getRoleTitle = () => {
    if (user?.secondary_role === 'DEVOPS') return 'Dual-Role Lead';
    if (user?.role === 'ADMIN') return 'Super Admin';
    if (user?.role === 'MANAGER') return 'Department Manager';
    if (user?.role === 'PROJECT_MANAGER') return 'Project Manager';
    if (user?.role === 'TECH_LEAD') return 'Tech Lead';
    if (user?.role === 'DEVELOPER') return 'Developer';
    if (user?.role === 'QA') return 'QA Specialist';
    if (user?.role === 'DEVOPS') return 'DevOps Lead';
    return user?.role?.replace('_', ' ') || 'Role Permissions';
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-[#0A0F23] text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800/80 shadow-md shadow-black/25 select-none transition-all duration-300 ease-in-out h-full z-30`}
    >
      {/* Navigation List */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'py-3 px-1 space-y-2' : 'py-3 pr-2.5 pl-0 space-y-4'}`}>
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1 truncate">
                {sec.title}
              </h4>
            ) : (
              sIdx > 0 && <div className="my-2 border-t border-white/5 mx-2" />
            )}

            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isCollapsed) {
                return (
                  <div key={item.id} className="relative group flex justify-center">
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-colors cursor-pointer relative ${
                        isActive
                          ? 'bg-orange-500/20 text-[#F3701B] border border-orange-500/40 shadow-sm shadow-[#F3701B]/15'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                      title={item.label}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#F3701B]' : 'text-slate-400'}`} />
                      {item.badge && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F3701B] ring-2 ring-[#0A0F23]" />
                      )}
                    </button>

                    {/* High-End Floating Tooltip on Hover */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium rounded-r-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/15 to-transparent text-[#F3701B] border-l-2 border-[#F3701B] font-semibold'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#F3701B]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                        isActive
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Role & Security Status Card */}
      {!isCollapsed ? (
        <div className="bg-white/5 rounded-xl p-3 mx-3 mb-3 border border-white/5 text-xs flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-orange-300 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#F3701B] flex-shrink-0" />
              <span className="truncate">{getRoleTitle()}</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {getRoleDescription()}
          </p>
        </div>
      ) : (
        <div className="p-2 mb-3 flex items-center justify-center relative group flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[#F3701B] shadow-sm cursor-pointer hover:bg-white/10 transition-colors">
            <ShieldCheck className="w-5 h-5 text-[#F3701B]" />
          </div>
          <div className="absolute left-full bottom-2 ml-3 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-2xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50">
            <div className="font-semibold text-orange-300 text-xs mb-0.5">Role: {getRoleTitle()}</div>
            <div className="text-[11px] text-slate-400 max-w-xs">{user?.department ? `${user.department} Team` : 'DW Enterprise CRM'}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
