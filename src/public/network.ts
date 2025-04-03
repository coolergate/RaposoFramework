import { t } from "@rbxts/t";
import { BufferReader, BufferWriter } from "./buffermngr";
import UTIL_ReplicatedInst from "./replicatedinst";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
interface NetworkPackageInfo {
	sender: Player | undefined;
	targetid: string;
	timestamp: number;
	content: buffer;
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const Players = game.GetService("Players");
const RunService = game.GetService("RunService");

const instRemoteEvent = UTIL_ReplicatedInst(workspace, "NETWORK_PACKETS", "RemoteEvent");
const instNativeRemoteEvent = UTIL_ReplicatedInst(workspace, "NETWORK_NATIVE", "RemoteEvent");

const mapListeningNativeCallbacks = new Map<string, Callback>();

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
export function WriteNativePackage(id: string, user?: Player) {
	if (RunService.IsServer() && !t.instanceIsA("Player")(user))
		throw `Argument #2 must be an player, got ${tostring(user)} (${typeOf(user)}).`;

	const bfr = buffer.create(2000);

	return BufferWriter(bfr, () => {
		if (RunService.IsClient())
			instNativeRemoteEvent.FireServer(id, bfr);
	
		if (RunService.IsServer())
			instNativeRemoteEvent.FireClient(user!, id, bfr);
	});
}

export function ListenNativePackage(id: string, callback: (sender: Player | undefined, bfr: ReturnType<typeof BufferReader>) => void) {
	mapListeningNativeCallbacks.set(id, callback);
}

/* -------------------------------------------------------------------------- */
/*                                    Class                                   */
/* -------------------------------------------------------------------------- */
export class NetworkCapsule {
	rgReceivedPackages: NetworkPackageInfo[] = [];
	private mapListeningCallbacks = new Map<string, Callback>();

	constructor(readonly session: GameSession) {
		let rbxcConnection: RBXScriptConnection;

		if (RunService.IsServer()) {
			rbxcConnection = instRemoteEvent.OnServerEvent.Connect((user, id, bfr) => {
				if (!session.GetPlayers().includes(user)) return;
				if (!t.string(id) || !t.buffer(bfr))
					throw `User ${user.UserId} has sent an invalid package.\n{ id = ${id}, tid = ${typeOf(id)}}, bfr = ${typeOf(bfr)}`;

				this.rgReceivedPackages.push({
					sender: user,
					targetid: id,
					timestamp: time(), // Maybe UTC time is better?
					content: bfr,
				});
			});
		} else {
			rbxcConnection = instRemoteEvent.OnClientEvent.Connect((id, bfr) => {
				if (!t.string(id) || !t.buffer(bfr))
					throw `The server has sent an invalid package.\n{ id = ${id}, tid = ${typeOf(id)}}, bfr = ${typeOf(bfr)}`;

				this.rgReceivedPackages.push({
					sender: undefined,
					targetid: id,
					timestamp: time(), // Maybe UTC time is better?
					content: bfr,
				});
			});
		}

		session.BindToClose(() => rbxcConnection.Disconnect());
	}
	
	UpdatePackages() {
		const rgClonedList = table.clone(this.rgReceivedPackages);
		rgClonedList.sort((a, b) => a.timestamp < b.timestamp);
		
		this.rgReceivedPackages.clear();

		for (const pkg of rgClonedList) {
			const fnCallback = this.mapListeningCallbacks.get(pkg.targetid);
			if (!fnCallback) {
				warn(`Unknown network callback: "${pkg.targetid}" sent from ${pkg.sender?.UserId}`);
				continue;
			}

			const [success, errorMessage] = pcall(() => fnCallback(pkg.sender, BufferReader(pkg.content)));
			if (!success) {
				print("Network package", pkg.targetid, " has thrown an error:");
				warn(errorMessage);
				continue;
			}
		}

		rgClonedList.clear();
	}

	WriteNetwork(id: string, players = Players.GetPlayers(), ignore: Player[] = []) {
		const bfr = buffer.create(1000);
	
		return BufferWriter(bfr, () => {
			if (RunService.IsClient())
				instRemoteEvent.FireServer(id, bfr);
	
			if (RunService.IsServer())
				for (const user of players)
					if (!ignore.includes(user) && this.session.setActivePlayers.has(user.UserId))
						instRemoteEvent.FireClient(user, id, bfr);
		});
	}
	
	ListenNetwork(id: string, callback: (sender: Player | undefined, bfr: ReturnType<typeof BufferReader>) => void) {
		this.mapListeningCallbacks.set(id, callback);
	}
}

/* -------------------------------------------------------------------------- */
/*                                  Bindings                                  */
/* -------------------------------------------------------------------------- */
if (RunService.IsServer())
	instNativeRemoteEvent.OnServerEvent.Connect((user, id, bfr) => {
		if (!t.string(id) || !t.buffer(bfr))
			throw `User ${user.UserId} has sent an invalid NATIVE package.\n{ id = ${id}, tid = ${typeOf(id)}}, bfr = ${typeOf(bfr)}`;

		const callback = mapListeningNativeCallbacks.get(id);
		if (!callback)
			throw `User ${user.UserId} has sent a unknown NATIVE package. "${id}"`;

		callback(user, BufferReader(bfr));
	});
else
	instNativeRemoteEvent.OnClientEvent.Connect((id, bfr) => {
		if (!t.string(id) || !t.buffer(bfr))
			throw `The server has sent an invalid NATIVE package.\n{ id = ${id}, tid = ${typeOf(id)}}, bfr = ${typeOf(bfr)}`;

		const callback = mapListeningNativeCallbacks.get(id);
		if (!callback)
			throw `The server has sent a unknown NATIVE package. "${id}"`;

		callback(undefined, BufferReader(bfr));
	});