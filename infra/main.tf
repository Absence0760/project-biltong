terraform {
  required_version = ">= 1.6.0"

  # State backend values are hardcoded because terraform backend blocks
  # can't reference variables. The state bucket and lock table are created
  # by bin/setup.sh on first run — if you run `terraform init` before the
  # script, you'll see a "bucket does not exist" error, which is the hint
  # to run the setup script instead.
  backend "s3" {
    bucket         = "thong-biltong-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "thong-biltong-tfstate-lock"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Primary region — where the Lambda, DynamoDB lock table, and state bucket live.
# Defaults to us-east-1 (same region as the ACM cert CloudFront requires).
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "thong-biltong"
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

# CloudFront requires its ACM certificate in us-east-1 specifically, so this
# alias pins the cert provider there regardless of what var.aws_region is set
# to. With the default setup (aws_region = "us-east-1") this points at the
# same region as the default provider, but the alias is kept so the ACM
# requirement stays explicit if the primary region is ever moved.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "thong-biltong"
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

locals {
  project = "thong-biltong"
}
