export type VideoMetadata = {
	id: string;
	title: string;
	thumbnailUrl: string;
	uploadTimestamp: number;
	duration: number;
	uploader: string;
	uploaderUrl: string;
	viewCount: number;
};

export type VideoCache = VideoMetadata & {
	tempAudioPath: string | null;
	transcript: string | null;
	cacheTimestamp: number;
};
