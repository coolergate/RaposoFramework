import { Lifecycle } from "public/lifecycle";
import Iris from "@rbxts/iris";

import dbgmenu_sessionlist from "./debug/dbgmenu_sessions";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const StarterGui = game.GetService("StarterGui");
const ReplicatedStorage = game.GetService("ReplicatedStorage");

const LPlayer = game.GetService("Players").LocalPlayer;

const isbVisible = Iris.State(true);

const stSessionlistDebug = dbgmenu_sessionlist();

/* -------------------------------------------------------------------------- */
/*                                    Logic                                   */
/* -------------------------------------------------------------------------- */
while (!ReplicatedStorage.GetAttribute("Loaded")) task.wait();

StarterGui.SetCoreGuiEnabled("All", false);

import "game/shared/entities/Player";
import { DisconnectFromCurrentSession, GetCurrentSession } from "./components/sessionslist";
import { WriteNativePackage } from "public/network";

task.wait(3);

Lifecycle.InitializeLifecycle();

task.wait(3);

Iris.Init();

// Create the "debug" main menu
{
	Iris.Connect(() => {
		Iris.Window([
			"Raposo framework",
			false,
			false,
			true,
			true,
			false,
			false,
			true,
		], { isOpened: isbVisible });
		{
			Iris.SameLine([]);
			{
				Iris.Text([`Current session: ${GetCurrentSession()?.sessionid}`]);
				
				if (GetCurrentSession() !== undefined && Iris.Button(["Disconnect"]).clicked()) {
					DisconnectFromCurrentSession();
				}
			}
			Iris.End();

			if (!GetCurrentSession() && Iris.Button(["Open session manager"]).clicked())
				stSessionlistDebug.SetVisible(true);

			Iris.Separator();
		}
		Iris.End();

		stSessionlistDebug.Update();
	});
}
