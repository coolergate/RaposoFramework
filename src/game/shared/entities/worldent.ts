import { EntityManager } from "public/entity";
import BaseEntity from "public/entity/BaseEntity";

declare global {
	interface GameEntities {
		WorldEntity: typeof WorldEntity;
	}
}

class WorldEntity extends BaseEntity {
	origin = new CFrame();
	size = new Vector3();
	velocity = new Vector3();

	constructor() {
		super();
	}
}

EntityManager.LinkEntityToClass(WorldEntity, "WorldEntity");

export = WorldEntity;