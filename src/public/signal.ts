const HttpService = game.GetService("HttpService");

declare global {
	interface BindableEventConnection {
		Unsub(): void;
	}
}

class Signal<ARGS extends unknown[]> {
	private _mapConnections = new Map<string, (...headers: ARGS) => void>();
	private _rgWaitingThreads = new Array<Callback>();

	constructor() {}

	Connect(callback: (...args: ARGS) => void): BindableEventConnection {
		const id = HttpService.GenerateGUID();
		const connected_events = this._mapConnections;

		connected_events.set(id, callback);

		return {
			Unsub() {
				connected_events.delete(id);
			},
		};
	}

	async Fire(...headers: ARGS) {
		for (const callback of this._rgWaitingThreads)
			callback(...headers);

		for (const [id, callback] of this._mapConnections) {
			const [success, errorMessage] = pcall(() => callback(...headers));
			if (!success) {
				warn("Error when executing callback from signal.");
				print(errorMessage, "\n");
			}
		}
	}

	Wait() {
		const thread = coroutine.running();

		this._rgWaitingThreads.push((...args: ARGS) => {
			coroutine.resume(thread, ...args);
		});

		return coroutine.yield(thread) as unknown as ARGS;
	}

	Clear() {
		this._mapConnections.clear();
	}
}

export default Signal;
