import os
import sys
import uuid as _uuid

sys.path.insert(0, '.')
from sqlalchemy import text
from app.database import Base, engine, SessionLocal, Organization, Department, Vertical, MasterReportTemplate, Client, Project, Profile
from app.auth import get_password_hash

def reset_db():
    print("1. Connecting to database and dropping all tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    print("Tables dropped successfully.")

    print("2. Recreating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    print("3. Seeding database...")
    db = SessionLocal()
    try:
        # Create organization
        org = Organization(name="PV-Insight")
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"Created default Organization: {org.name} ({org.id})")

        # Create departments
        depts = {}
        for dept_name in ["Electrical Engineering", "Civil Engineering", "Structural Engineering", "Mechanical Engineering"]:
            dept = Department(name=dept_name)
            db.add(dept)
            db.commit()
            db.refresh(dept)
            depts[dept_name] = dept
            print(f"Created Department: {dept.name} ({dept.id})")

        # Create verticals
        verts = {}
        elec_dept = depts["Electrical Engineering"]
        for vert_name in ["PV", "BESS", "Grounding"]:
            vert = Vertical(name=vert_name, department_id=elec_dept.id)
            db.add(vert)
            db.commit()
            db.refresh(vert)
            verts[vert_name] = vert
            print(f"Created Vertical: {vert.name} ({vert.id})")

        # Create Master Report Templates
        templates = [
            ("PV String Sizing", elec_dept.id, verts["PV"].id),
            ("Battery Energy Storage System (BESS) Design", elec_dept.id, verts["BESS"].id),
            ("Grounding Grid Design", elec_dept.id, verts["Grounding"].id),
        ]
        for name, dept_id, vert_id in templates:
            t = MasterReportTemplate(report_name=name, department_id=dept_id, vertical_id=vert_id)
            db.add(t)
            db.commit()
            db.refresh(t)
            print(f"Created MasterReportTemplate: {t.report_name} ({t.id})")

        # Create Default Client
        client = Client(
            name="Default Client",
            address="123 PV Way, Solar City",
            logo=None,
            created_by="system",
            created_at="2026-08-17 12:00:00",
            modified_by="system",
            modified_at="2026-08-17 12:00:00"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        print(f"Created default Client: {client.name} ({client.id})")

        # Create Default Project
        proj = Project(
            client_id=client.id,
            name="Default Project",
            county="Travis",
            state="TX",
            country="USA",
            assigned_reviewer="Senior Reviewer",
            assigned_creator="Creator",
            department="Electrical Engineering",
            vertical="PV",
            status="active",
            description="Default workspace project",
            created_at="2026-08-17T12:00:00"
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        print(f"Created default Project: {proj.name} ({proj.id})")

        # Create Test User
        test_user_str = os.getenv("TEST_USER_ID", "test-user-id")
        try:
            user_uuid = _uuid.UUID(test_user_str)
        except ValueError:
            user_uuid = _uuid.uuid5(_uuid.NAMESPACE_DNS, test_user_str)
            
        test_user = Profile(
            id=user_uuid,
            email="forge-test-user@pvinsight.local",
            hashed_password=get_password_hash("password"),
            organization_id=org.id,
            role="member",
            full_name="Developer Bypass",
            department="Electrical Engineering",
            vertical="PV",
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"Created test user: {test_user.email} ({test_user.id})")
        print()
        print("DATABASE RESET AND SEED COMPLETED SUCCESSFULLY.")
        print(f"Please configure your environment with: TEST_USER_ID={test_user.id}")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
