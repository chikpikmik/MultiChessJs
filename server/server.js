
const HOST = '35.160.120.126' || '44.233.151.27' || '34.211.200.85'
const PORT = 3000
const CLIENT_PORT = 8080

const { Room } = require('./Room')
const { Game } = require('./Game')

const path = require('path')
const fs = require('fs').promises
const express = require('express')
const app = express()

const io = require('socket.io')(app.listen(CLIENT_PORT), {
    cors: {
        origin: [`https://${HOST}:${PORT}`],
        methods: ['GET', 'POST'],
    },
})

app.use(express.static(path.join(__dirname, '../client')))
app.use(express.static(path.join(__dirname, '../boards')))
app.use(express.urlencoded({ extended: false }))
app.set('view engine', 'ejs')

let rooms = {}

async function getSvgContent(svgRelativePath) {
    const svgPath = path.join(__dirname, svgRelativePath)

    try {
        const svgContent = await fs.readFile(svgPath, 'utf8')
        return svgContent
    } catch (err) {
        console.error('Error reading SVG file:', err)
        throw new Error('Failed to load SVG')
    }
}

app.get('/', (req, res) => {
    //res.sendFile(path.join(__dirname, '../client/html/menu.html'))
    res.render(path.join(__dirname, '../client/html/menu'))
})

app.get('/room/:roomId', async (req, res) => {
    const roomId = req.params.roomId
    const roomEl = rooms[roomId]
    if (!roomEl) {
        res.redirect('/')
        return
    }

    // так как нет ключа, то это наблюдатель
    // если игра начата, то перекинуть в index.html
    // иначе в room
    // удалить ключи в roomEl перед передачей

    if (!roomEl.isGameStarted)
        res.render(path.join(__dirname, '../client/html/room'), {
            roomEl: roomEl,
            userSideIndex: null,
            isItCreator: false,
            boardId: roomEl.boardId,
        })
    else {
        //res.render(path.join(__dirname, `../client/html/${roomEl.boardId}`), {roomEl:roomEl, userSideIndex:null, config: config})
        res.render(path.join(__dirname, '../client/html/board'), {
            svg: await getSvgContent(`../boards/${roomEl.boardId}.svg`),
            roomEl: roomEl,
            userSideIndex: null,
        })
    }
})

app.get('/room/:roomId/:sideKey', async (req, res) => {
    const { roomId, sideKey } = req.params
    const roomEl = rooms[roomId]
    const userSideIndex = roomEl.getSideIndex(sideKey)
    const isItCreatorKey = roomEl.creatorKey === sideKey

    if (!roomEl) {
        res.redirect('/')
        return
    }

    // ключ не подходит
    if (!isItCreatorKey && userSideIndex === -1) {
        res.redirect('/room/' + roomId)
        return
    }

    if (userSideIndex !== -1) roomEl.sides[userSideIndex].userConnected = true

    if (roomEl.isGameStarted) {
        if (isItCreatorKey) res.redirect('/room/' + roomId)
        else {
            //res.render(path.join(__dirname, `../client/html/${roomEl.boardId}`), {roomEl:roomEl, userSideIndex:userSideIndex, config: config})
            res.render(path.join(__dirname, '../client/html/board'), {
                svg: await getSvgContent(`../boards/${roomEl.boardId}.svg`),
                roomEl: roomEl,
                userSideIndex: userSideIndex,
            })
        }
    } else
        res.render(path.join(__dirname, '../client/html/room'), {
            roomEl: roomEl,
            userSideIndex: userSideIndex,
            isItCreator: isItCreatorKey,
            boardId: roomEl.boardId,
        })
})

io.on('connection', (socket) => {
    socket.on('new-room', (boardId, start, end) => {
        const newRoomId = Object.keys(rooms).length + 1
        const room = new Room(newRoomId, boardId, start, end)
        rooms[room.id] = room
        socket.emit('room-added', room.id, room.creatorKey)
    })

    socket.on('join-room', (roomId) => {
        const room = rooms[roomId]
        if (room) {
            socket.join(roomId)
            io.to(roomId).emit('room-changed-toclient', room)
        }
    })

    socket.on('room-changed-toserver', (newRoom) => {
        const roomId = newRoom.id
        const room = rooms[roomId]
        if (room) {
            room.update(newRoom)
            io.to(roomId).emit('room-changed-toclient', room)
        }
    })

    socket.on('make-move-toserver', (roomId, move) => {
        // проверить ход на валидность
        // в rooms[roomId] установить новое значние для figureId
        // удалить фигуру соответствующую fieldId если она есть

        //const {figureId, fieldId} = move
        const room = rooms[roomId]
        if (room) {
            room.makeMove(move)
            io.to(roomId).emit('make-move-toclient', move)
        }
    })
})

app.listen(PORT, () => console.log('server started'))
