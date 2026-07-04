"""Add session_settings table for voice input settings

Revision ID: 002
Revises: 001
Create Date: 2026-03-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create session_settings table
    op.create_table(
        "session_settings",
        sa.Column("id", mysql.BIGINT(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("voice_input_enabled", sa.Boolean(), nullable=False, default=False),
        sa.Column("auto_send", sa.Boolean(), nullable=False, default=True),
        sa.Column("mic_permission_checked", sa.Boolean(), nullable=False, default=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uk_session_settings_session_id"),
    )
    op.create_index(
        "ix_session_settings_session_id", "session_settings", ["session_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_session_settings_session_id", table_name="session_settings")
    op.drop_constraint("uk_session_settings_session_id", "session_settings", type_="unique")
    op.drop_table("session_settings")
