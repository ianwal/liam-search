import { YtDlp } from "ytdlp-nodejs";

import config from "./config";
import { db } from "./db";
import buildIndex from "./jobs/buildIndex";
import checkForCookies from "./jobs/checkForCookies";
import downloadYtDlp from "./jobs/downloadYtDlp";
import processVideos from "./jobs/processVideos";
import registerInterval from "./jobs/registerInterval";
import startServer from "./jobs/startServer";
import updateVideosCache from "./jobs/updateVideosCache";
import { Queue } from "./types";

export const ytdlp = new YtDlp({ binaryPath: config.core.yt_dlp_binary_path });
export const queue = new Queue();

process.on("SIGINT", () => {
	console.log("clearing queues...");
	Queue.clearAll();

	console.log("closing database...");
	db.close(false);

	process.exit();
});

queue.push(startServer, registerInterval, buildIndex, downloadYtDlp, checkForCookies, updateVideosCache, processVideos);
