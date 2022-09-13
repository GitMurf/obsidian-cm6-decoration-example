import { App, Plugin_2 } from "obsidian";

declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLElement;
    }
    interface Plugin {
        "_loaded": boolean;
    }
    interface App {
        plugins: {
            plugins: Record<string, Plugin>;
        };
        internalPlugins: {
            plugins: Record<string, Plugin>;
        };
    }
}

export interface MyPluginSettings {
    MyConfigSettings: SettingsObject;
}

interface SettingsObject {
    mySetting1: string;
    mySetting2: string;
}

export interface SyncPlugin extends Plugin_2 {
    enabled: boolean;
    hasStatusBarItem: boolean;
    instance: {
        allowSpecialFiles: Set<string>;
        allowTypes: Set<string>;
        app: App;
        deviceName: string;
        id: string;
        name: string;
        pause: boolean;
        ready: boolean;
        scanSpecialFiles: boolean;
        syncLog: {
            error: boolean;
            file: string;
            info: string;
            ts: number;
        }[];
        syncStatus: string;
        syncing: boolean;
        vaultId: string;
        vaultName: string;
        version: number;
        getDefaultDeviceName: () => string;
    };
    statusBarEl: HTMLDivElement;
}
