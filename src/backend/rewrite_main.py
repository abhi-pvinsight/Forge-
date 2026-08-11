import os
import re

main_path = os.path.join(os.path.dirname(__file__), "main.py")

with open(main_path, "r", encoding="utf-8") as f:
    content = f.read()

# find the save_report definition
save_idx = content.find("@app.post(\"/api/reports/save\")")
if save_idx == -1:
    print("Could not find save_report")
    exit(1)

new_code = """@app.post("/api/reports/save")
def save_report(payload: ReportSaveRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_id = current_user["id"]
        
        # simplified mock of saving using SQLAlchemy - due to the complex dynamic tables
        # just for preserving functionality without supabase
        
        # 1. Create client / project
        client = db.query(Client).first()
        if not client:
            client = Client(name="Default Client")
            db.add(client)
            db.commit()
            db.refresh(client)
            
        project = db.query(Project).filter_by(client_id=client.id).first()
        if not project:
            project = Project(client_id=client.id, name="Default Project")
            db.add(project)
            db.commit()
            db.refresh(project)
            
        # 2. Insert or update parent Report row
        if payload.report_id:
            report = db.query(Report).filter_by(id=payload.report_id).first()
            if not report:
                raise HTTPException(status_code=404, detail="Report not found")
        else:
            report = Report(project_id=project.id, report_type=payload.report_type)
            db.add(report)
            
        report.document_no = payload.document_no or "PVI-BESS-GEN-001"
        report.revision = payload.revision or "A"
        report.prepared_date = payload.prepared_date or "2026-07-03"
        report.report_title = payload.report_title or "Engineering Report"
        report.metadata_json = payload.values
        if payload.status:
            report.status = payload.status
            
        db.commit()
        db.refresh(report)
        saved_id = report.id

        return {"success": True, "report_id": saved_id, "report_type": payload.report_type}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports")
def get_reports_list(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        reports = db.query(Report).order_by(Report.id.desc()).all()
        return {"success": True, "reports": [{"id": r.id, "report_title": r.report_title, "document_no": r.document_no, "revision": r.revision, "report_type": r.report_type, "status": r.status} for r in reports]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/last-pv")
def get_last_pv_report(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == "pv").order_by(Report.id.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/last/{report_type}")
def get_last_report(report_type: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.report_type == report_type).order_by(Report.id.desc()).first()
        if not report:
            return {"success": True, "data": None}
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/reports/{report_id}")
def get_report_detail(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found"})
        return {"success": True, "data": [{"id": report.id, "report_type": report.report_type, "metadata_json": report.metadata_json}]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return JSONResponse(status_code=404, content={"success": False, "error": "Report not found."})

        db.delete(report)
        db.commit()
        return {"success": True, "message": "Report deleted successfully."}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
"""

# Replace from save_idx to the end of the file
new_content = content[:save_idx] + new_code

with open(main_path, "w", encoding="utf-8") as f:
    f.write(new_content)
