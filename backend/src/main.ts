import { exists } from "fs/promises";
import path from "path";
// import { nodewhisper } from "nodejs-whisper";

// const filePath = path.resolve(__dirname, "temp", "fivehearts3_short.opus");

// await nodewhisper(filePath, {
// 	modelName: "large-v3-turbo",
// 	removeWavFileAfterTranscription: true,
// 	whisperOptions: {
// 		outputInJson: true,
// 		outputInSrt: true,
// 		timestamps_length: 20,
// 		splitOnWord: true,
// 	},
// });

import { YtDlp, type PlaylistInfo } from "ytdlp-nodejs";
import { helpers } from "ytdlp-nodejs";
import { Job } from "./jobs";
import type { VideoMetadata } from "./types";

const ytdlp = new YtDlp();
const cookiesPath = path.resolve(__dirname, "../cookies.txt");

Job.pushQueue(
	new Job("download yt-dlp", async () => {
		await helpers.downloadYtDlp();

		return { status: "success" };
	}),
);

Job.pushQueue(
	new Job("check cookies.txt", async () => {
		if (!(await exists(cookiesPath))) {
			console.error("no cookies.txt");
			return { status: "failed_queue" };
		}

		return { status: "success" };
	}),
);

Job.pushQueue(
	new Job(
		"fetch playlist info",
		async () => {
			const playlistInfo = (await ytdlp.getInfoAsync("https://www.youtube.com/playlist?list=PLeMf46ndvGffIJt5KKDa_5SbXZ6F3azhP", { cookies: cookiesPath })) as PlaylistInfo;

			const videoMetadata: VideoMetadata[] = playlistInfo.entries.map((video) => ({
				id: video.id,
				title: video.title,
				duration: video.duration,
				uploader: video.uploader,
				uploaderUrl: video.uploader_url,
				viewCount: video.view_count,
			}));

			return { status: "success", data: { videoMetadata } };
		},
		(res) => {
			new Job("check cached videos", async () => {
				if (res.status == "success") {
					console.log("blah blah blah", res.data!.videoMetadata.length);
				}

				return { status: "success" };
			}).run();
		},
	),
);
