#!/usr/bin/env bash
#
# リポジトリ削除をオーナー（Organization Owner）のみに制限する org 設定を適用します。
# GitHub Terraform provider に該当リソースが無いため gh CLI で設定します。
#
# 必要権限: 実行者は対象 Organization の Owner である必要があります。
# 前提: gh CLI がインストール・認証済み（gh auth login）。
#
# 使い方:
#   ./org-hardening.sh KATOI-T
#
set -euo pipefail

ORG="${1:-KATOI-T}"

echo "[org-hardening] Organization: ${ORG}"

# members_can_delete_repositories=false にすると、
# リポジトリの削除・移譲は Organization Owner のみが実行可能になります。
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  "/orgs/${ORG}" \
  -F members_can_delete_repositories=false

echo "[org-hardening] Done. リポジトリ削除はオーナーのみに制限されました。"

# 現在値の確認:
#   gh api /orgs/${ORG} --jq '.members_can_delete_repositories'
