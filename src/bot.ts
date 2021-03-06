//use this code along with "npm i dotenv to reference a dotenv file"
require('dotenv').config();
// node fetch needed to make fetch requests
import fetch from 'node-fetch';
// classes
import { MythicTrap } from './Commands/MythicTrap';
import { Encounters } from './Commands/Encounters';
import { Blizzard } from './Security/Blizzard';

const discord_token = process.env.DISCORDJS_BOT_TOKEN;
const prefix = '$';
let token;
const blizzardObject = new Blizzard();

//class to interact with discord api
const { Client, MessageEmbed } = require('discord.js');
const client = new Client();

// event emitter event
client.on('ready', () => {
    console.log(`${client.user.username} has logged in`);
});

function getHelpMessages(command: string = '') {
    let helpMessage: string = '';

    if (command) {
        switch (command) {
            case 'tip':
                let mythicTrap: MythicTrap = new MythicTrap();
                helpMessage += mythicTrap.getHelp();
        }
    } else {
        // TODO return all help messages
    }
    console.log(`message: ${helpMessage}`);
    return helpMessage;
}
/**
 * Get the profile data associated with the WOW character
 * @param {string} server_name the name of the server/realm that the user belongs to
 * @param {string} character_name the name of the character
 */
async function getCharacterData(
    serverName: string,
    characterName: string,
    token: string = ''
) {
    let response: any;
    if (!token) {
        let data = await blizzardObject.refreshBlizzardToken();

        token = data.token;
    }
    try {
        response = await fetch(
            `https://us.api.blizzard.com/profile/wow/character/${serverName}/${characterName}?namespace=profile-us&locale=en_US&access_token=${token}`
        ).catch((error) =>
            console.log(
                `Unable to get data for server ${serverName} and character ${characterName}. Error: ${error}`
            )
        );
    } catch (error: any) {
        console.log(error);
    }

    if (response.status === '401') {
        console.log('We need to refresh the Blizzard token');
    }
    let character_data = await response.json();
    return character_data;
}

/**
 * Get the profile data associated with the WOW character
 * @param {string} server_name the name of the server/realm that the guild belongs to
 * @param {string} guild_name the name of the guild
 */
async function getGuildRoster(serverName: string, guildName: string) {
    // TODO: check if the current token needs to be refreshed
    let data = await blizzardObject.refreshBlizzardToken();
    token = data.token;
    let url = `https://us.api.blizzard.com/data/wow/guild/${serverName}/${guildName}/roster?namespace=profile-us&locale=en_US&access_token=${token}`;
    let response: any = await fetch(url).catch((error) =>
        console.log(
            `Unable to get data for server ${serverName} and guild ${guildName}. Error: ${error}`
        )
    );
    if (response.status === '401') {
        console.log('We need to refresh the Blizzard token');
    }
    let guildData = await response.json();
    return guildData;
}

/**
 * Get the current item level associated with the WOW character
 * @param {character data object} message the message object given in the on message event
 */
async function getWowItemLevel(characterData: any) {
    return characterData.equipped_item_level;
}

/**
 * Get the current item level associated with the WOW character
 * @param {character data object} message the message object given in the on message event
 */
// TODO: create interface for characterData
async function getWowLevel(characterData: any) {
    return characterData.level;
}

/**
 * Get the covenant associated with the WOW character
 * @param {string} server_name the name of the server/realm that the user belongs to
 * @param {string} character_name the name of the character
 * @param {message object} message the message object given in the on message event
 */
async function getWowCovenant(
    serverName: string,
    characterName: string,
    message: any
) {
    let data = await getCharacterData(serverName, characterName);
    message.channel.send(
        `${characterName} - ${serverName} - ${data.covenant_progress.chosen_covenant.name} - renown: ${data.covenant_progress.renown_level}`
    );
    return true;
}

async function getAuctions(connectedRealmId: number, itemId: number) {
    let data = await blizzardObject.refreshBlizzardToken();
    let accessToken = data.token;
    let url = `https://us.api.blizzard.com/data/wow/connected-realm/${connectedRealmId}/auctions?namespace=dynamic-us&locale=en_US&access_token=${accessToken}`;
    let response: any = await fetch(url).catch((error) =>
        console.log(`Unable to get auctions. Error: ${error}`)
    );
    if (response.status === '401') {
        console.log('We need to refresh the Blizzard token');
    }
    let result = await response.json();
    let auctions = result.auctions;
    // TODO: create interface for auction
    let currentAuctions = auctions.filter(
        (auction: any) => auction.item.id === itemId
    );
    return currentAuctions;
}

async function getConnectedRealmId(realmName: string) {
    //TODO: use connected realm api to figure this out
    // gorefiend's id is 53
    return 53;
}

async function getItemId(itemName: string) {
    // TODO: need to url encode the item name
    let itemNameEncoded = itemName
        .replace(' ', '%20')
        .replace('-', '%20')
        .toLowerCase();
    // let item_name_encoded = "grim%20veiled"
    // item_name_encoded = item_name_encoded.replace('%20pants', '')
    console.log(`item: ${itemNameEncoded}`);
    let data = await blizzardObject.refreshBlizzardToken();
    let access_token = data.token;
    console.log(`searching page 1`);
    let url = `https://us.api.blizzard.com/data/wow/search/item?namespace=static-us&locale=en_US&name.en_US=${itemNameEncoded}&orderby=name.en_US&_page=1&access_token=${access_token}`;
    let response: any = await fetch(url).catch((error) =>
        console.log(`Unable to get id for item ${itemName}. Error: ${error}`)
    );
    if (response.status === '401') {
        console.log('We need to refresh the Blizzard token');
    }
    let item_search_data = await response.json();
    let pages = item_search_data.pageCount;
    for (let result of item_search_data.results) {
        if (result.data.name.en_US === itemName) {
            return result.data.media.id;
        }
    }
    // Since we've already searched page 1, we can start with the second page
    for (let page = 2; page <= pages; page++) {
        // todo: can be made into a function
        console.log(`searching page ${page}`);
        let url = `https://us.api.blizzard.com/data/wow/search/item?namespace=static-us&locale=en_US&name.en_US=${itemNameEncoded}&orderby=name.en_US&_page=${page}&access_token=${access_token}`;
        let response: any = await fetch(url).catch((error) =>
            console.log(
                `Unable to get id for item ${itemName}. Error: ${error}`
            )
        );
        if (response.status === '401') {
            console.log('We need to refresh the Blizzard token');
        }
        let item_search_data = await response.json();
        for (let result of item_search_data.results) {
            if (result.data.name.en_US === itemName) {
                return result.data.media.id;
            }
        }
    }
    return 'not found';
}
// TODO: create auctions interface
function parseAuctions(auctions: any, message: any) {
    let msg = '';
    let context = {
        1: 'Normal Dungeon',
        5: 'Heroic Raid',
        11: 'Quest Reward',
        14: 'Vendor',
        15: 'Black Market Auction House',
        63: 'Rank 1 Legendary',
        64: 'Rank 2 Legendary',
        65: 'Rank 3 Legendary',
        66: 'Rank 4 Legendary'
    };
    let rankOneLegendary = [];
    let rankTwoLegendary = [];
    let rankThreeLegendary = [];
    let rankFourLegendary = [];
    for (let auction of auctions) {
        console.log(`Added auction`);
        if (auction.item.context === 63) {
            rankOneLegendary.push(auction.buyout);
        }
        if (auction.item.context === 64) {
            rankTwoLegendary.push(auction.buyout);
        }
        if (auction.item.context === 65) {
            rankThreeLegendary.push(auction.buyout);
        }
        if (auction.item.context === 66) {
            rankFourLegendary.push(auction.buyout);
        }
    }
    message.channel.send(
        `There are ${
            rankOneLegendary.length
        } rank one legendary auctions with the lowest being ${
            Math.min(...rankOneLegendary) / 10000
        } gold`
    );
    message.channel.send(
        `There are ${
            rankTwoLegendary.length
        } rank two legendary auctions with the lowest being ${
            Math.min(...rankTwoLegendary) / 10000
        } gold`
    );
    message.channel.send(
        `There are ${
            rankThreeLegendary.length
        } rank three legendary auctions with the lowest being ${
            Math.min(...rankThreeLegendary) / 10000
        } gold`
    );
    message.channel.send(
        `There are ${
            rankFourLegendary.length
        } rank four legendary auctions with the lowest being ${
            Math.min(...rankFourLegendary) / 10000
        } gold`
    );
}

/**
 * Get the covenant associated with the WOW character
 * @param {string} server_name the name of the server/realm that the guild belongs to
 * @param {string} guild_name the name of the guild
 * @param {message object} message the message object given in the on message event
 */
async function checkItemLevelsOfGuild(
    serverName: string,
    guildName: string,
    message: any,
    cutoffCharacterLevel = 60,
    cutoffItemLevel: number = 204
) {
    let data = await getGuildRoster(serverName, guildName);
    message.channel.send(
        `Checking Members of ${guildName} that are at or over ${cutoffItemLevel}. This may take some time...`
    );
    let discordMessage: string = '';
    try {
        await data.members.forEach(async (member: any) => {
            let character_name = member.character.name.toLowerCase();
            // if(character_name !== 'amaryl') return
            let server_name = member.character.realm.slug;
            let character_data = await getCharacterData(
                server_name,
                character_name
            );
            let itemLevel = await getWowItemLevel(character_data);
            let characterLevel = await getWowLevel(character_data);
            if (
                characterLevel === cutoffCharacterLevel &&
                itemLevel >= cutoffItemLevel
            ) {
                message.channel.send(
                    `${character_name} is at or over ${cutoffItemLevel}\n`
                );
            }
        });
        await message.channel.send('Finished parsing characters');
    } catch (err: any) {
        console.log(err.message);
    }

    return true;
}

/**
 * Kick the user from the server
 * @param {array} args array of args received after the command
 * @param {message object} message the message object given in the on message event
 */
function kickUser(args: string[], message: any) {
    // TODO: get id by name of user
    let id = args[0];
    const member = message.guild.members.cache.get(id);
    // make sure this is a valid member
    if (!member) return message.channel.send('Member not found');
    // kick the member
    member
        .kick()
        //handle the promise
        // TODO create member object
        .then((member: any) => {
            message.channel.send(`${member} was kicked`);
            return true;
        })
        // handle errors
        .catch((err: any) => {
            console.log(`Error kicking user: ${err}`);
            message.channel.send('The user does not have permissions to kick');
        });
}

function banUser(args: string[], message: any) {
    // TODO: get id by name of user
    let id = args[0];
    const member = message.guild.members.cache.get(id);
    // make sure this is a valid member
    if (!member) return message.channel.send('Member not found');
    // kick the member
    member.guild.members
        .ban(id)
        //handle the promise
        .then((member: any) => {
            message.channel.send(`${member} was kicked`);
        })
        // handle errors
        .catch((err: any) => {
            console.log(`Error kicking user: ${err}`);
            message.channel.send('The user does not have permissions to kick');
        });
}
// TODO: create a message interface
client.on('message', async (message: any) => {
    // boolean that simply returns if the user is a bot
    // this helps us ignore any commands given by the bot
    if (message.author.bot) return;
    // only messages that start with the command prefix are used
    if (message.content.startsWith(prefix)) {
        // the spreader operator is used for args so that we get the rest
        const [command_name, ...args] = message.content
            .trim()
            //remove the prefix
            .substring(prefix.length)
            //split string on every breaker
            .split('|');
        //variables
        let server_name,
            character_name,
            guild_name,
            itemLevel,
            character_data,
            item_name,
            itemId,
            connectedRealmId;
        let helpMessage: string = '';
        switch (command_name) {
            case 'hello':
                message.channel.send('whattup');
                break;
            case 'item':
                // if(args.length === 0) return message.channel.send('Please provide the name of the item to search\nEx: $item garrosh')
                item_name = args[0];
                itemId = await getItemId(item_name);
                console.log(`item: ${itemId}`);
                let realmName: string = 'Gorefiend';
                connectedRealmId = await getConnectedRealmId(realmName);
                let currentAuctions = await getAuctions(
                    connectedRealmId,
                    itemId
                );
                parseAuctions(currentAuctions, message);
                // itemLevel = await getWowItemLevel(character_data)
                // message.channel.send(`The ID of the item is `)
                break;
            case 'ilvl':
                if (args.length === 0)
                    return message.channel.send(
                        'Please provide the server name and character name\nEx: $ilvl illidan thrall'
                    );
                server_name = args[0];
                character_name = args[1];
                character_data = await getCharacterData(
                    server_name,
                    character_name
                );
                itemLevel = await getWowItemLevel(character_data);
                message.channel.send(
                    `${server_name} - ${character_name} - ${itemLevel}`
                );
                break;
            case 'cov':
                server_name = args[0];
                character_name = args[1];
                getWowCovenant(server_name, character_name, message);
                break;
            case 'guild':
                server_name = 'spinebreaker';
                guild_name = 'interrupts-like-kanye';
                checkItemLevelsOfGuild(server_name, guild_name, message);
                break;
            case 'kick':
                // check if the user has permission
                if (!message.member.hasPermission('KICK_MEMBERS'))
                    return message.channel.send(
                        'You do not have permission to kick users'
                    );
                if (args.length === 0)
                    return message.channel.send(
                        'Please provide the id of a user to kick\nEx: $kick 123'
                    );
                kickUser(args, message);
                break;
            case 'ban':
                // check if the user has permission
                if (!message.member.hasPermission('BAN_MEMBERS'))
                    return message.channel.send(
                        'You do not have permission to ban members'
                    );
                if (args.length === 0)
                    return message.channel.send(
                        'Please provide the id of a user to ban\nEx: $ban 123'
                    );
                // the id of the member should be the first arg
                banUser(args, message);
                break;
            case 'worldquest':
                message.channel.send(
                    'https://www.wowhead.com/world-quests/sl/na'
                );
                break;
            case 'tip':
                if (args.length === 0)
                    return message.channel.send(getHelpMessages('tip'));
                let raidName = args[0];
                let bossName = args[1];
                let difficulty = args[2];
                let role = args[3];
                let mythicTrap = new MythicTrap();
                let link: string = mythicTrap.getLink({
                    raidName: raidName,
                    bossName: bossName,
                    difficulty: difficulty,
                    role: role
                });
                message.channel.send(link);

                break;
            case 'encounter':
                let instanceName = args[0];
                bossName = args[1];
                let encounters = new Encounters();
                let embed = new MessageEmbed();
                //get encounter id with search
                let encounterId: number = await encounters.searchEnounters(
                    instanceName,
                    bossName
                );
                embed = await encounters.parseEncounter(encounterId, embed);
                message.channel.send(embed);
                break;
            case 'help':
                helpMessage = getHelpMessages();
                message.channel.send(helpMessage);
            // message.channel.send('Available Commands:\n$hello - display friendly greeting\n$ilvl - first arg is the server name, second arg is the character name - this will display the equipped item level for the character')
        }
        // message.channel.send(command_name)
        // message.channel.send(args)
    }
});

client.login(discord_token);
