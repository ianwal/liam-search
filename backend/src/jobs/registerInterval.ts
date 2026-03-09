import { Job } from ".";
import transcribe from "./transcribe";

export default new Job("register interval", async () => {
	setInterval(
		() => {
			// todo: check if transcribe job is already running
			Job.pushQueue(transcribe);
		},
		6 * 60 * 60 * 1000,
	);

	return { status: "success" };
});
