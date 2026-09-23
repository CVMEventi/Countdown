/**
 * Decides when a source's templated message replaces the timer message, and when the previous one
 * comes back. The operator always wins: once the message differs from what was set, it is left
 * alone until the next clip.
 */
export class PlaybackMessageTracker {
  private _rendered: string | null = null
  private _previous: string | null = null
  // A render the operator overrode, not to be re-applied while it stays the same
  private _suppressed: string | null = null

  // Returns the message to set, or undefined to leave the current one untouched
  update(rendered: string | null, currentMessage: string | null): string | null | undefined {
    const next = rendered || null

    if (this._rendered !== null && currentMessage !== this._rendered) {
      this._rendered = null
      this._previous = null
      this._suppressed = next
      return undefined
    }

    if (next === null) {
      this._suppressed = null
      if (this._rendered === null) return undefined
      const previous = this._previous
      this._rendered = null
      this._previous = null
      return previous
    }

    if (next === this._rendered || next === this._suppressed) return undefined
    this._suppressed = null

    if (this._rendered === null) this._previous = currentMessage
    this._rendered = next
    return next
  }

  release(currentMessage: string | null): string | null | undefined {
    return this.update(null, currentMessage)
  }
}
