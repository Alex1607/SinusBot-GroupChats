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

  class group {

    private _members: Client[] = [];
    private _name: string;

    constructor(name: string) {
      this.name = name;
    }

    public get name(): string {
      return this._name;
    }
    public set name(value: string) {
      this._name = value;
    }

    public get members(): Client[] {
      return this._members;
    }
    public set members(value: Client[]) {
      this._members = value;
    }
  }

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

        if (GROUPS.some((element: group) => { return element.name == name })) {
          reply(`This group name is already in use. You can join the group with !joingroup ${name}`);
          return;
        }

        GROUPS.push(new group(name));

        if (GROUPUSERS[client.uid()] == undefined) {
          GROUPUSERS[client.uid()] = {
            "active": "",
            "groups": []
          }
        }

        joinGroup(client, name);
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

        if (GROUPS.some((element: group) => { return element.name == name })) {
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

        joinGroup(client, name);
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

        if (!GROUPS.some((element: group) => { return element.name == name })) {
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

        leaveGroup(client, name);
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

        if (!GROUPS.some((element: group) => { return element.name == name })) {
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

        if (GROUPUSERS[client.uid()].active == name) {
          reply(`You are already chatting in this group.`);
          return;
        }

        setActive(client, name);
        reply(`You are now chatting in ${name}`);
      });

    command.createCommand("listgroups")
      .help("Lists all the current groups.")
      .manual("Shows which groups currently exist and how many users are currently in them. (No distinction is made between online and offline users)")
      .exec((client, args, reply) => {
        let keys: string[] = Object.keys(GROUPS);
        let tempString: string = "";
        keys.forEach(key => {
          tempString += `- ${key} (${(GROUPS[key].members).length}) \n`;
        });
        reply(`Available Groups:\n${tempString}`);
      });

    event.on("chat", (event) => {
      setTimeout(() => {
        if (event.client.isSelf()) {
          return;
        }
        if (event.mode !== 1) {
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

    function joinGroup(client: Client, tempGroup: group) {
      tempGroup.members.push(client);

      GROUPUSERS[client.uid()].active = tempGroup.name;
      (GROUPUSERS[client.uid()].groups).push(tempGroup.name);
    }

    function leaveGroup(client: Client, tempGroup: group) {
      let groupsindex = (tempGroup.members).indexOf(client);
      if (groupsindex > -1) {
        (tempGroup.members).splice(groupsindex, 1);
      }

      GROUPUSERS[client.uid()].active = undefined;
      let usersindex = (GROUPUSERS[client.uid()].groups).indexOf(tempGroup.name);
      if (usersindex > -1) {
        (GROUPUSERS[client.uid()].groups).splice(usersindex, 1);
      }
    }

    function setActive(client: Client, groupname: string) {
      GROUPUSERS[client.uid()].active = groupname;
    }

    function sendGroupMessage(client: Client, message: string) {
      if (GROUPUSERS[client.uid()].active == undefined) {
        client.chat("You currently have no group selected.")
        return false;
      }
      let currentActiveGroup: string = GROUPUSERS[client.uid()].active;
      let groupmembers: Client[] = getGroupByName(currentActiveGroup).members;
      groupmembers.forEach(member => {
        member.chat(`[${currentActiveGroup}] [URL=${client.getURL()}]${client.name()}[/URL]: ${message}`);
      });
      return true;
    }
  });

  function getGroupByName(name: string): group {
    return GROUPS.some((element: group) => { return element.name === name });
  }
});