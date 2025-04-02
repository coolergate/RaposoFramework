import Session from "public/session";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const Teams = game.GetService("Teams");

const TEAM_INDEX = {
	Raiders: Teams.WaitForChild("Raiders") as Team,
	Defenders: Teams.WaitForChild("Defenders") as Team,
	Spectators: Teams.WaitForChild("Spectators") as Team,
};

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function SessionOnPlayerJoined(session: Session, player: Player) {
	player.Team = TEAM_INDEX.Spectators;
	player.SetAttribute("Kills", 0);
	player.SetAttribute("Deaths", 0);
	player.SetAttribute("Ping", 0);
	
	const ent = session.Entity.CreateEntityByName("PlayerEntity", player);
	ent.Spawn();
}

function SessionOnPlayerLeft(session: Session, player: Player) {
	player.Team = undefined;

	for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
		if (ent.player !== player) continue;

		session.Entity.KillThisMafaker(ent);
	}
}

/* -------------------------------------------------------------------------- */
/*                                 Connections                                */
/* -------------------------------------------------------------------------- */
Session.sigSessionCreated.Connect(session => {
	session.sigPlayerJoined.Connect(user => SessionOnPlayerJoined(session, user));
	session.sigPlayerLeft.Connect(user => SessionOnPlayerLeft(session, user));
});