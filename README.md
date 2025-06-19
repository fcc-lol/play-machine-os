# play-machine-os

Identifier: play-machine-os

Created: Sat 31 Aug 2024 07:15:41 PM EDT

## URL Parameters

The application supports several URL parameters for configuration:

- `onDevice`: Controls whether the app runs in device mode (`true`) or simulator mode (`false`)
- `showSimulator`: Controls simulator UI visibility (`true` to show, `false` to hide). Only affects the visual display of the simulator, not the underlying simulator mode
- `apiKey`: API key for remote functionality
- `multiPlayerMode`: Enables multiplayer mode (`true`/`false`)
- `brightness`: Controls screen brightness (0.0 to 1.0)
- `env`: Overrides environment detection (`local` or `production`). Forces API and Socket URLs to use specified environment

### Simulator Control Examples

```bash
# Show simulator UI (simulator mode active)
?onDevice=false&showSimulator=true

# Hide simulator UI (simulator mode still active)
?onDevice=false&showSimulator=false

# Device mode (simulator UI hidden)
?onDevice=true

# Legacy way - show simulator
?onDevice=false

# Legacy way - hide simulator
?onDevice=true
```

**Simulator Behavior:**

- `onDevice=false`: Enables simulator mode (keyboard controls, simulated inputs work)
- `onDevice=true`: Enables device mode (real hardware connections)
- `showSimulator=true`: Shows the simulator UI overlay
- `showSimulator=false`: Hides the simulator UI overlay (but simulator mode may still be active)
