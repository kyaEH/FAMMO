// this file will download the blocklist from the internet, and dispose a checkIp function that will check if an IP is in the blocklist.
// GIT REPO: https://github.com/ShadowWhisperer/IPs.git
// the repo contains multiples folders, and multiples files from the folders
//file lists 
/*
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Extreme
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/High
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Low
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/BruteForce/Medium
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Malware/Hackers
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Malware/Hosting
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Ads
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/DNS
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Mine
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Scanners
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Trackers
https://raw.githubusercontent.com/ShadowWhisperer/IPs/refs/heads/master/Other/Tunnel
*/
const axios = require('axios');
const { check } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const unlink = promisify(fs.unlink);
//dotenv
require('dotenv').config();
const virustotalAPIKey = process.env.FAMMO_VIRUSTOTAL_API_KEY;
const abuseipdbApiKey = process.env.FAMMO_ABUSEIPDB_API_KEY


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
    const blocklist = path.join(__dirname, '/blocklist/blocklist.txt');
    const bannedIp = path.join(__dirname, '/blocklist/banned.txt');
    //axios get all the files, and write them to the blocklist. But also append the banned.txt to the blocklist
    let data = '';
    for (const url of urlList) {
        const response = await axios.get(url);
        data += response.data;
    }
    //write the data to the blocklist
    await writeFile(blocklist, data);
    //append the banned.txt to the blocklist
    const banned = await readFile(bannedIp, 'utf8');
    await fs.appendFileSync(blocklist, banned);

    return blocklist;


}

function checkIpReputation(ip) {
    if(!ip) return;
    const url = new URL(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`);
    const headers = {
        'x-apikey': virustotalAPIKey
    };
    response = axios.get(url, { headers }).catch((error) => {});

    //log error code
    //if response is 200, check the reputation
    if (response.status == 200 ) {
        console.log(response.attributes);
        if (response.attributes.reputation > 0) {
            
            return true;
        }
        
    }
    console.log("IP is clean by virustotal");
    //check the abuseipdb
    /* curl -G https://api.abuseipdb.com/api/v2/check \
  --data-urlencode "ipAddress=118.25.6.39" \
  -d maxAgeInDays=90 \
  -d verbose \
  -H "Key: YOUR_OWN_API_KEY" \
  -H "Accept: application/json"*/
    const abuseUrl = 'https://api.abuseipdb.com/api/v2/check';
    const abuseHeaders = {
        'Key': abuseipdbApiKey,
        'Accept': 'application/json'
    };
    //check the abuseipdb
    const abuseResponse = axios.get(abuseUrl, {
        params: {
            ipAddress: ip,
            maxAgeInDays: 90,
            verbose: true
        },
        headers: abuseHeaders
    });
    //if code 200, check the confidence score
    if (abuseResponse.status == 200) {
        console.log(abuseResponse.data.data.abuseConfidenceScore);
        if (abuseResponse.data.data.abuseConfidenceScore < 99) {
            return true;
        }
    }

    console.log("IP is clean by AbuseIPDB");

    return false;
}

function checkIp(ip) {
    //check if ip is in the blocklist
    const blocklist = path.join(__dirname, '/blocklist/blocklist.txt');
    const data = fs.readFileSync(blocklist, 'utf8');
    const ips = data.split('\n');
    if (ips.includes(ip)) {
        return true;
    }
    return false;
}

function addRewiedIp(ip){
    //add the IP to reviewlist, and if the IP is 10 times in the list, add it to the banned list
    console.log("Adding IP to reviewlist");
    const review = path.join(__dirname, '/blocklist/reviewlist.txt');
    const allow = path.join(__dirname, '/blocklist/allowlist.txt');
    //check if the ip is in the allowlist
    const allowData = fs.readFileSync(allow, 'utf8');
    const allowIps = allowData.split('\n');
    if (allowIps.includes(ip)) {
        console.log("IP is in allowlist");
        return;
    }
    
    if(checkIpReputation(ip)){
        console.log("IP has bad reputation list");
        return;
    }
        

    //push the ip to the reviewlist
    fs.appendFileSync(review, ip + '\n');
    console.log("IP added to reviewlist");
    //read the reviewlist
    const data = fs.readFileSync(review, 'utf8');
    const ips = data.split('\n');
    //count the ip
    const count = ips.filter((i) => i === ip).length;
    console.log("IP is listed " + count + " times in reviewlist");
    //if the ip is 10 times in the list, add it to the banned list
    if (count === 10) {
        console.log("IP DETECTED 10 TIMES IN REVIEWLIST: " + ip);
        const banned = path.join(__dirname, '/blocklist/banned.txt');
        fs.appendFileSync(banned, ip + '\n');
        
    }

}

function getWordList(){
    const wordlistfile = path.join(__dirname, '/blocklist/wordlist.txt');
    const wordlist = fs.readFileSync(wordlistfile, 'utf8').split('\r').join('').split('\n');
    return wordlist;
}
module.exports = { downloadBlocklist, checkIp, addRewiedIp, getWordList};