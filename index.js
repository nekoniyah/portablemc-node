import os from "os";
import fs from "fs";
import path from "path";
import EventEmitter from "events";
import { ChildProcess, spawn } from "child_process";
const PORTABLEMC_BIN_REPO_URL = "https://github.com/nekoniyah/ciel-launcher/releases/download/v1-bin";
const WINDOWS_NAME = "portablemc.exe";
const LINUX_NAME = "portablemc_linux";
const MACOS_NAME = "portablemc_mac";
const WINDOWS_URL = `${PORTABLEMC_BIN_REPO_URL}/${WINDOWS_NAME}`;
const LINUX_URL = `${PORTABLEMC_BIN_REPO_URL}/${LINUX_NAME}`;
const MACOS_URL = `${PORTABLEMC_BIN_REPO_URL}/${MACOS_NAME}`;
export function getPortableMcBinPath(dir) {
    const binFolder = dir;
    if (os.platform() === "win32")
        return path.join(binFolder, WINDOWS_NAME);
    if (os.platform() === "linux")
        return path.join(binFolder, LINUX_NAME);
    if (os.platform() === "darwin")
        return path.join(binFolder, MACOS_NAME);
    throw new Error("Unsupported platform");
}
export function getPortableMcBinUrl() {
    switch (os.platform()) {
        case "win32":
            return WINDOWS_URL;
        case "linux":
            return LINUX_URL;
        case "darwin":
            return MACOS_URL;
        default:
            throw new Error("Unsupported platform");
    }
}
export async function downloadFile(url, dest) {
    const res = await fetch(url);
    const filename = url.split("/").pop();
    if (!fs.existsSync(dest))
        fs.mkdirSync(dest);
    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    fs.writeFileSync(`${dest}/${filename}`, buffer, { flush: true });
    if (os.platform() === "linux" || os.platform() === "darwin") {
        fs.chmodSync(`${dest}/${filename}`, 0o755);
    }
    console.log(`Downloaded ${filename} to ${dest}`);
}
class PortableMC {
    binDest;
    dataFolderName;
    binFilepath;
    version = null;
    loader = null;
    ee = new EventEmitter();
    ready = false;
    setVersion(version) {
        this.version = version;
        return this;
    }
    setLoader(loader) {
        this.loader = loader;
        return this;
    }
    async init() {
        if (fs.existsSync(this.binFilepath))
            this.ready = true;
        else {
            await downloadFile(getPortableMcBinUrl(), this.binDest);
            this.ee.emit("ready");
            this.ready = true;
        }
        return this;
    }
    constructor(binDest, dataFolderName = "data", binFilepath = getPortableMcBinPath(binDest)) {
        this.binDest = binDest;
        this.dataFolderName = dataFolderName;
        this.binFilepath = binFilepath;
        this.binDest = binDest;
        this.binFilepath = binFilepath;
        this.dataFolderName = dataFolderName;
    }
    spawn(args, params = {
        detached: false,
        shell: true,
        stdio: "inherit",
    }) {
        return spawn(this.binFilepath, args.split(" "), params);
    }
    /**
     *
     * Prepare the launcher to start a game.
     *
     * @param username offline or premium username (note: premium needs a username to select the right account.)
     * @param auth if true, it will require to have already logged in with the account. If else, it will use offline mode.
     */
    async prepare(username, auth = false) {
        return {
            start: async (jvmArg) => {
                if (this.ready)
                    return this._startIfReady(username, auth, jvmArg);
                else
                    return new Promise((resolve) => {
                        this.on("ready", () => {
                            resolve(this._startIfReady(username, auth, jvmArg));
                        });
                    });
            },
        };
    }
    /**
     * Opens the login page and returns the code requested by microsoft to authenticate
     * @returns the code generated, and required by microsoft on the login page.
     *
     * @example
     * const code = await portablemc.login();
     * // open the login page and paste the code
     */
    async login() {
        const cp = this.spawn("auth login", { stdio: "pipe" });
        return new Promise((resolve) => {
            let code = null;
            // Simulate enter
            cp.stdin?.write("\n");
            cp.stdout?.on("data", async (data) => {
                let findCodeRegex = /the code (\w+)/g;
                const match = findCodeRegex.exec(data.toString());
                if (match) {
                    code = match[1];
                    resolve(code);
                }
                const authenticatedRegex = /Authenticated account as/;
                const isAuthenticated = authenticatedRegex.test(data.toString());
                if (isAuthenticated) {
                    this.ready = true;
                    this.ee.emit("authenticated", await this.getAccounts());
                }
            });
        });
    }
    async getAccounts() {
        return new Promise((resolve) => {
            let ret = [];
            let cp = this.spawn("auth list", { stdio: "pipe" });
            cp.stdout?.on("data", (msg, sender) => {
                const lines = msg.toString().split("\n");
                lines.pop();
                lines.pop();
                lines.shift();
                lines.shift();
                lines.shift();
                for (let l of lines) {
                    let spl = l.split(" │ ");
                    ret.push({
                        username: spl[0]?.replace("│", "").trim(),
                        uuid: spl[1]?.replace("│", "").trim(),
                    });
                }
                resolve(ret);
            });
        });
    }
    _startIfReady(username, auth = false, jvmArg) {
        let id = "";
        if (this.version && this.loader)
            id = `${this.loader}:${this.version}`;
        else if (this.version)
            id = this.version;
        else if (this.loader)
            id = this.loader + ":";
        const cp = this.spawn(`start ${id} --main-dir ${this.dataFolderName} --username ${username} ${auth ? "--auth" : ""} ${jvmArg ? `--jvm-arg=${jvmArg}` : ""}`);
        cp.on("message", (data) => {
            this.ee.emit("log", data.toString());
        });
        cp.on("close", (code) => {
            this.ee.emit("close", code);
        });
        return cp;
    }
    on(event, listener) {
        this.ee.on(event, listener);
        return this;
    }
}
export default PortableMC;
export { PortableMC };
