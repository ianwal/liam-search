import { mkdir } from "fs/promises";
import fs from "fs/promises";
import path from "path";

export type LogLevel = "INFO" | "ERROR";
export type LogType = "API" | "JOB";

await mkdir(path.resolve(__dirname, "../logs"), { recursive: true });

function removeEmptyKeys(obj: any) {
	return Object.fromEntries(Object.entries(obj).filter(([, value]) => value != null && value != ""));
}

export function log(type: LogType, level: LogLevel, data: { [key: string]: any }, consoleOverride?: string) {
	const log = removeEmptyKeys({ timestamp: new Date().toISOString(), level, ...data });

	console.log(consoleOverride ? consoleOverride : log);

	fs.appendFile(path.resolve(__dirname, `../logs/${type.toLowerCase()}.log`), `${JSON.stringify(log)}\n`);
}
