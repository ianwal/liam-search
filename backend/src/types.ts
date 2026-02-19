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
	transcriptJson: string | null;
};
