/** Caps encoded request and tool response measurements before dispatch. */
export const STUDY_TOOLS_BYTES = 65536

/** Caps scratch text and public prompt bytes before use. */
export const STUDY_TOOLS_TEXT = 1024

/** Caps scripted provider responses within one goal. */
export const STUDY_TOOLS_RESPONSES = 8

/** Caps calls emitted by one scripted response. */
export const STUDY_TOOLS_CALLS = 4

/** Admits one portable text filename without any directory traversal. */
export const STUDY_TOOLS_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.txt$/
