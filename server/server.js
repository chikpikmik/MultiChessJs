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

const io = require('socket.io')(3000, {
    cors:{
        origin: ['http://localhost:8080'],
    },
})

io.on('connection', socket=>{
    console.log(socket.id)
    socket.on('custom-event', (a,b,c)=>{
        console.log(a,b,c)
    })
})


const express = require('express')
const app = express()
app.use(express.static(path.join(__dirname, '../client')))
app.use(express.static(path.join(__dirname, '../boards')))
app.use(express.urlencoded({extended: false}))



/*
app.get('/newRoom/:boardId', (req, res) => {
    // Это пример URL, на который вы хотите перенаправить пользователя. Замените его соответствующим URL-адресом.
    const ipAddress = req.ip;
    console.log(req.params.boardId, ipAddress)
    res.sendFile(path.join(__dirname, '../client/html/room.html'))
  });*/

app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, '../client/html/menu.html'))
})
app.get('/testclient', (req, res)=>{
    res.sendFile(path.join(__dirname, '../client/html/room.html'))
})/*
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
app.listen(PORT, ()=>{
    console.log('server started')
})


