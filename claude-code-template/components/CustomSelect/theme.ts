// Theme types for CustomSelect components compatible with @inkjs/ui

export interface Theme {
  styles: {
    container: () => Record<string, unknown>
    option: (props: { isFocused?: boolean }) => Record<string, unknown>
    highlightedText: () => Record<string, unknown>
    focusIndicator: () => Record<string, unknown>
    label: (props: { isFocused?: boolean; isSelected?: boolean }) => Record<string, unknown>
    selectedIndicator: () => Record<string, unknown>
  }
}

export const defaultTheme: Theme = {
  styles: {
    container: () => ({}),
    option: ({ isFocused = false }) => ({
      backgroundColor: isFocused ? '#3b82f6' : undefined,
    }),
    highlightedText: () => ({
      color: '#06b6d4',
    }),
    focusIndicator: () => ({}),
    label: ({ isFocused = false, isSelected = false }) => ({
      color: isSelected ? '#06b6d4' : isFocused ? '#ffffff' : undefined,
    }),
    selectedIndicator: () => ({}),
  },
}