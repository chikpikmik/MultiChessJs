// jsdom создает набор связанных объектов/записей бд через обработку объектов внутри html
// если клиент далает ход, программа проверяет валидность также как на, обновляет данные если все хорошо
// на клиенте сделавшем ход запускается makeAllFiguresSelectable()
// на клиенте ожидающем ход отображается ход и запускается makeClientSideFiguresDraggable()

//const http = require('http')
//const https = require('https')
//const fs = require('fs')

const PORT = 8080
const HOST = 'localhost' || '127.0.0.1'

const path = require('path');

const jsdom = require('jsdom')
const { JSDOM } = jsdom


const rooms = {
    123456:{
        id:123456,
        isGameStarted:false,
        boardId:'board1',
        creatorIp:'123:345:56:6',
        sides: [
            {sideName:'white', color: 'white', key:'asdfhn8237yneuhfl', userIp:null, userReady:false},
            {sideName:'black', color: '#5C5957', key:'sdimfho7dsfhsdfw', userIp:null, userReady:false}
        ],
        currentSideIndex:0,
        currentPos:{
            'figure1':'field2',
            'figure2':'field12',
            'figure3':'field5'
        }
    }
}


const io = require('socket.io')(3000, {
    cors:{
        origin: ['http://localhost:8080'],
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
    const userIp = '123:345:56:6' || req.ip
    
    const roomEl = rooms[roomId]

    if( false && roomEl.creatorIp!=userIp)
        roomEl.sides = roomEl.sides.map(side=>{
            side.key=undefined
            return side
        })

    // если userIp привязан к комнате то это участник
    // иначе это наблюдатель
    // если игра начата, то перекинуть в index.html
    // иначе в room
    //res.end('room: ' + roomId + ' user: ' + userIp)
    if(!roomEl.isGameStarted)
        res.render(path.join(__dirname, '../client/html/room'), {roomEl:roomEl, userIp:userIp})
    else
        res.render(path.join(__dirname, '../client/html/index'), {roomEl:roomEl, userIp:userIp})
})
app.get('/room/:roomId/:sideKey', (req, res)=>{
    const roomId = req.params.roomId
    const sideKey = req.params.sideKey
    const userIp = '123:345:56:6' || req.ip

    const userSide = rooms[roomId]?.sides.find(side => side.key === sideKey)
    if(userSide){
        userSide.userIp = userIp
        res.redirect('/room/' + roomId)
    }
    else{
        res.end('not found')
    }
})

io.on('connection', socket=>{

    //console.log(socket.id)
    socket.on('join-room', roomId=>{
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
        io.to(roomId).emit('room-changed-toclient', newRoomEl)
    })

    socket.on('game-started-toserver', roomId=>{

        rooms[roomId].isGameStarted=true
        io.to(roomId).emit('game-started-toclient')

    })
})


app.listen(PORT, ()=>{
    console.log('server started')
})


