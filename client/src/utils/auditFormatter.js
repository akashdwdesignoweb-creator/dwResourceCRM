/**
 * Safely parse any date string (including SQLite UTC dates without Z) and format in Indian Standard Time (IST - UTC+5:30)
 */
export function formatToIST(dateStr, options = {}) {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str = str + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

export function formatFullIST(dateStr) {
  if (!dateStr) return '—';
  let str = String(dateStr).trim();
  if (!str.endsWith('Z') && !str.includes('+') && !str.includes('T')) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str = str + 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Translates raw audit logs into clear, human-readable English descriptions
 */
export function formatAuditLogText(log) {
  if (log.human_description) {
    return log.human_description;
  }

  const action = log.action || '';
  const entity = log.entity || '';
  const field = log.field_name || '';

  if (action === 'CHANGE_PASSWORD') {
    return 'Changed account security password';
  }
  if (action === 'LOGIN_MFA_SUCCESS') {
    return 'Completed two-factor sign-in';
  }
  if (action === 'CREATE_USER') {
    return `Created new team member: ${log.new_value || 'User'}`;
  }
  if (action === 'COMPLETE_PROJECT_FREE_RESOURCES') {
    return `Marked project as Completed and released all allocations`;
  }
  if (action === 'UPDATE_PROJECT_FIELD') {
    if (field === 'status') {
      return `Changed project status to ${log.new_value}`;
    }
    if (field === 'project_manager_id') {
      return `Updated assigned Project Manager`;
    }
    if (field === 'tech_lead_id') {
      return `Updated assigned Tech Lead`;
    }
    if (field === 'weekly_risk') {
      return `Updated project risk level to ${log.new_value}`;
    }
    return `Updated ${field.replace(/_/g, ' ')} to "${log.new_value}"`;
  }
  if (action === 'UPDATE_ALLOCATION_FIELD') {
    if (field === 'allocated_pct') {
      return `Updated allocation capacity to ${log.new_value}%`;
    }
    if (field === 'pm_work_notes') {
      return `Updated PM work notes`;
    }
    return `Updated allocation ${field.replace(/_/g, ' ')}`;
  }
  if (action === 'UPDATE_SCORECARD') {
    return `Updated performance scorecard (${log.new_value}/100)`;
  }
  if (action === 'SUBMIT_SELF_EVAL') {
    return `Submitted self-evaluation scorecard (${log.new_value}/100)`;
  }
  if (action === 'ENABLE_SELF_EVAL') {
    return `Unlocked self-evaluation access`;
  }

  return `${action.replace(/_/g, ' ')} on ${entity}`;
}

export function getAuditCategoryBadge(category) {
  switch (category) {
    case 'Security':
    case 'Authentication':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Projects':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Team':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Allocations':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Scorecards':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Sprints':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}
