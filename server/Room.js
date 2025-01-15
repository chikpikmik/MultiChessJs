class Room {
    constructor(id, boardId, start, end) {
        this.id = id
        this.boardId = boardId
        this.isGameStarted = false
        this.sides = []
        this.currentSideIndex = 0
        this.currentPos = {}
        this.creatorKey = Math.random().toString(36)

        const sides = ['white', 'black', 'red', 'green', 'blue', 'yellow']
        const colors = ['white', '#5C5957', '#CC1236', '#71B739', '#3299CC', '#FFCC03']
        for (let i = start; i < end; i++) {
            this.sides.push({
                sideName: sides[i],
                color: colors[i],
                key: Math.random().toString(36),
                userConnected: false,
                userReady: false,
            })
        }
    }

    getSideIndex(key) {
        return this.sides.findIndex((side) => side.key === key) // -1
    }

    update(newRoom) {
        this.isGameStarted = newRoom.isGameStarted
        this.sides = newRoom.sides

        // важно при первой инициализации
        this.currentPos = newRoom.currentPos

        if (!newRoom.isGameStarted && newRoom.sides.every((side) => side.userReady)) {
            this.isGameStarted = true
        }
    }

    makeMove({ figureId, fieldId }) {
        const attackedFigure = Object.keys(this.currentPos).find(
            (id) => this.currentPos[id] === fieldId,
        )
        if (attackedFigure) this.currentPos[attackedFigure] = undefined
        this.currentPos[figureId] = fieldId
        this.currentSideIndex = (this.currentSideIndex + 1) % this.sides.length
    }
}

module.exports = { Room }
