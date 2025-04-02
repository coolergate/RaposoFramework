import ErrorObject from "public/errorobj";

declare global {
	interface GameEntities {
		BaseEntity: typeof BaseEntity;
	}
}

abstract class BaseEntity {
	readonly id = ErrorObject<number>("Entity id cannot be accessed during construction.");
	readonly session = ErrorObject<GameSession>("Entity session cannot be accessed during construction.");

	classname: keyof GameEntities = "BaseEntity";
	protected setIsA = new Set<keyof GameEntities>();
	readonly rgDeletion = new Array<Callback>();
	readonly rgAssociatedInstances = new Array<Instance>();
	readonly mapAttributes = new Map<string, unknown>();
	readonly rgEntityThinkFuncs = new Array<(dt: number) => void>();

	constructor() {
		this.setIsA.add("BaseEntity");
	}

	IsA<C extends keyof GameEntities>(classname: C): this is EntityType<C> {
		return this.setIsA.has(classname) || this.classname === classname;
	}

	OnDelete(callback: (entity: this) => void) {
		this.rgDeletion.push(callback);
	}

	AssociateInstance(inst: Instance) {
		this.rgAssociatedInstances.push(inst);
	}

	SetAttribute(name: string, value: unknown) {
		if (value === undefined) {
			this.mapAttributes.delete(name);
			return;
		}

		this.mapAttributes.set(name, value);
	}

	BindThinkCallback(callback: (dt: number) => void) {
		this.rgEntityThinkFuncs.push(callback);

		return callback; 
	}
}

export = BaseEntity;
