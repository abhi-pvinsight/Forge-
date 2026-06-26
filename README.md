# React + Vite
# Forge

> Engineering Design Basis Report Automation Platform

Forge is a React-based engineering report generation platform developed to automate the creation of standardized Design Basis Reports (DBRs) across multiple engineering disciplines.

The platform allows engineers to enter project data once, upload technical datasheets, perform engineering calculations, and generate professional reports with standardized formatting.

---

# Features

## Authentication

- Corporate Sign-In Screen
- Theme Support (Light / Dark)
- Dashboard Navigation

---

## Supported Engineering Verticals

### Electrical
- PV Design Basis Report
- BESS Design Basis Report
- String Sizing Report (In Progress)
- Cable Sizing Report
- Energy Yield Report (Planned)
- GCR Optimization (Planned)
- Lightning Protection Report (Planned)

### Civil
- Grading & Drainage Report
- Road Design Basis

### Structural
- Tracker Foundation
- Pile Foundation

The navigation system is completely data-driven, allowing additional reports to be added with minimal code changes.

---

# Current Modules

## PV Module

Current capabilities include

- Project Information
- Client Information
- Datasheet Upload
- Weather Data Upload
- PV Module Inputs
- Inverter Inputs
- String Sizing Calculations
- Report Preview
- PDF Generation

---

## BESS Module

Current capabilities include

- Client Information
- Project Information
- Site Conditions
- Electrical System
- Battery Information
- PCS Information
- Transformer Information
- Protection System
- Auxiliary System
- Civil Inputs
- Cable Information
- Geotechnical Inputs
- Datasheet Upload
- Report Generation

---

# Report Generation Workflow

```text
User Login
      │
      ▼
Dashboard
      │
      ▼
Select Report
      │
      ▼
Fill Engineering Forms
      │
      ▼
Upload Datasheets
      │
      ▼
Engineering Calculations
      │
      ▼
Generate HTML Report
      │
      ▼
Preview
      │
      ▼
Export PDF
```

---

# Project Structure

```
src/
│
├── app/
│
├── assets/
│
├── backend/
│
├── data/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── pv/
│   ├── bess/
│   ├── report-engine/
│   └── tweaks/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── contexts/
│   ├── styles/
│   └── utils/
│
└── App.jsx
```

---

# Technology Stack

Frontend

- React
- Vite
- JavaScript (ES6)
- HTML5
- CSS3

Libraries

- React Router
- html2pdf.js
- html2canvas
- jsPDF
- Papa Parse
- XLSX

Backend

- Python
- Flask / FastAPI
- ReportLab
- Pandas
- OpenPyXL

---

# Report Engine

The report engine supports:

- Dynamic HTML Templates
- Placeholder Replacement
- Calculation Injection
- Dynamic Tables
- Multi-page Reports
- Cover Pages
- Table of Contents
- Appendix Generation
- PDF Export

---

# Engineering Calculations

Forge separates calculations from the UI.

```
Forms
    │
    ▼
Calculation Engine
    │
    ▼
Template Values
    │
    ▼
HTML Templates
    │
    ▼
PDF
```

This architecture allows engineering calculations to remain reusable across different reports.

---

# Navigation Architecture

The dashboard is generated entirely from a navigation configuration.

```
Vertical
    ├── Discipline
            ├── Report
```

Example

```
Electrical
    ├── PV
            ├── PV Design Basis
            ├── String Sizing
    ├── BESS
            ├── BESS Sizing
```

---

# Development

Clone the repository

```bash
git clone https://github.com/<your-org>/forge.git
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Build production

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

# Future Roadmap

- Multi-Agent Engineering Assistant
- Automatic Datasheet Parsing
- AI-Assisted Field Population
- DOCX Export
- Excel Report Export
- Report Versioning
- Project Database
- Digital Signatures
- Multi-user Collaboration
- Cloud Deployment
- Report Templates Marketplace

---

# Design Philosophy

Forge follows three principles:

- Enter data once.
- Automate engineering calculations.
- Produce standardized reports every time.

---

# License

Internal Project

© PVinsight Inc.
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
