import { describe, it, expect } from "vitest";
import { NoAccountsAvailableError, CredentialDirMissingError } from "./errors.js";

describe("MULTI-04 custom errors", () => {
  describe("NoAccountsAvailableError", () => {
    it("is an instance of Error and exposes companyId/agentId props", () => {
      const err = new NoAccountsAvailableError("co-1", "agent-1");
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(NoAccountsAvailableError);
      expect(err.companyId).toBe("co-1");
      expect(err.agentId).toBe("agent-1");
      expect(err.name).toBe("NoAccountsAvailableError");
      expect(err.message).toContain("agent-1");
      expect(err.message).toContain("co-1");
    });

    it("accepts a custom message", () => {
      const err = new NoAccountsAvailableError("co-2", "agent-2", "custom msg");
      expect(err.message).toBe("custom msg");
    });
  });

  describe("CredentialDirMissingError", () => {
    it("is an instance of Error and exposes configDirSlug/expectedPath props", () => {
      const err = new CredentialDirMissingError("slug-a", "/home/u/.paperclip/claude-accounts/slug-a");
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CredentialDirMissingError);
      expect(err.configDirSlug).toBe("slug-a");
      expect(err.expectedPath).toBe("/home/u/.paperclip/claude-accounts/slug-a");
      expect(err.name).toBe("CredentialDirMissingError");
      expect(err.message).toContain("slug-a");
      expect(err.message).toContain("claude login");
    });

    it("accepts a custom message", () => {
      const err = new CredentialDirMissingError("slug-b", "/path", "custom msg");
      expect(err.message).toBe("custom msg");
    });
  });
});
