import { Folders } from "public/folders";
import { Lifecycle } from "public/lifecycle";
import { ListenNativePackage, WriteNativePackage } from "public/network";
import Session from "public/session";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const Players = game.GetService("Players");
const StarterGui = game.GetService("StarterGui");
const ReplicatedStorage = game.GetService("ReplicatedStorage");

/* -------------------------------------------------------------------------- */
/*                                  Bindings                                  */
/* -------------------------------------------------------------------------- */
Players.PlayerRemoving.Connect((player) => {
	for (const [sessionid, sessionobj] of Session.mapCreatedSessions)
		sessionobj.RemovePlayer(player, "Disconnected from server.");
});

game.BindToClose(reason => {
	print("Game shutting down... (", reason.Name.upper(), ")");

	for (const [_, sessionobj] of Session.mapCreatedSessions) {
		sessionobj.CloseSession();
	}

	task.wait(1);

	for (const user of Players.GetPlayers())
		user.Kick(`\n\n${reason.Name}\n\n`);
});

/* -------------------------------------------------------------------------- */
/*                                    Logic                                   */
/* -------------------------------------------------------------------------- */
// Clean the workspace
for (const inst of StarterGui.GetChildren()) inst.Parent = Folders.Interface;
for (const inst of workspace.GetChildren())
	if (!inst.IsA("Terrain") && (inst.IsA("BasePart") || inst.IsA("Model"))) inst.Destroy();

Players.CharacterAutoLoads = false;

import "game/shared/entities/Player";
import "./players";

new Session("default1");

ListenNativePackage("__GET-SESSIONS", (user) => {
	const bfr = WriteNativePackage("__GET-SESSIONS-RETURN", user);

	bfr.WRITE_U8(Session.mapCreatedSessions.size());

	for (const [sessionid, senv] of Session.mapCreatedSessions)
		bfr.WRITE_STRING(sessionid);

	bfr.MESSAGE_END();
});

ListenNativePackage("__JOIN-SESSION", (user, bfr) => {
	if (!user) return;

	const sessionid = bfr.READ_STRING();
	const target = Session.mapCreatedSessions.get(sessionid);

	print(user, "requested to join session:", sessionid);
	if (!target) {
		warn(`${sessionid} does not exist. Returning...`);
		return;
	}

	target.InsertPlayer(user);
});

ListenNativePackage("__LEAVE-SESSION", (user, bfr) => {
	if (!user) return;

	print("Disconnecting", user, "from all sessions...");

	for (const [sessionid, sessionobj] of Session.mapCreatedSessions) {
		if (!sessionobj.GetPlayers().includes(user)) continue;

		sessionobj.RemovePlayer(user, "Disconnected by user.");
	}
});

Lifecycle.InitializeLifecycle();

print("Server has finished loading!");
ReplicatedStorage.SetAttribute("Loaded", true);
