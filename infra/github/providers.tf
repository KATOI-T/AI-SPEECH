provider "github" {
  # 対象の Organization。
  owner = var.github_owner

  # 認証トークン。未指定（空文字）の場合は環境変数 GITHUB_TOKEN を使用します（推奨）。
  #   export GITHUB_TOKEN=ghp_xxx
  # トークンには対象 Organization / リポジトリの admin 権限が必要です。
  token = var.github_token != "" ? var.github_token : null
}
