require('dotenv').config();
// node fetch needed to make fetch requests
import fetch from 'node-fetch';
//btoa is used for auth
import btoa from 'btoa';

const blizzard_client_id = process.env.BLIZZARD_CLIENT_ID;
const blizzard_client_secret = process.env.BLIZZARD_CLIENT_SECRET;
const redirectUri = 'https://localhost:8080';
const scopes = ['wow.profile'];

export class Blizzard {
    /**
     * refresh the blizzard token using the client id and secret
     */
    async refreshBlizzardToken() {
        // build headers
        const basicAuth = btoa(
            `${blizzard_client_id}:${blizzard_client_secret}`
        );
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
        // TODO: create requestOptions Interface
        const requestOptions: any = {
            method: 'POST',
            body: params,
            headers
        };

        const url = 'https://us.battle.net/oauth/token';
        let response: any;
        try {
            response = await fetch(url, requestOptions).catch((error) =>
                console.log(`Unable to refresh token. Error: ${error}`)
            );
        } catch (error: any) {
            console.log(error);
        }

        let data = await response.json();
        return {
            token: data.access_token,
            expiration: data.expires_in
        };
    }
}
