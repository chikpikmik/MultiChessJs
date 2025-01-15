class Game {
    constructor(room) {
        this.room = room
    }

    start() {
        this.room.isGameStarted = true
    }

    makeMove(move) {
        this.room.makeMove(move)
    }
}

module.exports = { Game }
