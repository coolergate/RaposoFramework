import { t } from "@rbxts/t";
import BaseEntity from "./BaseEntity";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
declare global {
	type EntityType<T extends keyof GameEntities> = GameEntities[T]["prototype"];
	type EntityId = typeof BaseEntity["prototype"]["id"];
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const RunService = game.GetService("RunService");

const NUM_MAX_ENTS = 2048;

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */
export class EntityManager {
	static mapEntitiesBuilder = new Map<string, new (...args: never[]) => BaseEntity>();
	mapGameEntities = new Map<EntityId, BaseEntity>();

	constructor(readonly session: GameSession) {
		session.BindToClose(() => {
			for (const [entid, info] of this.mapGameEntities) {
				this.KillThisMafaker(info);
			}
		});
	}

	CreateEntityByName<
		K extends keyof GameEntities,
		E extends GameEntities[K],
		C extends E extends new (...args: infer A) => BaseEntity ? A : never[],
	>(name: K, ...args: C): EntityType<K> {
		const entity_constructor = EntityManager.mapEntitiesBuilder.get(name);
		if (!entity_constructor) throw `Unknown entity classname "${name}"`;

		const entity = new entity_constructor(...(args as never[]));
		rawset(entity, "id", this.GetNextEntityMemoryPosition());
		rawset(entity, "session", this.session);

		this.mapGameEntities.set(entity.id, entity);

		return entity as unknown as EntityType<K>;
	}

	KillThisMafaker(entity: BaseEntity) {
		if (!this.IsEntityOnMemoryOrImSchizo(entity)) return;
		if (!t.table(entity) || !t.number(rawget(entity, "id") as EntityId))
			throw `This s### is an invalid entity. ${entity.classname} ${entity.id}`;

		if (RunService.IsServer() || RunService.IsStudio())
			print("Removing entity:", entity.classname, entity.id);

		this.mapGameEntities.delete(entity.id);

		task.defer(() => {
			for (const callback of entity.rgDeletion) {
				const [success, errorMessage] = pcall(callback, entity);

				if (!success) {
					warn(`Error when killing entity ${entity.id} (${entity.classname}):`);
					print(errorMessage);
					continue;
				}
			}
			table.clear(entity.rgDeletion);

			table.clear(entity.rgAssociatedInstances);
			table.clear(entity.mapAttributes);
			table.clear(entity.rgEntityThinkFuncs);

			task.wait();
			task.wait();

			for (const [key, value] of entity as unknown as Map<string, unknown>) {
				if (typeIs(value, "table")) table.clear(value);

				rawset(entity, key, undefined);
			}

			setmetatable(entity, undefined);
			table.clear(entity);
		});
	}

	IsEntityOnMemoryOrImSchizo(entity: BaseEntity | EntityId | undefined): boolean {

		// If an nil value is given.
		if (!t.any(entity)) {
			return false;
		}

		// If an number value is given.
		if (t.number(entity)) {
			return this.mapGameEntities.has(entity);
		}

		// If the object is not an table.
		if (!t.table(entity)) return false;

		// Try to get the "id" variable from the object
		const id = rawget(entity, "id") as EntityId;
		if (!t.number(id)) return false;

		// Search it up
		const ent = this.mapGameEntities.get(id);
		return ent !== undefined;

		// Why the fuck did you have to comment each and every step of this?
		// Fucking retarded people man I swear to god.
	}

	GetNextEntityMemoryPosition() {
		for (let i = 0; i < NUM_MAX_ENTS; i++) {
			if (this.mapGameEntities.has(i)) continue;
			return i;
		}
	}

	GetEntityFromId(entid: EntityId) {
		return this.mapGameEntities.get(entid);
	}

	GetEntitiesThatIsA<K extends keyof GameEntities, E extends GameEntities[K]>(classname: K): E["prototype"][] {
		const entities = new Array<E["prototype"]>();

		for (const [, ent] of this.mapGameEntities) {
			if (!ent.IsA(classname)) continue;
			entities.push(ent as unknown as EntityType<K>);
		}

		return entities;
	}

	GetEntitiesOfClass<K extends keyof GameEntities, E extends GameEntities[K]>(classname: K): E["prototype"][] {
		const entities = new Array<E["prototype"]>();

		for (const [, ent] of this.mapGameEntities) {
			if (ent.classname !== classname) continue;
			entities.push(ent as unknown as EntityType<K>);
		}

		return entities;
	}

	GetEntitiesFromInstance(inst: Instance) {
		const rgEntities = new Array<BaseEntity>();

		for (const [, ent] of this.mapGameEntities) {
			if (!ent.rgAssociatedInstances.includes(inst)) {
				// Is it a descendant of one associated instance?
				for (const inst2 of ent.rgAssociatedInstances) {
					if (!inst.IsDescendantOf(inst2)) continue;
					rgEntities.push(ent);
					break;
				}

				continue;
			}

			rgEntities.push(ent);
		}

		return rgEntities;
	}

	static LinkEntityToClass(builder: new (...args: never[]) => BaseEntity, classname: keyof GameEntities) {
		if (this.mapEntitiesBuilder.has(classname))
			throw `Entity constructor ${classname} already exists.`;
		
		this.mapEntitiesBuilder.set(classname, builder);
	}
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */
