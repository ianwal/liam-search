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

export type Config = {
	core: {
		logs_dir: string;
		cookies_path: string;
		yt_dlp_binary_path?: string;
		process_interval: number;
		playlists: string[];
	};
	api: {
		port: number;
		rate_limit: {
			limit: number;
			window: number;
		};
	};
	transcriber: {
		device: "cuda" | " cpu";
		compute_type: "default" | "float16" | "float32" | "int8";
	};
	overrides: { [id: string]: Date };
};
