// Extended type definitions for Ink Key interface
// Adds missing properties that are used in the codebase

declare module 'ink' {
  interface Key {
    /**
     * Up arrow key was pressed.
     */
    upArrow: boolean;
    /**
     * Down arrow key was pressed.
     */
    downArrow: boolean;
    /**
     * Left arrow key was pressed.
     */
    leftArrow: boolean;
    /**
     * Right arrow key was pressed.
     */
    rightArrow: boolean;
    /**
     * Page Down key was pressed.
     */
    pageDown: boolean;
    /**
     * Page Up key was pressed.
     */
    pageUp: boolean;
    /**
     * Return (Enter) key was pressed.
     */
    return: boolean;
    /**
     * Escape key was pressed.
     */
    escape: boolean;
    /**
     * Ctrl key was pressed.
     */
    ctrl: boolean;
    /**
     * Shift key was pressed.
     */
    shift: boolean;
    /**
     * Tab key was pressed.
     */
    tab: boolean;
    /**
     * Backspace key was pressed.
     */
    backspace: boolean;
    /**
     * Delete key was pressed.
     */
    delete: boolean;
    /**
     * Meta key was pressed.
     */
    meta: boolean;
    /**
     * Function key was pressed (Fn key on Mac/some keyboards)
     */
    fn?: boolean;
    /**
     * Home key was pressed
     */
    home?: boolean;
    /**
     * End key was pressed
     */
    end?: boolean;
  }
}