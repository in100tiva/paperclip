// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";

/**
 * AGENT-MSG-01 / Phase 10-01 — StatusBadge label prop contract.
 *
 * Verifies StatusBadge accepts an optional `label` prop that, when provided,
 * replaces the legacy `status.replace(/_/g, " ")` rendering. When `label` is
 * absent the legacy fallback is preserved (anti-regression for issues/runs/
 * workspaces consumers that do not yet pass translated labels).
 */

describe("StatusBadge label prop (AGENT-MSG-01)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders label prop when provided", () => {
    render(<StatusBadge status="running" label="em execução" />);
    expect(screen.getByText("em execução")).toBeTruthy();
  });

  it("falls back to status.replace when label absent", () => {
    render(<StatusBadge status="pending_approval" />);
    expect(screen.getByText("pending approval")).toBeTruthy();
  });
});
