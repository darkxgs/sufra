import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijkmnopqrstuvwxyz";
const short = customAlphabet(alphabet, 14);
// No 0/o, 1/l/i: table codes are sometimes typed in by hand.
const plain = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);
const digits = customAlphabet("0123456789", 6);

/** Prefixed, URL-safe ids: `ord_7h2k...`. The prefix makes logs readable. */
export const newId = (prefix: string) => `${prefix}_${short()}`;

/** The code in a table's QR link: unguessable, easy to read aloud. */
export const newTableToken = () => plain();

/** A six-digit staff PIN. */
export const newPin = () => digits();

/** A one-time pairing code for signing a kitchen screen in by QR. */
export const newPairCode = () => customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 16)();
