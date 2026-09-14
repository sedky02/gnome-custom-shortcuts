import Gio from 'gi://Gio';
import Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Actions are plain zero-argument functions that a shortcut runs when its
 * condition matches. Parametrized actions are factories that return such a
 * function (see `runShellCommand` and `launchApp` below), so every entry in
 * `shortcuts.js` can reference `actions.foo` or `actions.foo('arg')`
 * uniformly.
 *
 * Power-related actions go through `Main.systemActions`, the same entry
 * point GNOME Shell's own system menu uses. That means they show the usual
 * confirmation dialog (with its countdown and cancel button) instead of
 * acting immediately, and respect any polkit/session policy GNOME already
 * enforces.
 *
 * All other process execution goes through `runCommand` so new actions
 * never need to duplicate subprocess handling or error logging.
 */

function runCommand(argv) {
    try {
        const proc = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
        proc.wait_async(null, (proc_, result) => {
            try {
                proc_.wait_finish(result);
            } catch (error) {
                logError(error, `custom-shortcuts: command failed: ${argv.join(' ')}`);
            }
        });
    } catch (error) {
        logError(error, `custom-shortcuts: failed to spawn: ${argv.join(' ')}`);
    }
}

/**
 * Call a Main.systemActions method by name, falling back to a plain command
 * (no confirmation dialog) if this GNOME version doesn't expose it.
 */
function callSystemAction(methodName, fallbackArgv) {
    const method = Main.systemActions[methodName];
    if (typeof method === 'function') {
        method.call(Main.systemActions);
        return;
    }
    console.warn(`custom-shortcuts: Main.systemActions.${methodName} unavailable, falling back to command`);
    runCommand(fallbackArgv);
}

export const actions = {
    powerOff: () => callSystemAction('activatePowerOff', ['systemctl', 'poweroff']),
    reboot: () => callSystemAction('activateRestart', ['systemctl', 'reboot']),
    suspend: () => callSystemAction('activateSuspend', ['systemctl', 'suspend']),
    lockScreen: () => callSystemAction('lockScreen', ['loginctl', 'lock-session']),

    /** Run an arbitrary shell command line. */
    runShellCommand: (commandLine) => () => runCommand(['/bin/sh', '-c', commandLine]),

    /** Launch an installed application by its .desktop file id. */
    launchApp: (desktopId) => () => {
        const appInfo = Gio.DesktopAppInfo.new(desktopId);
        if (!appInfo) {
            logError(new Error(`custom-shortcuts: unknown desktop id: ${desktopId}`));
            return;
        }
        try {
            appInfo.launch([], null);
        } catch (error) {
            logError(error, `custom-shortcuts: failed to launch: ${desktopId}`);
        }
    },
};
