import Session from "public/session";
import HealthEntity from "../healthent";
import ErrorObject from "public/errorobj";
import { Folders } from "public/folders";
import UTIL_INSTEXIST from "public/instexist";
import { EntityManager } from "public/entity";
import { Lifecycle } from "public/lifecycle";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
declare global {
	interface GameEntities {
		PlayerEntity: typeof PlayerEntity;
	}

	interface CharacterModel extends Model {
		Humanoid: Humanoid;
		HumanoidRootPart: Part;
		["Right Arm"]: Part;
	}
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const RunService = game.GetService("RunService");
const Players = game.GetService("Players");

enum NETWORK_IDS {
	MOVEMENT = "PLRENT_MOVEMENT_UPD",

	HEALTH = "PLRENT_HEALTH_UPD",
}

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
function GetSpawnLocationForPlayer(user: Player) {
	const rgAvailableSpawns: SpawnLocation[] = [];

	for (const child of Folders.Objects.GetChildren()) {
		if (!child.IsA("SpawnLocation")) continue;
		if (child.TeamColor !== user.TeamColor) continue;

		rgAvailableSpawns.push(child);
	}

	if (rgAvailableSpawns.size() > 0) {
		return rgAvailableSpawns[math.random(0, rgAvailableSpawns.size() - 1)].CFrame.mul(new CFrame(0, 3, 0));
	}

	return new CFrame(0, 50, 0);
}

/* -------------------------------------------------------------------------- */
/*                                    Class                                   */
/* -------------------------------------------------------------------------- */
class PlayerEntity extends HealthEntity {
	model = ErrorObject<CharacterModel | undefined>("Model cannot be accessed from the server.");
	modelconfig = ErrorObject<{
		PivotTo: (pos: CFrame) => void;
		SetBodygroup: (name: string, ...args: unknown[]) => unknown;
		Destroy: () => void;
		Update: (tickrate: number) => void;
			} | undefined>("Modelconfig cannot be accessed from the server.");

	cfPendingTeleport: CFrame | undefined;

	constructor(readonly player: Player, readonly sPlayerRefId = tostring(player.UserId)) {
		super();

		this.classname = "PlayerEntity";
		this.setIsA.add("PlayerEntity");

		if (RunService.IsClient()) {
			this.model = undefined;
			this.modelconfig = undefined;

			const fnUnbindCycle = Lifecycle.BindFrameStep(() => this.modelconfig?.Update(Lifecycle.Tickrate));
			if (player === Players.LocalPlayer)
				fnUnbindCycle();

			this.OnDelete(() => {
				this.modelconfig?.Destroy();
				this.modelconfig = undefined;

				this.model?.Destroy();
				this.model = undefined;

				fnUnbindCycle();
			});
		}

		this.BindThinkCallback(dt => this.PlayerThink(dt));

		if (RunService.IsServer()) {
			this.OnDelete(() => {
				this.session.Network.WriteNetwork("plrent_playerleave")
					.WRITE_STRING(this.sPlayerRefId)
					.MESSAGE_END();
			});

			task.defer(() => {
				this.session.Network.WriteNetwork("plrent_playerjoined")
					.WRITE_STRING(tostring(player.UserId))
					.WRITE_STRING(sPlayerRefId)
					.MESSAGE_END();

				task.wait(1);

				print("Player spawning...");
				this.Spawn();
			});

			this.sigTookDamage.Connect(() => {
				this.session.Network.WriteNetwork(NETWORK_IDS.HEALTH)
					.WRITE_STRING(this.sPlayerRefId)
					.WRITE_U8(this.health)
					.WRITE_U8(this.maxhealth)
					.MESSAGE_END();
			});

			this.sigDied.Connect(attacker => {
				print(attacker?.id, "killed player", this.id);

				task.wait(Players.RespawnTime);

				this.Spawn();
			});
		}

		warn(`${player.Name} has joined the game.`);
	}

	PlayerThink(dt: number) {
		if (this.health <= 0) return;

		if (RunService.IsClient() && (!this.model || !UTIL_INSTEXIST(this.model)))
			return;

		if (RunService.IsClient()) {
			this.origin = this.model!.GetPivot();
		}

		if (RunService.IsClient()) {
			if (this.player === Players.LocalPlayer) {

				this.session.Network.WriteNetwork("plrent_c_posupd")
					.WRITE_F32(this.origin.Position.X)
					.WRITE_F32(this.origin.Position.Y)
					.WRITE_F32(this.origin.Position.Z)
					.WRITE_F32(this.origin.LookVector.X)
					.WRITE_F32(this.origin.LookVector.Z)
					.MESSAGE_END();
			}
		}
	}

	TeleportTo(pivot: CFrame, force = false) {
		this.origin = pivot;

		if (RunService.IsServer()) {
			if (force) this.cfPendingTeleport = pivot;

			this.session.Network.WriteNetwork("plrent_teleport", undefined, force ? [] : [this.player])
				.WRITE_STRING(this.sPlayerRefId)
				.WRITE_F32(pivot.Position.X)
				.WRITE_F32(pivot.Position.Y)
				.WRITE_F32(pivot.Position.Z)
				.WRITE_F32(pivot.LookVector.X)
				.WRITE_F32(pivot.LookVector.Z)
				.MESSAGE_END();
		}
		
		if (RunService.IsClient())
			this.modelconfig?.PivotTo(pivot);
	}

	Spawn(spawnPosition = GetSpawnLocationForPlayer(this.player)) {
		this.health = 100;
		this.maxhealth = 100;

		this.origin = spawnPosition;
		this.velocity = new Vector3();
		this.size = Vector3.one;

		if (RunService.IsClient() && (this.model || this.modelconfig)) {
			this.modelconfig?.Destroy();
			this.model?.Destroy();

			this.model = undefined;
			this.modelconfig = undefined;
		}

		if (RunService.IsServer()) {
			this.session.Network.WriteNetwork("plrent_spawned")
				.WRITE_STRING(this.sPlayerRefId)
				.WRITE_F32(spawnPosition.Position.X)
				.WRITE_F32(spawnPosition.Position.Y)
				.WRITE_F32(spawnPosition.Position.Z)
				.MESSAGE_END();
			
			// TODO: Remove this part
			task.spawn(() => {
				task.wait(5);

				this.Damage(101, this);
			});
		}

		if (RunService.IsClient()) {
			const rigmodel = Folders.Models.WaitForChild("Rig").Clone() as CharacterModel;
			rigmodel.Parent = Folders.Objects;

			let humDesc = Folders.Models.WaitForChild("BotDescription") as HumanoidDescription;
			const [success, obj] = pcall(() => Players.GetHumanoidDescriptionFromUserId(this.player.UserId));
			if (success) humDesc = obj;
			else print("Unable to get player's HumanoidDescription:\n", obj);
			
			rigmodel.Humanoid.ApplyDescription(humDesc);

			const moduleinst = rigmodel.WaitForChild("ModelConfig") as ModuleScript;
			const requiredmod = require(moduleinst) as { PivotTo: (pos: CFrame) => void; SetBodygroup: (name: string, ...args: unknown[]) => unknown; Destroy: () => void; Update: (tickrate: number) => void; };

			for (const inst of rigmodel.GetChildren())
				if (inst.IsA("BasePart")) this.AssociateInstance(inst);

			if (this.player === Players.LocalPlayer) {
				workspace.CurrentCamera!.CameraSubject = rigmodel.Humanoid;
				workspace.CurrentCamera!.CameraType = Enum.CameraType.Custom;
				Players.LocalPlayer.Character = rigmodel;
			}

			this.model = rigmodel;
			this.modelconfig = requiredmod;
			requiredmod.PivotTo(spawnPosition);
		}
	}
}

EntityManager.LinkEntityToClass(PlayerEntity, "PlayerEntity");

/* -------------------------------------------------------------------------- */
/*                                 Connections                                */
/* -------------------------------------------------------------------------- */
Session.sigSessionCreated.Connect(session => {
	/* --------------------------------- Server --------------------------------- */
	if (RunService.IsServer()) {
		// Listening to network requests
		session.Network.ListenNetwork("plrent_c_getplayers", (user) => {
			if (!user) return;

			const pkg = session.Network.WriteNetwork("plrent_cr_getplayers", [user]);
			const rgEntities = session.Entity.GetEntitiesOfClass("PlayerEntity");

			pkg.WRITE_U8(rgEntities.size());
			for (const ent of rgEntities) {
				pkg.WRITE_STRING(tostring(ent.player.UserId));
				pkg.WRITE_BOOL(ent.health > 0);
			}
			pkg.MESSAGE_END();
		});

		// Position updates
		session.Network.ListenNetwork("plrent_c_posupd", (user, bfr) => {
			if (!user) return;

			const X = bfr.READ_F32();
			const Y = bfr.READ_F32();
			const Z = bfr.READ_F32();
			const rX = bfr.READ_F32();
			const rZ = bfr.READ_F32();

			let entPlayer: PlayerEntity | undefined;
			for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
				if (ent.player !== user) continue;
				entPlayer = ent;
				continue;
			}
			if (!entPlayer) return;

			const newpos = new Vector3(X, Y, Z);
			const newrot = new Vector3(rX, 0, rZ);

			if (entPlayer.cfPendingTeleport) {
				const distance = entPlayer.cfPendingTeleport.Position.sub(newpos).Magnitude;

				if (distance > 5) {
					entPlayer.TeleportTo(entPlayer.cfPendingTeleport, true);
					return;
				}
				entPlayer.cfPendingTeleport = undefined;
			}

			entPlayer.TeleportTo(new CFrame(newpos, newpos.add(newrot)));
		});
	}

	/* --------------------------------- Client --------------------------------- */
	if (RunService.IsClient()) {
		// Players joins
		session.Network.ListenNetwork("plrent_playerjoined", (_, bfr) => {
			const userid = tonumber(bfr.READ_STRING());
			const refid = bfr.READ_STRING();

			if (!userid) throw `Invalid userid.`;
			const player = Players.GetPlayerByUserId(userid);
			if (!player) throw `Invalid player.`;

			session.Entity.CreateEntityByName("PlayerEntity", player, refid);
		});

		// Players disconnection
		session.Network.ListenNetwork("plrent_playerleave", (_, bfr) => {
			const refid = bfr.READ_STRING();

			for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity"))
				if (ent.sPlayerRefId === refid)
					session.Entity.KillThisMafaker(ent);
		});

		// Spawning players
		session.Network.ListenNetwork("plrent_spawned", (_, bfr) => {
			const refid = bfr.READ_STRING();
			const X = bfr.READ_F32();
			const Y = bfr.READ_F32();
			const Z = bfr.READ_F32();

			let entPlayer: PlayerEntity | undefined;
			for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
				if (ent.sPlayerRefId !== refid) continue;
				entPlayer = ent;
				continue;
			}
			if (!entPlayer) return;

			entPlayer.Spawn(new CFrame(X, Y, Z));
		});

		// Position updates
		session.Network.ListenNetwork("plrent_teleport", (_, bfr) => {
			const sPlayerRefId = bfr.READ_STRING();
			const X = bfr.READ_F32();
			const Y = bfr.READ_F32();
			const Z = bfr.READ_F32();
			const rX = bfr.READ_F32();
			const rZ = bfr.READ_F32();

			let entPlayer: PlayerEntity | undefined;
			for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
				if (ent.sPlayerRefId !== sPlayerRefId) continue;
				entPlayer = ent;
				continue;
			}
			if (!entPlayer) return;

			const pos = new Vector3(X, Y, Z);
			const rot = new Vector3(rX, 0, rZ);
			entPlayer.TeleportTo(new CFrame(pos, pos.add(rot)));
		});

		// Health changes
		session.Network.ListenNetwork(NETWORK_IDS.HEALTH, (_, bfr) => {
			const sPlayerRefId = bfr.READ_STRING();
			const health = bfr.READ_U8();
			const maxhealth = bfr.READ_U8();

			let entPlayer: PlayerEntity | undefined;
			for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
				if (ent.sPlayerRefId !== sPlayerRefId) continue;
				entPlayer = ent;
				continue;
			}
			if (!entPlayer) return;

			entPlayer.health = health;
			entPlayer.maxhealth = maxhealth;

			if (entPlayer.model) {
				entPlayer.model.Humanoid.Health = entPlayer.health > 0 ? math.clamp(entPlayer.health, 1, entPlayer.maxhealth) : 0;
				entPlayer.model.Humanoid.MaxHealth = entPlayer.maxhealth;

				if (entPlayer.health <= 0) {
					for (const inst of entPlayer.model.GetChildren()) {
						if (!inst.IsA("BasePart")) continue;

						inst.AssemblyLinearVelocity = new Vector3(0, 100, 0);
						inst.AssemblyAngularVelocity = new Vector3(math.random(-30, 30), math.random(-30, 30), math.random(-30, 30));
					}
				}
			}
		});

		task.wait(1);

		session.Network.ListenNetwork("plrent_cr_getplayers", (_, bfr) => {
			const nEntitiesAmount = bfr.READ_U8();

			for (let i = 0; i < nEntitiesAmount; i++) {
				const userid = tonumber(bfr.READ_STRING());
				const spawned = bfr.READ_BOOL();

				if (!userid) {
					warn("Invalid userid.");
					continue;
				}

				const player = Players.GetPlayerByUserId(userid);
				if (!player) {
					warn("Invalid player.");
					continue;
				}

				let bCanIgnore = false;
				for (const ent of session.Entity.GetEntitiesOfClass("PlayerEntity")) {
					if (ent.player !== player) continue;
					bCanIgnore = true;
					break;
				}
				if (bCanIgnore) {
					print("Already has an existing entity...");
					continue;
				}

				const ent = session.Entity.CreateEntityByName("PlayerEntity", player);
				if (spawned) ent.Spawn();
			}
		});

		session.Network.WriteNetwork("plrent_c_getplayers").MESSAGE_END();
	}
});