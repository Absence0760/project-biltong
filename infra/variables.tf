variable "aws_region" {
  description = "Primary AWS region for Lambda, DynamoDB, and S3 resources. Defaults to us-east-1 — same region as the ACM cert CloudFront requires, so everything lives in one region."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain for the site, e.g. thongbiltong.com"
  type        = string
}

variable "route53_zone_id" {
  description = <<-EOT
    ID of the Route 53 hosted zone for the apex domain. The zone must already
    exist — Terraform will add records to it but will not create it. Look it up
    with: aws route53 list-hosted-zones-by-name --dns-name <domain>
  EOT
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in 'owner/name' form, used to scope the OIDC trust policy."
  type        = string
}

variable "resend_api_key" {
  description = "Resend API key used by the backend to send order emails."
  type        = string
  sensitive   = true
}

variable "from_email" {
  description = "The 'From' address on outgoing order emails. Must be a verified Resend sender."
  type        = string
}

variable "owner_email" {
  description = "Address that receives new-order notifications."
  type        = string
}

variable "sanity_project_id" {
  description = "Sanity project ID — used at frontend build time via PUBLIC_SANITY_PROJECT_ID, and by the backend to read/write order documents."
  type        = string
}

variable "sanity_dataset" {
  description = "Sanity dataset name."
  type        = string
  default     = "production"
}

variable "sanity_api_token" {
  description = "Sanity API token with write access to the `order` document type. Used by the backend to create order documents when customers submit the form."
  type        = string
  sensitive   = true
}

variable "sanity_webhook_secret" {
  description = "Shared secret used to verify Sanity webhook signatures when Sanity calls /webhooks/sanity-order. Generate with `openssl rand -hex 32` and paste the same value into the Sanity webhook configuration."
  type        = string
  sensitive   = true
}

variable "site_url" {
  description = "Public URL of the site. Baked into confirmation emails as the base for tracking links. Defaults to https://<domain_name>."
  type        = string
  default     = ""
}

# --- Stripe payment gateway ---

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_... in production, sk_test_... for staging). Used by the backend to create Checkout Sessions. Required — no default so terraform apply fails fast if omitted."
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret (whsec_...). Used by the backend to verify incoming webhook payloads. Required — no default so terraform apply fails fast if omitted."
  type        = string
  sensitive   = true
}

variable "stripe_currency" {
  description = "ISO 4217 currency code (lowercase) passed to Stripe Checkout. US Dollars = usd."
  type        = string
  default     = "usd"
}

# --- Monthly budget alerts ---

variable "lambda_reserved_concurrency" {
  description = <<-EOT
    Cap on concurrent invocations of the backend Lambda. Default 20 is well
    above expected organic load (this site sees a handful of orders per
    week) but caps blast radius if an attacker bypasses the in-memory
    rate limiter. Setting to -1 removes the cap and falls back to the
    account default (1000 in most US regions; new accounts may start at 10).
  EOT
  type        = number
  default     = 20
}

variable "monthly_budget_usd" {
  description = <<-EOT
    Monthly AWS spend cap (USD) used for budget-alert thresholds. The budget
    fires email alerts to owner_email at 50%, 80%, and 100% of actual spend,
    plus a forecast alert when AWS predicts month-end spend will exceed the
    cap. The expected baseline for this project is ~$1-2/month, so the
    default of $30 is several multiples of expected spend — a tripped alert
    means something is genuinely wrong.
  EOT
  type        = number
  default     = 30
}
