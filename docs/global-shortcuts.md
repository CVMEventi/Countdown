# Show main window shortcut

The shortcut is off by default, because it is taken system-wide and would
otherwise override the same keys in other applications (for example, Microsoft
Teams uses Ctrl+Shift+M to mute). Enable **Global shortcut to show main
window** in General Settings; turning it off releases the shortcut immediately.

Use **Ctrl+Shift+M** on Windows/Linux or **Command+Shift+M** on macOS
to show the control window. Countdown must remain running, including when
hidden in the tray. The shortcut also restores a minimized control window.
The tray, timer context menu, and Window menu display the same shortcut.

Windows, macOS, and Linux X11 use Electron's `globalShortcut` API. If another
application owns the shortcut, Countdown continues running and logs the
registration failure; its menu actions remain available. The shortcut is
released when Countdown quits.

Wayland uses the desktop's GlobalShortcuts portal directly. Electron 41's
native API does not provide this consistently on GNOME or XWayland. A small,
pure JavaScript D-Bus client is loaded only for Wayland sessions. It registers
the `countdown` application identity using the desktop entry supplied by the
DEB/RPM packages, asks for **Show main window**, and reuses existing grants.
GNOME displays **Add Keyboard Shortcuts** when permission is needed. Cancelling
leaves the rest of Countdown usable. Disconnecting closes the shortcut session.

GNOME Wayland can restore the window without granting it keyboard focus.
Electron 41 does not expose an API for consuming the portal's activation token,
so a click may still be needed to focus the restored window on that desktop.
The feature does not change the desktop's focus settings.

## Validation

Run `corepack yarn test run`. The shortcut tests cover native registration,
conflicts, cleanup, backend selection, portal responses arriving before method
replies, saved grants, denial, unavailable services, and activation filtering.

For packaged manual testing:

1. Start Countdown hidden in the tray, focus another application, and press
   the shortcut. Confirm the control window appears.
2. Repeat with the control window minimized and behind another application.
3. Quit Countdown and confirm the key is no longer intercepted. Restart and
   repeat the checks.
4. On GNOME Wayland, grant the shortcut in the desktop dialog. Confirm it
   restores the window while a native Wayland application has focus, and that
   restarting Countdown reuses the grant. Check focus separately from visibility.

Windows native keyboard testing verified restoration and focus in all three
window states, exclusive ownership while running, and release after quit.
Ubuntu 26.04 / GNOME 50.1, with Countdown running through XWayland, verified
global activation and restoration in the same states and after restart;
automatic keyboard focus remains limited as above.
macOS has not been tested on hardware.

The combined build, including the separate login and installer contributions,
passed 781 tests on Windows and Ubuntu. Type checking still
reports the existing `NDI.ts:89` error about `Sender.connections`; this change
introduces no additional type errors.
