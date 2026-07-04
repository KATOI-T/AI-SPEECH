variable "github_owner" {
  description = "対象の GitHub Organization 名"
  type        = string
  default     = "KATOI-T"
}

variable "github_token" {
  description = "GitHub 認証トークン（空の場合は環境変数 GITHUB_TOKEN を使用）。admin 権限が必要。"
  type        = string
  default     = ""
  sensitive   = true
}

variable "repository" {
  description = "保護対象のリポジトリ名"
  type        = string
  default     = "AI-SPEECH"
}

variable "main_branch" {
  description = "本番ブランチ名"
  type        = string
  default     = "main"
}

variable "develop_branch" {
  description = "開発ブランチ名"
  type        = string
  default     = "develop"
}

variable "main_required_approvals" {
  description = "main への PR マージに必要な承認数"
  type        = number
  default     = 1
}

variable "admin_codeowners" {
  description = <<-EOT
    main の Code Owner（マージには必ずここに含まれる管理者以上の承認が必要になる）。
    Organization の管理者チームまたはユーザーを指定する。
    例: "@KATOI-T/maintainers" や "@user-a @user-b"
  EOT
  type    = string
  default = "@KATOI-T/maintainers"
}
