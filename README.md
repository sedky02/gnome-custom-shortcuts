# GNOME Custom Shortcuts

A GNOME Shell extension that runs different actions for the same keyboard
shortcut depending on the current desktop context.

## What this is

GNOME Custom Shortcuts is a small, configuration-driven engine for
context-aware keyboard shortcuts. A shortcut is defined once as a
combination of a key accelerator, a condition, and an action. The engine
grabs the accelerator, checks the condition when it fires, and runs the
action only if the condition matches.

The engine itself has no knowledge of what any specific shortcut does.
Power-off, reboot, suspend, and lock-screen are not special-cased in the
code — they are configuration entries built from a small set of reusable
actions and conditions.

## Why

GNOME's built-in custom shortcuts system binds one accelerator to one
command, unconditionally, everywhere. There is no way to say "run this
command only when I'm on the desktop, and otherwise let the normal
shortcut behavior happen."

The motivating case is `Alt + F4`:

| Context                        | `Alt + F4` should...     |
| ------------------------------- | ------------------------ |
| Desktop (no window focused)     | Power off the machine    |
| Inside an application window    | Close the window, as usual |

Binding `Alt + F4` globally to a power-off command would break its normal
meaning inside every application. This extension solves that by making the
shortcut conditional, and by only holding the accelerator grab while the
condition can plausibly be true (see [How the engine works](#how-the-engine-works)).

The power-off/reboot/suspend/lock actions go through
`Main.systemActions`, the same call GNOME Shell's own system menu makes, so
they show the normal confirmation dialog (countdown + cancel) rather than
acting instantly.

## Architecture

```text
custom-shortcuts@local/
├── metadata.json     extension metadata (uuid, shell version)
├── extension.js       the engine: grabs accelerators, dispatches to actions
├── shortcuts.js        configuration: name + accelerator + condition + action
├── actions.js          reusable action implementations
└── conditions.js       reusable condition implementations
```

```text
shortcuts.js
   │  list of { name, accelerator, condition, action }
   ▼
extension.js (engine)
   │  grabs/releases accelerators based on each condition
   │  on activation: re-checks condition, then runs the action
   ▼
actions.js              conditions.js
   (what runs)            (when it's allowed to run)
```

`extension.js` never mentions "power off," "desktop," or any other
concrete behavior. It only understands the shapes of an action (a
zero-argument function) and a condition (an object with `matches()` and
an optional `watch()`). Everything else is data.

## How the engine works

Grabbing an accelerator with GNOME's `Meta.Display.grab_accelerator` takes
it over at the compositor level: while grabbed, the key press never
reaches the focused application, no matter what happens afterward. So the
naive approach — grab `Alt+F4` globally and only run the power-off command
if a condition check passes — does not work. It would still swallow every
application's `Alt+F4`, because GNOME would never hand the key event back.

Instead, each shortcut's accelerator is grabbed only while its condition
currently evaluates to true, and released the moment it stops being true:

```text
Alt + F4 pressed
        │
        ▼
Is the accelerator currently grabbed?
        │
  ┌─────┴─────┐
  │           │
 No          Yes  (condition held at grab time)
  │           │
  ▼           ▼
Application  Re-check condition
handles it          │
             ┌──────┴──────┐
             │             │
            No            Yes
             │             │
             ▼             ▼
       (does not fire — action runs
        should not
        happen)
```

Conditions that depend on focus state (`desktop`, `window`) subscribe to
GNOME's focus-window signal via their `watch()` method. Whenever focus
changes, the engine re-evaluates that condition and grabs or releases the
accelerator accordingly:

* No window focused → `desktop` condition becomes true → `Alt+F4` is
  grabbed → pressing it powers off the machine.
* A window gains focus → `desktop` condition becomes false → `Alt+F4` is
  released → GNOME delivers the key press to the application as normal.

Conditions that don't change over time (`always`) simply omit `watch()`
and stay grabbed for the extension's lifetime.

The condition is checked twice — once to decide whether to hold the grab,
and again right when the accelerator fires — as a safety margin against
focus changing in the brief window between the two.

## Prerequisites

* GNOME Shell 50
* A Linux desktop running GNOME
* The `gnome-extensions` command-line tool

## Installation

```bash
git clone https://github.com/sedky02/gnome-custom-shortcuts.git
mkdir -p ~/.local/share/gnome-shell/extensions/custom-shortcuts@local
cp gnome-custom-shortcuts/{metadata.json,extension.js,shortcuts.js,actions.js,conditions.js} \
  ~/.local/share/gnome-shell/extensions/custom-shortcuts@local/
gnome-extensions enable custom-shortcuts@local
```

On Wayland sessions, log out and back in after enabling so GNOME Shell
picks up the extension. Verify it loaded:

```bash
gnome-extensions info custom-shortcuts@local
```

## Adding a shortcut

Open `shortcuts.js` and add an entry to the `shortcuts` array, referencing
an existing action and condition:

```js
{
    name: 'Suspend from desktop',
    accelerator: '<Super><Alt>s',
    condition: conditions.desktop,
    action: actions.suspend,
},
```

Reload the extension for the change to take effect:

```bash
gnome-extensions disable custom-shortcuts@local
gnome-extensions enable custom-shortcuts@local
```

No other file needs to change. This holds whether you're adding the 5th
shortcut or the 50th.

## Adding an action

Add a function to the `actions` object in `actions.js`. Zero-argument
actions can be used directly; actions that need a parameter should be
factories that return a zero-argument function, so every entry in
`shortcuts.js` stays uniform:

```js
export const actions = {
    // ...
    openTerminal: () => runCommand(['gnome-terminal']),
    runShellCommand: (commandLine) => () => runCommand(['/bin/sh', '-c', commandLine]),
};
```

Use it in `shortcuts.js` as `action: actions.openTerminal` or
`action: actions.runShellCommand('some-command --flag')`.

All process execution should go through the shared `runCommand` helper in
`actions.js` rather than duplicating subprocess logic.

## Adding a condition

Add an entry to the `conditions` object in `conditions.js`. At minimum it
needs a `matches()` function returning a boolean:

```js
export const conditions = {
    // ...
    fullscreenWindow: {
        matches: () => global.display.focus_window?.is_fullscreen() ?? false,
    },
};
```

If the condition can change while a shortcut is grabbed (like focus-based
conditions), also provide `watch(reevaluate)`: subscribe to the relevant
GNOME signal, call `reevaluate` when it fires, and return an unsubscribe
function. Conditions that never change, like `always`, can omit `watch`.

## Debugging

Watch extension logs while GNOME Shell runs (Wayland):

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Or, on nested/X11 test sessions, run a nested Shell instance:

```bash
dbus-run-session -- gnome-shell --nested --wayland
```

`console.warn` and `logError` calls in this extension are prefixed with
`custom-shortcuts:` to make them easy to filter for.

## Uninstalling

```bash
gnome-extensions disable custom-shortcuts@local
rm -rf ~/.local/share/gnome-shell/extensions/custom-shortcuts@local
```

## License

MIT. See [LICENSE](LICENSE).
