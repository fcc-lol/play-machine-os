# play-machine-os

A web-based operating system for interactive machines with hardware simulation capabilities.

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
