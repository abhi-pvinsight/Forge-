import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Organization, Department, Vertical, MasterReportTemplate, Report, Client, Project
from sqlalchemy import func

def run_seed():
    db = SessionLocal()
    try:
        print("🌱 Seeding Master Reference Data...")

        # 1. Organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="PV Insight Inc.")
            db.add(org)
            db.commit()
            db.refresh(org)
            print("✅ Seeded Organization: PV Insight Inc.")
        else:
            print(f"✅ Organization exists: {org.name} ({org.id})")

        # 2. Departments, Verticals & Master Templates from NAV Tree
        nav_tree = [
            {
                "name": "Electrical",
                "subs": [
                    {
                        "name": "PV",
                        "reports": [
                            {"reportTitle": "PV Design Basis Report", "type": "pv"},
                            {"reportTitle": "String Size Design Basis Report", "type": "string-size"},
                            {"reportTitle": "Energy Yield Design Basis Report", "type": "energy-yield"},
                            {"reportTitle": "GCR Optimization Design Basis Report", "type": "gcr-opt"},
                            {"reportTitle": "DC Cable Sizing Design Basis Report", "type": "cable-sizing"},
                            {"reportTitle": "Lightning Protection Design Basis Report", "type": "lps"}
                        ]
                    },
                    {
                        "name": "BESS",
                        "reports": [
                            {"reportTitle": "BESS Sizing Design Basis Report", "type": "battery"},
                            {"reportTitle": "BESS Cable Ampacity Report", "type": "cable"},
                            {"reportTitle": "BESS Grounding Design Basis Report", "type": "grounding"},
                            {"reportTitle": "PCS Sizing Design Basis Report", "type": "pcs"}
                        ]
                    },
                    {
                        "name": "HV & Substation",
                        "reports": [
                            {"reportTitle": "HV Design Basis Report", "type": "hv-dbr"},
                            {"reportTitle": "Aluminium Bus Bar Sizing & Ampacity Report", "type": "busbar-sizing"},
                            {"reportTitle": "Transformer Sizing Design Basis Report", "type": "transformer"},
                            {"reportTitle": "SLD Basis Report", "type": "sld"}
                        ]
                    },
                    {
                        "name": "TL Lines",
                        "reports": [
                            {"reportTitle": "Sag & Tension Design Basis Report", "type": "sag-tension"}
                        ]
                    },
                    {"name": "PSS", "reports": []}
                ]
            },
            {
                "name": "Civil",
                "subs": [
                    {
                        "name": "PV",
                        "reports": [
                            {"reportTitle": "Grading & Drainage Design Basis Report", "type": "grading"},
                            {"reportTitle": "Access Road Design Basis Report", "type": "road"}
                        ]
                    },
                    {"name": "BESS", "reports": []},
                    {"name": "HV & Substation", "reports": []},
                    {"name": "PSS", "reports": []},
                    {"name": "TL Lines", "reports": []}
                ]
            },
            {
                "name": "Structure",
                "subs": [
                    {
                        "name": "PV",
                        "reports": [
                            {"reportTitle": "Pile Foundation Design Basis Report", "type": "pile"},
                            {"reportTitle": "Tracker Structure Design Basis Report", "type": "tracker"}
                        ]
                    },
                    {"name": "BESS", "reports": []},
                    {"name": "HV & Substation", "reports": []},
                    {"name": "PSS", "reports": []},
                    {"name": "TL Lines", "reports": []}
                ]
            }
        ]

        dept_count = 0
        vert_count = 0
        temp_count = 0

        for dept_data in nav_tree:
            dept = db.query(Department).filter(
                func.lower(Department.name) == dept_data["name"].lower()
            ).first()
            if not dept:
                dept = Department(name=dept_data["name"])
                db.add(dept)
                db.commit()
                db.refresh(dept)
                dept_count += 1

            for sub_data in dept_data["subs"]:
                vert = db.query(Vertical).filter(
                    (func.lower(Vertical.name) == sub_data["name"].lower()) &
                    (Vertical.department_id == dept.id)
                ).first()
                if not vert:
                    vert = Vertical(name=sub_data["name"], department_id=dept.id)
                    db.add(vert)
                    db.commit()
                    db.refresh(vert)
                    vert_count += 1

                for rep_data in sub_data.get("reports", []):
                    template = db.query(MasterReportTemplate).filter(
                        (func.lower(MasterReportTemplate.report_name) == rep_data["reportTitle"].lower()) &
                        (MasterReportTemplate.department_id == dept.id) &
                        (MasterReportTemplate.vertical_id == vert.id)
                    ).first()
                    if not template:
                        db.add(MasterReportTemplate(
                            report_name=rep_data["reportTitle"],
                            department_id=dept.id,
                            vertical_id=vert.id
                        ))
                        db.commit()
                        temp_count += 1

        print(f"✅ Departments seeded: {db.query(Department).count()}")
        print(f"✅ Verticals seeded: {db.query(Vertical).count()}")
        print(f"✅ Templates seeded: {db.query(MasterReportTemplate).count()}")

        # 3. Backfill existing clients & projects
        clients = db.query(Client).all()
        for c in clients:
            if not c.organization_id:
                c.organization_id = org.id
        db.commit()

        projects = db.query(Project).all()
        for p in projects:
            if not p.organization_id:
                p.organization_id = org.id
        db.commit()

        # 4. Backfill existing reports table columns
        reports = db.query(Report).all()
        updated_reports = 0
        for r in reports:
            changed = False
            if not r.organization_id:
                r.organization_id = org.id
                changed = True

            dept_name = r.department or "Electrical"
            dept = db.query(Department).filter(func.lower(Department.name) == dept_name.lower()).first()
            if not dept:
                dept = db.query(Department).first()

            if dept and r.department_id != dept.id:
                r.department_id = dept.id
                r.department = dept.name
                changed = True

            vert_name = r.vertical or ("BESS" if r.report_type in ["battery", "cable", "grounding", "pcs"] else ("HV & Substation" if r.report_type in ["hv-dbr", "busbar-sizing", "transformer", "busbar"] else "PV"))
            vert = db.query(Vertical).filter(
                (func.lower(Vertical.name) == vert_name.lower()) &
                (Vertical.department_id == (dept.id if dept else None))
            ).first()
            if not vert and dept:
                vert = db.query(Vertical).filter(Vertical.department_id == dept.id).first()

            if vert and r.vertical_id != vert.id:
                r.vertical_id = vert.id
                r.vertical = vert.name
                changed = True

            template = db.query(MasterReportTemplate).filter(
                (MasterReportTemplate.department_id == (dept.id if dept else None)) &
                (MasterReportTemplate.vertical_id == (vert.id if vert else None))
            ).first()

            if template and r.template_id != template.id:
                r.template_id = template.id
                changed = True

            if changed:
                updated_reports += 1

        db.commit()
        print(f"✅ Backfilled master foreign keys on {updated_reports} existing report records.")
        print("🎉 Master Seeding Complete!")

    except Exception as e:
        db.rollback()
        print("❌ Error during seeding:", e)
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
