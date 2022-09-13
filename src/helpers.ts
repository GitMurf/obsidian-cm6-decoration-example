import { Plugin, Stat } from "obsidian";
import MyPlugin from "./main";
import { SyncPlugin } from "./types";

export function mySetIntervalFunction(plugin: MyPlugin, interval: number): void {
    console.log(`[${formatDate()}] setIntervalId: ${interval} for plugin: ${plugin.pluginName}`);
}

async function getFileStats(plugin: Plugin, filePath: string): Promise<Stat | null> {
    const fileStats = await plugin.app.vault.adapter.stat(filePath);
    return fileStats;
}

export function formatDate(dateTimeNumber: number | Date = new Date(), formatStr: string = "YYYY-MM-DD hh:mm.ss A"): string {
    let dateTime: Date;
    if (typeof dateTimeNumber === "number") {
        dateTime = new Date(dateTimeNumber);
    } else {
        dateTime = dateTimeNumber;
    }
    const formattedDate = window.moment(dateTime).format(formatStr);
    return formattedDate;
}

export function getDeviceName(plugin: Plugin) {
    let deviceName = "";
    //Check if Obsidian Sync is enabled
    const syncPlugin = getSyncPlugin(plugin);
    if (syncPlugin) {
        const syncPluginInst = syncPlugin.instance;
        deviceName = syncPluginInst.deviceName ? syncPluginInst.deviceName : syncPluginInst.getDefaultDeviceName();
    }
    if (!deviceName) { deviceName = createRandomHashId(); }
    return deviceName;
}

function getSyncPlugin(plugin: Plugin): SyncPlugin | null {
    //Check if Obsidian Sync is enabled
    const syncPlugin: SyncPlugin = plugin.app.internalPlugins.plugins["sync"] as SyncPlugin;
    if (syncPlugin) {
        if (syncPlugin.enabled) {
            return syncPlugin;
        }
    }
    return null;
}

export function isObsidianSyncLoaded(plugin: Plugin): boolean {
    const isSyncLoaded = getSyncPlugin(plugin) ? true : false;
    return isSyncLoaded;
}

export function createRandomHashId(charCt: number = 7): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < charCt; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export async function sleepDelay(plugin: MyPlugin, seconds: number): Promise<void> {
    console.log(`[${formatDate()}] Sleeping for ${seconds} seconds...`);
    return new Promise(resolve => { setTimeout(resolve, seconds * 1000); });
}
