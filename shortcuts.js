import { actions } from './actions.js';
import { conditions } from './conditions.js';

/**
 * The list of configured shortcuts. This is the only file most changes need
 * to touch: to add a shortcut, add an entry here that references an
 * existing action and condition (or a new one added to actions.js /
 * conditions.js). The engine in extension.js requires no changes.
 *
 * Each entry:
 *   name         - human-readable label, used in logs.
 *   accelerator  - a GNOME accelerator string, e.g. "<Alt>F4", "<Super><Alt>r".
 *   condition    - one of the `conditions` exported from conditions.js.
 *   action       - one of the `actions` exported from actions.js.
 */
export const shortcuts = [
    {
        name: 'Power off from desktop',
        accelerator: '<Alt>F4',
        condition: conditions.desktop,
        action: actions.powerOff,
    },
];
