# GitHub 保護ルール（IaC / Terraform）

`KATOI-T/AI-SPEECH` リポジトリのブランチ保護・権限ルールを **Terraform**（[integrations/github](https://registry.terraform.io/providers/integrations/github/latest/docs) プロバイダ）で管理します。

## 適用したいルール

| 対象 | 直接書き込み（push） | マージ（PR） |
|------|------|------|
| `main` ブランチ | オーナーのみ | 管理者以上のみ |
| `develop` ブランチ | オーナーのみ | 誰でも OK |
| リポジトリの削除 | オーナーのみ | — |

- **オーナー** = Organization Owner（Terraform 上の `OrganizationAdmin`）
- **管理者以上** = Repository Admin ＋ Organization Owner

## GitHub 仕様上の重要な注意

GitHub では **「PR のマージ」は内部的に「ブランチへの push」** として扱われます。そのため
「直接 push できる人」と「マージできる人」を**同一ブランチで完全に別々のアクター集合に分離することはできません**。
本 IaC では、GitHub のプリミティブで最も忠実に表現できる次の方式でルールを実現しています。

| ルール | 実現方法 |
|--------|----------|
| 直接書き込み = オーナーのみ | 各ブランチに **PR 必須** を課し、その **bypass を Organization Admin（オーナー）だけに許可**。→ オーナーのみ直接 push でき、他は必ず PR 経由。 |
| main のマージ = 管理者以上 | `.github/CODEOWNERS` に管理者チームを設定し **Code Owner 承認を必須化**。→ 管理者以上の承認がない限り main へマージ不可。 |
| develop のマージ = 誰でも | develop は **PR 必須のみ（必要承認 0 件）**。→ write 権限があれば誰でもマージ可能。 |
| リポジトリ削除 = オーナーのみ | org 設定 `members_can_delete_repositories=false`。→ 削除・移譲は Organization Owner のみ（[scripts/org-hardening.sh](scripts/org-hardening.sh)）。 |

> 補足: 「管理者以上のみマージ」を GitHub のロールで直接指定する機能はありません。CODEOWNERS による承認必須化が、実質的に「管理者以上の承認がなければマージできない」状態を担保する標準的な方法です。`admin_codeowners` には**実在する** Organization チーム／ユーザーを指定してください。

## 前提

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- Organization / リポジトリの **admin 権限** を持つトークン
  - `repo`（または fine-grained で Administration: read/write, Contents: read/write）スコープ
  - `admin:org`（org 設定変更＝リポジトリ削除ポリシー適用に必要。Terraform 側では不要、スクリプトのみ）
- リポジトリ削除ポリシーの適用には **Organization Owner** 権限（[gh CLI](https://cli.github.com/)）

## 使い方

```bash
cd infra/github

# 1. トークンを環境変数で渡す（推奨）
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# 2. 変数ファイルを用意して値を設定
cp terraform.tfvars.example terraform.tfvars
#   → admin_codeowners などを実在の値に編集

# 3. 初期化・差分確認・適用
terraform init
terraform plan
terraform apply

# 4. リポジトリ削除をオーナー限定にする（org 設定・Owner 権限が必要・初回のみ）
./scripts/org-hardening.sh KATOI-T
```

## 補足

- **状態ファイル**: 既定ではローカルの `terraform.tfstate` に保存されます。チーム共有時は [versions.tf](versions.tf) のコメントを参考にリモートバックエンド（S3 / Terraform Cloud 等）を設定してください。`terraform.tfvars` と state ファイルは [.gitignore](.gitignore) 済みです。
- **develop ブランチ**: ルールセットはブランチが未作成でも登録でき、作成時点から有効になります。必要なら事前に `git switch -c develop && git push -u origin develop` で作成してください。
- **既存の Ruleset との競合**: 同名のルールセットが手動作成済みの場合は、`terraform import github_repository_ruleset.main <repo>:<ruleset_id>` で取り込んでから管理してください。
