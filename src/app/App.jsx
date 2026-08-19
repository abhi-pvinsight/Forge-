import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import SignIn from "../features/auth/components/SignIn";
import { saveReportApi } from "../features/electrical/pv/pv-design/api/reportsApi";

import Sidebar from "../features/dashboard/components/Sidebar";
import Topbar from "../features/dashboard/components/Topbar";
import Welcome from "../features/dashboard/components/Welcome";
import ReportList from "../features/dashboard/components/ReportList";
import SelectClientScreen from "../features/dashboard/components/SelectClientScreen";

import FormScreen from "../features/electrical/pv/pv-design/components/FormScreen.jsx";
import Generating from "../features/electrical/pv/pv-design/reports/Generating.jsx";
import Preview from "../features/electrical/pv/pv-design/reports/Preview.jsx";
import BessPreview from "../features/electrical/bess/bess-sizing/reports/BessPreview";

import { USER } from "../data/constants";

import { STRING_SIZE_DEFAULTS } from "../features/electrical/pv/pv-design/forms/stringSizingDefaults.js";
import computeStringSizing from "../features/electrical/pv/pv-design/calculations/stringSizing";

import { NAV, findReport } from "../data/navigation";

import BessFormScreen from "../features/electrical/bess/bess-sizing/components/BessFormScreen";
import { BESS_DEFAULTS } from "../features/electrical/bess/bess-sizing/forms/bessDefaults";
import BessGenerating from "../features/electrical/bess/bess-sizing/reports/bessGenerating.jsx";

import BessAmpacityFormScreen from "../features/electrical/bess/bess-ampacity/components/BessAmpacityFormScreen";
import { BESS_AMPACITY_DEFAULTS } from "../features/electrical/bess/bess-ampacity/forms/bessAmpacityDefaults";
import BessAmpacityGenerating from "../features/electrical/bess/bess-ampacity/reports/bessAmpacityGenerating";
import BessAmpacityPreview from "../features/electrical/bess/bess-ampacity/reports/BessAmpacityPreview";

import BessGroundingFormScreen from "../features/electrical/bess/bess-grounding/components/BessGroundingFormScreen";
import { BESS_GROUNDING_DEFAULTS } from "../features/electrical/bess/bess-grounding/forms/bessGroundingDefaults";
import BessGroundingGenerating from "../features/electrical/bess/bess-grounding/reports/bessGroundingGenerating";
import BessGroundingPreview from "../features/electrical/bess/bess-grounding/reports/BessGroundingPreview";
import useAuth from "../shared/hooks/useAuth";

import HvDbrFormScreen from "../features/electrical/hv/hv-dbr/components/HvDbrFormScreen";
import { HV_DBR_DEFAULTS } from "../features/electrical/hv/hv-dbr/forms/hvDbrDefaults";
import HvDbrGenerating from "../features/electrical/hv/hv-dbr/reports/hvDbrGenerating";
import HvDbrPreview from "../features/electrical/hv/hv-dbr/reports/HvDbrPreview";

import BusbarFormScreen from "../features/electrical/hv/busbar-sizing/components/BusbarFormScreen";
import { BUSBAR_DEFAULTS } from "../features/electrical/hv/busbar-sizing/forms/busbarDefaults";
import BusbarGenerating from "../features/electrical/hv/busbar-sizing/reports/busbarGenerating";
import BusbarPreview from "../features/electrical/hv/busbar-sizing/reports/BusbarPreview";
import { saveProjectRecord } from "../data/projects";


export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut, user: authUser } = useAuth();
  // const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // temorary 



  const t = {
    formLayout: "tabbed", showCalc: true, accent: "default", docFont: "sans",
  };

  const isUserAdmin = (email) => {
    const norm = (email || '').toLowerCase().trim();
    return norm === 'abhaypratap.singh@pvinsightinc.com' || norm === 'abhay@mail.com' || norm.includes('abhay');
  };

  const currentUser = useMemo(() => {
    return authUser
      ? {
        ...USER,
        id: authUser.id || USER.id || "",
        name: authUser.full_name || authUser.email || USER.name,
        initials: (authUser.full_name || authUser.email || USER.name)
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
          || USER.initials,
        role: isUserAdmin(authUser.email) ? (authUser.role === 'reviewer' ? 'reviewer' : 'admin') : (authUser.role || USER.role),
        department: authUser.department || USER.department || "",
        vertical: authUser.vertical || USER.vertical || "",
        email: authUser.email || "",
        isAdmin: isUserAdmin(authUser.email) || authUser.role === 'admin',
        isReviewer: isUserAdmin(authUser.email) || authUser.role === 'reviewer' || authUser.role === 'admin',
      }
      : {
        ...USER,
        id: "",
        name: USER?.name || "User",
        initials: "U",
        email: "",
        department: "",
        vertical: "",
        role: "member",
        isAdmin: false,
        isReviewer: false,
      };
  }, [authUser]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("forge_sidebar_collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("forge_sidebar_collapsed", JSON.stringify(next));
      return next;
    });
  };
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("forge-theme") || "light";
    } catch {
      return "light";
    }
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";

      try {
        localStorage.setItem("forge-theme", next);
      } catch {
        // Ignore storage write failures in restricted browsers.
      }

      return next;
    });
  };

  const [screen, setScreen] = useState("app");
  const [currentReportId, setCurrentReportId] = useState(null);
  const [sourceReportId, setSourceReportId] = useState(null);
  const [loadedReportMeta, setLoadedReportMeta] = useState(null);
  const [draftSync, setDraftSync] = useState({
    dirty: false,
    saving: false,
    lastSavedAt: null,
    error: null,
  });

  // Parse path parts: /dashboard/:vId/:sId/:rId/:phaseParam
  const pathParts = useMemo(() => {
    const raw = location.pathname.replace(/^\/(dashboard|reports)\/?/, '');
    return raw.split('/').filter(Boolean);
  }, [location.pathname]);

  const [vId, sId, rId, phaseParam] = pathParts;

  // Derive active selection (sel) and phase directly from URL params
  const sel = useMemo(() => {
    if (!vId) return { vertical: null, sub: null, report: null };
    const vObj = typeof vId === 'object' ? vId : NAV.find(x => x.id === vId);
    if (!vObj) return { vertical: null, sub: null, report: null };
    if (!sId) return { vertical: vObj, sub: null, report: null };
    const sObj = typeof sId === 'object' ? sId : vObj.subs.find(x => x.id === sId);
    if (!sObj) return { vertical: vObj, sub: null, report: null };
    if (!rId) return { vertical: vObj, sub: sObj, report: null };
    const rObj = typeof rId === 'object' ? rId : sObj.reports.find(x => x.id === rId);
    return { vertical: vObj, sub: sObj, report: rObj || null };
  }, [vId, sId, rId]);

  const phase = phaseParam || "form";

  const [query, setQuery] = useState("");

  const [pvValues, setPvValues] = useState(() => {
    try {
      const saved = localStorage.getItem('forge_pv_values');
      return saved ? JSON.parse(saved) : STRING_SIZE_DEFAULTS;
    } catch {
      return STRING_SIZE_DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('forge_pv_values', JSON.stringify(pvValues));
    } catch (e) { }
  }, [pvValues]);

  const [bessValues, setBessValues] = useState(() => {
    try {
      const saved = localStorage.getItem('forge_bess_values');
      return saved ? JSON.parse(saved) : BESS_DEFAULTS;
    } catch {
      return BESS_DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('forge_bess_values', JSON.stringify(bessValues));
    } catch (e) { }
  }, [bessValues]);

  const [bessAmpacityValues, setBessAmpacityValues] = useState({
    ...BESS_AMPACITY_DEFAULTS,
  });

  const [bessGroundingValues, setBessGroundingValues] = useState({
    ...BESS_GROUNDING_DEFAULTS,
  });

  const [hvDbrValues, setHvDbrValues] = useState({
    ...HV_DBR_DEFAULTS,
  });

  const [busbarValues, setBusbarValues] = useState({
    ...BUSBAR_DEFAULTS,
  });

  const [files, setFiles] = useState({
    moduleDs: null,
    inverterDs: null,
    vocCsv: null,

    batteryDs: null,
    pcsDs: null,
    transformerDs: null,
    pvsystReport: null
  });


  const currentValues =
    sel.report?.id === "bess-sizing"
      ? bessValues
      : sel.report?.id === "bess-ampacity"
        ? bessAmpacityValues
        : sel.report?.id === "bess-grounding"
          ? bessGroundingValues
          : sel.report?.id === "hv-dbr"
            ? hvDbrValues
            : sel.report?.id === "busbar-sizing"
              ? busbarValues
              : pvValues;

  const currentFiles = files;

  const markDraftDirty = () => {
    setDraftSync((prev) => ({
      ...prev,
      dirty: true,
      error: null,
    }));
  };

  const resetDraftSync = () => {
    setDraftSync({
      dirty: false,
      saving: false,
      lastSavedAt: null,
      error: null,
    });
  };

  const setFile = (key, value) => {
    markDraftDirty();
    setFiles((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const pvCalc = useMemo(() => {
    return computeStringSizing(pvValues);
  }, [pvValues]);


  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

  }, [theme, t.accent, t.docFont]);

  const resetAllFormValuesToDefaults = () => {
    setPvValues({ ...STRING_SIZE_DEFAULTS });
    setBessValues({ ...BESS_DEFAULTS });
    setBessAmpacityValues({ ...BESS_AMPACITY_DEFAULTS });
    setBessGroundingValues({ ...BESS_GROUNDING_DEFAULTS });
    setHvDbrValues({ ...HV_DBR_DEFAULTS });
    setBusbarValues({ ...BUSBAR_DEFAULTS });
    try {
      localStorage.removeItem('forge_pv_values');
      localStorage.removeItem('forge_bess_values');
    } catch (e) {}
  };

  const selectReport = (verticalId, subId, reportId) => {
    const v = typeof verticalId === 'object' ? verticalId?.id : verticalId;
    const s = typeof subId === 'object' ? subId?.id : subId;
    const r = typeof reportId === 'object' ? reportId?.id : reportId;
    setCurrentReportId(null);
    setSourceReportId(null);
    setLoadedReportMeta(null);
    resetDraftSync();
    resetAllFormValuesToDefaults();
    if (v && s && r) {
      navigate(`/dashboard/${v}/${s}/${r}/select-client`);
    }
  };

  const selectSub = (verticalId, subId) => {
    const v = typeof verticalId === 'object' ? verticalId?.id : verticalId;
    const s = typeof subId === 'object' ? subId?.id : subId;
    setCurrentReportId(null);
    setSourceReportId(null);
    setLoadedReportMeta(null);
    resetDraftSync();
    if (v && s) {
      navigate(`/dashboard/${v}/${s}`);
    } else if (v) {
      navigate(`/dashboard/${v}`);
    } else {
      navigate('/dashboard');
    }
  };

  const selectVertical = (verticalId) => {
    const id = typeof verticalId === 'object' ? verticalId?.id : verticalId;
    setCurrentReportId(null);
    setSourceReportId(null);
    setLoadedReportMeta(null);
    resetDraftSync();
    if (id) {
      navigate(`/dashboard/${id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const flattenPvReport = (details) => {
    if (!details) return {};
    const flat = {
      module_make: details.module_manufacturer || "",
      module_model: details.module_model || "",
    };

    const jsonColumns = [
      "electrical_characteristics",
      "mechanical_characteristics",
      "temperature_coefficients",
      "pvsyst_results",
      "irradiation_data",
      "energy_yield",
      "loss_analysis",
      "voc_calculations",
      "isc_calculations",
      "degradation_tables",
      "site_conditions",
    ];

    jsonColumns.forEach(col => {
      if (details[col] && typeof details[col] === "object") {
        Object.entries(details[col]).forEach(([key, val]) => {
          flat[key] = val;
        });
      }
    });

    return flat;
  };

  const loadReportIntoForm = (recentMeta, detail, targetPhase = "form") => {
    let verticalId = "electrical";
    let subId = "pv";
    let reportId = "pv-design";

    if (recentMeta.report_type === "grounding") {
      verticalId = "electrical";
      subId = "bess";
      reportId = "bess-grounding";
    } else if (recentMeta.report_type === "cable") {
      verticalId = "electrical";
      subId = "bess";
      reportId = "bess-ampacity";
    } else if (recentMeta.report_type === "battery") {
      verticalId = "electrical";
      subId = "bess";
      reportId = "bess-sizing";
    } else if (recentMeta.report_type === "hv-dbr") {
      verticalId = "electrical";
      subId = "hv";
      reportId = "hv-dbr";
    } else if (recentMeta.report_type === "busbar-sizing" || recentMeta.report_type === "busbar") {
      verticalId = "electrical";
      subId = "hv";
      reportId = "busbar-sizing";
    }

    const detailObj = Array.isArray(detail) ? (detail[0] || {}) : (detail || {});
    const inputs = detailObj?.inputs || {};
    const details = inputs.details || inputs;

    const metadata = detailObj?.metadata || {};
    const metadata_json = detailObj?.metadata_json || metadata.metadata_json || {};

    const reportStatus = recentMeta?.status || metadata.status || detailObj?.status || "draft";
    const commonMeta = {
      status: reportStatus,
      report_id: recentMeta?.report_id || metadata.id || detailObj?.id,
      id: recentMeta?.report_id || metadata.id || detailObj?.id,
      project_id: recentMeta?.project_id || metadata.project_id || detailObj?.project_id,
      parent_report_id: recentMeta?.parent_report_id ?? metadata.parent_report_id ?? detailObj?.parent_report_id,
      version_number: recentMeta?.version_number || metadata.version_number || detailObj?.version_number || 1,
      is_current_version: recentMeta?.is_current_version ?? metadata.is_current_version ?? detailObj?.is_current_version ?? true,
      report_type: recentMeta?.report_type || metadata.report_type || detailObj?.report_type,
      prepared_date: recentMeta?.prepared_date || metadata.prepared_date || detailObj?.prepared_date,
      assigned_creator: recentMeta?.assigned_creator || metadata.assigned_creator || detailObj?.assigned_creator,
      assigned_reviewer: recentMeta?.assigned_reviewer || metadata.assigned_reviewer || detailObj?.assigned_reviewer,
      DOCUMENT_NO: recentMeta?.document_no || metadata.document_no || details.DOCUMENT_NO,
      REVISION: recentMeta?.revision || metadata.revision || details.REVISION,
      REPORT_TITLE: recentMeta?.report_title || metadata.report_title || details.REPORT_TITLE || details.plant_name
    };

    if (recentMeta.report_type === "grounding") {
      setBessGroundingValues({ ...BESS_GROUNDING_DEFAULTS, ...details, ...metadata_json, ...commonMeta });
    } else if (recentMeta.report_type === "cable") {
      setBessAmpacityValues({ ...BESS_AMPACITY_DEFAULTS, ...details, ...metadata_json, ...commonMeta });
    } else if (recentMeta.report_type === "battery") {
      setBessValues({ ...BESS_DEFAULTS, ...details, ...metadata_json, ...commonMeta });
    } else if (recentMeta.report_type === "hv-dbr") {
      setHvDbrValues({ ...HV_DBR_DEFAULTS, ...details, ...metadata_json, ...commonMeta });
    } else if (recentMeta.report_type === "busbar-sizing" || recentMeta.report_type === "busbar") {
      setBusbarValues({ ...BUSBAR_DEFAULTS, ...details, ...metadata_json, ...commonMeta });
    } else {
      const flatPv = flattenPvReport(details);
      setPvValues({ ...STRING_SIZE_DEFAULTS, ...flatPv, ...metadata_json, ...commonMeta });
    }
    resetDraftSync();
    navigate(`/dashboard/${verticalId}/${subId}/${reportId}/${targetPhase}`);
  };

  const handleSelectRecent = (recentMeta, detail) => {
    const targetPhase = recentMeta.targetPhase || (recentMeta.status === "completed" ? "preview" : "form");
    loadReportIntoForm(recentMeta, detail, targetPhase);

    setCurrentReportId(recentMeta.report_id);
    setLoadedReportMeta({
      document_no: recentMeta.document_no || "",
      revision: recentMeta.revision || "",
      report_title: recentMeta.report_title || "",
    });
    setSourceReportId(null);
    setDraftSync({
      dirty: false,
      saving: false,
      lastSavedAt: new Date(),
      error: null,
    });
  };

  const handleCloneReport = (recentMeta, detail) => {
    loadReportIntoForm(recentMeta, detail, "form");

    setCurrentReportId(null);
    setLoadedReportMeta(null);
    setSourceReportId(recentMeta.report_id);
    setDraftSync({
      dirty: true,
      saving: false,
      lastSavedAt: null,
      error: null,
    });
  };

  const handleStartAssignedProject = (projectObj) => {
    if (!projectObj) return;

    const deptId = (projectObj.department || 'Electrical').toLowerCase() === 'civil' ? 'civil' : (projectObj.department || 'Electrical').toLowerCase() === 'structure' ? 'structure' : 'electrical';
    const vert = (projectObj.vertical || 'PV').toLowerCase();
    let subId = 'pv';
    let reportId = 'pv-design';

    if (vert.includes('grounding') || vert.includes('earth')) {
      subId = 'bess';
      reportId = 'bess-grounding';
    } else if (vert.includes('ampacity') || vert.includes('cable')) {
      subId = 'bess';
      reportId = 'bess-ampacity';
    } else if (vert.includes('bess') || vert.includes('battery')) {
      subId = 'bess';
      reportId = 'bess-sizing';
    } else if (vert.includes('hv-dbr') || vert.includes('hv dbr')) {
      subId = 'hv';
      reportId = 'hv-dbr';
    } else if (vert.includes('busbar')) {
      subId = 'hv';
      reportId = 'busbar-sizing';
    }

    navigate(`/dashboard/${deptId}/${subId}/${reportId}/select-client`);
  };

  const handleAdvanceStage = ({ sourceReport, targetStage, revision, description }) => {
    const rawValues = (sourceReport && sourceReport.values) ? sourceReport.values : (sourceReport || {});
    const baseValues = Object.keys(rawValues).length > 0 ? rawValues : {
      "bess-sizing": bessValues,
      "bess-ampacity": bessAmpacityValues,
      "bess-grounding": bessGroundingValues,
      "hv-dbr": hvDbrValues,
      "busbar-sizing": busbarValues,
      "string-sizing": pvValues
    }[sel.report?.id] || pvValues;

    const todayStr = new Date().toLocaleDateString("en-GB").replaceAll("/", ".");
    const reportTitle = baseValues.reportTitle || baseValues.reportName || sel.report?.name || "Engineering Report";
    const newRow = {
      revision: revision || "0",
      issueDate: todayStr,
      documentName: reportTitle,
      description: description || `${targetStage}% Milestone Package`
    };

    const oldHistory = Array.isArray(baseValues.revisions) ? baseValues.revisions : [];
    const updatedHistory = [...oldHistory, newRow];

    const newValues = {
      ...baseValues,
      designStage: targetStage,
      stage: targetStage,
      revision: revision || "0",
      REVISION: revision || "0",
      issueDate: todayStr,
      revisions: updatedHistory,
      status: "draft",
      custom_html: null
    };

    const targetReportType = sourceReport?.report_type || sel.report?.id || 'string-sizing';
    let targetReportKey = sel.report?.id || 'string-sizing';
    if (targetReportType === 'battery' || targetReportType === 'bess-sizing') targetReportKey = 'bess-sizing';
    else if (targetReportType === 'cable' || targetReportType === 'bess-ampacity') targetReportKey = 'bess-ampacity';
    else if (targetReportType === 'grounding' || targetReportType === 'bess-grounding') targetReportKey = 'bess-grounding';
    else if (targetReportType === 'hv-dbr') targetReportKey = 'hv-dbr';
    else if (targetReportType === 'busbar-sizing') targetReportKey = 'busbar-sizing';
    else if (targetReportType === 'pv' || targetReportType === 'string-sizing') targetReportKey = 'string-sizing';

    if (targetReportKey === "bess-sizing") setBessValues(newValues);
    else if (targetReportKey === "bess-ampacity") setBessAmpacityValues(newValues);
    else if (targetReportKey === "bess-grounding") setBessGroundingValues(newValues);
    else if (targetReportKey === "hv-dbr") setHvDbrValues(newValues);
    else if (targetReportKey === "busbar-sizing") setBusbarValues(newValues);
    else setPvValues(newValues);

    setSourceReportId(sourceReport?.id || currentReportId);
    setCurrentReportId(null);
    setLoadedReportMeta(null);

    const vertId = sel.vertical?.id || 'electrical';
    const subId = (targetReportKey.startsWith('bess') ? 'bess' : targetReportKey.startsWith('hv') || targetReportKey.startsWith('busbar') ? 'hv' : 'pv');
    navigate(`/dashboard/${vertId}/${subId}/${targetReportKey}/form`);

    setDraftSync({
      dirty: true,
      saving: false,
      lastSavedAt: null,
      error: null,
    });
  };

  const handleCloneToNewProject = ({ sourceReport, newProject, targetStage, revision }) => {
    const rawValues = (sourceReport && sourceReport.values) ? sourceReport.values : (sourceReport || {});
    const baseValues = Object.keys(rawValues).length > 0 ? rawValues : {
      "bess-sizing": bessValues,
      "bess-ampacity": bessAmpacityValues,
      "bess-grounding": bessGroundingValues,
      "hv-dbr": hvDbrValues,
      "busbar-sizing": busbarValues,
      "string-sizing": pvValues
    }[sel.report?.id] || pvValues;

    if (newProject && newProject.name) {
      saveProjectRecord({
        ...newProject,
        clientId: newProject.clientId || 'client-demo',
        clientName: newProject.clientName || 'Client',
      });
    }

    const todayStr = new Date().toLocaleDateString("en-GB").replaceAll("/", ".");
    const newValues = {
      ...baseValues,
      projectName: newProject.name,
      projectTitle: newProject.name,
      plant_name: newProject.name,
      PROJECT_NAME: newProject.name,
      county: newProject.county || '',
      state: newProject.state || '',
      country: newProject.country || 'USA',
      assignedCreator: newProject.assignedCreator || currentUser?.name || 'Arman Shah',
      assignedReviewer: newProject.assignedReviewer || 'Senior Reviewer',
      department: newProject.department || 'Electrical',
      vertical: newProject.vertical || 'PV',
      designStage: targetStage || '10',
      stage: targetStage || '10',
      revision: revision || "0",
      REVISION: revision || "0",
      issueDate: todayStr,
      revisions: [
        {
          revision: revision || "0",
          issueDate: todayStr,
          documentName: newProject.name,
          description: "Initial Draft (Cloned Equipment Template)"
        }
      ],
      status: "draft",
      custom_html: null
    };

    const targetReportType = sourceReport?.report_type || sel.report?.id || 'string-sizing';
    let targetReportKey = sel.report?.id || 'string-sizing';
    if (targetReportType === 'battery' || targetReportType === 'bess-sizing') targetReportKey = 'bess-sizing';
    else if (targetReportType === 'cable' || targetReportType === 'bess-ampacity') targetReportKey = 'bess-ampacity';
    else if (targetReportType === 'grounding' || targetReportType === 'bess-grounding') targetReportKey = 'bess-grounding';
    else if (targetReportType === 'hv-dbr') targetReportKey = 'hv-dbr';
    else if (targetReportType === 'busbar-sizing') targetReportKey = 'busbar-sizing';
    else if (targetReportType === 'pv' || targetReportType === 'string-sizing') targetReportKey = 'string-sizing';

    if (targetReportKey === "bess-sizing") setBessValues(newValues);
    else if (targetReportKey === "bess-ampacity") setBessAmpacityValues(newValues);
    else if (targetReportKey === "bess-grounding") setBessGroundingValues(newValues);
    else if (targetReportKey === "hv-dbr") setHvDbrValues(newValues);
    else if (targetReportKey === "busbar-sizing") setBusbarValues(newValues);
    else setPvValues(newValues);

    setSourceReportId(sourceReport?.id || currentReportId);
    setCurrentReportId(null);
    setLoadedReportMeta(null);

    const vertId = sel.vertical?.id || 'electrical';
    const subId = (targetReportKey.startsWith('bess') ? 'bess' : targetReportKey.startsWith('hv') || targetReportKey.startsWith('busbar') ? 'hv' : 'pv');
    navigate(`/dashboard/${vertId}/${subId}/${targetReportKey}/form`);

    setDraftSync({
      dirty: true,
      saving: false,
      lastSavedAt: null,
      error: null,
    });
  };

  const handleCloneToRevision = (newRev, description) => {
    handleAdvanceStage({
      targetStage: '10',
      revision: newRev,
      description: description || 'New Revision',
    });
  };


  const persistReportDraft = async (values, { showSuccessAlert = true, status } = {}) => {
    try {
      setDraftSync((prev) => ({
        ...prev,
        saving: true,
        error: null,
      }));

      const typeMap = {
        "string-sizing": "pv",
        "pv-design": "pv",
        "bess-sizing": "battery",
        "bess-ampacity": "cable",
        "bess-grounding": "grounding",
        "hv-dbr": "hv-dbr",
        "busbar-sizing": "busbar-sizing"
      };

      const reportType = typeMap[sel.report?.id] || "pv";

      const currentDocNo = values.DOCUMENT_NO || values.grounding_analysis_report_no || "PVI-GEN-001";
      const currentRev = values.REVISION || values.grounding_layout_drawing_no || "A";
      const currentTitle = values.REPORT_TITLE || values.reportTitle || loadedReportMeta?.report_title || sel.report?.name || "Engineering Report";
      const targetReportId = currentReportId;

      const valuesToPersist = { ...values };
      if (Array.isArray(valuesToPersist.appendixPages)) {
        if (valuesToPersist.appendixPages.length > 0) {
          valuesToPersist.hasSolarAppendix = true;
        }
        delete valuesToPersist.appendixPages;
      }

      const payload = {
        report_id: targetReportId,
        report_type: reportType,
        document_no: currentDocNo,
        revision: currentRev,
        prepared_date: values.PREPARATION_DATE || new Date().toISOString().split("T")[0],
        report_title: currentTitle,
        status: status || values.status || "draft",
        values: valuesToPersist,
        assigned_reviewer: values.assignedReviewer || loadedReportMeta?.assigned_reviewer || "Reviewer",
        assigned_creator: values.assignedCreator || loadedReportMeta?.assigned_creator || currentUser?.name || "Arman Shah",
        department: values.department || sel.vertical?.name || "Electrical",
        vertical: values.vertical || sel.sub?.name || "PV",
      };

      console.log("Saving report draft to database:", payload);
      const accessToken = session?.access_token || null;
      const res = await saveReportApi(payload, accessToken);
      if (res.success && res.report_id) {
        setCurrentReportId(res.report_id);
        setLoadedReportMeta({
          document_no: currentDocNo,
          revision: currentRev,
          report_title: currentTitle,
        });
        setDraftSync({
          dirty: false,
          saving: false,
          lastSavedAt: new Date(),
          error: null,
        });
        if (showSuccessAlert) {
          alert("Draft saved successfully to database!");
        }
        return res;
      }

      throw new Error("Database did not return a report id.");
    } catch (err) {
      console.error("Error saving draft:", err);
      setDraftSync((prev) => ({
        ...prev,
        saving: false,
        error: err.message,
      }));
      alert("Failed to save draft to database: " + err.message);
      throw err;
    }
  };

  const handleSaveDraft = async (values) => {
    try {
      await persistReportDraft(values, { status: "draft" });
    } catch (err) {
      // Error is already surfaced to the user by persistReportDraft.
    }
  };

  const handleGenerate = async (values) => {
    try {
      await persistReportDraft(values, { showSuccessAlert: false, status: "draft" });
    } catch (err) {
      console.warn("Auto-save draft on report generation warning:", err);
    }
    if (sel.vertical && sel.sub && sel.report) {
      navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/generating`);
    }
  };

  const handleGoDashboard = () => {
    resetDraftSync();
    setCurrentReportId(null);
    setSourceReportId(null);
    setLoadedReportMeta(null);
    navigate("/dashboard");
  };

  if (screen === "signin") {
    return (
      <SignIn
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignIn={() => setScreen("app")}
      />
    );
  }

  let crumbs = ["Home"];
  let main;

  if (sel.report) {
    crumbs = [
      sel.vertical.name,
      sel.sub.name,
      sel.report.name,
    ];

    if (phase === "select-client") {
      crumbs = [
        sel.vertical.name,
        sel.sub.name,
        sel.report.name,
        "Select Client",
      ];
      main = (
        <SelectClientScreen
          vertical={sel.vertical}
          sub={sel.sub}
          report={sel.report}
          user={currentUser}
          onSelectRecent={handleSelectRecent}
          onCloneReport={handleCloneReport}
          onAdvanceStage={handleAdvanceStage}
          onCloneToNewProject={handleCloneToNewProject}
          onCancel={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}`)}
          onContinue={(selectedClient) => {
            const clientPatch = {
              clientName: selectedClient.clientName || selectedClient.name || '',
              clientContact: selectedClient.clientContact || selectedClient.contact || '',
              clientEmail: selectedClient.clientEmail || selectedClient.email || '',
              clientAddress: selectedClient.clientAddress || selectedClient.address || '',
              clientLogo: selectedClient.clientLogo || selectedClient.logo || '',
              consultant: selectedClient.consultant || '',
              projectName: selectedClient.projectName || '',
              assignedReviewer: selectedClient.assignedReviewer || '',
              assignedCreator: selectedClient.assignedCreator || '',
              department: selectedClient.department || sel.vertical?.name || 'Electrical',
              vertical: selectedClient.vertical || sel.sub?.name || 'PV',
            };

            if (sel.report.id === 'bess-sizing') {
              setBessValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'bess-ampacity') {
              setBessAmpacityValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'bess-grounding') {
              setBessGroundingValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'hv-dbr') {
              setHvDbrValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'busbar-sizing') {
              setBusbarValues((prev) => ({ ...prev, ...clientPatch }));
            } else {
              setPvValues((prev) => ({ ...prev, ...clientPatch }));
            }

            navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`);
          }}
        />
      );
    } else if (phase === "generating") {

      if (sel.report.id === "bess-sizing") {
        main = (
          <BessGenerating
            values={bessValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      } else if (sel.report.id === "bess-ampacity") {
        main = (
          <BessAmpacityGenerating
            values={bessAmpacityValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      } else if (sel.report.id === "bess-grounding") {
        main = (
          <BessGroundingGenerating
            values={bessGroundingValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      } else if (sel.report.id === "hv-dbr") {
        main = (
          <HvDbrGenerating
            values={hvDbrValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      } else if (sel.report.id === "busbar-sizing") {
        main = (
          <BusbarGenerating
            values={busbarValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      } else {
        main = (
          <Generating
            values={pvValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      }

    } else if (phase === "preview") {

      if (sel.report.id === "bess-sizing") {

        main = (
          <BessPreview
            report={sel.report}
            reportId={currentReportId}
            user={currentUser}
            values={bessValues}
            bessFiles={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setBessValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );

      } else if (sel.report.id === "bess-ampacity") {

        main = (
          <BessAmpacityPreview
            reportId={currentReportId}
            user={currentUser}
            values={bessAmpacityValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setBessAmpacityValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );

      } else if (sel.report.id === "bess-grounding") {

        main = (
          <BessGroundingPreview
            reportId={currentReportId}
            user={currentUser}
            values={bessGroundingValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setBessGroundingValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );

      } else if (sel.report.id === "hv-dbr") {
        main = (
          <HvDbrPreview
            reportId={currentReportId}
            user={currentUser}
            values={hvDbrValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setHvDbrValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );
      } else if (sel.report.id === "busbar-sizing") {
        main = (
          <BusbarPreview
            reportId={currentReportId}
            user={currentUser}
            values={busbarValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setBusbarValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );
      } else {
        main = (
          <Preview
            report={sel.report}
            reportId={currentReportId}
            user={currentUser}
            values={pvValues}
            calc={pvCalc}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onAdvanceStage={handleAdvanceStage}
            onCloneToNewProject={handleCloneToNewProject}
            onSave={async (updatedValues) => {
              setPvValues(updatedValues);
              const targetStatus = updatedValues.status || "draft";
              return await persistReportDraft(updatedValues, { showSuccessAlert: false, status: targetStatus });
            }}
          />
        );
      }
    } else {
      if (sel.report.id === "bess-sizing") {
        main = (
          <BessFormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={bessValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setBessValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setBessValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            files={files}
            setFile={setFile}
            onGenerate={() => handleGenerate(bessValues)}
            onSaveDraft={handleSaveDraft}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(BESS_DEFAULTS).forEach(key => {
                const val = BESS_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setBessValues(cleared);
              setFiles({
                ...files,
                batteryDs: null,
                pcsDs: null,
                transformerDs: null
              });
            }}
          />
        );
      } else if (sel.report.id === "bess-ampacity") {
        main = (
          <BessAmpacityFormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={bessAmpacityValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setBessAmpacityValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setBessAmpacityValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            files={files}
            setFile={setFile}
            onGenerate={() => handleGenerate(bessAmpacityValues)}
            onSaveDraft={handleSaveDraft}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(BESS_AMPACITY_DEFAULTS).forEach(key => {
                const val = BESS_AMPACITY_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setBessAmpacityValues(cleared);
            }}
          />
        );
      } else if (sel.report.id === "bess-grounding") {
        main = (
          <BessGroundingFormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={bessGroundingValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setBessGroundingValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setBessGroundingValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            files={files}
            setFile={setFile}
            onGenerate={() => handleGenerate(bessGroundingValues)}
            onSaveDraft={handleSaveDraft}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(BESS_GROUNDING_DEFAULTS).forEach(key => {
                const val = BESS_GROUNDING_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setBessGroundingValues(cleared);
            }}
          />
        );
      } else if (sel.report.id === "hv-dbr") {
        main = (
          <HvDbrFormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={hvDbrValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setHvDbrValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setHvDbrValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            files={files}
            setFile={setFile}
            onGenerate={() => handleGenerate(hvDbrValues)}
            onSaveDraft={handleSaveDraft}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(HV_DBR_DEFAULTS).forEach(key => {
                const val = HV_DBR_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setHvDbrValues(cleared);
            }}
          />
        );
      } else if (sel.report.id === "busbar-sizing") {
        main = (
          <BusbarFormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={busbarValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setBusbarValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setBusbarValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            files={files}
            setFile={setFile}
            onGenerate={() => handleGenerate(busbarValues)}
            onSaveDraft={handleSaveDraft}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(BUSBAR_DEFAULTS).forEach(key => {
                const val = BUSBAR_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setBusbarValues(cleared);
            }}
          />
        );
      } else {
        main = (
          <FormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={pvValues}
            setValue={(k, v) => {
              markDraftDirty();
              if (typeof k === "object" && k !== null) {
                setPvValues(prev => ({
                  ...prev,
                  ...k,
                }));
              } else {
                setPvValues(prev => ({
                  ...prev,
                  [k]: v,
                }));
              }
            }}
            onClearAll={() => {
              markDraftDirty();
              const cleared = {};
              Object.keys(STRING_SIZE_DEFAULTS).forEach(key => {
                const val = STRING_SIZE_DEFAULTS[key];
                if (Array.isArray(val)) {
                  cleared[key] = [];
                } else if (typeof val === 'object' && val !== null) {
                  cleared[key] = {};
                } else {
                  cleared[key] = "";
                }
              });
              setPvValues(cleared);
              setFiles({
                moduleDs: null,
                inverterDs: null,
                vocCsv: null,
                batteryDs: null,
                pcsDs: null,
                transformerDs: null,
                pvsystReport: null
              });
            }}
            files={files}
            setFile={setFile}
            calc={pvCalc}
            layout={t.formLayout}
            showCalc={t.showCalc}
            onGenerate={() => handleGenerate(pvValues)}
            onSaveDraft={handleSaveDraft}
          />
        );
      }
    }

  } else if (sel.sub) {
    crumbs = [
      sel.vertical.name,
      sel.sub.name,
    ];

    main = (
      <ReportList
        vertical={sel.vertical}
        sub={sel.sub}
        onSelectReport={selectReport}
        onGoBack={() => selectVertical(sel.vertical)}
        onGoHome={handleGoDashboard}
      />
    );

  } else {
    main = (
      <Welcome
        user={currentUser}
        onSelectRecent={handleSelectRecent}
        onCloneReport={handleCloneReport}
        onAdvanceStage={handleAdvanceStage}
        onCloneToNewProject={handleCloneToNewProject}
        onStartAssignedProject={handleStartAssignedProject}
        sel={sel}
        onSelectVertical={selectVertical}
        onSelectSub={selectSub}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Sidebar
        sel={sel}
        onSelectReport={selectReport}
        onSelectSub={selectSub}
        onSelectVertical={selectVertical}
        user={currentUser}
        onGoDashboard={handleGoDashboard}

        query={query}
        setQuery={setQuery}
        collapsed={sidebarCollapsed}
        toggleCollapsed={toggleSidebar}
        onSignOut={async () => {
          await signOut();
          resetDraftSync();
          setCurrentReportId(null);
          setSourceReportId(null);
          navigate("/sign-in", { replace: true });
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Topbar
          crumbs={crumbs}
          theme={theme}
          onToggleTheme={toggleTheme}
          onGoDashboard={handleGoDashboard}
          right={
            sel.report && phase === "form" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {sourceReportId && (
                  <span
                    className="mono"
                    title={`Cloned from report ${sourceReportId}`}
                    style={{
                      fontSize: 11.5,
                      color: "var(--accent-text)",
                      background: "var(--accent-soft)",
                      padding: "6px 10px",
                      borderRadius: 999,
                      lineHeight: 1,
                    }}
                  >
                    Cloned draft
                  </span>
                )}
                <span
                  className="mono"
                  style={{
                    fontSize: 11.5,
                    color: draftSync.saving
                      ? "var(--amber-text)"
                      : draftSync.dirty
                        ? "var(--red-text)"
                        : "var(--green-text)",
                    background: draftSync.saving
                      ? "var(--amber-soft)"
                      : draftSync.dirty
                        ? "var(--red-soft)"
                        : "var(--green-soft)",
                    padding: "6px 10px",
                    borderRadius: 999,
                    lineHeight: 1,
                    marginRight: 4,
                  }}
                >
                  {draftSync.saving
                    ? "Saving to Supabase..."
                    : draftSync.dirty
                      ? "Unsaved changes"
                      : "Saved to Supabase"}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-3)",
                    marginRight: 4,
                  }}
                >
                  {t.formLayout} layout
                </span>
              </div>
            ) : null
          }
        />

        {main}
      </div>
    </div>
  );
}
