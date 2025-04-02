function ErrorObject<T>(message: string) {
	return setmetatable({}, {
		__index: () => {
			throw message;
		},
		__newindex: () => {
			throw message;
		},
		__call: () => {
			throw message;
		}
	}) as T;
}

export = ErrorObject;