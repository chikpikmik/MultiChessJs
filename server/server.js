// jsdom создает набор связанных объектов/записей бд через обработку объектов внутри html
// если клиент далает ход, программа проверяет валидность также как на, обновляет данные если все хорошо
// на клиенте сделавшем ход запускается makeAllFiguresSelectable()
// на клиенте ожидающем ход отображается ход и запускается makeClientSideFiguresDraggable()

//const http = require('http')
//const https = require('https')
//const fs = require('fs')

const PORT = 8080
const HOST = '192.168.238.129' || 'localhost' || '127.0.0.1'

const path = require('path');

//const jsdom = require('jsdom');
//const { JSDOM } = jsdom;

const rooms = {}


const io = require('socket.io')(3000, {
    cors:{
        origin: [`http://${HOST}:8080`],
    },
})


const express = require('express')
const app = express()
app.use(express.static(path.join(__dirname, '../client')))
app.use(express.static(path.join(__dirname, '../boards')))
app.use(express.urlencoded({extended: false}))
app.set('view engine', 'ejs');


/*
app.get('/newRoom/:boardId', (req, res) => {
    // Это пример URL, на который вы хотите перенаправить пользователя. Замените его соответствующим URL-адресом.
    const ipAddress = req.ip;
    console.log(req.params.boardId, ipAddress)
    res.sendFile(path.join(__dirname, '../client/html/room.html'))
  });


app.get('/testclient', (req, res)=>{
    res.sendFile(path.join(__dirname, '../client/html/room.html'))
})

app.post('/check-user', (req, res)=>{
    let username = req.body.username
    console.log(username)
    if(username=='')
        return res.redirect('/')
    if(username.length<100){
        JSDOM.fromFile("../client/http/index.html", {}).then( dom => {
            const document = dom.window.document;
            // Получите элемент по его идентификатору
            const element = document?.getElementById(username);
            //console.log(element.getAttribute('type'))
            const result = element?.getAttribute('type')
            if(result)
                res.end(result)
            else
                res.end('nothing')
          });
    }
    else
        return res.redirect('/user/'+username+'/1')
})

app.get('/user/:username/:userid', (req, res)=>{
    res.send(`this is ${req.params.username}'s page`)
})
*/

app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, '../client/html/menu.html'))
})

app.get('/room/:roomId', (req, res)=>{
    const roomId = req.params.roomId
    
    const roomEl = rooms[roomId]

    // так как нет ключа, то это наблюдатель
    // если игра начата, то перекинуть в index.html
    // иначе в room
    // удалить ключи в roomEl перед передачей
    if(!roomEl.isGameStarted)
        res.render(path.join(__dirname, '../client/html/room'), {roomEl:roomEl, userSideIndex:null, isItCreator:false, boardId:roomEl.boardId})
    else
        res.render(path.join(__dirname, `../client/html/${roomEl.boardId}`), {roomEl:roomEl, userSideIndex:null})
})

app.get('/room/:roomId/:sideKey', (req, res)=>{
    const roomId = req.params.roomId
    const sideKey = req.params.sideKey

    const roomEl = rooms[roomId]
    const isItCreatorKey = roomEl.creatorKey === sideKey
    const userSideIndex = roomEl.sides.findIndex(side => side.key === sideKey)

    if(!roomEl){
        res.redirect('/')
        return
    }

    // ключ не подходит
    if(!isItCreatorKey && userSideIndex===-1){
        res.redirect('/room/' + roomId)
        return
    }

    if(userSideIndex!==-1)
        roomEl.sides[userSideIndex].userConnected = true

    
    if(roomEl.isGameStarted){
        if(isItCreatorKey)
            res.redirect('/room/' + roomId)
        else
            res.render(path.join(__dirname, `../client/html/${roomEl.boardId}`), {roomEl:roomEl, userSideIndex:userSideIndex})
    }
    else
        res.render(path.join(__dirname, '../client/html/room'), {roomEl:roomEl, userSideIndex:userSideIndex, isItCreator:isItCreatorKey, boardId:roomEl.boardId})
        

    
})

io.on('connection', socket=>{

    //console.log(socket.id)
    socket.on('new-room', boardId=>{

        let start=0, end=0

        if (boardId==='board1'){
            start = 0; end = 2
        }
        else if(boardId==='board2'){
            start = 2; end = 7
        }

        const newRoomEl = {
            id: Object.keys(rooms).length + 1,
            creatorKey: Math.random().toString(36),
            isGameStarted: false,
            boardId: boardId,
            sides: [
                {sideName:'white', color: 'white',   key: Math.random().toString(36), userConnected:false, userReady:false},
                {sideName:'black', color: '#5C5957', key: Math.random().toString(36), userConnected:false, userReady:false},
                {sideName:'red', color: '#CC1236', key: Math.random().toString(36), userConnected:false, userReady:false},
                {sideName:'green', color: '#71B739', key: Math.random().toString(36), userConnected:false, userReady:false},
                {sideName:'blue', color: '#3299CC',   key: Math.random().toString(36), userConnected:false, userReady:false},
                {sideName:'yellow', color: '#FFCC03', key: Math.random().toString(36), userConnected:false, userReady:false}
            ].slice(start,end),
            currentSideIndex:0,
            currentPos:{
                //'figure1':'field2'
            }
        }

        rooms[newRoomEl.id]=newRoomEl

        socket.emit('room-added', newRoomEl.id, newRoomEl.creatorKey)
    })

    socket.on('join-room', (roomId)=>{
        // проверяем что такая комната есть
        // если пользователь заходит впервые, то остальные еще не знают что он участник
        // а иначе ничего не изменится

        socket.join(roomId)
        // io.to
        io.to(roomId).emit('room-changed-toclient', rooms[roomId])
    })

    socket.on('room-changed-toserver', newRoomEl=>{
        // проверяем что такая комната есть
        // проверяем что внесенные изменения доступны пользователю с этим ip
        const roomId = newRoomEl.id
        rooms[roomId]=newRoomEl

        if(!newRoomEl.isGameStarted && newRoomEl.sides.every(side=>side.userReady)){
            rooms[roomId].isGameStarted=true
        }

        io.to(roomId).emit('room-changed-toclient', newRoomEl)
    })

    socket.on('make-move-toserver', (roomId, figureId, coord, fieldId, deleteTimeout)=>{

        // ясное дело проверить ход на валидность
        // в rooms[roomId] установить новое значние для figureId
        // удалить фигуру соответствующую fieldId если она есть
        const roomEl = rooms[roomId]

        const attackedFigure = Object.keys(roomEl.currentPos).find(key => roomEl.currentPos[key]===fieldId )
        if(attackedFigure)
            roomEl.currentPos[attackedFigure]=undefined

        roomEl.currentPos[figureId]=fieldId
        roomEl.currentSideIndex = (roomEl.currentSideIndex+1) % roomEl.sides.length

        io.to(roomId).emit('make-move-toclient', figureId, coord, fieldId, deleteTimeout)
    })
})


app.listen(PORT, ()=>{
    console.log('server started')
})


