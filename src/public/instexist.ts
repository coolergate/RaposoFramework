function UTIL_INSTEXIST(inst: Instance | undefined): inst is Instance {
	return inst !== undefined && inst.IsDescendantOf(game);
}

export = UTIL_INSTEXIST;
