import {describe, expect, it} from 'vitest';
import {generateRoomCode, keysMatch} from '../../main/Utilities/roomCode.ts';
import {ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isValidRoomCode} from '../../common/protocol.ts';

describe('generateRoomCode', () => {
  it('produces a code of the expected length', () => {
    expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('honours an explicit length', () => {
    expect(generateRoomCode(4)).toHaveLength(4);
  });

  it('only uses alphabet characters', () => {
    for (let i = 0; i < 200; i++) {
      for (const character of generateRoomCode()) {
        expect(ROOM_CODE_ALPHABET).toContain(character);
      }
    }
  });

  it('produces codes the protocol considers valid', () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({length: 500}, () => generateRoomCode()));
    expect(codes.size).toBe(500);
  });

  // 32 characters is exactly five bits, so masking must not favour any part of the alphabet
  it('draws from the whole alphabet roughly evenly', () => {
    const counts = new Map<string, number>();
    const draws = 32 * 400;

    for (const character of generateRoomCode(draws)) {
      counts.set(character, (counts.get(character) ?? 0) + 1);
    }

    expect(counts.size).toBe(ROOM_CODE_ALPHABET.length);

    const expected = draws / ROOM_CODE_ALPHABET.length;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.6);
      expect(count).toBeLessThan(expected * 1.4);
    }
  });
});

describe('keysMatch', () => {
  it('matches identical keys', () => {
    expect(keysMatch('XKTP9QM2', 'XKTP9QM2')).toBe(true);
  });

  it('rejects different keys of the same length', () => {
    expect(keysMatch('XKTP9QM2', 'XKTP9QM3')).toBe(false);
  });

  it('rejects keys of different lengths without throwing', () => {
    expect(keysMatch('XKTP', 'XKTP9QM2')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(keysMatch(undefined as never, 'XKTP9QM2')).toBe(false);
    expect(keysMatch('XKTP9QM2', null as never)).toBe(false);
  });

  it('is case sensitive', () => {
    expect(keysMatch('XKTP9QM2', 'xktp9qm2')).toBe(false);
  });
});
