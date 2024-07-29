
const socket = io('http://localhost:3000');

//let roomEl = <%- JSON.stringify(roomEl) %>
//const currentUserSideIndex = parseInt('<%= userSideIndex %>')
//const isItCreator = '<%= isItCreator %>' === 'true' ? true : false

const sides = roomEl.sides
const currentUserSide = currentUserSideIndex!=null ? sides[currentUserSideIndex]: null

const boardId       = roomEl.boardId
const roomId        = roomEl.id
const isGameStarted = roomEl.isGameStarted

const displayedSides = document.getElementById('sidesList')
const sideTemplate = document.getElementById('firstSide').cloneNode(true)
document.getElementById('firstSide').remove()


const horizontalSides = document.getElementById('horizontalSides')

const startButtonCont = document.getElementById('start-button-container')
const readyButtonCont = document.getElementById('ready-button-container')

if(currentUserSide && currentUserSide.userReady || !currentUserSide)
    readyButtonCont.remove()

const sideName_connected = {}
const sideName_ready = {}

function setSideTemplate(template, sideName, kingColor, sideKey, connected=false, ready=false){
    const [kingEl, connectedEl, readyEl, linkEl, buttonEl] = template.children
    kingEl.setAttribute('fill', kingColor)
    kingEl.setAttribute('sideName', sideName)
    connectedEl.setAttribute('display', connected ? true : 'none')
    readyEl.setAttribute('display', ready ? true : 'none')

    const kingClone      = kingEl.cloneNode(true)
    const connectedClone = connectedEl.cloneNode(true)
    const readyClone     = readyEl.cloneNode(true)

    horizontalSides.appendChild(kingClone)
    horizontalSides.appendChild(connectedClone)
    horizontalSides.appendChild(readyClone)

    // куда то записать галочки что бы тображать их при room-changed
    sideName_connected[sideName] = [connectedEl, connectedClone]
    sideName_ready[sideName] = [readyEl, readyClone]

    linkEl.innerHTML = 'localhost:8080/room/' + roomId + '/' + sideKey
}

sides.forEach( ({sideName, color, key, userConnected, userReady}) => {
    const currentSide = sideTemplate.cloneNode(true)
    setSideTemplate(currentSide, sideName, color, key, userConnected && !userReady, userConnected && userReady)
    displayedSides.appendChild(currentSide)
});

//horizontalSides.classList.remove('hidden')
//displayedSides.classList.remove('hidden')

if(currentUserSide)
    readyButtonCont.classList.remove('hidden')


if(isItCreator)
    displayedSides.classList.remove('hidden')
else{
    // отображение horizontalSides без выбора для всех остальных
    horizontalSides.classList.remove('hidden')
}

for (const side of document.getElementById('sidesList').children){
    const textToCopy = side.querySelector('span').innerText
    const button = side.querySelector('button')
    button.setAttribute('textToCopy', textToCopy)
    button.addEventListener('click', (evt)=>{
        const button = evt.target.closest('button')
        const textToCopy = button.getAttribute('textToCopy')

        navigator.clipboard.writeText(textToCopy).then(()=>{alert('Скопировано')}).catch(err=>{console.error('Ошибка копирования: ', err)})

    })
}

socket.emit('join-room', roomId)

socket.on("room-changed-toclient", newRoomEl =>{
    roomEl=newRoomEl
    // отобразить галочки
    roomEl.sides.forEach(({sideName, color, key, userConnected, userReady})=>{
        const connectedEls = sideName_connected[sideName]
        const readyEls = sideName_ready[sideName]
        if(userConnected && !userReady){
            connectedEls.forEach(el=>el.setAttribute('display',true))
        }
        else if(userReady){
            connectedEls.forEach(el=>el.setAttribute('display','none'))
            readyEls.forEach(el=>el.setAttribute('display',true))
        }
    })

    if(newRoomEl.isGameStarted){
        location.reload()
    }

})

function readyClick(){

    roomEl.sides.forEach(side => {
        if(side.sideName===currentUserSide.sideName)
            side.userReady = true
    })
    socket.emit('room-changed-toserver', roomEl)

    readyButtonCont.remove()
}


