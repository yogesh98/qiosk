type ParsedError = {
  message: string | null
  fieldErrors: Record<string, string>
}

/**
 * Parses errors thrown by TanStack Start server functions with Zod inputValidator.
 * The inputValidator serialises Zod issues as a JSON array in the error message.
 * This extracts human-readable per-field messages from that payload.
 */
export function parseFormError(err: unknown): ParsedError {
  const fieldErrors: Record<string, string> = {}

  if (!(err instanceof Error)) {
    return { message: 'Something went wrong. Please try again.', fieldErrors }
  }

  try {
    const issues = JSON.parse(err.message) as Array<{
      path?: Array<string>
      message?: string
    }>

    if (Array.isArray(issues) && issues.length > 0) {
      for (const issue of issues) {
        const field = issue.path?.[0]
        if (field && issue.message) {
          fieldErrors[field] = issue.message
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: null, fieldErrors }
      }

      const combined = issues.map((i) => i.message).filter(Boolean).join('. ')
      return { message: combined || 'Validation failed.', fieldErrors }
    }
  } catch {
    // not JSON — treat as a regular error message
  }

  return { message: err.message, fieldErrors }
}
