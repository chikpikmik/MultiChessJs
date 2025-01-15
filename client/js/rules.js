import { findFigureByFieldId, findFieldByPoint, findMinDistanceFromPointToPath } from './utils.js'

export class RuleLinePoint {
    static allRuleLinesPoints = []

    constructor({ x, y }, ruleLine, position) {
        const field = findFieldByPoint({ x, y })
        if (
            field &&
            Number.isInteger(Number(position)) &&
            ruleLine?.parentElement?.id === 'ruleLines'
        ) {
            const sameFieldRuleLinePoint = RuleLinePoint.allRuleLinesPoints.find(
                (el) => el.field === field,
            )
            if (sameFieldRuleLinePoint) {
                // Одна точка - одно поле
                const oldCoord = sameFieldRuleLinePoint.coord
                // точки внутри одного поля могут быть не равны, истина посередине
                sameFieldRuleLinePoint.coord = {
                    x: (oldCoord.x + Number(x)) / 2,
                    y: (oldCoord.y + Number(y)) / 2,
                }
                sameFieldRuleLinePoint.ruleLines.push({
                    ruleLine: ruleLine,
                    position: Number(position),
                })
                return sameFieldRuleLinePoint
            }

            this.coord = { x: Number(x), y: Number(y) }
            this.fullRadius = findMinDistanceFromPointToPath(this.coord, field)
            this.field = field
            this.ruleLines = [{ ruleLine: ruleLine, position: Number(position) }]
            RuleLinePoint.allRuleLinesPoints.push(this)
        } else {
            throw new Error('not valid RuleLinePoint constructor arguments')
        }
    }

    static getByField(field) {
        return RuleLinePoint.allRuleLinesPoints.find((el) => el.field === field)
    }

    jumpFromCurrentInLineDirection(side, direction, jump) {
        const linesToGo = this.ruleLines.filter(
            (ruleLine_position) =>
                ruleLine_position.ruleLine.getAttribute('direction') === direction &&
                ruleLine_position.ruleLine.getAttribute('side') === side,
        )
        if (linesToGo) {
            return RuleLinePoint.allRuleLinesPoints.filter((el) =>
                el.ruleLines.some((ruleLine_position) =>
                    linesToGo.some(
                        (lineToGo) =>
                            ruleLine_position.ruleLine === lineToGo.ruleLine &&
                            ruleLine_position.position === lineToGo.position + jump,
                    ),
                ),
            )
        }
    }
    sumDirectionsJumps(side, ...args) {
        // в некоторых ситуациях порядок важен
        let direction, jump
        let result = [this]
        for (const arg of args) {
            direction = arg.direction
            jump = arg.jump

            if (direction != undefined && jump != undefined) {
                if (result) {
                    result = result
                        .map((res) => res.jumpFromCurrentInLineDirection(side, direction, jump))
                        .flat()
                } else {
                    return []
                }
            } else {
                throw new Error(
                    'sumDirectionsJumps must have arguments like: side, {direcrion, jump}, {direcrion, jump}, ...',
                )
            }
        }
        return result
    }

    nextInLineDirection(side, direction) {
        return this.jumpFromCurrentInLineDirection(side, direction, 1)
    }
    previousInLineDirection(side, direction) {
        return this.jumpFromCurrentInLineDirection(side, direction, -1)
    }

    /*
    getAllInLineDirection(side, direction){
        const lineToGo = this.ruleLines.find(
            ruleLine_position=>
                ruleLine_position.ruleLine.getAttribute('side')===side
                && ruleLine_position.ruleLine.getAttribute('direction')===direction
        )
        return RuleLinePoint.allRuleLinesPoints.filter(
            el=>el.ruleLines
                .some(
                    ruleLine_position=>ruleLine_position.ruleLine===lineToGo.ruleLine
                )
        )
    }
    */
    getLinesWithDirection(side, direction) {
        return this.ruleLines.filter(
            (el) =>
                el.ruleLine.getAttribute('side') === side &&
                el.ruleLine.getAttribute('direction') === direction,
        )
    }
}

export function getRightMoves(field) {
    const figure = findFigureByFieldId(field.id)
    const side = figure.getAttribute('side')
    const type = figure.getAttribute('type')
    const ruleLinePoint = RuleLinePoint.getByField(field)
    // TODO
    // проверить нет ли МАТА
    // проверить startline, secondline, endline правила если нужно
    let result = []
    let attackedfigSide
    // --------------------------------------------------------
    if (type === 'pawn') {
        // срубать впереди строящих пешка не в состоянии

        // брать следующие за каждой пустой из nextVerticals если это secondline

        const nextVerticals = ruleLinePoint.nextInLineDirection(side, 'vertical')
        const thisIsSecondLinePoint = ruleLinePoint
            .getLinesWithDirection(side, 'horizontal')
            .some((line) => line.ruleLine.classList.contains('secondline'))
        nextVerticals.forEach((nextVertical) => {
            let nextVerticalEmpty = !findFigureByFieldId(nextVertical.field.id)
            if (nextVerticalEmpty) {
                result.push(nextVertical)
                if (thisIsSecondLinePoint) {
                    // текущая линия вторая, можно прыгать если никто не мешает
                    //let plusTwo = ruleLinePoint.sumDirectionsJumps(side,{'direction':'vertical','jump':2})
                    let plusTwo = nextVertical.nextInLineDirection(side, 'vertical')
                    plusTwo.forEach((plusTwoPoint) => {
                        if (!findFigureByFieldId(plusTwoPoint.field.id)) {
                            result.push(plusTwoPoint)
                        }
                    })
                }
            }
        })

        for (const i of [1, -1]) {
            // проверка возможности срубить кого то
            let canAttack1 = ruleLinePoint.sumDirectionsJumps(
                side,
                { direction: 'vertical', jump: 1 },
                { direction: 'horizontal', jump: i },
            )
            let canAttack2 = ruleLinePoint.sumDirectionsJumps(
                side,
                { direction: 'horizontal', jump: i },
                { direction: 'vertical', jump: 1 },
            )

            // массив уникальных точек right+up, up+right, left+up, up+left. Обычно уникальных две
            const canAttack = [...new Set([...canAttack1, ...canAttack2])]

            canAttack.forEach((point) => {
                const attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                if (point && attackedfigSide && attackedfigSide !== side) {
                    result.push(point)
                }
            })
        }
    }
    // --------------------------------------------------------
    if (type === 'knight') {
        let knightMoves
        for (const i of [2, -2]) {
            for (const j of [1, -1]) {
                let knightMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'vertical', jump: i },
                    { direction: 'horizontal', jump: j },
                )
                let knightMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'horizontal', jump: j },
                    { direction: 'vertical', jump: i },
                )

                knightMoves = [...new Set([...knightMoves1, ...knightMoves2])]
                knightMoves.forEach((knightMove) => {
                    attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute(
                        'side',
                    )
                    if (knightMove && !(attackedfigSide && attackedfigSide === side)) {
                        result.push(knightMove)
                    }
                })

                // переворот
                knightMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'vertical', jump: j },
                    { direction: 'horizontal', jump: i },
                )
                knightMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'horizontal', jump: i },
                    { direction: 'vertical', jump: j },
                )

                knightMoves = [...new Set([...knightMoves1, ...knightMoves2])]
                knightMoves.forEach((knightMove) => {
                    attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute(
                        'side',
                    )
                    if (knightMove && !(attackedfigSide && attackedfigSide === side)) {
                        result.push(knightMove)
                    }
                })
            }
        }
    }
    // --------------------------------------------------------
    if (type === 'king') {
        let kingMoves
        for (const i of [1, -1, 0]) {
            for (const j of [1, -1, 0]) {
                // добавить проверки на нахождение хода под атакой
                if (i === 0 && j === 0) {
                    continue
                }
                let kingMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'vertical', jump: i },
                    { direction: 'horizontal', jump: j },
                )
                let kingMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    { direction: 'horizontal', jump: j },
                    { direction: 'vertical', jump: i },
                )
                kingMoves = [...new Set([...kingMoves1, ...kingMoves2])]
                kingMoves.forEach((kingMove) => {
                    attackedfigSide = findFigureByFieldId(kingMove?.field?.id)?.getAttribute('side')
                    if (kingMove && !(attackedfigSide && attackedfigSide === side)) {
                        result.push(kingMove)
                    }
                })
            }
        }
    }
    // --------------------------------------------------------
    if (['bishop', 'queen'].includes(type)) {
        // sometimes: right + up != up + right
        let d11 = [ruleLinePoint],
            d21 = [ruleLinePoint],
            d31 = [ruleLinePoint],
            d41 = [ruleLinePoint]
        let d12 = [ruleLinePoint],
            d22 = [ruleLinePoint],
            d32 = [ruleLinePoint],
            d42 = [ruleLinePoint]

        while (
            d11.length +
                d21.length +
                d31.length +
                d41.length +
                d12.length +
                d22.length +
                d32.length +
                d42.length !==
            0
        ) {
            d11 = d11
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'horizontal', jump: 1 },
                            { direction: 'vertical', jump: 1 },
                        ),
                )
                .flat()
            d12 = d12
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'vertical', jump: 1 },
                            { direction: 'horizontal', jump: 1 },
                        ),
                )
                .flat()

            d21 = d21
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'horizontal', jump: 1 },
                            { direction: 'vertical', jump: -1 },
                        ),
                )
                .flat()
            d22 = d22
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'vertical', jump: -1 },
                            { direction: 'horizontal', jump: 1 },
                        ),
                )
                .flat()

            d31 = d31
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'horizontal', jump: -1 },
                            { direction: 'vertical', jump: 1 },
                        ),
                )
                .flat()
            d32 = d32
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'vertical', jump: 1 },
                            { direction: 'horizontal', jump: -1 },
                        ),
                )
                .flat()

            d41 = d41
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'horizontal', jump: -1 },
                            { direction: 'vertical', jump: -1 },
                        ),
                )
                .flat()
            d42 = d42
                .map(
                    (point) =>
                        point &&
                        point.sumDirectionsJumps(
                            side,
                            { direction: 'vertical', jump: -1 },
                            { direction: 'horizontal', jump: -1 },
                        ),
                )
                .flat()

            for (const d of [d11, d21, d31, d41, d12, d22, d32, d42]) {
                d.forEach((point) => {
                    attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                    if (
                        point &&
                        !(attackedfigSide && attackedfigSide === side) &&
                        !result.includes(point)
                    ) {
                        result.push(point)
                    }
                })
            }
            d11 = d11
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d21 = d21
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d31 = d31
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d41 = d41
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d12 = d12
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d22 = d22
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d32 = d32
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
            d42 = d42
                .map((point) => !findFigureByFieldId(point?.field?.id) && point)
                .filter(Boolean)
        }
    }
    // --------------------------------------------------------
    if (['rook', 'queen'].includes(type)) {
        let h1 = [ruleLinePoint],
            h2 = [ruleLinePoint],
            v1 = [ruleLinePoint],
            v2 = [ruleLinePoint]

        while (h1.length + h2.length + v1.length + v2.length !== 0) {
            h1 = h1.map((point) => point && point.nextInLineDirection(side, 'horizontal')).flat()
            h2 = h2
                .map((point) => point && point.previousInLineDirection(side, 'horizontal'))
                .flat()
            v1 = v1.map((point) => point && point.nextInLineDirection(side, 'vertical')).flat()
            v2 = v2.map((point) => point && point.previousInLineDirection(side, 'vertical')).flat()
            for (const hv of [h1, h2, v1, v2]) {
                hv.forEach((point) => {
                    attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                    if (point && !(attackedfigSide && attackedfigSide === side)) {
                        result.push(point)
                    }
                })
            }
            h1 = h1.map((point) => !findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            h2 = h2.map((point) => !findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            v1 = v1.map((point) => !findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            v2 = v2.map((point) => !findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
        }
    }
    // --------------------------------------------------------

    return result
}
