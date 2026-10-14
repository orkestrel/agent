/** Limits untrusted metadata before JSON parsing or file allocation. */
export const STUDY_CUSTODY_BYTES = 16 * 1024 * 1024

/** Rejects names that Windows reserves even on other hosts. */
export const STUDY_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
