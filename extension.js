import Meta from 'gi://Meta';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { shortcuts } from './shortcuts.js';

/**
 * Generic shortcut engine. It knows nothing about power-off, reboot, or any
 * other specific behavior — it only knows how to register accelerators,
 * evaluate a condition, and run an action. All shortcut-specific behavior
 * lives in shortcuts.js / actions.js / conditions.js.
 *
 * Grabbing an accelerator via Meta.Display intercepts it at the compositor
 * level: once grabbed, GNOME Shell never forwards the key event to the
 * focused application, regardless of what the shortcut's condition says.
 * So a condition can't simply be checked *after* grabbing "Alt+F4" globally
 * — that would swallow the app's Alt+F4 too. Instead, each shortcut's
 * accelerator is grabbed only while its condition currently holds, and
 * released as soon as it stops holding (see RegisteredShortcut + refresh
 * below). When the accelerator isn't grabbed, GNOME and the focused
 * application handle the key press exactly as if this extension didn't
 * exist.
 */
class RegisteredShortcut {
    constructor(config) {
        this.config = config;
        this.actionId = Meta.KeyBindingAction.NONE;
        this.unwatch = null;
    }

    get isGrabbed() {
        return this.actionId !== Meta.KeyBindingAction.NONE;
    }
}

export default class CustomShortcutsExtension extends Extension {
    enable() {
        this._registered = shortcuts.map((config) => new RegisteredShortcut(config));

        this._acceleratorActivatedId = global.display.connect(
            'accelerator-activated',
            (_display, actionId) => this._onAcceleratorActivated(actionId)
        );

        for (const entry of this._registered) {
            if (typeof entry.config.condition.watch === 'function') {
                entry.unwatch = entry.config.condition.watch(() => this._refreshGrab(entry));
            }
            this._refreshGrab(entry);
        }
    }

    disable() {
        for (const entry of this._registered) {
            this._ungrab(entry);
            entry.unwatch?.();
            entry.unwatch = null;
        }
        this._registered = [];

        if (this._acceleratorActivatedId) {
            global.display.disconnect(this._acceleratorActivatedId);
            this._acceleratorActivatedId = null;
        }
    }

    _refreshGrab(entry) {
        const shouldBeGrabbed = entry.config.condition.matches();
        if (shouldBeGrabbed && !entry.isGrabbed) {
            this._grab(entry);
        } else if (!shouldBeGrabbed && entry.isGrabbed) {
            this._ungrab(entry);
        }
    }

    _grab(entry) {
        const actionId = global.display.grab_accelerator(
            entry.config.accelerator,
            Meta.KeyBindingFlags.NONE
        );

        if (actionId === Meta.KeyBindingAction.NONE) {
            console.warn(
                `custom-shortcuts: failed to grab "${entry.config.accelerator}" for "${entry.config.name}"`
            );
            return;
        }

        entry.actionId = actionId;
    }

    _ungrab(entry) {
        if (!entry.isGrabbed) return;
        global.display.ungrab_accelerator(entry.actionId);
        entry.actionId = Meta.KeyBindingAction.NONE;
    }

    _onAcceleratorActivated(actionId) {
        const entry = this._registered.find((candidate) => candidate.actionId === actionId);
        if (!entry) return;

        // Re-check the condition: it may have changed between the grab and
        // this activation (e.g. focus shifted a moment ago).
        if (!entry.config.condition.matches()) return;

        try {
            entry.config.action();
        } catch (error) {
            logError(error, `custom-shortcuts: action failed for "${entry.config.name}"`);
        }
    }
}
