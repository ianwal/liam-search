import ytdlpWrap from "yt-dlp-wrap";
import readline from "readline";
import { Glob } from "bun";
import path from "path";
import { log, LogType } from "./log";

interface VideoInfo {
	id?: string;
	title?: string;
	thumbnailUrl?: string;
	channnelTitle?: string;
	channnelId?: string;
}

const ytdlp = new ytdlpWrap(process.platform == "win32" ? "./bin/yt-dlp.exe" : "./bin/yt-dlp");
const playlistUrls = ["PLeMf46ndvGffIJt5KKDa_5SbXZ6F3azhP", "PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay"];
const cookiesPath = "cookies.txt";

const ignoredVideos: string[] = [
	"-9MIVNz5zCY",
	"g0K98ZoCZKg",
	"EZ9-Gbza2LQ",
	"BU5TXZXw9_8",
	"pE0kzOZBUBE",
	"5R4Hod2V7qw",
	"PjMo5IHxNoQ",
	"8wXE_kZTAKQ",
	"OVgdUFzeV70",
	"w0aLccfUZ-Y",
	"CLuQ4YOyipQ",
	"laEyIqfw0GA",
	"NIyiONjLLx8",
	"-2nFYa304Zk",
	"wYa0z2a6pEE",
	"yg08ZJL46kw",
	"C3YM7QvOmxw",
	"y6_RI5VoX2c",
	"yE3GRTtq2yg",
	"6XURAB4z2UU",
	"20JyO6afOiw",
	"LO96CohXCVM",
	"VmZOLaMUhxM",
	"0ajCtm2_BmI",
	"6VbQ3Uri4zk",
	"kp-B6EbaDuA",
	"bSVLxDmggoo",
	"PDvk8OZwYxQ",
];

// scuffed. needs rewrite
async function loadVideoMetadata(file: Bun.BunFile) {
	const currentDate = new Date().toISOString().split("T")[0] as string;

	let videos: { fetch_date: string; videos: any[] } = {
		fetch_date: currentDate,
		videos: [],
	};

	if (await file.exists()) {
		const _videos = await file.json();

		if (_videos.fetch_date == currentDate) {
			log(LogType.System, "already loaded video metadata today. loading from cache...");

			return _videos;
		}

		videos = _videos;
		videos.fetch_date = currentDate;
	}

	log(LogType.System, "loading video metadata...");

	let playlistRaw: string[] = [];

	for (const url of playlistUrls) {
		const raw = await ytdlp.execPromise([
			"--flat-playlist",
			"--print",
			"%(id)s\t%(title)s\t%(uploader)s",
			"--encoding",
			"utf-8",
			"--cookies",
			cookiesPath,
			"--extractor-args",
			"youtubetab:skip=authcheck",
			url,
		]);

		playlistRaw.push(...raw.trim().split("\n"));
	}

	for (const video of playlistRaw) {
		const videoArr = video.split("\t");
		const videoIndex = videos.videos.findIndex((x) => x.id == videoArr[0]);
		const videoObj = {
			id: videoArr[0],
			title: videoArr[1],
			thumbnail: `https://i.ytimg.com/vi/${videoArr[0]}/mqdefault.jpg`,
			uploader: videoArr[2],
		};

		if (videoIndex > -1) {
			Object.assign(videos.videos[videoIndex], videoObj);
		} else {
			videos.videos.push(videoObj);
		}
	}

	log(LogType.System, `writing to ${file.name}...`);

	let json: any;
	try {
		json = JSON.stringify(videos, null, "\t");
	} catch {
		throw new Error("json parse failed while loading metadata");
	}

	await file.write(json);

	return videos;
}

// scuffed. needs rewrite
export async function downloadSubtitles(file: Bun.BunFile) {
	const currentDate = new Date().toISOString().split("T")[0] as string;

	const videos = await loadVideoMetadata(file);

	if (await file.exists()) {
		const _videos = await file.json();

		if (_videos.subtitle_fetch_date == currentDate) {
			log(LogType.System, "already downloaded subtitles today. skipping...");

			return;
		}
	}

	if (!process.stdout.isTTY) {
		log(LogType.System, `downloading ${videos.videos.length} subtitles...`);
	}

	for (let i = 0; i < videos.videos.length; i++) {
		const video = videos.videos[i];

		if (process.stdout.isTTY) {
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(`downloading subtitles ${i + 1} of ${videos.videos.length}...`);
		}

		if (ignoredVideos.includes(video.id)) {
			continue;
		}

		if (!video.subtitles_path) {
			const stdout = await ytdlp.execPromise([
				"--skip-download",
				"--write-sub",
				"--write-auto-sub",
				"--sub-lang",
				"en",
				"--sub-format",
				"srt",
				"--cookies",
				cookiesPath,
				"-o",
				"subtitles/%(id)s.%(ext)s",
				`https://www.youtube.com/watch?v=${video.id}`,
			]);

			if (stdout.includes("There are no subtitles for the requested languages")) {
				continue;
			}

			const destinationStdout = "[download] Destination: ";
			const destination = stdout
				.split("\n")
				.find((line) => line.startsWith(destinationStdout))
				?.slice(destinationStdout.length);

			video.subtitles_path = destination;

			await file.write(JSON.stringify(videos, null, "\t"));
		}
	}

	if (process.stdout.isTTY) {
		process.stdout.write("\n");
	} else {
		console.log("finished downloading subtitles");
	}

	log(LogType.System, "finished downloading subtitles.");

	videos.subtitle_fetch_date = currentDate;

	await file.write(JSON.stringify(videos, null, "\t"));
}

export async function checkMissingSubtitles(file: Bun.BunFile) {
	if (!(await file.exists())) {
		console.error(`${file.name} doesn't exist. can't check for missing subtitles.`);
		return;
	}

	const videos = await file.json();
	const missingSubtitlesIds: any[] = [];

	for (const video of videos.videos) {
		if (!video.subtitles_path) {
			missingSubtitlesIds.push({ uploader: video.uploader, id: video.id });
		}
	}

	if (missingSubtitlesIds.length > 0) {
		log(LogType.System, `${missingSubtitlesIds.length} videos have missing subtitles`);
	} else {
		log(LogType.System, "no videos have missing subtitles");
	}

	return missingSubtitlesIds;
}

export async function convertSubtitles() {
	const outArr: any[] = [];

	let id = 0;
	for (const fileName of new Glob("subtitles/*").scanSync()) {
		const file = Bun.file(fileName);
		const raw = (await file.text()).trim();
		const arr = raw.split("\n\n").map((chunk) => {
			const lines = chunk.split("\n");
			const times = lines[1]!.split(" --> ");
			id++;

			return {
				id: id,
				video_id: path.parse(file.name as string).name.split(".")[0], // lol
				time_start: times[0],
				time_end: times[1],
				text: lines[2],
			};
		});

		outArr.push(...arr);
	}

	return outArr;
}
