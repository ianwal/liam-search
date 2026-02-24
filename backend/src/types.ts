export type VideoMetadata = {
	id: string;
	title: string;
	duration: number;
	uploader: string;
	uploaderUrl: string;
	viewCount: number;
};

export type VideoCache = VideoMetadata & {
	tempAudioPath: string | null;
	transcript: string | null;
};

export type IndexSegment = {
	id: number;
	videoId: string;
	seconds: number;
	text: string;
};
