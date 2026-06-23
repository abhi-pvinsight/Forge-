import React from 'react';
import { CoverPage } from './CoverPage';
import { DocumentControlPage } from './DocumentControlPage';
import { TableOfContents } from './TableOfContents';
import { ListOfTables } from './ListOfTables';

export const ReportShell = ({
  metaData,
  docControl,
  tocHeadings,
  lotTables,
  children, // Accepts Report Body content natively
  annexures = []
}) => {
  return (
    <div className="forge-report-shell" style={shellStyles.shell}>
      {/* 1. Cover Page */}
      <CoverPage {...metaData} />

      {/* 2. Document Control Page */}
      <DocumentControlPage {...docControl} />

      {/* 3. Table of Contents */}
      <TableOfContents headings={tocHeadings} />

      {/* 4. List of Tables */}
      {lotTables && lotTables.length > 0 && (
        <ListOfTables tables={lotTables} />
      )}

      {/* 5. Report Body */}
      <main className="report-body" style={shellStyles.bodyContainer}>
        {children}
      </main>

      {/* 6. Annexures */}
      {annexures && annexures.length > 0 && (
        <div className="report-annexures">
          {annexures.map((annexure, index) => (
            <div key={index} className="report-page annexure-page" style={shellStyles.annexurePage}>
              <div style={shellStyles.annexureHeader}>
                <h2 style={shellStyles.annexureTitle}>{annexure.id}: {annexure.title}</h2>
              </div>
              <hr style={shellStyles.divider} />
              <div style={shellStyles.annexureContent}>
                {annexure.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const shellStyles = {
  shell: {
    width: '100%',
    backgroundColor: '#ffffff',
    margin: '0 auto'
  },
  bodyContainer: {
    display: 'block'
  },
  annexurePage: {
    padding: '3.5rem',
    height: '100%',
    boxSizing: 'border-box',
    pageBreakAfter: 'always',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  annexureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  annexureTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  divider: {
    border: 'none',
    height: '1px',
    backgroundColor: '#cbd5e1',
    margin: '1rem 0 2rem 0'
  },
  annexureContent: {
    marginTop: '1.5rem'
  }
};