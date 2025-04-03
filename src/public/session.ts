import { EntityManager } from "./entity";
import { NetworkCapsule, WriteNativePackage } from "./network";
import Signal from "./signal";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
declare global {
	type GameSession = typeof Session["prototype"];
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

/* -------------------------------------------------------------------------- */
/*                                    Class                                   */
/* -------------------------------------------------------------------------- */
class Session {
	static mapCreatedSessions = new Map<string, Session>();

	static sigSessionCreated = new Signal<[Session]>();
	static sigSessionClosing = new Signal<[Session]>();

	private readonly rgBindToCloseConnections = new Array<(session: Session) => void>();

	readonly setActivePlayers = new Set<Player["UserId"]>();
	readonly sigPlayerJoined = new Signal<[Player]>();
	readonly sigPlayerLeft = new Signal<[Player, string]>();

	readonly Network = new NetworkCapsule(this);
	readonly Entity = new EntityManager(this);

	readonly serving: string | undefined;
	readonly bServerSide = RunService.IsServer();

	constructor(readonly sessionid: string) {
		print("Creating session", sessionid);

		Session.mapCreatedSessions.set(sessionid, this);
		Session.sigSessionCreated.Fire(this);
	}

	GetPlayers() {
		const rgPlayers: Player[] = [];

		for (const userid of this.setActivePlayers) {
			const instPlayer = Players.GetPlayerByUserId(userid);
			if (!instPlayer) continue;

			rgPlayers.push(instPlayer);
		}

		return rgPlayers;
	}

	Update(dt: number) {
		this.Network.UpdatePackages();

		for (const [entid, ent] of this.Entity.mapGameEntities) {
			for (const callback of ent.rgEntityThinkFuncs) {
				const [success, errorMessage] = pcall(() => callback(dt));
				if (!success) {
					warn(`Failed to update entity ${entid} from session ${this.sessionid}:`);
					print(errorMessage);
					continue;
				}
			}
		}
	}

	CloseSession() {
		print("Closing session", this.sessionid, "...");

		Session.sigSessionClosing.Fire(this).expect();
		Session.mapCreatedSessions.delete(this.sessionid);

		for (const user of this.GetPlayers())
			this.RemovePlayer(user, "Session closed.");

		task.wait(1);

		for (const callback of this.rgBindToCloseConnections) {
			const [success, errorMessage] = pcall(() => callback(this));

			if (!success) {
				warn("Error when closing session:");
				print(errorMessage);
				continue;
			}
		}
		this.rgBindToCloseConnections.clear();

		this.sigPlayerJoined.Clear();
		this.sigPlayerLeft.Clear();

		for (const [index] of this as unknown as Map<string, unknown>)
			rawset(this, index, undefined);
	}

	BindToClose(callback: (session: Session) => void) {
		this.rgBindToCloseConnections.push(callback);
	}

	InsertPlayer(player: Player) {
		if (RunService.IsClient()) {
			if (player !== Players.LocalPlayer) throw "Function cannot be called on the client.";
		}

		for (const [id, session] of Session.mapCreatedSessions) {
			session.RemovePlayer(player);
			task.wait(1);
		}
		
		print(player, "has joined session", this.sessionid);

		this.setActivePlayers.add(player.UserId);
		this.sigPlayerJoined.Fire(player);

		if (RunService.IsServer())
			WriteNativePackage("__SESSION-JOINED", player).WRITE_STRING(this.sessionid).MESSAGE_END();
	}

	RemovePlayer(player: Player, disconnectreason = "") {
		if (!RunService.IsServer()) throw "Function cannot be called on the client.";
		if (!this.setActivePlayers.has(player.UserId)) return;

		print(player, `has left the session ${this.sessionid}. Reason: ${disconnectreason}`);

		this.setActivePlayers.delete(player.UserId);
		this.sigPlayerLeft.Fire(player, disconnectreason);

		WriteNativePackage("__SESSION-DISCONNECTED", player)
			.WRITE_STRING(this.sessionid)
			.WRITE_STRING(disconnectreason)
			.MESSAGE_END();
	}
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */
export = Session;