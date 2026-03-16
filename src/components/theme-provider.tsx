/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

type Theme = "dark"

type ThemeProviderProps = {
  children: React.ReactNode
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

const DARK_THEME: ThemeProviderState = {
  theme: "dark",
  setTheme: () => {},
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement

    root.classList.remove("light")
    root.classList.add("dark")
    root.style.colorScheme = "dark"
  }, [])

  return (
    <ThemeProviderContext.Provider {...props} value={DARK_THEME}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
