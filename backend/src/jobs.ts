import { type LogLevel, log } from "./log";

export type JobStatus = "success" | "failed" | "failed_queue" | "skipped";

export type JobResult = { status: JobStatus; data?: any };

export class Job {
	static readonly queue: Job[] = [];
	private static queueRunning: boolean = false;

	static runningJob?: Job;

	readonly id: string;
	readonly start: number;
	name: string;
	callback: () => Promise<JobResult>;
	onFinish?: (result: JobResult) => void;

	constructor(name: string, callback: () => Promise<JobResult>, onFinish?: (result: JobResult) => void) {
		this.id = Bun.randomUUIDv7();
		this.start = performance.now();
		this.name = name;
		this.callback = callback;
		this.onFinish = onFinish;
	}

	async run(): Promise<JobResult> {
		if (Job.runningJob == undefined) {
			Job.runningJob = this;
			this.log("INFO", "run_start", { consoleOverride: `running '${this.name}'` });

			let res: JobResult;
			try {
				res = await this.callback();
			} catch (err) {
				console.error(err);
				res = { status: "failed_queue" };
			}
			Job.runningJob = undefined;

			this.onFinish?.(res);

			return res;
		} else {
			console.error(`a job is already running (${Job.runningJob.name})`);
			return { status: "skipped" };
		}
	}

	static pushQueue(...job: Job[]) {
		Job.queue.push(...job);
		Job.runQueue();
	}

	private static async runQueue() {
		if (Job.queueRunning) return;

		Job.queueRunning = true;

		while (Job.queue.length > 0) {
			const job = Job.queue[0]!;
			const res = await job.run();

			let clearQueue = false;
			let logLevel: LogLevel = "INFO";
			let consoleLog;

			if (res.status == "failed") {
				logLevel = "ERROR";
				consoleLog = "job failed! continuing...";
			} else if (res.status == "failed_queue") {
				logLevel = "ERROR";
				consoleLog = "job failed! clearing queue...";
				clearQueue = true;
			} else if (res.status == "skipped") {
				consoleLog = "job skipped";
			} else if (res.status == "success") {
				consoleLog = "job finished";
			}

			job.log(logLevel, "run_finish", { data: { status: res.status, duration_ms: parseFloat((performance.now() - job.start).toFixed(2)) }, consoleOverride: consoleLog });

			if (clearQueue) {
				Job.queue.splice(0, Job.queue.length);
			} else {
				Job.queue.shift();
			}
		}

		Job.queueRunning = false;
	}

	log(level: LogLevel, event: string, optional?: { data?: { [key: string]: any }; consoleOverride?: string }) {
		log(
			"JOB",
			level,
			{
				job_id: this.id,
				job_name: this.name,
				event,
				...optional?.data,
			},
			optional?.consoleOverride,
		);
	}
}
