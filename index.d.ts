import EventEmitter from "events";
import { ChildProcess } from "child_process";
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
    setVersion(version: string): this;
    setLoader(loader: "neoforge" | "fabric" | "forge" | "quilt"): this;
    init(): Promise<this>;
    constructor(binDest: string, dataFolderName?: string, binFilepath?: string);
    private spawn;
    /**
     *
     * Prepare the launcher to start a game.
     *
     * @param username offline or premium username (note: premium needs a username to select the right account.)
     * @param auth if true, it will require to have already logged in with the account. If else, it will use offline mode.
     */
    prepare(username: string, auth?: boolean): Promise<{
        start: (jvmArg?: string) => Promise<ChildProcess>;
    }>;
    /**
     * Opens the login page and returns the code requested by microsoft to authenticate
     * @returns the code generated, and required by microsoft on the login page.
     *
     * @example
     * const code = await portablemc.login();
     * // open the login page and paste the code
     */
    login(): Promise<string>;
    getAccounts(): Promise<{
        username: string;
        uuid: string;
    }[]>;
    private _startIfReady;
    on(event: "ready", listener: () => void): void;
    on(event: "log", listener: (data: string) => void): void;
    on(event: "close", listener: (code: number) => void): void;
    on(event: "authenticated", listener: (accounts: {
        username: string;
        uuid: string;
    }[]) => void): void;
}
export default PortableMC;
export { PortableMC };
