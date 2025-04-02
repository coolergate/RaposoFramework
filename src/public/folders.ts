import UTIL_ReplicatedInst from "./replicatedinst";

const ReplicatedStorage = game.GetService("ReplicatedStorage");

export namespace Folders {
	export const Map = UTIL_ReplicatedInst(workspace, "Map", "Folder");
	export const Objects = UTIL_ReplicatedInst(workspace, "Objects", "Folder");

	export const Models = UTIL_ReplicatedInst(ReplicatedStorage, "Models", "Folder");
	export const Sounds = UTIL_ReplicatedInst(ReplicatedStorage, "Sounds", "Folder");
	export const Interface = UTIL_ReplicatedInst(ReplicatedStorage, "Interface", "Folder");
	export const Animations = UTIL_ReplicatedInst(ReplicatedStorage, "Animations", "Folder");
}