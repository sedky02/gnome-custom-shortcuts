import Meta from 'gi://Meta';

/**
 * A condition decides whether a shortcut's action is allowed to run.
 *
 * Shape:
 *   matches(): boolean         - required. Evaluated at grab time and again
 *                                right before the action fires.
 *   watch(reevaluate): fn      - optional. Subscribe to whatever GNOME signal(s)
 *                                indicate this condition may have changed, and
 *                                call `reevaluate` when it does. Return an
 *                                unsubscribe function. Conditions that never
 *                                change (e.g. `always`) can omit this.
 *
 * The engine uses `watch` to grab/ungrab accelerators dynamically. This is
 * what lets a shortcut like desktop-only Alt+F4 fall through to normal
 * application handling: the accelerator is only held while the condition is
 * true, so when a window is focused the grab is released and Alt+F4 reaches
 * the application exactly as it would without this extension installed.
 */

function isNormalWindowFocused() {
    const window = global.display.focus_window;
    return !!window && window.get_window_type() === Meta.WindowType.NORMAL;
}

function watchFocusedWindow(reevaluate) {
    const id = global.display.connect('notify::focus-window', reevaluate);
    return () => global.display.disconnect(id);
}

export const conditions = {
    /** Always allowed to run. */
    always: {
        matches: () => true,
    },

    /** Allowed only when no normal application window has focus. */
    desktop: {
        matches: () => !isNormalWindowFocused(),
        watch: watchFocusedWindow,
    },

    /** Allowed only when a normal application window has focus. */
    window: {
        matches: () => isNormalWindowFocused(),
        watch: watchFocusedWindow,
    },
};
