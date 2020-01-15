///<reference path="../node_modules/sinusbot/typings/global.d.ts" />
import { Client } from "../node_modules/sinusbot/typings/interfaces/Client";

registerPlugin({
  "name": "GroupChats",
  "description": "Allow users to create group chats",
  "version": "1.0.0",
  "author": "Kavatch",
  "backends": [],
  "vars": []
}, () => {

  const command = require("command")

  const event = require("event");
  const engine = require("engine");
  const backend = require("backend");
  const GROUPS: any = {};
  const GROUPUSERS: any = {};

  event.on("load", () => {
    command.createCommand("creategroup")
      .help("Creates a new group that anyone can join.")
      .manual("creategroup <name> creates a new group as long as the name does not yet exist. Everyone on the server can then join it.")
      .addArgument(command.createArgument("string").setName("name"))
      .exec((client, { name }, reply) => {
        if (name == "") {
          reply("Incorrect usage. Please use: !creategroup <name>");
          return;
        }

        if (GROUPS[name] != undefined) {
          reply(`This group name is already in use. You can join the group with !joingroup ${name}`);
          return;
        }
        //Group dosnt exist yet -> create group
        GROUPS[name] = {
          "members": []
        };

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          }
        }

        joingroup(client, name);
        reply(`Group ${name} was created successfully. Others can join with: !joingroup ${name}`);
      });

    command.createCommand("joingroup")
      .help("Join a group")
      .manual("joingroup [name] adds you to a group and makes this group the active chat group for you")
      .addArgument(command.createArgument("string").setName("name"))
      .exec((client, { name }, reply) => {
        if (name == "") {
          reply("Incorrect usage. Please use: !joingroup <name>");
          return;
        }

        if (GROUPS[name] == undefined) {
          reply(`This group dosnt exist. Use: !creategroup ${name} to create it.`);
          return;
        }

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          };
        }

        let groups: [any] = GROUPUSERS[client.uid()].groups;
        if (groups.includes(name)) {
          reply("You are already in this group.")
          return;
        }

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          }
        }

        joingroup(client, name);
        reply(`You have joined ${name}!`);
        sendGroupMessage(client, " has joined the group!");
      });

    command.createCommand("leavegroup")
      .help("Leaves a group")
      .manual("leavegroup [name] will remove you from the group.")
      .addArgument(command.createArgument("string").setName("name"))
      .exec((client, { name }, reply) => {
        if (name == "") {
          reply("Incorrect usage. Please use: !leavegroup <name>");
          return;
        }

        if (GROUPS[name] == undefined) {
          reply(`That group dosnt exist.`);
          return;
        }

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          };
        }

        if (!(GROUPUSERS[client.uid()].groups).includes(name)) {
          reply(`No need to leave that group. You arent in this group.`);
          return;
        }

        leavegroup(client, name);
        reply(`You have left ${name}!`);
        sendGroupMessage(client, " has left the group!");
      });

    command.createCommand("changegroup")
      .help("Changes your active chat group.")
      .manual("Changes your active chat group. Your active chat group is the group in which your messages are displayed.")
      .addArgument(command.createArgument("string").setName("name"))
      .exec((client, { name }, reply) => {
        if (name == "") {
          reply("Incorrect usage. Please use: !changegroup <name>");
          return;
        }

        if (GROUPS[name] == undefined) {
          reply(`This group dosnt exist.`);
          return;
        }

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          };
        }

        let groups: [any] = GROUPUSERS[client.uid()].groups;
        if (!groups.includes(name)) {
          reply("You are not in in this group.")
          return;
        }

        setactive(client, name);
        reply(`You are now chatting in ${name}`);
      });

    command.createCommand("listgroups")
      .help("Lists all the current groups.")
      .manual("Shows which groups currently exist and how many users are currently in them. (No distinction is made between online and offline users)")
      .exec((client, args, reply) => {
        let keys: [string] = GROUPS.keys();
        let tempString: string = "";
        keys.forEach(key => {
          tempString += `- ${key} (${(GROUPS[key].members).length}) \n`;
        });
        reply(`Available Groups: ${tempString}`);
      });

    event.on("chat", (event) => {
      setTimeout(() => {
        if (event.client.isSelf()) {
          return;
        }
        if ((event.text).startsWith(engine.getCommandPrefix())) {
          return;
        }
        if (GROUPUSERS[(event.client).uid()] == undefined) {
          return;
        }
        if (GROUPUSERS[(event.client).uid()].active == undefined) {
          return;
        }
        sendGroupMessage(event.client, event.text);
      }, 500);
    });

    function joingroup(client: Client, groupname: string) {
      (GROUPS[groupname].members).push(client.uid())

      GROUPUSERS[client.uid()].active = groupname;
      (GROUPUSERS[client.uid()].groups).push(groupname);
    }

    function leavegroup(client: Client, groupname: string) {
      let groupsindex = (GROUPS[groupname].members).indexOf(client.uid());
      if (groupsindex > -1) {
        (GROUPS[groupname].members).splice(groupsindex, 1);
      }

      GROUPUSERS[client.uid()].active = undefined;
      let usersindex = (GROUPUSERS[client.uid()]).indexOf(groupname);
      if (usersindex > -1) {
        (GROUPUSERS[client.uid()]).splice(usersindex, 1);
      }
    }

    function setactive(client: Client, groupname: string) {
      GROUPUSERS[client.uid()].active = groupname;
    }

    function sendGroupMessage(client: Client, message: string) {
      if (GROUPUSERS[client.uid()].active == undefined) {
        //TODO: Send Info message
        return false;
      }
      let currentActiveGroup: string = GROUPUSERS[client.uid()].active;
      let groupmembers: [string] = GROUPS[currentActiveGroup].members;
      groupmembers.forEach(member => {
        if (member == client.uid()) {
          return;
        }
        if (backend.getClientByUID(member) == undefined) {
          return;
        }
        backend.getClientByUID(member).chat(`[${currentActiveGroup}] [URL=${client.getURL()}]${client.name()}[/URL]: ${message}`);
      });
      return true;
    }
  });
});