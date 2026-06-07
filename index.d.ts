import EventEmitter from "events";
export declare function getPortableMcBinPath(dir: string): string;
export declare function getPortableMcBinUrl(): string;
export declare function downloadFile(url: string, dest: string): Promise<void>;
declare class PortableMC {
    private binDest;
    private dataFolderName;
    private binFilepath;
    version: string | null;
    loader: "neoforge" | "fabric" | "forge" | "quilt" | null;
    ee: EventEmitter<any>;
    ready: boolean;
    joinServerAddress: string | null;
    joinServerPort: string | null;
    setVersion(version: string): this;
    setLoader(loader: "neoforge" | "fabric" | "forge" | "quilt"): this;
    setServer(address: string): this;
    init(): Promise<this>;
    private onReady;
    constructor(binDest: string, dataFolderName?: string, binFilepath?: string);
    private spawn;
    start(username: string, options?: {
        auth?: boolean;
        jvmArg?: string;
        onClose?: () => void;
    }): void;
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
    login(authenticatedCallback: () => void): Promise<string>;
    getAccounts(): Promise<{
        username: string;
        uuid: string;
    }[]>;
    private _startIfReady;
}
export default PortableMC;
export { PortableMC };
