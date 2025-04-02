import Session from "./session";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const HttpService = game.GetService("HttpService");
const RunService = game.GetService("RunService");

const GAME_TICKRATE = 1 / 20;

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
const mapTickCallback = new Map<string, (dt: number) => void>();
const mapFrameCallback = new Map<string, (dt: number) => void>();
const mapLateFrameCallback = new Map<string, (dt: number) => void>();

let nNextUpdateTime = 0;
let nLastUpdateTime = 0;

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function Update(dt: number) {
	const currenttime = time();

	if (currenttime >= nNextUpdateTime) {
		for (const [id, callback] of mapTickCallback) callback(currenttime - nLastUpdateTime);

		// Update sessions
		for (const [sessionid, session] of Session.mapCreatedSessions)
			session.Update(currenttime - nLastUpdateTime);

		nNextUpdateTime = nLastUpdateTime + GAME_TICKRATE;
		nLastUpdateTime = currenttime;
	}

	// Update frame bindings
	for (const [id, bind] of mapFrameCallback) bind(dt);
}

function LateUpdate(dt: number) {
	// Update late frame bindings
	for (const [id, bind] of mapLateFrameCallback) bind(dt);
}

/* -------------------------------------------------------------------------- */
/*                                  Bindings                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                  Namespace                                 */
/* -------------------------------------------------------------------------- */
export namespace Lifecycle {
	export const Tickrate = GAME_TICKRATE;

	export function BindTickStep(callback: (dt: number) => void) {
		const id = HttpService.GenerateGUID(false);
		mapTickCallback.set(id, callback);

		return () => mapTickCallback.delete(id);
	}

	export function BindFrameStep(callback: (dt: number) => void) {
		const id = HttpService.GenerateGUID(false);
		mapFrameCallback.set(id, callback);

		return () => mapFrameCallback.delete(id);
	}
	export function BindLateFrameStep(callback: (dt: number) => void) {
		const id = HttpService.GenerateGUID(false);
		mapLateFrameCallback.set(id, callback);

		return () => mapLateFrameCallback.delete(id);
	}

	export function InitializeLifecycle() {
		if (RunService.IsServer())
			RunService.Heartbeat.Connect((dt) => {
				Update(dt);
				LateUpdate(dt);
			});
		else {
			RunService.BindToRenderStep("updatecycle", -99, (dt) => Update(dt));
			RunService.RenderStepped.Connect((dt) => LateUpdate(dt));
		}
	}
}