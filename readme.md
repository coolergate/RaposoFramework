# Raposo Framework
> Built for the shits and giggles.

A Roblox framework that works around "sessions", allowing for game code to be hosted both on the server and client.

## File structure
The file structure is split between both the `game` folder and the `public` folder, allowing for the framework to be updated without greatly affecting the game itself.

Name | Description
-----|-------------|
`game` | Game specific code
`public` | Framework code

## Sessions
The session system allows for multiple games to be hosted on the server and for the client to run their own local session.

## Entities
The entity system is somewhat similar to the GoldSrc entity system, by inheriting from the `BaseEntity` class.