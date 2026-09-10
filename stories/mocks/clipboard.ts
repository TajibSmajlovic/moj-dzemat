import { fn } from "storybook/test";

export const copyText = fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
