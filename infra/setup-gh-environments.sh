#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-gh-environments.sh
#
# Creates the GitHub environments (uat, prod) and configures the secrets
# required by the CI/CD pipeline (.github/workflows/ci-cd.yml).
#
# Usage:
#   ./infra/setup-gh-environments.sh            # interactive mode
#   ./infra/setup-gh-environments.sh --dry-run   # preview what would happen
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth status)
#   - Repo must have a GitHub remote (origin)
#
# Idempotent: safe to re-run — environments are created if missing,
# secrets are overwritten with the new values you provide.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Constants ───────────────────────────────────────────────────────────────
readonly ENVIRONMENTS=("uat" "prod")
readonly SECRETS=(
  "AZURE_CLIENT_ID"
  "AZURE_TENANT_ID"
  "AZURE_SUBSCRIPTION_ID"
  "ACR_NAME"
  "CONTAINER_APP_NAME"
  "RESOURCE_GROUP"
)

# ─── Colour helpers (disabled when stdout is not a terminal) ─────────────────
if [[ -t 1 ]]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  CYAN='\033[0;36m'
  RESET='\033[0m'
else
  BOLD='' DIM='' GREEN='' YELLOW='' RED='' CYAN='' RESET=''
fi

info()  { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}⚠${RESET} %s\n" "$*"; }
err()   { printf "${RED}✗${RESET} %s\n" "$*" >&2; }
header(){ printf "\n${BOLD}${CYAN}── %s ──${RESET}\n\n" "$*"; }

# ─── Parse flags ─────────────────────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run]"
      echo ""
      echo "Creates GitHub environments (uat, prod) and sets the secrets"
      echo "required by the CI/CD workflow."
      echo ""
      echo "Options:"
      echo "  --dry-run   Show what would be done without making changes"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *)
      err "Unknown option: $arg"
      echo "Usage: $0 [--dry-run]"
      exit 1
      ;;
  esac
done

if $DRY_RUN; then
  warn "Dry-run mode — no changes will be made"
  echo ""
fi

# ─── Prerequisites ───────────────────────────────────────────────────────────
header "Checking prerequisites"

# gh CLI must be installed
if ! command -v gh &>/dev/null; then
  err "gh CLI is not installed. Install it: https://cli.github.com"
  exit 1
fi
info "gh CLI found ($(gh --version | head -1))"

# gh must be authenticated
if ! gh auth status &>/dev/null; then
  err "gh CLI is not authenticated. Run: gh auth login"
  exit 1
fi
info "gh CLI is authenticated"

# ─── Auto-detect repository ─────────────────────────────────────────────────
# Try to resolve OWNER/REPO from the git remote. Falls back to gh CLI.
detect_repo() {
  # Method 1: parse the origin remote URL
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)

  if [[ -n "$remote_url" ]]; then
    # Handle SSH (git@github.com:owner/repo.git) and HTTPS URLs
    local repo
    repo=$(echo "$remote_url" \
      | sed -E 's#(git@github\.com:|https://github\.com/)##' \
      | sed -E 's/\.git$//')
    if [[ "$repo" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
      echo "$repo"
      return
    fi
  fi

  # Method 2: ask gh CLI
  gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true
}

REPO=$(detect_repo)
if [[ -z "$REPO" ]]; then
  err "Could not detect GitHub repository from git remote."
  err "Run this script from inside the cloned repo."
  exit 1
fi
info "Repository: ${BOLD}${REPO}${RESET}"

# ─── Suggested defaults per environment ──────────────────────────────────────
# Based on the Bicep naming convention: resourcePrefix = ellmud-{env}
#   ACR names are alphanumeric-only:  ellmud{env}acr  → e.g. ellmuduatacr
#   Container App:                    ellmud-{env}-app
#   Resource Group:                   ellmud-rg
declare -A DEFAULTS
for env in "${ENVIRONMENTS[@]}"; do
  DEFAULTS["${env}_ACR_NAME"]="ellmud${env}acr"
  DEFAULTS["${env}_CONTAINER_APP_NAME"]="ellmud-${env}-app"
  DEFAULTS["${env}_RESOURCE_GROUP"]="ellmud-rg"
  # No sensible default for Azure identity values — leave blank
  DEFAULTS["${env}_AZURE_CLIENT_ID"]=""
  DEFAULTS["${env}_AZURE_TENANT_ID"]=""
  DEFAULTS["${env}_AZURE_SUBSCRIPTION_ID"]=""
done

# ─── Prompt helper ───────────────────────────────────────────────────────────
# Reads a value from the user, offering a default if one exists.
# Usage: prompt_secret ENV_NAME SECRET_NAME → sets REPLY
prompt_secret() {
  local env="$1" secret="$2"
  local key="${env}_${secret}"
  local default="${DEFAULTS[$key]:-}"
  local prompt_text

  if [[ -n "$default" ]]; then
    prompt_text="  ${secret} ${DIM}[${default}]${RESET}: "
  else
    prompt_text="  ${secret}: "
  fi

  # Read from /dev/tty so piped input doesn't interfere
  printf "%b" "$prompt_text"
  read -r REPLY </dev/tty || true

  # Use default when the user presses Enter on a pre-filled field
  if [[ -z "$REPLY" && -n "$default" ]]; then
    REPLY="$default"
  fi

  if [[ -z "$REPLY" ]]; then
    err "  ${secret} cannot be empty."
    exit 1
  fi
}

# ─── Run gh command (or print it in dry-run mode) ────────────────────────────
run_gh() {
  if $DRY_RUN; then
    printf "  ${DIM}[dry-run]${RESET} gh %s\n" "$*"
  else
    gh "$@"
  fi
}

# ─── Create environments & set secrets ───────────────────────────────────────
for env in "${ENVIRONMENTS[@]}"; do
  header "Environment: ${env}"

  # Create the GitHub environment (idempotent — gh api PUT is a create-or-update)
  echo "Creating environment '${env}' on ${REPO}..."
  if $DRY_RUN; then
    printf "  ${DIM}[dry-run]${RESET} gh api -X PUT repos/%s/environments/%s\n" "$REPO" "$env"
  else
    gh api -X PUT "repos/${REPO}/environments/${env}" \
      --silent \
      --input - <<< '{}' || {
        err "Failed to create environment '${env}'. Do you have admin access?"
        exit 1
      }
  fi
  info "Environment '${env}' exists"

  # Collect secret values interactively
  echo ""
  echo "Enter secret values for ${BOLD}${env}${RESET}:"
  echo "${DIM}  (press Enter to accept the suggested default shown in brackets)${RESET}"
  echo ""

  declare -A secrets_for_env
  for secret in "${SECRETS[@]}"; do
    prompt_secret "$env" "$secret"
    secrets_for_env["$secret"]="$REPLY"
  done

  # Set each secret on the environment
  echo ""
  echo "Setting secrets..."
  for secret in "${SECRETS[@]}"; do
    value="${secrets_for_env[$secret]}"
    if $DRY_RUN; then
      printf "  ${DIM}[dry-run]${RESET} gh secret set %s --repo %s --env %s\n" "$secret" "$REPO" "$env"
    else
      echo "${value}" | gh secret set "$secret" \
        --repo "$REPO" \
        --env "$env" || {
          err "Failed to set secret ${secret} for environment ${env}"
          exit 1
        }
    fi
    info "  ${secret} ✓"
  done

  unset secrets_for_env
  declare -A secrets_for_env
done

# ─── Summary ─────────────────────────────────────────────────────────────────
header "Done"

if $DRY_RUN; then
  warn "Dry-run complete — no changes were made."
  echo "  Re-run without --dry-run to apply."
else
  info "GitHub environments configured for ${BOLD}${REPO}${RESET}"
  echo ""
  echo "  Environments created:"
  for env in "${ENVIRONMENTS[@]}"; do
    echo "    • ${env}  (${#SECRETS[@]} secrets)"
  done
  echo ""
  echo "  Verify at: https://github.com/${REPO}/settings/environments"
fi
