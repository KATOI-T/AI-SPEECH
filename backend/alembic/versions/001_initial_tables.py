"""Initial tables for scenarios and characters

Revision ID: 001
Revises:
Create Date: 2026-03-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create scenarios table
    op.create_table(
        "scenarios",
        sa.Column("id", mysql.BIGINT(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("situation", sa.Text(), nullable=False),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("evaluation_criteria", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
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
    )
    op.create_index("ix_scenarios_name", "scenarios", ["name"])
    op.create_index("ix_scenarios_is_active", "scenarios", ["is_active"])

    # Create characters table
    op.create_table(
        "characters",
        sa.Column("id", mysql.BIGINT(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("persona", sa.Text(), nullable=False),
        sa.Column("speaking_style", sa.Text(), nullable=True),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("model_path", sa.String(length=255), nullable=False),
        sa.Column(
            "model_type",
            sa.Enum("vrm", "glb", name="modeltype"),
            nullable=False,
            server_default="vrm",
        ),
        sa.Column("voice_config", mysql.JSON(), nullable=True),
        sa.Column("animation_config", mysql.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
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
    )
    op.create_index("ix_characters_name", "characters", ["name"])
    op.create_index("ix_characters_is_active", "characters", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_characters_is_active", table_name="characters")
    op.drop_index("ix_characters_name", table_name="characters")
    op.drop_table("characters")

    op.drop_index("ix_scenarios_is_active", table_name="scenarios")
    op.drop_index("ix_scenarios_name", table_name="scenarios")
    op.drop_table("scenarios")
