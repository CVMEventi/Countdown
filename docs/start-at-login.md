# Start at login

General Settings → **Start at login** starts Countdown when the current user signs in to their desktop session. It is off by default and available in packaged Windows, macOS, and Linux applications. **Start hidden** independently controls whether the main window appears.

- Windows uses the native login-item registration and the stable Squirrel launcher for installed copies. Disabling Countdown in Task Manager is respected when the application next opens.
- macOS uses native login items for the packaged `.app`. Use a signed, notarized build installed in Applications; macOS may require approval under System Settings → General → Login Items.
- Linux `.deb` and `.rpm` builds write `countdown.desktop` in `$XDG_CONFIG_HOME/autostart`, or `~/.config/autostart` by default. This follows the freedesktop desktop-autostart specification used by Ubuntu and other desktop environments. Disabling the option leaves a disabled user entry so a system-wide entry cannot turn it back on.

## Windows and Ubuntu checks

1. Install the test build. On Ubuntu, use the `.deb` package.
2. Enable **Start at login**, close Countdown, and reopen it. Confirm the option stays enabled.
3. Sign out and sign back in. Countdown should launch once, with the saved window layout and **Start hidden** behavior.
4. Disable **Start at login**, then sign out and back in. Countdown should stay closed.
5. Enable it again, disable Countdown using the operating system startup manager, and reopen Countdown. The option should show disabled.

On Ubuntu, inspect the entry with:

```sh
cat "${XDG_CONFIG_HOME:-$HOME/.config}/autostart/countdown.desktop"
```

To build the changed source on Ubuntu, install Node.js 24 and the repository's native build dependencies, then run:

```sh
corepack enable
corepack yarn install --immutable
corepack yarn make --arch x64 --targets @electron-forge/maker-deb
```

The package is produced under `out/make/deb/`. Use `--arch arm64` on an ARM64 Ubuntu machine. Moving or removing a portable application after enabling login startup can invalidate its registered executable path.
