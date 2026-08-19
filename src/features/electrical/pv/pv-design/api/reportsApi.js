import { API_BASE_URL } from "./apiConfig";
import { USER } from "../../../../../data/constants";

const AUTH_SESSION_STORAGE_KEY = "forge_auth_session";

function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.session?.access_token || null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(contentType = false, accessToken = null) {
  const headers = {
    "X-User-Id": USER.id,
  };

  if (contentType) {
    headers["Content-Type"] = "application/json";
  }

  const token = accessToken || getStoredAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function saveReportApi({
  report_id,
  parent_report_id,
  report_type,
  document_no,
  revision,
  prepared_date,
  report_title,
  status,
  stage_id,
  sid,
  department_id,
  vertical_id,
  values,
  create_new_version,
  version_notes,
  created_by_role,
  created_by_name,
  assigned_reviewer,
  assigned_reviewer_id,
  assigned_creator,
  assigned_creator_id,
  provider_company,
  department,
  vertical,
  client_name,
  client_address,
  client_contact,
  client_email,
  logo,
  project_name,
}, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/save`, {
    method: "POST",
    headers: {
      ...buildAuthHeaders(true, accessToken),
    },
    body: JSON.stringify({
      report_id,
      parent_report_id,
      report_type,
      document_no,
      revision,
      prepared_date,
      report_title,
      status,
      stage_id: stage_id || sid || values?.designStage || values?.stage || "10",
      sid: sid || stage_id || values?.designStage || values?.stage || "10",
      department_id: department_id || values?.department_id || null,
      vertical_id: vertical_id || values?.vertical_id || null,
      values,
      create_new_version: Boolean(create_new_version),
      version_notes,
      created_by_role: created_by_role || "creator",
      created_by_name: created_by_name || values?.assignedCreator || "Creator",
      assigned_reviewer: assigned_reviewer || values?.assignedReviewer || values?.assigned_reviewer || "Reviewer",
      assigned_reviewer_id: assigned_reviewer_id || values?.assignedReviewerId || null,
      assigned_creator: assigned_creator || values?.assignedCreator || values?.assigned_creator || null,
      assigned_creator_id: assigned_creator_id || values?.assignedCreatorId || null,
      provider_company: provider_company || values?.providerCompany || values?.prepared_by_company || null,
      department: department || values?.department || values?.Department || values?.DEPARTMENT || "Electrical",
      vertical: vertical || values?.vertical || values?.Vertical || values?.VERTICAL || values?.sub || "PV",
      client_name: client_name || values?.clientName || values?.CLIENT_NAME || values?.submittedTo || null,
      client_address: client_address || values?.clientAddress || values?.submittedToAddress || null,
      client_contact: client_contact || values?.clientContact || null,
      client_email: client_email || values?.clientEmail || values?.contactEmail || null,
      logo: logo || values?.clientLogo || values?.logo || null,
      project_name: project_name || values?.projectName || values?.PROJECT_NAME || values?.plant_name || null,
    })
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed) {
        if (typeof parsed.detail === 'string') {
          detail = parsed.detail;
        } else if (Array.isArray(parsed.detail)) {
          detail = parsed.detail.map(d => `${d.loc ? d.loc.join('.') : ''}: ${d.msg}`).join(', ');
        } else if (typeof parsed.error === 'string') {
          detail = parsed.error;
        } else {
          detail = JSON.stringify(parsed);
        }
      }
    } catch {
      // keep raw text
    }
    throw new Error(detail ? `Failed to save report: ${response.status} - ${detail}` : `Failed to save report: ${response.status}`);
  }
  return await response.json();
}

export async function fetchReportsApi(accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch reports list: ${response.status}`);
  }
  return await response.json();
}

export async function fetchReportVersionsApi(reportId, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/versions`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch report versions: ${response.status}`);
  }
  return await response.json();
}

export async function updateReportStatusApi(reportId, status, notes = "", reviewerName = "", assignedCreator = "", accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
    method: "POST",
    headers: buildAuthHeaders(true, accessToken),
    body: JSON.stringify({ 
      status, 
      notes, 
      reviewer_name: reviewerName,
      assigned_creator: assignedCreator 
    })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Failed to update report status: ${response.status}`);
  }
  return await response.json();
}

export async function addReportCommentApi(reportId, { section_key = "general", field_key = null, comment_text, author_role = "reviewer", author_name = "Reviewer" }, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/comments`, {
    method: "POST",
    headers: buildAuthHeaders(true, accessToken),
    body: JSON.stringify({ section_key, field_key, comment_text, author_role, author_name })
  });
  if (!response.ok) {
    throw new Error(`Failed to add comment: ${response.status}`);
  }
  return await response.json();
}

export async function fetchReportCommentsApi(reportId, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/comments`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch report comments: ${response.status}`);
  }
  return await response.json();
}

export async function resolveCommentApi(commentId, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/comments/${commentId}/resolve`, {
    method: "POST",
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve comment: ${response.status}`);
  }
  return await response.json();
}

export async function fetchReportDetailApi(reportId, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch report details: ${response.status}`);
  }
  return await response.json();
}

export async function fetchLastPvReportApi(accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/last-pv`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch last PV report: ${response.status}`);
  }
  return await response.json();
}

export async function fetchLastReportApi(reportType, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/last/${reportType}`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch last report of type ${reportType}: ${response.status}`);
  }
  return await response.json();
}

export async function fetchUsersApi({ department = "", vertical = "", role = "" } = {}, accessToken = null) {
  const params = new URLSearchParams();
  if (department) params.append("department", department);
  if (vertical) params.append("vertical", vertical);
  if (role) params.append("role", role);

  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/users${qs}`, {
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch users list: ${response.status}`);
  }
  return await response.json();
}

export async function deleteReportApi(reportId, accessToken = null) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(false, accessToken),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete report: ${response.status}`);
  }
  return await response.json();
}

export async function fetchProjectsApi(accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: buildAuthHeaders(false, accessToken),
    });
    if (!response.ok) return { success: false, projects: [] };
    return await response.json();
  } catch (err) {
    console.error("fetchProjectsApi error:", err);
    return { success: false, projects: [] };
  }
}

export async function saveProjectApi(projData, accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: buildAuthHeaders(true, accessToken),
      body: JSON.stringify(projData),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || payload?.error || `Failed to save project: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error("saveProjectApi error:", err);
    return { success: false };
  }
}

export async function deleteProjectApi(projectId, accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(false, accessToken),
    });
    if (!response.ok) return { success: false };
    return await response.json();
  } catch (err) {
    console.error("deleteProjectApi error:", err);
    return { success: false };
  }
}

export async function fetchClientsApi(accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      headers: buildAuthHeaders(false, accessToken),
    });
    if (!response.ok) return { success: false, clients: [] };
    return await response.json();
  } catch (err) {
    console.error("fetchClientsApi error:", err);
    return { success: false, clients: [] };
  }
}

export async function createClientApi(clientData, accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: buildAuthHeaders(true, accessToken),
      body: JSON.stringify({
        name: clientData.clientName || clientData.name,
        client_name: clientData.clientName || clientData.name,
        address: clientData.clientAddress || clientData.address,
        client_address: clientData.clientAddress || clientData.address,
        primary_contact: clientData.clientContact || clientData.contact,
        contact_email: clientData.clientEmail || clientData.email,
        logo: clientData.logo || null,
        created_by_role: "reviewer"
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || payload?.error || `Failed to create client: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error("createClientApi error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteClientApi(clientId, accessToken = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(false, accessToken),
    });
    if (!response.ok) return { success: false };
    return await response.json();
  } catch (err) {
    console.error("deleteClientApi error:", err);
    return { success: false };
  }
}
