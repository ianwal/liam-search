import { mkdir } from "fs/promises";
import fs from "fs/promises";
import { resolve } from "path";

import config from "./config";

export type LogLevel = "INFO" | "ERROR";
export type LogType = "API" | "JOB" | "INFO";

await mkdir(config.core.logs_dir, { recursive: true });

function removeEmptyKeys(obj: any) {
	return Object.fromEntries(Object.entries(obj).filter(([, value]) => value != null && value != ""));
}

export function log(type: LogType, level: LogLevel, data: { [key: string]: any }, consoleOverride?: string) {
	const log = removeEmptyKeys({ timestamp: new Date().toISOString(), level, ...data });

	if (level == "INFO") {
		console.log(consoleOverride ? consoleOverride : log);
	} else if (level == "ERROR") {
		console.log(consoleOverride ? consoleOverride : log);
	}

	fs.appendFile(resolve(`${config.core.logs_dir}/${type.toLowerCase()}.log`), `${JSON.stringify(log)}\n`);
}
