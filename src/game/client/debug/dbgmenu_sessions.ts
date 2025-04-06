import Iris from "@rbxts/iris";
import Session = require("public/session");
import { GetSessions, JoinSession, sigSessionsUpdated, UpdateSessions } from "../components/sessionslist";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const isbVisible = Iris.State(false);

const rgAvailableSessions: string[] = [];

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
let bRefreshing = false;

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function ReloadSessionsList() {
	rgAvailableSessions.clear();
	bRefreshing = true;

	task.spawn(() => {
		UpdateSessions();
		sigSessionsUpdated.Wait();

		task.wait(1);

		const setSessionList = GetSessions();
		for (const session of setSessionList) rgAvailableSessions.push(session);
		rgAvailableSessions.sort((a, b) => a < b);

		bRefreshing = false;
	});
}

function Window() {
	Iris.Window(["Join a session"], { isOpened: isbVisible });
	{
		Iris.SameLine([]);
		const btnRefresh = Iris.Button(["Refresh"]);
		Iris.End();

		if (bRefreshing) {
			Iris.Text(["Refreshing sessions..."]);
		} else {
			Iris.Table([1]);
			for (let i = 0; i < rgAvailableSessions.size(); i++) {
				const element = rgAvailableSessions[i];
				
				Iris.SameLine([]);
				{
					if (Iris.Button(["Join"]).clicked()) {
						JoinSession(element).catch(() => ReloadSessionsList());
						isbVisible.set(false);
					}
					Iris.Text([element]);
				}
				Iris.End();
	
				Iris.NextRow();
			}
			Iris.End();
		}

		if (rgAvailableSessions.size() <= 0 && !bRefreshing) {
			Iris.Text(["Click refresh to update the session list!"]);
		}

		if (btnRefresh.clicked()) ReloadSessionsList();
	}
	Iris.End();
}

function dbgmenu_sessionlist() {
	return {
		Update: Window,
		SetVisible: (value: boolean) => isbVisible.set(value),
	};
}

export = dbgmenu_sessionlist