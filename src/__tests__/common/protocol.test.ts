import {describe, expect, it} from 'vitest';
import {
  MAX_COMMAND_SECONDS,
  MAX_MESSAGE_LENGTH,
  MIN_SUPPORTED_PROTOCOL_VERSION,
  PEER_ID_PREFIX,
  PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  RTC_COMMAND_VERBS,
  formatRoomCode,
  isRtcFrame,
  isValidRoomCode,
  formatPairingCode,
  normalizeRoomCode,
  parsePairingCode,
  roomCodeToPeerId,
  validateCommand,
} from '../../common/protocol.ts';

const always = () => true;
const never = () => false;

describe('protocol version', () => {
  it('cannot require a version newer than the current one', () => {
    expect(MIN_SUPPORTED_PROTOCOL_VERSION).toBeLessThanOrEqual(PROTOCOL_VERSION);
  });
});

describe('room code alphabet', () => {
  // The whole point of Crockford base32 is that a code read off a screen cannot be mistyped
  it('excludes the characters that look like other characters', () => {
    expect(ROOM_CODE_ALPHABET).not.toContain('I');
    expect(ROOM_CODE_ALPHABET).not.toContain('L');
    expect(ROOM_CODE_ALPHABET).not.toContain('O');
    expect(ROOM_CODE_ALPHABET).not.toContain('U');
  });

  it('has 32 distinct characters', () => {
    expect(ROOM_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(ROOM_CODE_ALPHABET).size).toBe(32);
  });

  it('carries at least 40 bits of entropy', () => {
    const bits = Math.log2(ROOM_CODE_ALPHABET.length) * ROOM_CODE_LENGTH;
    expect(bits).toBeGreaterThanOrEqual(40);
  });
});

describe('normalizeRoomCode', () => {
  it('upper-cases a lower-case code', () => {
    expect(normalizeRoomCode('xktp9qm2')).toBe('XKTP9QM2');
  });

  it('strips the display dash', () => {
    expect(normalizeRoomCode('XKTP-9QM2')).toBe('XKTP9QM2');
  });

  it('strips surrounding whitespace', () => {
    expect(normalizeRoomCode('  XKTP 9QM2 ')).toBe('XKTP9QM2');
  });

  it('maps the ambiguous characters the way Crockford says', () => {
    expect(normalizeRoomCode('ILOU1234')).toBe('110V1234');
  });

  it('accepts a pasted pairing URL', () => {
    expect(normalizeRoomCode('https://example.com/remote#/r/XKTP9QM2')).toBe('XKTP9QM2');
  });

  it('accepts a pasted bare fragment', () => {
    expect(normalizeRoomCode('#/r/XKTP9QM2')).toBe('XKTP9QM2');
  });

  it('truncates anything longer than a code', () => {
    expect(normalizeRoomCode('XKTP9QM2EXTRA')).toBe('XKTP9QM2');
  });

  it('returns empty for input with nothing usable', () => {
    expect(normalizeRoomCode('---')).toBe('');
    expect(normalizeRoomCode('')).toBe('');
  });

  it('is idempotent', () => {
    const once = normalizeRoomCode('xktp-9qm2');
    expect(normalizeRoomCode(once)).toBe(once);
  });
});

describe('isValidRoomCode', () => {
  it('accepts a full length code', () => {
    expect(isValidRoomCode('XKTP-9QM2')).toBe(true);
  });

  it('rejects a short code', () => {
    expect(isValidRoomCode('XKTP')).toBe(false);
  });
});

describe('formatRoomCode', () => {
  it('groups a code for reading', () => {
    expect(formatRoomCode('XKTP9QM2')).toBe('XKTP-9QM2');
  });

  it('round-trips through normalize', () => {
    expect(normalizeRoomCode(formatRoomCode('XKTP9QM2'))).toBe('XKTP9QM2');
  });

  it('leaves an incomplete code ungrouped rather than lying about it', () => {
    expect(formatRoomCode('XKT')).toBe('XKT');
  });
});

describe('roomCodeToPeerId', () => {
  it('prefixes and lower-cases', () => {
    expect(roomCodeToPeerId('XKTP-9QM2')).toBe(`${PEER_ID_PREFIX}xktp9qm2`);
  });

  it('gives the same id however the code was typed', () => {
    expect(roomCodeToPeerId('xktp 9qm2')).toBe(roomCodeToPeerId('XKTP-9QM2'));
  });

  // PeerJS only accepts alphanumerics separated by single spaces, underscores or dashes
  it('produces an id PeerJS accepts', () => {
    expect(roomCodeToPeerId('XKTP9QM2')).toMatch(/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/);
  });
});

describe('pairing codes', () => {
  const pair = {sessionId: 'XKTP9QM2', key: '4FHB2WRD'};

  it('formats both halves grouped', () => {
    expect(formatPairingCode(pair)).toBe('XKTP-9QM2.4FHB-2WRD');
  });

  it('round-trips', () => {
    expect(parsePairingCode(formatPairingCode(pair))).toEqual(pair);
  });

  it('parses an ungrouped code', () => {
    expect(parsePairingCode('XKTP9QM2.4FHB2WRD')).toEqual(pair);
  });

  it('parses a lower-case code', () => {
    expect(parsePairingCode('xktp9qm2.4fhb2wrd')).toEqual(pair);
  });

  it('parses a full pairing URL', () => {
    expect(parsePairingCode('https://example.com/remote#/r/XKTP9QM2.4FHB2WRD')).toEqual(pair);
  });

  it.each([
    ['no separator', 'XKTP9QM24FHB2WRD'],
    ['a short session', 'XKTP.4FHB2WRD'],
    ['a short key', 'XKTP9QM2.4FHB'],
    ['a missing key', 'XKTP9QM2.'],
    ['empty input', ''],
  ])('rejects %s', (_label, input) => {
    expect(parsePairingCode(input)).toBeNull();
  });

  // The session id addresses the peer, so it must not reveal the key that grants control
  it('keeps the two halves independent', () => {
    const parsed = parsePairingCode('AAAAAAAA.BBBBBBBB');
    expect(parsed).toEqual({sessionId: 'AAAAAAAA', key: 'BBBBBBBB'});
  });
});

describe('isRtcFrame', () => {
  it('accepts a well formed frame', () => {
    expect(isRtcFrame({type: 'ping', update: {t: 1}})).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'ping'],
    ['a missing update', {type: 'ping'}],
    ['a missing type', {update: {}}],
    ['a non-object update', {type: 'ping', update: 5}],
  ])('rejects %s', (_label, value) => {
    expect(isRtcFrame(value)).toBe(false);
  });
});

describe('validateCommand', () => {
  it('accepts every verb it claims to support', () => {
    for (const verb of RTC_COMMAND_VERBS) {
      const command: Record<string, unknown> = {verb, timerId: 'timer1'};
      if (verb === 'set' || verb === 'jogSet' || verb === 'jogCurrent') command.seconds = 60;
      if (verb === 'sendMessage') command.message = 'stand by';

      expect(validateCommand(command, always).ok).toBe(true);
    }
  });

  it('rejects an unknown verb', () => {
    const result = validateCommand({verb: 'selfDestruct', timerId: 'timer1'}, always);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('invalid-command');
  });

  it('rejects a non-object', () => {
    expect(validateCommand('start', always).ok).toBe(false);
    expect(validateCommand(null, always).ok).toBe(false);
  });

  it('rejects a missing timerId', () => {
    expect(validateCommand({verb: 'start'}, always).ok).toBe(false);
  });

  it('reports a timer that does not exist', () => {
    const result = validateCommand({verb: 'start', timerId: 'ghost'}, never);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('unknown-timer');
  });

  it.each([
    ['a string', '60'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['absent', undefined],
  ])('rejects seconds that are %s', (_label, seconds) => {
    expect(validateCommand({verb: 'jogSet', timerId: 'timer1', seconds}, always).ok).toBe(false);
  });

  it('rejects seconds beyond the allowed range', () => {
    expect(validateCommand(
      {verb: 'set', timerId: 'timer1', seconds: MAX_COMMAND_SECONDS + 1},
      always
    ).ok).toBe(false);
  });

  it('allows a negative jog but not a negative set', () => {
    expect(validateCommand({verb: 'jogCurrent', timerId: 'timer1', seconds: -60}, always).ok).toBe(true);
    expect(validateCommand({verb: 'set', timerId: 'timer1', seconds: -60}, always).ok).toBe(false);
  });

  it('rejects an over-long message', () => {
    const message = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateCommand({verb: 'sendMessage', timerId: 'timer1', message}, always).ok).toBe(false);
  });

  it('accepts an empty message, which is how a message is cleared', () => {
    expect(validateCommand({verb: 'sendMessage', timerId: 'timer1', message: ''}, always).ok).toBe(true);
  });

  it('rejects a non-string message', () => {
    expect(validateCommand({verb: 'sendMessage', timerId: 'timer1', message: 5}, always).ok).toBe(false);
  });

  it('rejects a non-string ack id', () => {
    expect(validateCommand({verb: 'start', timerId: 'timer1', id: 5}, always).ok).toBe(false);
  });

  it('returns the command when it passes', () => {
    const result = validateCommand({verb: 'start', timerId: 'timer1'}, always);
    expect(result.command).toEqual({verb: 'start', timerId: 'timer1'});
  });
});
