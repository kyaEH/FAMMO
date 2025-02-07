//handle chat message with socket.io
/*<div class="text" id="gameChat">
      <input type="text" id="chatInput" placeholder="Type here..."/>
      <button id="chatButton">Send</button>
      <div id="chatMessages"></div>
    </div>
*/

const socket = io();

const username = document.getElementById('username').innerText;
//get the chat input and button
const chatInput = document.getElementById('chatInput');
const chatButton = document.getElementById('chatButton');
const chatMessages = document.getElementById('chatMessages');

//when the chat button is clicked
chatButton.addEventListener('click', () => {
    //emit the chat message to the server
    socket.emit('chat message', chatInput.value);
    //clear the chat input
    chatInput.value = '';
});

//when a chat message is received
socket.on('chat message', (message) => {
    //create a new div element
    const div = document.createElement('div');
    //set the inner text of the div to the message
    div.innerText = message;
    //append the div to the chat messages
    chatMessages.appendChild(div);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

//when the enter key is pressed
chatInput.addEventListener('keypress', (e) => {
    //if the key is enter
    if (e.key === 'Enter') {
        //emit the chat message to the server
        socket.emit('chat message', chatInput.value);
        //clear the chat input
        chatInput.value = '';
    }
});
classData = [];
//button id reqCreateChar then send a post request to /createcharacter
document.getElementById('reqCreateChar').addEventListener('click', () => {
    //hide gameChat
    document.getElementById('gameChat').style.display = 'none';
    //change display none to block on createChar
    document.getElementById('createChar').style.display = 'block';
    document.getElementById('characterSelection').style.display = 'none';
    //request post /getallclasses in post request
    fetch('/getallclasses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        //send the username
        body: JSON.stringify({ username: username })
    })
        .then(res => res.json())
        .then(data => {
            //for each data
            var defaultStats = data[0].stats;
            document.getElementById('strength').value = defaultStats.strength.value;
            document.getElementById('constitution').value = defaultStats.constitution.value;
            document.getElementById('dexterity').value = defaultStats.dexterity.value;
            document.getElementById('intelligence').value = defaultStats.intelligence.value;
            document.getElementById('focus').value = defaultStats.focus.value;
            document.getElementById('agility').value = defaultStats.agility.value;
            data.forEach((element) => {
                classData.push(element);
                //create a new option element
                const option = document.createElement('option');
                //set the value of the option to the class name
                option.value = element.classname;
                //set the inner text of the option to the class name
                option.innerText = element.classname;
                //append the option to the class select
                document.getElementById('classSelection').appendChild(option);
                
            });
            /* 
            var imgFolder = "../img/classtoken/" + selectedClass.classname.toLowerCase() + "/"
            var img1 = imgFolder + selectedClass.classname.toLowerCase() + "_female1.webp";
            var img2 = imgFolder + selectedClass.classname.toLowerCase() + "_female2.webp";
            var img3 = imgFolder + selectedClass.classname.toLowerCase() + "_male1.webp";
            var img4 = imgFolder + selectedClass.classname.toLowerCase() + "_male2.webp";
            document.getElementById('charImg1').style backgroundImage = img1;
            document.getElementById('charImg2').style backgroundImage = img2;
            document.getElementById('charImg3').style backgroundImage = img3;
            document.getElementById('charImg4').style backgroundImage = img4;
            */
            var defaultClass = data[0].classname;
            var imgFolder = "../img/classtoken/" + defaultClass.toLowerCase() + "/"
            var img1 = imgFolder + defaultClass.toLowerCase() + "_female1.webp";
            var img2 = imgFolder + defaultClass.toLowerCase() + "_female2.webp";
            var img3 = imgFolder + defaultClass.toLowerCase() + "_male1.webp";
            var img4 = imgFolder + defaultClass.toLowerCase() + "_male2.webp";
            //<div id="charImg1" class="image" style="" width="50"></div>
            document.getElementById('charImg1').style.backgroundImage = "url(" + img1 + ")";
            document.getElementById('charImg2').style.backgroundImage = "url(" + img2 + ")";
            document.getElementById('charImg3').style.backgroundImage = "url(" + img3 + ")";
            document.getElementById('charImg4').style.backgroundImage = "url(" + img4 + ")";
            document.getElementById('remaining').value = 0;
            
        
        }
        
        );
        //set all stats to the first class by default
        
        


        

});
//when the class select changes
document.getElementById('classSelection').addEventListener('change', () => {
    //get the selected class
    const selectedClass = classData.find((element) => element.classname === document.getElementById('classSelection').value);
    //Change each stats value to the selected class stats value
    console.log(selectedClass);
    document.getElementById('strength').value = selectedClass.stats.strength.value;
    document.getElementById('constitution').value = selectedClass.stats.constitution.value;
    document.getElementById('dexterity').value = selectedClass.stats.dexterity.value;
    document.getElementById('intelligence').value = selectedClass.stats.intelligence.value;
    document.getElementById('focus').value = selectedClass.stats.focus.value;
    document.getElementById('agility').value = selectedClass.stats.agility.value;
    var imgFolder = "../img/classtoken/" + selectedClass.classname.toLowerCase() + "/";
    var img1 = imgFolder + selectedClass.classname.toLowerCase() + "_female1.webp";
    var img2 = imgFolder + selectedClass.classname.toLowerCase() + "_female2.webp";
    var img3 = imgFolder + selectedClass.classname.toLowerCase() + "_male1.webp";
    var img4 = imgFolder + selectedClass.classname.toLowerCase() + "_male2.webp";
    document.getElementById('charImg1').style.backgroundImage = "url(" + img1 + ")";
    document.getElementById('charImg2').style.backgroundImage = "url(" + img2 + ")";
    document.getElementById('charImg3').style.backgroundImage = "url(" + img3 + ")";
    document.getElementById('charImg4').style.backgroundImage = "url(" + img4 + ")";



}
);

//if there is an error parameter, show the error to the <p id="charErrorMsg"></p>
const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('errormsg');
if (error) {
    document.getElementById('charErrorMsg').innerText = error;
    document.getElementById('charErrorMsg').style.display = 'block';

}

function deleteChar(charactername){
    //prompt are you sure?
    if (!confirm("Are you sure you want to delete this character?")) {
        return;
    }
    //post request to /deletecharacter
    fetch('/deletecharacter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        //send the username and character name
        body: JSON.stringify({ charactername: charactername })
    })
        .then(res => res.json())
        .then(data => {
            //if the character is deleted, reload the page
            if (data) {
                location.reload();
            }
        });
}

//for each input type number and if div createChar display is block, add an event listener on all input number. The max stat is 10, calculate all stats and show the remaining points in id remaining


document.querySelectorAll('input[type="number"]').forEach((element) => {
    
    element.addEventListener('input', () => {
        var total = 0;
        document.querySelectorAll('input[type="number"]').forEach((element) => {
            total += Number(element.value);
        });
        document.getElementById('remaining').value = 10 - total;
    });

});

document.getElementById('chatToggle').addEventListener('click', (e) => {
    e.preventDefault();
    if (document.getElementById('gameChat').style.display === 'none') {
        document.getElementById('gameChat').style.display = 'flex';
    } else {
        document.getElementById('gameChat').style.display = 'none';
    }
});