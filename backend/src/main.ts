import { exists } from "fs/promises";
import path from "path";
import { YtDlp, helpers, type PlaylistInfo } from "ytdlp-nodejs";
import { Job } from "./jobs";
import type { VideoMetadata } from "./types";
import { db } from "./db";
import { $ } from "bun";

const ytdlp = new YtDlp();
const cookiesPath = path.resolve(__dirname, "../cookies.txt");

process.on("SIGINT", function () {
	console.log("closing database...");
	db.close(false);

	process.exit();
});

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
				const videoMetadata: VideoMetadata[] = playlistInfo.entries.map((video: any) => ({
					id: video.id,
					title: video.title,
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
					new Job("check cached videos", async () => {
						for (const videoMetadata of res.data!.videoMetadata as VideoMetadata[]) {
							// if video metadata isn't cached yet
							if (db.query("select id from videos where id = ?").get(videoMetadata.id) == null) {
								const query = db.query(`insert into videos values (?, ?, ?, ?, ?, ?, ?, ?)`);
								query.run(...Object.values(videoMetadata), null, null);
							}
						}

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
