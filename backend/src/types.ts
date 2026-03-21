import { randomUUIDv7 } from "bun";

import { type LogLevel, log } from "./log";

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
		device: "cpu" | "cuda";
		compute_type: "default" | "float16" | "float32" | "int8";
	};
	overrides: { [id: string]: Date };
};

export enum JobResult {
	SKIP = -1,
	OK = 0,
	FAIL = 1,
	FAIL_QUEUE = 2,
}

export class Queue {
	static readonly queues: Queue[] = [];

	readonly runs: JobRun[] = [];

	constructor(...jobs: Job[]) {
		for (const job of jobs) {
			this.push(job);
		}

		Queue.queues.push(this);
	}

	private tryRunFirst() {
		const first = this.runs[0];

		if (this.runs.length > 0 && first instanceof JobRun && !first.isRunning) {
			first.run().then((result) => {
				first.log(result == (JobResult.FAIL || JobResult.FAIL_QUEUE) ? "ERROR" : "INFO", "run_finish", {
					data: { status: result, duration_ms: first.duration },
					consoleOverride: `run finished (${JobResult[result]})`,
				});

				if (result == JobResult.FAIL_QUEUE) {
					this.clear();
					return;
				}

				this.runs.shift();
				this.tryRunFirst();
			});
		}
	}

	push(...jobs: Job[]) {
		this.runs.push(...jobs.map((job) => job.new()));
		this.tryRunFirst();
	}

	insertNext(...jobs: Job[]) {
		if (this.runs.length <= 1) {
			this.push(...jobs);
			return;
		}

		this.runs.splice(1, 0, ...jobs.map((job) => job.new()));
		this.tryRunFirst();
	}

	clear() {
		this.runs.splice(0, this.runs.length);
	}

	static clearAll() {
		for (const queue of Queue.queues) {
			queue.clear();
		}
	}
}

export class Job {
	readonly id: string;
	readonly name: string;
	readonly callback: () => JobResult | Promise<JobResult | void> | void;

	constructor(name: string, callback: () => JobResult | Promise<JobResult | void> | void) {
		this.id = randomUUIDv7();
		this.name = name;
		this.callback = callback;
	}

	new() {
		return new JobRun(this);
	}

	async run() {
		return await this.new().run();
	}
}

export class JobRun {
	readonly id: string;
	readonly job: Job;

	private running: boolean = false;
	private startTime?: number;

	constructor(job: Job) {
		this.id = randomUUIDv7();
		this.job = job;
	}

	async run() {
		if (this.running == true) {
			throw new Error("already running!");
		}

		this.running = true;
		this.startTime = performance.now();

		this.log("INFO", "run_start", { consoleOverride: `running '${this.job.name}'` });

		return (await this.job.callback()) ?? JobResult.OK;
	}

	get isRunning() {
		return this.running;
	}

	get duration() {
		if (!this.running || !this.startTime) {
			return null;
		}

		return parseFloat((performance.now() - this.startTime).toFixed(2));
	}

	log(level: LogLevel, event: string, optional?: { data?: { [key: string]: any }; consoleOverride?: string }) {
		log(
			"JOB",
			level,
			{
				job_id: this.job.id,
				job_name: this.job.name,
				run_id: this.id,
				event,
				...optional?.data,
			},
			optional?.consoleOverride,
		);
	}
}
