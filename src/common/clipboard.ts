/**
 * The remote is served over plain http on a LAN address, which is not a secure context, so
 * navigator.clipboard is undefined on phones. Callers must handle a false return by falling back
 * to letting the user select and copy the text by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  const electronClipboard = (globalThis as { clipboard?: { writeText?: (value: string) => void } }).clipboard

  if (electronClipboard?.writeText) {
    electronClipboard.writeText(text)
    return true
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or an insecure context: fall through to the manual path
    }
  }

  return false
}
