//let roomEl = <%- JSON.stringify(roomEl) %>
//const currentUserSideIndex = parseInt('<%= userSideIndex %>')

import { RuleLinePoint, getRightMoves } from './rules.js'
import {
    resizeBoard,
    rotateBoard,
    makeAllFiguresSelectable,
    makeCurrentUserSideFiguresDraggable,
    linePoints,
    isPointInsidePath,
    pagePositionToSvgPosition,
    findFieldByPoint,
    findFigureByFieldId,
} from './utils.js'

export const svg = document.getElementById('mysvg')
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

const currentUserSide = roomEl.sides[currentUserSideIndex]
export const currentUserSideName = currentUserSide?.sideName

const roomId = roomEl.id
let currentPos = roomEl.currentPos // [{'figure1':'field23'},{'figure2':'field3'}, ...]
const isItInit = Object.keys(currentPos).length === 0

const circlesLayer = document.getElementById('circlesLayer')
const redCirclesLayer = document.getElementById('redCirclesLayer')
const highlightedFields = document.getElementById('highlightedFields')
//const ruleLines         = Array.from(document.getElementById('ruleLines').children)
const rotateSlider = document.getElementById('rotate-slider')

document.addEventListener('DOMContentLoaded', resizeBoard)
rotateSlider.addEventListener('input', () => {
    rotateBoard(rotateSlider.value)
})

const socket = io(
    `${window.location.protocol}//${window.location.hostname}:${window.location.port}`,
)

socket.emit('join-room', roomId)
svg.addEventListener('load', onSvgInit)
if (currentUserSide)
    document.getElementById('rotate-slider').style.background = currentUserSide.color

socket.on('make-move-toclient', ({ figureId, fieldId }) => {
    const attackedFig = findFigureByFieldId(fieldId)
    const figure = document.getElementById(figureId)
    const oldField = document.getElementById(figure.getAttribute('currentFieldId'))
    const oldSideIndex = roomEl.currentSideIndex
    const newField = document.getElementById(fieldId)

    roomEl.currentSideIndex = (oldSideIndex + 1) % roomEl.sides.length

    circlesLayer.innerHTML = ''
    redCirclesLayer.innerHTML = ''
    highlightedFields.innerHTML = ''

    if (attackedFig) {
        currentPos[attackedFig.id] = undefined
        attackedFig.remove()
    }

    const initialOffset = {
        x: Number(figure.getAttribute('initialOffsetX')),
        y: Number(figure.getAttribute('initialOffsetY')),
    }

    var transforms = figure.transform.baseVal
    // Ensure the first transform is a translate transform
    if (
        transforms.length === 0 ||
        transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
    ) {
        // Create an transform that translates by (0, 0)
        var translate = svg.createSVGTransform()
        translate.setTranslate(0, 0)
        // Add the translation to the front of the transforms list
        figure.transform.baseVal.insertItemBefore(translate, 0)
    }
    // Get initial translation amount
    const transform = figure.transform.baseVal.getItem(0)

    figure.style = 'transition: transform 0.4s ease; pointer-events: none;'
    setTimeout(() => {
        figure.style = ''
        circlesLayer.innerHTML = ''
        redCirclesLayer.innerHTML = ''
        //highlightedFields.innerHTML=''
    }, 500)

    // оставлять выделение клетки из которой ходил противник и в которую пришел
    if (oldSideIndex !== currentUserSideIndex) {
        // другой пользователь сделал ход
        const clonedField1 = oldField.cloneNode(true)
        const clonedField2 = newField.cloneNode(true)
        clonedField1.style.fill = '#B9CA43' // цвет выделения клетки
        clonedField2.style.fill = '#B9CA43'
        //clonedField.setAttribute("selectedElementId", 'none')
        highlightedFields.appendChild(clonedField1)
        highlightedFields.appendChild(clonedField2)
    }

    const fieldCoord = RuleLinePoint.getByField(newField).coord
    transform.setTranslate(fieldCoord.x - initialOffset.x, fieldCoord.y - initialOffset.y)
    figure.setAttribute('currentFieldId', fieldId)

    //transform.setTranslate(coord.x - initialOffset.x, coord.y - initialOffset.y)
    //figure.setAttribute('currentFieldId', fieldId)

    if (currentUserSideIndex === roomEl.currentSideIndex) makeCurrentUserSideFiguresDraggable()
    else makeAllFiguresSelectable()

    for (const signal of document.getElementById('signals').children) {
        if (signal.getAttribute('side') === roomEl.sides[roomEl.currentSideIndex].sideName) {
            signal.setAttribute('display', true)
        } else {
            signal.setAttribute('display', 'none')
        }
    }
})

function onSvgInit(evt) {
    if (!isMobile) {
        svg.addEventListener('mousedown', startDrag)
        svg.addEventListener('mousemove', drag)
        svg.addEventListener('mouseup', endDrag)
        svg.addEventListener('mouseleave', backToInitialPosition)
    } else {
        svg.addEventListener('touchstart', startDrag)
        svg.addEventListener('touchmove', drag)
        svg.addEventListener('touchend', endDrag)
        svg.addEventListener('touchleave', backToInitialPosition)
        svg.addEventListener('touchcancel', backToInitialPosition)
    }

    // создание элементов RuleLinePoint
    for (const line of document.getElementById('ruleLines').children) {
        let linePoints_ = linePoints(line)
        for (let i = 0; i < linePoints_.length; i++) {
            new RuleLinePoint(linePoints_[i], line, i)
        }
    }

    // проход по всем фигурам и определение начальных координат их центров внутри svg
    // а так же добавление связей фигур и с полями
    const figures = document.getElementById('figures')
    const figuresList = Array.from(figures.children)
    figuresList.reverse()
    for (const figure of figuresList) {
        const currentFigureFieldId = currentPos[figure.id]

        if (!currentFigureFieldId && !isItInit) {
            figure.remove()
            continue
        }

        const rectangle = figure.getBoundingClientRect()
        const figurePageCenter = {
            x: rectangle.x + rectangle.width / 2,
            y: rectangle.y + rectangle.height / 2,
        }
        const figureSvgCenter = pagePositionToSvgPosition(figurePageCenter.x, figurePageCenter.y)
        figure.setAttribute('initialOffsetX', figureSvgCenter.x)
        figure.setAttribute('initialOffsetY', figureSvgCenter.y)

        if (!isItInit) {
            var transforms = figure.transform.baseVal
            // Ensure the first transform is a translate transform
            if (
                transforms.length === 0 ||
                transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
            ) {
                // Create an transform that translates by (0, 0)
                var translate = svg.createSVGTransform()
                translate.setTranslate(0, 0)
                // Add the translation to the front of the transforms list
                figure.transform.baseVal.insertItemBefore(translate, 0)
            }
            // Get initial translation amount
            const transform = transforms.getItem(0)
            const fieldCoord = RuleLinePoint.getByField(
                document.getElementById(currentFigureFieldId),
            ).coord

            transform.setTranslate(
                fieldCoord.x - figureSvgCenter.x,
                fieldCoord.y - figureSvgCenter.y,
            )
            figure.setAttribute('currentFieldId', currentFigureFieldId)
        } else {
            const fieldId = findFieldByPoint(figureSvgCenter).id
            roomEl.currentPos[figure.id] = fieldId
            figure.setAttribute('currentFieldId', fieldId)
        }
    }

    if (isItInit) socket.emit('room-changed-toserver', roomEl)

    figures.setAttribute('display', true)

    //console.log(currentUserSideIndex, roomEl.currentSideIndex)

    if (currentUserSideIndex === roomEl.currentSideIndex) makeCurrentUserSideFiguresDraggable()
    else makeAllFiguresSelectable()

    for (const signal of document.getElementById('signals').children) {
        if (signal.getAttribute('side') === roomEl.sides[roomEl.currentSideIndex].sideName) {
            signal.setAttribute('display', true)
        } else {
            signal.setAttribute('display', 'none')
        }
    }

    let selectedElement, offset, transform, dragged
    let initialPosition, initialField, lastElement

    function startDrag(evt) {
        let elements
        dragged = false

        if (evt.target.closest('.selectable')) {
            if (evt.touches) {
                elements = document.elementsFromPoint(
                    evt.changedTouches[0].clientX,
                    evt.changedTouches[0].clientY,
                )
            } else {
                elements = document.elementsFromPoint(evt.clientX, evt.clientY)
            }
            initialField = elements.find((el) => el?.parentElement?.id === 'fields') || null
            lastElement = evt.target.closest('.selectable')

            // в такой ситуации фигуру кушают, а не смотрят на ее ходы
            const highlightedFigureSelectedElementId = highlightedFields.childElementCount
                ? highlightedFields.firstChild.getAttribute('selectedElementId')
                : null
            const highlightedFigure = document?.getElementById(highlightedFigureSelectedElementId)
            const circles = Array.from(circlesLayer.children)
            if (
                highlightedFigure &&
                highlightedFigure.getAttribute('side') === currentUserSideName &&
                highlightedFigure.classList.contains('draggable') &&
                circles &&
                circles.some((o) =>
                    isPointInsidePath(initialField, {
                        x: o.getAttribute('cx'),
                        y: o.getAttribute('cy'),
                    }),
                )
            ) {
                // сделать ход highlightedFigure в поле initialField
                highlightedFigure.style = 'transition: transform 0.5s ease; pointer-events: none;'
                setTimeout(() => {
                    highlightedFigure.style = ''
                }, 500)
                lastElement.classList.remove('selectable')
                lastElement = highlightedFigure
                makeMove(RuleLinePoint.getByField(initialField), lastElement)
                return
            }
            circlesLayer.innerHTML = ''
            highlightedFields.innerHTML = ''

            const clonedField = initialField.cloneNode(true)
            clonedField.style.fill =
                lastElement.getAttribute('side') !== currentUserSideName ? '#B9CA43' : '#F5F682'
            clonedField.setAttribute('selectedElementId', lastElement.id)
            highlightedFields.appendChild(clonedField)

            if (redCirclesLayer.getAttribute('selectedElementId') != lastElement.id) {
                redCirclesLayer.innerHTML = ''
            }
        } else if (evt.target.closest('.draggable')) {
            circlesLayer.innerHTML = ''
            redCirclesLayer.innerHTML = ''
            let elements

            if (evt.touches) {
                elements = document.elementsFromPoint(
                    evt.changedTouches[0].clientX,
                    evt.changedTouches[0].clientY,
                )
            } else {
                elements = document.elementsFromPoint(evt.clientX, evt.clientY)
            }
            initialField = elements.find((el) => el?.parentElement?.id === 'fields') || null

            selectedElement = evt.target.closest('.draggable')
            lastElement = evt.target.closest('.draggable')

            selectedElement.parentElement.appendChild(selectedElement) // поднять выше других фигур

            highlightedFields.innerHTML = ''

            const clonedField = initialField.cloneNode(true)
            clonedField.style.fill = '#F5F682' // цвет выделения клетки
            clonedField.setAttribute('selectedElementId', selectedElement.id)
            highlightedFields.appendChild(clonedField)

            if (evt.touches) {
                evt = evt.touches[0]
            }
            offset = pagePositionToSvgPosition(evt.clientX, evt.clientY)
            // Get all the transforms currently on this element
            var transforms = selectedElement.transform.baseVal
            // Ensure the first transform is a translate transform
            if (
                transforms.length === 0 ||
                transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
            ) {
                // Create an transform that translates by (0, 0)
                var translate = svg.createSVGTransform()
                translate.setTranslate(0, 0)
                // Add the translation to the front of the transforms list
                selectedElement.transform.baseVal.insertItemBefore(translate, 0)
            }
            // Get initial translation amount
            transform = transforms.getItem(0)
            offset.x -= transform.matrix.e
            offset.y -= transform.matrix.f

            initialPosition = { x: transform.matrix.e, y: transform.matrix.f }
        }
    }
    function drag(evt) {
        dragged = true
        if (selectedElement) {
            evt.preventDefault()
            if (evt.touches) {
                evt = evt.touches[0]

                var svgBounds = svg.getBoundingClientRect()
                // Проверяем, выходит ли касание за пределы SVG
                if (
                    evt.clientX < svgBounds.left ||
                    evt.clientX > svgBounds.right ||
                    evt.clientY < svgBounds.top ||
                    evt.clientY > svgBounds.bottom
                ) {
                    backToInitialPosition()
                    return
                }
            }
            var coord = pagePositionToSvgPosition(evt.clientX, evt.clientY)
            transform.setTranslate(coord.x - offset.x, coord.y - offset.y)
        }
    }
    function endDrag(evt) {
        let elements
        if (evt.touches) {
            elements = document.elementsFromPoint(
                evt.changedTouches[0].clientX,
                evt.changedTouches[0].clientY,
            )
        } else {
            elements = document.elementsFromPoint(evt.clientX, evt.clientY)
        }

        const field = elements.find((el) => el?.parentElement?.id === 'fields') || null
        if (!field) {
            backToInitialPosition()
            return
        }

        // нажатие на клетку/кружок для перемещения
        else if (
            !evt.target.closest('.draggable') &&
            !evt.target.closest('.selectable') &&
            !dragged &&
            circlesLayer.childElementCount > 0
        ) {
            let point
            for (const circle of circlesLayer.children) {
                point = {
                    x: Number(circle.getAttribute('cx')),
                    y: Number(circle.getAttribute('cy')),
                }
                if (isPointInsidePath(field, point)) {
                    makeMove(RuleLinePoint.getByField(findFieldByPoint(point)), lastElement)
                    return
                }
            }
        }

        // возможность посмотреть ходы
        else if (evt.target.closest('.selectable')) {
            const rightMoves = getRightMoves(initialField)
            const selectedElementSide = lastElement.getAttribute('side')
            rightMoves.forEach((el) => {
                let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side')
                let coord = el.coord

                const fullRadius = el.fullRadius
                const bigCircleWidth = fullRadius * (1 - 57 / 69)
                const bigRadius = (fullRadius * 57) / 69
                const littleRadius = (fullRadius * 22) / 69

                const circleElement = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'circle',
                )
                circleElement.setAttribute('cx', coord.x)
                circleElement.setAttribute('cy', coord.y)
                circleElement.setAttribute(
                    'opacity',
                    selectedElementSide !== currentUserSideName ? '0.5' : '0.1',
                )
                circlesLayer.setAttribute('selectedElementId', lastElement.id)

                if (!attackedfigureSide) {
                    // поле без фигуры
                    circleElement.setAttribute('r', littleRadius)

                    circleElement.setAttribute(
                        'fill',
                        selectedElementSide !== currentUserSideName ? '#A8B4A2' : 'black',
                    )
                    redCirclesLayer.appendChild(circleElement)
                } else if (attackedfigureSide !== selectedElementSide) {
                    // фигура другого цвета

                    circleElement.setAttribute('r', bigRadius)

                    circleElement.setAttribute('fill', 'none')
                    circleElement.setAttribute('stroke-width', bigCircleWidth)
                    circleElement.setAttribute(
                        'stroke',
                        selectedElementSide !== currentUserSideName ? '#A8B4A2' : 'black',
                    )
                    redCirclesLayer.appendChild(circleElement)
                }
            })
            selectedElement = null
            return
        }

        // приземление фигуры или клик по фигуре
        else if (evt.target.closest('.draggable')) {
            const selectedElementSide = selectedElement?.getAttribute('side')
            if (!selectedElementSide) {
                return
            }

            const rightMoves = getRightMoves(initialField)

            // Просто клик
            if (!dragged) {
                rightMoves.forEach((el) => {
                    let coord = el.coord

                    const fullRadius = el.fullRadius
                    const bigCircleWidth = fullRadius * (1 - 57 / 69)
                    const bigRadius = (fullRadius * 57) / 69
                    const littleRadius = (fullRadius * 22) / 69

                    let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side')

                    const circleElement = document.createElementNS(
                        'http://www.w3.org/2000/svg',
                        'circle',
                    )
                    circleElement.setAttribute('cx', coord.x)
                    circleElement.setAttribute('cy', coord.y)
                    circleElement.setAttribute('opacity', '0.1')
                    circlesLayer.setAttribute('selectedElementId', selectedElement.id)

                    if (!attackedfigureSide) {
                        // поле без фигуры
                        circleElement.setAttribute('r', littleRadius)
                        circleElement.setAttribute('fill', 'black')
                        circlesLayer.appendChild(circleElement)
                    } else if (attackedfigureSide !== selectedElementSide) {
                        // фигура другого цвета
                        circleElement.setAttribute('r', bigRadius)
                        circleElement.setAttribute('fill', 'none')
                        circleElement.setAttribute('stroke-width', bigCircleWidth)
                        circleElement.setAttribute('stroke', 'black')
                        circlesLayer.appendChild(circleElement)
                    }
                })
                selectedElement = null
                return
            }

            const successMove = rightMoves.find((el) => el.field === field) || null
            // среди верных нет текущего
            if (!successMove) {
                backToInitialPosition()
                return
            }

            makeMove(successMove)
        }

        // пустой клик для сброса
        circlesLayer.innerHTML = ''
        redCirclesLayer.innerHTML = ''
        highlightedFields.innerHTML = ''
    }
    function backToInitialPosition() {
        if (selectedElement) {
            lastElement.style = 'transition: transform 0.2s ease; pointer-events: none;'
            setTimeout(() => {
                lastElement.style = ''
            }, 500)
            transform.setTranslate(initialPosition.x, initialPosition.y)
            selectedElement = null
            return
        }
    }
    function makeMove(successMove, figure = lastElement) {
        // TODO
        // тут где то проверять перешла ли пешка на endline
        // а вот тут передавать на сервер
        // а там уже проверить ход на победу
        const field = successMove.field
        const coord = successMove.coord

        if (field) {
            socket.emit('make-move-toserver', roomId, { figureId: figure.id, fieldId: field.id })
        } else {
            console.log('что')
        }
        selectedElement = null
        circlesLayer.innerHTML = ''
    }
}
