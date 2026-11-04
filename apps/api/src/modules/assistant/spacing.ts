export type SpacingState = {
  fenced: boolean;
  inline: boolean;
  tail: string;
  inCode: boolean;
};

export const createSpacingState = (): SpacingState => ({ fenced: false, inline: false, tail: "", inCode: false });

const isSentenceJoint = (previous: string, mark: string, next: string): boolean =>
  /[a-z]/.test(previous) && /[.!?]/.test(mark) && /[A-Z]/.test(next);

export const spaceSentences = (text: string, state: SpacingState): string => {
  let fixed = "";

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
    const after = text[index + 2] as string | undefined;

    if (character === "`" && next === "`" && text[index + 2] === "`") {
      state.fenced = !state.fenced;
      fixed += "```";
      index += 2;
      continue;
    }

    if (character === "`" && !state.fenced) {
      state.inline = !state.inline;
      fixed += character;
      continue;
    }

    if (
      !state.fenced &&
      !state.inline &&
      next !== undefined &&
      after !== undefined &&
      isSentenceJoint(character, next, after)
    ) {
      fixed += `${character}${next} `;
      index += 1;
      continue;
    }

    fixed += character;
  }

  state.tail = (state.tail + fixed).slice(-2);
  state.inCode = state.fenced || state.inline;

  return fixed;
};
