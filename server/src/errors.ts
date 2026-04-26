export class HttpError extends Error {
  status: number;
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
