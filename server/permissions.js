// Role-based column and field permissions specification

const ROLE_PERMISSIONS = {
  ADMIN: {
    canManageUsers: true,
    canCreateProjects: true,
    canDeleteProjects: true,
    allowedAllocationFields: [
      'user_id', 'project_id', 'role_title', 'capacity_pct',
      'allocated_pct', 'allocation_days_note', 'pm_remarks',
      'tl_notes', 'member_notes', 'status'
    ],
    allowedProjectFields: [
      'name', 'account', 'project_manager_id', 'tech_lead_id', 'active_qa_id',
      'stage', 'weekly_risk', 'weekly_blockers', 'qa_sheet_url',
      'production_deployment_channel', 'staging_deployment_channel', 'database_backup_url', 'status'
    ],
    allowedScorecardFields: [
      'delivery_score', 'communication_score', 'ownership_score',
      'initiative_score', 'documentation_score', 'quality_score',
      'client_handling_score', 'scope_of_improvement'
    ],
    allowedDevOpsFields: [
      'prod_channel', 'stage_channel', 'db_backup_url', 'assigned_person',
      'project_lead', 'health_check_status', 'check_period', 'notes'
    ]
  },

  MANAGER: {
    canManageUsers: true,
    canCreateManagers: false,
    canCreateDevelopers: true,
    canCreateProjects: true,
    canDeleteProjects: false,
    canAssignProjects: true,
    allowedAllocationFields: [
      'project_id', 'role_title', 'capacity_pct', 'allocated_pct',
      'allocation_days_note', 'pm_remarks', 'tl_notes', 'member_notes', 'status'
    ],
    allowedProjectFields: [
      'name', 'account', 'project_manager_id', 'tech_lead_id', 'active_qa_id',
      'stage', 'weekly_risk', 'weekly_blockers', 'qa_sheet_url',
      'production_deployment_channel', 'staging_deployment_channel', 'database_backup_url', 'status'
    ],
    allowedScorecardFields: [
      'delivery_score', 'communication_score', 'ownership_score',
      'initiative_score', 'documentation_score', 'quality_score',
      'client_handling_score', 'scope_of_improvement'
    ],
    allowedDevOpsFields: ['prod_channel', 'stage_channel', 'db_backup_url', 'notes']
  },

  PROJECT_MANAGER: {
    canManageUsers: true,
    canCreateManagers: false,
    canCreateDevelopers: true,
    canCreateProjects: true,
    canDeleteProjects: false,
    canAssignProjects: true,
    allowedAllocationFields: [
      'project_id', 'role_title', 'allocated_pct',
      'allocation_days_note', 'pm_remarks', 'status'
    ],
    allowedProjectFields: [
      'name', 'account', 'project_manager_id', 'tech_lead_id', 'active_qa_id',
      'stage', 'weekly_risk', 'weekly_blockers', 'qa_sheet_url',
      'production_deployment_channel', 'staging_deployment_channel', 'database_backup_url', 'status'
    ],
    allowedScorecardFields: [
      'delivery_score', 'communication_score', 'ownership_score',
      'initiative_score', 'documentation_score', 'quality_score',
      'client_handling_score', 'scope_of_improvement'
    ],
    allowedDevOpsFields: ['prod_channel', 'stage_channel', 'db_backup_url', 'notes']
  },


  TECH_LEAD: {
    canManageUsers: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    allowedAllocationFields: ['tl_notes', 'status'],
    allowedProjectFields: ['stage', 'weekly_risk', 'weekly_blockers', 'qa_sheet_url'],
    allowedScorecardFields: [],
    allowedDevOpsFields: ['notes']
  },

  DEVELOPER: {
    canManageUsers: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    allowedAllocationFields: ['member_notes'],
    allowedProjectFields: [],
    allowedScorecardFields: [],
    allowedDevOpsFields: []
  },

  QA: {
    canManageUsers: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    allowedAllocationFields: ['member_notes'],
    allowedProjectFields: ['qa_sheet_url'],
    allowedScorecardFields: [],
    allowedDevOpsFields: []
  },

  DEVOPS: {
    canManageUsers: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    allowedAllocationFields: ['member_notes'],
    allowedProjectFields: [
      'production_deployment_channel',
      'staging_deployment_channel',
      'database_backup_url'
    ],
    allowedScorecardFields: [],
    allowedDevOpsFields: [
      'prod_channel', 'stage_channel', 'db_backup_url', 'assigned_person',
      'project_lead', 'health_check_status', 'check_period', 'notes'
    ]
  }
};

/**
 * Filter input body to ONLY fields allowed for the user's role.
 * Throws an error or returns the sanitized object.
 */
function sanitizeFields(role, entityType, inputBody, secondaryRole = null) {
  const roleConfig = ROLE_PERMISSIONS[role] || {};
  const secConfig = secondaryRole ? (ROLE_PERMISSIONS[secondaryRole] || {}) : {};

  const getList = (config) => {
    if (entityType === 'allocations') return config.allowedAllocationFields || [];
    if (entityType === 'projects') return config.allowedProjectFields || [];
    if (entityType === 'scorecards') return config.allowedScorecardFields || [];
    if (entityType === 'devops') return config.allowedDevOpsFields || [];
    return [];
  };

  const allowedList = Array.from(new Set([...getList(roleConfig), ...getList(secConfig)]));

  const sanitized = {};
  const rejectedFields = [];

  for (const [key, value] of Object.entries(inputBody)) {
    if (allowedList.includes(key)) {
      sanitized[key] = value;
    } else {
      rejectedFields.push(key);
    }
  }

  return { sanitized, rejectedFields, allowedList };
}

module.exports = {
  ROLE_PERMISSIONS,
  sanitizeFields
};
