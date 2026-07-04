"""Drop vrm_library table and revert characters additions

シナリオの自動生成のみに絞るため、VRM ライブラリ機能および
characters テーブルの vrm_library_id / license_info 列を削除する。

Revision ID: 007
Revises: 006
Create Date: 2026-04-22

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # vrm_library_id に紐づく FK / インデックスを先に剥がす (MySQL は列単独で DROP 不可)
    char_cols = {c["name"] for c in inspector.get_columns("characters")}
    if "vrm_library_id" in char_cols:
        for fk in inspector.get_foreign_keys("characters"):
            if "vrm_library_id" in (fk.get("constrained_columns") or []):
                fk_name = fk.get("name")
                if fk_name:
                    op.drop_constraint(fk_name, "characters", type_="foreignkey")
        for ix in inspector.get_indexes("characters"):
            if ix.get("column_names") == ["vrm_library_id"]:
                ix_name = ix.get("name")
                if ix_name:
                    op.drop_index(ix_name, table_name="characters")

    # characters の拡張列を削除 (既に消えているカラムはスキップ)
    char_cols = {c["name"] for c in inspector.get_columns("characters")}
    drop_cols = [c for c in ("license_info", "vrm_library_id") if c in char_cols]
    if drop_cols:
        with op.batch_alter_table("characters") as batch:
            for col in drop_cols:
                batch.drop_column(col)

    # vrm_library テーブルを削除 (既に存在しなければスキップ)
    if "vrm_library" in inspector.get_table_names():
        existing_indexes = {ix["name"] for ix in inspector.get_indexes("vrm_library")}
        if "idx_vrm_library_active_commercial" in existing_indexes:
            op.drop_index("idx_vrm_library_active_commercial", table_name="vrm_library")
        op.drop_table("vrm_library")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "vrm_library" not in inspector.get_table_names():
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

    # 再走査 (vrm_library 作成後の characters カラム状態を確認)
    inspector = sa.inspect(bind)
    char_cols = {c["name"] for c in inspector.get_columns("characters")}
    if "vrm_library_id" not in char_cols:
        op.add_column(
            "characters",
            sa.Column(
                "vrm_library_id",
                sa.Integer(),
                sa.ForeignKey("vrm_library.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
    if "license_info" not in char_cols:
        op.add_column("characters", sa.Column("license_info", sa.JSON(), nullable=True))
