import fs from 'fs';
import path from 'path';

async function verifyDub() {
    const secretsPath = path.join(process.cwd(), 'ADD_THESE_SECRETS.txt');
    if (!fs.existsSync(secretsPath)) {
        console.error('ADD_THESE_SECRETS.txt not found');
        process.exit(1);
    }

    const content = fs.readFileSync(secretsPath, 'utf-8');
    const match = content.match(/DUB_API_KEY=(.+)/);

    if (!match || !match[1]) {
        console.error('DUB_API_KEY not found in ADD_THESE_SECRETS.txt');
        process.exit(1);
    }

    const apiKey = match[1].trim();
    console.log(`Testing API Key: ${apiKey.slice(0, 8)}...`);

    try {
        console.log('Testing User Scope (/api/workspaces)...');
        let response = await fetch('https://api.dub.co/api/workspaces', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Connected (User Key)');
            console.log(`Workspaces found: ${data.length}`);
            return;
        }

        console.log('User Scope failed, testing Project Scope (/api/links)...');
        // Fallback to Project Scope
        response = await fetch('https://api.dub.co/api/links?limit=1', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Connected (Project Key)');
            // data might be an array of links
            console.log(`Links accessible: ${Array.isArray(data) ? data.length : 'Yes'}`);
        } else {
            const err = await response.text();
            console.error('❌ Failed to connect:', response.status, err);
        }

    } catch (error) {
        console.error('❌ Network error:', error);
    }
}

verifyDub();
