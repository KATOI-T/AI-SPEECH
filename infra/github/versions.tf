terraform {
  required_version = ">= 1.5"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  # 状態ファイルはデフォルトでローカル（terraform.tfstate）に保存されます。
  # チームで共有する場合は S3 / Terraform Cloud などのリモートバックエンドを設定してください。
  # backend "s3" {
  #   bucket = "your-tfstate-bucket"
  #   key    = "github/ai-speech.tfstate"
  #   region = "ap-northeast-1"
  # }
}
