import { CommandClass } from './CommandClass';

interface MythicTrapLink {
    raidName: string;
    bossName: string;
    difficulty: string;
    role: string;
}

export class MythicTrap implements CommandClass {
    help: string = `Sends a link to mythictrap.com for the specific boss.\n
    Parameters:\n
        Raid Name: The name of the raid\n
        Boss Name: The name of the boss\n
        Difficulty: The difficulty of the encounter\n
        Role: The role to display tips for\n
    Example:\n
    $tip|castleNathria|shriekwing|heroic|dps\n
    `;
    domain: string = 'https://mythictrap.com/';

    getHelp() {
        return this.help;
    }

    getLink({ raidName, bossName, difficulty, role }: MythicTrapLink): string {
        return `${this.domain}/${raidName}/${bossName}/${difficulty}/${role}`;
    }
}
