import { YtDlp } from "ytdlp-nodejs";

import config from "./config";
import { db } from "./db";
import { Job } from "./jobs";
import buildIndex from "./jobs/buildIndex";
import checkForCookies from "./jobs/checkForCookies";
import downloadYtDlp from "./jobs/downloadYtDlp";
import processVideos from "./jobs/processVideos";
import registerInterval from "./jobs/registerInterval";
import startServer from "./jobs/startServer";

export const ytdlp = new YtDlp({ binaryPath: config.core.yt_dlp_binary_path });

process.on("SIGINT", () => {
	console.log("clearing queue...");
	Job.clearQueue();

	console.log("closing database...");
	db.close(false);

	process.exit();
});

Job.pushQueue(startServer, registerInterval, buildIndex, downloadYtDlp, checkForCookies, processVideos);
