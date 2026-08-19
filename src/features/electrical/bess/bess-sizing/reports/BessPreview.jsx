import React from "react";
import ReportPreviewShell from "../../../../../shared/components/ReportPreviewShell";
import { bessDocNumber } from "../forms/utils/bessDocNumber.js";
import BessReportDoc from "./BessReportDoc.jsx";

export default function BessPreview({ values, calc, files, bessFiles, user, reportId, onBack, onNew, onCloneToRevision, onAdvanceStage, onCloneToNewProject, onSave }) {
    const fname = bessDocNumber(values) + '.docx';
    const activeFiles = files || bessFiles;

    const TODAY = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const V = (val) => (val === null || val === undefined || val === "") ? "—" : val;

    const documentDetails = [
        ['Project', V(values.projectName)],
        ['Client', V(values.clientName)],
        ['Revision', V(values.revision)],
        ['Pages', '3'],
        ['Generated', TODAY]
    ];

    return (
        <ReportPreviewShell
            reportElementId="bess-report"
            values={values}
            files={activeFiles}
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
                <BessReportDoc
                    values={values}
                    files={activeFiles}
                    showStamp={showStamp}
                    isEditMode={isEditMode}
                    customHtml={tempHtml}
                    onHtmlChange={setTempHtml}
                />
            )}
        </ReportPreviewShell>
    );
}
