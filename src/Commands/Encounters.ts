import { CommandClass } from '../Models/CommandClass';
import { Blizzard } from '../Security/Blizzard';
// node fetch needed to make fetch requests
import fetch from 'node-fetch';

const blizzardObject = new Blizzard();
export class Encounters {
    help: string = `Get the encounter information for a certain encounter.\n
    Parameters:\n
        Raid Name: The name of the raid\n
        Boss Name: The name of the boss\n
        Difficulty: The difficulty of the encounter\n
        Role: The role to display tips for\n
    Example:\n
    $tip|castleNathria|shriekwing|heroic|dps\n
    `;

    getHelp() {
        return this.help;
    }

    async getEncounter(encounterId: number): Promise<String> {
        let data = await blizzardObject.refreshBlizzardToken();
        let accessToken = data.token;
        let url = `https://us.api.blizzard.com/data/wow/journal-encounter/${encounterId}?namespace=static-us&locale=en_US&access_token=${accessToken}`;
        let response: any = await fetch(url).catch((error) =>
            console.log(`Unable to get auctions. Error: ${error}`)
        );
        return response.json();
    }
}
