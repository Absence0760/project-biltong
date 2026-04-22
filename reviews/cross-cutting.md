# Cross-cutting audit

## Summary

The monorepo is well-structured and the CI/CD design is sound. The primary
issues are stale documentation — the docs were partially written as design/
planning documents before features shipped and were never updated to reflect
the final implementation. Two of these are factually wrong about how a core
tool (SOPS) works. There are no broken CI pipelines, no hardcoded secrets,
and no misconfigured OIDC roles. The bin scripts are safe and idempotent.

---

## High priority

### H1. `deployment.md` describes `sops-init.sh` as generating an age keypair — it does not

- **File:** `docs/deployment.md:153-155`
- **Category:** inconsistency
- **Problem:** The "CONFIGURE" box in the full-setup-flow diagram says `sops-init.sh`
  "generates an age keypair at `~/.config/sops/age/keys.txt` (one-time), wires the
  public recipient into `.sops.yaml`, and seeds encrypted files from the examples."
  This is wrong. `bin/sops-init.sh` creates an AWS KMS key, not an age keypair. No
  file is written to `~/.config/sops/age/`. A new operator following this diagram
  would go looking for a key file that does not exist, then conclude setup failed.
- **Evidence:**
  ```
  docs/deployment.md:153:│  sops-init.sh generates an age keypair at                            │
  docs/deployment.md:154:│  ~/.config/sops/age/keys.txt (one-time), wires the public recipient  │
  docs/deployment.md:155:│  into .sops.yaml, and seeds encrypted files from the examples.       │
  ```
  `bin/sops-init.sh` does none of this — it calls `aws kms create-key` and
  `aws kms create-alias`. The word "age" does not appear anywhere in the script.
- **Proposed change:**
  ```diff
  -│  sops-init.sh generates an age keypair at                            │
  -│  ~/.config/sops/age/keys.txt (one-time), wires the public recipient  │
  -│  into .sops.yaml, and seeds encrypted files from the examples.       │
  +│  sops-init.sh creates an AWS KMS key (alias/thong-biltong-sops in    │
  +│  af-south-1), writes the alias ARN into .sops.yaml, and seeds the    │
  +│  encrypted files from the examples.                                  │
  ```
- **Risk if applied:** None — this is a comment/diagram-only change.
- **Verification:** Read `bin/sops-init.sh` lines 138–183 and confirm it calls
  `aws kms create-key` / `aws kms create-alias`, not `age-keygen`.

---

### H2. `orders-and-tracking.md` is a stale design document that contradicts the shipped implementation

- **File:** `docs/orders-and-tracking.md` — throughout
- **Category:** inconsistency
- **Problem:** The document is written in future tense ("new file", "MODIFIED",
  "PROPOSED — not yet created", "Not implemented yet") but every feature it
  describes is fully shipped. Two specific contradictions will mislead future
  maintainers:

  1. Line 78: `// studio/schemas/order.ts  (PROPOSED — not yet created)` — the
     file exists at `studio/schemas/order.ts`.
  2. Line 477: "Not implemented yet. Worth adding if enumeration becomes a
     concern…" — the rate limiter (`backend/src/rate-limit.ts`) is implemented
     and is documented as complete in both `docs/security.md` (Risk 2 table)
     and `docs/roadmap.md` (checked off).

- **Evidence:**
  ```
  orders-and-tracking.md:78: // studio/schemas/order.ts  (PROPOSED — not yet created)
  orders-and-tracking.md:477: Not implemented yet. Worth adding...
  orders-and-tracking.md:314: ├── sanity.ts                   NEW  Sanity write client wrapper
  orders-and-tracking.md:317: │   ├── order-lookup.ts         NEW  ...
  ```
  All files labelled `NEW` or `MODIFIED` exist in the repo.

- **Proposed change:** The document needs a status banner at the top and two
  targeted corrections:
  ```diff
  +**Status: implemented and live.** This document was the design spec; the
  +feature shipped in full. References to "NEW", "MODIFIED", and "PROPOSED" below
  +are historical artefacts of the planning phase.
  +
   ## Problem
  ```
  ```diff
  -// studio/schemas/order.ts  (PROPOSED — not yet created)
  +// studio/schemas/order.ts
  ```
  ```diff
  -Not implemented yet. Worth adding if enumeration becomes a concern — Hono has
  -middleware for it, or we can use AWS API Gateway throttling. See the roadmap.
  +Implemented: see `backend/src/rate-limit.ts`. Limit is 20 lookups/minute per IP.
  ```
  (The document already has a `Status: implemented.` header at line 1 — but the
  body still reads as a future-tense plan. The targeted fixes above are the
  critical corrections; the rest of the future-tense prose is lower priority.)

- **Risk if applied:** None — documentation only.
- **Verification:** `ls backend/src/rate-limit.ts` — exits 0. Check
  `docs/security.md § Risk 2` table shows rate limiting is implemented.

---

## Medium priority

### M1. `docs/deployment.md` says `bin/setup.sh` "shreds" the decrypted tfvars — it uses `rm -f`

- **File:** `docs/deployment.md:583`, `docs/deployment.md:625`, `docs/security.md:298`,
  `CLAUDE.md:38`, `bin/setup.sh:90,193`
- **Category:** inconsistency
- **Problem:** Four places in the docs say the plaintext `terraform.tfvars` is
  "shredded" on exit. The actual cleanup trap in `bin/setup.sh:90` uses `rm -f`,
  which unlinks the file but does not overwrite its content on disk. On a
  solid-state drive, `shred` is ineffective anyway (wear levelling), but the docs
  create a false security expectation. The gap is the same whether or not shred
  is used (SSD forensics is out of scope for this project's threat model), but
  the claims should match reality.
- **Evidence:**
  ```bash
  # bin/setup.sh:84-90
  cleanup() {
      if (( DECRYPTED_TFVARS == 1 )) && [[ -f "$TFVARS_FILE" ]]; then
          rm -f "$TFVARS_FILE"
      fi
  }
  ```
  ```
  # docs/deployment.md:583
  Created by `bin/setup.sh` as a scratch file, shredded on exit.
  # docs/security.md:298
  bin/setup.sh decrypts to a scratch file and shreds it on exit.
  ```
- **Proposed change:** Replace every instance of "shredded"/"shreds" that
  refers to this file with "deleted" or "removed":
  ```diff
  -Created by `bin/setup.sh` as a scratch file, shredded on exit.
  +Created by `bin/setup.sh` as a scratch file, deleted on exit.
  ```
  Also update `bin/setup.sh:193`:
  ```diff
  -ok "Decrypted to $TFVARS_FILE (will be shredded on exit)"
  +ok "Decrypted to $TFVARS_FILE (will be deleted on exit)"
  ```
  And comment at line 160:
  ```diff
  -# the duration of this script. The cleanup trap shreds the plaintext
  +# the duration of this script. The cleanup trap deletes the plaintext
  ```
- **Risk if applied:** None — documentation and comment changes only.
- **Verification:** `grep -r "shred" docs/ CLAUDE.md bin/` returns no results.

---

### M2. Dependabot does not cover the Terraform ecosystem

- **File:** `.github/dependabot.yml` — throughout
- **Category:** inconsistency
- **Problem:** The Dependabot configuration covers `npm` (three workspace
  packages) and `github-actions`, but there is no `terraform` ecosystem entry.
  `infra/main.tf` pins `hashicorp/aws ~> 5.70` and requires Terraform `>= 1.6.0`.
  Minor provider updates (new AWS services, bug fixes, security patches) will
  not be surfaced automatically.
- **Evidence:**
  ```yaml
  # .github/dependabot.yml — four update blocks, none for terraform
  - package-ecosystem: "npm"     # frontend
  - package-ecosystem: "npm"     # backend
  - package-ecosystem: "npm"     # studio
  - package-ecosystem: "github-actions"
  ```
  `infra/main.tf:20:  version = "~> 5.70"`
- **Proposed change:** Add a fifth entry to `.github/dependabot.yml`:
  ```diff
  +  # ---------------------------------------------------------------------------
  +  # Terraform providers
  +  # ---------------------------------------------------------------------------
  +  - package-ecosystem: "terraform"
  +    directory: "/infra"
  +    schedule:
  +      interval: "weekly"
  +      day: "monday"
  +      time: "06:00"
  +      timezone: "Africa/Johannesburg"
  +    open-pull-requests-limit: 2
  +    commit-message:
  +      prefix: "chore(infra)"
  +      include: "scope"
  ```
- **Risk if applied:** Dependabot will start opening PRs for provider updates.
  Each still requires a `terraform plan` review before merge — no automated
  apply happens. The `open-pull-requests-limit: 2` caps noise.
- **Verification:** After merging, a Dependabot PR should appear for
  `hashicorp/aws` within the next weekly cycle.

---

### M3. `docs/run-locally.md` gives a stale tracking URL format

- **File:** `docs/run-locally.md:191`
- **Category:** inconsistency
- **Problem:** Step 5 of the end-to-end test says "The customer email contains
  a `/track?token=…` link." The actual tracking URL format used by
  `backend/src/email-templates.ts` is `/track?ref=…&email=…` — two separate
  query parameters, no `token`. A developer following the local test walkthrough
  and looking for `token=` in the email will not find it.
- **Evidence:**
  ```
  docs/run-locally.md:191: The customer email contains a `/track?token=…` link.
  ```
  ```ts
  // backend/src/email-templates.ts:24
  return `${base}/track?ref=${ref}&email=${email}`;
  ```
- **Proposed change:**
  ```diff
  -The customer email contains a `/track?token=…` link. Open it — the track
  -page should show the current order status.
  +The customer email contains a `/track?ref=TB-…&email=…` link. Open it — the track
  +page should show the current order status.
  ```
- **Risk if applied:** None — documentation only.
- **Verification:** `grep "trackingLink\|track?" backend/src/email-templates.ts`
  shows `?ref=${ref}&email=${email}`.

---

### M4. `pnpm-workspace.yaml` does not list `infra/` — but `CLAUDE.md` and `README.md` list it as a workspace

- **File:** `pnpm-workspace.yaml:1-3`, `CLAUDE.md:10-17`
- **Category:** inconsistency
- **Problem:** `CLAUDE.md` has a "Workspaces" table with four entries: `frontend/`,
  `backend/`, `studio/`, and `infra/`. `README.md` refers to `infra/` as a workspace
  in its repo-layout diagram. `pnpm-workspace.yaml` lists only three packages:
  `frontend`, `backend`, `studio`. `infra/` has no `package.json` and is not a pnpm
  package — it's a Terraform module. The table heading "Workspaces (pnpm monorepo)"
  in `CLAUDE.md` includes it, which will confuse anyone who expects
  `pnpm --filter @thong-biltong/infra` to work.
- **Evidence:**
  ```yaml
  # pnpm-workspace.yaml
  packages:
    - frontend
    - backend
    - studio
  ```
  ```markdown
  # CLAUDE.md:9
  ## Workspaces (pnpm monorepo, Node ≥22)
  | Path | What | ...
  | `infra/` | Terraform (AWS + GitHub OIDC) | — | ...
  ```
- **Proposed change:** Rename the CLAUDE.md section heading to clarify:
  ```diff
  -## Workspaces (pnpm monorepo, Node ≥22)
  +## Project packages and modules (Node ≥22)
  ```
  And add a note to the `infra/` row:
  ```diff
  -| `infra/` | Terraform (AWS + GitHub OIDC) | — | `infra/CLAUDE.md` |
  +| `infra/` | Terraform (AWS + GitHub OIDC) — not a pnpm package | — | `infra/CLAUDE.md` |
  ```
- **Risk if applied:** None — documentation only.
- **Verification:** Confirm `pnpm --filter @thong-biltong/infra build` fails
  with "No packages were found matching the filter" — this is the current
  (correct) behaviour that the doc fix is documenting.

---

### M5. `claude.yml` requests `id-token: write` but does not perform any OIDC exchange itself

- **File:** `.github/workflows/claude.yml:30-34`
- **Category:** security
- **Problem:** The `claude` job requests `id-token: write`. The workflow does not
  contain any AWS OIDC step (`aws-actions/configure-aws-credentials`) or any other
  OIDC token exchange. No step in the workflow calls for a JWT from the GitHub token
  endpoint. The permission may be required internally by `anthropics/claude-code-action@v1`
  for Anthropic's own telemetry or auth, but that cannot be determined without
  reading the action's source. If the action does not use it, the permission is
  over-granted: a `contents: write + id-token: write` workflow that runs on
  issue/PR comments is a valuable target for exploitation if the auth guard is
  bypassed.
- **Evidence:**
  ```yaml
  # .github/workflows/claude.yml:30-34
  permissions:
    contents: write
    pull-requests: write
    issues: write
    id-token: write
  ```
  The workflow contains no `aws-actions/configure-aws-credentials`, no
  `getIDToken()` call, and no other step that consumes an OIDC JWT.
- **Proposed change:** Verify whether `anthropics/claude-code-action@v1` requires
  `id-token: write` by reading its action.yml or release notes. If it does not:
  ```diff
   permissions:
     contents: write
     pull-requests: write
     issues: write
  -  id-token: write
  ```
  If it does need it (e.g. for Anthropic identity verification), add a comment
  explaining why so future auditors don't remove it again.
- **Risk if applied:** If `id-token: write` is needed by the action and is removed,
  the action will fail when it tries to obtain an OIDC token. Test in a branch
  before merging.
- **Verification:** Run `@claude` against a test issue after the change; confirm
  the workflow completes without an OIDC error in the logs.

---

### M6. `docs/security.md` inaccurately describes the `.claude/settings.json` deny list

- **File:** `docs/security.md:312-313`, `.claude/settings.json` — throughout
- **Category:** inconsistency
- **Problem:** `security.md` says the deny list covers "force pushes, hard resets"
  but the actual entries are `"Bash(git push:*)"` (blocks ALL pushes, not just
  force pushes) and `"Bash(git commit:*)"` (blocks ALL commits). The security doc
  implies Claude can commit and push normally but not force-push; the actual
  settings prevent any commit or push whatsoever. This means the `claude.yml`
  workflow (which has `contents: write`) can never actually commit anything because
  the tool permissions block it — which may or may not be intentional.
- **Evidence:**
  ```json
  // .claude/settings.json
  "deny": [
    "Bash(git push:*)",
    "Bash(git commit:*)",
    ...
  ]
  ```
  ```markdown
  // docs/security.md:312
  force pushes, hard resets, `terraform apply/destroy`...
  ```
- **Proposed change:** If the intent is to block all git writes (not just
  destructive ones), update the doc to match:
  ```diff
  -destructive commands: AWS resource deletion (S3, CloudFront, Lambda,
  -IAM, KMS, Route 53, ACM, DynamoDB, CloudWatch Logs, Budgets), force
  -pushes, hard resets, `terraform apply/destroy`, `gh secret set`,
  +commands that write to external state: AWS resource deletion (S3, CloudFront, Lambda,
  +IAM, KMS, Route 53, ACM, DynamoDB, CloudWatch Logs, Budgets), all git push and commit
  +operations (commits must be created by a human, not Claude), hard resets, `terraform apply/destroy`, `gh secret set`,
  ```
  Alternatively, if Claude should be able to commit but not force-push, change
  the deny entry:
  ```diff
  -"Bash(git push:*)",
  -"Bash(git commit:*)",
  +"Bash(git push --force:*)",
  +"Bash(git push -f:*)",
  ```
  Pick one approach; update the other accordingly.
- **Risk if applied:** If the intent changes to "allow commits", Claude Code
  could start writing commits autonomously. The `contents: write` permission
  in `claude.yml` already allows this at the GitHub Actions level — the
  settings.json entry is the only guard. Don't remove the deny without
  understanding the implication.
- **Verification:** After updating, confirm `@claude` can or cannot commit
  depending on which path was taken.

---

## Low priority

### L1. `docs/architecture.md` file tree does not include `audit.yml` or `dependabot-lockfile.yml`

- **File:** `docs/architecture.md:112-116`
- **Category:** inconsistency
- **Problem:** The file tree in `architecture.md` lists only four workflow files
  under `.github/workflows/`: the three deploy workflows and `claude.yml`. The
  actual directory contains seven files. `audit.yml` and `dependabot-lockfile.yml`
  are mentioned in prose later in the document (`architecture.md:451`) but are
  absent from the tree.
- **Evidence:**
  ```
  # docs/architecture.md:112-116
  └── .github/
      └── workflows/
          ├── deploy-frontend.yml
          ├── deploy-backend.yml
          ├── deploy-studio.yml
          └── claude.yml
  ```
  Actual files: `ci.yml`, `audit.yml`, `dependabot-lockfile.yml` also exist.
- **Proposed change:**
  ```diff
   └── .github/
       └── workflows/
           ├── ci.yml                CI (typecheck + test) on every PR/push
           ├── deploy-frontend.yml   Build + sync to S3 + CloudFront invalidation
           ├── deploy-backend.yml    esbuild bundle + zip + update Lambda
           ├── deploy-studio.yml     `sanity deploy` with auth token
  +        ├── audit.yml             Weekly pnpm audit, opens GitHub issue on findings
  +        ├── dependabot-lockfile.yml  Regenerates root pnpm-lock.yaml on Dependabot PRs
           └── claude.yml            (Claude Code issue/PR automation)
  ```
- **Risk if applied:** None.
- **Verification:** `ls .github/workflows/` matches the updated tree.

---

### L2. `backend/package.json` build target is `--target=node20` but the Lambda runtime is `nodejs22.x`

- **File:** `backend/package.json:9`, `infra/lambda.tf:66`
- **Category:** inconsistency
- **Problem:** The esbuild bundle command uses `--target=node20`, which tells
  esbuild not to emit any syntax introduced after Node 20. The Lambda runs on
  `nodejs22.x`. This is safe (Node 22 runs Node 20-targeting output without
  issues), but it misrepresents the target runtime in the build script and prevents
  use of Node 22-only APIs in source code that the bundle would otherwise support.
- **Evidence:**
  ```json
  // backend/package.json:9
  "build": "esbuild ... --target=node20 ..."
  ```
  ```hcl
  // infra/lambda.tf:66
  runtime = "nodejs22.x"
  ```
- **Proposed change:**
  ```diff
  -"build": "esbuild src/lambda.ts --bundle --platform=node --target=node20 ...
  +"build": "esbuild src/lambda.ts --bundle --platform=node --target=node22 ...
  ```
- **Risk if applied:** esbuild will now permit Node 22 syntax in source. If
  there is any downstream target (e.g. a developer running the bundle locally
  on Node 20), that breaks. Given the `engines.node >= 22` constraint in the
  root `package.json`, this is not expected to matter.
- **Verification:** `pnpm backend build` completes; `pnpm backend check` clean.

---

### L3. No `.nvmrc` at the repo root to auto-select Node 22 for developers

- **File:** repo root — missing file
- **Category:** inconsistency
- **Problem:** `CLAUDE.md` states "Node ≥22" and `package.json` enforces it via
  the `engines` field, but there is no `.nvmrc` (or `.node-version`) at the
  repo root to let `nvm use` / `fnm use` / direnv auto-switch to the right
  version. A developer with an older active Node version will get an engines
  warning from pnpm but no automatic correction.
- **Proposed change:** Create `/Users/jhoward/private_repos/project-biltong/.nvmrc`:
  ```
  22
  ```
- **Risk if applied:** None. Developers without nvm/fnm ignore it; those with
  it get the right version automatically.
- **Verification:** `node --version` after `nvm use` in the repo root prints
  `v22.x.x`.
