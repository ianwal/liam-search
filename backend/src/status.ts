import type { StatusCode } from "hono/utils/http-status";

type Status = {
	status: StatusCode;
	code: string;
	message?: string;
};

let _status: Status = { status: 200, code: "INIT" };

const status = {
	get: () => _status,
	set: (status: StatusCode, code: string, message?: string) => {
		_status = { status, code: code.toUpperCase(), message };
	},
};

export default status;
