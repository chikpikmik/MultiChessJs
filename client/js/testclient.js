
const socket = io('http://localhost:3000');

socket.on("connect", ()=>{
    console.log('You connected with id: ' + socket.id)
})

socket.emit("custom-event", 123, 'abc', {a:12, b:'345'})
