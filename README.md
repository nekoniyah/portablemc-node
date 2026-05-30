# portablemc-node

A lightweight TypeScript/JavaScript wrapper for the [portablemc](https://github.com/theorzr/portablemc) command-line tool.

It automatically handles downloading and managing the underlying `portablemc` binary for Windows, Linux, and macOS so you don't have to bundle it or require your users to install it manually.

## Features

- 📦 **Zero Manual Setup:** Automatically downloads the correct platform binary (`.exe` on Windows, native binaries on Unix).
- 🔒 **Type Safe:** Complete TypeScript definitions out of the box.
- 🖥️ **Cross-Platform:** Automatically applies execute permissions (`chmod 0755`) on Linux & macOS.

---

## Installation

Install the package via your preferred package manager:

```bash
npm install portablemc-node

```

---

## Usage

```typescript
import PortableMC from "portablemc-node";
import path from "path";

async function main() {
  const binDirectory = path.join(process.cwd(), "bin");
  const dataDirectory = path.join(process.cwd(), "minecraft_data");

  // 1. Initialize PortableMC (Downloads the binary to 'bin' if it doesn't exist)
  const pmc = new PortableMC(binDirectory, dataDirectory);

  // Set version or loader configurations if needed before calling init
  pmc.setVersion("1.20.4");
  pmc.setLoader("neoforge");

  await pmc.init();

  // 2. Bind event listeners to monitor launch logs
  pmc.on("log", (data) => console.log(`[Minecraft]: ${data}`));
  pmc.on("close", (code) => console.log(`Game closed with exit code: ${code}`));

  // 3. Authenticate (If needed, get the Microsoft login code)
  // const code = await pmc.login();
  // console.log(`Please visit Microsoft and enter code: ${code}`);

  // 4. List accounts
  const accounts = await pmc.getAccounts();
  console.log("Logged in accounts:", accounts);

  // 5. Prepare and start the game process
  // prepare(username, usePremiumAuth)
  const launcher = await pmc.prepare("MyUsername", false);

  // start(optionalJvmArgs)
  const childProcess = await launcher.start("-Xmx4G");
  console.log(`Game running under PID: ${childProcess.pid}`);
}

main().catch(console.error);
```

---

## API Reference

### `PortableMC` Class

#### `constructor(binDest: string, dataFolderName?: string)`

- `binDest`: The folder path where the downloaded `portablemc` binary will be placed.
- `dataFolderName` _(Optional)_: The folder name where Minecraft data files (mods, saves, etc.) will reside. Defaults to `"data"`.

#### `version: string | null`

Set this to your target Minecraft version (e.g., `"1.20.4"`) before launching.

#### `loader: 'neoforge' | 'fabric' | 'forge' | 'quilt' | null`

Set this to your target mod loader before launching.

#### `init(): Promise<PortableMC>`

Verifies local presence of the binary or fetches it from upstream mirrors. Resolves when the environment is ready.

#### `login(): Promise<string>`

Spawns an interactive verification terminal channel. Resolves with the Microsoft Device Authentication Code string.

#### `getAccounts(): Promise<Array<{ username: string; uuid: string }>>`

Parses existing offline/online saved profiles in your active data directory.

#### `prepare(username: string, auth?: boolean): Promise<{ start: (jvmArg?: string) => Promise<ChildProcess> }>`

Configures launching credentials.

- `username`: Profile string.
- `auth`: If `true`, requires Microsoft account token parsing. If `false`, launches in offline/LAN mode.
- Returns an object containing the `.start()` initialization function which resolves to a native Node.js `ChildProcess`.

#### Events (`pmc.on()`)

| Event Name | Parameter Type           | Description                                                             |
| ---------- | ------------------------ | ----------------------------------------------------------------------- |
| `"ready"`  | `() => void`             | Fires when the binary environment finishes initial download sequences.  |
| `"log"`    | `(data: string) => void` | Fires on standard operational standard logs generated inside the shell. |
| `"close"`  | `(code: number) => void` | Fires on application termination.                                       |

---

## License

MIT
