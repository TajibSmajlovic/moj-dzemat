import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  layoutCustomisations: {
    showPanel: (state, defaultValue) =>
      state.storyId === "welcome--catalogue" ? false : defaultValue,
  },
  theme: create({
    base: "light",
    brandTitle: "Moj Džemat - Komponente",
    brandUrl: "?path=/story/welcome--catalogue",
    brandTarget: "_self",
    colorPrimary: "#d19f47",
    colorSecondary: "#1a7459",
  }),
});
