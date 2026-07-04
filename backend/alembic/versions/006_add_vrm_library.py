"""Add vrm_library table and extend characters table

Revision ID: 006
Revises: 005
Create Date: 2026-04-20

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vrm_library",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(255), nullable=False),
        sa.Column("thumbnail_path", sa.String(255), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("license_name", sa.String(100), nullable=False),
        sa.Column("commercial_use_allowed", sa.Boolean(), nullable=False),
        sa.Column("modification_allowed", sa.Boolean(), nullable=False),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("license_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_path"),
    )

    op.create_index(
        "idx_vrm_library_active_commercial",
        "vrm_library",
        ["is_active", "commercial_use_allowed"],
    )
    op.add_column(
        "characters",
        sa.Column(
            "vrm_library_id",
            sa.Integer(),
            sa.ForeignKey("vrm_library.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "characters",
        sa.Column(
            "license_info",
            sa.JSON(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("characters", "license_info")
    op.drop_column("characters", "vrm_library_id")
    op.drop_index("idx_vrm_library_active_commercial", table_name="vrm_library")
    op.drop_table("vrm_library")
