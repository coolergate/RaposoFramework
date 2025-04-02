const RunService = game.GetService("RunService");

function UTIL_ReplicatedInst<K extends keyof CreatableInstances, I extends CreatableInstances[K]>(
	parent: Instance,
	name: string,
	classname: K,
): I {
	let instTarget = parent.FindFirstChild(name) as I | undefined;

	if (!instTarget || !instTarget.IsA(classname)) {
		if (RunService.IsClient()) {
			instTarget = parent.WaitForChild(name + "_" + classname) as I;
			return instTarget;
		}

		instTarget = new Instance(classname) as I;
		instTarget.Name = name + "_" + classname;
		instTarget.Parent = parent;
	}

	return instTarget;
}

export = UTIL_ReplicatedInst;
