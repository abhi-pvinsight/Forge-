import React from "react";
import ReportPreviewShell from "../../../../../shared/components/ReportPreviewShell";
import BusbarReportDoc from "./BusbarReportDoc";

export default function BusbarPreview({ values = {}, files = {}, user, reportId, onBack, onNew, onCloneToRevision, onAdvanceStage, onCloneToNewProject, onSave }) {
    const docNo = values.documentNo || values.projectCode || "PVI-BUS-001";
    const fname = (docNo.endsWith('.docx') ? docNo : docNo + '.docx');

    const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const V = (val) => (val === null || val === undefined || val === "") ? "—" : val;

    const documentDetails = [
        ['Project', V(values.projectName)],
        ['Client', V(values.clientName)],
        ['Revision', V(values.revision)],
        ['System Voltage', V(values.systemVoltageKV) ? V(values.systemVoltageKV) + ' kV' : '—'],
        ['Tube Size', V(values.conductorType)],
        ['Pages', '4'],
        ['Generated', TODAY]
    ];

    return (
        <ReportPreviewShell
            reportElementId="busbar-sizing-report"
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
                <BusbarReportDoc 
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
