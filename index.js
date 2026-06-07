import os from "os";
import fs from "fs";
import path from "path";
import EventEmitter from "events";
import { spawn } from "child_process";
const PORTABLEMC_BIN_REPO_URL = "https://github.com/nekoniyah/portablemc-node/releases/download/bin";
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
    joinServerAddress = null;
    joinServerPort = null;
    setVersion(version) {
        this.version = version;
        return this;
    }
    setLoader(loader) {
        this.loader = loader;
        return this;
    }
    setServer(address) {
        this.joinServerAddress = address.split(":")[0];
        this.joinServerPort = address.split(":")[1];
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
    onReady(cb) {
        this.ee.on("ready", cb);
    }
    constructor(binDest, dataFolderName = binDest, binFilepath = getPortableMcBinPath(binDest)) {
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
    start(username, options = {
        auth: false,
    }) {
        const startWhenReady = () => {
            const cp = this._startIfReady(username, options.auth, options.jvmArg);
            if (options.onClose) {
                cp.on("exit", () => options.onClose);
                cp.on("close", () => options.onClose);
            }
        };
        if (this.ready)
            startWhenReady();
        else
            this.onReady(startWhenReady);
    }
    /**
     * Opens the login page and returns the code requested by microsoft to authenticate
     * @returns the code generated, and required by microsoft on the login page.
     *
     * @example
     * function onAuth() {
     *    // Do stuff when user successfully log in.
     * }
     * const code = await portablemc.login(onAuth);
     * // opens the login page to paste the code
     */
    async login(authenticatedCallback) {
        let cp = this.spawn(`auth --main-dir=${this.dataFolderName} login`, {
            stdio: "pipe",
            shell: true,
        });
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
                    authenticatedCallback();
                }
            });
        });
    }
    async getAccounts() {
        return new Promise((resolve) => {
            let cp = this.spawn(`auth --main-dir=${this.dataFolderName} list`, {
                stdio: "pipe",
                shell: true,
            });
            cp.stdout?.on("data", (msg, sender) => {
                let ret = [];
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
        const cp = this.spawn(`start ${id} --main-dir ${this.dataFolderName} --username ${username} ${auth ? "--auth" : ""} ${jvmArg ? `--jvm-arg=${jvmArg}` : ""} ${this.joinServerAddress ? `--join-server ${this.joinServerAddress}` : ""} ${this.joinServerPort ? `--join-server-port ${this.joinServerPort}` : ""}`);
        cp.on("message", (data) => {
            this.ee.emit("log", data.toString());
        });
        cp.on("close", (code) => {
            this.ee.emit("close", code);
        });
        return cp;
    }
}
export default PortableMC;
export { PortableMC };
