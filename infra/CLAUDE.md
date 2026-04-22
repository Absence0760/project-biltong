# infra/

Terraform module for the AWS resources backing Thong Biltong: S3 + CloudFront for the static frontend, Lambda + API Gateway HTTP API for the backend (CloudFront routes `/api/*` to API Gateway, which routes to Lambda), ACM + Route 53 for DNS/TLS, GitHub OIDC for CI auth.

Not a pnpm workspace — no `package.json`.

## Hard rules

- **Never run `terraform apply` without explicit user confirmation.** `plan` is fine to run unprompted; `apply` is destructive in scope.
- **Never run `terraform destroy` without explicit user confirmation.**
- **OIDC only for CI auth.** Don't introduce long-lived AWS access keys. The GitHub Actions role (`github_oidc.tf`) is trust-policied to the `production` GitHub Actions environment of the configured repo (environment-scoped, not branch-scoped, so release-gated deploys with `refs/tags/<tag>` work).
- **Coordinate Terraform edits with `.github/workflows/` changes.** New IAM permissions, output values, or env vars often need matching workflow updates — make both edits in the same change.
- **Single-region setup (us-east-1).** Primary region is `us-east-1` — the same region CloudFront requires ACM certs in, so everything lives in one place. The `aws.us_east_1` provider alias still exists in `main.tf` to make the ACM requirement explicit (useful if the primary region is ever moved), but currently resolves to the same region as the default provider.

## Workflow

Routine changes (env var added, log retention bumped, IAM scope tightened):

```bash
cd infra
terraform plan   # always; review the diff
# (then ask the user before applying)
terraform apply
```

The Lambda's environment variables are populated from `terraform.tfvars` — rotating a secret is `sops infra/terraform.tfvars.sops`, edit, save, then `terraform apply`. No code redeploy required.

## Stripe env vars on the Lambda

The Lambda reads three Stripe-related vars from its environment, populated by Terraform from `terraform.tfvars`:

- `STRIPE_SECRET_KEY` — server-side API key used to create Checkout sessions (`sk_test_…` or `sk_live_…`)
- `STRIPE_WEBHOOK_SECRET` — HMAC secret used to verify `/webhooks/stripe` signatures
- `STRIPE_CURRENCY` — ISO currency code (defaults to `usd`)

All three are marked `sensitive = true` in `variables.tf` except `STRIPE_CURRENCY`.

## State

State lives in `s3://thong-biltong-tfstate` with DynamoDB locking. The bucket and lock table are created **once** by `bin/setup.sh` (Terraform can't bootstrap its own backend). Don't reconfigure the backend without good reason.

## CloudFront error mapping

`s3_cloudfront.tf` maps S3 404/403 responses to `/404.html` with HTTP **200** so the frontend's SPA fallback works for dynamic routes (`/shop/[slug]`). If you change `custom_error_response`, keep `response_code = 200` and `response_page_path = "/404.html"` or product detail pages will start returning 4xx.

## Pointers

- Module overview + bootstrap: `infra/README.md`
- Full deployment walkthrough: `docs/deployment.md`
- Secrets workflow (SOPS + KMS): `docs/deployment.md § Secrets management`
- What each output is used for: `docs/deployment.md § GitHub Actions variables`
