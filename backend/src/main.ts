import { exists } from "fs/promises";
import path from "path";
import { nodewhisper } from "nodejs-whisper";
import { YtDlp, helpers } from "ytdlp-nodejs";
import { Job } from "./jobs";
import type { VideoCache, VideoMetadata } from "./types";

const ytdlp = new YtDlp();
const cookiesPath = path.resolve(__dirname, "../cookies.txt");
const videosFile = Bun.file(path.resolve(__dirname, "../videos.json"));

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
			// const playlistInfo = (await ytdlp.getInfoAsync("https://www.youtube.com/playlist?list=PL-dR2WR6nR_ZI0Ijd1xcjcT3Y6ht5NEX9", { cookies: cookiesPath })) as PlaylistInfo;

			// if (playlistInfo.entries.length > 0) {
			// 	const videoMetadata: VideoMetadata[] = playlistInfo.entries.map((video) => ({
			// 		id: video.id,
			// 		title: video.title,
			// 		duration: video.duration,
			// 		uploader: video.uploader,
			// 		uploaderUrl: video.uploader_url,
			// 		viewCount: video.view_count,
			// 	}));

			// 	return { status: "success", data: { videoMetadata } };
			// } else {
			// 	console.error("playlist fetch error. does it have any videos?");
			// 	return { status: "failed_queue" };
			// }

			return { status: "success", data: { videoMetadata: [] } };
		},
		(res) => {
			if (res.status == "success") {
				Job.pushQueue(
					new Job("check cached videos", async () => {
						let videos: VideoCache[] = [];
						if (await videosFile.exists()) {
							videos = await videosFile.json();
						}

						for (const videoMetadata of res.data!.videoMetadata as VideoMetadata[]) {
							// if video metadata isn't cached yet
							if (videos.find((video) => video.id == videoMetadata.id) == undefined) {
								videos.push({ ...videoMetadata, tempAudioPath: null, transcription: null });
							}
						}

						await videosFile.write(JSON.stringify(videos, null, "\t"));

						for (const video of videos) {
							if (video.transcription == null) {
								// todo: add subjobs or something
								await transcribeVideo(video.id);
							}
						}

						return { status: "success" };
					}),
				);
			}
		},
	),
);

// todo: use sql instead of json for cache
// kinda scuffed and doesn't really use the job system correctly
async function transcribeVideo(videoId: string) {
	const videos: VideoCache[] = await videosFile.json();
	const video = videos.find((video) => video.id == videoId);

	if (!(await videosFile.exists())) {
		console.error("videos.json doesn't exist");
		return;
	}

	if (!video) {
		console.error("video doesn't exist in cache");
		return;
	}

	if (video.tempAudioPath == null || !(await Bun.file(video.tempAudioPath).exists())) {
		Job.pushQueue(
			new Job(`download audio (${videoId})`, async () => {
				const res = await ytdlp.downloadAudio(videoId, "mp3", {
					output: path.resolve(__dirname, `../temp/${videoId}.%(ext)s`),
					cookies: cookiesPath,
				});

				video.tempAudioPath = res.filePaths[0] as string;
				await videosFile.write(JSON.stringify(videos, null, "\t"));

				return { status: "success" };
			}),
		);
	}

	if (video.tempAudioPath != null) {
		Job.pushQueue(
			new Job(`transcribe audio (${videoId})`, async () => {
				const transcription = await nodewhisper(video.tempAudioPath as string, {
					modelName: "large-v3-turbo",
					removeWavFileAfterTranscription: true,
					whisperOptions: {
						timestamps_length: 20,
						splitOnWord: true,
					},
				});

				await Bun.file(video.tempAudioPath as string).delete();
				video.tempAudioPath = null;
				video.transcription = transcription.trim().split("\n").map((line) => ({
					from: line.split(" ")[0]!.slice(1),
					to: line.split(" ")[2]!.slice(0, -1),
					text: line.slice(line.indexOf("]") + 4),
				}));

				await videosFile.write(JSON.stringify(videos, null, "\t"));

				return { status: "success" };
			}),
		);
	}
}
