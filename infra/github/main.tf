# =============================================================================
# GitHub ブランチ保護ルール（Repository Rulesets）
#
# 実現したいルール:
#   - main     : 直接書き込み = オーナーのみ / マージ = 管理者以上のみ
#   - develop  : 直接書き込み = オーナーのみ / マージ = 誰でも OK
#   - リポジトリ削除 = オーナーのみ（org 設定。scripts/org-hardening.sh を参照）
#
# GitHub の仕様上の注意:
#   「ブランチへのマージ」は内部的には「ブランチへの push」です。そのため
#   『直接 push できる人』と『マージできる人』を同一ブランチで完全に別集合に
#   することはできません。ここでは次の方針で忠実にモデル化します。
#     * 全員に PR 必須を課し、bypass を Organization Admin（=オーナー）のみに許可
#       → オーナーだけが直接 push でき、他は必ず PR 経由（＝直接書き込み=オーナー）
#     * main はさらに Code Owner 承認を必須化（CODEOWNERS=管理者チーム）
#       → 管理者以上の承認がないと main にマージできない（＝マージ=管理者以上）
#     * develop は PR 必須のみ・承認 0 件（＝マージは write 権限があれば誰でも）
# =============================================================================

# -----------------------------------------------------------------------------
# main ブランチ
# -----------------------------------------------------------------------------
resource "github_repository_ruleset" "main" {
  name        = "protect-main"
  repository  = var.repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/${var.main_branch}"]
      exclude = []
    }
  }

  # オーナー（Organization Admin）のみ全ルールを bypass できる = 直接書き込み可能。
  bypass_actors {
    actor_id    = 1
    actor_type  = "OrganizationAdmin"
    bypass_mode = "always"
  }

  rules {
    # ブランチ削除・force push を禁止
    deletion         = true
    non_fast_forward = true

    # PR 必須（＝オーナー以外は直接 push 不可）＋ 管理者(Code Owner)の承認を必須化
    pull_request {
      required_approving_review_count   = var.main_required_approvals
      require_code_owner_review         = true
      dismiss_stale_reviews_on_push     = true
      require_last_push_approval        = false
      required_review_thread_resolution = true
    }
  }
}

# -----------------------------------------------------------------------------
# develop ブランチ
# -----------------------------------------------------------------------------
resource "github_repository_ruleset" "develop" {
  name        = "protect-develop"
  repository  = var.repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/${var.develop_branch}"]
      exclude = []
    }
  }

  # オーナー（Organization Admin）のみ bypass = 直接書き込み可能。
  bypass_actors {
    actor_id    = 1
    actor_type  = "OrganizationAdmin"
    bypass_mode = "always"
  }

  rules {
    deletion         = true
    non_fast_forward = true

    # PR 必須のみ（承認 0 件）＝ オーナー以外は PR 経由だが、write 権限があれば誰でもマージ可。
    pull_request {
      required_approving_review_count   = 0
      require_code_owner_review         = false
      dismiss_stale_reviews_on_push     = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }
  }
}

# -----------------------------------------------------------------------------
# CODEOWNERS（main のマージを管理者以上に限定するために使用）
# main ブランチ上の .github/CODEOWNERS を Terraform で管理します。
# -----------------------------------------------------------------------------
resource "github_repository_file" "codeowners" {
  repository          = var.repository
  branch              = var.main_branch
  file                = ".github/CODEOWNERS"
  content             = <<-EOT
    # このファイルは Terraform (infra/github) で管理されています。手動編集しないでください。
    # main への全変更は、以下の Code Owner（管理者以上）の承認が必須です。
    * ${var.admin_codeowners}
  EOT
  commit_message      = "chore: manage CODEOWNERS via Terraform"
  commit_author       = "terraform"
  commit_email        = "terraform@users.noreply.github.com"
  overwrite_on_create = true
}
