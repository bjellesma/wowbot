import { CommandClass } from '../Models/CommandClass';
import { Blizzard } from '../Security/Blizzard';
// node fetch needed to make fetch requests
import fetch from 'node-fetch';

import { EmbedField } from '../Models/DiscordObjects';

const blizzardObject = new Blizzard();
export class Encounters {
    help: string = `Get the encounter information for a certain encounter.\n
    Parameters:\n
        Instance Name: The name of the raid\n
        Boss Name: The name of the boss\n
        Difficulty: The difficulty of the encounter\n
    Example:\n
    $tip|castleNathria|shriekwing|heroic|dps\n
    `;

    getHelp() {
        return this.help;
    }

    async searchEnounters(
        instanceName: string,
        bossName: string
    ): Promise<number> {
        let authData = await blizzardObject.refreshBlizzardToken();
        let accessToken = authData.token;
        let url = `https://us.api.blizzard.com/data/wow/search/journal-encounter?namespace=static-us&locale=en_US&instance.name.en_US=${instanceName}&orderby=id&_page=1&access_token=${accessToken}`;
        let response: any = await fetch(url).catch((error) =>
            console.log(`Unable to get encounter. Error: ${error}`)
        );
        let searchResults = await response.json();
        //loop over all search results
        for (let result of searchResults?.results) {
            let data = result?.data;
            let name = data.name.en_US;
            if (name == bossName) {
                return data.id;
            }
        }
        // raise an exception if the id is not found
        throw new Error('The encounter was not found');
    }

    async getEncounter(encounterId: number): Promise<any> {
        let data = await blizzardObject.refreshBlizzardToken();
        let accessToken = data.token;
        let url = `https://us.api.blizzard.com/data/wow/journal-encounter/${encounterId}?namespace=static-us&locale=en_US&access_token=${accessToken}`;
        let response: any = await fetch(url).catch((error) =>
            console.log(`Unable to get encounter. Error: ${error}`)
        );
        return response.json();
    }

    async parseEncounter(encounterId: number, embed: any): Promise<any> {
        const encounter = await this.getEncounter(encounterId);
        let embedFields: EmbedField[] = [];
        embed.setTitle(encounter.name);
        encounter?.sections.forEach((section: any) => {
            embedFields.push({
                name: section.title,
                value: section?.body_text || 'No Text'
            });
            if (section?.sections) {
                section.sections.forEach((innerSection: any) => {
                    embedFields.push({
                        name: innerSection.title,
                        value: innerSection?.body_text || 'No Text',
                        inline: true
                    });
                });
            }
        });
        embed.addFields(embedFields);
        return embed;
    }
}
