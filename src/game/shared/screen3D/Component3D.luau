--!strict
local RunService = game:GetService("RunService")

local Definitions = require(script.Parent.Definitions)

---@diagnostic disable-next-line: undefined-type
local componentGen: Definitions.componentGen = {}
componentGen.__index = componentGen

function componentGen.new(Component2D, Screen3D)
	local self = setmetatable({
		enabled = false,

		component2D = Component2D,
		surfaceGui = nil,
		surfacePart = nil,

		parent3D = nil,
		screen3D = Screen3D,

		offset = CFrame.identity,
		viewportSize = Screen3D:GetIntendedCanvasSize(),

		--conn = nil
	}, componentGen)

	self.viewportSize = self:GetViewportSize()

	local parent = Component2D.Parent
	if parent and parent:IsA("GuiObject") then
		self.parent2D = parent
	end

	return self
end

function componentGen:Enable()
	if self.enabled or not self.component2D then
		return self
	end

	self.enabled = true

	local surfaceGui = Instance.new("SurfaceGui")
	local surfacePart = Instance.new("Part")

	surfacePart.CanCollide = false
	surfacePart.Anchored = true
	surfacePart.Parent = surfaceGui

	surfaceGui.Parent = self.parent2D or self.screen3D.rootGui
	surfaceGui.Face = Enum.NormalId.Back
	surfaceGui.Adornee = surfacePart
	surfaceGui.AlwaysOnTop = true

	self.surfaceGui = surfaceGui
	self.surfacePart = surfacePart

	self.component2D.Parent = self.surfaceGui

	--self:RecomputeParent()

	--self.conn = RunService.RenderStepped:Connect(function(deltaTime: number)
	--	if self.conn and not (self.surfaceGui and surfacePart) then
	--		self.conn:Disconnect()
	--		return
	--	end

	--	local viewportSize = self:GetViewportSize()

	--	self.viewportSize = viewportSize

	--	surfaceGui.CanvasSize = viewportSize
	--	surfacePart.Size = self:GetStudsScreenSize(viewportSize)
	--	surfacePart.CFrame = self:ReadWorldCFrame()
	--end)

	return self
end

function componentGen:Update()
	local viewportSize = self:GetViewportSize()
	self.viewportSize = viewportSize

	local surfaceGui = self.surfaceGui
	surfaceGui.CanvasSize = viewportSize

	local surfacePart = self.surfacePart
	surfacePart.Size = self:GetStudsScreenSize(viewportSize)
	surfacePart.CFrame = self:ReadWorldCFrame()
end

function componentGen:Disable()
	if not self.enabled then
		return self
	end

	self.enabled = false

	--if self.conn then
	--	self.conn:Disconnect()
	--end

	if self.component2D then
		self.component2D.Parent = self.parent2D or self.screen3D.rootGui
	end

	if self.surfaceGui then
		self.surfaceGui:Destroy()
	end

	return self
end

function componentGen:GetViewportSize(): Vector2
	if self.parent3D and self.parent3D.component2D then
		return self.parent3D.component2D.AbsoluteSize
	end

	return self.screen3D:GetIntendedCanvasSize()
end

function componentGen:UDim2ToCFrame(position2D: UDim2): CFrame
	if not self.component2D then
		return CFrame.identity
	end

	local scaleX, scaleY = position2D.X.Scale, position2D.Y.Scale
	local offsetX, offsetY = position2D.X.Offset, position2D.Y.Offset

	local viewSize = self:GetViewportSize()

	local partSize = self:GetStudsScreenSize(viewSize)
	local trueScaleX, trueScaleY = scaleX + offsetX / viewSize.X, scaleY + offsetY / viewSize.Y

	-- local partSize = self:GetStudsScreenSize(viewSize)

	return CFrame.new(partSize.X * (trueScaleX - 0.5), -partSize.Y * (trueScaleY - 0.5), 0)
end

function componentGen:GetStudsScreenSize(viewportSize: Vector2): Vector3
	local trueSize = self.screen3D:GetRealCanvasSize()

	local currentCamera = workspace.CurrentCamera
	local FOV = currentCamera.FieldOfView

	return Vector3.new(
		(trueSize.X / trueSize.Y) * math.tan(math.rad(FOV) / 2) * (viewportSize.X / trueSize.X),
		math.tan(math.rad(FOV) / 2) * (viewportSize.Y / trueSize.Y),
		0
	) * self.screen3D.displayDistance
end

function componentGen:RecomputeParent()
	local parent = self.parent2D
	local parent3d = self.parent3D
	if parent and parent:IsA("GuiObject") then
		parent3d = self.screen3D:GetComponent3D(parent)
		self.parent3D = parent3d
	end

	local surfaceGui = self.surfaceGui
	if surfaceGui then
		local parent = parent3d
		local zIndex = 0

		while parent do
			zIndex += 1
			parent = parent.parent3D
		end

		surfaceGui.ZOffset = zIndex
	end

	return self
end

function componentGen:ReadWorldCFrame(): CFrame
	local component2d = self.component2D
	if not component2d then
		return CFrame.identity
	end

	self:RecomputeParent()

	local originalCFrame, udimPos, addedPosition

	local udimMax = self:UDim2ToCFrame(UDim2.fromScale(1, 1))

	local parent3d = self.parent3D
	if parent3d then
		if not parent3d.component2D or not self.parent2D then
			return CFrame.identity
		end

		local anchorPoint = parent3d.component2D.AnchorPoint

		originalCFrame = parent3d:ReadWorldCFrame()
		udimPos = parent3d.component2D.Position
		addedPosition = parent3d:UDim2ToCFrame(udimPos)
			* udimMax
			* self:UDim2ToCFrame(UDim2.fromScale(-anchorPoint.X + 0.5, -anchorPoint.Y + 0.5))
			* CFrame.Angles(0, 0, -math.rad(self.parent2D.Rotation))
	else
		local screen3d = self.screen3D
		local viewportDiff = screen3d:GetRealCanvasSize() - screen3d:GetIntendedCanvasSize()

		originalCFrame = workspace.CurrentCamera.CFrame
			* CFrame.new(0, 0, -screen3d.displayDistance / 2)
			* screen3d.rootOffset
		udimPos = UDim2.new(0, viewportDiff.X / 2, 0, viewportDiff.Y / 2)
		addedPosition = self:UDim2ToCFrame(udimPos) * self:UDim2ToCFrame(UDim2.fromScale(1, 1))
	end

	local finalCFrame = originalCFrame * addedPosition
	local finalPivot = finalCFrame * udimMax:Inverse() * self:UDim2ToCFrame(component2d.Position) * udimMax

	return finalCFrame * (finalCFrame:Inverse() * finalPivot * self.offset * finalPivot:Inverse() * finalCFrame)
end

return componentGen
