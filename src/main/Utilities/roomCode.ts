import {randomBytes, timingSafeEqual} from "node:crypto";
import {ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH} from "../../common/protocol.ts";

// The alphabet is exactly 32 characters, so five bits map onto it with no modulo bias
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i] & 0x1f];
  }
  return code;
}

export function keysMatch(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
