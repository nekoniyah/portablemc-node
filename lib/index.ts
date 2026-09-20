import fs from "fs";
import path from "path";
import EventEmitter from "events";
import { spawn, ChildProcess } from "child_process";

export type ModLoader = "neoforge" | "fabric" | "forge" | "quilt";

export interface LauncherConfig {
  dataDir?: string;
  version?: string;
  loader?: ModLoader;
}

export interface StartOptions {
  username: string;
  server?: string; // Format "host:port" or "host"
  auth?: boolean;
  jvmArg?: string;
  onClose?: (code: number | null) => void;
}

export interface Account {
  username: string;
  uuid: string;
}

export abstract class PortableMC {
  abstract binFilepath: string;
  private dataDir = "";
  private version?: string;
  private loader?: ModLoader;
  private ready = false;
  public readonly events = new EventEmitter();

  public configure(config: LauncherConfig): this {
    this.dataDir = config.dataDir ?? path.dirname(this.binFilepath);
    this.version = config.version;
    this.loader = config.loader;
    this.ready = fs.existsSync(this.binFilepath);
    return this;
  }

  public async init(config?: Partial<LauncherConfig>): Promise<this> {
    if (config) {
      if (this.binFilepath) this.binFilepath = this.binFilepath;
      if (config.dataDir) this.dataDir = config.dataDir;
      if (config.version) this.version = config.version;
      if (config.loader) this.loader = config.loader;
    }

    if (!this.binFilepath) throw new Error("Binary path not set.");
    if (!fs.existsSync(this.binFilepath)) {
      throw new Error(`Binary non-existent at path: ${this.binFilepath}`);
    }

    this.ready = true;
    this.events.emit("ready");
    return this;
  }

  private spawn(
    args: string[],
    stdio: "inherit" | "pipe" = "inherit",
  ): ChildProcess {
    return spawn(this.binFilepath, args, { stdio, shell: true });
  }

  public start(options: StartOptions): void {
    const launch = () => {
      const { username, server, auth, jvmArg, onClose } = options;

      // Format targets like "fabric:1.20.1", "1.20.1", or "fabric:"
      const targetId =
        this.loader && this.version
          ? `${this.loader}:${this.version}`
          : this.version
            ? this.version
            : this.loader
              ? `${this.loader}:`
              : "";

      const args = ["start"];
      if (targetId) args.push(targetId);
      args.push("--main-dir", this.dataDir, "--username", username);

      if (auth) args.push("--auth");
      if (jvmArg) args.push(`--jvm-arg=${jvmArg}`);

      if (server) {
        const [host, port] = server.split(":");
        if (host) args.push("--join-server", host);
        if (port) args.push("--join-server-port", port);
      }

      const cp = this.spawn(args);

      cp.on("message", (msg) => this.events.emit("log", msg.toString()));
      cp.on("close", (code) => {
        this.events.emit("close", code);
        onClose?.(code);
      });
    };

    if (this.ready) launch();
    else this.events.once("ready", launch);
  }

  public async login(onAuthSuccess: () => void): Promise<string> {
    const cp = this.spawn(
      ["auth", `--main-dir=${this.dataDir}`, "login"],
      "pipe",
    );
    cp.stdin?.write("\n");

    return new Promise((resolve) => {
      cp.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        const codeMatch = /the code (\w+)/.exec(text);

        if (codeMatch?.[1]) resolve(codeMatch[1]);
        if (/Authenticated account as/.test(text)) {
          this.ready = true;
          onAuthSuccess();
        }
      });
    });
  }

  public async getAccounts(): Promise<Account[]> {
    const cp = this.spawn(
      ["auth", `--main-dir=${this.dataDir}`, "list"],
      "pipe",
    );

    return new Promise((resolve) => {
      cp.stdout?.on("data", (msg: Buffer) => {
        const lines = msg.toString().trim().split("\n");
        const accountLines = lines.slice(3, -2);

        const accounts = accountLines
          .map((line) => {
            const [username, uuid] = line.split("│").map((s) => s.trim());
            return { username: username || "", uuid: uuid || "" };
          })
          .filter((acc) => acc.username && acc.uuid);

        resolve(accounts);
      });
    });
  }
}

export default PortableMC;
