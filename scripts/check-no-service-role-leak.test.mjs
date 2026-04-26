import { describe, it, expect } from "vitest";
import { checkDiff } from "./check-no-service-role-leak.mjs";

const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("check-no-service-role-leak", () => {
  it("Test 1: clean diff exits 0", () => {
    const diff = `diff --git a/server/src/foo.ts b/server/src/foo.ts
+++ b/server/src/foo.ts
@@ -0,0 +1 @@
+export const x = "hello";
`;
    expect(checkDiff(diff)).toEqual({ exitCode: 0, errors: [] });
  });

  it("Test 2: JWT literal in ui/src/** is blocked", () => {
    const diff = `diff --git a/ui/src/lib/supabase.ts b/ui/src/lib/supabase.ts
+++ b/ui/src/lib/supabase.ts
@@ -0,0 +1 @@
+const k = "${fakeJwt}";
`;
    const r = checkDiff(diff);
    expect(r.exitCode).toBe(1);
    expect(r.errors[0]).toMatch(/ui\/src\/lib\/supabase\.ts:1.*JWT-shaped/);
  });

  it("Test 3: VITE_*SERVICE_ROLE* in any file is blocked", () => {
    const diff = `diff --git a/.env.example b/.env.example
+++ b/.env.example
@@ -0,0 +1 @@
+VITE_SUPABASE_SERVICE_ROLE_KEY=foo
`;
    const r = checkDiff(diff);
    expect(r.exitCode).toBe(1);
    expect(r.errors[0]).toMatch(/VITE_.*SERVICE_ROLE/);
  });

  it("Test 4: JWT literal in server/** is allowed", () => {
    const diff = `diff --git a/server/src/auth/supabase.ts b/server/src/auth/supabase.ts
+++ b/server/src/auth/supabase.ts
@@ -0,0 +1 @@
+const k = "${fakeJwt}";
`;
    expect(checkDiff(diff)).toEqual({ exitCode: 0, errors: [] });
  });

  it("Test 5: VITE_*SECRET* in ui env is blocked", () => {
    const diff = `diff --git a/ui/.env.local b/ui/.env.local
+++ b/ui/.env.local
@@ -0,0 +1 @@
+VITE_SUPABASE_SECRET=foo
`;
    const r = checkDiff(diff);
    expect(r.exitCode).toBe(1);
    expect(r.errors[0]).toMatch(/VITE_.*SECRET/);
  });

  it("Test 6: short eyJ literal (false positive) is allowed", () => {
    const diff = `diff --git a/ui/src/lib/foo.tsx b/ui/src/lib/foo.tsx
+++ b/ui/src/lib/foo.tsx
@@ -0,0 +1 @@
+const x = "eyJshort";
`;
    expect(checkDiff(diff)).toEqual({ exitCode: 0, errors: [] });
  });

  it("Test 7: removed line with JWT (line begins with -) is not flagged", () => {
    const diff = `diff --git a/ui/src/lib/supabase.ts b/ui/src/lib/supabase.ts
+++ b/ui/src/lib/supabase.ts
@@ -1 +1 @@
-const k = "${fakeJwt}";
+const k = process.env.PUBLIC_KEY;
`;
    expect(checkDiff(diff)).toEqual({ exitCode: 0, errors: [] });
  });
});
