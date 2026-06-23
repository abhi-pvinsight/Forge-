import { useState, useEffect, useMemo } from "react";

import SignIn from "../features/auth/components/SignIn";

import Sidebar from "../features/dashboard/components/Sidebar";
import Topbar from "../features/dashboard/components/Topbar";
import Welcome from "../features/dashboard/components/Welcome";
import ReportList from "../features/dashboard/components/ReportList";

import FormScreen from "../features/pv/components/FormScreen.jsx";
import Generating from "../features/pv/reports/Generating.jsx";
import Preview from "../features/pv/reports/Preview.jsx";
import BessPreview from "../features/bess/reports/BessPreview";

import { USER } from "../data/constants";

import { STRING_SIZE_DEFAULTS } from "../features/pv/forms/stringSizingDefaults.js";
import computeStringSizing from "../features/pv/calculations/stringSizing";

import { findReport } from "../data/navigation";

import BessFormScreen from "../features/bess/components/BessFormScreen";
import { BESS_DEFAULTS } from "../features/bess/forms/bessDefaults";
import BessGenerating from "../features/bess/reports/bessGenerating.jsx";
import BessReportDoc from "../features/bess/reports/BessReportDoc.jsx";


export default function App() {
  // const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // temorary 



  const t = {
    formLayout: "tabbed", showCalc: true, accent: "default", docFont: "sans",
  };

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
      } catch { }

      return next;
    });
  };

  const [screen, setScreen] = useState("signin");

  const [sel, setSel] = useState({
    vertical: null,
    sub: null,
    report: null,
  });

  const [phase, setPhase] = useState("form");

  const [query, setQuery] = useState("");


  const [pvValues, setPvValues] = useState({
    ...STRING_SIZE_DEFAULTS,
  });

  const [bessValues, setBessValues] = useState({
    ...BESS_DEFAULTS,
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
      : pvValues;

  const currentFiles = files;

  const setValue = (key, value) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setFile = (key, value) => {
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
    const { vertical, sub, report } = findReport(
      verticalId,
      subId,
      reportId
    );

    setSel({
      vertical,
      sub,
      report,
    });

    setPhase("form");

  };

  const selectSub = (verticalId, subId) => {
    const { vertical, sub } = findReport(
      verticalId,
      subId,
      null
    );

    setSel({
      vertical,
      sub,
      report: null,
    });

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

    if (phase === "generating") {

      if (sel.report.id === "bess-sizing") {
        main = (
          <BessGenerating
            values={bessValues}
            onDone={() => setPhase("preview")}
          />
        );
      } else {
        main = (
          <Generating
            values={pvValues}
            onDone={() => setPhase("preview")}
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
            onBack={() => setPhase("form")}
            onNew={() =>
              setSel({
                vertical: null,
                sub: null,
                report: null,
              })
            }
          />
        );

      } else {

        main = (
          <Preview
            report={sel.report}
            values={currentValues}
            calc={pvCalc}
            files={currentFiles}
            onBack={() => setPhase("form")}
            onNew={() =>
              setSel({
                vertical: null,
                sub: null,
                report: null,
              })
            }
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
            setValue={(k, v) =>
              setBessValues(prev => ({
                ...prev,
                [k]: v,
              }))
            }
            files={files}
            // files={bessFiles}
            setFile={(k, v) =>
              setBessFiles(prev => ({
                ...prev,
                [k]: v,
              }))
            }
            onGenerate={() => setPhase("generating")}
          />
        );
      } else {
        main = (
          <FormScreen
            report={sel.report}
            vertical={sel.vertical}
            sub={sel.sub}
            values={pvValues}
            setValue={(k, v) =>
              setPvValues(prev => ({
                ...prev,
                [k]: v,
              }))
            }
            files={files}
            files={currentFiles}
            setFile={setFile}
            calc={pvCalc}
            layout={t.formLayout}
            showCalc={t.showCalc}
            onGenerate={() => setPhase("generating")}
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
      />
    );

  } else {
    main = <Welcome user={USER} />;
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
        user={USER}

        query={query}
        setQuery={setQuery}
        collapsed={sidebarCollapsed}
        toggleCollapsed={toggleSidebar}
        onSignOut={() => {
          setScreen("signin");

          setSel({
            vertical: null,
            sub: null,
            report: null,
          });
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
          right={
            sel.report && phase === "form" ? (
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
