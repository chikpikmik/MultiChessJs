
const svg = document.getElementById('mysvg')

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

function resizeBoard(){

    const screenWidth = screen.availWidth;
    const screenHeight = screen.availHeight;
    if(screenHeight<=screenWidth){
        svg.style.height = screenHeight * (isMobile? 1:0.85);
    }
    else{
        svg.style.width = screenWidth * (isMobile? 1:0.85);
    }

    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;

    const pageWidth =  document.documentElement.scrollWidth;
    const pageHeight = document.documentElement.scrollHeight;

    const scrollToVerticalCenter = (pageHeight - windowHeight) / 2;
    const scrollToHorizontalCenter = (pageWidth - windowWidth) / 2;

    if(isMobile){
        const rect = svg.getBoundingClientRect()
        document.body.style.padding=`${(windowHeight-rect.height)/2}px 0px 0px 0px`;
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

let clientSide = 'white'

function makeAllFiguresSelectable(){
    for (const figure of document.getElementById('figures').children){
        figure.classList.remove('draggable')
        figure.classList.add('selectable')
    }
}
function makeClientSideFiguresDraggable(){
    for (const figure of document.getElementById('figures').children){
        if(figure.getAttribute('side')===clientSide){
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
    var CTM = svg.getScreenCTM();
    return {
      x: (pageX - CTM.e) / CTM.a,
      y: (pageY - CTM.f) / CTM.d
    };
}

function findFieldByPoint(point){
    for(const field of document.getElementById('fields').children){
        if(isPointInsidePath(field, point)){
            return field;
        }
    }
}

function findFigureByFieldId(fieldId){
    for(figure of document.getElementById('figures').children){
        if(figure.getAttribute('currentFieldId') === fieldId){
            return document.getElementById(figure.id);
        }
    }
}


function makeDraggable(evt) {
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', backToInitialPosition);

    svg.addEventListener('touchstart', startDrag);
    svg.addEventListener('touchmove', drag);
    svg.addEventListener('touchend', endDrag);
    svg.addEventListener('touchleave', backToInitialPosition);
    svg.addEventListener('touchcancel', backToInitialPosition);

    // проход по всем фигурам и определение начальных координат их центров внутри svg
    // а так же добавление связей фигур и с полями
    for (const figure of document.getElementById('figures').children){
        const rectangle = figure.getBoundingClientRect();
        const figurePageCenter = {x: rectangle.x + rectangle.width/2, y: rectangle.y + rectangle.height/2}
        const figureSvgCenter = pagePositionToSvgPosition(figurePageCenter.x, figurePageCenter.y);
        figure.setAttribute("initialOffsetX", figureSvgCenter.x);
        figure.setAttribute("initialOffsetY", figureSvgCenter.y);

        figure.setAttribute('currentFieldId', findFieldByPoint(figureSvgCenter).id);
    }
    
    // создание элементов RuleLinePoint
    for (const line of document.getElementById('ruleLines').children){
        let linePoints_ = linePoints(line);
        for(let i=0; i<linePoints_.length; i++){
            new RuleLinePoint(linePoints_[i], line, i);
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
                && highlightedFigure.getAttribute('side') === clientSide
                && highlightedFigure.classList.contains('draggable')
                && circles
                && circles.some(o => isPointInsidePath(initialField, {x:o.getAttribute('cx'), y:o.getAttribute('cy')}))
            ){
                // сделать ход highlightedFigure в поле initialField
                highlightedFigure.style='transition: transform 0.5s ease; pointer-events: none;'
                setTimeout(()=>{ highlightedFigure.style='' }, 500);
                lastElement.classList.remove('selectable')
                lastElement = highlightedFigure;
                makeMove(RuleLinePoint.getByField(initialField), lastElement, 400)
                return;
            }

            circlesLayer.innerHTML=''
            highlightedFields.innerHTML='';


            const clonedField = initialField.cloneNode(true);
            clonedField.style.fill = lastElement.getAttribute('side')!==clientSide ? "#B9CA43" : "#F5F682"
            clonedField.setAttribute("selectedElementId", lastElement.id);
            highlightedFields.appendChild(clonedField);

            if(redCirclesLayer.getAttribute('selectedElementId') != lastElement.id){
                redCirclesLayer.innerHTML=''
            }
            
        }

        if (evt.target.closest('.draggable'))
        {
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

            if(circlesLayer.getAttribute('selectedElementId') != selectedElement.id){
                circlesLayer.innerHTML=''
            }
            

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
        if(!evt.target.closest('.draggable') && !evt.target.closest('.selectable') && !dragged && circlesLayer.childElementCount>0){
           let point

            for(const circle of circlesLayer.children){
                point = {x:Number(circle.getAttribute('cx')), y:Number(circle.getAttribute('cy'))}
                if (isPointInsidePath(field, point)){
                    circlesLayer.innerHTML='';
                    highlightedFields.innerHTML='';
                    // при перетаскивании анимации перемещения нет
                    lastElement.style='transition: transform 0.5s ease; pointer-events: none;'
                    setTimeout(()=>{ lastElement.style='' }, 500);
                    makeMove(RuleLinePoint.getByField(findFieldByPoint(point)),lastElement,400);
                    return;
                }
            }
        }

        circlesLayer.innerHTML='';
        redCirclesLayer.innerHTML='';

        // возможность посмотреть ходы
        if (evt.target.closest('.selectable')){
            const rightMoves = getRightMoves(initialField);
            const selectedElementSide = lastElement.getAttribute('side');
            rightMoves.forEach(el => {
                let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side');

                let coord = el.coord

                const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circleElement.setAttribute("cx", coord.x);
                circleElement.setAttribute("cy", coord.y);
                circleElement.setAttribute("opacity",selectedElementSide!==clientSide ? "0.5" : "0.1");
                circlesLayer.setAttribute("selectedElementId", lastElement.id)

                if(!attackedfigureSide){
                    // поле без фигуры
                    circleElement.setAttribute("r", "22");
                    circleElement.setAttribute("fill", selectedElementSide!==clientSide ? "#A8B4A2" : "black");
                    redCirclesLayer.appendChild(circleElement);
                }
                else if(attackedfigureSide!==selectedElementSide){
                    // фигура другого цвета
                    circleElement.setAttribute("r", "57");
                    circleElement.setAttribute("fill", "none");
                    circleElement.setAttribute('stroke-width','12')
                    circleElement.setAttribute('stroke', selectedElementSide!==clientSide ? "#A8B4A2" : "black")
                    redCirclesLayer.appendChild(circleElement);
                }


            })
            selectedElement = null;
            return;
            
        }

        // приземление фигуры или клик по фигуре
        if (evt.target.closest('.draggable')){
            const selectedElementSide = selectedElement?.getAttribute('side');
            if(!selectedElementSide){return}

            const rightMoves = getRightMoves(initialField);

            // Просто клик
            if(!dragged){
                rightMoves.forEach(el => {
                
                    let coord = el.coord
                    
                    let attackedfigureSide = findFigureByFieldId(el.field.id)?.getAttribute('side')

                    const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circleElement.setAttribute("cx", coord.x);
                    circleElement.setAttribute("cy", coord.y);
                    circleElement.setAttribute("opacity","0.1");
                    circlesLayer.setAttribute("selectedElementId", selectedElement.id)

                    if(!attackedfigureSide){
                        // поле без фигуры
                        circleElement.setAttribute("r", "22");
                        circleElement.setAttribute("fill", "black");
                        circlesLayer.appendChild(circleElement);
                    }
                    else if(attackedfigureSide!==selectedElementSide){
                        // фигура другого цвета
                        circleElement.setAttribute("r", "57");
                        circleElement.setAttribute("fill", "none");
                        circleElement.setAttribute('stroke-width','12')
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
    function makeMove(successMove, figure=lastElement, deleteTimeout=0){
        highlightedFields.innerHTML=''
        circlesLayer.innerHTML='';
        redCirclesLayer.innerHTML='';
        // тут где то проверять перешла ли пешка на endline
        // а вот тут передавать на сервер
        // а там уже проверить ход на победу
        const field = successMove.field
        const coord = successMove.coord
        const attackedFig = findFigureByFieldId(field.id)
        if(field){
            if(attackedFig){
                setTimeout(()=>{attackedFig.remove()},deleteTimeout)
            }
            const initialOffset = {x: Number(figure.getAttribute('initialOffsetX')), y: Number(figure.getAttribute('initialOffsetY'))}
            transform.setTranslate(coord.x - initialOffset.x, coord.y - initialOffset.y)
            figure.setAttribute('currentFieldId', field.id)
            
            //clientSide = 'black'             // на случай игры на одном экране
            //makeAllFiguresSelectable()       // ожидание ответа
            //makeClientSideFiguresDraggable() // ответ пришел
        }
        else{
            console.log('что')
        }
        selectedElement = null;
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
            this.coord = {x:Number(x), y:Number(y)};
            this.field = field;
            this.ruleLines = [{ruleLine: ruleLine, position:Number(position)}];
            RuleLinePoint.allRuleLinesPoints.push(this);
        }
        else{
            throw new Error('not valid RuleLinePoint constructor arguments')
        }
    }

    static getByField(field){
        return RuleLinePoint.allRuleLinesPoints.find(el=> el.field === field)
    }
    //навигация по некоторой абсолютной величине

    jumpFromCurrentInLineDirection(side, direction, jump){
        const lineToGo = this.ruleLines.find(ruleLine_position=>
            ruleLine_position.ruleLine.getAttribute('direction')===direction
            && ruleLine_position.ruleLine.getAttribute('side')===side
        )
        if(lineToGo){
            return RuleLinePoint.allRuleLinesPoints.find(
                el=>el.ruleLines
                .some(
                    ruleLine_position=>ruleLine_position.ruleLine===lineToGo.ruleLine
                    && ruleLine_position.position===lineToGo.position+jump
                )
            )
        }
    }
    sumDirectionsJumps(side, ...args){
        // в некоторых ситуациях порядок важен
        let direction, jump;
        let result=this;
        for(const arg of args){
            direction = arg.direction;
            jump = arg.jump;
            if(direction!=undefined && jump!=undefined){
                if(result){
                    result = result.jumpFromCurrentInLineDirection(side, direction, jump)
                }
                else{return undefined;}
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

    getLineWithDirection(side, direction){
        return this.ruleLines.find(el=> 
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
        const nextVertical = ruleLinePoint.nextInLineDirection(side, 'vertical')
        const nextVerticalEmpty = !findFigureByFieldId(nextVertical?.field?.id)
        if(nextVertical && nextVerticalEmpty){
            result.push(nextVertical)
        }

        const classes = ruleLinePoint.getLineWithDirection(side,'horizontal').ruleLine.classList
        if(classes.contains('secondline') && nextVerticalEmpty){
            // текущая линия вторая, можно прыгать если никто не мешает
            let plusTwo = ruleLinePoint.sumDirectionsJumps(side,{'direction':'vertical','jump':2})
            if(plusTwo && !findFigureByFieldId(plusTwo.field.id)){
                result.push(plusTwo)
            }
        }

        let canAttack;
        for(const i of [1,-1]){
            // проверка возможности срубить кого то
            canAttack = ruleLinePoint.sumDirectionsJumps(
                side,
                {'direction':'vertical','jump':1},
                {'direction':'horizontal','jump':i}
            )
            attackedfigSide = findFigureByFieldId(canAttack?.field?.id)?.getAttribute('side')
            if(canAttack && attackedfigSide && attackedfigSide!==side){
                result.push(canAttack)
            }
        }
    }
    // --------------------------------------------------------
    if(type==='knight'){
        let knightMove;
        for(const i of [2,-2]){
            for(const j of [1,-1]){
                // подумай че тут не так
                knightMove = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'vertical','jump':i},  
                    {'direction':'horizontal','jump':j}
                )
                attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute('side')
                if(knightMove && !(attackedfigSide && attackedfigSide===side)){
                    result.push(knightMove)
                }
                // переворот
                knightMove = ruleLinePoint.sumDirectionsJumps(
                    side, 
                    {'direction':'vertical','jump':j},  
                    {'direction':'horizontal','jump':i}
                )
                attackedfigSide = findFigureByFieldId(knightMove?.field?.id)?.getAttribute('side')
                if(knightMove && !(attackedfigSide && attackedfigSide===side)){
                    result.push(knightMove)
                }
            }
        }
    }
    // --------------------------------------------------------
    if(type==='king'){
        let kingMove;
        for(const i of [1,-1, 0]){
            for(const j of [1,-1, 0]){
                // добавить проверки на нахождение хода под атакой
                if(i===0 && j===0){continue;}
                kingMove = ruleLinePoint.sumDirectionsJumps(
                    side,
                    {'direction':'vertical','jump':i},
                    {'direction':'horizontal','jump':j}
                )
                attackedfigSide = findFigureByFieldId(kingMove?.field?.id)?.getAttribute('side')
                if(kingMove  && !(attackedfigSide && attackedfigSide===side)){
                    result.push(kingMove)
                }
            }
        }
    }
    // --------------------------------------------------------
    if(['bishop', 'queen'].includes(type)){
        let d1=ruleLinePoint, d2=ruleLinePoint, d3=ruleLinePoint, d4=ruleLinePoint;
    
        while(d1 || d2 || d3 || d4){
            d1 = d1 && d1.sumDirectionsJumps(side, {'direction':'horizontal','jump':1},  {'direction':'vertical','jump':1})
            d2 = d2 && d2.sumDirectionsJumps(side, {'direction':'horizontal','jump':1},  {'direction':'vertical','jump':-1})
            d3 = d3 && d3.sumDirectionsJumps(side, {'direction':'horizontal','jump':-1}, {'direction':'vertical','jump':1})
            d4 = d4 && d4.sumDirectionsJumps(side, {'direction':'horizontal','jump':-1}, {'direction':'vertical','jump':-1})
            for(const d of [d1,d2,d3,d4]){
                attackedfigSide = findFigureByFieldId(d?.field?.id)?.getAttribute('side')
                if(d && !(attackedfigSide && attackedfigSide===side)){
                    result.push(d)
                }
            }
            d1 = !findFigureByFieldId(d1?.field?.id) && d1
            d2 = !findFigureByFieldId(d2?.field?.id) && d2
            d3 = !findFigureByFieldId(d3?.field?.id) && d3
            d4 = !findFigureByFieldId(d4?.field?.id) && d4
        }
    }
    // --------------------------------------------------------
    if( ['rook','queen'].includes(type)){
        let h1=ruleLinePoint, h2=ruleLinePoint, v1=ruleLinePoint, v2=ruleLinePoint;
    
        while(h1 || h2 || v1 || v2){
            h1 = h1 && h1.nextInLineDirection(side, 'horizontal')
            h2 = h2 && h2.previousInLineDirection(side, 'horizontal')
            v1 = v1 && v1.nextInLineDirection(side, 'vertical')
            v2 = v2 && v2.previousInLineDirection(side, 'vertical')
            for(const hv of [h1,h2,v1,v2]){
                attackedfigSide = findFigureByFieldId(hv?.field?.id)?.getAttribute('side')
                if(hv && !(attackedfigSide && attackedfigSide===side)){
                    result.push(hv)
                }
            }
            h1 = !findFigureByFieldId(h1?.field?.id) && h1
            h2 = !findFigureByFieldId(h2?.field?.id) && h2
            v1 = !findFigureByFieldId(v1?.field?.id) && v1
            v2 = !findFigureByFieldId(v2?.field?.id) && v2
        }
    }
    // --------------------------------------------------------
    
    return result;
}