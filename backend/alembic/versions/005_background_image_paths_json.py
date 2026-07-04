"""Convert background_image_path to background_image_paths JSON array

Revision ID: 005
Revises: 004
Create Date: 2026-04-10

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 新カラム追加（MySQLではJSON列にデフォルト値を設定できないためnullable=True）
    op.add_column(
        "scenarios",
        sa.Column("background_image_paths", sa.JSON, nullable=True),
    )

    # 既存データを移行
    op.execute(
        """
        UPDATE scenarios
        SET background_image_paths = JSON_ARRAY(background_image_path)
        WHERE background_image_path IS NOT NULL AND background_image_path != ''
        """
    )

    # NULL行に空配列をセット
    op.execute(
        """
        UPDATE scenarios
        SET background_image_paths = JSON_ARRAY()
        WHERE background_image_paths IS NULL
        """
    )

    # NOT NULL制約を追加
    op.alter_column("scenarios", "background_image_paths", existing_type=sa.JSON(), nullable=False)

    # 旧カラム削除
    op.drop_column("scenarios", "background_image_path")


def downgrade() -> None:
    # 旧カラム復元
    op.add_column(
        "scenarios",
        sa.Column("background_image_path", sa.String(500), nullable=True),
    )

    # データを復元: 配列の最初の要素を取り出す
    op.execute(
        """
        UPDATE scenarios
        SET background_image_path = JSON_UNQUOTE(JSON_EXTRACT(background_image_paths, '$[0]'))
        WHERE JSON_LENGTH(background_image_paths) > 0
        """
    )

    op.drop_column("scenarios", "background_image_paths")
