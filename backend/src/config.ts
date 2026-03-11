import { resolve } from "path";

import config from "../config.toml";
import type { Config } from "./types";

try {
	config.core.logs_dir = resolve(config.core.logs_dir);
	config.core.cookies_path = resolve(config.core.cookies_path);

	if (config.core.yt_dlp_binary_path) {
		config.core.yt_dlp_binary_path = resolve(config.core.yt_dlp_binary_path);
	} else {
		config.core.yt_dlp_binary_path = undefined;
	}

	config.overrides = Object.fromEntries(new Map(config.overrides.map((override: any) => [override.id, new Date(override.date)])));
} catch (err) {
	console.error("failed to parse config!");
}

export default config as Config;
