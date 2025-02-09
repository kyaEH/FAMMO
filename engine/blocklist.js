const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const unlink = promisify(fs.unlink);
require('dotenv').config();

const virustotalAPIKey = process.env.FAMMO_VIRUSTOTAL_API_KEY;
const abuseipdbApiKey = process.env.FAMMO_ABUSEIPDB_API_KEY;

const urlList = [
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Extreme',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/High',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Low',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Medium',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Malware/Hackers',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Malware/Hosting',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Ads',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/DNS',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Mine',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Scanners',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Trackers',
    'https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Tunnel'
];

async function downloadBlocklist() {
    const blocklistPath = path.join(__dirname, '/blocklist/blocklist.txt');
    const bannedIpPath = path.join(__dirname, '/blocklist/banned.txt');
    let data = '';

    for (const url of urlList) {
        const response = await axios.get(url);
        data += response.data;
    }

    await writeFile(blocklistPath, data);
    const banned = await readFile(bannedIpPath, 'utf8');
    await fs.appendFileSync(blocklistPath, banned);

    return blocklistPath;
}

async function checkIpReputation(ip) {
    if (!ip) return false;

    try {
        const vtResponse = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
            headers: { 'x-apikey': virustotalAPIKey }
        });

        if (vtResponse.status === 200 && vtResponse.data.data.attributes.reputation > 0) {
            return true;
        }
    } catch (error) {
        console.error('VirusTotal API error:', error);
    }

    try {
        const abuseResponse = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            params: { ipAddress: ip, maxAgeInDays: 90, verbose: true },
            headers: { 'Key': abuseipdbApiKey, 'Accept': 'application/json' }
        });

        if (abuseResponse.status === 200 && abuseResponse.data.data.abuseConfidenceScore >= 99) {
            return true;
        }
    } catch (error) {
        console.error('AbuseIPDB API error:', error);
    }

    return false;
}

function checkIp(ip) {
    const blocklistPath = path.join(__dirname, '/blocklist/blocklist.txt');
    const data = fs.readFileSync(blocklistPath, 'utf8');
    const ips = data.split('\n');
    return ips.includes(ip);
}

function addReviewedIp(ip) {
    const reviewPath = path.join(__dirname, '/blocklist/reviewlist.txt');
    const allowPath = path.join(__dirname, '/blocklist/allowlist.txt');

    const allowData = fs.readFileSync(allowPath, 'utf8');
    const allowIps = allowData.split('\n');
    if (allowIps.includes(ip)) return;

    checkIpReputation(ip).then(isBad => {
        if (isBad) return;

        fs.appendFileSync(reviewPath, ip + '\n');
        const reviewData = fs.readFileSync(reviewPath, 'utf8');
        const ips = reviewData.split('\n');
        const count = ips.filter(i => i === ip).length;

        if (count >= 10) {
            const bannedPath = path.join(__dirname, '/blocklist/banned.txt');
            fs.appendFileSync(bannedPath, ip + '\n');
        }
    });
}

function getWordList() {
    const wordlistPath = path.join(__dirname, '/blocklist/wordlist.txt');
    return fs.readFileSync(wordlistPath, 'utf8').split('\r').join('').split('\n');
}

module.exports = { downloadBlocklist, checkIp, addReviewedIp, getWordList };