# Play Machine OS

Identifier: play-machine-os

Created: Sat 31 Aug 2024 07:15:41 PM EDT

## URL Parameters

- `onDevice`: Controls device mode (`true`) or simulator mode (`false`)
- `showSimulator`: Shows/hides simulator UI overlay (`true`/`false`)
- `stretchToFill`: Scales app to fill viewport while maintaining aspect ratio (`true`/`false`)
- `fullScreen`: Makes app take 100% of viewport without aspect ratio constraints (`true`/`false`)
- `brightness`: Controls screen brightness (0.0 to 1.0, defaults to 1.0)
- `apiKey`: API key for remote functionality and server communication
- `useSocket`: Controls socket connection (`true`/`false`, defaults to `true`)
- `server`: Overrides environment detection (`local` or `production`)
- `multiPlayerMode`: Enables multiplayer mode (`true`/`false`)
- `externalController`: Enables external controller mode (`true`/`false`)
- `hardwareClient`: Selects the input device. Defaults to the built-in Web Serial controller. Set to `cyberdeck-25` to read inputs from the cyberdeck-25 firmware's socket.io server (default `http://localhost:3001`)

### Cyberdeck-25 client

When `hardwareClient=cyberdeck-25`, the app subscribes to the cyberdeck-25 firmware's socket.io feed instead of opening a Web Serial port. Each cyberdeck input maps one-to-one to a play-machine control (see `config/Hardware.json → cyberdeck25`); play-machine controls without a cyberdeck counterpart are simply unmapped:

| Cyberdeck input | Play-machine label |
|---|---|
| `E1` | `knob_1` |
| `E2` | `knob_2` |
| `E3` | `knob_3` |
| `E4` | `knob_4` |
| `KEY` | `button_a` |
| `RED` switch | `button_left` |
| `GREEN` switch | `button_up` |
| `BLUE` switch | `button_right` |

Encoder counts wrap into the 0–100 range expected by play-machine visualizations. Pressing the encoder button resets that channel to 0.

## Usage Examples

### Basic Simulator Mode

```bash
# Show simulator UI
?onDevice=false&showSimulator=true

# Hide simulator UI (simulator still active)
?onDevice=false&showSimulator=false

# Device mode
?onDevice=true
```

### Display Modes

```bash
# Default - uses hardware screen dimensions (e.g., 320x240px)
?onDevice=false

# Stretch to fill viewport while maintaining aspect ratio
?stretchToFill=true

# Full screen mode - 100% viewport width/height
?fullScreen=true
```

### Connectivity

```bash
# Disable socket connection
?useSocket=false

# Force local environment
?server=local

# Force production environment
?server=production
```

### Advanced Features

```bash
# Enable multiplayer mode
?multiPlayerMode=true

# Enable external controller
?externalController=true

# Set brightness to 50%
?brightness=0.5
```

## Environment Detection

If `server` parameter is not specified, the app automatically detects the environment:

- `localhost` or `127.0.0.1` → `local` environment
- All other hostnames → `production` environment
