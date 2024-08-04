//let roomEl = <%- JSON.stringify(roomEl) %>
//const currentUserSideIndex = '<%= userSideIndex %>'

const socket = io('http://192.168.0.102:3000')
//const socket = io()

const roomId = roomEl.id
const currentUserSide = roomEl.sides[currentUserSideIndex]
const currentUserSideName = currentUserSide?.sideName

if (currentUserSide){
    document.getElementById('rotate-slider').style.background = currentUserSide.color
}

let currentPos = roomEl.currentPos // [{'figure1':'field23'},{'figure2':'field3'}, ...]

const isItInit = Object.keys(currentPos).length===0

socket.emit('join-room', roomId)


socket.on('make-move-toclient', (figureId, coord, fieldId) =>{

    const attackedFig  = findFigureByFieldId(fieldId)
    const figure       = document.getElementById(figureId)
    const oldField     = document.getElementById(figure.getAttribute('currentFieldId'))
    const oldSideIndex = roomEl.currentSideIndex
    const newField     = document.getElementById(fieldId)
    
    roomEl.currentSideIndex = (oldSideIndex+1) % roomEl.sides.length

    circlesLayer.innerHTML     =''
    redCirclesLayer.innerHTML  =''
    highlightedFields.innerHTML=''
    
    if(attackedFig){
        currentPos[attackedFig.id]=undefined
        attackedFig.remove()
    }
    
    const initialOffset = {x: Number(figure.getAttribute('initialOffsetX')), y: Number(figure.getAttribute('initialOffsetY'))}
    
    var transforms = figure.transform.baseVal
    // Ensure the first transform is a translate transform
    if (transforms.length === 0 ||
        transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
        // Create an transform that translates by (0, 0)
        var translate = svg.createSVGTransform()
        translate.setTranslate(0, 0)
        // Add the translation to the front of the transforms list
        figure.transform.baseVal.insertItemBefore(translate, 0)
    }
    // Get initial translation amount
    const transform = figure.transform.baseVal.getItem(0)

    figure.style='transition: transform 0.4s ease; pointer-events: none;'
    setTimeout(()=>{
        figure.style='' 
        circlesLayer.innerHTML=''
        redCirclesLayer.innerHTML=''
        //highlightedFields.innerHTML=''
    }, 500)

    // оставлять выделение клетки из которой ходил противник и в которую пришел
    if (oldSideIndex!==currentUserSideIndex){
        // другой пользователь сделал ход
        const clonedField1 = oldField.cloneNode(true)
        const clonedField2 = newField.cloneNode(true)
        clonedField1.style.fill = "#B9CA43" // цвет выделения клетки
        clonedField2.style.fill = "#B9CA43"
        //clonedField.setAttribute("selectedElementId", 'none')
        highlightedFields.appendChild(clonedField1)
        highlightedFields.appendChild(clonedField2)
    }

    const fieldCoord = RuleLinePoint.getByField(newField).coord
    transform.setTranslate(fieldCoord.x - initialOffset.x, fieldCoord.y - initialOffset.y)
    figure.setAttribute('currentFieldId', fieldId)
    
    //transform.setTranslate(coord.x - initialOffset.x, coord.y - initialOffset.y)
    //figure.setAttribute('currentFieldId', fieldId)

    
    if(currentUserSideIndex===roomEl.currentSideIndex)
        makeCurrentUserSideFiguresDraggable()
    else
        makeAllFiguresSelectable()

    for (const signal of document.getElementById('signals').children){
        if (signal.getAttribute('side')===roomEl.sides[roomEl.currentSideIndex].sideName){
            signal.setAttribute('display',true)
        }
        else{
            signal.setAttribute('display', 'none')
        }
    }

})


const svg = document.getElementById('mysvg')

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

function resizeBoard(){

    const screenWidth = screen.availWidth;
    const screenHeight = screen.availHeight;

    const startSvgRect = svg.getBoundingClientRect()
    const svgHeightToWidth = startSvgRect.height/startSvgRect.width
    const minScreenLength = Math.min(screenHeight, screenWidth)

    // minScreenLength = sqrt(svg.style.height^2 + svg.style.width^2)
    // rect1.height/rect1.width = svg.style.height/svg.style.width
    // svg.style.height, svg.style.width - ?

    svg.style.width  = Math.sqrt( Math.pow(minScreenLength, 2)/(1+Math.pow(svgHeightToWidth, 2)) )
    svg.style.height = svg.style.width * svgHeightToWidth

    /*
    if(screenHeight<=screenWidth){
        svg.style.height = screenHeight * (isMobile? 1:0.85)
    }
    else{
        svg.style.width = screenWidth * (isMobile? 1:0.85)
    }*/

    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;

    const pageWidth =  document.documentElement.scrollWidth;
    const pageHeight = document.documentElement.scrollHeight;

    const scrollToVerticalCenter = (pageHeight - windowHeight) / 2;
    const scrollToHorizontalCenter = (pageWidth - windowWidth) / 2;

    if(isMobile){
        //перемещение доски вниз до середины
        const rect = svg.getBoundingClientRect()
        document.body.style.padding=`${(windowHeight-rect.height)/2}px ${(windowWidth-rect.width)/2}px 0px`;
        return
    }

    window.scrollTo({
        top: scrollToVerticalCenter,
        left: scrollToHorizontalCenter,
        behavior: 'smooth'
    })

        
}

document.addEventListener("DOMContentLoaded", resizeBoard);
//window.addEventListener("orientationchange", resizeBoard);

const circlesLayer      = document.getElementById('circlesLayer');
const redCirclesLayer   = document.getElementById('redCirclesLayer');
const highlightedFields = document.getElementById('highlightedFields');
const ruleLines         = Array.from(document.getElementById('ruleLines').children);

function makeAllFiguresSelectable(){
    for (const figure of document.getElementById('figures').children){
        figure.classList.remove('draggable')
        figure.classList.add('selectable')
    }
}
function makeCurrentUserSideFiguresDraggable(){
    for (const figure of document.getElementById('figures').children){
        if(figure.getAttribute('side')===currentUserSideName){
            figure.classList.remove('selectable')
            figure.classList.add('draggable')
        }
    }
}


function linePoints(elem){
    return elem.getAttribute('points').split(' ').map(point=>{
        let coords = point.split(',');
        if(coords.length==2){
        return {x:Number(coords[0]), y:Number(coords[1])};}
        else{return null}
    }).filter(el=>el!=null);
}

function isPointInsidePath(path, point_){
    const point = svg.createSVGPoint();
    point.x = Number(point_.x);
    point.y = Number(point_.y);
    if(point.x && point.y){
        return path.isPointInFill(point) //|| path.isPointInStroke(point);
    }
    else{
        throw new Error('point must have number convertable coordinates')
    }
}

function pagePositionToSvgPosition(pageX, pageY) {
    //var CTM = svg.getScreenCTM();
    var svgPoint = svg.createSVGPoint();
    svgPoint.x = pageX;
    svgPoint.y = pageY;

    /*return {
      x: (pageX - CTM.e) / CTM.a,
      y: (pageY - CTM.f) / CTM.d
    };*/
    return svgPoint.matrixTransform(svg.getScreenCTM().inverse());
}

function findFieldByPoint(point){
    for(const field of document.getElementById('fields').children){
        if(isPointInsidePath(field, point)){
            return field;
        }
    }
}

function findMinDistanceFromPointToPath({x, y}, pathElement) {
    const pathLength = pathElement.getTotalLength();
    let minDistance = Infinity;  
    for (let i = 0; i <= pathLength; i += pathLength/15) {
      const pointOnPath = pathElement.getPointAtLength(i);
      const distance = Math.sqrt(
        Math.pow(x - pointOnPath.x, 2) + Math.pow(y - pointOnPath.y, 2)
      )
      minDistance = Math.min(minDistance, distance);
    }
  
    return minDistance;
  }
  

function findFigureByFieldId(fieldId){
    for(figure of document.getElementById('figures').children){
        if(figure.getAttribute('currentFieldId') === fieldId){
            return document.getElementById(figure.id);
        }
    }
}

const rotateSlider = document.getElementById('rotate-slider');
rotateSlider.addEventListener('input', () => {
    /*
    if(rotateSlider.value === '360')
       rotateSlider.value = 0*/

    rotateBoard(rotateSlider.value)
});

function rotateBoard(deg){
    
    for (figure of document.getElementById('figures').children){
        var transforms = figure.transform.baseVal;
        var transform = svg.createSVGTransform()
        if(transforms.length===0){
            const tr = svg.createSVGTransform()
            tr.setTranslate(0,0)
            transforms.insertItemBefore(tr,0)

            transforms.appendItem(transform)
        }
        else if (transforms.length===1){
            transforms.appendItem(transform)
        }
        else{
            transform = transforms.getItem(1)
        }
       
        transform.setRotate(-deg,0,0)
    }
    
    
    var transforms = svg.transform.baseVal
    var transform = svg.createSVGTransform()
    if(transforms.length===0){
        transforms.appendItem(transform)
    }
    else{
        transform = transforms.getItem(0)
    }

    transform.setRotate(deg,0,0)
}


function makeDraggable(evt) {
    if( !isMobile){
        svg.addEventListener('mousedown', startDrag);
        svg.addEventListener('mousemove', drag);
        svg.addEventListener('mouseup', endDrag);
        svg.addEventListener('mouseleave', backToInitialPosition);
    }
    else{
        svg.addEventListener('touchstart', startDrag);
        svg.addEventListener('touchmove', drag);
        svg.addEventListener('touchend', endDrag);
        svg.addEventListener('touchleave', backToInitialPosition);
        svg.addEventListener('touchcancel', backToInitialPosition);
    }


    // создание элементов RuleLinePoint
    for (const line of document.getElementById('ruleLines').children){
        let linePoints_ = linePoints(line);
        for(let i=0; i<linePoints_.length; i++){
            new RuleLinePoint(linePoints_[i], line, i);
        }
    }

    // проход по всем фигурам и определение начальных координат их центров внутри svg
    // а так же добавление связей фигур и с полями
    const figures = document.getElementById('figures')
    const figuresList = Array.from(figures.children)
    figuresList.reverse()
    for (const figure of figuresList){

        const currentFigureFieldId = currentPos[figure.id]

        if(!currentFigureFieldId && !isItInit){
            figure.remove()
            continue
        }

        const rectangle = figure.getBoundingClientRect();
        const figurePageCenter = {x: rectangle.x + rectangle.width/2, y: rectangle.y + rectangle.height/2}
        const figureSvgCenter = pagePositionToSvgPosition(figurePageCenter.x, figurePageCenter.y);
        figure.setAttribute("initialOffsetX", figureSvgCenter.x);
        figure.setAttribute("initialOffsetY", figureSvgCenter.y);

        if(!isItInit){
            var transforms = figure.transform.baseVal;
            // Ensure the first transform is a translate transform
            if (transforms.length === 0 ||
                transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                // Create an transform that translates by (0, 0)
                var translate = svg.createSVGTransform();
                translate.setTranslate(0, 0);
                // Add the translation to the front of the transforms list
                figure.transform.baseVal.insertItemBefore(translate, 0);
            }
            // Get initial translation amount
            const transform = transforms.getItem(0);
            const fieldCoord = RuleLinePoint.getByField(document.getElementById(currentFigureFieldId)).coord

            
            transform.setTranslate(fieldCoord.x - figureSvgCenter.x, fieldCoord.y - figureSvgCenter.y)
            figure.setAttribute('currentFieldId', currentFigureFieldId)
            
        }
        else{
            const fieldId = findFieldByPoint(figureSvgCenter).id
            roomEl.currentPos[figure.id] = fieldId
            figure.setAttribute('currentFieldId', fieldId)
        }

        
    }

    if(isItInit)
        socket.emit('room-changed-toserver', roomEl)
    

    figures.setAttribute('display', true)
    
    //console.log(currentUserSideIndex, roomEl.currentSideIndex)

    if(currentUserSideIndex===roomEl.currentSideIndex)
        makeCurrentUserSideFiguresDraggable()
    else
        makeAllFiguresSelectable()

    for (const signal of document.getElementById('signals').children){
        if (signal.getAttribute('side')===roomEl.sides[roomEl.currentSideIndex].sideName){
            signal.setAttribute('display',true)
        }
        else{
            signal.setAttribute('display', 'none')
        }
    }


    let selectedElement, offset, transform, dragged;
    let initialPosition, initialField, lastElement;

    function startDrag(evt) {
        dragged=false;
        
        if (evt.target.closest('.selectable')){
            if (evt.touches){
                elements = document.elementsFromPoint(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
                }else{
                elements = document.elementsFromPoint(evt.clientX, evt.clientY);
            }
            initialField = elements.find(el => el?.parentElement?.id === 'fields') || null;
            lastElement = evt.target.closest('.selectable');

            // в такой ситуации фигуру кушают, а не смотрят на ее ходы
            const highlightedFigureSelectedElementId = highlightedFields.childElementCount? highlightedFields.firstChild.getAttribute('selectedElementId'):null
            const highlightedFigure = document?.getElementById(highlightedFigureSelectedElementId)
            const circles = Array.from(circlesLayer.children)
            if (
                highlightedFigure 
                && highlightedFigure.getAttribute('side') === currentUserSideName
                && highlightedFigure.classList.contains('draggable')
                && circles
                && circles.some(o => isPointInsidePath(initialField, {x:o.getAttribute('cx'), y:o.getAttribute('cy')}))
            ){
                // сделать ход highlightedFigure в поле initialField
                highlightedFigure.style='transition: transform 0.5s ease; pointer-events: none;'
                setTimeout(()=>{ highlightedFigure.style='' }, 500)
                lastElement.classList.remove('selectable')
                lastElement = highlightedFigure
                makeMove(RuleLinePoint.getByField(initialField), lastElement)
                return
            }
            circlesLayer.innerHTML=''
            highlightedFields.innerHTML=''


            const clonedField = initialField.cloneNode(true);
            clonedField.style.fill = lastElement.getAttribute('side')!==currentUserSideName ? "#B9CA43" : "#F5F682"
            clonedField.setAttribute("selectedElementId", lastElement.id);
            highlightedFields.appendChild(clonedField);

            if(redCirclesLayer.getAttribute('selectedElementId') != lastElement.id){
                redCirclesLayer.innerHTML=''
            }
            
        }

        else if (evt.target.closest('.draggable'))
        {
            circlesLayer.innerHTML=''
            redCirclesLayer.innerHTML=''
            let elements;
            
            if (evt.touches){
                elements = document.elementsFromPoint(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
                }else{
                elements = document.elementsFromPoint(evt.clientX, evt.clientY);
            }
            initialField = elements.find(el => el?.parentElement?.id === 'fields') || null;

            selectedElement = evt.target.closest('.draggable');
            lastElement = evt.target.closest('.draggable');

            selectedElement.parentElement.appendChild(selectedElement); // поднять выше других фигур


            highlightedFields.innerHTML='';

            const clonedField = initialField.cloneNode(true);
            clonedField.style.fill = "#F5F682" // цвет выделения клетки
            clonedField.setAttribute("selectedElementId", selectedElement.id);
            highlightedFields.appendChild(clonedField);
            
            if (evt.touches) { evt = evt.touches[0]; }
            offset = pagePositionToSvgPosition(evt.clientX, evt.clientY);
            // Get all the transforms currently on this element
            var transforms = selectedElement.transform.baseVal;
            // Ensure the first transform is a translate transform
            if (transforms.length === 0 ||
                transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                // Create an transform that translates by (0, 0)
                var translate = svg.createSVGTransform();
                translate.setTranslate(0, 0);
                // Add the translation to the front of the transforms list
                selectedElement.transform.baseVal.insertItemBefore(translate, 0);
            }
            // Get initial translation amount
            transform = transforms.getItem(0);
            offset.x -= transform.matrix.e;
            offset.y -= transform.matrix.f;

            initialPosition = { x: transform.matrix.e, y: transform.matrix.f };
        }
      }
    function drag(evt) {
        dragged=true;
        if (selectedElement) {
            evt.preventDefault();
            if (evt.touches) { 
                evt = evt.touches[0]; 

                var svgBounds = svg.getBoundingClientRect();
                // Проверяем, выходит ли касание за пределы SVG
                if (evt.clientX < svgBounds.left || evt.clientX > svgBounds.right || 
                    evt.clientY < svgBounds.top || evt.clientY > svgBounds.bottom) {
                    backToInitialPosition()
                    return
                }
            }
            var coord = pagePositionToSvgPosition(evt.clientX, evt.clientY);
            transform.setTranslate(coord.x - offset.x, coord.y - offset.y);
          }
    }
    function endDrag(evt) {
        let elements
        if (evt.touches){ 
        elements = document.elementsFromPoint(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY)
        }else{
        elements = document.elementsFromPoint(evt.clientX,evt.clientY)
        }

        const field = elements.find(el => el?.parentElement?.id === 'fields') || null
        if (!field) {
            backToInitialPosition()
            return;
        }

        // нажатие на клетку/кружок для перемещения
        else if(!evt.target.closest('.draggable') && !evt.target.closest('.selectable') && !dragged && circlesLayer.childElementCount>0){
           let point
            for(const circle of circlesLayer.children){
                point = {x:Number(circle.getAttribute('cx')), y:Number(circle.getAttribute('cy'))}
                if (isPointInsidePath(field, point)){
                    makeMove(RuleLinePoint.getByField(findFieldByPoint(point)), lastElement)
                    return
                }
            }

        }

        // возможность посмотреть ходы
        else if (evt.target.closest('.selectable')){
            const rightMoves = getRightMoves(initialField);
            const selectedElementSide = lastElement.getAttribute('side');
            rightMoves.forEach(el => {
                let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side');
                let coord = el.coord

                const fullRadius     = el.fullRadius
                const bigCircleWidth = fullRadius*(1-57/69)
                const bigRadius      = fullRadius*57/69
                const littleRadius   = fullRadius*22/69

                const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circleElement.setAttribute("cx", coord.x);
                circleElement.setAttribute("cy", coord.y);
                circleElement.setAttribute("opacity",selectedElementSide!==currentUserSideName ? "0.5" : "0.1");
                circlesLayer.setAttribute("selectedElementId", lastElement.id)

                if(!attackedfigureSide){
                    // поле без фигуры
                    circleElement.setAttribute("r", littleRadius); 
                    
                    circleElement.setAttribute("fill", selectedElementSide!==currentUserSideName ? "#A8B4A2" : "black");
                    redCirclesLayer.appendChild(circleElement);
                }
                else if(attackedfigureSide!==selectedElementSide){
                    // фигура другого цвета

                    circleElement.setAttribute("r", bigRadius);
                    
                    circleElement.setAttribute("fill", "none");
                    circleElement.setAttribute('stroke-width', bigCircleWidth)
                    circleElement.setAttribute('stroke', selectedElementSide!==currentUserSideName ? "#A8B4A2" : "black")
                    redCirclesLayer.appendChild(circleElement);
                }


            })
            selectedElement = null;
            return;
            
        }

        // приземление фигуры или клик по фигуре
        else if (evt.target.closest('.draggable')){
            const selectedElementSide = selectedElement?.getAttribute('side');
            if(!selectedElementSide){return}

            const rightMoves = getRightMoves(initialField);

            // Просто клик
            if(!dragged){
                rightMoves.forEach(el => {
                
                    let coord = el.coord

                    const fullRadius     = el.fullRadius
                    const bigCircleWidth = fullRadius*(1-57/69)
                    const bigRadius      = fullRadius*57/69
                    const littleRadius   = fullRadius*22/69
                    
                    let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side')

                    const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circleElement.setAttribute("cx", coord.x);
                    circleElement.setAttribute("cy", coord.y);
                    circleElement.setAttribute("opacity","0.1");
                    circlesLayer.setAttribute("selectedElementId", selectedElement.id)

                    if(!attackedfigureSide){
                        // поле без фигуры
                        circleElement.setAttribute("r", littleRadius);
                        circleElement.setAttribute("fill", "black");
                        circlesLayer.appendChild(circleElement);
                    }
                    else if(attackedfigureSide!==selectedElementSide){
                        // фигура другого цвета
                        circleElement.setAttribute("r", bigRadius);
                        circleElement.setAttribute("fill", "none");
                        circleElement.setAttribute('stroke-width',bigCircleWidth)
                        circleElement.setAttribute('stroke', 'black')
                        circlesLayer.appendChild(circleElement);
                    }
                    

                })
                selectedElement = null;
                return;
            }

            const successMove = rightMoves.find(el => el.field === field) || null
            // среди верных нет текущего
            if (!successMove){
                backToInitialPosition();
                return;
            }

            makeMove(successMove);

        }

        // пустой клик для сброса
        circlesLayer.innerHTML=''
        redCirclesLayer.innerHTML=''
        highlightedFields.innerHTML=''

    }
    function backToInitialPosition(){
        if(selectedElement){
            lastElement.style='transition: transform 0.2s ease; pointer-events: none;'
            setTimeout(()=>{ lastElement.style='' }, 500);
            transform.setTranslate(initialPosition.x, initialPosition.y); 
            selectedElement = null;
            return;
        }
    }
    function makeMove(successMove, figure=lastElement){
        // тут где то проверять перешла ли пешка на endline
        // а вот тут передавать на сервер
        // а там уже проверить ход на победу
        const field = successMove.field
        const coord = successMove.coord

        //alert('' + figure.id + ' ' + field.id)
        if(field){
            socket.emit('make-move-toserver', roomId, figure.id, coord, field.id)
        }
        else{
            console.log('что')
        }
        selectedElement = null;
        circlesLayer.innerHTML=''
    }
    
}

class RuleLinePoint {

    static allRuleLinesPoints = [];
    
    constructor({x,y}, ruleLine, position) {
        const field = findFieldByPoint({x,y})
        if(
            field
            && Number.isInteger(Number(position))
            && ruleLine?.parentElement?.id === 'ruleLines'
        ){
            const sameFieldRuleLinePoint = RuleLinePoint.allRuleLinesPoints.find(el => el.field===field)
            if(sameFieldRuleLinePoint){
                // Одна точка - одно поле
                const oldCoord = sameFieldRuleLinePoint.coord;
                // точки внутри одного поля могут быть не равны, истина посередине
                sameFieldRuleLinePoint.coord = {x:(oldCoord.x+Number(x))/2 , y:(oldCoord.y+Number(y))/2 };
                sameFieldRuleLinePoint.ruleLines.push({ruleLine: ruleLine, position:Number(position)});
                return sameFieldRuleLinePoint;
            }
            
            this.coord = {x:Number(x), y:Number(y)}
            this.fullRadius = findMinDistanceFromPointToPath(this.coord, field)
            this.field = field
            this.ruleLines = [{ruleLine: ruleLine, position:Number(position)}]
            RuleLinePoint.allRuleLinesPoints.push(this)
        }
        else{
            throw new Error('not valid RuleLinePoint constructor arguments')
        }
    }

    static getByField(field){
        return RuleLinePoint.allRuleLinesPoints.find(el=> el.field === field)
    }

    jumpFromCurrentInLineDirection(side, direction, jump){
        const linesToGo = this.ruleLines.filter(ruleLine_position=>
            ruleLine_position.ruleLine.getAttribute('direction')===direction
            && ruleLine_position.ruleLine.getAttribute('side')===side
        )
        if(linesToGo){
            return RuleLinePoint.allRuleLinesPoints.filter(
                el=>el.ruleLines
                .some(
                    ruleLine_position=>linesToGo.some(lineToGo=>ruleLine_position.ruleLine===lineToGo.ruleLine
                        && ruleLine_position.position===lineToGo.position+jump
                    )
                )
            )
        }
    }
    sumDirectionsJumps(side, ...args){
        // в некоторых ситуациях порядок важен
        let direction, jump;
        let result=[this]
        for(const arg of args){
            direction = arg.direction;
            jump = arg.jump;

            if(direction!=undefined && jump!=undefined){
                if(result){
                    result = result.map(res=>res.jumpFromCurrentInLineDirection(side, direction, jump)).flat()
                }
                else{return []}
            }
            else{
                throw new Error('sumDirectionsJumps must have arguments like: side, {direcrion, jump}, {direcrion, jump}, ...')
            }
        }
        return result;
    }

    nextInLineDirection(side, direction){
        return this.jumpFromCurrentInLineDirection(side, direction, 1)
    }
    previousInLineDirection(side, direction){
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
    getLinesWithDirection(side, direction){
        return this.ruleLines.filter(el=> 
            el.ruleLine.getAttribute('side')===side
            && el.ruleLine.getAttribute('direction')===direction)
    }
    
}

function getRightMoves(field){
    const figure = findFigureByFieldId(field.id);
    const side = figure.getAttribute('side');
    const type = figure.getAttribute('type');
    const ruleLinePoint = RuleLinePoint.getByField(field);
    // проверить нет ли МАТА
    // проверить startline, secondline, endline правила если нужно
    let result=[]
    let attackedfigSide
    // --------------------------------------------------------
    if(type==='pawn'){
        // срубать впереди строящих пешка не в состоянии

        // брать следующие за каждой пустой из nextVerticals если это secondline

        const nextVerticals = ruleLinePoint.nextInLineDirection(side, 'vertical')
        const thisIsSecondLinePoint = ruleLinePoint.getLinesWithDirection(side,'horizontal').some(line=>line.ruleLine.classList.contains('secondline'))
        nextVerticals.forEach(nextVertical=>{
            let nextVerticalEmpty = !findFigureByFieldId(nextVertical.field.id)
            if(nextVerticalEmpty){
                result.push(nextVertical)
                if(thisIsSecondLinePoint){
                    // текущая линия вторая, можно прыгать если никто не мешает
                    //let plusTwo = ruleLinePoint.sumDirectionsJumps(side,{'direction':'vertical','jump':2})
                    let plusTwo = nextVertical.nextInLineDirection(side,'vertical')
                    plusTwo.forEach(plusTwoPoint=>{
                        if(!findFigureByFieldId(plusTwoPoint.field.id)){
                            result.push(plusTwoPoint)
                        }
                    })
                }
            }
        })

        for(const i of [1,-1]){
            // проверка возможности срубить кого то
            let canAttack1 = ruleLinePoint.sumDirectionsJumps(
                side,
                {'direction':'vertical','jump':1},
                {'direction':'horizontal','jump':i}
            )
            let canAttack2 = ruleLinePoint.sumDirectionsJumps(
                side,
                {'direction':'horizontal','jump':i},
                {'direction':'vertical','jump':1}
            )

            // массив уникальных точек right+up, up+right, left+up, up+left. Обычно уникальных две
            const canAttack = [...new Set([...canAttack1, ...canAttack2])]
            
            canAttack.forEach(point => {
                const attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                if(point && attackedfigSide && attackedfigSide!==side){
                    result.push(point)
                }
            })
        }
    }
    // --------------------------------------------------------
    if(type==='knight'){
        let knightMoves
        for(const i of [2,-2]){
            for(const j of [1,-1]){
                knightMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'vertical','jump':i},  
                    {'direction':'horizontal','jump':j}
                )
                knightMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'horizontal','jump':j},
                    {'direction':'vertical','jump':i}
                )

                knightMoves = [...new Set([...knightMoves1, ...knightMoves2])]
                knightMoves.forEach(knightMove=>{
                    attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute('side')
                    if(knightMove && !(attackedfigSide && attackedfigSide===side)){
                        result.push(knightMove)
                    }
                })

                // переворот
                knightMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side, 
                    {'direction':'vertical','jump':j},  
                    {'direction':'horizontal','jump':i}
                )
                knightMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'horizontal','jump':i},
                    {'direction':'vertical','jump':j}
                )

                knightMoves = [...new Set([...knightMoves1, ...knightMoves2])]
                knightMoves.forEach(knightMove=>{
                    attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute('side')
                    if(knightMove && !(attackedfigSide && attackedfigSide===side)){
                        result.push(knightMove)
                    }
                })
            }
        }
    }
    // --------------------------------------------------------
    if(type==='king'){
        let kingMoves;
        for(const i of [1,-1, 0]){
            for(const j of [1,-1, 0]){
                // добавить проверки на нахождение хода под атакой
                if(i===0 && j===0){continue;}
                let kingMoves1 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'vertical','jump':i},
                    {'direction':'horizontal','jump':j}
                )
                let kingMoves2 = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'horizontal','jump':j},
                    {'direction':'vertical','jump':i}
                )
                kingMoves = [...new Set([...kingMoves1, ...kingMoves2])]
                kingMoves.forEach(kingMove=>{
                    attackedfigSide = findFigureByFieldId(kingMove?.field?.id)?.getAttribute('side')
                    if(kingMove && !(attackedfigSide && attackedfigSide===side)){
                        result.push(kingMove)
                    }
                })
            }
        }
    }
    // --------------------------------------------------------
    if(['bishop', 'queen'].includes(type)){
        // sometimes: right + up != up + right
        let d11=[ruleLinePoint], d21=[ruleLinePoint], d31=[ruleLinePoint], d41=[ruleLinePoint]
        let d12=[ruleLinePoint], d22=[ruleLinePoint], d32=[ruleLinePoint], d42=[ruleLinePoint]

        while(d11.length + d21.length + d31.length + d41.length + d12.length + d22.length + d32.length + d42.length !== 0){
            d11 = d11.map(point=>point && point.sumDirectionsJumps(side, {'direction':'horizontal','jump':1},  {'direction':'vertical','jump':1})).flat()
            d12 = d12.map(point=>point && point.sumDirectionsJumps(side,  {'direction':'vertical','jump':1}, {'direction':'horizontal','jump':1})).flat()
            
            d21 = d21.map(point=>point && point.sumDirectionsJumps(side, {'direction':'horizontal','jump':1},  {'direction':'vertical','jump':-1})).flat()
            d22 = d22.map(point=>point && point.sumDirectionsJumps(side, {'direction':'vertical','jump':-1}, {'direction':'horizontal','jump':1})).flat()

            d31 = d31.map(point=>point && point.sumDirectionsJumps(side, {'direction':'horizontal','jump':-1}, {'direction':'vertical','jump':1})).flat()
            d32 = d32.map(point=>point && point.sumDirectionsJumps(side, {'direction':'vertical','jump':1}, {'direction':'horizontal','jump':-1})).flat()
            
            d41 = d41.map(point=>point && point.sumDirectionsJumps(side, {'direction':'horizontal','jump':-1}, {'direction':'vertical','jump':-1})).flat()
            d42 = d42.map(point=>point && point.sumDirectionsJumps(side, {'direction':'vertical','jump':-1}, {'direction':'horizontal','jump':-1})).flat()

            for(const d of [d11,d21,d31,d41,d12,d22,d32,d42]){
                d.forEach(point=>{
                    attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                    if(point && !(attackedfigSide && attackedfigSide===side) && !result.includes(point)){
                        result.push(point)
                    }
                })
            }
            d11 = d11.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d21 = d21.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d31 = d31.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d41 = d41.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d12 = d12.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d22 = d22.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d32 = d32.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            d42 = d42.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
        }
    }
    // --------------------------------------------------------
    if( ['rook','queen'].includes(type)){
        let h1=[ruleLinePoint], h2=[ruleLinePoint], v1=[ruleLinePoint], v2=[ruleLinePoint];
    
        while(h1.length + h2.length + v1.length + v2.length !== 0){
            h1 = h1.map(point=>point && point.nextInLineDirection(side, 'horizontal')).flat()
            h2 = h2.map(point=>point && point.previousInLineDirection(side, 'horizontal')).flat()
            v1 = v1.map(point=>point && point.nextInLineDirection(side, 'vertical')).flat()
            v2 = v2.map(point=>point && point.previousInLineDirection(side, 'vertical')).flat()
            for(const hv of [h1,h2,v1,v2]){
                hv.forEach(point=>{
                    attackedfigSide = findFigureByFieldId(point?.field?.id)?.getAttribute('side')
                    if(point && !(attackedfigSide && attackedfigSide===side)){
                        result.push(point)
                    }
                })
            }
            h1 = h1.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            h2 = h2.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            v1 = v1.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
            v2 = v2.map(point=>!findFigureByFieldId(point?.field?.id) && point).filter(Boolean)
        }
    }
    // --------------------------------------------------------
    
    return result;
}