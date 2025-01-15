import { svg, isMobile, currentUserSideName } from './app.js'

export function resizeBoard() {
    const screenWidth = screen.availWidth
    const screenHeight = screen.availHeight

    const startSvgRect = svg.getBoundingClientRect()
    const svgHeightToWidth = startSvgRect.height / startSvgRect.width
    const minScreenLength = Math.min(screenHeight, screenWidth)

    // minScreenLength = sqrt(svg.style.height^2 + svg.style.width^2)
    // rect1.height/rect1.width = svg.style.height/svg.style.width
    // svg.style.height, svg.style.width - ?

    svg.style.width = Math.sqrt(Math.pow(minScreenLength, 2) / (1 + Math.pow(svgHeightToWidth, 2)))
    svg.style.height = svg.style.width * svgHeightToWidth

    /*
    if(screenHeight<=screenWidth){
        svg.style.height = screenHeight * (isMobile? 1:0.85)
    }
    else{
        svg.style.width = screenWidth * (isMobile? 1:0.85)
    }*/

    const windowWidth = document.documentElement.clientWidth
    const windowHeight = document.documentElement.clientHeight

    const pageWidth = document.documentElement.scrollWidth
    const pageHeight = document.documentElement.scrollHeight

    const scrollToVerticalCenter = (pageHeight - windowHeight) / 2
    const scrollToHorizontalCenter = (pageWidth - windowWidth) / 2

    if (isMobile) {
        //перемещение доски вниз до середины
        const rect = svg.getBoundingClientRect()
        document.body.style.padding = `${(windowHeight - rect.height) / 2}px ${(windowWidth - rect.width) / 2}px 0px`
        return
    }

    window.scrollTo({
        top: scrollToVerticalCenter,
        left: scrollToHorizontalCenter,
        behavior: 'smooth',
    })
}

export function rotateBoard(deg) {
    for (const figure of document.getElementById('figures').children) {
        var transforms = figure.transform.baseVal
        var transform = svg.createSVGTransform()
        if (transforms.length === 0) {
            const tr = svg.createSVGTransform()
            tr.setTranslate(0, 0)
            transforms.insertItemBefore(tr, 0)

            transforms.appendItem(transform)
        } else if (transforms.length === 1) {
            transforms.appendItem(transform)
        } else {
            transform = transforms.getItem(1)
        }

        transform.setRotate(-deg, 0, 0)
    }

    var transforms = svg.transform.baseVal
    var transform = svg.createSVGTransform()
    if (transforms.length === 0) {
        transforms.appendItem(transform)
    } else {
        transform = transforms.getItem(0)
    }

    transform.setRotate(deg, 0, 0)
}

export function makeAllFiguresSelectable() {
    for (const figure of document.getElementById('figures').children) {
        figure.classList.remove('draggable')
        figure.classList.add('selectable')
    }
}
export function makeCurrentUserSideFiguresDraggable() {
    for (const figure of document.getElementById('figures').children) {
        if (figure.getAttribute('side') === currentUserSideName) {
            figure.classList.remove('selectable')
            figure.classList.add('draggable')
        }
    }
}

export function linePoints(elem) {
    return elem
        .getAttribute('points')
        .split(' ')
        .map((point) => {
            let coords = point.split(',')
            if (coords.length == 2) {
                return { x: Number(coords[0]), y: Number(coords[1]) }
            } else {
                return null
            }
        })
        .filter((el) => el != null)
}

export function isPointInsidePath(path, point_) {
    const point = svg.createSVGPoint()
    point.x = Number(point_.x)
    point.y = Number(point_.y)
    if (point.x && point.y) {
        return path.isPointInFill(point) //|| path.isPointInStroke(point);
    } else {
        throw new Error('point must have number convertable coordinates')
    }
}

export function pagePositionToSvgPosition(pageX, pageY) {
    //var CTM = svg.getScreenCTM();
    var svgPoint = svg.createSVGPoint()
    svgPoint.x = pageX
    svgPoint.y = pageY

    /*return {
      x: (pageX - CTM.e) / CTM.a,
      y: (pageY - CTM.f) / CTM.d
    };*/
    return svgPoint.matrixTransform(svg.getScreenCTM().inverse())
}

export function findFieldByPoint(point) {
    for (const field of document.getElementById('fields').children) {
        if (isPointInsidePath(field, point)) {
            return field
        }
    }
}

export function findMinDistanceFromPointToPath({ x, y }, pathElement) {
    const pathLength = pathElement.getTotalLength()
    let minDistance = Infinity
    for (let i = 0; i <= pathLength; i += pathLength / 15) {
        const pointOnPath = pathElement.getPointAtLength(i)
        const distance = Math.sqrt(Math.pow(x - pointOnPath.x, 2) + Math.pow(y - pointOnPath.y, 2))
        minDistance = Math.min(minDistance, distance)
    }

    return minDistance
}

export function findFigureByFieldId(fieldId) {
    for (const figure of document.getElementById('figures').children) {
        if (figure.getAttribute('currentFieldId') === fieldId) {
            return document.getElementById(figure.id)
        }
    }
}
