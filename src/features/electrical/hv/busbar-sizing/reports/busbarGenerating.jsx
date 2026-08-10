import React from 'react';
import ReportGenerating from "../../../../../shared/components/ReportGenerating";

export default function BusbarGenerating({ values = {}, onDone }) {
  const steps = [
    'Validating system voltage and short-circuit ratings',
    'Calculating DC resistance (R) & skin effect factor (F)',
    'Computing forced convection (qc) and thermal radiation (qr)',
    'Calculating solar incidence angle (θ) and solar heat gain (qs)',
    'Evaluating continuous ampacity (I) & short-circuit withstand (I\'sc)',
    'Generating IEEE 605-2023 document report'
  ];

  const docNo = values.documentNo || values.projectCode || "PVI-BUS-001";
  const fname = docNo.endsWith('.docx') ? docNo : docNo + '.docx';

  return (
    <ReportGenerating
      fname={fname}
      steps={steps}
      onDone={onDone}
      speed={480}
    />
  );
}
