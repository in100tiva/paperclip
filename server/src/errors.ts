export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

export function notFound(message = "Not found") {
  return new HttpError(404, message);
}

export function conflict(message: string, details?: unknown) {
  return new HttpError(409, message, details);
}

export function unprocessable(message: string, details?: unknown) {
  return new HttpError(422, message, details);
}

// ---------------------------------------------------------------------------
// UI-07 (Phase 9 / Plan 09-03a): *WithCode() helpers.
//
// These helpers run in PARALLEL to the legacy helpers above. They attach a
// stable, machine-readable `code` (e.g. "company.not-found", "invite.expired")
// to the HttpError instance so the error-handler middleware can emit it in
// the JSON response body. The client (Plan 09-03b) maps `code` →
// `t("errors:${code}")` for deterministic translation.
//
// Legacy helpers (badRequest/notFound/forbidden/unauthorized/conflict/unprocessable)
// remain byte-identical so the 130+ existing callsites keep emitting the legacy
// `{ error, details? }` body shape — zero regression.
// ---------------------------------------------------------------------------

export function badRequestWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(400, message, details);
  err.code = code;
  return err;
}

export function unauthorizedWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(401, message, details);
  err.code = code;
  return err;
}

export function forbiddenWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(403, message, details);
  err.code = code;
  return err;
}

export function notFoundWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(404, message, details);
  err.code = code;
  return err;
}

export function conflictWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(409, message, details);
  err.code = code;
  return err;
}

export function unprocessableWithCode(message: string, code: string, details?: unknown) {
  const err = new HttpError(422, message, details);
  err.code = code;
  return err;
}

/**
 * MULTI-04 (Phase 5): Claude account pool empty for the agent.
 * Thrown by claudeAccountsService.selectActiveAccount when no company account
 * is eligible (all exhausted, in cooldown, or disabled).
 */
export class NoAccountsAvailableError extends Error {
  constructor(
    public readonly companyId: string,
    public readonly agentId: string,
    message = `No Claude accounts available for agent ${agentId} in company ${companyId}`,
  ) {
    super(message);
    this.name = "NoAccountsAvailableError";
  }
}

/**
 * MULTI-04 (Phase 5): Claude account credential directory does not exist.
 * Thrown by claudeAccountsService.resolveCredentialDir when
 * `~/.paperclip/claude-accounts/<configDirSlug>/` is missing on the filesystem.
 * Operator must `mkdir -p` + `claude login` inside that directory.
 */
export class CredentialDirMissingError extends Error {
  constructor(
    public readonly configDirSlug: string,
    public readonly expectedPath: string,
    message = `Credential dir for slug "${configDirSlug}" not found at ${expectedPath}. Run \`claude login\` in that directory.`,
  ) {
    super(message);
    this.name = "CredentialDirMissingError";
  }
}
