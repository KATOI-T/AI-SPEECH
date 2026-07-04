"""
既存ローカルファイルをS3に移行するスクリプト

使用方法:
  python -m scripts.migrate_to_s3 --dry-run     # 確認のみ
  python -m scripts.migrate_to_s3               # 実行
"""

import argparse
import os
from pathlib import Path

import boto3
from sqlalchemy import create_engine, text


def migrate(dry_run: bool = True) -> None:
    """ローカルファイルをS3に移行"""
    # 1. 環境変数から設定を取得
    uploads_dir = Path(os.environ.get("MODEL_UPLOADS_DIR", ""))
    bucket_name = os.environ.get("S3_BUCKET_NAME", "")
    prefix = os.environ.get("S3_UPLOAD_PREFIX", "uploads")
    database_url = os.environ.get("DATABASE_URL", "")

    if not uploads_dir or not uploads_dir.exists():
        print(f"ERROR: MODEL_UPLOADS_DIR not found: {uploads_dir}")
        return

    if not bucket_name:
        print("ERROR: S3_BUCKET_NAME is not set")
        return

    # 2. ローカルファイルをスキャン
    files = list(uploads_dir.glob("*.vrm")) + list(uploads_dir.glob("*.glb"))

    print(f"Found {len(files)} files to migrate")

    if not files:
        return

    # 3. S3クライアント初期化
    s3 = boto3.client("s3")

    # 4. ファイルをS3にアップロード
    for f in files:
        key = f"{prefix}/{f.name}"
        s3_path = f"s3://{prefix}/{f.name}"
        local_path = f"/models/uploads/{f.name}"

        print(f"  {local_path} -> {s3_path}")

        if not dry_run:
            s3.upload_file(str(f), bucket_name, key)

    # 5. DBのmodel_pathを更新
    if not dry_run:
        if not database_url:
            print("ERROR: DATABASE_URL is not set, skipping DB update")
        else:
            engine = create_engine(database_url)
            with engine.begin() as conn:
                for f in files:
                    old_path = f"/models/uploads/{f.name}"
                    new_path = f"s3://{prefix}/{f.name}"
                    conn.execute(
                        text(
                            "UPDATE characters SET model_path = :new_path "
                            "WHERE model_path = :old_path"
                        ),
                        {"new_path": new_path, "old_path": old_path},
                    )

    status = "[DRY RUN]" if dry_run else "[DONE]"
    print(f"{status} Migration complete: {len(files)} files")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate local model files to S3")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no changes")
    args = parser.parse_args()
    migrate(dry_run=args.dry_run)
