# Infra audit

## Summary

The infra is well-structured for its scale: least-privilege IAM, OAC-gated S3, HSTS+security headers on CloudFront, reserved Lambda concurrency, KMS-backed SOPS for secrets, and a sensible budget alert. Four findings are worth fixing: the `terraform.tfvars.sops` encrypted file is absent from the repo (the whole SOPS workflow is effectively broken until it is created), the CloudFront price class comment is factually wrong and the wrong class is selected for a South African audience, the GitHub OIDC thumbprint is the old leaf-certificate value that predates GitHub's 2023 CA rotation, and `stripe_secret_key` / `stripe_webhook_secret` silently default to empty strings which lets Terraform apply succeed without Stripe configured.

---

## High priority

### H1. `terraform.tfvars.sops` does not exist — encrypted secrets file is missing from the repo

- **File:** `infra/terraform.tfvars.sops` (absent)
- **Issue:** The entire SOPS workflow described in `docs/deployment.md § Secrets management` and `infra/CLAUDE.md § Workflow` depends on this file being committed. `bin/sops-init.sh` is supposed to create and commit it, but it has never been run — the file is not present in the working tree or in git history. Until it exists, `bin/setup.sh` cannot decrypt tfvars, `terraform apply` requires a manually created plaintext `terraform.tfvars`, and a new-machine recovery produces nothing to decrypt.
- **Fix:** Run `./bin/sops-init.sh` (after authenticating to AWS), which creates the KMS key, seeds `infra/terraform.tfvars.sops` and `backend/.env.sops` from the example files, and updates `.sops.yaml` with the real KMS ARN. Then commit both `infra/terraform.tfvars.sops` and `backend/.env.sops` (and the updated `.sops.yaml`). The `.sops.yaml` file currently contains placeholder strings `KMS_REGION_PLACEHOLDER` and `KMS_ACCOUNT_PLACEHOLDER` — those must be replaced with real values before sops can encrypt or decrypt.
- **Risk if applied:** None — this is additive. The commit will contain encrypted blobs; decryption requires AWS IAM access to the KMS key, which is the intended access model.
- **Verification:** After running the script and committing, `sops -d infra/terraform.tfvars.sops` on a machine with `kms:Decrypt` should produce the plaintext tfvars without error.

---

## Medium priority

### M1. CloudFront `PriceClass_100` does not include Africa — comment is wrong and the class is suboptimal for this site's audience

- **File:** `infra/s3_cloudfront.tf:149`
- **Issue:** `PriceClass_100` covers North America and Europe only. South African visitors are served from a European PoP (London or Frankfurt, ~9 000 km away) not from the Cape Town edge. The inline comment `# North America + Europe. Cheapest class that still covers ZA traffic well.` is factually incorrect — `PriceClass_100` does not cover Africa at all. Africa (including Cape Town) is included only in `PriceClass_200` and `PriceClass_All`. For a brand whose primary audience is in South Africa (`thongbiltong.co.za`), serving from a European PoP meaningfully increases latency on a static brochure site.
- **Evidence:**
  ```hcl
  price_class = "PriceClass_100" # North America + Europe. Cheapest class that still covers ZA traffic well.
  ```
- **Fix:**
  ```diff
  -  price_class = "PriceClass_100" # North America + Europe. Cheapest class that still covers ZA traffic well.
  +  price_class = "PriceClass_200" # NA + Europe + Asia + ME + Africa. Includes the Cape Town PoP for the primary ZA audience.
  ```
  `PriceClass_200` is approximately twice the egress cost of `PriceClass_100` for European traffic, but at the scale described (~$1–2/month baseline) the absolute difference is cents.
- **Risk if applied:** CloudFront will propagate the price-class change (~15 minutes). No downtime. Slightly higher egress cost from additional PoPs, negligible at this traffic level.
- **Verification:** After `terraform apply`, confirm the distribution's price class in the AWS console under CloudFront → Distributions → your distribution → General. Use a tool like `curl -w "%{time_connect}" https://thongbiltong.co.za/` from a South African IP to observe reduced TTFB.

### M2. GitHub OIDC thumbprint is the pre-2023 leaf-certificate value

- **File:** `infra/github_oidc.tf:13`
- **Issue:** The `thumbprint_list` contains `6938fd4d98bab03faadb97b34396831e3780aea1`, which is the SHA-1 fingerprint of the GitHub Actions OIDC endpoint's old intermediate CA (pre-November 2022). GitHub rotated CAs in 2022/2023; the current thumbprint is `1c58a3a8518e8759bf075b76b750d4f2df264fcd`. AWS stopped validating the thumbprint for well-known OIDC providers (including GitHub) in August 2023 — so in practice the wrong value does not break anything today — but the list should be updated to the current value so the config accurately reflects the real certificate chain and is not surprising to anyone reviewing it. Including both thumbprints during a transition is the safe approach.
- **Evidence:**
  ```hcl
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  ```
- **Fix:**
  ```diff
  -  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  +  thumbprint_list = [
  +    "6938fd4d98bab03faadb97b34396831e3780aea1",  # legacy, kept for continuity
  +    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",  # current as of 2023 CA rotation
  +  ]
  ```
- **Risk if applied:** Zero. AWS ignores the thumbprint for GitHub's OIDC provider as of August 2023; this is a documentation-accuracy fix only.
- **Verification:** `terraform apply` should update the provider resource with no errors. OIDC-based workflow runs (deploy-backend, deploy-frontend) should continue to succeed.

### M3. `stripe_secret_key` and `stripe_webhook_secret` default to empty string — Terraform applies silently without Stripe configured

- **File:** `infra/variables.tf:78-85`
- **Issue:** Both Stripe secret variables have `default = ""`. This means `terraform apply` succeeds even when neither value is set in tfvars, and the Lambda is deployed with empty `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables. Payments and Stripe webhook verification silently fail at runtime — the backend does runtime nil-checks (`orders.ts:62-63`, `stripe-webhook.ts:22-24`) but there is no Terraform-layer guard that prevents deploying a misconfigured Lambda. The CLAUDE.md and README both list these as required for a production deploy, yet the variable definitions allow omission without any warning.
- **Evidence:**
  ```hcl
  variable "stripe_secret_key" {
    ...
    sensitive = true
    default   = ""
  }

  variable "stripe_webhook_secret" {
    ...
    sensitive = true
    default   = ""
  }
  ```
- **Fix:** Add a `validation` block to each variable to reject empty strings:
  ```diff
  variable "stripe_secret_key" {
    description = "..."
    type        = string
    sensitive   = true
    default     = ""
  +
  +  validation {
  +    condition     = var.stripe_secret_key == "" || can(regex("^sk_(test|live)_", var.stripe_secret_key))
  +    error_message = "stripe_secret_key must be empty (Stripe not configured) or start with sk_test_ or sk_live_."
  +  }
  }
  ```
  Alternatively, remove the `default = ""` entirely to force the operator to explicitly set the variable. The empty-default exists to avoid breaking a deploy where Stripe is genuinely not yet configured; if that is the intended use case, add a `description` note and a `validation` that at least checks the format when non-empty.
- **Risk if applied:** Any existing `terraform apply` that omits these variables will now fail at plan time rather than silently deploying a broken Lambda. This is the desired behaviour.
- **Verification:** Run `terraform plan` without Stripe variables in tfvars and confirm the validation error appears. Run `terraform plan` with valid `sk_test_...` / `whsec_...` values and confirm it succeeds.

---

## Low priority

### L1. Security headers policy is not attached to the `/api/*` cache behavior

- **File:** `infra/s3_cloudfront.tf:174-188`
- **Issue:** The `aws_cloudfront_response_headers_policy.security` resource (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) is attached only to `default_cache_behavior` (the S3/HTML origin), not to the `ordered_cache_behavior` for `/api/*`. HSTS is not a meaningful gap — once a browser receives the header on any response from the domain it applies to all paths for the `max-age` duration. However, `Referrer-Policy: strict-origin-when-cross-origin` is relevant to API responses that include order/tracking data in the URL (e.g. `/api/orders?email=…`), and it will not be sent on those responses. The `X-Content-Type-Options: nosniff` header also has no effect on JSON API responses, so the only real gap is `Referrer-Policy` on API endpoints.
- **Fix:**
  ```diff
     ordered_cache_behavior {
       path_pattern             = "/api/*"
       ...
  +    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  
       function_association { ... }
     }
  ```
- **Risk if applied:** None. Adds headers to API responses that browsers will honour when the API URL appears in a navigation or fetch context.
- **Verification:** `curl -I https://thongbiltong.co.za/api/health` should include `Referrer-Policy: strict-origin-when-cross-origin` after the change.

### L2. `lambda:GetFunction` in the GitHub Actions deploy role is unused

- **File:** `infra/github_oidc.tf:85`
- **Issue:** The CI role's `LambdaUpdate` statement grants `lambda:GetFunction` in addition to `lambda:UpdateFunctionCode`. The `deploy-backend.yml` workflow uses only `aws lambda update-function-code`; it never calls `get-function`. The extra permission is harmless (it does not allow reading environment variables, which requires `lambda:GetFunctionConfiguration` + decrypted env access), but unnecessary permissions should not be granted under a least-privilege policy.
- **Evidence:**
  ```hcl
  actions = [
    "lambda:UpdateFunctionCode",
    "lambda:GetFunction",      # not used by deploy-backend.yml
  ]
  ```
- **Fix:**
  ```diff
    actions = [
      "lambda:UpdateFunctionCode",
  -   "lambda:GetFunction",
    ]
  ```
- **Risk if applied:** If any future workflow or manual operator task from CI needs to inspect the function, they would need to add the permission back. Check all workflows before removing.
- **Verification:** After `terraform apply`, re-run `deploy-backend.yml` manually via `gh workflow run deploy-backend.yml` and confirm it succeeds.

### L3. API Gateway access logging is not enabled

- **File:** `infra/api_gateway.tf:41-45`
- **Issue:** The `aws_apigatewayv2_stage.default` resource has no `access_log_settings` block. Without it, API Gateway does not write structured access logs (method, route, status code, latency, IP). The Lambda's CloudWatch log group captures application-level logs, but gateway-level logs (4xx/5xx at the gateway layer, before the Lambda is invoked) are invisible. This is the layer at which a misrouted request or an unexpected 403 from API Gateway would silently disappear.
- **Fix:**
  ```hcl
  resource "aws_cloudwatch_log_group" "api_gateway" {
    name              = "/aws/apigateway/${local.project}-backend"
    retention_in_days = 30
  }

  resource "aws_apigatewayv2_stage" "default" {
    api_id      = aws_apigatewayv2_api.backend.id
    name        = "$default"
    auto_deploy = true

    access_log_settings {
      destination_arn = aws_cloudwatch_log_group.api_gateway.arn
      format = jsonencode({
        requestId      = "$context.requestId"
        ip             = "$context.identity.sourceIp"
        httpMethod     = "$context.httpMethod"
        routeKey       = "$context.routeKey"
        status         = "$context.status"
        responseLength = "$context.responseLength"
        integrationError = "$context.integrationErrorMessage"
      })
    }
  }
  ```
  Also add `logs:CreateLogDelivery`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, and `logs:DescribeLogStreams` permissions to the API Gateway service role, or use an account-level CloudWatch Logs resource policy (the usual pattern for API Gateway v2).
- **Risk if applied:** A small increase in CloudWatch Logs volume (one log line per request). Negligible cost at this scale.
- **Verification:** After `terraform apply`, send a test request through API Gateway and confirm the log group `/aws/apigateway/thong-biltong-backend` receives an entry.

### L4. `.sops.yaml` contains unresolved placeholder ARNs — must be replaced before SOPS is usable

- **File:** `.sops.yaml:71-76` (repo root)
- **Issue:** Both `creation_rules` entries contain `arn:aws:kms:KMS_REGION_PLACEHOLDER:KMS_ACCOUNT_PLACEHOLDER:alias/thong-biltong-sops`. This is expected on a fresh clone before `bin/sops-init.sh` is run (the script replaces these placeholders), but it means `sops` will fail with a parse/encrypt error for anyone who tries to use it before running the init script. The README and CLAUDE.md both say to run `./bin/sops-init.sh` first, so this is a workflow-documentation issue more than a code defect, but the file should not be committed in a broken state if `sops-init.sh` has been run (see H1 — it has not been run on this repo).
- **Fix:** This resolves automatically once H1 is addressed (running `bin/sops-init.sh` replaces the placeholders and commits the updated `.sops.yaml`).
- **Risk if applied:** None — the placeholder text is deliberately inert until the init script replaces it.
- **Verification:** After `bin/sops-init.sh` completes, `cat .sops.yaml` should show a real ARN (`arn:aws:kms:af-south-1:<account-id>:alias/thong-biltong-sops`) in place of the placeholders.
