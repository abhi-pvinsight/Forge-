import os
import io
import traceback
# from flask import Flask, request, send_file, jsonify
# from flask_cors import CORS
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# app = Flask(__name__)
# Allows secure cross-origin requests from your React frontend
# CORS(app) 


# Replace your current _parse_float with this robust version
def _parse_float(value, default=0.0):
    if value is None or value == "":
        return float(default)
    try:
        # Convert to string and strip out common units/whitespace
        clean_val = str(value).replace("Wp", "").replace("W", "").replace("V", "").replace("A", "").replace("%", "").strip()
        return float(clean_val)
    except (TypeError, ValueError):
        return float(default)


def _parse_int(value, default=0):
    if value is None or value == "":
        return int(default)
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def _fallback_value(data, *keys, default=None):
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default

def _parse_float(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default

def build_solar_report_data(data):
    print("build_solar_report_data: start")
    
    if not isinstance(data, dict):
        data = {}
        
    # 1. Clear out whitespace and lowercase all incoming keys
    data_clean = {str(k).lower().strip(): v for k, v in data.items()}
    print("Cleaned incoming payload keys:", list(data_clean.keys()))
    
    # 2. Extract all 6 dynamic variants from your Excel matrix (Rows 2 to 7)
    base_models = [
        f"{_parse_float(data_clean.get('wp_1'), 100):.0f} Wp",
        f"{_parse_float(data_clean.get('wp_2'), 1):.0f} Wp",
        f"{_parse_float(data_clean.get('wp_3'), 700):.0f} Wp",
        f"{_parse_float(data_clean.get('wp_4'), 300):.0f} Wp",
        f"{_parse_float(data_clean.get('wp_5'), 450):.0f} Wp",
        f"{_parse_float(data_clean.get('wp_6'), 600):.0f} Wp",
    ]

    Pstc = [
        _parse_float(data_clean.get('pstc_1'), 120),
        _parse_float(data_clean.get('pstc_2'), 1),
        _parse_float(data_clean.get('pstc_3'), 220),
        _parse_float(data_clean.get('pstc_4'), 3),
        _parse_float(data_clean.get('pstc_5'), 4),
        _parse_float(data_clean.get('pstc_6'), 5),
    ]
    
    Voc_front = [
        _parse_float(data_clean.get('voc_1'), 252),
        _parse_float(data_clean.get('voc_2'), 447),
        _parse_float(data_clean.get('voc_3'), 6),
        _parse_float(data_clean.get('voc_4'), 3),
        _parse_float(data_clean.get('voc_5'), 410),
        _parse_float(data_clean.get('voc_6'), 5),
    ]
    
    Vmp_front = [
        _parse_float(data_clean.get('vmp_1'), 336),
        _parse_float(data_clean.get('vmp_2'), 44),
        _parse_float(data_clean.get('vmp_3'), 897),
        _parse_float(data_clean.get('vmp_4'), 334),
        _parse_float(data_clean.get('vmp_5'), 4),
        _parse_float(data_clean.get('vmp_6'), 254),
    ]
    
    Isc_front = [
        _parse_float(data_clean.get('isc_1'), 77),
        _parse_float(data_clean.get('isc_2'), 751),
        _parse_float(data_clean.get('isc_3'), 2),
        _parse_float(data_clean.get('isc_4'), 3),
        _parse_float(data_clean.get('isc_5'), 4),
        _parse_float(data_clean.get('isc_6'), 5),
    ]
    
    Imp_front = [
        _parse_float(data_clean.get('imp_1'), 22),
        _parse_float(data_clean.get('imp_2'), 1),
        _parse_float(data_clean.get('imp_3'), 572),
        _parse_float(data_clean.get('imp_4'), 535),
        _parse_float(data_clean.get('imp_5'), 255),
        _parse_float(data_clean.get('imp_6'), 5),
    ]

    print("Calculated arrays matching Excel:", Pstc, Voc_front, Vmp_front, Isc_front, Imp_front)
    
    # Environment/Temperature Coeff constants from your Excel (Rows 9, 10, 11)
    bgf = 0.80 
    TcVoc = _parse_float(data_clean.get('temp_coeff_voc'), -0.25)
    TcPmp = _parse_float(data_clean.get('temp_coeff_pm'), -0.30)
    TcIsc = _parse_float(data_clean.get('temp_coeff_isc'), 0.046)

    Tmin = _parse_float(data_clean.get('tempmin'), -5.0)
    Tmax = _parse_float(data_clean.get('tempmax'), 32.0)
    Tstc = 25.0 
    Vmax_system = 1500.0 
    Trise = 25.0
    
    # 3. Dynamic Loops Scaling Automatically across all 6 columns
    Pstc_bgf = [p * (1 + (bgf/100)) for p in Pstc]
    Voc_bgf = list(Voc_front) 
    Vmp_bgf = list(Vmp_front)
    
    pct_Vmp = TcPmp * (Tmax + Trise - Tstc)
    Vmp_Tmax = [vmp * (1 + (pct_Vmp / 100)) for vmp in Vmp_bgf]
    
    pct_Voc = TcVoc * (Tmin - Tstc)
    Voc_Tmin = [voc * (1 + (pct_Voc / 100)) for voc in Voc_bgf]
    
    pct_Imp = TcIsc * (Tmax - Tstc)
    # Using a 6-item default fallback list for missing specific array documents
    Imp_bgf_doc = [11.82, 11.90, 11.86, 11.94, 11.98, 12.00] 
    Imp_Tmax = [imp * (1 + (pct_Imp / 100)) for imp in Imp_bgf_doc]
    
    pct_Isc = TcIsc * (Tmax - Tstc)
    Isc_bgf_doc = [12.63, 12.71, 12.67, 12.75, 12.79, 12.85]
    Isc_Tmax = [isc * (1 + (pct_Isc / 100)) for isc in Isc_bgf_doc]
    
    total_modules_series = [Vmax_system / voc_t if voc_t != 0 else 0.0 for voc_t in Voc_Tmin]
    selected_modules = [28] * len(base_models)
    max_voc_selected = [m * voc_t for m, voc_t in zip(selected_modules, Voc_Tmin)]

    # Format JSON safe calc rows
    calc_rows = [
        ["%Vmp = TcPmp * (Tmax + Trise - Tstc)", *[f"{pct_Vmp:.2f}" for _ in range(len(base_models))], "%"],
        ["Vmp @ Tmax = Vmp * (1 + %Vmp)", *[f"{v:.2f}" for v in Vmp_Tmax], "V"],
        ["%Voc = TcVoc * (Tmin - Tstc)", *[f"{pct_Voc:.2f}" for _ in range(len(base_models))], "%"],
        ["Voc @ Tmin = VocBGF * (1 + %Voc)", *[f"{v:.2f}" for v in Voc_Tmin], "V"],
        ["%Imp = TcIsc * (Tmax - Tstc)", *[f"{pct_Imp:.2f}" for _ in range(len(base_models))], "%"],
        ["Imp @ Tmax = Imp@BGF * (1 + %Imp)", *[f"{i:.2f}" for i in Imp_Tmax], "A"],
        ["%Isc = TcIsc * (Tmax - Tstc)", *[f"{pct_Isc:.2f}" for _ in range(len(base_models))], "%"],
        ["Isc @ Tmax = Isc@BGF * (1 + %Isc)", *[f"{i:.2f}" for i in Isc_Tmax], "A"],
        ["Total No of Modules in series (Max limit)", *[f"{t:.2f}" for t in total_modules_series], "no."],
        ["Selected no of modules in series", *[str(m) for m in selected_modules], "no."],
        ["Maximum Voc with selected modules", *[f"{v:.0f}" for v in max_voc_selected], "V"],
    ]

    report_data = {
        "base_models": base_models,
        "Pstc": Pstc,
        "Voc_front": Voc_front,
        "Vmp_front": Vmp_front,
        "Isc_front": Isc_front,
        "Imp_front": Imp_front,
        "bgf": bgf,
        "TcPmp": TcPmp,
        "TcVoc": TcVoc,
        "TcIsc": TcIsc,
        "Vmax_system": Vmax_system,
        "Tmax": Tmax,
        "Tmin": Tmin,
        "pct_Vmp": pct_Vmp,
        "Vmp_Tmax": Vmp_Tmax,
        "pct_Voc": pct_Voc,
        "Voc_Tmin": Voc_Tmin,
        "pct_Imp": pct_Imp,
        "Imp_Tmax": Imp_Tmax,
        "pct_Isc": pct_Isc,
        "Isc_Tmax": Isc_Tmax,
        "total_modules_series": total_modules_series,
        "selected_modules": selected_modules,
        "max_voc_selected": max_voc_selected,
        "calc_table": {
            "title": "Temperature Corrected & String Sizing Calculations (Dynamically Computed)",
            "headers": ["Calculated Operational Metrics", *base_models, "Unit"],
            "rows": calc_rows
        },
        "calc_values": {
            "pct_Vmp": pct_Vmp,
            "pct_Voc": pct_Voc,
            "pct_Imp": pct_Imp,
            "pct_Isc": pct_Isc,
            "Vmp_Tmax": Vmp_Tmax,
            "Voc_Tmin": Voc_Tmin,
            "Imp_Tmax": Imp_Tmax,
            "Isc_Tmax": Isc_Tmax,
            "total_modules_series": total_modules_series,
            "selected_modules": selected_modules,
            "max_voc_selected": max_voc_selected,
        }
    }
    return report_data

def build_solar_report_pdf(report_data, filename):
    print("build_solar_report_pdf: start")
    
    # Safely unpack arrays and scalars from the data structure
    base_models = report_data["base_models"]
    Pstc = report_data["Pstc"]
    Voc_front = report_data["Voc_front"]
    Vmp_front = report_data["Vmp_front"]
    Isc_front = report_data["Isc_front"]
    Imp_front = report_data["Imp_front"]
    bgf = report_data["bgf"]
    TcPmp = report_data["TcPmp"]
    TcVoc = report_data["TcVoc"]
    TcIsc = report_data["TcIsc"]
    Vmax_system = report_data["Vmax_system"]
    Tmax = report_data["Tmax"]
    Tmin = report_data["Tmin"]
    
    pct_Vmp = report_data["pct_Vmp"]
    Vmp_Tmax = report_data["Vmp_Tmax"]
    pct_Voc = report_data["pct_Voc"]
    Voc_Tmin = report_data["Voc_Tmin"]
    pct_Imp = report_data["pct_Imp"]
    Imp_Tmax = report_data["Imp_Tmax"]
    pct_Isc = report_data["pct_Isc"]
    Isc_Tmax = report_data["Isc_Tmax"]
    total_modules_series = report_data["total_modules_series"]
    selected_modules = report_data["selected_modules"]
    max_voc_selected = report_data["max_voc_selected"]

    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor("#1A365D"), spaceAfter=12)
    section_style = ParagraphStyle('SecHead', parent=styles['Heading2'], fontSize=12, leading=15, textColor=colors.HexColor("#2C5282"), spaceBefore=12, spaceAfter=6)
    th_style = ParagraphStyle('TH', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    td_style = ParagraphStyle('TD', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor("#2D3748"))
    td_bold = ParagraphStyle('TDBold', parent=styles['Normal'], fontSize=8, leading=10, fontName='Helvetica-Bold', textColor=colors.HexColor("#1A365D"))

    def wrap(txt, is_header=False, is_bold=False):
        style = th_style if is_header else (td_bold if is_bold else td_style)
        return Paragraph(str(txt), style)

    story.append(Paragraph("String Sizing Calculation Report", title_style))
    story.append(Spacer(1, 8))
    
    # Table 1: Technical Specs (Fixed repeated column loops to use len(base_models))
    story.append(Paragraph("1. Solar Photovoltaic Module Technical Specification (Waaree)", section_style))
    tech_data = [
        [wrap("Module Parameter", True)] + [wrap(m, True) for m in base_models] + [wrap("Unit", True)],
        [wrap("Module Rated Power")] + [wrap(f"{p:.0f}") for p in Pstc] + [wrap("Wp")],
        [wrap("Pstc (Front Side)")] + [wrap(f"{p:.0f}") for p in Pstc] + [wrap("Wp")],
        [wrap("Voc (Front Side)")] + [wrap(f"{v:.2f}") for v in Voc_front] + [wrap("V")],
        [wrap("Vmp (Front Side)")] + [wrap(f"{v:.2f}") for v in Vmp_front] + [wrap("V")],
        [wrap("Isc (Front Side)")] + [wrap(f"{i:.2f}") for i in Isc_front] + [wrap("A")],
        [wrap("Imp (Front Side)")] + [wrap(f"{i:.2f}") for i in Imp_front] + [wrap("A")],
        [wrap("Bifacial Gain Factor (BGF)")] + [wrap(f"{bgf:.2f}") for _ in range(len(base_models))] + [wrap("%")],
        [wrap("TcPmp")] + [wrap(f"{TcPmp:.2f}") for _ in range(len(base_models))] + [wrap("%/°C")],
        [wrap("TcVoc")] + [wrap(f"{TcVoc:.3f}") for _ in range(len(base_models))] + [wrap("%/°C")],
        [wrap("TcIsc")] + [wrap(f"{TcIsc:.2f}") for _ in range(len(base_models))] + [wrap("%/°C")],
        [wrap("Vmax")] + [wrap(f"{Vmax_system:.0f}") for _ in range(len(base_models))] + [wrap("V")]
    ]
    
    t1 = Table(tech_data, colWidths=[160, 58, 58, 58, 58, 58, 40])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1A365D")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t1)
    story.append(Spacer(1, 12))
    
    # Table 2: Calculated Dynamic Values (Fixed repeated column loops to use len(base_models))
    story.append(Paragraph("2. Temperature Corrected & String Sizing Calculations (Dynamically Computed)", section_style))
    calc_data = [
        [wrap("Calculated Operational Metrics", True)] + [wrap(m, True) for m in base_models] + [wrap("Unit", True)],
        [wrap("%Vmp = TcPmp * (Tmax + Trise - Tstc)")] + [wrap(f"{pct_Vmp:.2f}") for _ in range(len(base_models))] + [wrap("%")],
        [wrap("Vmp @ Tmax = Vmp * (1 + %Vmp)")] + [wrap(f"{v:.2f}") for v in Vmp_Tmax] + [wrap("V")],
        [wrap("%Voc = TcVoc * (Tmin - Tstc)")] + [wrap(f"{pct_Voc:.2f}") for _ in range(len(base_models))] + [wrap("%")],
        [wrap("Voc @ Tmin = VocBGF * (1 + %Voc)")] + [wrap(f"{v:.2f}") for v in Voc_Tmin] + [wrap("V")],
        [wrap("%Imp = TcIsc * (Tmax - Tstc)")] + [wrap(f"{pct_Imp:.2f}") for _ in range(len(base_models))] + [wrap("%")],
        [wrap("Imp @ Tmax = Imp@BGF * (1 + %Imp)")] + [wrap(f"{i:.2f}") for i in Imp_Tmax] + [wrap("A")],
        [wrap("%Isc = TcIsc * (Tmax - Tstc)")] + [wrap(f"{pct_Isc:.2f}") for _ in range(len(base_models))] + [wrap("%")],
        [wrap("Isc @ Tmax = Isc@BGF * (1 + %Isc)")] + [wrap(f"{i:.2f}") for i in Isc_Tmax] + [wrap("A")],
        [wrap("Total No of Modules in series (Max limit)")] + [wrap(f"{t:.2f}") for t in total_modules_series] + [wrap("no.")],
        [wrap("Selected no of modules in series", is_bold=True)] + [wrap(f"{m}", is_bold=True) for m in selected_modules] + [wrap("no.", is_bold=True)],
        [wrap("Maximum Voc with selected modules", is_bold=True)] + [wrap(f"{v:.0f}", is_bold=True) for v in max_voc_selected] + [wrap("V", is_bold=True)],
    ]
    
    t2 = Table(calc_data, colWidths=[160, 58, 58, 58, 58, 58, 40])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2C5282")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ('BACKGROUND', (0, 10), (-1, 11), colors.HexColor("#EBF8FF")), 
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t2)
    story.append(Spacer(1, 12))

    # Table 3: Climate Environment
    story.append(Paragraph("3. Site Temperature Environmental Bounds", section_style))
    env_data = [
        [wrap("Temperature Parameters (Handbook Reference)", True), wrap("Value", True), wrap("Unit", True)],
        [wrap("Extreme Low Temperature"), wrap(f"{Tmax:.2f}"), wrap("°C")], 
        [wrap("Extreme High Temperature"), wrap(f"{Tmin:.2f}"), wrap("°C")]
    ]
    t3 = Table(env_data, colWidths=[250, 100, 50])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4A5568")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
    ]))
    story.append(t3)

    try:
        doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=54, bottomMargin=54)
        doc.build(story)
        if isinstance(filename, (str, bytes, os.PathLike)):
            print(f"build_solar_report_pdf: finished building PDF to path: {filename}")
        else:
            filename.seek(0)
            print("build_solar_report_pdf: finished building PDF to file-like stream object")
    except Exception:
        print("build_solar_report_pdf: exception during layout build phase")
        print(traceback.format_exc())
        raise
