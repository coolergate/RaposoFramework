type screen3D = {
	partIndex: Map<GuiObject, component3D>;
	rootGui: ScreenGui;
	displayDistance: number;
	rootOffset: CFrame;
}

export type component3D = {
	enabled: boolean;

	component2D?: GuiObject;
	surfaceGui?: SurfaceGui;
	surfacePart?: BasePart;

	parent2D?: GuiObject;
	screen3D: screen3D;
	parent3D?: component3D;

	offset: CFrame;
	viewportSize: Vector2;
} & componentGen

declare class componentGen {
	constructor(Component2D: GuiObject, Screen3D: screen3D);
	Enable(): component3D;
	Disable(): component3D;
	
	RecomputeParent(): void;
	
	GetStudsScreenSize(viewportSize: Vector2): Vector3;
	ReadWorldCFrame(): CFrame;
	UDim2ToCFrame(position2D: UDim2): CFrame;
	//AbsoluteUDim2ToCFrame(position2D: UDim2): CFrame;
	
	GetViewportSize(): Vector2;

	Update(): void;
}

type screenGenConstructor = new (screenGui: ScreenGui, displayDistance: number) => {
	GetComponent3D(Component2D: GuiObject): component3D;

	GetRealCanvasSize(): Vector2;
	GetInsetCanvasSize(): Vector2;
	GetIntendedCanvasSize(): Vector2;
	GetInset(): Vector2;
} & screen3D;

export declare const screenGen: screenGenConstructor;
