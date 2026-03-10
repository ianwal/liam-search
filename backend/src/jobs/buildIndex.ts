import { Job } from ".";
import { db } from "../db";
import { msClient } from "../search";

export default new Job("build index", async () => {
	const videos: any[] = db.query("select id, uploadTimestamp, transcript from videos where transcript is not null").all();
	const indexTasks = [];

	for await (const video of videos) {
		const transcript: any[] = JSON.parse(video.transcript);
		const segments = transcript.map((segment, segmentIndex) => ({
			id: `${video.id}_${segmentIndex}`,
			previousId: segmentIndex > 0 ? `${video.id}_${segmentIndex - 1}` : null,
			nextId: segmentIndex < transcript.length - 1 ? `${video.id}_${segmentIndex + 1}` : null,
			videoId: video.id as string,
			videoTimestamp: video.uploadTimestamp as number,
			seconds: Math.floor(segment.start / 1000),
			text: segment.text as string,
		}));

		indexTasks.push(await msClient.index("segments").updateDocuments(segments, { primaryKey: "id" }));
	}

	await msClient.tasks.waitForTasks(indexTasks, { timeout: 0 });

	return { status: "success" };
});
