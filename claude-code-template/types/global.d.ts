// Global type definitions for Claude Code Integration

declare global {
  // MACRO variable used in various components
  const MACRO: {
    VERSION: string;
    BUILD_TIME: string;
    [key: string]: any;
  };

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      ANTHROPIC_API_KEY?: string;
      ANTHROPIC_AUTH_TOKEN?: string;
      ANTHROPIC_MODEL?: string;
      ANTHROPIC_BASE_URL?: string;
      API_TIMEOUT_MS?: string;
      MAX_THINKING_TOKENS?: string;
      DISABLE_PROMPT_CACHING?: string;
      USER_TYPE?: string;
      CLAUDE_CONFIG_DIR?: string;
      [key: string]: string | undefined;
    }
  }
}

// Module declarations for files without explicit typing
declare module '*.json' {
  const content: { [key: string]: any };
  export default content;
}

declare module '*.wasm' {
  const content: string;
  export default content;
}

// Ink and UI library extensions
declare module 'ink' {
  export interface BoxProps {
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    width?: number | string;
    height?: number | string;
    minWidth?: number;
    minHeight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingX?: number;
    paddingY?: number;
    padding?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    marginX?: number;
    marginY?: number;
    margin?: number;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
    borderColor?: string;
    borderTop?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;
    display?: 'flex' | 'none';
    position?: 'relative' | 'absolute';
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    overflowX?: 'visible' | 'hidden';
    overflowY?: 'visible' | 'hidden';
    overflow?: 'visible' | 'hidden';
  }
}

export {};