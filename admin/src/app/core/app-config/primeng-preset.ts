import { definePreset } from "@openng/optimus-ui-themes";
import Aura from "@openng/optimus-ui-themes/aura";

/**
 * Custom PrimeNG theme preset based on Aura, using an orange primary color
 * instead of Aura's default emerald.
 */
export const FoxnoxPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "{orange.50}",
      100: "{orange.100}",
      200: "{orange.200}",
      300: "{orange.300}",
      400: "{orange.400}",
      500: "{orange.500}",
      600: "{orange.600}",
      700: "{orange.700}",
      800: "{orange.800}",
      900: "{orange.900}",
      950: "{orange.950}",
    },
  },
});
