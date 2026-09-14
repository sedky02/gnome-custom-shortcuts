# GNOME Custom Shortcuts

> A lightweight GNOME Shell extension for creating context-aware keyboard shortcuts.

[![License](https://img.shields.io/github/license/sedky02/gnome-custom-shortcuts)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/sedky02/gnome-custom-shortcuts/ci.yml?label=build)](https://github.com/sedky02/gnome-custom-shortcuts/actions)
[![Version](https://img.shields.io/github/v/tag/sedky02/gnome-custom-shortcuts?sort=semver)](https://github.com/sedky02/gnome-custom-shortcuts/tags)

## Contents

- [GNOME Custom Shortcuts](#gnome-custom-shortcuts)
  - [Contents](#contents)
  - [About](#about)
  - [Why](#why)
  - [Features](#features)
  - [Architecture](#architecture)
    - [`extension.js`](#extensionjs)
    - [`shortcuts.js`](#shortcutsjs)
    - [`actions.js`](#actionsjs)
  - [How It Works](#how-it-works)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Creating a Custom Shortcut](#creating-a-custom-shortcut)
  - [Conditions](#conditions)
    - [Desktop](#desktop)
    - [Window](#window)
    - [Always](#always)
  - [Adding Actions](#adding-actions)
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [License](#license)

## About

GNOME Custom Shortcuts is a small GNOME Shell extension that adds conditional behavior to keyboard shortcuts.

Instead of every shortcut being global, a shortcut can decide whether it should execute based on the current desktop context.

For example:

| Context            | `Alt + F4`            |
| ------------------ | --------------------- |
| Desktop            | Power off             |
| Application window | Close window normally |

This makes it possible to create shortcuts that are aware of where and how they are being used.

## Why

GNOME provides a built-in custom shortcut system, but it does not provide a straightforward way to define conditions for when a shortcut should execute.

I wanted to use `Alt + F4` as a power-off shortcut on the desktop without losing its normal behavior inside applications.

Rather than replacing the existing GNOME behavior globally, this extension checks the current context first and only handles the shortcut when its condition matches.

The result is a small configuration-driven system for building shortcuts that behave differently depending on the current state of the desktop.

## Features

* 🎯 **Context-aware shortcuts**
  Execute shortcuts only when their conditions are satisfied.

* ⌨️ **Custom key combinations**
  Define your own keyboard accelerators.

* 🖥️ **Desktop conditions**
  Trigger actions specifically when working from the desktop.

* 🪟 **Window conditions**
  Restrict shortcuts to situations where an application window is focused.

* 🌐 **Global shortcuts**
  Create shortcuts that work regardless of the current context.

* 🧩 **Extensible architecture**
  Add new actions and conditions without rewriting the shortcut engine.

* ⚙️ **Configuration-driven**
  Define shortcuts in one place instead of modifying the core extension logic.

## Architecture

The project is intentionally kept small:

```text
custom-shortcuts@local/
├── metadata.json
├── extension.js
├── shortcuts.js
└── actions.js
```

### `extension.js`

The core shortcut engine.

It is responsible for registering keyboard accelerators, receiving shortcut events, evaluating conditions, executing actions, and cleaning up when the extension is disabled.

### `shortcuts.js`

The shortcut configuration.

This is where shortcuts are defined by specifying their name, keyboard combination, condition, and action.

Adding a shortcut should normally only require changing this file.

### `actions.js`

Contains the actions that can be executed by shortcuts.

Keeping actions separate from shortcut definitions makes them reusable and keeps the core shortcut engine independent from specific commands.

## How It Works

The extension sits between the keyboard event and the configured action:

```text
Keyboard input
      │
      ▼
GNOME Shell
      │
      ▼
Shortcut Engine
      │
      ▼
Condition check
   ┌──┴──┐
   │     │
  No    Yes
   │     │
   ▼     ▼
Ignore  Action
         │
         ▼
      Execute
```

For `Alt + F4`:

```text
                    Alt + F4
                       │
             ┌─────────┴─────────┐
             │                   │
          Desktop            Application
             │                   │
             ▼                   ▼
         Power off          Do nothing
                                 │
                                 ▼
                         Application handles
                            Alt + F4
```

## Getting Started

### Prerequisites

You need:

* GNOME Shell 50
* A Linux system running GNOME
* `gnome-extensions` available on your system
* A terminal

The extension is currently developed and tested for GNOME Shell 50.

### Installation

Clone the repository:

```bash
git clone https://github.com/sedky02/gnome-custom-shortcuts.git
cd gnome-custom-shortcuts
```

Create the local GNOME extension directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/custom-shortcuts@local
```

Copy the extension files:

```bash
cp metadata.json extension.js shortcuts.js actions.js \
  ~/.local/share/gnome-shell/extensions/custom-shortcuts@local/
```

Enable the extension:

```bash
gnome-extensions enable custom-shortcuts@local
```

Verify that it is enabled:

```bash
gnome-extensions list | grep custom-shortcuts
```

## Creating a Custom Shortcut

Custom shortcuts are defined in `shortcuts.js`.

Each shortcut consists of:

| Property      | Purpose                          |
| ------------- | -------------------------------- |
| `name`        | Identifies the shortcut          |
| `accelerator` | Defines the keyboard combination |
| `condition`   | Controls when it can execute     |
| `action`      | Defines what it executes         |

For example, a shortcut can be configured to run only on the desktop.

After changing the configuration, reload the extension:

```bash
gnome-extensions disable custom-shortcuts@local
gnome-extensions enable custom-shortcuts@local
```

The new shortcut will then be registered by GNOME Shell.

## Conditions

### Desktop

The shortcut executes only when the desktop is focused.

Useful for shortcuts such as:

* Power off
* Reboot
* Suspend
* Launch desktop utilities

### Window

The shortcut executes only when an application window is focused.

This can be useful for shortcuts that should only apply while working inside applications.

### Always

The shortcut executes regardless of the current context.

This is useful for actions that should always be available.

## Adding Actions

Actions are kept separately from shortcut definitions.

This allows the same action to be assigned to multiple shortcuts and keeps system commands out of the shortcut engine itself.

Actions can be used for things such as:

* Launching applications
* Running shell commands
* Power management
* Starting scripts
* Opening development tools
* Triggering custom workflows

## Roadmap

Some possible future improvements:

* Application-specific conditions
* Workspace-specific conditions
* Fullscreen conditions
* More window-state conditions
* Easier configuration
* Better extension management
* Additional built-in actions

The architecture is intentionally kept flexible so these features can be added without turning the project into a large framework.

## Contributing

Issues, ideas, and pull requests are welcome.

If you have an idea for a useful condition or action, feel free to open an issue or contribute an implementation.

## License

This project is licensed under the MIT License.

---

Made with ❤️ by [sedky02](https://github.com/sedky02)
