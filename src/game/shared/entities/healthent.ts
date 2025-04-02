import { EntityManager } from "public/entity";
import WorldEntity from "./worldent";
import BaseEntity from "public/entity/BaseEntity";
import Signal from "public/signal";

declare global {
	interface GameEntities {
		HealthEntity: typeof HealthEntity;
	}
}

class HealthEntity extends WorldEntity {
	health = 0;
	maxhealth = 100;

	readonly sigTookDamage = new Signal<[amount: number, attacker: BaseEntity | undefined]>();
	readonly sigDied = new Signal<[attacker: BaseEntity | undefined]>();
	private mapLastAttackList = new Map<BaseEntity["id"], number>();

	constructor() {
		super();

		this.OnDelete(() => this.mapLastAttackList.clear());
		this.OnDelete(() => {
			this.sigTookDamage.Clear();
			rawset(this, "sigTookDamage", undefined);
			
			this.sigDied.Clear();
			rawset(this, "sigDied", undefined);
		});
	}

	Damage(amount: number, attacker: BaseEntity) {
		if (this.health <= 0) return;

		this.health = math.clamp(this.health - amount, 0, this.maxhealth);

		if (amount > 0 && attacker) {
			this.mapLastAttackList.set(attacker.id, time());
		}

		this.sigTookDamage.Fire(amount, attacker);

		if (this.health <= 0)
			this.sigDied.Fire(attacker);
	}

	GetLastAttacker() {
		let nLatestEntityTime = 0;
		let nLatestId = 0;
		for (const [entid, attacktime] of this.mapLastAttackList)
			if (attacktime > nLatestEntityTime) {
				nLatestEntityTime = attacktime;
				nLatestId = entid;
			}
		
		return this.session.Entity.GetEntityFromId(nLatestId);
	}
}

EntityManager.LinkEntityToClass(HealthEntity, "HealthEntity");

export = HealthEntity;