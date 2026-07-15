"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="industrial-night"
      enableSystem={false}
      disableTransitionOnChange={false}
      themes={["industrial-night", "precision-day", "aurora-grid"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { useTheme } from "next-themes";
export default ThemeProvider;
