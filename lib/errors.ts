/**
 * Safely extracts user-friendly error messages from Convex mutations or network errors.
 * Handles ConvexError data payloads and strips RPC technical prefixes.
 */
export function formatActionError(err: unknown, fallback = "An unexpected error occurred."): string {
  if (!err) return fallback;

  if (typeof err === "object") {
    // ConvexError has a .data property
    if ("data" in err && typeof (err as any).data === "string") {
      const dataStr = (err as any).data;
      return dataStr.replace(/^[A-Z_]+:\s*/, "");
    }

    // Standard Error message
    if ("message" in err && typeof (err as any).message === "string") {
      const msg = (err as any).message;

      // Match known application error codes: e.g. "RATE_LIMITED: You are sending requests..."
      const codeMatch = msg.match(/([A-Z_]+:\s*[^[\]\n]+)/);
      if (codeMatch) {
        return codeMatch[1].replace(/^[A-Z_]+:\s*/, "").trim();
      }

      // If generic Convex production server error
      if (msg.includes("Server Error Called by client")) {
        return "Unable to complete request. Please verify connection and try again.";
      }

      // Strip technical Convex RPC caller prefix "[CONVEX M(...)] [Request ID: ...] Error: ..."
      const cleaned = msg
        .replace(/^\[CONVEX [^\]]+\]\s*/i, "")
        .replace(/^\[Request ID: [^\]]+\]\s*/i, "")
        .replace(/^Error:\s*/i, "")
        .trim();

      return cleaned || fallback;
    }
  }

  if (typeof err === "string") {
    return err.replace(/^Error:\s*/, "");
  }

  return fallback;
}

