import { PROSE_WORDS } from "./constants.ts";

export type SpacingState = {
  fenced: boolean;
  inline: boolean;
  tail: string;
  inCode: boolean;
  pending: string;
  cap: boolean;
  word: string;
};

export const createSpacingState = (): SpacingState => ({
  fenced: false,
  inline: false,
  tail: "",
  inCode: false,
  pending: "",
  cap: false,
  word: "",
});

const isSentenceJoint = (previous: string, mark: string, next: string): boolean =>
  /[a-z]/.test(previous) && /[.!?]/.test(mark) && /[A-Z]/.test(next);

const isDash = (character: string): boolean => character === "—" || character === "–";

const isPunct = (character: string): boolean =>
  character === "." ||
  character === "," ||
  character === "!" ||
  character === "?" ||
  character === ";" ||
  character === ":" ||
  character === "%";

export const spaceSentences = (
  input: string,
  state: SpacingState,
  opts?: { glossary?: boolean },
): string => {
  let text = `${state.word}${state.pending}${input}`;
  state.word = "";
  state.pending = "";

  let fixed = "";
  let capNext = state.cap;
  state.cap = false;
  let word = "";

  const flushWord = (): void => {
    if (word === "") return;
    const dotted = /^(.+?)(\.+)$/.exec(word);
    const core = dotted?.[1] ?? word;
    const dots = dotted?.[2] ?? "";
    const plain = opts?.glossary === true ? PROSE_WORDS[core] : undefined;
    if (plain !== undefined) {
      fixed += (capNext ? plain.charAt(0).toUpperCase() + plain.slice(1) : plain) + dots;
    } else if (capNext) {
      fixed += word.replace(/^[a-z]/, (c) => c.toUpperCase());
    } else {
      fixed += word;
    }
    word = "";
    capNext = false;
  };

  if (
    !state.inCode &&
    state.tail.length === 2 &&
    text.length > 0 &&
    isSentenceJoint(state.tail[0] as string, state.tail[1] as string, text[0] as string)
  ) {
    fixed += " ";
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] as string;
    const next = text[index + 1] as string | undefined;

    if (character === "`") {
      flushWord();
      if (next === "`" && text[index + 2] === "`") {
        state.fenced = !state.fenced;
        fixed += "```";
        index += 2;
        continue;
      }
      if (!state.fenced) {
        state.inline = !state.inline;
      }
      fixed += character;
      continue;
    }

    if (!state.fenced && !state.inline && /[A-Za-z0-9_.]/.test(character)) {
      word += character;
      continue;
    }

    flushWord();

    if (!state.fenced && !state.inline) {
      if (character === " " && fixed.endsWith(" ")) continue;

      if (isPunct(character)) {
        if (fixed.endsWith(" ")) fixed = fixed.slice(0, -1);
        if (
          (character === "." || character === "!" || character === "?") &&
          /[a-z]/.test(fixed.slice(-1)) &&
          next !== undefined &&
          /[A-Z]/.test(next)
        ) {
          fixed += `${character} `;
        } else {
          fixed += character;
        }
        continue;
      }

      if (isDash(character) && fixed.endsWith(" ") && next === " ") {
        fixed = `${fixed.slice(0, -1)}. `;
        capNext = true;
        index += 1;
        continue;
      }
    }

    fixed += character;
  }

  state.word = word;
  const held = /[ \u2014\u2013]{1,2}$/.exec(fixed);
  if (held !== null) {
    state.pending = held[0];
    fixed = fixed.slice(0, -held[0].length);
  }
  if (capNext) state.cap = true;

  state.tail = (state.tail + fixed).slice(-2);
  state.inCode = state.fenced || state.inline;

  return fixed;
};
