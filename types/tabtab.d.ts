/**
 * Type declarations for tabtab package
 */

declare module 'tabtab' {
  export interface InstallOptions {
    name: string;
    completer: string;
  }

  export interface UninstallOptions {
    name: string;
  }

  export function install(options: InstallOptions): Promise<void>;
  export function uninstall(options: UninstallOptions): Promise<void>;
}
