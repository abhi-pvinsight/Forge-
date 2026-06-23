import os
import io
import traceback
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

app = Flask(__name__)
# Allows secure cross-origin requests from your React frontend
CORS(app) 


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


def generate_solar_report(data, filename="Solar_String_Sizing_Report.pdf"):
    print("generate_solar_report: start")
    
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

    # 3. Setup Document Layout
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
    
    # Table 1: Technical Specs
    story.append(Paragraph("1. Solar Photovoltaic Module Technical Specification (Waaree)", section_style))
    tech_data = [
        [wrap("Module Parameter", True)] + [wrap(m, True) for m in base_models] + [wrap("Unit", True)],
        [wrap("Module Rated Power")] + [wrap(f"{p:.0f}") for p in Pstc] + [wrap("Wp")],
        [wrap("Pstc (Front Side)")] + [wrap(f"{p:.0f}") for p in Pstc] + [wrap("Wp")],
        [wrap("Voc (Front Side)")] + [wrap(f"{v:.2f}") for v in Voc_front] + [wrap("V")],
        [wrap("Vmp (Front Side)")] + [wrap(f"{v:.2f}") for v in Vmp_front] + [wrap("V")],
        [wrap("Isc (Front Side)")] + [wrap(f"{i:.2f}") for i in Isc_front] + [wrap("A")],
        [wrap("Imp (Front Side)")] + [wrap(f"{i:.2f}") for i in Imp_front] + [wrap("A")],
        [wrap("Bifacial Gain Factor (BGF)")] + [wrap(f"{bgf:.2f}") for _ in range(5)] + [wrap("%")],
        [wrap("TcPmp")] + [wrap(f"{TcPmp:.2f}") for _ in range(5)] + [wrap("%/°C")],
        [wrap("TcVoc")] + [wrap(f"{TcVoc:.3f}") for _ in range(5)] + [wrap("%/°C")],
        [wrap("TcIsc")] + [wrap(f"{TcIsc:.2f}") for _ in range(5)] + [wrap("%/°C")],
        [wrap("Vmax")] + [wrap(f"{Vmax_system:.0f}") for _ in range(5)] + [wrap("V")]
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

    # Table 2: Calculated Dynamic Values
    story.append(Paragraph("2. Temperature Corrected & String Sizing Calculations (Dynamically Computed)", section_style))
    calc_data = [
        [wrap("Calculated Operational Metrics", True)] + [wrap(m, True) for m in base_models] + [wrap("Unit", True)],
        [wrap("%Vmp = TcPmp * (Tmax + Trise - Tstc)")] + [wrap(f"{pct_Vmp:.2f}") for _ in range(5)] + [wrap("%")],
        [wrap("Vmp @ Tmax = Vmp * (1 + %Vmp)")] + [wrap(f"{v:.2f}") for v in Vmp_Tmax] + [wrap("V")],
        [wrap("%Voc = TcVoc * (Tmin - Tstc)")] + [wrap(f"{pct_Voc:.2f}") for _ in range(5)] + [wrap("%")],
        [wrap("Voc @ Tmin = VocBGF * (1 + %Voc)")] + [wrap(f"{v:.2f}") for v in Voc_Tmin] + [wrap("V")],
        [wrap("%Imp = TcIsc * (Tmax - Tstc)")] + [wrap(f"{pct_Imp:.2f}") for _ in range(5)] + [wrap("%")],
        [wrap("Imp @ Tmax = Imp@BGF * (1 + %Imp)")] + [wrap(f"{i:.2f}") for i in Imp_Tmax] + [wrap("A")],
        [wrap("%Isc = TcIsc * (Tmax - Tstc)")] + [wrap(f"{pct_Isc:.2f}") for _ in range(5)] + [wrap("%")],
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

    # Cleaned file/stream rendering block
    try:
        if isinstance(filename, (str, bytes, os.PathLike)):
            # If it's a string path, let ReportLab handle opening it safely
            doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=54, bottomMargin=54)
            doc.build(story)
            print(f"generate_solar_report: finished building PDF to path: {filename}")
        else:
            # Assume it's an in-memory BytesIO block stream
            doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=54, bottomMargin=54)
            doc.build(story)
            filename.seek(0)
            print("generate_solar_report: finished building PDF to file-like stream object")
    except Exception:
        print("generate_solar_report: exception during layout build phase")
        print(traceback.format_exc())
        raise


# =======================================================
# FLASK ROUTING BACKEND ENDPOINTS
# =======================================================

@app.route('/api/generate-solar-report', methods=['POST'])
def handle_sync_generation():
    try:
        payload = request.get_json(silent=True) or {}
        react_data = payload.get('values')
        
        print("RECEIVED VALUES FROM REACT:", react_data)

        if not react_data:
            return jsonify({"status": "error", "message": "Missing form metrics values parameter object"}), 400

        pdf_buffer = io.BytesIO()
        generate_solar_report(data=react_data, filename=pdf_buffer)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=False,
            download_name='Solar_String_Sizing_Report.pdf'
        )
    except Exception as e:
        error_trace = traceback.format_exc()
        print("Exception encountered during production compilation:")
        print(error_trace)
        return jsonify({
            "status": "error",
            "message": "Server error during report generation.",
            "details": error_trace
        }), 500


@app.route('/api/generate-solar-report-test', methods=['GET'])
def handle_test_generation():
    try:
        sample = {
            'module_wp1': 605,
            'module_wp2': 620,
            'modulePmax': 580,
            'moduleVoc': 52.0,
            'moduleVmp': 43.4,
            'moduleIsc': 14.02,
            'moduleImp': 13.37,
            'tempCoeffVoc': -0.25,
            'temp_coeff_pm': -0.30,
            'temp_coeff_isc': 0.046,
            'tempMin': -5.0,
            'temp_max': 32.0
        }
        
        target_dir = r"C:\Users\AbhayPratapSingh\work\June\260605\HV DBR\Forge\forge-react\src\features\pv\calculations\module Calculation"
        os.makedirs(target_dir, exist_ok=True)
        out_path = os.path.join(target_dir, 'debug_report.pdf')
        
        # Pass the string path directly here to circumvent wrapper locks
        generate_solar_report(sample, filename=out_path)

        return jsonify({"status": "ok", "path": out_path}), 200
    except Exception:
        error_trace = traceback.format_exc()
        print("Exception encountered during test path write execution:")
        print(error_trace)
        return jsonify({"status": "error", "details": error_trace}), 500


# SINGLE DEFINITIVE APP STARTUP ENTRY POINT AT THE VERY END
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)