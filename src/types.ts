declare global {
	type RemoveFirstArg<F> = F extends (x: unknown, ...args: infer P) => infer R ? (...args: P) => R : F;

	const workspace: Workspace;

	interface Player extends Instance {
		PlayerGui: PlayerGui;
	}

	function UserSettings(): {
		GameSettings: {
			GetCameraYInvertValue(): number;
			SetGamepadCameraSensitivityVisible(): void;
			MouseSensitivity: number;
		};
	};
}
