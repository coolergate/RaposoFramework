task.wait(1);

import { Lifecycle } from "public/lifecycle";
import Session from "public/session";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */
const StarterGui = game.GetService("StarterGui");
const ReplicatedStorage = game.GetService("ReplicatedStorage");

const LPlayer = game.GetService("Players").LocalPlayer;

/* -------------------------------------------------------------------------- */
/*                                  Variables                                 */
/* -------------------------------------------------------------------------- */
let currSession: Session | undefined;

/* -------------------------------------------------------------------------- */
/*                                    Logic                                   */
/* -------------------------------------------------------------------------- */
StarterGui.SetCoreGuiEnabled("All", false);

while (!ReplicatedStorage.GetAttribute("Loaded")) task.wait();

print("Loading client...");

import { JoinSession, sigSessionsUpdated, UpdateSessions } from "./components/sessionslist";

import "game/shared/entities/Player";


task.wait(3);

Lifecycle.InitializeLifecycle();

UpdateSessions();
print(sigSessionsUpdated.Wait());
print("worked!");

task.wait(3);

JoinSession("default");
