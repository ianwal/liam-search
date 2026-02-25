import { exists } from "fs/promises";
import path from "path";
import { type PlaylistInfo, type VideoInfo, YtDlp, helpers } from "ytdlp-nodejs";

import app from "./api";
import { db } from "./db";
import { Job } from "./jobs";
import type { VideoCache, VideoMetadata } from "./types";

const ytdlp = new YtDlp();

const cookiesPath = path.resolve(__dirname, "../cookies.txt");

process.on("SIGINT", function () {
	console.log("closing database...");
	db.close(false);

	process.exit();
});

Bun.serve({
	port: 3000,
	fetch: app.fetch,
});

console.log("serving api at http://localhost:3000");

Job.pushQueue(
	new Job("download yt-dlp", async () => {
		await helpers.downloadYtDlp();

		return { status: "success" };
	}),
	new Job("check cookies.txt", async () => {
		if (!(await exists(cookiesPath))) {
			console.error("no cookies.txt");
			return { status: "failed_queue" };
		}

		return { status: "success" };
	}),
	new Job(
		"fetch playlist info",
		async () => {
			const playlistInfo = (await ytdlp.getInfoAsync("https://www.youtube.com/playlist?list=PL-dR2WR6nR_ZI0Ijd1xcjcT3Y6ht5NEX9", { cookies: cookiesPath })) as PlaylistInfo;

			if (playlistInfo.entries.length > 0) {
				const videoMetadata = playlistInfo.entries.map((video: any) => ({
					id: video.id,
					title: video.title,
					thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
					duration: video.duration,
					uploader: video.uploader,
					uploaderUrl: video.uploader_url,
					viewCount: video.view_count,
				}));

				return { status: "success", data: { videoMetadata } };
			} else {
				console.error("playlist fetch error. does it have any videos?");
				return { status: "failed_queue" };
			}
		},
		(res) => {
			if (res.status == "success") {
				Job.pushQueue(
					new Job("update videos cache", async () => {
						for (const video of res.data!.videoMetadata as VideoMetadata[]) {
							const cachedVideo = db.query("select * from videos where id = ?").get(video.id) as VideoCache;

							if (cachedVideo) {
								if (Date.now() > cachedVideo.cacheTimestamp + 24 * 60 * 60 * 1000) {
									const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: cookiesPath })) as VideoInfo;
									video.uploadTimestamp = videoInfo.timestamp;

									db.query(`update videos set title = ?, viewCount = ?, cacheTimestamp = ? where id = ?`).run(videoInfo.title, videoInfo.view_count, Date.now(), video.id);
								}
							} else {
								const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: cookiesPath })) as VideoInfo;
								video.uploadTimestamp = videoInfo.timestamp;

								const query = db.query(`insert into videos values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
								query.run(video.id, video.title, video.thumbnailUrl, video.uploadTimestamp, video.duration, video.uploader, video.uploaderUrl, video.viewCount, null, null, Date.now());
							}
						}

						return { status: "success" };
					}),
					new Job("transcribe new videos", async () => {
						for (const video of db.query("select id, tempAudioPath from videos where transcript is null").all() as { id: string; tempAudioPath: string | null }[]) {
							// todo: add subjobs or something
							await transcribeVideo(video.id, video.tempAudioPath);
						}

						return { status: "success" };
					}),
				);
			}
		},
	),
);

// kinda scuffed and doesn't really use the job system correctly
async function transcribeVideo(videoId: string, tempAudioPath: string | null) {
	if (tempAudioPath == null || !(await Bun.file(tempAudioPath).exists())) {
		Job.pushQueue(
			new Job(`download audio (${videoId})`, async () => {
				const res = await ytdlp.downloadAudio(videoId, "mp3", {
					output: path.resolve(__dirname, `../temp/${videoId}.%(ext)s`),
					cookies: cookiesPath,
				});

				tempAudioPath = res.filePaths[0]!;
				db.query(`update videos set tempAudioPath = ? where id = ?`).run(tempAudioPath, videoId);

				return { status: "success" };
			}),
		);
	}

	Job.pushQueue(
		new Job(`transcribe audio (${videoId})`, async () => {
			if (tempAudioPath != null) {
				const outPath = path.resolve(__dirname, `../temp/${videoId}.json`);

				Bun.spawnSync({
					cmd: ["uv", "run", "main.py", tempAudioPath, outPath],
					cwd: path.resolve(__dirname, "./transcriber"),
					stdout: "ignore",
				});

				const transcription = await Bun.file(outPath).json();

				db.query(`update videos set tempAudioPath = null, transcript = ? where id = ?`).run(JSON.stringify(transcription), videoId);

				await Bun.file(tempAudioPath!).delete();
				await Bun.file(outPath!).delete();

				return { status: "success" };
			} else {
				return { status: "failed" };
			}
		}),
	);
}
