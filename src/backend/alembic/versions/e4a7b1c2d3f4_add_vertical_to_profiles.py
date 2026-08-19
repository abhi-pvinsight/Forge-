"""Sync missing columns and tables

Revision ID: e4a7b1c2d3f4
Revises: f0a9c2d31b7e
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection


# revision identifiers, used by Alembic.
revision: str = 'e4a7b1c2d3f4'
down_revision: Union[str, Sequence[str], None] = 'f0a9c2d31b7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Create any missing tables (e.g. departments, verticals, master_report_templates, report_comments)
    from app.database import Base
    Base.metadata.create_all(bind=conn, checkfirst=True)

    # 2. Add missing columns using IF NOT EXISTS on PostgreSQL (or inspector check)
    column_patches = [
        # profiles
        ("profiles", "vertical", "VARCHAR"),
        # reports
        ("reports", "stage_id", "VARCHAR DEFAULT '10'"),
        ("reports", "department_id", "INTEGER REFERENCES departments(id) ON DELETE SET NULL"),
        ("reports", "vertical_id", "INTEGER REFERENCES verticals(id) ON DELETE SET NULL"),
        ("reports", "parent_report_id", "INTEGER REFERENCES reports(id) ON DELETE CASCADE"),
        ("reports", "version_number", "INTEGER DEFAULT 1"),
        ("reports", "is_current_version", "BOOLEAN DEFAULT TRUE"),
        ("reports", "created_by_role", "VARCHAR DEFAULT 'creator'"),
        ("reports", "created_by_name", "VARCHAR"),
        ("reports", "assigned_reviewer", "VARCHAR"),
        ("reports", "assigned_reviewer_id", "VARCHAR"),
        ("reports", "assigned_creator", "VARCHAR"),
        ("reports", "assigned_creator_id", "VARCHAR"),
        ("reports", "provider_company", "VARCHAR"),
        ("reports", "department", "VARCHAR"),
        ("reports", "vertical", "VARCHAR"),
        ("reports", "version_notes", "VARCHAR"),
        ("reports", "created_at", "VARCHAR"),
        # clients
        ("clients", "address", "VARCHAR"),
        ("clients", "logo", "VARCHAR"),
        ("clients", "created_by", "VARCHAR"),
        ("clients", "created_at", "VARCHAR"),
        ("clients", "modified_by", "VARCHAR"),
        ("clients", "modified_at", "VARCHAR"),
        # projects
        ("projects", "assigned_reviewer", "VARCHAR"),
        ("projects", "assigned_creator", "VARCHAR"),
        ("projects", "department", "VARCHAR"),
        ("projects", "vertical", "VARCHAR"),
        ("projects", "status", "VARCHAR DEFAULT 'active'"),
        ("projects", "description", "VARCHAR"),
        ("projects", "created_at", "VARCHAR"),
    ]

    for table, column, col_type in column_patches:
        try:
            conn.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type};"))
        except Exception as e:
            print(f"Notice: column check for {table}.{column}: {e}")


def downgrade() -> None:
    pass

