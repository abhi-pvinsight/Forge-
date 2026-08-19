"""Repair databases that were stamped with an incomplete initial schema.

Revision ID: f0a9c2d31b7e
Revises: abd1b569badc
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f0a9c2d31b7e"
down_revision: Union[str, Sequence[str], None] = "abd1b569badc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create any model tables missing from a partially initialized database.

    Some databases were stamped with the initial revision when that revision
    contained only the PV module tables.  The initial revision was later
    expanded, but Alembic never re-runs an already-recorded revision.  Using
    create_all here is intentional: it is idempotent and leaves existing
    tables and data untouched while repairing those databases.
    """
    from app.database import Base

    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    # This is a data-preserving repair migration.  Dropping tables here could
    # remove application data from databases that already had the full schema.
    pass
