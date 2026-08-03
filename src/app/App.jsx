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


export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut, user: authUser } = useAuth();
  // const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // temorary 



  const t = {
    formLayout: "tabbed", showCalc: true, accent: "default", docFont: "sans",
  };

  const currentUser = authUser
    ? {
        ...USER,
        name: authUser.full_name || authUser.email || USER.name,
        initials: (authUser.full_name || authUser.email || USER.name)
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
          || USER.initials,
        role: authUser.department || authUser.role || USER.role,
        email: authUser.email || "",
      }
    : USER;

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
    } catch (e) {}
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
    } catch (e) {}
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

  const selectReport = (verticalId, subId, reportId) => {
    const v = typeof verticalId === 'object' ? verticalId?.id : verticalId;
    const s = typeof subId === 'object' ? subId?.id : subId;
    const r = typeof reportId === 'object' ? reportId?.id : reportId;
    setCurrentReportId(null);
    setSourceReportId(null);
    setLoadedReportMeta(null);
    resetDraftSync();
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
    }

    const inputs = detail.inputs || {};
    // Extract nested details if returned in single RPC json structure
    const details = inputs.details || inputs;

    const metadata = detail.metadata || {};
    const metadata_json = metadata.metadata_json || {};

    if (recentMeta.report_type === "grounding") {
      setBessGroundingValues(prev => ({ ...prev, ...metadata_json, ...details }));
    } else if (recentMeta.report_type === "cable") {
      setBessAmpacityValues(prev => ({ ...prev, ...metadata_json, ...details }));
    } else if (recentMeta.report_type === "battery") {
      setBessValues(prev => ({ ...prev, ...metadata_json, ...details }));
    } else if (recentMeta.report_type === "hv-dbr") {
      setHvDbrValues(prev => ({ ...prev, ...metadata_json, ...details }));
    } else {
      const flatPv = flattenPvReport(details);
      setPvValues(prev => ({ ...prev, ...metadata_json, ...flatPv }));
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

  const handleCloneToRevision = (newRev, description) => {
    const currentValues = {
      "bess-sizing": bessValues,
      "bess-ampacity": bessAmpacityValues,
      "bess-grounding": bessGroundingValues,
      "hv-dbr": hvDbrValues,
      "string-sizing": pvValues
    }[sel.report.id] || pvValues;

    const todayStr = new Date().toLocaleDateString("en-GB").replaceAll("/", ".");
    const reportTitle = currentValues.reportTitle || currentValues.reportName || sel.report?.name || "Engineering Report";
    const newRow = {
      revision: newRev,
      issueDate: todayStr,
      documentName: reportTitle,
      description: description
    };

    const oldHistory = Array.isArray(currentValues.revisions) ? currentValues.revisions : [];
    const currentRev = currentValues.revision || "0";
    const hasCurrentInHistory = oldHistory.some(r => r.revision === currentRev);
    const updatedHistory = [...oldHistory];

    if (!hasCurrentInHistory && oldHistory.length === 0) {
      updatedHistory.push({
        revision: currentRev,
        issueDate: currentValues.issueDate || todayStr,
        documentName: reportTitle,
        description: "Initial Release"
      });
    }

    updatedHistory.push(newRow);

    const newValues = {
      ...currentValues,
      revision: newRev,
      issueDate: todayStr,
      revisions: updatedHistory,
      custom_html: null
    };

    if (sel.report.id === "bess-sizing") {
      setBessValues(newValues);
    } else if (sel.report.id === "bess-ampacity") {
      setBessAmpacityValues(newValues);
    } else if (sel.report.id === "bess-grounding") {
      setBessGroundingValues(newValues);
    } else if (sel.report.id === "hv-dbr") {
      setHvDbrValues(newValues);
    } else {
      setPvValues(newValues);
    }

    setSourceReportId(currentReportId);
    setCurrentReportId(null);
    setLoadedReportMeta(null);
    if (sel.vertical && sel.sub && sel.report) {
      navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`);
    }
    setDraftSync({
      dirty: true,
      saving: false,
      lastSavedAt: null,
      error: null,
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
        "hv-dbr": "hv-dbr"
      };

      const reportType = typeMap[sel.report?.id] || "pv";

      const currentDocNo = values.DOCUMENT_NO || values.grounding_analysis_report_no || "PVI-GEN-001";
      const currentRev = values.REVISION || values.grounding_layout_drawing_no || "A";
      const currentTitle = values.plant_name || values.projectName || values.projectTitle || values.REPORT_TITLE || sel.report?.name || "Engineering Report";

      const isVersionChanged = loadedReportMeta && (
        loadedReportMeta.document_no !== currentDocNo ||
        loadedReportMeta.revision !== currentRev ||
        loadedReportMeta.report_title !== currentTitle
      );

      // If version details changed, save as a new report
      const targetReportId = isVersionChanged ? null : currentReportId;

      // Legacy PV reports stored every appendix page as a base64 image. Keep
      // only the small source values needed to regenerate the native PDF.
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
        status,
        values: valuesToPersist
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
          alert("Draft saved successfully to Supabase database!");
        }
        return res;
      }

      throw new Error("Supabase did not return a report id.");
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
    } catch {
      // Error is already surfaced to the user by persistReportDraft.
    }
  };

  const handleGenerate = (values) => {
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
          onSelectRecent={handleSelectRecent}
          onCloneReport={handleCloneReport}
          onCancel={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}`)}
          onContinue={(selectedClient) => {
            const clientPatch = {
              clientName: selectedClient.clientName || selectedClient.name || '',
              clientContact: selectedClient.clientContact || selectedClient.contact || '',
              clientEmail: selectedClient.clientEmail || selectedClient.email || '',
              clientAddress: selectedClient.clientAddress || selectedClient.address || '',
              consultant: selectedClient.consultant || '',
            };

            if (sel.report.id === 'bess-sizing') {
              setBessValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'bess-ampacity') {
              setBessAmpacityValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'bess-grounding') {
              setBessGroundingValues((prev) => ({ ...prev, ...clientPatch }));
            } else if (sel.report.id === 'hv-dbr') {
              setHvDbrValues((prev) => ({ ...prev, ...clientPatch }));
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
      } else {
        main = (
          <Generating
            values={pvValues}
            onDone={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}/preview`)}
          />
        );
      }

    }

    else if (phase === "preview") {

      if (sel.report.id === "bess-sizing") {

        main = (
          <BessPreview
            report={sel.report}
            values={currentValues}
            bessValues={bessValues}
            //bessFiles={bessFiles}
            bessFiles={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onSave={async (updatedValues) => {
              setBessValues(updatedValues);
              return await persistReportDraft(updatedValues, { showSuccessAlert: true, status: "completed" });
            }}
          />
        );

      } else if (sel.report.id === "bess-ampacity") {

        main = (
          <BessAmpacityPreview
            values={currentValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onSave={async (updatedValues) => {
              setBessAmpacityValues(updatedValues);
              return await persistReportDraft(updatedValues, { showSuccessAlert: true, status: "completed" });
            }}
          />
        );

      } else if (sel.report.id === "bess-grounding") {

        main = (
          <BessGroundingPreview
            values={currentValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onSave={async (updatedValues) => {
              setBessGroundingValues(updatedValues);
              return await persistReportDraft(updatedValues, { showSuccessAlert: true, status: "completed" });
            }}
          />
        );

      } else if (sel.report.id === "hv-dbr") {
        main = (
          <HvDbrPreview
            values={currentValues}
            files={files}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onSave={async (updatedValues) => {
              setHvDbrValues(updatedValues);
              return await persistReportDraft(updatedValues, { showSuccessAlert: true, status: "completed" });
            }}
          />
        );
      } else {
        main = (
          <Preview
            report={sel.report}
            values={currentValues}
            calc={pvCalc}
            files={currentFiles}
            onBack={() => navigate(`/dashboard/${sel.vertical.id}/${sel.sub.id}/${sel.report.id}`)}
            onNew={handleGoDashboard}
            onCloneToRevision={handleCloneToRevision}
            onSave={async (updatedValues) => {
              setPvValues(updatedValues);
              return await persistReportDraft(updatedValues, { showSuccessAlert: true, status: "completed" });
            }}
          />
        );
      }
    }

    else {
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

          setSel({
            vertical: null,
            sub: null,
            report: null,
          });
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
      {/* <TweaksPanel>
  */}

    </div>
  );
}
