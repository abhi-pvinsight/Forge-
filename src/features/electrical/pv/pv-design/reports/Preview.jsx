import React from "react";
import ReportPreviewShell from "../../../../../shared/components/ReportPreviewShell";
import { docNumber } from "../forms/utils/docNumber.js";
import ReportDoc from "./ReportDoc.jsx";

export default function Preview({ values, calc, files, user, reportId, onBack, onNew, onCloneToRevision, onAdvanceStage, onCloneToNewProject, onSave }) {
  const fname = docNumber(values) + '.docx';
  
  const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const V = (val) => (val === null || val === undefined || val === "") ? "—" : val;

  const documentDetails = [
    ['Project', V(values.projectName)],
    ['Client', V(values.clientName)],
    ['Revision', V(values.revision)],
    ['String size', calc.valid && calc.feasible ? calc.recommended + ' modules' : '—'],
    ['Pages', '3'],
    ['Generated', TODAY]
  ];

  return (
    <ReportPreviewShell
      reportElementId="PV_DBR-report"
      values={values}
      files={files}
      user={user}
      reportId={reportId}
      onBack={onBack}
      onNew={onNew}
      onCloneToRevision={onCloneToRevision}
      onAdvanceStage={onAdvanceStage}
      onCloneToNewProject={onCloneToNewProject}
      onSave={onSave}
      fname={fname}
      documentDetails={documentDetails}
      showStampOption={true}
      railCollapsible={true}
      pdfExportOptions={{
        includeSolarAppendix: Boolean(
          values.hasSolarAppendix ||
          values.solarAppendixValues ||
          values.appendixPages?.length
        ),
        solarAppendixValues: values,
      }}
    >
      {({ showStamp, isEditMode, tempHtml, setTempHtml }) => (
        <ReportDoc 
          values={values} 
          calc={calc} 
          files={files} 
          solarCalcValues={values?.solarCalcValues} 
          showStamp={showStamp} 
          isEditMode={isEditMode}
          customHtml={tempHtml}
          onHtmlChange={setTempHtml}
        />
      )}
    </ReportPreviewShell>
  );
}
