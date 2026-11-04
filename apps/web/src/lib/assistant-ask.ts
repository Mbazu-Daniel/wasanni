type AskListener = (question: string) => void;

const askListeners = new Set<AskListener>();

export const onAssistantAsk = (listener: AskListener): (() => void) => {
  askListeners.add(listener);

  return () => askListeners.delete(listener);
};

export const askAboutGuide = (title: string): void => {
  const question =
    `Explain the Wasanni "${title}" guide: which endpoints it covers, what each request needs, ` +
    "and the first call I should make.";

  askListeners.forEach((listener) => listener(question));
};
