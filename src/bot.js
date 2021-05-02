//use this code along with "npm i dotenv to reference a dotenv file"
require("dotenv").config()
// node fetch needed to make fetch requests
const fetch = require('node-fetch');
//btoa is used for auth
const btoa = require('btoa');
// blizzard auth libraries
var BnetStrategy = require('passport-bnet').Strategy;
const passport = require('passport');


const discord_token = process.env.DISCORDJS_BOT_TOKEN
const blizzard_client_id=process.env.BLIZZARD_CLIENT_ID
const blizzard_client_secret=process.env.BLIZZARD_CLIENT_SECRET
const redirectUri = 'https://localhost:8080';
const scopes = ['wow.profile'];
const prefix = "$"
let token


//class to interact with discord api
const {Client} = require('discord.js')
const client = new Client();

// event emitter event
client.on('ready', () => { 
    console.log(`${client.user.username} has logged in`)
})

/**
 * refresh the blizzard token using the client id and secret
 */
async function refreshBlizzardToken(){
    // build headers
    const basicAuth = btoa(`${blizzard_client_id}:${blizzard_client_secret}`);
    const headers = {
        authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    // build request body
    const params = new URLSearchParams();
    params.append('redirect_uri', redirectUri);
    params.append('scope', scopes.join(' '));
    params.append('grant_type', 'client_credentials');
    // params.append('code', code);
    // execute request
    const requestOptions = {
        method: 'POST',
        body: params,
        headers
    };

    const url = 'https://us.battle.net/oauth/token'
    let response = await fetch(
        url,
        requestOptions
    )
    let data = await response.json()
    return {
        'token': data.access_token,
        'expiration': data.expires_in
    }
}

/**
 * Get the profile data associated with the WOW character
 * @param {string} server_name the name of the server/realm that the user belongs to
 * @param {string} character_name the name of the character
 */
async function getCharacterData(server_name, character_name, token = ''){
    let response
    // TODO: check if the current token needs to be refreshed
    if(!token){
        let data = await refreshBlizzardToken()
        
        token = data.token
    }
    try{
        response = await fetch(`https://us.api.blizzard.com/profile/wow/character/${server_name}/${character_name}?namespace=profile-us&locale=en_US&access_token=${token}`)
            .catch(error => console.log(`Unable to get data for server ${server_name} and character ${character_name}. Error: ${error}`))
    }catch{error => console.log(error)}
    
    if(response.status === '401'){
        console.log('We need to refresh the Blizzard token')
    }
    let character_data = await response.json()
    return character_data
}

/**
 * Get the profile data associated with the WOW character
 * @param {string} server_name the name of the server/realm that the guild belongs to
 * @param {string} guild_name the name of the guild
 */
async function getGuildRoster(server_name, guild_name){
    // TODO: check if the current token needs to be refreshed
    let data = await refreshBlizzardToken()
    token = data.token
    let url = `https://us.api.blizzard.com/data/wow/guild/${server_name}/${guild_name}/roster?namespace=profile-us&locale=en_US&access_token=${token}`
    let response = await fetch(url)
        .catch(error => console.log(`Unable to get data for server ${server_name} and guild ${guild_name}. Error: ${error}`))
    if(response.status === '401'){
        console.log('We need to refresh the Blizzard token')
    }
    let guild_data = await response.json()
    return guild_data
}

/**
 * Get the current item level associated with the WOW character
 * @param {charcter data object} message the message object given in the on message event
 */
async function getWowItemLevel(character_data){
    return character_data.equipped_item_level 
}

/**
 * Get the current item level associated with the WOW character
 * @param {charcter data object} message the message object given in the on message event
 */
async function getWowLevel(character_data){
    return character_data.level 
}

/**
 * Get the covenant associated with the WOW character
 * @param {string} server_name the name of the server/realm that the user belongs to
 * @param {string} character_name the name of the character
 * @param {message object} message the message object given in the on message event
 */
async function getWowCovenant(server_name, character_name, message){
    let data = await getCharacterData(
        server_name,
        character_name
    );
    message.channel.send(`${character_name} - ${server_name} - ${data.covenant_progress.chosen_covenant.name} - renown: ${data.covenant_progress.renown_level}`)
    return true 
}

async function getAuctions(connectedRealmId, itemId){
    let data = await refreshBlizzardToken()
    let access_token = data.token
    let url = `https://us.api.blizzard.com/data/wow/connected-realm/${connectedRealmId}/auctions?namespace=dynamic-us&locale=en_US&access_token=${access_token}`
    let response = await fetch(url)
        .catch(error => console.log(`Unable to get id for item ${item_name} and guild ${guild_name}. Error: ${error}`))
    if(response.status === '401'){
        console.log('We need to refresh the Blizzard token')
    }
    let result = await response.json()
    let auctions = result.auctions
    let currentAuctions = auctions.filter(auction => auction.item.id === itemId)
    return currentAuctions
}

async function getConnectedRealmId(){
    //TODO: use connected realm api to figure this out
    // gorefiend's id is 53
    return 53
}

async function getItemId(item_name){
    // TODO: need to url encode the item name
    let item_name_encoded = item_name.replace(' ', '%20').replace('-', '%20').toLowerCase()
    // let item_name_encoded = "grim%20veiled"
    // item_name_encoded = item_name_encoded.replace('%20pants', '')
    console.log(`item: ${item_name_encoded}`)
    let data = await refreshBlizzardToken()
    let access_token = data.token
    console.log(`searching page 1`)
    let url = `https://us.api.blizzard.com/data/wow/search/item?namespace=static-us&locale=en_US&name.en_US=${item_name_encoded}&orderby=name.en_US&_page=1&access_token=${access_token}`
    let response = await fetch(url)
        .catch(error => console.log(`Unable to get id for item ${item_name} and guild ${guild_name}. Error: ${error}`))
    if(response.status === '401'){
        console.log('We need to refresh the Blizzard token')
    }
    let item_search_data = await response.json()
    let pages = item_search_data.pageCount
    for(let result of item_search_data.results){
        if(result.data.name.en_US === item_name){
            return result.data.media.id
        }
    }
    // Since we've already searched page 1, we can start with the second page
    for(page = 2; page <= pages;page++){
        // todo: can be made into a function
        console.log(`searching page ${page}`)
        let url = `https://us.api.blizzard.com/data/wow/search/item?namespace=static-us&locale=en_US&name.en_US=${item_name_encoded}&orderby=name.en_US&_page=${page}&access_token=${access_token}`
        let response = await fetch(url)
            .catch(error => console.log(`Unable to get id for item ${item_name} and guild ${guild_name}. Error: ${error}`))
        if(response.status === '401'){
            console.log('We need to refresh the Blizzard token')
        }
        let item_search_data = await response.json()
        for(let result of item_search_data.results){
            if(result.data.name.en_US === item_name){
                return result.data.media.id
            }
        }
    }
    return "not found"
}

function parseAuctions(auctions, message){
    let msg = ''
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
    }
    let rankOneLegendary = []
    let rankTwoLegendary = []
    let rankThreeLegendary = []
    let rankFourLegendary = []
    for(let auction of auctions){
        console.log(`Added auction`)
        if(auction.item.context === 63){
            rankOneLegendary.push(auction.buyout)
        }
        if(auction.item.context === 64){
            rankTwoLegendary.push(auction.buyout)
        }
        if(auction.item.context === 65){
            rankThreeLegendary.push(auction.buyout)
        }
        if(auction.item.context === 66){
            rankFourLegendary.push(auction.buyout)
        }
        
    }
    message.channel.send(`There are ${rankOneLegendary.length} rank one legendary auctions with the lowest being ${Math.min(...rankOneLegendary)/10000} gold`)
    message.channel.send(`There are ${rankTwoLegendary.length} rank two legendary auctions with the lowest being ${Math.min(...rankTwoLegendary)/10000} gold`)
    message.channel.send(`There are ${rankThreeLegendary.length} rank three legendary auctions with the lowest being ${Math.min(...rankThreeLegendary)/10000} gold`)
    message.channel.send(`There are ${rankFourLegendary.length} rank four legendary auctions with the lowest being ${Math.min(...rankFourLegendary)/10000} gold`)
}

/**
 * Get the covenant associated with the WOW character
 * @param {string} server_name the name of the server/realm that the guild belongs to
 * @param {string} guild_name the name of the guild
 * @param {message object} message the message object given in the on message event
 */
async function checkItemLevelsOfGuild(server_name, guild_name, message){
    let data = await getGuildRoster(
        server_name,
        guild_name
    );
    try{
        await data.members.forEach(async (member) => {
            //dev code
            
            let character_name = member.character.name.toLowerCase()
            // if(character_name !== 'amaryl') return
            let server_name = member.character.realm.slug 
            let character_data = await getCharacterData(server_name, character_name)
            let itemLevel = await getWowItemLevel(character_data)
            let characterLevel = await getWowLevel(character_data)
            if(characterLevel === 60 && itemLevel>=171){
                message.channel.send(`${character_name} is at or over 171`)
            }
        });
    }catch{
        error => console.log(error)
    }
    console.log('Done!')
    return true 
}

/**
 * Kick the user from the server
 * @param {array} args array of args received after the command
 * @param {message object} message the message object given in the on message event
 */
function kickUser(args, message){
    // TODO: get id by name of user
    let id = args[0]
    const member = message.guild.members.cache.get(id)
    // make sure this is a valid member
    if(!member) return message.channel.send('Member not found')
    // kick the member
    member.kick()
    //handle the promise 
    .then((member) => {
        message.channel.send(`${member} was kicked`)
        return true
    })
    // handle errors
    .catch((err) => {
        console.log(`Error kicking user: ${err}`)
        message.channel.send('The user does not have permissions to kick')
    })
}

function banUser(args, message){
    // TODO: get id by name of user
    let id = args[0]
    const member = message.guild.members.cache.get(id)
    // make sure this is a valid member
    if(!member) return message.channel.send('Member not found')
    // kick the member
    member.guild.members.ban(id)
        //handle the promise 
        .then((member) => {
            message.channel.send(`${member} was kicked`)
        })
        // handle errors
        .catch((err) => {
            console.log(`Error kicking user: ${err}`)
            message.channel.send('The user does not have permissions to kick')
        })
}

client.on('message', async (message) => {
    // boolean that simply returns if the user is a bot
    // this helps us ignore any commands given by the bot
    if(message.author.bot) return;
    // only messages that start with the command prefix are used
    if(message.content.startsWith(prefix)){
        // the spreader operator is used for args so that we get the rest
        const [command_name, ...args] = message.content.
            trim()
            //remove the prefix
            .substring(prefix.length)
            //split string on every breaker
            .split('|')
            //variables
            let server_name, character_name, guild_name, itemLevel, character_data, item_name, item_id, connectedRealmId
        switch(command_name){
            
            case 'hello':
                message.channel.send("whattup")
                break;result
            case 'item':
                // if(args.length === 0) return message.channel.send('Please provide the name of the item to search\nEx: $item garrosh')
                item_name = args[0]
                itemId = await getItemId(item_name)
                console.log(`item: ${itemId}`)
                realm_name = "Gorefiend"
                connectedRealmId = await getConnectedRealmId(realm_name)
                currentAuctions = await getAuctions(connectedRealmId, itemId)
                parseAuctions(currentAuctions, message)
                // itemLevel = await getWowItemLevel(character_data)
                // message.channel.send(`The ID of the item is `)
                break;
            case 'ilvl':
                if(args.length === 0) return message.channel.send('Please provide the server name and character name\nEx: $ilvl illidan thrall')
                server_name = args[0]
                character_name = args[1]
                character_data = await getCharacterData(server_name, character_name)
                itemLevel = await getWowItemLevel(character_data)
                message.channel.send(`${server_name} - ${character_name} - ${itemLevel}`)
                break;
            case 'cov':
                server_name = args[0]
                character_name = args[1]
                getWowCovenant(server_name, character_name, message)
                break;
            case 'guild':
                server_name = 'spinebreaker'
                guild_name = 'interrupts-like-kanye'
                checkItemLevelsOfGuild(server_name, guild_name, message)
                break;
            case 'kick':
                // check if the user has permission
                if(!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('You do not have permission to kick users')
                if(args.length === 0) return message.channel.send('Please provide the id of a user to kick\nEx: $kick 123')
                kickUser(args, message)
                break;
            case 'ban':
                // check if the user has permission
                if(!message.member.hasPermission('BAN_MEMBERS')) return message.channel.send('You do not have permission to ban members')
                if(args.length === 0) return message.channel.send('Please provide the id of a user to ban\nEx: $ban 123')
                // the id of the member should be the first arg
                banUser(args, message)
                break;
            case 'worldquest':
                message.channel.send('https://www.wowhead.com/world-quests/sl/na')
                break;
            case 'help':
                message.channel.send('Available Commands:\n$hello - display friendly greeting\n$ilvl - first arg is the server name, second arg is the character name - this will display the equipped item level for the character')
        }
        // message.channel.send(command_name)
        // message.channel.send(args)
    }
})

client.login(discord_token)