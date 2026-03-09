import { Job } from ".";
import { db } from "../db";
import { index, queryCache } from "../search";

export default new Job("build index", async () => {
	const segments = db
		.query("select id, transcript from videos where transcript is not null")
		.all()
		.flatMap((video: any) => {
			const transcript: any[] = JSON.parse(video.transcript);

			return transcript.map((segment, segmentIndex) => {
				return {
					id: `${video.id}/${segmentIndex}`,
					previousId: segmentIndex > 0 ? `${video.id}/${segmentIndex - 1}` : null,
					nextId: segmentIndex < transcript.length - 1 ? `${video.id}/${segmentIndex + 1}` : null,
					videoId: video.id as string,
					seconds: Math.floor(segment.start / 1000),
					text: segment.text as string,
				};
			});
		});

	index.removeAll();
	index.addAll(segments);
	queryCache.splice(0, queryCache.length);

	return { status: "success" };
});
