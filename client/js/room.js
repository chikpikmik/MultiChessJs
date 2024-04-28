
const socket = io('http://localhost:3000');

// const currentUserIp = currentUserIp
const boardId = roomEl.boardId
const roomId = roomEl.id
const isGameStarted = roomEl.isGameStarted
const sides = roomEl.sides
const creatorIp = roomEl.creatorIp

const displayedSides = document.getElementById('sidesList')
const sideTemplate = document.getElementById('firstSide').cloneNode(true)
document.getElementById('firstSide').remove()


const horizontalSides = document.getElementById('horizontalSides')

let currentUserIsPlayer = false
const currentUserIsCreator = currentUserIp === creatorIp
let thisIsInit = roomEl.sides.every(side => !side.userIp)

const startButtonCont = document.getElementById('start-button-container')
const readyButtonCont = document.getElementById('ready-button-container')

if(roomEl.sides.every(side => side.userReady) && currentUserIsCreator)
    startButtonCont.classList.remove('hidden')

if(roomEl.sides.find(side => side.userIp === currentUserIp)?.userReady)
    readyButtonCont.remove()

const sideName_connected = {}
const sideName_ready = {}

function setSideTemplate(template, sideName, kingColor, sideKey, connected=false, ready=false){
    const [kingEl, connectedEl, readyEl, linkEl, buttonEl] = template.children
    kingEl.setAttribute('fill', kingColor)
    kingEl.setAttribute('sideName', sideName)
    connectedEl.setAttribute('display', connected ? true : 'none')
    readyEl.setAttribute('display', ready ? true : 'none')

    const kingClone = kingEl.cloneNode(true)
    const connectedClone = connectedEl.cloneNode(true)
    const readyClone = readyEl.cloneNode(true)
    if(currentUserIsCreator && thisIsInit){
        kingClone.onclick = kingClick
        kingClone.setAttribute('style',"cursor: pointer;")
    }
    horizontalSides.appendChild(kingClone)
    horizontalSides.appendChild(connectedClone)
    horizontalSides.appendChild(readyClone)

    // куда то записать галочки что бы тображать их при room-changed
    sideName_connected[sideName] = [connectedEl, connectedClone]
    sideName_ready[sideName] = [readyEl, readyClone]

    linkEl.innerHTML = 'localhost:8080/room/' + roomId + '/' + sideKey
}

sides.forEach( ({sideName, color, key, userIp, userReady}) => {
    const currentSide = sideTemplate.cloneNode(true)
    setSideTemplate(currentSide, sideName, color, key, userIp && !userReady, userIp && userReady)
    displayedSides.appendChild(currentSide)
    currentUserIsPlayer = currentUserIsPlayer || userIp===currentUserIp
});

//horizontalSides.classList.remove('hidden')
//displayedSides.classList.remove('hidden')

if(currentUserIsPlayer){
    readyButtonCont.classList.remove('hidden')
}

if(true || currentUserIsCreator){
    horizontalSides.classList.remove('hidden')
}else{
    // отображение horizontalSides без выбора для всех остальных
}

socket.emit('join-room', roomId)

function kingClick(evt){
    const choosedKing = evt.target.closest('svg')
    horizontalSides.classList.add('hidden')
    // убрать choosedKing из displayed

    displayedSides.classList.remove('hidden')

    // записать выбор создателя комнаты в roomEl
    roomEl.sides.find(side => side.sideName===choosedKing.getAttribute('sideName') ).userIp = creatorIp

    // сообщить на сервер что произршел выбор
    socket.emit('room-changed-toserver', roomEl)

    readyButtonCont.classList.remove('hidden')
}

socket.on("room-changed-toclient", newRoomEl =>{
    roomEl=newRoomEl
    // отобразить галочки
    console.log(newRoomEl)
    roomEl.sides.forEach(({sideName, color, key, userIp, userReady})=>{
        const connectedEls = sideName_connected[sideName]
        const readyEls = sideName_ready[sideName]
        if(userIp && !userReady){
            connectedEls.forEach(el=>el.setAttribute('display',true))
        }
        else if(userReady){
            connectedEls.forEach(el=>el.setAttribute('display','none'))
            readyEls.forEach(el=>el.setAttribute('display',true))
        }
    })
})

function startGame(){

    roomEl.isGameStarted = true
    socket.emit("game-started-toserver", roomId)

}
socket.on("game-started-toclient", () =>{
    location.reload()
})

function readyClick(){

    roomEl.sides.forEach(side => {
        if(side.userIp===currentUserIp)
            side.userReady = true
    })
    socket.emit('room-changed-toserver', roomEl)

    readyButtonCont.remove()
    startButtonCont.classList.remove('hidden')
}


