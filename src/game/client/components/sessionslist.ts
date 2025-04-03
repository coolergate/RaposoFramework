import { ListenNativePackage, WriteNativePackage } from "public/network";
import Session from "public/session";
import Signal from "public/signal";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const setAvailableSessions = new Set<string>();

export const sigSessionsUpdated = new Signal<[number, string[]]>();
export const sigSessionJoined = new Signal<[Session]>();
export const sigSessionLeft = new Signal<[Session]>();

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
let currSession: Session | undefined;

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
export function UpdateSessions() {
	WriteNativePackage("__GET-SESSIONS").MESSAGE_END();
}

export function GetSessions() {
	return setAvailableSessions;
}

export async function JoinSession(sessionid: string) {
	if (!setAvailableSessions.has(sessionid)) throw `${sessionid} is not on the available sessions list.`;

	WriteNativePackage("__JOIN-SESSION").WRITE_STRING(sessionid).MESSAGE_END();
}

export function GetCurrentSession() {
	return currSession;
}

export function DisconnectFromCurrentSession() {
	WriteNativePackage("__LEAVE-SESSION").MESSAGE_END();
}

/* -------------------------------------------------------------------------- */
/*                                  Bindings                                  */
/* -------------------------------------------------------------------------- */
ListenNativePackage("__GET-SESSIONS-RETURN", (_, bfr) => {
	const nAmount = bfr.READ_U8();
	const rgTotalSessionStrings: string[] = [];

	setAvailableSessions.clear();
	for (let i = 0; i < nAmount; i++) {
		const sessionid = bfr.READ_STRING();

		setAvailableSessions.add(sessionid);
		rgTotalSessionStrings.push(sessionid);
	}

	sigSessionsUpdated.Fire(rgTotalSessionStrings.size(), rgTotalSessionStrings);
});

ListenNativePackage("__SESSION-JOINED", (_, bfr) => {
	const sessionid = bfr.READ_STRING();

	if (currSession) {
		currSession.CloseSession();
		sigSessionLeft.Fire(currSession);
		currSession = undefined;

		task.wait(1);
	}

	currSession = new Session(sessionid);
	sigSessionJoined.Fire(currSession);
});

ListenNativePackage("__SESSION-DISCONNECTED", (_, bfr) => {
	const sessionid = bfr.READ_STRING();
	const reason = bfr.READ_STRING();
	
	if (sessionid === currSession?.sessionid) {
		print("Disconnected from session", sessionid, ". Reason:", reason);

		currSession.CloseSession();
		sigSessionLeft.Fire(currSession);
		currSession = undefined;
	}
});