import React from "react";
import ReportPreviewShell from "../../../../../shared/components/ReportPreviewShell";
import HvDbrReportDoc from "./HvDbrReportDoc.jsx";

export default function HvDbrPreview({ values, files, user, reportId, onBack, onNew, onCloneToRevision, onAdvanceStage, onCloneToNewProject, onSave }) {
    const docNo = values.documentNo || "PVI-HV-DBR-001";
    const fname = docNo + '.docx';
    
    const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const V = (val) => (val === null || val === undefined || val === "") ? "—" : val;

    const documentDetails = [
        ['Project', V(values.projectName)],
        ['Client', V(values.clientName)],
        ['Revision', V(values.revision)],
        ['POI Voltage', V(values.poi_voltage) ? V(values.poi_voltage) + ' kV' : '—'],
        ['Pages', '4'],
        ['Generated', TODAY]
    ];

    return (
        <ReportPreviewShell
            reportElementId="hv-dbr-report"
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
        >
            {({ showStamp, isEditMode, tempHtml, setTempHtml }) => (
                <HvDbrReportDoc 
                    values={values} 
                    files={files} 
                    showStamp={showStamp} 
                    isEditMode={isEditMode}
                    customHtml={tempHtml}
                    onHtmlChange={setTempHtml}
                />
            )}
        </ReportPreviewShell>
    );
}
