///<reference path="../node_modules/sinusbot/typings/global.d.ts" />

import { Client } from "../node_modules/sinusbot/typings/interfaces/Client";
import { engine } from "../node_modules/sinusbot/typings/modules/engine";
import { backend } from "../node_modules/sinusbot/typings/modules/backend";

registerPlugin({
  "name": "GroupChats",
  "description": "Allow users to create group chats",
  "version": "1.0.0",
  "author": "Kavatch",
  "backends": [],
  "vars": []
}, () => {

  const { createCommand } = require("command");
  const event = require("event");
  const GROUPS: any = {};
  const GROUPUSERS: any = {};

  event.on("load", () => {
    createCommand("creategroup")
      .help("Creates a new group that anyone can join.")
      .manual("creategroup <name> creates a new group as long as the name does not yet exist. Everyone on the server can then join it.")
      .exec((client, args, reply) => {
        if (args.lenght() != 1) {
          reply("Incorrect usage. Please use: !creategroup <name>");
          return;
        }
        let name = args[0];
        if (GROUPS[name] != undefined) {
          reply(`This group name is already in use. You can join the group with !joingroup ${name}`);
          return;
        }
        //Group dosnt exist yet -> create group
        GROUPS[name] = {
          "members": []
        };
        joingroup(client, name);
        reply(`Group ${name} was created successfully. Others can join with: !joingroup ${name}`);
      });

    createCommand("joingroup")
      .help("Join a group")
      .manual("joingroup [name] adds you to a group and makes this group the active chat group for you")
      .exec((client, args, reply) => {
        if (args.lenght() != 1) {
          reply("Incorrect usage. Please use: !joingroup <name>");
          return;
        }
        let name = args[0];
        if (GROUPS[name] == undefined) {
          reply(`This group dosnt exist. Use: !creategroup ${name} to create it.`);
          return;
        }
        joingroup(client, name);
        reply(`You have joined ${name}!`);
        sendGroupMessage(client, " has joined the group!");
      });

    createCommand("leavegroup")
      .help("Leaves a group")
      .manual("leavegroup [name] will remove you from the group.")
      .exec((client, args, reply) => {
        if (args.lenght() != 1) {
          reply("Incorrect usage. Please use: !leavegroup <name>");
          return;
        }
        let name = args[0];
        if (!(GROUPUSERS[client.uniqueId()].groups).includes(name)) {
          reply(`No need to leave that group. You arent in this group.`);
          return;
        }
        leavegroup(client, name);
        reply(`You have left ${name}!`);
        sendGroupMessage(client, " has left the group!");
      });

    createCommand("changegroup")
      .help("Changes your active chat group.")
      .manual("Changes your active chat group. Your active chat group is the group in which your messages are displayed.")
      .exec((client, args, reply) => {
        if (args.lenght() != 1) {
          reply("Incorrect usage. Please use: !changegroup <name>");
          return;
        }
        let name = args[0];
        if (GROUPS[name] == undefined) {
          reply(`This group dosnt exist.`);
          return;
        }

        let groups: [string] = GROUPUSERS[client.uniqueId()].groups;
        if (!groups.includes(name)) {
          reply("You are not in in this group.")
          return;
        }

        setactive(client, name);
        reply(`You are now chatting in ${name}`);
      });

    event.on("chat", (event) => {
      if (event.client == backend.getBotClient()) {
        return;
      }
      if ((event.text).startsWith(engine.getCommandPrefix())) {
        return;
      }
      if (GROUPUSERS[event.client.uniqueId()].active != undefined) {
        return;
      }
      sendGroupMessage(event.client, event.text);
    });

    function joingroup(client: Client, groupname: string) {
      (GROUPS[groupname].members).push(client.uniqueId())

      GROUPUSERS[client.uniqueId()].active = groupname;
      (GROUPUSERS[client.uniqueId()].groups).push(groupname);
    }

    function leavegroup(client: Client, groupname: string) {
      let groupsindex = (GROUPS[groupname].members).indexOf(client.uniqueId());
      if (groupsindex > -1) {
        (GROUPS[groupname].members).splice(groupsindex, 1);
      }

      GROUPUSERS[client.uniqueId()].active = undefined;
      let usersindex = (GROUPUSERS[client.uniqueId()]).indexOf(groupname);
      if (usersindex > -1) {
        (GROUPUSERS[client.uniqueId()]).splice(usersindex, 1);
      }
    }

    function setactive(client: Client, groupname: string) {
      GROUPUSERS[client.uniqueId()].active = groupname;
    }

    function sendGroupMessage(client: Client, message: string) {
      if (GROUPUSERS[client.uniqueId()].active == undefined) {
        //TODO: Send Info message
        return false;
      }
      let currentActiveGroup: string = GROUPUSERS[client.uniqueId()].active;
      let groupmembers: [string] = GROUPS[currentActiveGroup].members;
      groupmembers.forEach(member => {
        if (member == client.uniqueId()) {
          return;
        }
        backend.getClientByUniqueID(member).chat(`[${currentActiveGroup}] ${client.name()}: ${message}`);
      });
      return true;
    }
  });
});