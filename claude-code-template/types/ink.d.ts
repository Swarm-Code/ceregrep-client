declare module 'ink' {
  import React from 'react';

  export interface BoxProps {
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    gap?: number;
    padding?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingX?: number;
    paddingY?: number;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    marginX?: number;
    marginY?: number;
    width?: number | string;
    height?: number | string;
    minWidth?: number;
    minHeight?: number;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
    borderColor?: string;
    borderDimColor?: boolean;
    children?: React.ReactNode;
  }

  export interface TextProps {
    color?: string;
    backgroundColor?: string;
    dimColor?: boolean;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    inverse?: boolean;
    wrap?: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end';
    children?: React.ReactNode;
  }

  export interface StaticProps<T = any> {
    items: T[];
    children: (item: T, index: number) => React.ReactNode;
  }

  export interface NewlineProps {
    count?: number;
  }

  export interface Key {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    pageDown: boolean;
    pageUp: boolean;
    return: boolean;
    escape: boolean;
    ctrl: boolean;
    shift: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    meta: boolean;
    sequence: string;
  }

  export const Box: React.FC<BoxProps>;
  export const Text: React.FC<TextProps>;
  export const Static: <T = any>(props: StaticProps<T>) => React.ReactElement;
  export const Newline: React.FC<NewlineProps>;
  export const Spacer: React.FC;

  export function useInput(
    inputHandler: (input: string, key: Key) => void,
    options?: { isActive?: boolean }
  ): void;

  export function useApp(): {
    exit: (error?: Error) => void;
  };

  export function useStdin(): {
    stdin: NodeJS.ReadStream;
    isRawModeSupported: boolean;
    setRawMode: (isEnabled: boolean) => void;
  };

  export function useStdout(): {
    stdout: NodeJS.WriteStream;
    write: (data: string) => void;
  };

  export function useStderr(): {
    stderr: NodeJS.WriteStream;
    write: (data: string) => void;
  };

  export function useFocus(options?: { isActive?: boolean; autoFocus?: boolean }): {
    isFocused: boolean;
  };

  export function useFocusManager(): {
    focusNext: () => void;
    focusPrevious: () => void;
    enableFocus: () => void;
    disableFocus: () => void;
  };

  export interface RenderOptions {
    stdout?: NodeJS.WriteStream;
    stdin?: NodeJS.ReadStream;
    stderr?: NodeJS.WriteStream;
    debug?: boolean;
    exitOnCtrlC?: boolean;
    patchConsole?: boolean;
  }

  export function render(tree: React.ReactElement, options?: RenderOptions): {
    rerender: (tree: React.ReactElement) => void;
    unmount: () => void;
    waitUntilExit: () => Promise<void>;
    clear: () => void;
  };
}