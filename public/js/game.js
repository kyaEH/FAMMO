//handle chat message with socket.io
/*<div class="text" id="gameChat">
      <input type="text" id="chatInput" placeholder="Type here..."/>
      <button id="chatButton">Send</button>
      <div id="chatMessages"></div>
    </div>
*/
document.getElementById('music').volume = 0.2;
let musicPlayed = false;

const playMusic = () => {
    if (!musicPlayed) {
        document.getElementById('music').play();
        musicPlayed = true;
    }
};

document.addEventListener('keydown', playMusic);
document.body.addEventListener('click', playMusic);

const socket = io();
const username = document.getElementById('username').innerText;
const chatInput = document.getElementById('chatInput');
const chatButton = document.getElementById('chatButton');
const chatMessages = document.getElementById('chatMessages');

const sendMessage = () => {
    socket.emit('chat message', chatInput.value);
    chatInput.value = '';
};

chatButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

socket.on('chat message', (message) => {
    const div = document.createElement('div');
    div.innerText = message;
    chatMessages.appendChild(div);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

let classData = [];

document.getElementById('reqCreateChar').addEventListener('click', () => {
    document.getElementById('gameChat').style.display = 'none';
    document.getElementById('createChar').style.display = 'block';
    document.getElementById('characterSelection').style.display = 'none';

    fetch('/getallclasses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
        classData = data;
        const defaultStats = data[0].stats;
        document.getElementById('strength').value = defaultStats.strength.value;
        document.getElementById('constitution').value = defaultStats.constitution.value;
        document.getElementById('dexterity').value = defaultStats.dexterity.value;
        document.getElementById('intelligence').value = defaultStats.intelligence.value;
        document.getElementById('focus').value = defaultStats.focus.value;
        document.getElementById('agility').value = defaultStats.agility.value;

        data.forEach(element => {
            const option = document.createElement('option');
            option.value = element.classname;
            option.innerText = element.classname;
            document.getElementById('classSelection').appendChild(option);
        });

        const defaultClass = data[0].classname;
        const imgFolder = `../img/classtoken/${defaultClass.toLowerCase()}/`;
        document.getElementById('charImg1').style.backgroundImage = `url(${imgFolder}${defaultClass.toLowerCase()}_female1.webp)`;
        document.getElementById('charImg2').style.backgroundImage = `url(${imgFolder}${defaultClass.toLowerCase()}_female2.webp)`;
        document.getElementById('charImg3').style.backgroundImage = `url(${imgFolder}${defaultClass.toLowerCase()}_male1.webp)`;
        document.getElementById('charImg4').style.backgroundImage = `url(${imgFolder}${defaultClass.toLowerCase()}_male2.webp)`;
    });
});

document.getElementById('classSelection').addEventListener('change', () => {
    const selectedClass = classData.find(element => element.classname === document.getElementById('classSelection').value);
    document.getElementById('strength').value = selectedClass.stats.strength.value;
    document.getElementById('constitution').value = selectedClass.stats.constitution.value;
    document.getElementById('dexterity').value = selectedClass.stats.dexterity.value;
    document.getElementById('intelligence').value = selectedClass.stats.intelligence.value;
    document.getElementById('focus').value = selectedClass.stats.focus.value;
    document.getElementById('agility').value = selectedClass.stats.agility.value;

    const imgFolder = `../img/classtoken/${selectedClass.classname.toLowerCase()}/`;
    document.getElementById('charImg1').style.backgroundImage = `url(${imgFolder}${selectedClass.classname.toLowerCase()}_female1.webp)`;
    document.getElementById('charImg2').style.backgroundImage = `url(${imgFolder}${selectedClass.classname.toLowerCase()}_female2.webp)`;
    document.getElementById('charImg3').style.backgroundImage = `url(${imgFolder}${selectedClass.classname.toLowerCase()}_male1.webp)`;
    document.getElementById('charImg4').style.backgroundImage = `url(${imgFolder}${selectedClass.classname.toLowerCase()}_male2.webp)`;
});

const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('errormsg');
if (error) {
    document.getElementById('charErrorMsg').innerText = error;
    document.getElementById('charErrorMsg').style.display = 'block';
}

function deleteChar(charactername) {
    if (!confirm("Are you sure you want to delete this character?")) return;

    fetch('/deletecharacter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charactername })
    })
    .then(res => res.json())
    .then(data => {
        if (data) location.reload();
    });
}

document.querySelectorAll('input[type="number"]').forEach(element => {
    element.addEventListener('input', () => {
        let total = 0;
        document.querySelectorAll('input[type="number"]').forEach(el => {
            total += Number(el.value);
        });
        document.getElementById('remaining').value = 10 - total;
    });
});

document.getElementById('chatToggle').addEventListener('click', (e) => {
    e.preventDefault();
    const gameChat = document.getElementById('gameChat');
    gameChat.style.display = gameChat.style.display === 'none' ? 'flex' : 'none';
});

function playAs(charactername) {
    fetch('/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charactername })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('characters').style.display = 'none';
            document.getElementById('characterSelection').innerHTML = '<h1>Game is loading...</h1>';
            window.location.href = '/play';
        } else {
            console.log(data.message);
        }
    });
}

