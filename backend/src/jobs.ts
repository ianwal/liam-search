export type JobStatus = "success" | "failed" | "failed_queue" | "skipped";

export type JobResult = { status: JobStatus; data?: any };

export class Job {
	static readonly queue: Job[] = [];
	private static queueRunning: boolean = false;

	static runningJob?: Job;

	name: string;
	callback: () => Promise<JobResult>;
	onFinish?: (result: JobResult) => void;

	constructor(name: string, callback: () => Promise<JobResult>, onFinish?: (result: JobResult) => void) {
		this.name = name;
		this.callback = callback;
		this.onFinish = onFinish;
	}

	async run(): Promise<JobResult> {
		if (Job.runningJob == undefined) {
			Job.runningJob = this;
			console.log(`running '${this.name}'`);

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
			const res = await Job.queue[0]!.run();
			Job.queue.shift();

			if (res.status == "failed") {
				console.error("job failed! continuing...");
			} else if (res.status == "failed_queue") {
				console.error("job failed! clearing queue...");
				Job.queue.splice(0, Job.queue.length);
				break;
			}
		}

		Job.queueRunning = false;
	}
}
