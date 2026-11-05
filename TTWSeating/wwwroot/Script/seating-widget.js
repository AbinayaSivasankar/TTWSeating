let dotNetHelper;
var globalPriceList = [];
let undoStack = [];
let redoStack = [];
let isLoading = false;
let isBulkAdding = false;
let previewseats = [];
let segmentActive = false;
let startX = 0;
let startY = 0;
let direction = null;
let lastDirection = null;
let segmentPath = [];
const seatSize = 18;
const seatGap = 6;
const rowGap = 30;
let canvas;
let segmentRowPreviewMode = false;
let segmentRowFinalized = false;
let segmentRowPath = [];
let rowSelectionGuides = {
    start: null,
    end: null,
    top: null,
    bottom: null
};
let previewLocked = false;
let currentRowPreview = [];
let previewRow = null;
let finalRows = [];
let dragDirection = null;
const directionThreshold = 10;
let guideLine = null;
let crossGuideLine = null;
let rowBaseline = null;
let lastRowPosition = null;

window.fabricInterop = {
    canvases: {},
    isDrawingSeats: false,
    mode: "select",
    seatSpacing: 22,
    seatCounter: 1,
    lastSeat: null,
    alignmentMode: null,
    guideLine: null,
    rowDirection: "horizontal",
    previewLine: null,
    rowIndex: 1,
    rowSeatCount: 0,
    isDrawingRow: false,
    rowStart: null,
    previewSeats: [],
    previewLines: {
        start: null,
        end: null,
        top: null,
        bottom: null
    },
    alignmentGuides: {
        start: null,
        end: null
    },
    hoverStartGuide: null,
    lastHoverPoint: null,
    rowHoverGuide: null,
    isDrawingMultipleRows: false,
    firstRowSeatCount: 0,
    firstRowDirection: null,
    firstRowStart: null,
    firstRowLength: 0,
    rowGap: 30,
    multiRowActive: false,
    generatedRows: [],
    lastRowY: null,
    isDrawingFirstRow: false,
    straightLineGuide: null,
    snapThreshold: 6,
    dragGuides: {
        start: null,
        end: null,
        active: false
    },
    multiRowStartPoint: null,
    multiRowCurrentPoint: null,
    multiRowDirection: null,
    multiRowAngle: 0,
    multiRowSpacing: 30,
    multiRowPreviewRows: [],
    firstRowBaseX: null,
    firstRowBaseY: null,
    lastRowX: null,
    _isScaling: false,

    initCanvas(canvasId, width, height) {
        undoStack = [];
        redoStack = [];
        this.resetChartState("seatCanvas");
        canvas = new fabric.Canvas(canvasId, {
            selection: true,
            width: document.getElementById(canvasId).parentElement.clientWidth,
            height: document.getElementById(canvasId).parentElement.clientHeight
        });
        //hide resize handler of the selection box except left and right
        fabric.Object.prototype.setControlsVisibility({
            mt: false,  // top-middle
            mb: false,  // bottom-middle
            tl: false,  // top-left
            tr: false,  // top-right
            bl: false,  // bottom-left
            br: false,  // bottom-right

        });
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        undoStack.push(JSON.stringify(canvas.toJSON()));
        this.canvases[canvasId] = canvas;
        this.isFirstRowFinalized = false;
        // Seat creation
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "create") return;
            this.isDrawingSeats = true;
            this.alignmentMode = null;
            const pointer = canvas.getPointer(opt.e);
            this.addSeat(canvasId, pointer.x, pointer.y);
        });

        canvas.on("mouse:move", (opt) => {
            if (this.mode !== "create") return;
            const pointer = canvas.getPointer(opt.e);
            let x = pointer.x;
            let y = pointer.y;
            if (this.lastSeat) {
                if (!this.alignmentMode) {
                    const dx = Math.abs(pointer.x - this.lastSeat.x);
                    const dy = Math.abs(pointer.y - this.lastSeat.y);
                    this.alignmentMode = dx > dy ? "horizontal" : "vertical";
                }
                if (this.alignmentMode === "horizontal") y = this.lastSeat.y;
                else x = this.lastSeat.x;
            }
            if (this.isDrawingSeats && (!this.lastSeat || Math.hypot(x - this.lastSeat.x, y - this.lastSeat.y) > this.seatSpacing)) {
                this.addSeat(canvasId, x, y);
            }
        });

        canvas.on("mouse:up", () => {
            this.isDrawingSeats = false;
            this.alignmentMode = null;
        });

        // Rectangle creation
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "rectangle") return;
            const pointer = canvas.getPointer(opt.e);
            this.isDrawingRect = true;
            this.rectStartX = pointer.x;
            this.rectStartY = pointer.y;
            this.activeRect = new fabric.Rect({
                left: this.rectStartX,
                top: this.rectStartY,
                width: 1,
                height: 1,
                fill: "rgba(0,0,0,0.1)",
                stroke: "black",
                strokeWidth: 1,
                selectable: false,
                objectType: 'rectangle',
                createdBy: 'rectangleTool',
                rectangleId: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
            canvas.add(this.activeRect);
        });

        canvas.on("mouse:move", (opt) => {
            if (this.mode !== "rectangle" || !this.isDrawingRect) return;
            const pointer = canvas.getPointer(opt.e);
            const width = pointer.x - this.rectStartX;
            const height = pointer.y - this.rectStartY;
            this.activeRect.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width < 0 ? pointer.x : this.rectStartX,
                top: height < 0 ? pointer.y : this.rectStartY
            });
            canvas.renderAll();
        });

        canvas.on("mouse:up", () => {
            if (this.mode !== "rectangle") return;
            this.isDrawingRect = false;
            this.setMode(this.mode);
            if (this.activeRect) {
                this.activeRect.set({
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockUniScaling: false
                });
                canvas.renderAll();
                if (canvas.getObjects().length > 0) {
                    saveState(canvas);
                } else {
                    undoStack.push(JSON.stringify(canvas.toJSON()));
                    redoStack = [];
                }
                this.activeRect = null;
            }
        });

        // General Category Rect
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "general") return;
            const pointer = canvas.getPointer(opt.e);
            this.isDrawingRect = true;
            this.rectStartX = pointer.x;
            this.rectStartY = pointer.y;
            this.activeRect = new fabric.Rect({
                left: this.rectStartX,
                top: this.rectStartY,
                width: 1,
                height: 1,
                fill: "rgba(0,0,0,0.1)",
                stroke: "black",
                strokeWidth: 1,
                selectable: false,
                objectType: 'genrectangle',
                createdBy: 'rectangleTool',
                rectangleId: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
            canvas.add(this.activeRect);
        });

        canvas.on("mouse:move", (opt) => {
            if (this.mode !== "general" || !this.isDrawingRect) return;
            const pointer = canvas.getPointer(opt.e);
            const width = pointer.x - this.rectStartX;
            const height = pointer.y - this.rectStartY;
            this.activeRect.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width < 0 ? pointer.x : this.rectStartX,
                top: height < 0 ? pointer.y : this.rectStartY
            });
            canvas.renderAll();
        });

        canvas.on("mouse:up", () => {
            if (this.mode !== "general") return;
            this.isDrawingRect = false;
            this.setMode(this.mode);
            if (this.activeRect) {
                this.activeRect.set({
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockUniScaling: false
                });
                canvas.renderAll();
                if (canvas.getObjects().length > 0) {
                    saveState(canvas);
                } else {
                    undoStack.push(JSON.stringify(canvas.toJSON()));
                    redoStack = [];
                }
                this.activeRect = null;
            }
        });

        // Row creation
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "row") return;
            const pointer = canvas.getPointer(opt.e);
            this.rowStart = this.getSnappedRowStart(pointer);
            const hit = opt.target;
            if (hit && hit.objectType === "rectangle") {
                this.isDrawingRow = false;
                return;
            }
            this.rowDirection = null;
            this.isDrawingRow = true;
            this.rowAngle = 0;
            if (this.hoverStartGuide) {
                canvas.remove(this.hoverStartGuide);
                this.hoverStartGuide = null;
            }
        });

        canvas.on("mouse:move", (opt) => {
            if (!this.isDrawingRow || this.mode !== "row") return;
            const canvas = this.canvases[canvasId];
            const hit = canvas.findTarget(opt.e, true);
            if (hit && hit.objectType === "rectangle") return;
            const pointer = canvas.getPointer(opt.e);
            this.previewSeats.forEach(s => canvas.remove(s));
            this.previewSeats = [];
            if (this.previewLine) {
                canvas.remove(this.previewLine);
                this.previewLine = null;
            }
            if (this.straightLineGuide) {
                canvas.remove(this.straightLineGuide);
                this.straightLineGuide = null;
            }
            const dx = pointer.x - this.rowStart.x;
            const dy = pointer.y - this.rowStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const spacing = this.seatSpacing || 20;
            if (distance < 5) {
                canvas.renderAll();
                return;
            }
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const snappedAngle = this.snapToStraightLine(angle);
            const isSnapped = snappedAngle !== angle;
            if (isSnapped) {
                angle = snappedAngle;
                this.showStraightLineGuide(canvas, this.rowStart, angle);
            }
            this.rowAngle = angle;
            const seatCount = Math.max(2, Math.floor(distance / spacing) + 1);
            const rowLength = (seatCount - 1) * spacing;
            const endX = this.rowStart.x + Math.cos(angle * Math.PI / 180) * rowLength;
            const endY = this.rowStart.y + Math.sin(angle * Math.PI / 180) * rowLength;
            const lineColor = isSnapped ? "#4CAF50" : "#2196F3";
            const lineDash = isSnapped ? [] : [5, 5];
            this.previewLine = new fabric.Line(
                [this.rowStart.x, this.rowStart.y, endX, endY],
                {
                    stroke: lineColor,
                    strokeDashArray: lineDash,
                    selectable: false,
                    evented: false,
                    strokeWidth: 2
                }
            );
            canvas.add(this.previewLine);
            for (let i = 0; i < seatCount; i++) {
                const seatDistance = i * spacing;
                const x = this.rowStart.x + Math.cos(angle * Math.PI / 180) * seatDistance;
                const y = this.rowStart.y + Math.sin(angle * Math.PI / 180) * seatDistance;
                const seat = new fabric.Circle({
                    left: x,
                    top: y,
                    radius: 8,
                    fill: "white",
                    originX: "center",
                    originY: "center",
                    selectable: false,
                    evented: false,
                    stroke: "black",
                    strokeWidth: 1
                });
                seat.seatLabel = i + 1;
                seat.isPreview = true;
                this.previewSeats.push(seat);
                canvas.add(seat);
            }
            this.updateAngledRowGuides(canvas, this.rowStart, angle, seatCount);
            const tooltip = document.getElementById("seatTooltip");
            if (tooltip) {
                setTimeout(() => {
                    tooltip.textContent = `${seatCount} seats`;
                    tooltip.style.left = (opt.e.clientX + 10) + "px";
                    tooltip.style.top = (opt.e.clientY + 10) + "px";
                    tooltip.style.display = "block";
                }, 0);
            }
            canvas.renderAll();
        });

        canvas.on("mouse:move", (opt) => {
            if (this.mode !== "row" && this.mode !== "multiRow" && this.mode !== "segmentRow" || (this.mode === "multiRow" && this.firstRowSeatCount !== 0)) return;
            if (this.isDrawingRow) return;
            const canvas = this.canvases[canvasId];
            const pointer = canvas.getPointer(opt.e);
            let direction = "horizontal";
            if (this.lastHoverPoint) {
                const dx = Math.abs(pointer.x - this.lastHoverPoint.x);
                const dy = Math.abs(pointer.y - this.lastHoverPoint.y);
                direction = dx > dy ? "horizontal" : "vertical";
            }
            this.lastHoverPoint = pointer;
            this.updateRowHoverGuide(canvas, direction);
            this.updateHoverStartGuide(canvas, pointer, direction);
            canvas.renderAll();
        });

        canvas.on("mouse:up", () => {
            if (!this.isDrawingRow || this.mode !== "row") return;
            const canvas = this.canvases[canvasId];
            if (this.straightLineGuide) {
                canvas.remove(this.straightLineGuide);
                this.straightLineGuide = null;
            }
            if (!this.previewSeats || this.previewSeats.length === 0) {
                this.isDrawingRow = false;
                return;
            }
            const spacing = this.seatSpacing || 20;
            const seatCount = this.previewSeats.length;
            if (seatCount === 0) return;
            const rowLabel = "";
            const rowId = `row-${rowLabel}-${Date.now()}`;
            isBulkAdding = true;
            const angle = this.rowAngle;
            for (let i = 0; i < seatCount; i++) {
                const previewSeat = this.previewSeats[i];
                if (!previewSeat) continue;
                const x = previewSeat.left;
                const y = previewSeat.top;
                const seatLabel = (i + 1).toString();
                const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
                this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
            }
            this.previewSeats.forEach(seat => {
                canvas.remove(seat);
                if (seat.seatText) {
                    canvas.remove(seat.seatText);
                }
            });
            this.previewSeats = [];
            if (this.previewLine) {
                canvas.remove(this.previewLine);
                this.previewLine = null;
            }
            this.lastRowPosition = {
                angle: angle,
                x: this.rowStart.x,
                y: this.rowStart.y,
                seatCount: seatCount
            };
            if (!this.rowBaseline) {
                this.rowBaseline = { ...this.lastRowPosition };
            }
            this.isDrawingRow = false;
            this.clearAlignmentGuides(canvas);
            this.clearRowGuide(canvas);
            const tooltip = document.getElementById("seatTooltip");
            if (tooltip) {
                tooltip.style.display = "none";
            }
            canvas.renderAll();
            isBulkAdding = false;
            this.setMode(this.mode);
            setTimeout(() => {
                if (canvas.getObjects().length > 0) {
                    saveState(canvas);
                } else {
                    undoStack.push(JSON.stringify(canvas.toJSON()));
                    redoStack = [];
                }
            }, 100);
        });

        const tooltip = document.getElementById("seatTooltip");

        canvas.on("mouse:move", (opt) => {
            const target = canvas.findTarget(opt.e, true);
            if (target && target.type === "group" && (target.seatLabel || target.seatId)) {
                // Always read the live property values — updated after every resize/label operation
                const seatLabel = target.seatLabel || target.get('seatLabel') || '';
                const rowLabel = target.rowLabel || target.get('rowLabel') || '';
                const seatId = target.seatId || target.get('seatId') || '';

                let displayText = '';
                if (seatId && seatId.trim() !== '' && !seatId.startsWith('Seat-')) {
                    displayText = seatId;
                } else if (rowLabel && seatLabel) {
                    displayText = rowLabel + ' - ' + seatLabel;
                } else if (seatLabel) {
                    displayText = 'Seat ' + seatLabel;
                } else if (seatId) {
                    displayText = seatId;
                }

                if (displayText) {
                    tooltip.innerText = displayText;
                    tooltip.style.display = "block";
                    tooltip.style.left = opt.e.pageX + 10 + "px";
                    tooltip.style.top = opt.e.pageY + 10 + "px";
                } else {
                    tooltip.style.display = "none";
                }
            } else {
                tooltip.style.display = "none";
            }
        });

        canvas.on('selection:created', (e) => {
            if (this.mode === "select") {
                var ddlcolor = document.getElementById("ddlcolor");
                if (ddlcolor) {
                    document.getElementById("ddlcolor").value = "";
                }
                this.handleRowSelection(canvas, e);
                this.handleSelectionChanged(canvasId, e);
                this.populateRowProperties(canvasId);
                this.populateRectangleProperties(canvasId);
            }
        });

        canvas.on('selection:updated', (e) => {
            if (this.mode === "select") {
                this.handleRowSelection(canvas, e);
                this.handleSelectionChanged(canvasId, e);
                this.populateRowProperties(canvasId);
                this.populateRectangleProperties(canvasId);
            }
        });

        canvas.on('selection:cleared', () => {
            if (this.mode === "select") {
                this.handleSelectionCleared(canvasId);
                this.clearRowPropertiesUI();
                const ddlRect = document.getElementById("ddlrect");
                if (ddlRect) ddlRect.value = "";
            }
        });

        // Multi row creation - UPDATED FOR ALL DIRECTIONS

        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "multiRow") return;

            const pointer = canvas.getPointer(opt.e);

            // START FIRST ROW DRAW
            if (!this.isFirstRowFinalized) {
                const hit = canvas.findTarget(opt.e, true);
                if (hit && hit.objectType === "rectangle") {
                    this.isDrawingFirstRow = false;
                    return;
                }

                this.multiRowStartPoint = { x: pointer.x, y: pointer.y };
                this.rowStart = this.getSnappedRowStart(pointer);

                this.isDrawingFirstRow = true;
                this.firstRowSeatCount = 0;
                this.rowAngle = 0;
                this.multiRowDirection = null;

                this.clearAllPreviews(canvas);
                return;
            }

            // START MULTI ROW DRAG (ONLY AFTER FIRST ROW FINALIZED)
            if (this.isFirstRowFinalized) {
                this.multiRowActive = true;
                this.multiRowStartPoint = { x: pointer.x, y: pointer.y };

                this.firstRowBaseX = this.firstRowStartX;
                this.firstRowBaseY = this.firstRowStartY;
            }
        });

        canvas.on("mouse:move", (opt) => {

            const canvas = this.canvases[canvasId];

            // ✅ FIXED: removed firstRowSeatCount === 0
            if (this.mode === "multiRow" && this.isDrawingFirstRow) {
                const pointer = canvas.getPointer(opt.e);
                this.updateMultiRowFirstRowPreview(canvas, pointer, opt);
                return;
            }

            if (this.mode === "multiRow" && this.multiRowActive && this.firstRowSeatCount > 0) {
                const pointer = canvas.getPointer(opt.e);
                this.updateMultiRowPreviewAllDirections(canvas, pointer, opt);
                return;
            }
        });

        canvas.on("mouse:up", (opt) => {
            const canvas = this.canvases[canvasId];

            // FINISH FIRST ROW
            //if (this.mode === "multiRow" && this.isDrawingFirstRow && this.firstRowSeatCount > 0) {

            //    this.isDrawingFirstRow = false;
            //    this.isFirstRowFinalized = true;

            //    this.firstRowStartX = this.rowStart.x;
            //    this.firstRowStartY = this.rowStart.y;
            //    this.firstRowBaseX = this.rowStart.x;
            //    this.firstRowBaseY = this.rowStart.y;

            //    this.firstRowAngle = this.rowAngle;

            //    if (this.straightLineGuide) {
            //        canvas.remove(this.straightLineGuide);
            //        this.straightLineGuide = null;
            //    }

            //    this.createActualRowFromPreview(canvas);
            //    this.clearAllPreviews(canvas);
            //    return;
            //}
            if (this.mode === "multiRow" && this.isDrawingFirstRow && this.firstRowSeatCount > 0) {

                this.isDrawingFirstRow = false;
                this.isFirstRowFinalized = true;

                this.firstRowStartX = this.rowStart.x;
                this.firstRowStartY = this.rowStart.y;
                this.firstRowBaseX = this.rowStart.x;
                this.firstRowBaseY = this.rowStart.y;

                this.firstRowAngle = this.rowAngle;

                if (this.straightLineGuide) {
                    canvas.remove(this.straightLineGuide);
                    this.straightLineGuide = null;
                }

                this.createActualRowFromPreview(canvas);
                this.clearAllPreviews(canvas);

                // START MULTI-ROW MODE IMMEDIATELY
                this.multiRowActive = true;
                this.multiRowStartPoint = {
                    x: opt.pointer.x,
                    y: opt.pointer.y
                };

                return;
            }
            // FINISH MULTI ROW
            if (this.mode === "multiRow" && this.multiRowActive) {

                this.multiRowActive = false;

                this.createActualRowsFromPreviewsAllDirections(canvas);
                this.clearAllPreviews(canvas);
                this.clearGeneratedRows(canvas);

                // RESET EVERYTHING
                this.firstRowSeatCount = 0;
                this.firstRowAngle = 0;
                this.firstRowStartX = null;
                this.firstRowStartY = null;
                this.firstRowBaseX = null;
                this.firstRowBaseY = null;

                this.multiRowStartPoint = null;
                this.multiRowCurrentPoint = null;
                this.multiRowDirection = null;
                this.multiRowPreviewRows = [];

                this.isFirstRowFinalized = false; // IMPORTANT RESET

                return;
            }
        });


        // Segment row creation
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "segmentRow") return;
            const p = canvas.getPointer(opt.e);
            startX = p.x;
            startY = p.y;
            dragDirection = null;
            segmentActive = true;
        });

        canvas.on("mouse:move", (opt) => {
            if (!segmentActive || this.mode !== "segmentRow") return;
            const p = canvas.getPointer(opt.e);
            const dx = p.x - startX;
            const dy = p.y - startY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (absDx < 5 && absDy < 5) return;
            if (!dragDirection) {
                if (absDx > directionThreshold || absDy > directionThreshold) {
                    dragDirection = absDx > absDy ? "horizontal" : "vertical";
                } else {
                    return;
                }
            }
            currentRowPreview.forEach(s => {
                if (canvas.contains(s)) {
                    canvas.remove(s);
                }
            });
            currentRowPreview = [];
            drawGuideLines(dragDirection, dx, dy);
            createDynamicPreview(dx, dy, true, dragDirection);
        });

        canvas.on("mouse:up", () => {
            if (this.mode !== "segmentRow") return;
            segmentActive = false;
            previewseats = previewseats.concat(currentRowPreview);
            currentRowPreview.forEach(obj => {
                previewseats.push(obj);
            });
            currentRowPreview = [];
            if (guideLine && canvas.contains(guideLine)) {
                canvas.remove(guideLine);
            }
            if (crossGuideLine && canvas.contains(crossGuideLine)) {
                canvas.remove(crossGuideLine);
            }
            guideLine = null;
            crossGuideLine = null;
        });

        canvas.on("mouse:dblclick", () => {
            if (this.mode !== "segmentRow") return;
            if (previewseats.length === 0) return;
            finalizeSegment();
        });

        //canvas.on('object:moving', (opt) => {
        //    const target = opt.target;
        //    if (!target) return;

        //    // ---- NEW: Update rectangle labels ----
        //    if (target.type === 'activeSelection') {
        //        target.getObjects().forEach(obj => {
        //            this.updateRectangleLabel(obj);
        //        });
        //    } else {
        //        this.updateRectangleLabel(target);
        //    }
        //    if (this.mode !== "select") return;

        //    if (target.type !== 'activeSelection' && target.type !== 'group') return;
        //    const bounds = target.getBoundingRect(true);
        //    const seatRadius = 8;
        //    const firstCenterX = bounds.left + seatRadius;
        //    const lastCenterX = bounds.left + bounds.width - seatRadius;
        //    this.updateDragGuides(canvas, firstCenterX, lastCenterX);
        //});
        canvas.on('object:moving', (opt) => {
            const target = opt.target;
            if (!target) return;

            // Existing rectangle label code
            if (target.type === 'activeSelection') {
                target.getObjects().forEach(obj => {

                    // Move row labels with seats
                    if (obj.type === 'group' && obj.rowLabelObject) {

                        const rowSeats = canvas.getObjects().filter(o =>
                            o.type === 'group' &&
                            o.rowId === obj.rowId
                        );

                        if (rowSeats.length > 0) {

                            // Find first seat in the row
                            rowSeats.sort((a, b) => a.left - b.left);

                            const firstSeat = rowSeats[0];

                            obj.rowLabelObject.set({
                                left: firstSeat.left - 25,
                                top: firstSeat.top
                            });

                            obj.rowLabelObject.setCoords();
                        }
                    }

                    this.updateRectangleLabel(obj);
                });
            }
            else {

                // Single row move
                if (target.type === 'group' && target.rowLabelObject) {

                    const rowSeats = canvas.getObjects().filter(o =>
                        o.type === 'group' &&
                        o.rowId === target.rowId
                    );

                    if (rowSeats.length > 0) {

                        rowSeats.sort((a, b) => a.left - b.left);

                        const firstSeat = rowSeats[0];

                        target.rowLabelObject.set({
                            left: firstSeat.left - 25,
                            top: firstSeat.top
                        });

                        target.rowLabelObject.setCoords();
                    }
                }

                this.updateRectangleLabel(target);
            }

            canvas.requestRenderAll();
        });
        canvas.on('object:modified', () => {
            this.clearDragGuides(canvas);
        });

        canvas.on('selection:cleared', () => {
            this.clearDragGuides(canvas);
        });

        canvas.on('mouse:wheel', function (opt) {
            let delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 3) zoom = 3;
            if (zoom < 0.5) zoom = 0.5;
            canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });
        canvas.on('object:scaling', (opt) => {
            this._isScaling = true;
            const target = opt.target;
            if (!target) return;

            // Update rectangle labels
            if (target.type === 'activeSelection') {
                target.getObjects().forEach(obj => {
                    this.updateRectangleLabel(obj);
                });
            } else {
                this.updateRectangleLabel(target);
            }
            if (this.mode !== "select") return;


            // Check if we are modifying an active selection of multiple seats belonging to a row
            if (target.type === 'activeSelection' || target.type === 'group') {
                this.handleRowLiveResize(canvas, target, opt);

            }

        });

        canvas.on('object:modified', (opt) => {
            const target = opt.target;
            if (!target) return;
            if (target.type === 'activeSelection') {
                target.getObjects().forEach(obj => {
                    this.updateRectangleLabel(obj);
                });
            } else {
                this.updateRectangleLabel(target);
            }
            if (this.mode !== "select") return;
            if (target.type === 'activeSelection' || target.type === 'group') {
                // Only resize if we were scaling, not just moving
                if (this._isScaling) {
                    this.finalizeRowResize(canvas, target);
                    this._isScaling = false; // reset flag
                }
            }
            this.clearDragGuides(canvas);
        });
        this.enableTouchZoomEnhanced(canvasId);

        const canvasEl = document.getElementById(canvasId);
        if (canvasEl) {
            canvasEl.style.touchAction = 'none';
            canvasEl.style.userSelect = 'none';
            canvasEl.style.webkitUserSelect = 'none';
        }
    },

    enableAdminMode(canvasId) {
        this.mode = 'admin';
        const canvas = this.canvases[canvasId];
        canvas.selection = false;
        canvas.forEachObject(o => {
            o.selectable = false; o.evented = false;
        });
    },

    //enableUserMode(canvasId, Seatdetails, ChartId) {
    //    debugger;
    //    const canvas = this.canvases[canvasId];
    //    var seats = "";
    //    this.mode = "user";
    //    this.isDrawingSeats = false;
    //    canvas.selection = false;
    //    canvas.off("mouse:move");
    //    canvas.off("mouse:down");
    //    canvas.off("mouse:up");
    //    if (!canvas.selectedSeats) {
    //        canvas.selectedSeats = [];
    //    } else {
    //        canvas.selectedSeats = [];
    //    }
    //    this.applyStatusColors(canvasId, Seatdetails);
    //    canvas.forEachObject(obj => {
    //        obj.selectable = false;
    //        obj.evented = true;
    //        obj.lockMovementX = true;
    //        obj.lockMovementY = true;
    //        obj.hasControls = false;
    //        obj.hoverCursor = 'pointer';
    //        if (typeof obj.isSelected === 'undefined') {
    //            obj.isSelected = false;
    //        }
    //        let textChild = null;
    //        if (obj.textObj) textChild = obj.textObj;
    //        if (!textChild && obj._objects && obj._objects.length) {
    //            textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
    //        }
    //        if (textChild) {
    //            if (typeof obj.originalLabel === 'undefined') {
    //                obj.originalLabel = textChild.text || '';
    //            }
    //            textChild.set('text', '');
    //            obj.textObj = textChild;
    //        }
    //    });
    //    canvas.renderAll();

    //    canvas.on("mouse:over", function (opt) {
    //        if (!opt.target || opt.target.type !== "group") return;
    //        let seat = opt.target;
    //        const seatStatus = seat.seatStatus || seat.get('seatStatus') || 'available';
    //        if (seatStatus == "sold") return;
    //        let categoryId = seat.categoryName || seat.get("categoryName") || "";

    //        let priceObj = window.globalPriceList.find(x => x.category === categoryId);
    //        let price = "Unknown";
    //        if (priceObj.ticketTypes == null) {
    //            price = priceObj ? priceObj.price : "Unknown";
    //        }
    //        else {
    //            //var a = priceObj.ticketTypes[0].price;
    //            //var b = priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
    //            //price = priceObj.ticketTypes[0].price + "-" + priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
    //            var a = parseFloat(priceObj.ticketTypes[0].price);
    //            var b = parseFloat(priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price);

    //            var minPrice = Math.min(a, b);
    //            var maxPrice = Math.max(a, b);

    //             price = minPrice + "-" + maxPrice;
    //        }
    //        showTooltip(opt.e.clientX, opt.e.clientY,
    //            `Category : ${categoryId}<br>Seat : ${seat.seatId}<br>Price : $${price}`);
    //    });

    //    canvas.on("mouse:out", function () {
    //        hideTooltip();
    //    });

    //    canvas.on("mouse:down", (opt) => {
    //        debugger;
    //        let seat = opt.target;
    //        let categoryId = seat.categoryName || seat.get("categoryName") || "";
    //        let priceObj = window.globalPriceList.find(x => x.category === categoryId);

    //        if (!seat) return;
    //        if (seat.type === 'group') {
    //            if (seat.type !== 'group') seat = seat.group;
    //            if (!seat) return;
    //            let seatStatus = 'available';
    //            for (var item of Seatdetails) {
    //                if (item.seat_name == seat.seatId) {
    //                    seatStatus = item.status;
    //                }
    //            }
    //            if (seatStatus === 'sold' || seatStatus === 'booked' || seatStatus == "Reserved") {
    //                return;
    //            }
    //            const textObj = seat.textObj;
    //            if (!textObj) return;
    //            let SEATID = '';
    //            if (seat.seatId && seat.seatId !== "") {
    //                SEATID = seat.seatId;
    //            } else if (seat.get('seatId') && seat.get('seatId') !== "") {
    //                SEATID = seat.get('seatId');
    //            } else if (seat.seatLabel && seat.seatLabel !== "") {
    //                SEATID = "Seat-" + seat.seatLabel;
    //            } else if (textObj.text && textObj.text !== "" && textObj.text !== "✔") {
    //                SEATID = "Seat-" + textObj.text;
    //            } else {
    //                SEATID = "Seat-unknown";
    //            }
    //            const seatId = seat.seatId || seat.get('seatId') || '';
    //            if (textObj.text === "✔") {
    //                textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
    //                seat.set("isSelected", false);
    //                seat.isSelected = false;
    //                seat.set("holdToken", "");
    //                const index = canvas.selectedSeats.findIndex(s => s.id === seatId);
    //                if (index !== -1) {
    //                    canvas.selectedSeats.splice(index, 1);
    //                }
    //            } else {
    //                debugger;
    //                textObj.set({ text: "✔", fontWeight: "normal", fontSize: 12 });
    //                seat.set("isSelected", true);
    //                seat.isSelected = true;
    //                const existingIndex = canvas.selectedSeats.findIndex(s => s.id === seatId);
    //                let holdToken = generateHoldToken();
    //                seat.set("holdToken", holdToken);
    //                if (existingIndex === -1) {
    //                    canvas.selectedSeats.push({
    //                        id: seatId,
    //                        label: seat.seatLabel || seat.get('seatLabel') || '',
    //                        categoryId: seat.categoryId || seat.get('categoryId') || '',
    //                        seatType: seat.seatType || seat.get('seatType') || '',
    //                        x: seat.left,
    //                        y: seat.top,
    //                        holdtoken: holdToken,
    //                        categoryName: seat.categoryName || seat.get('categoryName') || '',
    //                        pricing: priceObj,
    //                    });
    //                    if (seatId != undefined) {
    //                        if (seats == "") {
    //                            seats = seatId;
    //                        } else {
    //                            seats += "," + seatId;
    //                        }
    //                    }
    //                }
    //                saveHoldToken(ChartId, seatId, holdToken);
    //            }
    //            debugger;
    //            var selected = canvas.selectedSeats;
    //            if (window.receiveSelectedSeatsFromBlazor) {
    //                window.receiveSelectedSeatsFromBlazor(selected);
    //            }
    //            canvas.renderAll();
    //        } else if (seat.type === 'rect' && seat.objectType === 'genrectangle') {
    //            this.handleGenRectangleSelection(canvasId, seat, opt.e);
    //        }
    //    });
    //},
    //enableUserMode(canvasId, Seatdetails, ChartId) {
    //    debugger;
    //    const canvas = this.canvases[canvasId];
    //    var seats = "";
    //    this.mode = "user";
    //    this.isDrawingSeats = false;
    //    canvas.selection = false;
    //    canvas.off("mouse:move");
    //    canvas.off("mouse:down");
    //    canvas.off("mouse:up");

    //    // Store seat details for reference
    //    this._seatDetails = Seatdetails;
    //    this._chartId = ChartId;
    //    this._pendingSeatSelection = null; // Store pending seat selection

    //    if (!canvas.selectedSeats) {
    //        canvas.selectedSeats = [];
    //    } else {
    //        canvas.selectedSeats = [];
    //    }

    //    this.applyStatusColors(canvasId, Seatdetails);

    //    canvas.forEachObject(obj => {
    //        obj.selectable = false;
    //        obj.evented = true;
    //        obj.lockMovementX = true;
    //        obj.lockMovementY = true;
    //        obj.hasControls = false;
    //        obj.hoverCursor = 'pointer';
    //        if (typeof obj.isSelected === 'undefined') {
    //            obj.isSelected = false;
    //        }
    //        let textChild = null;
    //        if (obj.textObj) textChild = obj.textObj;
    //        if (!textChild && obj._objects && obj._objects.length) {
    //            textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
    //        }
    //        if (textChild) {
    //            if (typeof obj.originalLabel === 'undefined') {
    //                obj.originalLabel = textChild.text || '';
    //            }
    //            textChild.set('text', '');
    //            obj.textObj = textChild;
    //        }
    //    });
    //    canvas.renderAll();

    //    canvas.on("mouse:over", function (opt) {
    //        if (!opt.target || opt.target.type !== "group") return;
    //        let seat = opt.target;
    //        const seatStatus = seat.seatStatus || seat.get('seatStatus') || 'available';
    //        if (seatStatus == "sold") return;
    //        let categoryId = seat.categoryName || seat.get("categoryName") || "";
    //        let priceObj = window.globalPriceList.find(x => x.category === categoryId);
    //        // let price = priceObj ? priceObj.price : "Unknown";
    //        let price = "Unknown";
    //                if (priceObj.ticketTypes == null) {
    //                    price = priceObj ? priceObj.price : "Unknown";
    //                }
    //                else {
    //                    //var a = priceObj.ticketTypes[0].price;
    //                    //var b = priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
    //                    //price = priceObj.ticketTypes[0].price + "-" + priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
    //                    var a = parseFloat(priceObj.ticketTypes[0].price);
    //                    var b = parseFloat(priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price);

    //                    var minPrice = Math.min(a, b);
    //                    var maxPrice = Math.max(a, b);

    //                     price = minPrice + "-" + maxPrice;
    //                }
    //        showTooltip(opt.e.clientX, opt.e.clientY,
    //            `Category : ${categoryId}<br>Seat : ${seat.seatId}<br>Price : $${price}`);
    //    });

    //    canvas.on("mouse:out", function () {
    //        hideTooltip();
    //    });

    //    // Updated mouse:down handler with ticket type popup
    //    canvas.on("mouse:down", (opt) => {
    //        debugger;
    //        let seat = opt.target;

    //        if (!seat) {
    //            // Check if click was on a seat at this position (for row labels or empty space)
    //            const pointer = canvas.getPointer(opt.e);
    //            seat = canvas.getObjects().find(obj => {
    //                if (obj.type !== 'group' || !obj.seatId) return false;
    //                const b = obj.getBoundingRect();
    //                return pointer.x >= b.left && pointer.x <= b.left + b.width &&
    //                    pointer.y >= b.top && pointer.y <= b.top + b.height;
    //            }) || null;
    //        }

    //        if (!seat) return;

    //        // Handle seat selection
    //        if (seat.type === 'group') {
    //            if (seat.type !== 'group') seat = seat.group;
    //            if (!seat) return;

    //            let seatStatus = 'available';
    //            for (var item of Seatdetails) {
    //                if (item.seat_name == seat.seatId) {
    //                    seatStatus = item.status;
    //                }
    //            }

    //            if (seatStatus === 'sold' || seatStatus === 'booked' || seatStatus == "Reserved") {
    //                return;
    //            }

    //            const textObj = seat.textObj;
    //            if (!textObj) return;

    //            const seatId = seat.seatId || seat.get('seatId') || '';

    //            // If seat is already selected, deselect it
    //            if (textObj.text === "✔") {
    //                textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
    //                seat.set("isSelected", false);
    //                seat.isSelected = false;
    //                seat.set("holdToken", "");
    //                const index = canvas.selectedSeats.findIndex(s => s.id === seatId);
    //                if (index !== -1) {
    //                    canvas.selectedSeats.splice(index, 1);
    //                }
    //                canvas.renderAll();
    //                var selected = canvas.selectedSeats;
    //                if (window.receiveSelectedSeatsFromBlazor) {
    //                    window.receiveSelectedSeatsFromBlazor(selected);
    //                }
    //                return;
    //            }

    //            // Get category and price info
    //            let categoryId = seat.categoryName || seat.get("categoryName") || "";
    //            let priceObj = window.globalPriceList.find(x => x.category === categoryId);

    //            // Store the seat for later use
    //            this._pendingSeatSelection = {
    //                seat: seat,
    //                seatId: seatId,
    //                categoryId: categoryId,
    //                priceObj: priceObj,
    //                canvas: canvas
    //            };

    //            // Show ticket type popup
    //            this.showTicketTypePopup(canvasId, seat, priceObj);

    //        } else if (seat.type === 'rect' && seat.objectType === 'genrectangle') {
    //            this.handleGenRectangleSelection(canvasId, seat, opt.e);
    //        }
    //    });
    //},
    enableUserMode(canvasId, Seatdetails, ChartId) {
        debugger;
        const canvas = this.canvases[canvasId];
        var seats = "";
        this.mode = "user";
        this.isDrawingSeats = false;
        canvas.selection = false;
        canvas.off("mouse:move");
        canvas.off("mouse:down");
        canvas.off("mouse:up");

        // Store seat details for reference
        this._seatDetails = Seatdetails;
        this._chartId = ChartId;
        this._pendingSeatSelection = null; // Store pending seat selection

        if (!canvas.selectedSeats) {
            canvas.selectedSeats = [];
        } else {
            canvas.selectedSeats = [];
        }

        this.applyStatusColors(canvasId, Seatdetails);

        canvas.forEachObject(obj => {
            obj.selectable = false;
            obj.evented = true;
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.hasControls = false;
            obj.hoverCursor = 'pointer';
            if (typeof obj.isSelected === 'undefined') {
                obj.isSelected = false;
            }
            let textChild = null;
            if (obj.textObj) textChild = obj.textObj;
            if (!textChild && obj._objects && obj._objects.length) {
                textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
            }
            if (textChild) {
                if (typeof obj.originalLabel === 'undefined') {
                    obj.originalLabel = textChild.text || '';
                }
                textChild.set('text', '');
                obj.textObj = textChild;
            }
        });
        canvas.renderAll();

        canvas.on("mouse:over", function (opt) {
            if (!opt.target || opt.target.type !== "group") return;
            let seat = opt.target;
            const seatStatus = seat.seatStatus || seat.get('seatStatus') || 'available';
            if (seatStatus == "sold") return;
            let categoryId = seat.categoryName || seat.get("categoryName") || "";
            let priceObj = window.globalPriceList.find(x => x.category === categoryId);
            // let price = priceObj ? priceObj.price : "Unknown";
            let price = "Unknown";
            if (!priceObj || priceObj.ticketTypes == null) {
                price = priceObj ? priceObj.price : "Unknown";
            }
            else {
                //var a = priceObj.ticketTypes[0].price;
                //var b = priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
                //price = priceObj.ticketTypes[0].price + "-" + priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price;
                var a = parseFloat(priceObj.ticketTypes[0].price);
                var b = parseFloat(priceObj.ticketTypes[priceObj.ticketTypes.length - 1].price);

                var minPrice = Math.min(a, b);
                var maxPrice = Math.max(a, b);

                price = minPrice + "-" + maxPrice;
            }
            showTooltip(opt.e.clientX, opt.e.clientY,
                `Category : ${categoryId}<br>Seat : ${seat.seatId}<br>Price : $${price}`);
        });

        canvas.on("mouse:out", function () {
            hideTooltip();
        });

        // Updated mouse:down handler with ticket type popup
        canvas.on("mouse:down", (opt) => {
            debugger;
            let seat = opt.target;

            if (!seat) {
                // Check if click was on a seat at this position (for row labels or empty space)
                const pointer = canvas.getPointer(opt.e);
                seat = canvas.getObjects().find(obj => {
                    if (obj.type !== 'group' || !obj.seatId) return false;
                    const b = obj.getBoundingRect();
                    return pointer.x >= b.left && pointer.x <= b.left + b.width &&
                        pointer.y >= b.top && pointer.y <= b.top + b.height;
                }) || null;
            }

            if (!seat) return;

            // Handle seat selection
            if (seat.type === 'group') {
                if (seat.type !== 'group') seat = seat.group;
                if (!seat) return;

                let seatStatus = 'available';
                for (var item of Seatdetails) {
                    if (item.seat_name == seat.seatId) {
                        seatStatus = item.status;
                    }
                }

                if (seatStatus === 'sold' || seatStatus === 'booked' || seatStatus == "Reserved") {
                    return;
                }

                const textObj = seat.textObj;
                if (!textObj) return;

                const seatId = seat.seatId || seat.get('seatId') || '';

                // If seat is already selected, deselect it
                if (textObj.text === "✔") {
                    textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
                    seat.set("isSelected", false);
                    seat.isSelected = false;
                    seat.set("holdToken", "");
                    const index = canvas.selectedSeats.findIndex(s => s.id === seatId);
                    if (index !== -1) {
                        canvas.selectedSeats.splice(index, 1);
                    }
                    canvas.renderAll();
                    //var selected = canvas.selectedSeats;
                    const selected = this.getAllSelections(canvas);
                    if (window.receiveSelectedSeatsFromBlazor) {
                        window.receiveSelectedSeatsFromBlazor(selected);
                    }
                    return;
                }

                // Get category and price info
                let categoryId = seat.categoryName || seat.get("categoryName") || "";
                let priceObj = window.globalPriceList.find(x => x.category === categoryId);

                // Store the seat for later use
                this._pendingSeatSelection = {
                    seat: seat,
                    seatId: seatId,
                    categoryId: categoryId,
                    priceObj: priceObj,
                    canvas: canvas
                };

                // Show ticket type popup
                this.showTicketTypePopup(canvasId, seat, priceObj);

            } else if (seat.type === 'rect' && seat.objectType === 'genrectangle') {
                this.handleGenRectangleSelection(canvasId, seat, opt.e, this._chartId);
            }
        });
    },
    getAllSelections(canvas) {
        const selectedGAAreas = canvas.selectedGAAreas || [];
        const allSelectedSeats = canvas.selectedSeats || [];

        let allSelections = [];

        // Normal seats
        allSelections = allSelections.concat(allSelectedSeats);

        // GA Areas
        selectedGAAreas.forEach(area => {

            const ticketCount = area.ticketCount || 0;

            const rectangle = canvas.getObjects().find(obj =>
                obj.rectangleId === area.id &&
                obj.objectType === "genrectangle"
            );

            let priceObj = window.globalPriceList.find(
                x => x.category === area.categoryName
            );

            let price = "Unknown";
            if (priceObj && priceObj.ticketTypes == null) {
                price = priceObj.price;
            }

            for (let i = 0; i < ticketCount; i++) {

                allSelections.push({
                    id: area.categoryName || rectangle?.categoryName || "General",
                    label: area.label || area.categoryName || "General Area",
                    categoryId: rectangle?.categoryId || "",
                    categoryName: area.categoryName || rectangle?.categoryName || "",
                    ticketType: "",
                    ticketTypeName: "",
                    ticketNumber: i + 1,
                    x: rectangle?.left || 0,
                    y: rectangle?.top || 0,
                    width: rectangle?.width || 0,
                    height: rectangle?.height || 0,
                    pricing: priceObj || null,
                    price: price || null,
                    seatType: area.seatType || "GA",
                    seatStatus: "available"
                });
            }
        });

        return allSelections;
    },
    createTicketPopup() {
        // Check if popup already exists
        if (document.getElementById('ticketTypePopup')) {
            return;
        }

        const popup = document.createElement('div');
        popup.id = 'ticketTypePopup';
        popup.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        justify-content: center;
        align-items: center;
    `;

        popup.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            animation: scaleIn 0.3s ease;
            position: relative;
        ">
            <button id="closeTicketPopupBtn" style="
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 0;
                line-height: 1;
            ">×</button>
            
            <h3 style="margin-top: 0; color: #333; font-size: 18px;" id="ticketPopupTitle">Select Ticket Type</h3>
            <p style="color: #666; margin-bottom: 20px; font-size: 14px;" id="ticketPopupSeat">Seat: </p>
            
            <div id="ticketTypeList" style="margin-bottom: 20px;">
                <!-- Ticket types will be dynamically added here -->
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelTicketBtn" style="
                    padding: 10px 24px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                ">Cancel</button>
            </div>
        </div>
    `;

        document.body.appendChild(popup);

        // Add styles for ticket type options if not already present
        if (!document.getElementById('ticketTypeStyles')) {
            const style = document.createElement('style');
            style.id = 'ticketTypeStyles';
            style.textContent = `
            .ticket-type-option {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 8px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
            }
            
            .ticket-type-option:hover {
                border-color: #2196F3;
                background: #f5f9ff;
                transform: translateX(4px);
            }
            
            .ticket-type-option.selected {
                border-color: #4CAF50;
                background: #f0f8f0;
            }
            
            .ticket-type-option .ticket-type-name {
                font-weight: 500;
                color: #333;
                font-size: 14px;
            }
            
            .ticket-type-option .ticket-type-price {
                color: #4CAF50;
                font-weight: bold;
                font-size: 14px;
            }
            
            .ticket-type-option .ticket-type-description {
                font-size: 12px;
                color: #888;
                margin-top: 2px;
            }
            
            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `;
            document.head.appendChild(style);
        }
    },
    showTicketTypePopup(canvasId, seat, priceObj) {
        // Create popup if it doesn't exist
        this.createTicketPopup();

        const canvas = this.canvases[canvasId];
        const popup = document.getElementById('ticketTypePopup');
        const listContainer = document.getElementById('ticketTypeList');
        const seatInfo = document.getElementById('ticketPopupSeat');
        const title = document.getElementById('ticketPopupTitle');

        if (!popup || !listContainer) {
            console.error('Ticket type popup elements not found');
            return;
        }

        // Set seat info
        const seatLabel = seat.seatLabel || seat.get('seatLabel') || '';
        const seatId = seat.seatId || seat.get('seatId') || '';
        seatInfo.textContent = `Seat: ${seatId || seatLabel || 'Unknown'}`;

        // Check if priceObj has ticket types
        let ticketTypes = [];

        // If priceObj has ticketTypes array
        if (priceObj && priceObj.ticketTypes && Array.isArray(priceObj.ticketTypes) && priceObj.ticketTypes.length > 0) {
            ticketTypes = priceObj.ticketTypes;
            title.textContent = 'Select Ticket Type';
        }
        // If priceObj has a single price (no ticket types)
        else if (priceObj && priceObj.price !== undefined && priceObj.price !== null) {
            // Single ticket type - auto-select
            this.confirmSeatSelection(canvasId, seat, priceObj, priceObj.price, "");
            return;
        }
        else {
            // No price info - show error or auto-select with default
            showNotification('No pricing information available for this seat', 'warning');
            return;
        }

        // Clear existing list
        listContainer.innerHTML = '';

        // Add ticket type options
        ticketTypes.forEach((ticketType, index) => {
            debugger;
            const optionDiv = document.createElement('div');
            optionDiv.className = 'ticket-type-option';

            const priceValue = ticketType.price || ticketType.amount || 0;
            const nameValue = ticketType.category + "-" + ticketType.ticketType || 'Undefined';
            const descValue = ticketType.description || '';

            optionDiv.innerHTML = `
            <div>
                <div class="ticket-type-name">${nameValue}</div>
                ${descValue ? `<div class="ticket-type-description">${descValue}</div>` : ''}
            </div>
            <span class="ticket-type-price">$${priceValue}</span>
        `;

            optionDiv.dataset.price = priceValue;
            optionDiv.dataset.name = nameValue;

            optionDiv.addEventListener('click', () => {
                // Remove selected class from all options
                document.querySelectorAll('.ticket-type-option').forEach(el => {
                    el.classList.remove('selected');
                });
                optionDiv.classList.add('selected');

                // Confirm selection with the chosen ticket type
                const selectedPrice = parseFloat(optionDiv.dataset.price);
                const selectedName = optionDiv.dataset.name;
                debugger;
                this.confirmSeatSelection(canvasId, seat, priceObj, selectedPrice, selectedName);
            });

            listContainer.appendChild(optionDiv);
        });

        // Show popup
        popup.style.display = 'flex';

        // Handle close button
        const closeBtn = document.getElementById('closeTicketPopupBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                popup.style.display = 'none';
                this._pendingSeatSelection = null;
            };
        }

        // Handle cancel button
        const cancelBtn = document.getElementById('cancelTicketBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                popup.style.display = 'none';
                this._pendingSeatSelection = null;
            };
        }

        // Close popup when clicking outside
        popup.onclick = (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
                this._pendingSeatSelection = null;
            }
        };

        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                popup.style.display = 'none';
                this._pendingSeatSelection = null;
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    },
    confirmSeatSelection(canvasId, seat, priceObj, selectedPrice, ticketTypeName) {
        debugger;
        const canvas = this.canvases[canvasId];
        const popup = document.getElementById('ticketTypePopup');

        // Close popup
        if (popup) {
            popup.style.display = 'none';
        }

        // Get seat details
        const seatId = seat.seatId || seat.get('seatId') || '';
        const textObj = seat.textObj;
        if (!textObj) return;

        // Check if seat is already selected
        if (textObj.text === "✔") {
            return;
        }

        // Select the seat
        textObj.set({ text: "✔", fontWeight: "normal", fontSize: 12 });
        seat.set("isSelected", true);
        seat.isSelected = true;

        // Generate hold token
        let holdToken = generateHoldToken();
        seat.set("holdToken", holdToken);

        // Check if already in selected list
        const existingIndex = canvas.selectedSeats.findIndex(s => s.id === seatId);
        if (existingIndex === -1) {
            // Create selected seat object with ticket type info
            const selectedSeat = {
                id: seatId,
                label: seat.seatLabel || seat.get('seatLabel') || '',
                categoryId: seat.categoryId || seat.get('categoryId') || '',
                seatType: seat.seatType || seat.get('seatType') || '',
                x: seat.left,
                y: seat.top,
                holdtoken: holdToken,
                categoryName: seat.categoryName || seat.get('categoryName') || '',
                pricing: {
                    ...priceObj,
                    selectedPrice: selectedPrice,
                    ticketType: ticketTypeName
                },
                ticketType: ticketTypeName,
                price: selectedPrice,
                ticketTypeName: ticketTypeName
            };

            canvas.selectedSeats.push(selectedSeat);

            // Save hold token
            if (this._chartId) {
                saveHoldToken(this._chartId, seatId, holdToken);
            }
        }

        canvas.renderAll();

        // Send selected seats to parent
        // var selected = canvas.selectedSeats;
        const selected = this.getAllSelections(canvas);
        if (window.receiveSelectedSeatsFromBlazor) {
            window.receiveSelectedSeatsFromBlazor(selected);
        }

        this._pendingSeatSelection = null;

        // Show success message
        //if (seatId) {
        //    showNotification(`Seat ${seatId} selected with ${ticketTypeName} ticket`, 'success');
        //}
    },
    applyStatusColors(canvasId, SeatInfo) {
        const canvas = this.canvases[canvasId];
        const seats = canvas.getObjects().filter(obj => obj.type === 'group' && obj.seatId);
        seats.forEach(seat => {
            if (!seat.circle) return;
            let color;
            for (var item of SeatInfo) {
                if (item.seat_name == seat.seatId) {
                    switch (item.status) {
                        case 'sold':
                        case 'booked':
                        case 'Reserved':
                            color = "#e7e7e7";
                            break;
                        case 'selected':
                            color = "#4CAF50";
                            break;
                        case 'available':
                        default:
                            color = seat.categoryId || "#f2fd58";
                            break;
                    }
                    if (item.status == "sold" || item.status == "booked" || item.status == "Reserved") {
                        seat.set('hoverCursor', 'default');
                    } else {
                        seat.set('hoverCursor', 'pointer');
                    }
                    if (seat.circle) {
                        if (item.status == "sold" || item.status == "booked") {
                            seat.circle.set('hoverCursor', 'default');
                        } else {
                            seat.circle.set('hoverCursor', 'pointer');
                        }
                    }
                    seat.circle.set('fill', color);
                    seat.circle.set('stroke', color);
                    seat.circle.set('dirty', true);
                }
            }
        });
        canvas.renderAll();
    },

    enableSelectMode(canvasId) {
        this.disableRowCreateMode(canvasId);
        resetSegmentRowState();
        const canvas = this.canvases[canvasId];
        this.clearRowGuide(canvas);
        clearPreview();
        this.mode = "select";
        this.setMode("select");
        this.isDrawingSeats = false;
        canvas.selection = true;
        canvas.forEachObject(o => o.selectable = true);
        saveState(canvas);
        canvas.on("mouse:dblclick", function (opt) {
            if (!opt.target || opt.target.type !== "group") return;
            const rowId = opt.target.rowId;
            if (!rowId) return;
            const seats = canvas.getObjects().filter(o => o.type === "group" && o.rowId === rowId);
            const sel = new fabric.ActiveSelection(seats, { canvas });
            sel.borderColor = "rgb(7, 132, 250)";
            sel.cornerColor = "rgb(7, 132, 250)";
            sel.cornerStrokeColor = "#ffffff";
            canvas.setActiveObject(sel);
            canvas.renderAll();
        });
        canvas.on("mouse:down", (opt) => {
            if (this.mode !== "select") return;
            const target = opt.target;
            if (target && target.type === "group" && target.rowId) {
                const rowId = target.rowId;
                const rowSeats = canvas.getObjects().filter(o => o.type === "group" && o.rowId === rowId);
                const labels = new Set();
                const allToSelect = [];
                rowSeats.forEach(seat => {
                    allToSelect.push(seat);
                    if (seat.rowLabelObject && !labels.has(seat.rowLabelObject)) {
                        labels.add(seat.rowLabelObject);
                        allToSelect.push(seat.rowLabelObject);
                    }
                });
                canvas.discardActiveObject();
                const sel = new fabric.ActiveSelection(allToSelect, { canvas });
                sel.set({
                    borderColor: "rgb(7, 132, 250)",
                    cornerColor: "rgb(7, 132, 250)",
                    backgroundColor: "rgba(7, 132, 250, 0.3)"
                });
                canvas.setActiveObject(sel);
                canvas.renderAll();
                opt.e.preventDefault();
                opt.e.stopPropagation();
            }
        });
        this.showValidation(canvas);
    },

    //handleRowSelection(canvas, opt) {
    //    if (!opt.selected || opt.selected.length === 0) return;
    //    const selected = opt.selected;
    //    const selectedRowIds = new Set();
    //    selected.forEach(obj => {
    //        if (obj.type === "group" && obj.rowId) {
    //            selectedRowIds.add(obj.rowId);
    //        }
    //    });
    //    if (selectedRowIds.size === 0) return;
    //    const allSeatsToSelect = [];
    //    selectedRowIds.forEach(rowId => {
    //        const rowSeats = canvas.getObjects().filter(o => o.type === "group" && o.rowId === rowId);
    //        allSeatsToSelect.push(...rowSeats);
    //    });
    //    const currentSelection = canvas.getActiveObject();
    //    const currentlySelected = currentSelection && currentSelection.type === 'activeSelection'
    //        ? currentSelection.getObjects()
    //        : (currentSelection ? [currentSelection] : []);
    //    if (!this.arraysEqual(currentlySelected, allSeatsToSelect)) {
    //        canvas.discardActiveObject();

    //        const sel = new fabric.ActiveSelection(allSeatsToSelect, { canvas });

    //        sel.set({
    //            borderColor: "rgb(7, 132, 250)",
    //            cornerColor: "rgb(7, 132, 250)",
    //            backgroundColor: "rgba(7, 132, 250, 0.3)"
    //        });
    //        canvas.setActiveObject(sel);
    //        canvas.renderAll();
    //    }
    //},
    handleRowSelection(canvas, opt) {
        if (!opt.selected || opt.selected.length === 0) return;
        const selected = opt.selected;
        const selectedRowIds = new Set();
        selected.forEach(obj => {
            if (obj.type === "group" && obj.rowId) {
                selectedRowIds.add(obj.rowId);
            }
        });
        if (selectedRowIds.size === 0) return;

        const allSeatsToSelect = [];
        const labelsSeen = new Set();

        selectedRowIds.forEach(rowId => {
            const rowSeats = canvas.getObjects().filter(o => o.type === "group" && o.rowId === rowId);
            allSeatsToSelect.push(...rowSeats);

            // Also collect the row label objects linked to these seats
            rowSeats.forEach(seat => {
                if (seat.rowLabelObject && !labelsSeen.has(seat.rowLabelObject)) {
                    labelsSeen.add(seat.rowLabelObject);
                    allSeatsToSelect.push(seat.rowLabelObject);
                }
            });
        });

        const currentSelection = canvas.getActiveObject();
        const currentlySelected = currentSelection && currentSelection.type === 'activeSelection'
            ? currentSelection.getObjects()
            : (currentSelection ? [currentSelection] : []);
        if (!this.arraysEqual(currentlySelected, allSeatsToSelect)) {
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(allSeatsToSelect, { canvas });
            sel.set({
                borderColor: "rgb(7, 132, 250)",
                cornerColor: "rgb(7, 132, 250)",
                backgroundColor: "rgba(7, 132, 250, 0.3)"
            });
            canvas.setActiveObject(sel);
            canvas.renderAll();
        }
    },
    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        const arr2Set = new Set(arr2);
        for (let obj of arr1) {
            if (!arr2Set.has(obj)) return false;
        }
        return true;
    },

    enableSeatCreateMode(canvasId) {
        const canvas = this.canvases[canvasId];
        this.mode = "create";
        this.setMode("create");
        this.isDrawingSeats = false;
        canvas.selection = false;
        canvas.discardActiveObject();
        canvas.forEachObject(o => o.selectable = false);
    },

    enableRectangleMode(canvasId) {
        this.disableRowCreateMode(canvasId);
        const canvas = this.canvases[canvasId];
        this.clearRowGuide(canvas);
        this.mode = "rectangle";
        this.setMode("rectangle");
        this.isDrawingRect = false;
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
        this.disableValidation();
    },

    enableGeneralCategoryMode(canvasId) {
        this.disableRowCreateMode(canvasId);
        const canvas = this.canvases[canvasId];
        this.clearRowGuide(canvas);
        this.mode = "general";
        this.setMode("general");
        this.isDrawingRect = false;
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
        this.disableValidation();
    },

    enableRowCreateMode(canvasId, direction = "horizontal") {
        const canvas = this.canvases[canvasId];
        this.mode = "row";
        this.setMode("row");
        this.rowDirection = direction;
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
        this.disableValidation();
    },

    enableSegmentRowMode(canvasId, direction = "horizontal") {
        const canvas = this.canvases[canvasId];
        this.mode = "segmentRow";
        this.setMode("segmentRow");
        this.rowDirection = direction;
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
        this.disableValidation();
    },

    enableMultipleRowMode(canvasId, direction = "horizontal") {
        const canvas = this.canvases[canvasId];
        this.mode = "multiRow";
        this.setMode("multiRow");
        this.firstRowSeatCount = 0;
        this.firstRowDirection = direction;
        this.rowDirection = direction;
        this.isDrawingMultipleRows = false;
        this.isDrawingFirstRow = false;
        this.multiRowActive = false;
        this.multiRowStartPoint = null;
        this.multiRowCurrentPoint = null;
        this.multiRowDirection = null;
        this.multiRowAngle = 0;
        this.firstRowStartX = null;
        this.firstRowStartY = null;
        this.firstRowBaseX = null;
        this.firstRowBaseY = null;
        this.lastRowX = null;
        this.lastRowY = null;
        this.rowAngle = 0;
        this.firstRowAngle = 0;
        this.clearAllPreviews(canvas);
        this.clearGeneratedRows(canvas);
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
        this.disableValidation();
    },

    disableRowCreateMode(canvasId) {
        this.mode = null;
        const canvas = this.canvases[canvasId];
        if (this.hoverStartGuide) {
            canvas.remove(this.hoverStartGuide);
            this.hoverStartGuide = null;
        }
    },

    setMode(mode) {
        this.mode = mode;
        const canvas = this.canvases["seatCanvas"];
        if (mode !== "select") {
            canvas.selection = false;
            canvas.getObjects().forEach(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
        } else {
            canvas.selection = true;
            canvas.getObjects().forEach(obj => {
                obj.selectable = true;
                obj.evented = true;
            });
        }
        canvas.renderAll();
    },

    addSeat(canvasId, x, y) {
        const canvas = this.canvases[canvasId];
        const radius = 8;
        const seatId = "Seat-" + (this.seatCounter++);
        const circle = new fabric.Circle({
            radius: radius,
            fill: "white",
            originX: "center",
            originY: "center",
            stroke: "black",
            strokeWidth: 1
        });
        const text = new fabric.Text("", {
            fontSize: 10,
            fontWeight: "bold",
            fill: "black",
            originX: "center",
            originY: "center",
            evented: false,
            selectable: false
        });
        const seatGroup = new fabric.Group([circle, text], {
            left: x,
            top: y,
            originX: "center",
            originY: "center",
            hasControls: false,
            subTargetCheck: true,
            seatLabel: "",
            seatId: seatId,
            categoryId: "",
            seatType: ""
        });
        seatGroup.circle = circle;
        seatGroup.textObj = text;
        seatGroup.seatId = seatId;
        seatGroup.seatStatus = "available";
        canvas.add(seatGroup);
        canvas.renderAll();
        this.lastSeat = { x, y };
    },

    //applySeatLabels(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    const active = canvas.getActiveObject();
    //    if (!active) return;
    //    let seats = [];
    //    if (active.type === "activeSelection") {
    //        seats = active._objects.slice();
    //    } else {
    //        seats = [active];
    //    }
    //    seats.sort((a, b) => {
    //        const rowTolerance = 15;
    //        const aRow = Math.round(a.top / rowTolerance) * rowTolerance;
    //        const bRow = Math.round(b.top / rowTolerance) * rowTolerance;
    //        if (aRow === bRow) {
    //            return a.left - b.left;
    //        }
    //        return aRow - bRow;
    //    });
    //    const ddl = document.getElementById("ddlseat").value;
    //    if (!ddl) return;
    //    const direction = document.getElementById("ddldirection")?.value || "LTR";
    //    const rows = this.groupSeatsByRow(seats);
    //    Object.keys(rows).forEach(rowKey => {
    //        const rowSeats = rows[rowKey];
    //        rowSeats.sort((a, b) => a.left - b.left);
    //        const totalSeats = rowSeats.length;
    //        rowSeats.forEach((seat, indexInRow) => {
    //            if (!seat.textObj) return;
    //            let seatIndex;
    //            if (direction === "RTL") {
    //                seatIndex = totalSeats - 1 - indexInRow;
    //            } else {
    //                seatIndex = indexInRow;
    //            }
    //            var custominput = document.getElementById("txtcustomlbl");
    //            let customlbl = "";
    //            if (custominput) {
    //                customlbl = custominput.value;
    //            }
    //            const label = this.getSeatLabel(seatIndex, ddl, customlbl);
    //            seat.textObj.set({ text: label, fill: "black" });
    //            seat.set('seatLabel', label);
    //            const rowLabel = seat.rowLabel || seat.get('rowLabel') || '';
    //            let seatId;
    //            if (rowLabel && rowLabel.trim() !== '') {
    //                seatId = rowLabel + label;
    //            } else {
    //                seatId = "Seat-" + label;
    //            }
    //            seat.set('seatId', seatId);
    //            seat.seatId = seatId;
    //        });
    //    });
    //    canvas.renderAll();
    //    saveState(canvas);
    //    this.showValidation(canvas);
    //},
    applySeatLabels(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObject();
        if (!active) return;

        let seats = [];
        if (active.type === "activeSelection") {
            seats = active._objects.slice();
        } else {
            seats = [active];
        }

        seats.sort((a, b) => {
            const rowTolerance = 15;
            const aRow = Math.round(a.top / rowTolerance) * rowTolerance;
            const bRow = Math.round(b.top / rowTolerance) * rowTolerance;
            if (aRow === bRow) return a.left - b.left;
            return aRow - bRow;
        });

        const ddl = document.getElementById("ddlseat").value;
        if (!ddl) return;

        const direction = document.getElementById("ddldirection")?.value || "LTR";
        const rows = this.groupSeatsByRow(seats);

        Object.keys(rows).forEach(rowKey => {
            const rowSeats = rows[rowKey];
            rowSeats.sort((a, b) => a.left - b.left);
            const totalSeats = rowSeats.length;

            rowSeats.forEach((seat, indexInRow) => {
                if (!seat.textObj) return;

                let seatIndex;
                if (direction === "RTL") {
                    seatIndex = totalSeats - 1 - indexInRow;
                } else {
                    seatIndex = indexInRow;
                }

                var custominput = document.getElementById("txtcustomlbl");
                let customlbl = "";
                if (custominput) {
                    customlbl = custominput.value;
                }

                const label = this.getSeatLabel(seatIndex, ddl, customlbl);
                seat.textObj.set({ text: label, fill: "black" });
                seat.set('seatLabel', label);

                const rowLabel = seat.rowLabel || seat.get('rowLabel') || '';
                let seatId;
                if (rowLabel && rowLabel.trim() !== '') {
                    seatId = rowLabel + label;
                } else {
                    seatId = "Seat-" + label;
                }
                seat.set('seatId', seatId);
                seat.seatId = seatId;

                // ✅ STORE THE FORMAT AND CUSTOM START ON THE SEAT
                seat.set('seatLabelFormat', ddl);
                if (ddl === 'custom') {
                    seat.set('customLabelStart', customlbl);
                } else {
                    seat.set('customLabelStart', '');
                }
            });
        });

        canvas.renderAll();
        saveState(canvas);
        this.showValidation(canvas);
    },
    getSeatLabel(index, format, customStart = null) {
        switch (format) {
            case "alphabetUpper":
                return this.toAlphabet(index, true);
            case "alphabetLower":
                return this.toAlphabet(index, false);
            case "roman":
                return this.toRoman(index + 1);
            case "number":
                return (index + 1).toString();
            case "custom":
                if (!customStart) return "";
                if (!isNaN(customStart)) {
                    const startNumber = parseInt(customStart);
                    return (startNumber + index).toString();
                }
                if (/^[a-zA-Z]+$/.test(customStart)) {
                    const isUpper = customStart === customStart.toUpperCase();
                    let startIndex = 0;
                    const base = isUpper ? 65 : 97;
                    for (let i = 0; i < customStart.length; i++) {
                        startIndex *= 26;
                        startIndex += (customStart.charCodeAt(i) - base + 1);
                    }
                    return this.toAlphabet(startIndex - 1 + index, isUpper);
                }
                return "";
            default:
                return "";
        }
    },

    toAlphabet(index, isUpper = true) {
        let result = "";
        let base = isUpper ? 65 : 97;
        index += 1;
        while (index > 0) {
            index--;
            result = String.fromCharCode(base + (index % 26)) + result;
            index = Math.floor(index / 26);
        }
        return result;
    },

    toRoman(num) {
        const map = [
            { v: 1000, s: 'M' }, { v: 900, s: 'CM' }, { v: 500, s: 'D' }, { v: 400, s: 'CD' },
            { v: 100, s: 'C' }, { v: 90, s: 'XC' }, { v: 50, s: 'L' }, { v: 40, s: 'XL' },
            { v: 10, s: 'X' }, { v: 9, s: 'IX' }, { v: 5, s: 'V' }, { v: 4, s: 'IV' }, { v: 1, s: 'I' }
        ];
        let result = "";
        map.forEach(({ v, s }) => {
            while (num >= v) { result += s; num -= v; }
        });
        return result;
    },

    //applyRowLabel(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    let active = canvas.getActiveObject();
    //    if (!active) {
    //        showNotification("Please select seats first.", "info");
    //        return;
    //    }
    //    let seats = [];
    //    if (active.type === "activeSelection") {
    //        seats = active._objects.filter(o => o.type === "group");
    //    } else if (active.type === "group") {
    //        seats = [active];
    //    } else {
    //        showNotification("Please select seats to label.", "info");
    //        return;
    //    }
    //    if (seats.length === 0) return;
    //    canvas.renderOnAddRemove = false;
    //    const removedLabels = new Set();
    //    seats.forEach(seat => {
    //        if (seat.rowLabelObject) {
    //            removedLabels.add(seat.rowLabelObject);
    //        }
    //        seat.set('rowLabel', '');
    //        seat.rowLabel = '';
    //        seat.rowLabelObject = null;
    //        const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
    //        if (seatLabel) {
    //            seat.set('seatId', seatLabel);
    //            seat.seatId = seatLabel;
    //        }
    //    });
    //    removedLabels.forEach(labelObj => {
    //        canvas.remove(labelObj);
    //    });
    //    seats.sort((a, b) => {
    //        const rowY = Math.round(a.top / 10) * 10;
    //        const rowY2 = Math.round(b.top / 10) * 10;
    //        if (rowY === rowY2) {
    //            return a.left - b.left;
    //        }
    //        return rowY - rowY2;
    //    });
    //    const rows = this.groupSeatsByRow(seats);
    //    const rowCount = Object.keys(rows).length;
    //    const direction = document.getElementById("ddldirection")?.value || "LTR";
    //    if (rowCount == 1) {
    //        const inputLabel = document.getElementById("txtrowlbl").value;
    //        if (inputLabel) {
    //            const rowSeats = rows[0];
    //            let anchorSeat = direction === "RTL"
    //                ? rowSeats.reduce((a, b) => getAbsolutePosition(a).x > getAbsolutePosition(b).x ? a : b)
    //                : rowSeats.reduce((a, b) => getAbsolutePosition(a).x < getAbsolutePosition(b).x ? a : b);
    //            const anchorPos = getAbsolutePosition(anchorSeat);
    //            const labelSpacing = 25;
    //            const labelX = direction === "RTL" ? anchorPos.x + labelSpacing : anchorPos.x - labelSpacing;
    //            const labelY = anchorPos.y;
    //            this.removeRowLabelsForRow(canvas, rowSeats);
    //            const rowText = this.addRowLabel(canvasId, labelX, labelY, inputLabel);
    //            rowSeats.forEach(seat => {
    //                seat.set('rowLabel', inputLabel);
    //                seat.rowLabel = inputLabel;
    //                seat.rowLabelObject = rowText;
    //                const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
    //                if (seatLabel) {
    //                    const seatId = inputLabel + seatLabel;
    //                    seat.set('seatId', seatId);
    //                    seat.seatId = seatId;
    //                }
    //            });
    //        }
    //        canvas.renderOnAddRemove = true;
    //        canvas.requestRenderAll();
    //        return;
    //    }
    //    const labelType = document.getElementById("ddlrow").value;
    //    if (!labelType) {
    //        showNotification("Please select a row label type.");
    //        canvas.renderOnAddRemove = true;
    //        return;
    //    }
    //    const sortedRowKeys = Object.keys(rows).sort((a, b) => {
    //        const posA = getAbsolutePosition(rows[a][0]);
    //        const posB = getAbsolutePosition(rows[b][0]);
    //        return posA.y - posB.y;
    //    });
    //    sortedRowKeys.forEach((rowKey, rowIndex) => {
    //        const rowSeats = rows[rowKey];
    //        if (rowSeats.length === 0) return;
    //        let rowLabel;
    //        switch (labelType) {
    //            case "alphabetUpper":
    //                rowLabel = String.fromCharCode(65 + rowIndex);
    //                break;
    //            case "alphabetLower":
    //                rowLabel = String.fromCharCode(97 + rowIndex);
    //                break;
    //            case "roman":
    //                rowLabel = this.toRoman(rowIndex + 1);
    //                break;
    //            case "number":
    //                rowLabel = (rowIndex + 1).toString();
    //                break;
    //            case "custom":
    //                const customLabel = document.getElementById("txtCustomRowLabel").value.trim();
    //                if (!customLabel) {
    //                    showNotification("Enter custom row label");
    //                    return;
    //                }
    //                if (!isNaN(customLabel)) {
    //                    rowLabel = (parseInt(customLabel) + rowIndex).toString();
    //                } else {
    //                    const startIndex = this.columnNameToNumber(customLabel.toUpperCase());
    //                    rowLabel = this.numberToColumnName(startIndex + rowIndex);
    //                }
    //                break;
    //            default:
    //                rowLabel = "";
    //        }
    //        let anchorSeat = direction === "RTL"
    //            ? rowSeats.reduce((a, b) => getAbsolutePosition(a).x > getAbsolutePosition(b).x ? a : b)
    //            : rowSeats.reduce((a, b) => getAbsolutePosition(a).x < getAbsolutePosition(b).x ? a : b);
    //        const anchorPos = getAbsolutePosition(anchorSeat);
    //        const labelSpacing = 25;
    //        const labelX = direction === "RTL" ? anchorPos.x + labelSpacing : anchorPos.x - labelSpacing;
    //        const labelY = anchorPos.y;
    //        const shouldRemoveLabel = rowSeats.every(seat => seats.includes(seat));
    //        if (shouldRemoveLabel) {
    //            this.removeRowLabelsForRow(canvas, rowSeats);
    //        }
    //        const rowText = this.addRowLabel(canvasId, labelX, labelY, rowLabel);
    //        rowSeats.forEach(seat => {
    //            seat.set('rowLabel', rowLabel);
    //            seat.rowLabel = rowLabel;
    //            seat.rowLabelObject = rowText;
    //            const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
    //            if (seatLabel) {
    //                const seatId = rowLabel + seatLabel;
    //                seat.set('seatId', seatId);
    //                seat.seatId = seatId;
    //            }
    //        });
    //    });
    //    canvas.renderOnAddRemove = true;
    //    canvas.requestRenderAll();
    //    saveState(canvas);
    //    this.showValidation(canvas);
    //},
    applyRowLabel(canvasId) {
        const canvas = this.canvases[canvasId];
        let active = canvas.getActiveObject();
        if (!active) {
            showNotification("Please select seats first.", "info");
            return;
        }

        // 1. Gather selected seats
        let seats = [];
        if (active.type === "activeSelection") {
            seats = active._objects.filter(o => o.type === "group");
        } else if (active.type === "group") {
            seats = [active];
        } else {
            showNotification("Please select seats to label.", "info");
            return;
        }
        if (seats.length === 0) return;

        canvas.renderOnAddRemove = false;

        // 2. Remove existing row labels (if any)
        const removedLabels = new Set();
        seats.forEach(seat => {
            if (seat.rowLabelObject) {
                removedLabels.add(seat.rowLabelObject);
            }
            seat.set('rowLabel', '');
            seat.rowLabel = '';
            seat.rowLabelObject = null;
            // Reset seatId to only seatLabel (without row prefix)
            const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
            if (seatLabel) {
                seat.set('seatId', seatLabel);
                seat.seatId = seatLabel;
            }
        });
        removedLabels.forEach(labelObj => {
            canvas.remove(labelObj);
        });

        // 3. Sort seats by row (Y) and position (X)
        seats.sort((a, b) => {
            const rowY = Math.round(a.top / 10) * 10;
            const rowY2 = Math.round(b.top / 10) * 10;
            if (rowY === rowY2) {
                return a.left - b.left;
            }
            return rowY - rowY2;
        });

        const rows = this.groupSeatsByRow(seats);
        const rowCount = Object.keys(rows).length;
        const direction = document.getElementById("ddldirection")?.value || "LTR";
        var labelType;
        // 4. Get the selected row‑label format from the dropdown
        if (rowCount == 1) {
            var lbl = document.getElementById("txtrowlbl").value;
            if (!lbl) {
                showNotification("Please enter row name");
                canvas.renderOnAddRemove = true;
                return;
            }
        }
        else {
            labelType = document.getElementById("ddlrow").value;
            // If no format is selected, abort
            if (!labelType) {
                showNotification("Please select a row label type.");
                canvas.renderOnAddRemove = true;
                return;
            }
        }

        // 5. Helper to store format & custom start on a seat
        const storeRowFormatOnSeat = (seat, format, customStart = '') => {
            seat.set('rowLabelFormat', format);
            seat.set('rowLabelCustomStart', customStart);
            // Also store on the raw object for direct access
            seat.rowLabelFormat = format;
            seat.rowLabelCustomStart = customStart;
        };

        // =========================================================================
        // SINGLE ROW
        // =========================================================================
        if (rowCount === 1) {
            const inputLabel = document.getElementById("txtrowlbl").value;
            if (!inputLabel) {
                // If no custom label entered, just remove labels and exit
                canvas.renderOnAddRemove = true;
                canvas.requestRenderAll();
                return;
            }

            const rowSeats = rows[0];
            // Pick the anchor seat (leftmost or rightmost depending on direction)
            let anchorSeat = direction === "RTL"
                ? rowSeats.reduce((a, b) => getAbsolutePosition(a).x > getAbsolutePosition(b).x ? a : b)
                : rowSeats.reduce((a, b) => getAbsolutePosition(a).x < getAbsolutePosition(b).x ? a : b);
            const anchorPos = getAbsolutePosition(anchorSeat);
            const labelSpacing = 25;
            const labelX = direction === "RTL" ? anchorPos.x + labelSpacing : anchorPos.x - labelSpacing;
            const labelY = anchorPos.y;

            // Remove old labels for this row
            this.removeRowLabelsForRow(canvas, rowSeats);
            // Create new label text
            const rowText = this.addRowLabel(canvasId, labelX, labelY, inputLabel);
            rowText.originalPosition = { x: labelX, y: labelY };

            // Apply the label to each seat and store the format
            rowSeats.forEach(seat => {
                seat.set('rowLabel', inputLabel);
                seat.rowLabel = inputLabel;
                seat.rowLabelObject = rowText;
                // Update seatId: rowLabel + seatLabel
                const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
                if (seatLabel) {
                    const seatId = inputLabel + seatLabel;
                    seat.set('seatId', seatId);
                    seat.seatId = seatId;
                }
                // ---------------- STORE FORMAT -----------------
                // For a single row, the "format" is effectively "custom" because we used the textbox.
                // But we still store it as 'custom' and the custom start is the inputLabel itself.
                storeRowFormatOnSeat(seat, 'custom', inputLabel);
            });

            canvas.renderOnAddRemove = true;
            canvas.requestRenderAll();
            return;
        }

        // =========================================================================
        // MULTIPLE ROWS
        // =========================================================================

        // Determine the custom start value if format is 'custom'
        let customStartValue = '';
        if (labelType === 'custom') {
            const customLabel = document.getElementById("txtCustomRowLabel").value.trim();
            if (!customLabel) {
                showNotification("Enter custom row label");
                canvas.renderOnAddRemove = true;
                return;
            }
            customStartValue = customLabel; // store the starting label (e.g., "A1" or "10")
        }

        // Sort rows by Y position
        const sortedRowKeys = Object.keys(rows).sort((a, b) => {
            const posA = getAbsolutePosition(rows[a][0]);
            const posB = getAbsolutePosition(rows[b][0]);
            return posA.y - posB.y;
        });

        // Iterate over each row and assign labels
        sortedRowKeys.forEach((rowKey, rowIndex) => {
            const rowSeats = rows[rowKey];
            if (rowSeats.length === 0) return;

            // Generate the label for this row based on the format
            let rowLabel;
            switch (labelType) {
                case "alphabetUpper":
                    rowLabel = String.fromCharCode(65 + rowIndex);
                    break;
                case "alphabetLower":
                    rowLabel = String.fromCharCode(97 + rowIndex);
                    break;
                case "roman":
                    rowLabel = this.toRoman(rowIndex + 1);
                    break;
                case "number":
                    rowLabel = (rowIndex + 1).toString();
                    break;
                case "custom":
                    // customStartValue is the starting label; we need to increment it for each row.
                    if (!isNaN(customStartValue)) {
                        // Numeric start
                        rowLabel = (parseInt(customStartValue) + rowIndex).toString();
                    } else {
                        // Alphabetical start (e.g., "A" -> "A", "B", ...)
                        const startIndex = this.columnNameToNumber(customStartValue.toUpperCase());
                        rowLabel = this.numberToColumnName(startIndex + rowIndex);
                    }
                    break;
                default:
                    rowLabel = "";
            }

            // Determine anchor seat (leftmost or rightmost)
            let anchorSeat = direction === "RTL"
                ? rowSeats.reduce((a, b) => getAbsolutePosition(a).x > getAbsolutePosition(b).x ? a : b)
                : rowSeats.reduce((a, b) => getAbsolutePosition(a).x < getAbsolutePosition(b).x ? a : b);
            const anchorPos = getAbsolutePosition(anchorSeat);
            const labelSpacing = 25;
            const labelX = direction === "RTL" ? anchorPos.x + labelSpacing : anchorPos.x - labelSpacing;
            const labelY = anchorPos.y;

            // Remove old labels for this row
            this.removeRowLabelsForRow(canvas, rowSeats);
            // Create new label text
            const rowText = this.addRowLabel(canvasId, labelX, labelY, rowLabel);
            rowText.originalPosition = { x: labelX, y: labelY };
            // Apply label to each seat and store the format
            rowSeats.forEach(seat => {
                seat.set('rowLabel', rowLabel);
                seat.rowLabel = rowLabel;
                seat.rowLabelObject = rowText;
                const seatLabel = seat.seatLabel || seat.get('seatLabel') || "";
                if (seatLabel) {
                    const seatId = rowLabel + seatLabel;
                    seat.set('seatId', seatId);
                    seat.seatId = seatId;
                }
                // ---------------- STORE FORMAT -----------------
                // For multiple rows, we store the format and the base custom start (if any)
                storeRowFormatOnSeat(seat, labelType, customStartValue);
            });
        });

        canvas.renderOnAddRemove = true;
        canvas.requestRenderAll();
        saveState(canvas);
        this.showValidation(canvas);
    },
    removeRowLabelsForRow(canvas, rowSeats) {
        if (!rowSeats || rowSeats.length === 0) return;
        const rowY = rowSeats.reduce((sum, seat) => {
            return sum + getAbsolutePosition(seat).y;
        }, 0) / rowSeats.length;
        const thresholdY = 15;
        const xPositions = rowSeats.map(seat => getAbsolutePosition(seat).x);
        const minX = Math.min(...xPositions);
        const maxX = Math.max(...xPositions);
        const thresholdX = 20;
        const labelsToRemove = [];
        canvas.getObjects().forEach(obj => {
            if (obj.isRowLabel === true) {
                const labelY = obj.top;
                const labelX = obj.left;
                const isSameRow = Math.abs(labelY - rowY) < thresholdY;
                const isWithinXRange = labelX >= (minX - thresholdX) && labelX <= (maxX + thresholdX);
                if (isSameRow && isWithinXRange) {
                    labelsToRemove.push(obj);
                }
            }
        });
        labelsToRemove.forEach(lbl => canvas.remove(lbl));
    },

    columnNameToNumber(name) {
        let number = 0;
        for (let i = 0; i < name.length; i++) {
            number = number * 26 + (name.charCodeAt(i) - 64);
        }
        return number;
    },

    numberToColumnName(num) {
        let columnName = "";
        while (num > 0) {
            let remainder = (num - 1) % 26;
            columnName = String.fromCharCode(65 + remainder) + columnName;
            num = Math.floor((num - 1) / 26);
        }
        return columnName;
    },

    groupSeatsByRow(seats) {
        const rows = {};
        seats.forEach(seat => {
            const rowId = seat.rowId || seat.get("rowId") || 0;
            if (!rows[rowId]) {
                rows[rowId] = [];
            }
            rows[rowId].push(seat);
        });
        const sortedRows = {};
        Object.values(rows)
            .sort((a, b) => {
                const avgA = a.reduce((s, x) => s + x.top, 0) / a.length;
                const avgB = b.reduce((s, x) => s + x.top, 0) / b.length;
                return avgA - avgB;
            })
            .forEach((row, index) => {
                /* row.sort((a, b) => a.left - b.left);*/
                row.sort((a, b) =>
                    a.getCenterPoint().x -
                    b.getCenterPoint().x
                );
                sortedRows[index] = row;
            });
        return sortedRows;
    },

    addRowLabel(canvasId, x, y, label) {
        const canvas = this.canvases[canvasId];
        const existingLabels = canvas.getObjects().filter(obj =>
            obj.type === 'text' && Math.abs(obj.left - x) < 20 && Math.abs(obj.top - y) < 20
        );
        existingLabels.forEach(labelObj => canvas.remove(labelObj));
        const rowText = new fabric.Text(label, {
            left: x,
            top: y,
            fontSize: 14,
            fontWeight: "normal",
            fill: "black",
            originX: "center",
            originY: "center",
            hasControls: false,
            selectable: true,
            evented: true
        });
        rowText.isRowLabel = true;
        rowText.rowLabel = label;
        rowText.text = label;
        rowText.set('isRowLabel', true);
        rowText.set('rowLabel', label);
        rowText.set('text', label);
        canvas.add(rowText);
        canvas.moveTo(rowText, canvas.getObjects().length - 1);
        canvas.renderAll();
        return rowText;
    },

    setSeatColor(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObject();
        if (!active) return;
        const selectedColor = document.getElementById("ddlcolor").value;
        const selectedCat = document.getElementById("ddlcolor").selectedOptions[0].text;
        let seats = [];
        if (active.type === "activeSelection") {
            seats = active._objects.slice();
        } else {
            seats = [active];
        }
        seats.forEach(seat => {
            if (seat.objectType === "seat" || seat.type === "group") {
                if (!seat.circle) return;
                seat.circle.set({ fill: selectedColor, stroke: null, strokeWidth: 0 });
                seat.set('fill', selectedColor);
                seat.set('categoryId', selectedColor);
                seat.set('categoryName', selectedCat);
            } else if (seat.objectType === "genrectangle" || seat.type === "rect") {
                const isGenRectangle = seat.objectType === "genrectangle";
                const isGeneralRect = seat.createdBy === 'rectangleTool' && seat.fill && seat.fill.includes('0.1');
                if (isGenRectangle || isGeneralRect) {
                    seat.set({ fill: selectedColor, stroke: selectedColor, strokeWidth: 1 });
                    seat.set('categoryId', selectedColor);
                    seat.set('categoryName', selectedCat);
                    if (seat.labelTextId) {
                        const labelText = canvas.getObjects().find(o => o.id === seat.labelTextId);
                        if (labelText) {
                            labelText.set('fill', getContrastColor(selectedColor));
                        }
                    }
                }
            }
        });
        canvas.renderAll();
        saveState(canvas);
        this.showValidation(canvas);
    },

    toggleSeatStatus(canvasId, seat) {
        const canvas = this.canvases[canvasId];
        const fabricObjects = canvas.getObjects();
        const seatGroup = fabricObjects.find(obj => obj.type === 'group' && obj.seatId === seat.id);
        if (!seatGroup) return;
        const current = seatGroup.seatStatus || 'available';
        let newColor, newStatus;
        if (current === 'available') {
            newColor = "#e7e7e7";
            newStatus = 'sold';
        } else if (current === 'selected') {
            newColor = '#999999';
            newStatus = 'sold';
        } else {
            newColor = '#f2fd58';
            newStatus = 'available';
        }
        if (seatGroup._objects && seatGroup._objects.length > 0) {
            if (seatGroup.circle) {
                seatGroup.circle.set('fill', newColor);
            } else {
                const circleInGroup = seatGroup._objects.find(obj => obj.type === 'circle' || (obj.radius && obj.radius > 0));
                if (circleInGroup) {
                    circleInGroup.set('fill', newColor);
                    circleInGroup.set('dirty', true);
                } else {
                    seatGroup._objects.forEach(obj => {
                        if (obj.fill !== undefined) {
                            obj.set('fill', newColor);
                        }
                    });
                }
            }
        }
        seat.seatStatus = newStatus;
        seatGroup.seatStatus = newStatus;
        if (seat.circle) {
            seat.circle.fill = newColor;
        }
        seatGroup.set('dirty', true);
        canvas.requestRenderAll();
        this.saveLayout(canvasId);
    },

    deleteSelected(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObjects();
        if (!active || active.length === 0) return;
        active.forEach(obj => canvas.remove(obj));
        this.disableValidation();
        canvas.renderAll();
    },

    saveLayout(canvasId) {
        debugger;
        safeExecute(() => {
            const canvas = this.canvases[canvasId];
            if (!canvas) return;
            const invalid = this.validateLabels(canvas);
            const isCategorized = this.isCategorized(canvas);
            if (invalid.length > 0) {
                showNotification("Please label all objects before saving.", "info");
                this.highlightInvalidObjects(invalid, canvas);
                return;
            }
            if (isCategorized.length > 0) {
                showNotification("Please categorize all objects before saving.", "info");
                this.highlightInvalidObjects(isCategorized, canvas);
                return;
            }
            const json = canvas.toJSON([
                'seatLabel', 'seatId', 'categoryId', 'categoryName', 'seatType', 'holdToken',
                'rowLabel', 'rowId', 'isRowLabel', 'seatStatus',
                'objectType', 'createdBy', 'rectangleId', 'rectangleLabel', 'rectangleIcon',
                'categoryId', 'categoryName', 'capacity', 'generalLabel', 'seatLabelFormat', 'customLabelStart',
                'rowLabelFormat', 'rowLabelCustomStart', 'curveType', 'curveIntensity', 'curveRadius'
            ]);
            debugger;
            const jsonStr = JSON.stringify(json);
            if (json.objects.length > 0) {
                DotNet.invokeMethodAsync("TTWSeating", "SaveSeatingLayout", jsonStr, "New", "");
                showNotification("Saved Successfully", "success");
            }
        }, 'Failed to save layout');
    },

    //loadLayout(canvasId, jsonString) {
    //    const canvas = this.canvases[canvasId];
    //    let json;
    //    try {
    //        json = JSON.parse(jsonString);
    //    } catch (error) {
    //        console.error("JSON parse error:", error);
    //        return;
    //    }
    //    canvas.clear();
    //    if (!json.objects || !Array.isArray(json.objects)) {
    //        console.error("No objects array in JSON");
    //        return;
    //    }
    //    json.objects.forEach((objData, index) => {
    //        if (objData.objectType === 'genrectangle') {
    //            this.recreateGeneralRectangleFromData(canvas, objData);
    //        } else if (objData.objectType === 'rectangle') {
    //            this.recreateRectangleFromData(canvas, objData);
    //        } else if (objData.type === "group" && objData.seatId) {
    //            this.recreateSeatFromData(canvas, objData);
    //        }
    //    });
    //    json.objects.forEach((objData, index) => {
    //        if (objData.type === "text" || objData.type === "i-text") {
    //            if (objData.isRowLabel === true) {
    //                const textValue = objData.text || objData.rowLabel || "";
    //                const rowText = new fabric.Text(textValue, {
    //                    left: objData.left || 0,
    //                    top: objData.top || 0,
    //                    fontSize: objData.fontSize || 14,
    //                    fontWeight: objData.fontWeight || "normal",
    //                    fill: objData.fill || "black",
    //                    originX: objData.originX || "center",
    //                    originY: objData.originY || "center",
    //                    hasControls: false,
    //                    selectable: false,
    //                    evented: false,
    //                    isRowLabel: true,
    //                    rowLabel: objData.rowLabel || textValue
    //                });
    //                rowText.set('isRowLabel', true);
    //                rowText.set('rowLabel', rowText.rowLabel);
    //                canvas.add(rowText);
    //            } else if (objData.isRectangleLabel === true || objData.generalLabel) {
    //                this.recreateRectangleLabel(canvas, objData);
    //            }
    //        }
    //    });
    //    canvas.renderAll();
    //    this.fitAndCenterChart(canvas);
    //},
    //linkRowLabelsToSeats(canvas) {
    //    const labels = canvas.getObjects().filter(o => o.isRowLabel === true);
    //    const seats = canvas.getObjects().filter(o => o.type === 'group' && o.seatLabel);
    //    labels.forEach(label => {
    //        const rowLabel = label.rowLabel || label.text;
    //        let rowSeats = seats.filter(s => s.rowLabel === rowLabel);
    //        // Fallback: match by proximity if rowLabel is empty or not matching
    //        if (rowSeats.length === 0) {
    //            const labelPos = getAbsolutePosition(label);
    //            rowSeats = seats.filter(s => {
    //                const pos = getAbsolutePosition(s);
    //                return Math.abs(pos.x - labelPos.x) < 50 && Math.abs(pos.y - labelPos.y) < 50;
    //            });
    //        }
    //        rowSeats.forEach(seat => {
    //            seat.rowLabelObject = label;
    //        });
    //    });
    //},

    linkRowLabelsToSeats(canvas) {
        const labels = canvas.getObjects().filter(o => o.isRowLabel === true);
        const seats = canvas.getObjects().filter(o => o.type === 'group' && o.seatLabel);
        labels.forEach(label => {
            const rowLabel = label.rowLabel || label.text;
            let rowSeats = seats.filter(s => s.rowLabel === rowLabel);
            // If rowLabel is empty or not matching, match by proximity
            if (rowSeats.length === 0) {
                const pos = getAbsolutePosition(label);
                rowSeats = seats.filter(s => {
                    const sp = getAbsolutePosition(s);
                    return Math.abs(sp.x - pos.x) < 50 && Math.abs(sp.y - pos.y) < 50;
                });
            }
            rowSeats.forEach(seat => {
                seat.rowLabelObject = label;
            });
        });
    },
    loadLayout(canvasId, jsonString) {
        const canvas = this.canvases[canvasId];
        if (!canvas) {
            console.error("loadLayout: canvas not initialized for", canvasId);
            return;
        }

        let json;
        try {
            json = JSON.parse(jsonString);
        } catch (error) {
            console.error("JSON parse error:", error);
            return;
        }

        undoStack = [];
        redoStack = [];
        canvas.clear();

        const shapes = Array.isArray(json.shapes) ? json.shapes : [];
        const objects = Array.isArray(json.objects) ? json.objects : [];
        this._designerCats = Array.isArray(json.cats) ? json.cats : [];
        const seatIdMap = this.buildDesignerSeatIds(shapes, objects);

        if (json.view && typeof json.view === 'object') {
            const view = json.view;
            if (typeof view.k === 'number') canvas.setZoom(view.k);
            if (Array.isArray(canvas.viewportTransform)) {
                canvas.viewportTransform[4] = view.x || 0;
                canvas.viewportTransform[5] = view.y || 0;
            }
        }

        if (!shapes.length && !objects.length) {
            console.warn("No objects/shapes in JSON; chart may be empty or not saved in editor format.");
            return;
        }

        if (shapes.length) {
            shapes.forEach((shape) => {
                if (!shape) return;
                if (shape.type === 'row') this.recreateDesignerRow(canvas, shape, seatIdMap.get(shape.id));
                else if (shape.type === 'table') this.recreateDesignerTable(canvas, shape, seatIdMap.get(shape.id));
                else if (shape.type === 'general') this.recreateDesignerGeneral(canvas, shape);
                else if (shape.type === 'rect') this.recreateDesignerRect(canvas, shape);
                else if (shape.type === 'line') this.recreateDesignerLine(canvas, shape);
                else if (shape.type === 'text') this.recreateDesignerText(canvas, shape);
                else if (shape.type === 'icon') this.recreateDesignerIcon(canvas, shape);
            });
        }

        if (shapes.length) {
            shapes.forEach((shape) => {
                if (!shape || shape.type !== 'row') return;
                const rowLabel = shape.label || '';
                if (!rowLabel) return;
                if (canvas.getObjects().some(o => o.isRowLabel && o.rowLabel === rowLabel)) return;
                const firstSeat = canvas.getObjects().find(obj => obj.rowLabel === rowLabel && obj.type === 'group');
                if (!firstSeat) return;
                const label = new fabric.Text(rowLabel, {
                    left: firstSeat.left - 24,
                    top: firstSeat.top,
                    fontSize: 12,
                    fontWeight: 700,
                    fill: '#64708f',
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    isRowLabel: true,
                    rowLabel: rowLabel
                });
                canvas.add(label);
            });
        }

        if (shapes.length) {
            shapes.forEach((shape) => {
                if (!shape || !(shape.type === 'general' || shape.type === 'rect')) return;
                if (!shape.label) return;
                const centerX = (shape.x || 0) + ((shape.w || 0) / 2);
                const centerY = (shape.y || 0) + ((shape.h || 0) / 2);
                const label = new fabric.Text(shape.label, {
                    left: centerX,
                    top: centerY,
                    fontSize: 14,
                    fontWeight: 700,
                    fill: '#1e2540',
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false
                });
                canvas.add(label);
            });
        }

        objects.forEach((objData) => {
            if (!objData) return;
            if (objData.objectType === 'genrectangle') {
                this.recreateGeneralRectangleFromData(canvas, objData);
            }
            else if (objData.objectType === 'rectangle') {
                this.recreateRectangleFromData(canvas, objData);
            }
            else if (objData.type === "group" && objData.seatId) {
                this.recreateSeatFromData(canvas, objData);
            }
        });

        if (objects.length) {
            objects.forEach((objData) => {
                if (!objData || !(objData.type === "text" || objData.type === "i-text")) return;
                if (objData.isRowLabel === true) {
                    const textValue = objData.text || objData.rowLabel || "";
                    const rowText = new fabric.Text(textValue, {
                        left: objData.left || 0,
                        top: objData.top || 0,
                        fontSize: objData.fontSize || 14,
                        fontWeight: objData.fontWeight || "normal",
                        fill: objData.fill || "black",
                        originX: objData.originX || "center",
                        originY: objData.originY || "center",
                        hasControls: true,
                        selectable: true,
                        evented: true,
                        isRowLabel: true,
                        rowLabel: objData.rowLabel || textValue
                    });

                    rowText.set('isRowLabel', true);
                    rowText.set('rowLabel', rowText.rowLabel);
                    rowText.originalPosition = { x: rowText.left, y: rowText.top };
                    canvas.add(rowText);
                }
                else if (objData.isRectangleLabel === true || objData.generalLabel) {
                    this.recreateRectangleLabel(canvas, objData);
                }
            });
        }

        this.linkRowLabelsToSeats(canvas);
        canvas.renderAll();
        this.fitAndCenterChart(canvas);
        canvas.calcOffset();

        canvas.forEachObject((obj) => {
            obj.setCoords();
            if (obj.type === "group" && obj._objects) {
                obj._objects.forEach((child) => {
                    child.setCoords();
                });
            }
        });

        canvas.requestRenderAll();
    },
    recreateDesignerRow(canvas, shape, ids) {
        const seatCount = shape.count || 0;
        if (!seatCount) return;

        const rowSeats = [];
        const rowLabel = shape.label || '';

        for (let i = 0; i < seatCount; i++) {
            let x = 0;
            let y = 0;

            if (shape.pts && shape.pts.length > 1) {
                const total = shape.pts.length - 1;
                const dist = (i / Math.max(1, seatCount - 1)) * total;
                const idx = Math.floor(dist);
                const t = dist - idx;
                const a = shape.pts[idx];
                const b = shape.pts[Math.min(shape.pts.length - 1, idx + 1)];
                x = a.x + (b.x - a.x) * t;
                y = a.y + (b.y - a.y) * t;
            } else {
                const dx = (shape.x2 || shape.x1 || 0) - (shape.x1 || 0);
                const dy = (shape.y2 || shape.y1 || 0) - (shape.y1 || 0);
                const len = Math.hypot(dx, dy) || 1;
                const mx = ((shape.x1 + (shape.x2 || shape.x1)) / 2) + (-dy / len) * (shape.curve || 0) * 2;
                const my = ((shape.y1 + (shape.y2 || shape.y1)) / 2) + (dx / len) * (shape.curve || 0) * 2;
                const t = seatCount > 1 ? i / (seatCount - 1) : 0;
                const u = 1 - t;
                x = u * u * (shape.x1 || 0) + 2 * u * t * mx + t * t * (shape.x2 || shape.x1 || 0);
                y = u * u * (shape.y1 || 0) + 2 * u * t * my + t * t * (shape.y2 || shape.y1 || 0);
            }

            // same numbering as chart-editor.js seats(): first label + position, counted from the right for rtl rows
            const sd = (shape.sd && shape.sd[i]) || {};
            const k = shape.dir === 'rtl' ? seatCount - 1 - i : i;
            const fromId = ids && ids[i] ? String(ids[i]).split('-').pop().replace(/~\d+$/, '') : '';
            const seatNumber = String(sd.label || fromId || ((+shape.start || 0) + k)).trim();
            const seatId = (ids && ids[i]) || (rowLabel || 'R') + '-' + seatNumber;
            const seatCat = sd.cat || shape.cat;

            rowSeats.push(this.makeDesignerSeat({
                x, y, label: seatNumber, seatId, rowLabel,
                color: this.getCategoryColor(seatCat), catId: seatCat,
                categoryName: this.getCategoryName(seatCat), props: sd
            }));
        }

        rowSeats.forEach(seat => canvas.add(seat));
        if (shape.label) {
            const rowText = new fabric.Text(shape.label, {
                left: rowSeats[0] ? rowSeats[0].left - 20 : 0,
                top: rowSeats[0] ? rowSeats[0].top : 0,
                fontSize: 12,
                fontWeight: 700,
                fill: '#64708f',
                selectable: false,
                evented: false,
                originX: 'center',
                originY: 'center',
                isRowLabel: true,
                rowLabel: shape.label
            });
            rowText.set('rowLabel', shape.label);
            canvas.add(rowText);
        }
    },
    recreateDesignerTable(canvas, shape, ids) {
        const centerX = shape.x || 0;
        const centerY = shape.y || 0;
        const fillColor = shape.cat ? (window.fabricInterop && window.fabricInterop.getCategoryColor ? window.fabricInterop.getCategoryColor(shape.cat) : '#f59e0b') : '#f59e0b';

        if (shape.shape === 'rect') {
            const rect = new fabric.Rect({
                left: centerX,
                top: centerY,
                width: shape.w || 120,
                height: shape.h || 60,
                fill: fillColor + '55',
                stroke: '#1e2540',
                strokeWidth: 1.5,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                rx: 8,
                ry: 8
            });
            canvas.add(rect);
        } else {
            const circle = new fabric.Circle({
                left: centerX,
                top: centerY,
                radius: shape.r || 36,
                fill: fillColor + '55',
                stroke: '#1e2540',
                strokeWidth: 1.5,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            canvas.add(circle);
        }

        const seatPositions = (shape.shape === 'rect')
            ? (() => {
                const top = Math.ceil((shape.count || 1) / 2);
                const bot = (shape.count || 1) - top;
                const coords = [];
                [[top, -1], [bot, 1]].forEach(([m, sd]) => {
                    for (let i = 0; i < m; i++) {
                        coords.push({
                            x: centerX - (shape.w || 120) / 2 + (i + 0.5) * (shape.w || 120) / Math.max(1, m),
                            y: centerY + sd * ((shape.h || 60) / 2 + 14)
                        });
                    }
                });
                return coords;
            })()
            : Array.from({ length: shape.count || 0 }, (_, i) => {
                const a = i / Math.max(1, shape.count || 1) * Math.PI * 2;
                return {
                    x: centerX + Math.cos(a) * ((shape.r || 36) + 14),
                    y: centerY + Math.sin(a) * ((shape.r || 36) + 14)
                };
            });

        const tableLabel = (shape.label || '').trim() || ('T' + shape.id);
        seatPositions.forEach((seat, idx) => {
            const label = String(idx + 1);
            canvas.add(this.makeDesignerSeat({
                x: seat.x, y: seat.y, label, seatId: (ids && ids[idx]) || (tableLabel + '-' + label),
                rowLabel: tableLabel, color: this.getCategoryColor(shape.cat), catId: shape.cat,
                categoryName: this.getCategoryName(shape.cat)
            }));
        });

        if (shape.label) {
            const label = new fabric.Text(shape.label, {
                left: centerX,
                top: centerY + 4,
                fontSize: 12,
                fontWeight: 700,
                fill: '#1e2540',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            canvas.add(label);
        }
    },
    recreateDesignerRect(canvas, shape) {
        const x = shape.x || 0;
        const y = shape.y || 0;
        const w = shape.w || 100;
        const h = shape.h || 100;
        const rect = new fabric.Rect({
            left: x,
            top: y,
            width: w,
            height: h,
            fill: '#dfe3f3',
            stroke: '#64708f',
            strokeWidth: 1,
            originX: 'left',
            originY: 'top',
            selectable: false,
            evented: false,
            opacity: 0.35,
            rx: 10,
            ry: 10
        });
        canvas.add(rect);
        if (shape.label) {
            const label = new fabric.Text(shape.label, {
                left: x + w / 2,
                top: y + h / 2,
                fontSize: 14,
                fontWeight: 600,
                fill: '#1e2540',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            canvas.add(label);
        }
    },
    recreateDesignerGeneral(canvas, shape) {
        const gaColor = this.getCategoryColor(shape.cat);
        const rect = new fabric.Rect({
            left: shape.x || 0,
            top: shape.y || 0,
            width: shape.w || 100,
            height: shape.h || 60,
            fill: gaColor,
            stroke: '#64708f',
            strokeWidth: 1,
            originX: 'left',
            originY: 'top',
            selectable: false,
            evented: false,
            opacity: 0.35,
            rx: 10,
            ry: 10,
            objectType: 'genrectangle',
            createdBy: 'designer',
            rectangleId: 'ga-' + shape.id,
            rectangleLabel: shape.label || '',
            generalLabel: shape.label || null,
            capacity: shape.cap || 0,
            categoryId: gaColor,
            categoryName: this.getCategoryName(shape.cat)
        });
        canvas.add(rect);

        if (shape.label) {
            const label = new fabric.Text(shape.label, {
                left: (shape.x || 0) + (shape.w || 0) / 2,
                top: (shape.y || 0) + (shape.h || 0) / 2,
                fontSize: 14,
                fontWeight: 700,
                fill: '#1e2540',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            canvas.add(label);
        }
    },
    recreateDesignerIcon(canvas, shape) {
        const iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 5.5v4.2m0 4.1v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            </svg>`;

        const img = new Image();
        const svg = new Blob([iconSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svg);
        img.onload = () => {
            const iconImg = new fabric.Image(img, {
                left: shape.x || 0,
                top: shape.y || 0,
                scaleX: (shape.size || 32) / img.width,
                scaleY: (shape.size || 32) / img.height,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top'
            });
            canvas.add(iconImg);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    },
    recreateDesignerLine(canvas, shape) {
        const line = new fabric.Line([shape.x1, shape.y1, shape.x2, shape.y2], {
            stroke: shape.color || '#64708f',
            strokeWidth: shape.w || 3,
            selectable: false,
            evented: false,
            strokeDashArray: shape.dash ? shape.dash.split(' ').map(v => Number(v)).filter(v => !isNaN(v)) : []
        });
        canvas.add(line);
    },
    recreateDesignerText(canvas, shape) {
        const text = new fabric.Text(shape.text || '', {
            left: shape.x || 0,
            top: shape.y || 0,
            fontSize: shape.size || 16,
            fontWeight: 600,
            fill: '#1e2540',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        canvas.add(text);
    },
    getCategoryColor(categoryId) {
        const saved = (this._designerCats || []).find(c => String(c.id) === String(categoryId));
        if (saved && saved.color) return saved.color;
        const colors = {
            1: '#ff5d6c',
            2: '#4f46e5',
            3: '#22d3ee',
            4: '#f59e0b',
            5: '#10b981'
        };
        return colors[categoryId] || '#4f46e5';
    },
    getCategoryName(categoryId) {
        const saved = (this._designerCats || []).find(c => String(c.id) === String(categoryId));
        return saved ? (saved.name || '') : '';
    },
    // Seat ids for rows/tables saved by chart-editor.js. getData() stores them in chart_json.objects
    // (rows then tables, in shape order) so ids always equal the seat_name rows written by hq_seat_sync.
    buildDesignerSeatIds(shapes, objects) {
        const map = new Map();
        const saved = (objects || []).filter(o => o && o.seatId && !o.type);
        const seatShapes = (shapes || []).filter(sh => sh && (sh.type === 'row' || sh.type === 'table') && sh.count > 0);
        const total = seatShapes.reduce((n, sh) => n + sh.count, 0);
        if (!saved.length || saved.length !== total) return map;
        let k = 0;
        for (const sh of seatShapes) {
            const expectedRow = ((sh.label || '').trim() || ((sh.type === 'row' ? 'R' : 'T') + sh.id)).slice(0, 100);
            if (saved[k].rowName !== expectedRow) return new Map();   // chart edited by another tool - fall back to computed ids
            const ids = [];
            for (let i = 0; i < sh.count; i++) ids.push(saved[k++].seatId);
            map.set(sh.id, ids);
        }
        return map;
    },
    // One selectable seat, with the properties enableUserMode / applyStatusColors / the ticket popup read.
    makeDesignerSeat(o) {
        const circle = new fabric.Circle({
            radius: 8, left: o.x, top: o.y, fill: o.color, stroke: '#ffffff', strokeWidth: 1.5,
            originX: 'center', originY: 'center', selectable: false, evented: false
        });
        const text = new fabric.Text(String(o.label), {
            left: o.x, top: o.y, fontSize: 8, fontWeight: 'bold', fill: '#ffffff',
            originX: 'center', originY: 'center', selectable: false, evented: false
        });
        const g = new fabric.Group([circle, text], {
            left: o.x, top: o.y, originX: 'center', originY: 'center', selectable: false, evented: false,
            hasControls: false, hasBorders: false, subTargetCheck: true, objectCaching: false
        });
        g.seatId = o.seatId;
        g.seatLabel = String(o.label);
        g.rowLabel = o.rowLabel || '';
        g.rowId = o.rowLabel || 'row';
        g.categoryId = o.color;                 // same meaning as on seats saved by the old designer: the colour
        g.catId = o.catId || '';
        g.categoryName = o.categoryName || '';
        g.seatType = '';
        g.seatStatus = 'available';
        g.seatProps = o.props || {};
        g.circle = circle;
        g.textObj = text;
        g.set('seatId', g.seatId);
        g.set('rowLabel', g.rowLabel);
        g.set('seatStatus', 'available');
        g.set('categoryId', g.categoryId);
        g.set('categoryName', g.categoryName);
        return g;
    },
    //recreateSeatFromData(canvas, objData) {
    //    const radius = 8;
    //    const circle = new fabric.Circle({
    //        radius: radius,
    //        fill: objData.categoryId || "white",
    //        originX: "center",
    //        originY: "center",
    //        stroke: objData.categoryId || "black",
    //        strokeWidth: objData.strokeWidth || 1
    //    });
    //    const seatLabel = objData.seatLabel || "";
    //    const text = new fabric.Text(seatLabel, {
    //        fontSize: 10,
    //        fontWeight: "bold",
    //        fill: "white",
    //        originX: "center",
    //        originY: "center",
    //        evented: false,
    //        selectable: false
    //    });
    //    const seatGroup = new fabric.Group([circle, text], {
    //        left: objData.left || 0,
    //        top: objData.top || 0,
    //        originX: "center",
    //        originY: "center",
    //        hasControls: false,
    //        subTargetCheck: true
    //    });
    //    seatGroup.seatLabel = objData.seatLabel || "";
    //    seatGroup.seatId = objData.seatId || `Seat-${seatLabel}`;
    //    seatGroup.categoryId = objData.categoryId || "";
    //    seatGroup.categoryName = objData.categoryName || "";
    //    seatGroup.seatType = objData.seatType || "";
    //    seatGroup.rowLabel = objData.rowLabel || "";
    //    seatGroup.seatStatus = objData.seatStatus || "available";
    //    seatGroup.isRowLabel = objData.isRowLabel || false;
    //    seatGroup.set('seatLabel', seatGroup.seatLabel);
    //    seatGroup.set('seatId', seatGroup.seatId);
    //    seatGroup.set('categoryId', seatGroup.categoryId);
    //    seatGroup.set('categoryName', seatGroup.categoryName);
    //    seatGroup.set('seatType', seatGroup.seatType);
    //    seatGroup.set('rowLabel', seatGroup.rowLabel);
    //    seatGroup.set('seatStatus', seatGroup.seatStatus);
    //    seatGroup.set('isRowLabel', seatGroup.isRowLabel);
    //    seatGroup.rowId = objData.rowId || objData.rowLabel || "";
    //    seatGroup.set('rowId', seatGroup.rowId);
    //    seatGroup.circle = circle;
    //    seatGroup.textObj = text;
    //    canvas.add(seatGroup);
    //},
    recreateSeatFromData(canvas, objData) {

        const radius = 8;

        const circle = new fabric.Circle({
            radius: radius,
            fill: objData.categoryId || "white",
            stroke: objData.categoryId || "black",
            strokeWidth: objData.strokeWidth || 1,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false
        });

        const text = new fabric.Text(objData.seatLabel || "", {
            fontSize: 10,
            fontWeight: "bold",
            fill: "white",
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false
        });

        const seatGroup = new fabric.Group([circle, text], {
            left: objData.left || 0,
            top: objData.top || 0,
            originX: "center",
            originY: "center",
            hasControls: false,
            hasBorders: false,
            selectable: true,
            evented: true,
            subTargetCheck: true,
            objectCaching: false
        });

        seatGroup.seatLabel = objData.seatLabel || "";
        seatGroup.seatId = objData.seatId || `Seat-${seatGroup.seatLabel}`;
        seatGroup.categoryId = objData.categoryId || "";
        seatGroup.categoryName = objData.categoryName || "";
        seatGroup.seatType = objData.seatType || "";
        seatGroup.rowLabel = objData.rowLabel || "";
        seatGroup.seatStatus = objData.seatStatus || "available";
        seatGroup.rowId = objData.rowId || objData.rowLabel || "";

        seatGroup.textObj = text;
        seatGroup.circle = circle;
        seatGroup.seatLabelFormat = objData.seatLabelFormat || '';
        seatGroup.customLabelStart = objData.customLabelStart || '';
        seatGroup.rowLabelFormat = objData.rowLabelFormat || '';
        seatGroup.rowLabelCustomStart = objData.rowLabelCustomStart || '';

        seatGroup.curveType = objData.curveType || '';
        seatGroup.curveIntensity = objData.curveIntensity != null ? objData.curveIntensity : 0;
        seatGroup.curveRadius = objData.curveRadius != null ? objData.curveRadius : 0;
        seatGroup.set('seatLabelFormat', seatGroup.seatLabelFormat);
        seatGroup.set('customLabelStart', seatGroup.customLabelStart);
        seatGroup.set('rowLabelFormat', seatGroup.rowLabelFormat);
        seatGroup.set('rowLabelCustomStart', seatGroup.rowLabelCustomStart);
        seatGroup.set('curveType', seatGroup.curveType);
        seatGroup.set('curveIntensity', seatGroup.curveIntensity);
        seatGroup.set('curveRadius', seatGroup.curveRadius);
        seatGroup.setCoords();

        canvas.add(seatGroup);
    },
    getSelectedSeatsForBooking(canvasId) {
        const canvas = this.canvases[canvasId];
        if (!canvas || !canvas.selectedSeats) return [];
        return canvas.selectedSeats;
    },

    //clearSelectedSeats(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    if (canvas && canvas.selectedSeats) {
    //        canvas.selectedSeats = [];
    //    }
    //    canvas.forEachObject(obj => {
    //        if (obj.type === 'group' && obj.textObj) {
    //            if (obj.textObj.text === "✔") {
    //                obj.textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
    //                obj.set("isSelected", false);
    //                obj.isSelected = false;
    //            }
    //        }
    //    });
    //    canvas.renderAll();
    //},
    clearSelectedSeats(canvasId) {
        const canvas = this.canvases[canvasId];

        // Close ticket type popup if open
        const popup = document.getElementById('ticketTypePopup');
        if (popup) {
            popup.style.display = 'none';
        }
        this._pendingSeatSelection = null;

        if (canvas && canvas.selectedSeats) {
            canvas.selectedSeats = [];
        }
        if (canvas && canvas.selectedGAAreas) {
            canvas.selectedGAAreas.forEach(area => {
                const rectangle = canvas.getObjects().find(obj => obj.rectangleId === area.id && obj.objectType === 'genrectangle');
                if (rectangle) {
                    rectangle.set({ fill: rectangle.categoryId || "#f2fd58", stroke: "black", strokeWidth: 1 });
                    this.removeGASelectionIndicator(canvas, rectangle);
                }
            });
            canvas.selectedGAAreas = [];
        }
        canvas.forEachObject(obj => {
            if (obj.type === 'group' && obj.textObj) {
                if (obj.textObj.text === "✔") {
                    obj.textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
                    obj.set("isSelected", false);
                    obj.isSelected = false;
                }
            }
        });
        canvas.renderAll();
        this.sendGASelectionToParent(canvas);
    },
    recreateRectangleFromData(canvas, objData) {
        const rect = new fabric.Rect({
            left: objData.left || 0,
            top: objData.top || 0,
            width: objData.width || 50,
            height: objData.height || 50,
            fill: objData.fill || "rgba(0,0,0,0.1)",
            stroke: objData.stroke || "black",
            strokeWidth: objData.strokeWidth || 1,
            strokeDashArray: objData.strokeDashArray || null,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: false,
            objectType: objData.objectType || 'rectangle',
            createdBy: objData.createdBy || 'rectangleTool',
            rectangleId: objData.rectangleId || `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            rectangleLabel: objData.rectangleLabel || ""
        });
        rect.set('objectType', rect.objectType);
        rect.set('createdBy', rect.createdBy);
        rect.set('rectangleId', rect.rectangleId);
        rect.set('rectangleLabel', objData.rectangleLabel || "");
        rect.set('rectangleIcon', objData.rectangleIcon || "");
        canvas.add(rect);
        if (objData.rectangleLabel) {
            const temp = document.createElement("span");
            temp.innerHTML = objData.rectangleIcon || "";
            const icon = temp.innerText;
            var lbl = icon + " " + objData.rectangleLabel;
            const labelText = new fabric.Text(lbl, {
                fontSize: 14,
                fontWeight: "900",
                fontFamily: "Font Awesome 6 Free",
                fill: "black",
                originX: "center",
                originY: "center",
                left: rect.left + rect.width / 2,
                top: rect.top + rect.height / 2,
                selectable: false,
                evented: false
            });
            canvas.add(labelText);
            canvas.bringToFront(labelText);
            rect.labelText = labelText;
        }
    },

    recreateGeneralRectangleFromData(canvas, objData) {
        const rect = new fabric.Rect({
            left: objData.left || 0,
            top: objData.top || 0,
            width: objData.width || 50,
            height: objData.height || 50,
            fill: objData.fill || objData.categoryId || "rgba(0,0,0,0.1)",
            stroke: objData.stroke || objData.categoryId || "black",
            strokeWidth: objData.strokeWidth || 1,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            lockUniScaling: false,
            objectType: objData.objectType || 'genrectangle',
            createdBy: objData.createdBy || 'rectangleTool',
            rectangleId: objData.rectangleId || `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            rectangleLabel: objData.rectangleLabel || '',
            capacity: objData.capacity || 0,
            categoryId: objData.categoryId || '',
            categoryName: objData.categoryName || '',
            generalLabel: objData.generalLabel || null
        });
        rect.set('objectType', rect.objectType);
        rect.set('createdBy', rect.createdBy);
        rect.set('rectangleId', rect.rectangleId);
        rect.set('rectangleLabel', rect.rectangleLabel);
        rect.set('capacity', rect.capacity);
        rect.set('categoryId', rect.categoryId);
        rect.set('categoryName', rect.categoryName);
        rect.set('generalLabel', rect.generalLabel);
        canvas.add(rect);
    },

    recreateRectangleLabel(canvas, objData) {
        const labelText = new fabric.Text(objData.text || '', {
            left: objData.left || 0,
            top: objData.top || 0,
            fontSize: objData.fontSize || 12,
            fontWeight: objData.fontWeight || "bold",
            fill: objData.fill || "black",
            originX: objData.originX || "center",
            originY: objData.originY || "center",
            selectable: false,
            evented: false,
            text: objData.generalLabel || '',
            rectangleId: objData.rectangleId,
            rectangleLabel: objData.rectangleLabel || '',
            isRectangleLabel: true,
            textAlign: 'center',
            id: objData.id || `label-${objData.rectangleId}`
        });
        const rect = canvas.getObjects().find(obj => obj.rectangleId === objData.rectangleId);
        if (rect) {
            rect.labelText = labelText;
            rect.labelTextId = labelText.id;
            rect.generalLabel = labelText.text;
            rect.set('labelTextId', labelText.id);
            rect.set('generalLabel', labelText.text);
            if (rect.categoryId || rect.fill) {
                const rectColor = rect.categoryId || rect.fill;
                if (rectColor && typeof rectColor === 'string' && rectColor.startsWith('#')) {
                    labelText.set('fill', getContrastColor(rectColor));
                }
            }
        }
        canvas.add(labelText);
    },

    createSeatRow(canvasId, start, end) {
        const canvas = this.canvases[canvasId];
        const spacing = this.seatSpacing || 20;
        let count;
        if (this.rowDirection === "horizontal") {
            count = Math.floor(Math.abs(end.x - start.x) / spacing) + 1;
        } else {
            count = Math.floor(Math.abs(end.y - start.y) / spacing) + 1;
        }
        if (count <= 0) return;
        const rowLabel = "";
        const rowId = `row-${rowLabel}-${Date.now()}`;
        for (let i = 0; i < count; i++) {
            const x = this.rowDirection === "horizontal" ? start.x + i * spacing : start.x;
            const y = this.rowDirection === "vertical" ? start.y + i * spacing : start.y;
            const seatLabel = (i + 1).toString();
            const seatId = `${rowLabel}${seatLabel}`;
            this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
        }
        if (this.rowDirection === "horizontal") {
            this.rowStart = { x: start.x, y: start.y + spacing * 2 };
        } else {
            this.rowStart = { x: start.x + spacing * 2, y: start.y };
        }
        this.rowIndex++;
        canvas.renderAll();
    },

    //createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId) {
    //    const circle = new fabric.Circle({
    //        radius: 8,
    //        fill: "white",
    //        originX: "center",
    //        originY: "center",
    //        stroke: "black",
    //        strokeDashArray: null,
    //    });
    //    const text = new fabric.Text("", {
    //        fontSize: 10,
    //        fontWeight: "bold",
    //        fill: "black",
    //        originX: "center",
    //        originY: "center",
    //        evented: false,
    //        selectable: false
    //    });
    //    const seatGroup = new fabric.Group([circle, text], {
    //        left: x,
    //        top: y,
    //        originX: "center",
    //        originY: "center",
    //        hasControls: false,
    //    });
    //    seatGroup.circle = circle;
    //    seatGroup.textObj = text;
    //    seatGroup.seatLabel = seatLabel;
    //    seatGroup.seatId = seatId;
    //    seatGroup.rowLabel = rowLabel;
    //    seatGroup.rowId = rowId;
    //    seatGroup.seatStatus = "available";
    //    seatGroup.objectType = "seat";
    //    seatGroup.categoryId = "";
    //    seatGroup.set({ seatLabel, seatId, rowLabel, rowId, seatStatus: "available", categoryId: "" });
    //    canvas.add(seatGroup);
    //    return seatGroup;
    //},
    createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId, props = {}) {
        const circle = new fabric.Circle({
            radius: 8,
            fill: props.categoryId || "white",
            originX: "center",
            originY: "center",
            stroke: props.categoryId || "black",
            strokeWidth: 1,
            strokeDashArray: null,
        });
        //const text = new fabric.Text(seatLabel, {   // show seat number
        //    fontSize: 10,
        //    fontWeight: "bold",
        //    fill: "black",
        //    originX: "center",
        //    originY: "center",
        //    evented: false,
        //    selectable: false
        //});
        const text = new fabric.Text("", {   // empty by default
            fontSize: 10,
            fontWeight: "bold",
            fill: "black",
            originX: "center",
            originY: "center",
            evented: false,
            selectable: false
        });
        const seatGroup = new fabric.Group([circle, text], {
            left: x,
            top: y,
            originX: "center",
            originY: "center",
            hasControls: false,
            subTargetCheck: true
        });
        seatGroup.circle = circle;
        seatGroup.textObj = text;
        seatGroup.seatLabel = seatLabel;
        seatGroup.seatId = seatId;
        seatGroup.rowLabel = rowLabel;
        seatGroup.rowId = rowId;
        seatGroup.seatStatus = props.seatStatus || "available";
        seatGroup.objectType = "seat";
        seatGroup.categoryId = props.categoryId || "";
        seatGroup.categoryName = props.categoryName || "";
        seatGroup.seatType = props.seatType || "";
        // Store original label for visibility toggles
        seatGroup.originalLabel = "";
        // Set all custom properties
        seatGroup.set({
            seatLabel, seatId, rowLabel, rowId,
            seatStatus: seatGroup.seatStatus,
            categoryId: seatGroup.categoryId,
            categoryName: seatGroup.categoryName,
            seatType: seatGroup.seatType,
            originalLabel: seatLabel
        });
        canvas.add(seatGroup);
        return seatGroup;
    },
    clearPreviewLines(canvas) {
        if (!this.previewLines) return;
        Object.values(this.previewLines).forEach(line => {
            if (line) canvas.remove(line);
        });
        this.previewLines = { start: null, end: null, top: null, bottom: null };
    },

    updateRowBoundaryLines(canvas, start, pointer, direction, seatCount) {
        const spacing = this.seatSpacing || 20;
        const seatRadius = 8;
        const length = (seatCount - 1) * spacing;
        let x1, y1, x2, y2;
        if (direction === "horizontal") {
            const left = start.x;
            const right = start.x + length;
            const top = start.y - seatRadius * 2;
            const bottom = start.y + seatRadius * 2;
            this.previewLines.start = this.createOrUpdateLine(canvas, this.previewLines.start, left, top, left, bottom);
            this.previewLines.end = this.createOrUpdateLine(canvas, this.previewLines.end, right, top, right, bottom);
            this.previewLines.top = this.createOrUpdateLine(canvas, this.previewLines.top, left, top, right, top);
            this.previewLines.bottom = this.createOrUpdateLine(canvas, this.previewLines.bottom, left, bottom, right, bottom);
        } else {
            const top = start.y;
            const bottom = start.y + length;
            const left = start.x - seatRadius * 2;
            const right = start.x + seatRadius * 2;
            this.previewLines.start = this.createOrUpdateLine(canvas, this.previewLines.start, left, top, right, top);
            this.previewLines.end = this.createOrUpdateLine(canvas, this.previewLines.end, left, bottom, right, bottom);
            this.previewLines.top = this.createOrUpdateLine(canvas, this.previewLines.top, left, top, left, bottom);
            this.previewLines.bottom = this.createOrUpdateLine(canvas, this.previewLines.bottom, right, top, right, bottom);
        }
    },

    createOrUpdateLine(canvas, line, x1, y1, x2, y2) {
        if (!line) {
            line = new fabric.Line([x1, y1, x2, y2], {
                stroke: "#2196F3",
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false
            });
            canvas.add(line);
        } else {
            line.set({ x1, y1, x2, y2 });
        }
        return line;
    },

    createOrUpdateGuide(canvas, line, x1, y1, x2, y2) {
        if (!line) {
            line = new fabric.Line([x1, y1, x2, y2], {
                stroke: "#FF5722",
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false
            });
            canvas.add(line);
        } else {
            line.set({ x1, y1, x2, y2 });
        }
        return line;
    },

    updateFullHeightRowGuides(canvas, start, direction, seatCount) {
        const spacing = this.seatSpacing || 20;
        const length = (seatCount - 1) * spacing;
        if (direction === "horizontal") {
            const startX = start.x;
            const endX = start.x + length;
            this.alignmentGuides.start = this.createOrUpdateGuide(canvas, this.alignmentGuides.start, startX, 0, startX, canvas.height);
            this.alignmentGuides.end = this.createOrUpdateGuide(canvas, this.alignmentGuides.end, endX, 0, endX, canvas.height);
        } else {
            const startY = start.y;
            const endY = start.y + length;
            this.alignmentGuides.start = this.createOrUpdateGuide(canvas, this.alignmentGuides.start, 0, startY, canvas.width, startY);
            this.alignmentGuides.end = this.createOrUpdateGuide(canvas, this.alignmentGuides.end, 0, endY, canvas.width, endY);
        }
    },

    clearAlignmentGuides(canvas) {
        if (!this.alignmentGuides) return;
        Object.values(this.alignmentGuides).forEach(line => {
            if (line) canvas.remove(line);
        });
        this.alignmentGuides = { start: null, end: null };
    },

    updateHoverStartGuide(canvas, pointer, direction) {
        if (this.hoverStartGuide) {
            canvas.remove(this.hoverStartGuide);
            this.hoverStartGuide = null;
        }
        if (direction === "horizontal") {
            this.hoverStartGuide = new fabric.Line([pointer.x, 0, pointer.x, canvas.height], {
                stroke: "#9C27B0",
                selectable: false,
                evented: false
            });
        } else {
            this.hoverStartGuide = new fabric.Line([0, pointer.y, canvas.width, pointer.y], {
                stroke: "#9C27B0",
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false
            });
        }
        canvas.add(this.hoverStartGuide);
    },

    updateRowHoverGuide(canvas, direction) {
        if (!this.lastRowPosition) return;
        if (this.rowHoverGuide) {
            canvas.remove(this.rowHoverGuide);
            this.rowHoverGuide = null;
        }
        const rowGap = this.rowSpacing || 30;
        if (direction === "horizontal") {
            const nextRowY = this.lastRowPosition.y + rowGap;
            this.rowHoverGuide = new fabric.Line([0, nextRowY, canvas.getWidth(), nextRowY], {
                stroke: "#FF9800",
                strokeWidth: 1.5,
                selectable: false,
                evented: false
            });
        } else {
            const nextRowX = this.lastRowPosition.x + rowGap;
            this.rowHoverGuide = new fabric.Line([nextRowX, 0, nextRowX, canvas.getHeight()], {
                stroke: "#FF9800",
                strokeWidth: 1.5,
                selectable: false,
                evented: false
            });
        }
        canvas.add(this.rowHoverGuide);
        canvas.sendToBack(this.rowHoverGuide);
    },

    clearRowGuide(canvas) {
        if (this.rowHoverGuide) {
            canvas.remove(this.rowHoverGuide);
            this.rowHoverGuide = null;
        }
        if (this.hoverStartGuide) {
            canvas.remove(this.hoverStartGuide);
            this.hoverStartGuide = null;
        }
    },

    applyRectangleLabel(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObject();
        if (!active) {
            showNotification("Please select a rectangle to label");
            return;
        }
        let rect = null;
        if (active.type === "activeSelection") {
            const rectangles = active._objects.filter(obj => obj.objectType === "rectangle");
            if (rectangles.length > 1) {
                showNotification("Please select only ONE rectangle at a time for labeling");
                return;
            }
            if (rectangles.length === 0) {
                showNotification("No rectangle found in selection");
                return;
            }
            rect = rectangles[0];
        } else if (active.type === "rect" && active.objectType === "rectangle") {
            rect = active;
        } else {
            showNotification("Please select a rectangle (not other objects)");
            return;
        }
        const ddlElement = document.getElementById("ddlrect");
        const selectedValue = ddlElement.value;
        if (!selectedValue) {
            showNotification("Please select a label type");
            return;
        }
        const selectedOption = ddlElement.options[ddlElement.selectedIndex];
        const temp = document.createElement("span");
        temp.innerHTML = selectedOption.getAttribute("data-icon");
        const icon = temp.innerText;
        let label = icon + " " + selectedValue;
        if (rect.labelText) {
            canvas.remove(rect.labelText);
            rect.labelText = null;
        }
        const fontSize = Math.min(rect.height * 0.3, rect.width * 0.2, 16);
        const labelText = new fabric.Text(label, {
            fontSize: Math.max(fontSize, 12),
            fontWeight: "900",
            fontFamily: "Font Awesome 6 Free",
            fill: "black",
            originX: "center",
            originY: "center",
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
            selectable: false,
            evented: false,
            textAlign: 'center'
        });
        rect.labelText = labelText;
        rect.rectangleLabel = selectedValue;
        rect.rectangleIcon = selectedOption.getAttribute("data-icon");
        rect.set('labelText', labelText);
        rect.set('rectangleLabel', selectedValue);
        rect.set('rectangleIcon', selectedOption.getAttribute("data-icon"));
        canvas.add(labelText);
        canvas.bringToFront(labelText);
        canvas.renderAll();
        return true;
    },

    handleSelectionChanged(canvasId, e) {
        const canvas = this.canvases[canvasId];
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        const isRectangleSelected = this.isRectangleSelected(activeObject);
        const isGeneralSelected = this.isGeneralSelected(activeObject);
        const isSeatSelected = this.isSeatSelected(activeObject);
        if (isRectangleSelected) {
            this.toggleRectangleDropdown(isRectangleSelected);
        }
        if (isSeatSelected) {
            this.toggleSeatDropdown(isSeatSelected);
        }
        if (isGeneralSelected) {
            this.toggleGeneralProps(isGeneralSelected);
        }
    },

    handleSelectionCleared(canvasId) {
        const canvas = this.canvases[canvasId];
        this.toggleRectangleDropdown(false);
        this.toggleSeatDropdown(false);
        this.toggleGeneralProps(false);
    },

    isSeatSelected(activeObject) {
        if (!activeObject) return false;
        if (activeObject.type === "activeSelection") {
            const hasSeat = activeObject._objects.some(obj => obj.objectType === "seat" || obj.type === "group");
            if (hasSeat) {
                let seats = activeObject._objects.filter(o => o.type === "group");
                if (seats.length === 0) return false;
                seats.sort((a, b) => {
                    const rowY = Math.round(a.top / 10) * 10;
                    const rowY2 = Math.round(b.top / 10) * 10;
                    if (rowY === rowY2) return a.left - b.left;
                    return rowY - rowY2;
                });
                const rows = this.groupSeatsByRow(seats);
                const rowCount = Object.keys(rows).length;
                var ddlrow = document.getElementById("ddlrow");
                var txtrowlbl = document.getElementById("txtrowlbl");
                if (rowCount > 1) {
                    txtrowlbl.style.display = "none";
                    ddlrow.style.display = "block";
                } else {
                    txtrowlbl.style.display = "block";
                    ddlrow.style.display = "none";
                }
            }
            return hasSeat;
        }
        return false;
    },

    isRectangleSelected(activeObject) {
        if (!activeObject) return false;
        if (activeObject.type === "rect" && activeObject.objectType === "rectangle") return true;
        if (activeObject.type === "activeSelection") {
            return activeObject._objects.some(obj => obj.objectType === "rectangle");
        }
        return false;
    },

    isGeneralSelected(activeObject) {
        if (!activeObject) return false;
        if (activeObject.type === "rect" && activeObject.objectType === "genrectangle") return true;
        return false;
    },

    toggleRectangleDropdown(show) {
        const container = document.getElementById("ddlrectcontainer");
        if (container) container.style.display = show ? "block" : "none";
    },

    toggleSeatDropdown(show) {
        const rowlbl = document.getElementById("divrowlabel");
        const seatlbl = document.getElementById("divseatlabel");
        const direction = document.getElementById("divdirection");
        const btnapply = document.getElementById("btnapply");
        const seatcount = document.getElementById("seatcnt");
        const divcustomseat = document.getElementById("divcustomseat");
        const divcustomrow = document.getElementById("divcustomrow");
        const btnCustomizeRows = document.getElementById("btnCustomizeRows");
        rowlbl.style.display = show ? "block" : "none";
        seatlbl.style.display = show ? "block" : "none";
        direction.style.display = show ? "block" : "none";
        btnapply.style.display = show ? "block" : "none";
        seatcount.style.display = show ? "block" : "none";
        if (btnCustomizeRows) btnCustomizeRows.style.display = show ? "block" : "none";
        if (divcustomseat) divcustomseat.style.display = show ? "block" : "none";
        if (divcustomrow) divcustomrow.style.display = show ? "block" : "none";
    },

    toggleGeneralProps(show) {
        const rectlbl = document.getElementById("divgenerallbl");
        const capacity = document.getElementById("divcapacity");
        if (rectlbl) rectlbl.style.display = show ? "block" : "none";
        if (capacity) capacity.style.display = show ? "block" : "none";
    },

    validateLabels(canvas) {
        let invalidObjects = [];
        canvas.getObjects().forEach(obj => {
            if (obj.objectType === "guide") return;
            if ((obj.objectType === "seat" || obj.type === "group") && (!obj.seatLabel || obj.seatLabel.trim() === "" || !obj.rowLabel || obj.rowLabel.trim() === "")) {
                invalidObjects.push(obj);
            }
        });
        return invalidObjects;
    },

    isCategorized(canvas) {
        let invalidObjects = [];
        canvas.getObjects().forEach(obj => {
            if (obj.objectType === "guide") return;
            if ((obj.objectType === "seat" || obj.type === "group") && (!obj.categoryId || obj.categoryId.trim() === "")) {
                invalidObjects.push(obj);
            }
        });
        return invalidObjects;
    },

    checkDuplicateRowLabels(canvas) {
        const rowLabels = {};
        const duplicates = [];
        const allObjects = canvas.getObjects();
        allObjects.forEach(obj => {
            if (obj.objectType === "seat" && obj.rowLabel && obj.rowLabel.trim() !== "") {
                const label = obj.rowLabel.trim();
                if (!rowLabels[label]) rowLabels[label] = [];
                rowLabels[label].push(obj);
            }
            if (obj.isRowLabel === true && obj.text && obj.text.trim() !== "") {
                const label = obj.text.trim();
                if (!rowLabels[label]) rowLabels[label] = [];
                rowLabels[label].push(obj);
            }
        });
        Object.keys(rowLabels).forEach(label => {
            if (rowLabels[label].length > 1) duplicates.push(...rowLabels[label]);
        });
        return duplicates;
    },

    highlightInvalidObjects(objects, canvas) {
        objects.forEach(obj => {
            obj.set({ stroke: "red", strokeWidth: 3 });
        });
        canvas.requestRenderAll();
    },

    showValidation(canvas) {
        var divvalid = document.getElementById("divvalidate");
        var lblvalidation = document.getElementById("lblvalidation");
        var catvalidtion = document.getElementById("catvalidation");
        divvalid.style.display = "block";
        lblvalidation.style.display = "block";
        catvalidation.style.display = "block";
        const invalid = this.validateLabels(canvas);
        const uncategorized = this.isCategorized(canvas);
        if (invalid.length > 0) {
            lblvalidation.innerText = invalid.length + " unlabeled objects";
            lblvalidation.style.color = "red";
        } else {
            lblvalidation.innerText = "All objects are labeled";
            lblvalidation.style.color = "green";
        }
        if (uncategorized.length > 0) {
            catvalidation.innerText = uncategorized.length + " uncategorized objects";
            catvalidation.style.color = "red";
        } else {
            catvalidation.innerText = "All objects are categorized";
            catvalidation.style.color = "green";
        }
    },

    disableValidation() {
        var divvalid = document.getElementById("divvalidate");
        var lblvalidation = document.getElementById("lblvalidation");
        var catvalidation = document.getElementById("catvalidation");
        divvalid.style.display = "none";
        lblvalidation.style.display = "none";
        catvalidation.style.display = "none";
    },

    createMultipleRowPreview(canvas, pointer) {
        this.clearMultipleRowPreview(canvas);
        if (this.firstRowSeatCount === 0) return;
        const spacing = this.seatSpacing || 20;
        const rowLabel = "";
        let offsetX = 0, offsetY = 0;
        if (this.firstRowDirection === "horizontal") {
            offsetY = pointer.y - this.rowStart.y;
        } else {
            offsetX = pointer.x - this.rowStart.x;
        }
        for (let i = 0; i < this.firstRowSeatCount; i++) {
            const baseX = this.rowStart.x + (this.firstRowDirection === "horizontal" ? i * spacing : 0);
            const baseY = this.rowStart.y + (this.firstRowDirection === "vertical" ? i * spacing : 0);
            const x = baseX + offsetX;
            const y = baseY + offsetY;
            const seat = new fabric.Circle({
                left: x, top: y, radius: 8, fill: "rgba(255, 255, 255, 0.7)",
                originX: "center", originY: "center", selectable: false, evented: false,
                stroke: "blue", strokeWidth: 1
            });
            seat.isMultiRowPreview = true;
            this.previewSeats.push(seat);
            canvas.add(seat);
        }
        if (this.firstRowDirection === "horizontal") {
            const startX = this.rowStart.x + offsetX;
            const endX = startX + (this.firstRowSeatCount - 1) * spacing;
            const y = this.rowStart.y + offsetY;
            this.previewLine = new fabric.Line([startX, y, endX, y], {
                stroke: "#4CAF50", strokeDashArray: [5, 5], strokeWidth: 2,
                selectable: false, evented: false
            });
        } else {
            const x = this.rowStart.x + offsetX;
            const startY = this.rowStart.y + offsetY;
            const endY = startY + (this.firstRowSeatCount - 1) * spacing;
            this.previewLine = new fabric.Line([x, startY, x, endY], {
                stroke: "#4CAF50", strokeDashArray: [5, 5], strokeWidth: 2,
                selectable: false, evented: false
            });
        }
        canvas.add(this.previewLine);
    },

    createRowFromPreview(canvas) {
        if (!this.previewSeats || this.previewSeats.length === 0) return;
        const spacing = this.seatSpacing || 20;
        const count = this.previewSeats.length;
        const rowLabel = "";
        const rowId = `row-${rowLabel}-${Date.now()}`;
        isBulkAdding = true;
        for (let i = 0; i < count; i++) {
            const previewSeat = this.previewSeats[i];
            const x = previewSeat.left;
            const y = previewSeat.top;
            const seatLabel = (i + 1).toString();
            const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
            this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
        }
        isBulkAdding = false;
        this.firstRowStart = { x: this.rowStart.x, y: this.rowStart.y };
        this.autoIncrementRowLabel();
    },

    createMultipleRowFromPreview(canvas) {
        if (this.firstRowSeatCount === 0) return;
        const spacing = this.seatSpacing || 20;
        const rowLabel = "";
        const rowId = `row-${rowLabel}-${Date.now()}`;
        isBulkAdding = true;
        let offsetX = 0, offsetY = 0;
        if (this.firstRowDirection === "horizontal") {
            offsetY = this.rowStart.y - this.firstRowStart.y;
        } else {
            offsetX = this.rowStart.x - this.firstRowStart.x;
        }
        for (let i = 0; i < this.firstRowSeatCount; i++) {
            const baseX = this.firstRowStart.x + (this.firstRowDirection === "horizontal" ? i * spacing : 0);
            const baseY = this.firstRowStart.y + (this.firstRowDirection === "vertical" ? i * spacing : 0);
            const x = baseX + offsetX;
            const y = baseY + offsetY;
            const seatLabel = (i + 1).toString();
            const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
            this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
        }
        isBulkAdding = false;
        this.rowStart = { x: this.rowStart.x, y: this.rowStart.y };
        this.autoIncrementRowLabel();
    },

    autoIncrementRowLabel() {
        const txtRowLbl = document.getElementById("txtrowlbl");
        if (!txtRowLbl) return;
        const currentValue = txtRowLbl.value;
        const match = currentValue.match(/^(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const number = parseInt(match[2]);
            txtRowLbl.value = prefix + (number + 1);
        } else if (currentValue.match(/^[A-Z]$/i)) {
            const charCode = currentValue.charCodeAt(0);
            txtRowLbl.value = String.fromCharCode(charCode + 1);
        }
    },

    showNextRowGuide(canvas) {
        if (this.firstRowSeatCount === 0 || !this.firstRowStart) return;
        if (this.nextRowGuide) canvas.remove(this.nextRowGuide);
        const spacing = this.seatSpacing || 20;
        const rowGap = this.rowGap || 30;
        if (this.firstRowDirection === "horizontal") {
            const nextY = this.rowStart.y + rowGap;
            this.nextRowGuide = new fabric.Line([0, nextY, canvas.width, nextY], {
                stroke: "#FF9800", strokeDashArray: [5, 5], strokeWidth: 1,
                selectable: false, evented: false, opacity: 0.5
            });
        } else {
            const nextX = this.rowStart.x + rowGap;
            this.nextRowGuide = new fabric.Line([nextX, 0, nextX, canvas.height], {
                stroke: "#FF9800", strokeDashArray: [5, 5], strokeWidth: 1,
                selectable: false, evented: false, opacity: 0.5
            });
        }
        canvas.add(this.nextRowGuide);
        canvas.sendToBack(this.nextRowGuide);
    },

    clearMultipleRowPreview(canvas) {
        this.previewSeats.forEach(seat => {
            if (seat.isMultiRowPreview) canvas.remove(seat);
        });
        this.previewSeats = this.previewSeats.filter(seat => !seat.isMultiRowPreview);
        if (this.previewLine) {
            canvas.remove(this.previewLine);
            this.previewLine = null;
        }
    },

    clearAllPreviews(canvas) {
        if (this.previewSeats) {
            this.previewSeats.forEach(s => {
                if (canvas && s && canvas.contains(s)) canvas.remove(s);
            });
        }
        this.previewSeats = [];
        if (this.previewLine && canvas && canvas.contains(this.previewLine)) {
            canvas.remove(this.previewLine);
            this.previewLine = null;
        }
        if (this.nextRowGuide && canvas && canvas.contains(this.nextRowGuide)) {
            canvas.remove(this.nextRowGuide);
            this.nextRowGuide = null;
        }
        this.clearAlignmentGuides(canvas);
        this.clearRowGuide(canvas);
        this.multiRowPreviewRows = [];
        const tooltip = document.getElementById("seatTooltip");
        if (tooltip) tooltip.style.display = "none";
    },

    createRowAtPosition(canvas, pointer) {
        const spacing = this.seatSpacing || 20;
        for (let i = 0; i < this.firstRowSeatCount; i++) {
            const x = this.rowDirection === "horizontal" ? pointer.x + i * spacing : pointer.x;
            const y = this.rowDirection === "vertical" ? pointer.y + i * spacing : pointer.y;
            this.createSeat(canvas, x, y, i + 1);
        }
        canvas.renderAll();
    },

    createRowAt(canvas, pos) {
        const spacing = this.seatSpacing || 25;
        const direction = this.firstRowDirection || this.rowDirection;
        const startX = this.firstRowStartX;
        const startY = pos.y;
        for (let i = 0; i < this.firstRowSeatCount; i++) {
            let x = startX;
            let y = startY;
            if (direction === "horizontal") x = startX + i * spacing;
            else y = startY + i * spacing;
            this.createSeat(canvas, x, y, i + 1);
        }
    },

    createNextRow(canvas, pointer) {
        const spacing = this.seatSpacing || 25;
        const startX = this.rowStart.x;
        const startY = this.rowStart.y + this.rowGap;
        const newStart = { x: startX, y: startY };
        this.createRowAt(canvas, newStart);
    },

    updateFirstRowPreview(canvas, pointer, opt) {
        if (this.previewLine) {
            canvas.remove(this.previewLine);
            this.previewLine = null;
        }
        this.previewSeats.forEach(s => canvas.remove(s));
        this.previewSeats = [];
        const dx = Math.abs(pointer.x - this.rowStart.x);
        const dy = Math.abs(pointer.y - this.rowStart.y);
        this.rowDirection = dx > dy ? "horizontal" : "vertical";
        const spacing = this.seatSpacing || 22;
        const dist = this.rowDirection === "horizontal" ? dx : dy;
        const seatCount = Math.max(1, Math.floor(dist / spacing) + 1);
        this.firstRowSeatCount = seatCount;
        const tooltip = document.getElementById("seatTooltip");
        if (tooltip && opt && opt.e) {
            tooltip.textContent = `Seats: ${seatCount}`;
            tooltip.style.left = (opt.e.clientX + 10) + "px";
            tooltip.style.top = (opt.e.clientY + 10) + "px";
            tooltip.style.display = "block";
        }
        this.updateFullHeightRowGuides(canvas, this.rowStart, this.rowDirection, seatCount);
        this.previewLine = new fabric.Line([
            this.rowStart.x, this.rowStart.y,
            this.rowDirection === "horizontal" ? this.rowStart.x + (this.firstRowSeatCount - 1) * spacing : this.rowStart.x,
            this.rowDirection === "vertical" ? this.rowStart.y + (this.firstRowSeatCount - 1) * spacing : this.rowStart.y
        ], { stroke: "#2196F3", strokeDashArray: [5, 5], selectable: false, evented: false });
        canvas.add(this.previewLine);
        for (let i = 0; i < this.firstRowSeatCount; i++) {
            const x = this.rowDirection === "horizontal" ? this.rowStart.x + i * spacing : this.rowStart.x;
            const y = this.rowDirection === "vertical" ? this.rowStart.y + i * spacing : this.rowStart.y;
            const seat = new fabric.Circle({
                left: x, top: y, radius: 8, fill: "rgba(255, 255, 255, 0.7)",
                stroke: "black", selectable: false, evented: false,
                originX: "center", originY: "center"
            });
            this.previewSeats.push(seat);
            canvas.add(seat);
        }
        canvas.renderAll();
    },

    createPreviewRow(canvas, rowY, rowIndex, opt) {
        const spacing = this.seatSpacing || 22;
        const seatCount = this.firstRowSeatCount;
        const angle = this.firstRowAngle || this.rowAngle || 0;
        const startX = this.firstRowStartX || this.rowStart.x;
        const startY = this.firstRowStartY || this.rowStart.y;
        if (seatCount === 0) return;
        const verticalOffset = rowY - startY;
        let rowStartX = startX;
        let rowStartY = rowY;
        if (angle !== 0 && angle !== 180) {
            const perpAngle = angle + 90;
            const perpOffset = verticalOffset / Math.sin(perpAngle * Math.PI / 180);
            rowStartX = startX + Math.cos(perpAngle * Math.PI / 180) * perpOffset;
            rowStartY = startY + Math.sin(perpAngle * Math.PI / 180) * perpOffset;
        }
        const tooltip = document.getElementById("rowTooltip");
        if (tooltip && opt && opt.e) {
            tooltip.style.position = "absolute";
            tooltip.textContent = (rowIndex + 1) + ' x ' + seatCount;
            tooltip.style.left = (opt.e.clientX + 10) + "px";
            tooltip.style.top = (opt.e.clientY + 10) + "px";
            tooltip.style.display = "block";
        }
        for (let i = 0; i < seatCount; i++) {
            const seatDistance = i * spacing;
            const x = rowStartX + Math.cos(angle * Math.PI / 180) * seatDistance;
            const y = rowStartY + Math.sin(angle * Math.PI / 180) * seatDistance;
            const seat = new fabric.Circle({
                left: x, top: y, radius: 8, fill: "rgba(255, 255, 255, 0.7)",
                originX: "center", originY: "center", selectable: false, evented: false,
                stroke: "blue", strokeWidth: 1
            });
            seat.isPreviewRow = true;
            seat.rowIndex = rowIndex;
            seat.seatIndex = i;
            this.previewSeats.push(seat);
            canvas.add(seat);
        }
        const endX = rowStartX + Math.cos(angle * Math.PI / 180) * ((seatCount - 1) * spacing);
        const endY = rowStartY + Math.sin(angle * Math.PI / 180) * ((seatCount - 1) * spacing);
        const line = new fabric.Line([rowStartX, rowStartY, endX, endY], {
            stroke: "#4CAF50", strokeDashArray: [5, 5], strokeWidth: 1,
            selectable: false, evented: false, opacity: 0.7
        });
        line.isPreviewRow = true;
        line.rowIndex = rowIndex;
        this.previewSeats.push(line);
        canvas.add(line);
    },

    createActualRowFromPreview(canvas) {
        if (this.firstRowSeatCount === 0) return;
        const spacing = this.seatSpacing || 22;
        const rowLabel = "";
        const rowId = `row-${rowLabel}-${Date.now()}`;
        const angle = this.firstRowAngle || this.rowAngle || 0;
        isBulkAdding = true;
        const useAngledPositioning = (angle !== 0 && angle !== 90 && angle !== 180 && angle !== 270);
        if (useAngledPositioning) {
            for (let i = 0; i < this.firstRowSeatCount; i++) {
                const seatDistance = i * spacing;
                const x = this.rowStart.x + Math.cos(angle * Math.PI / 180) * seatDistance;
                const y = this.rowStart.y + Math.sin(angle * Math.PI / 180) * seatDistance;
                const seatLabel = (i + 1).toString();
                const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
                this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
            }
        } else {
            const isHorizontal = (angle === 0 || angle === 180);
            for (let i = 0; i < this.firstRowSeatCount; i++) {
                let x = this.rowStart.x;
                let y = this.rowStart.y;
                if (isHorizontal) {
                    x = this.rowStart.x + i * spacing;
                    if (angle === 180) x = this.rowStart.x - i * spacing;
                } else {
                    y = this.rowStart.y + i * spacing;
                    if (angle === 270) y = this.rowStart.y - i * spacing;
                }
                const seatLabel = (i + 1).toString();
                const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
                this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
            }
        }
        isBulkAdding = false;
        this.rowAngle = angle;
        this.firstRowAngle = angle;
        this.autoIncrementRowLabel();
        saveState(canvas);
    },

    createActualRowsFromPreviews(canvas) {
        if (this.firstRowSeatCount === 0) return;
        const spacing = this.seatSpacing || 22;
        const rowGap = this.rowGap || 30;
        const angle = this.firstRowAngle || 0;
        const startX = this.firstRowStartX || this.rowStart.x;
        const startY = this.firstRowStartY || this.rowStart.y;
        const maxRowIndex = Math.max(0, ...this.previewSeats.filter(s => s.isPreviewRow && s.rowIndex).map(s => s.rowIndex));
        if (maxRowIndex === 0) return;
        isBulkAdding = true;
        let finalRowStartX = startX;
        let finalRowStartY = startY;
        for (let r = 1; r <= maxRowIndex; r++) {
            const rowY = startY + r * rowGap;
            const rowLabel = "";
            const rowId = `row-${rowLabel}-${Date.now()}-${r}`;
            let rowStartX = startX;
            let rowStartY = rowY;
            if (angle !== 0 && angle !== 180) {
                const perpAngle = angle + 90;
                const verticalOffset = rowY - startY;
                const perpOffset = verticalOffset / Math.sin(perpAngle * Math.PI / 180);
                rowStartX = startX + Math.cos(perpAngle * Math.PI / 180) * perpOffset;
                rowStartY = startY + Math.sin(perpAngle * Math.PI / 180) * perpOffset;
            }
            finalRowStartX = rowStartX;
            finalRowStartY = rowStartY;
            for (let i = 0; i < this.firstRowSeatCount; i++) {
                const seatDistance = i * spacing;
                const x = rowStartX + Math.cos(angle * Math.PI / 180) * seatDistance;
                const y = rowStartY + Math.sin(angle * Math.PI / 180) * seatDistance;
                const seatLabel = (i + 1).toString();
                const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
                this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
            }
            this.autoIncrementRowLabel();
        }
        isBulkAdding = false;
        this.lastRowPosition = { x: finalRowStartX, y: finalRowStartY, angle: angle };
        saveState(canvas);
    },

    clearGeneratedRows(canvas) {
        if (!this.previewSeats) return;
        const previewRowObjects = this.previewSeats.filter(s => s.isPreviewRow);
        previewRowObjects.forEach(obj => {
            if (canvas.contains(obj)) canvas.remove(obj);
        });
        this.previewSeats = this.previewSeats.filter(s => !s.isPreviewRow);
        this.multiRowPreviewRows = [];
    },

    applyGeneralCategoryLabel(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObject();
        if (!active) {
            showNotification("Please select a rectangle to label");
            return;
        }
        let rect = null;
        if (active.type === "activeSelection") {
            const rectangles = active._objects.filter(obj => obj.objectType === "genrectangle");
            if (rectangles.length > 1) {
                showNotification("Please select only one rectangle at a time for labeling");
                return;
            }
            if (rectangles.length === 0) {
                showNotification("No rectangle found in selection");
                return;
            }
            rect = rectangles[0];
        } else if (active.type === "rect" && active.objectType === "genrectangle") {
            rect = active;
        } else {
            showNotification("Please select a rectangle (not other objects)");
            return;
        }
        const label = document.getElementById("txtrectlbl").value;
        const capacity = document.getElementById("txtcapacity").value;
        if (!label || label.trim() === "") {
            showNotification("Please enter a label");
            return;
        }
        if (rect.generalLabel && rect.labelTextId) {
            const existingLabel = canvas.getObjects().find(obj => obj.id === rect.labelTextId || obj === rect.labelText);
            if (existingLabel) canvas.remove(existingLabel);
            rect.labelText = null;
            rect.labelTextId = null;
        }
        const fontSize = Math.min(rect.height * 0.3, rect.width * 0.2, 16);
        const labelId = `label-${rect.rectangleId}-${Date.now()}`;
        const labelText = new fabric.Text(label, {
            fontSize: Math.max(fontSize, 12), fontWeight: "bold", fill: "white",
            originX: "center", originY: "center",
            left: rect.left + rect.width / 2, top: rect.top + rect.height / 2,
            selectable: false, evented: false, text: label,
            rectangleId: rect.rectangleId, isRectangleLabel: true,
            textAlign: 'center', id: labelId
        });
        rect.generalLabel = label;
        rect.labelTextId = labelId;
        rect.rectangleLabel = label;
        rect.capacity = capacity ? parseInt(capacity) : 0;
        rect.objectType = "genrectangle";
        labelText.generalLabel = label;
        rect.set('labelTextId', labelId);
        rect.set('rectangleLabel', label);
        rect.set('capacity', rect.capacity);
        rect.set('objectType', rect.objectType);
        rect.set('generalLabel', label);
        labelText.set('generalLabel', label);
        rect.currentCount = 0;
        rect.set('currentCount', 0);
        canvas.add(labelText);
        labelText.set('fill', getContrastColor(rect.categoryId));
        canvas.renderAll();
        saveState(canvas);
        return true;
    },

    handleGenRectangleSelection(canvasId, rectangle, mouseEvent, chartId) {
        const canvas = this.canvases[canvasId];
        const rectangleId = rectangle.rectangleId || rectangle.get("rectangleId");
        const category = rectangle.categoryName || rectangle.get("categoryName") || "General";
        const label = rectangle.generalLabel || rectangle.get("generalLabel") || "General Area";
        const capacity = rectangle.capacity || rectangle.get("capacity") || 0;
        const color = rectangle.categoryId || rectangle.fill || "#f0f0f0";
        this.showGASelectionPopup(canvasId, rectangle, mouseEvent, chartId);
    },



    //showGASelectionPopup(canvasId, rectangle, mouseEvent) {
    //    const canvas = this.canvases[canvasId];
    //    const rectangleId = rectangle.rectangleId || rectangle.get("rectangleId");
    //    const category = rectangle.categoryName || rectangle.get("categoryName") || "General";
    //    const label = rectangle.generalLabel || rectangle.get("generalLabel") || "General Area";
    //    const capacity = rectangle.capacity || rectangle.get("capacity") || 0;
    //    const currentCount = rectangle.currentCount || rectangle.get("currentCount") || 0;
    //    const maxAvailable = capacity;

    //    if (!canvas.selectedGAAreas) canvas.selectedGAAreas = [];
    //    const existingIndex = canvas.selectedGAAreas.findIndex(area => area.id === rectangleId);

    //    // Remove existing popup if any
    //    const existingPopup = document.getElementById("seatAdjustmentPopup");
    //    if (existingPopup) {
    //        existingPopup.remove();
    //    }

    //    // Create the popup container
    //    const popup = document.createElement("div");
    //    popup.id = "seatAdjustmentPopup";
    //    popup.style.cssText = `
    //    display: none;
    //    position: fixed;
    //    z-index: 9999;
    //    left: 0;
    //    top: 0;
    //    width: 100%;
    //    height: 100%;
    //    background-color: rgba(0,0,0,0.5);
    //    animation: fadeIn 0.3s ease;
    //`;

    //    // Create modal content
    //    const modalContent = document.createElement("div");
    //    modalContent.className = "modal-content";
    //    modalContent.style.cssText = `
    //    background: white;
    //    position: absolute;
    //    bottom: 0;
    //    left: 0;
    //    right: 0;
    //    width: 100%;
    //    max-width: 500px;
    //    margin: 0 auto;
    //    border-radius: 20px 20px 0 0;
    //    padding: 20px 24px 30px;
    //    box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
    //    animation: slideUp 0.3s ease;
    //    max-height: 90vh;
    //    overflow-y: auto;
    //`;

    //    // Handle for draggable indicator (mobile)
    //    const handle = document.createElement("div");
    //    handle.style.cssText = `
    //    width: 40px;
    //    height: 4px;
    //    background: #d1d5db;
    //    border-radius: 2px;
    //    margin: 0 auto 20px;
    //    display: block;
    //`;

    //    // Title section
    //    const titleSection = document.createElement("div");
    //    titleSection.style.cssText = `
    //    margin-bottom: 20px;
    //`;

    //    const title = document.createElement("h3");
    //    title.style.cssText = `
    //    margin: 0 0 4px 0;
    //    font-size: 18px;
    //    font-weight: 600;
    //    color: #111827;
    //`;
    //    title.textContent = label || 'Select Tickets';

    //    const subtitle = document.createElement("p");
    //    subtitle.style.cssText = `
    //    margin: 0;
    //    font-size: 14px;
    //    color: #6b7280;
    //`;
    //    subtitle.textContent = capacity > 0 ? `Available: ${capacity} tickets` : 'General Admission';

    //    titleSection.appendChild(title);
    //    titleSection.appendChild(subtitle);

    //    // Divider
    //    const divider = document.createElement("hr");
    //    divider.style.cssText = `
    //    border: none;
    //    border-top: 1px solid #e5e7eb;
    //    margin: 0 0 20px 0;
    //`;

    //    // Counter section
    //    const counterSection = document.createElement("div");
    //    counterSection.style.cssText = `
    //    display: flex;
    //    align-items: center;
    //    justify-content: center;
    //    gap: 30px;
    //    padding: 16px 0;
    //    margin-bottom: 20px;
    //    background: #f9fafb;
    //    border-radius: 12px;
    //`;

    //    // Decrease button
    //    const decreaseBtn = document.createElement("button");
    //    decreaseBtn.id = "decreaseSeats";
    //    decreaseBtn.style.cssText = `
    //    width: 50px;
    //    height: 50px;
    //    border-radius: 50%;
    //    border: 2px solid #d1d5db;
    //    background: white;
    //    color: #374151;
    //    font-size: 24px;
    //    cursor: pointer;
    //    display: flex;
    //    align-items: center;
    //    justify-content: center;
    //    transition: all 0.2s;
    //    touch-action: manipulation;
    //    -webkit-tap-highlight-color: transparent;
    //    user-select: none;
    //`;
    //    decreaseBtn.textContent = "−";

    //    // Seat count
    //    const seatCount = document.createElement("span");
    //    seatCount.id = "seatCount";
    //    seatCount.style.cssText = `
    //    font-size: 32px;
    //    font-weight: 700;
    //    color: #111827;
    //    min-width: 50px;
    //    text-align: center;
    //    font-variant-numeric: tabular-nums;
    //`;
    //    seatCount.textContent = "0";

    //    // Increase button
    //    const increaseBtn = document.createElement("button");
    //    increaseBtn.id = "increaseSeats";
    //    increaseBtn.style.cssText = `
    //    width: 50px;
    //    height: 50px;
    //    border-radius: 50%;
    //    border: 2px solid #3b82f6;
    //    background: #3b82f6;
    //    color: white;
    //    font-size: 24px;
    //    cursor: pointer;
    //    display: flex;
    //    align-items: center;
    //    justify-content: center;
    //    transition: all 0.2s;
    //    touch-action: manipulation;
    //    -webkit-tap-highlight-color: transparent;
    //    user-select: none;
    //`;
    //    increaseBtn.textContent = "+";

    //    counterSection.appendChild(decreaseBtn);
    //    counterSection.appendChild(seatCount);
    //    counterSection.appendChild(increaseBtn);

    //    // Button container
    //    const buttonContainer = document.createElement("div");
    //    buttonContainer.style.cssText = `
    //    display: flex;
    //    gap: 12px;
    //    margin-top: 8px;
    //`;

    //    // Cancel button
    //    const cancelBtn = document.createElement("button");
    //    cancelBtn.id = "cancelBtn";
    //    cancelBtn.style.cssText = `
    //    flex: 1;
    //    padding: 14px;
    //    border: 2px solid #d1d5db;
    //    background: white;
    //    color: #374151;
    //    border-radius: 10px;
    //    font-size: 16px;
    //    font-weight: 500;
    //    cursor: pointer;
    //    transition: all 0.2s;
    //    touch-action: manipulation;
    //    -webkit-tap-highlight-color: transparent;
    //`;
    //    cancelBtn.textContent = "Cancel";

    //    // Confirm button
    //    const confirmBtn = document.createElement("button");
    //    confirmBtn.id = "confirmBtn";
    //    confirmBtn.style.cssText = `
    //    flex: 2;
    //    padding: 14px;
    //    border: none;
    //    background: #3b82f6;
    //    color: white;
    //    border-radius: 10px;
    //    font-size: 16px;
    //    font-weight: 500;
    //    cursor: pointer;
    //    transition: all 0.2s;
    //    touch-action: manipulation;
    //    -webkit-tap-highlight-color: transparent;
    //`;
    //    confirmBtn.textContent = "Confirm";

    //    buttonContainer.appendChild(cancelBtn);
    //    buttonContainer.appendChild(confirmBtn);

    //    // Assemble popup
    //    modalContent.appendChild(handle);
    //    modalContent.appendChild(titleSection);
    //    modalContent.appendChild(divider);
    //    modalContent.appendChild(counterSection);
    //    modalContent.appendChild(buttonContainer);
    //    popup.appendChild(modalContent);
    //    document.body.appendChild(popup);

    //    // Add styles
    //    const style = document.createElement('style');
    //    style.textContent = `
    //    @keyframes fadeIn {
    //        from { opacity: 0; }
    //        to { opacity: 1; }
    //    }
    //    @keyframes slideUp {
    //        from { transform: translateY(100%); }
    //        to { transform: translateY(0); }
    //    }
    //    @media (max-width: 480px) {
    //        #seatAdjustmentPopup .modal-content {
    //            border-radius: 20px 20px 0 0;
    //            padding: 16px 16px 24px;
    //        }
    //        #seatAdjustmentPopup .modal-content button {
    //            padding: 16px;
    //            font-size: 17px;
    //            min-height: 52px;
    //        }
    //        #seatAdjustmentPopup .modal-content .counter-btn {
    //            width: 56px;
    //            height: 56px;
    //            font-size: 28px;
    //        }
    //        #seatAdjustmentPopup .modal-content #seatCount {
    //            font-size: 36px;
    //            min-width: 60px;
    //        }
    //        #seatAdjustmentPopup .modal-content h3 {
    //            font-size: 20px;
    //        }
    //    }
    //    @media (min-width: 481px) {
    //        #seatAdjustmentPopup .modal-content {
    //            top: 50%;
    //            transform: translateY(-50%);
    //            border-radius: 20px;
    //            max-width: 420px;
    //            bottom: auto;
    //            animation: modalSlideIn 0.3s ease;
    //        }
    //        @keyframes modalSlideIn {
    //            from {
    //                opacity: 0;
    //                transform: translateY(-50%) scale(0.95);
    //            }
    //            to {
    //                opacity: 1;
    //                transform: translateY(-50%) scale(1);
    //            }
    //        }
    //        #seatAdjustmentPopup .modal-content .handle {
    //            display: none;
    //        }
    //    }
    //    @media (max-width: 480px) {
    //        #seatAdjustmentPopup {
    //            align-items: flex-end;
    //            display: flex !important;
    //            justify-content: center;
    //        }
    //    }
    //    /* Active states for touch */
    //    #seatAdjustmentPopup .modal-content button:active {
    //        transform: scale(0.96);
    //    }
    //    #seatAdjustmentPopup .modal-content .counter-btn:active {
    //        transform: scale(0.92);
    //    }
    //    /* Disabled state */
    //    #seatAdjustmentPopup .modal-content button:disabled {
    //        opacity: 0.5;
    //        cursor: not-allowed;
    //        transform: none !important;
    //    }
    //    /* Hover states for desktop */
    //    @media (hover: hover) {
    //        #seatAdjustmentPopup .modal-content .cancel-btn:hover {
    //            background: #f3f4f6;
    //        }
    //        #seatAdjustmentPopup .modal-content .confirm-btn:hover {
    //            background: #2563eb;
    //        }
    //        #seatAdjustmentPopup .modal-content .decrease-btn:hover:not(:disabled) {
    //            background: #f3f4f6;
    //            border-color: #9ca3af;
    //        }
    //        #seatAdjustmentPopup .modal-content .increase-btn:hover:not(:disabled) {
    //            background: #2563eb;
    //            border-color: #2563eb;
    //        }
    //    }
    //`;
    //    document.head.appendChild(style);

    //    // Add class names for styling
    //    modalContent.querySelector('#decreaseSeats').className = 'counter-btn decrease-btn';
    //    modalContent.querySelector('#increaseSeats').className = 'counter-btn increase-btn';
    //    modalContent.querySelector('#cancelBtn').className = 'cancel-btn';
    //    modalContent.querySelector('#confirmBtn').className = 'confirm-btn';
    //    handle.className = 'handle';

    //    // Set initial ticket count
    //    let ticketCount = parseInt(currentCount) || 0;
    //    seatCount.textContent = ticketCount;

    //    // Update button states
    //    const updateButtonStates = () => {
    //        const isMax = ticketCount >= maxAvailable || maxAvailable <= 0;
    //        const isMin = ticketCount <= 0 || maxAvailable <= 0;

    //        increaseBtn.disabled = isMax;
    //        decreaseBtn.disabled = isMin;

    //        increaseBtn.style.opacity = isMax ? '0.5' : '1';
    //        decreaseBtn.style.opacity = isMin ? '0.5' : '1';

    //        if (isMax) {
    //            increaseBtn.style.background = '#93c5fd';
    //            increaseBtn.style.borderColor = '#93c5fd';
    //        } else {
    //            increaseBtn.style.background = '#3b82f6';
    //            increaseBtn.style.borderColor = '#3b82f6';
    //        }
    //    };
    //    updateButtonStates();

    //    // Increase handler
    //    const handleIncrease = (e) => {
    //        e.preventDefault();
    //        e.stopPropagation();
    //        if (ticketCount < maxAvailable && maxAvailable > 0) {
    //            ticketCount++;
    //            seatCount.textContent = ticketCount;
    //            updateButtonStates();
    //        }
    //    };

    //    // Decrease handler
    //    const handleDecrease = (e) => {
    //        e.preventDefault();
    //        e.stopPropagation();
    //        if (ticketCount > 0) {
    //            ticketCount--;
    //            seatCount.textContent = ticketCount;
    //            updateButtonStates();
    //        }
    //    };

    //    increaseBtn.onclick = handleIncrease;
    //    decreaseBtn.onclick = handleDecrease;
    //    increaseBtn.ontouchstart = handleIncrease;
    //    decreaseBtn.ontouchstart = handleDecrease;

    //    // Confirm handler
    //    confirmBtn.onclick = (e) => {
    //        e.stopPropagation();

    //        if (ticketCount === 0) {
    //            if (existingIndex >= 0) {
    //                canvas.selectedGAAreas.splice(existingIndex, 1);
    //            }
    //            rectangle.set({
    //                fill: rectangle.categoryId || rectangle.fill || "#f2fd58",
    //                stroke: "black",
    //                strokeWidth: 1
    //            });
    //            this.removeGASelectionIndicator(canvas, rectangle);
    //            this.updateRectangleLabelWithCount(canvas, rectangle, 0);
    //        } else {
    //            const categoryName = rectangle.categoryName || rectangle.get('categoryName') || 'General';
    //            const categoryId = rectangle.categoryId || rectangle.get('categoryId') || '';

    //            const gaAreaData = {
    //                id: rectangleId,
    //                label: label,
    //                categoryId: categoryId,
    //                categoryName: categoryName,
    //                ticketCount: ticketCount,
    //                capacity: capacity,
    //                ticketType: "",
    //                ticketTypeName: "",
    //                x: rectangle.left,
    //                y: rectangle.top,
    //                width: rectangle.width,
    //                height: rectangle.height,
    //                pricing: rectangle.pricing || null,
    //                selectedPrice: rectangle.selectedPrice || null,
    //                rectangleRef: rectangle
    //            };

    //            if (existingIndex >= 0) {
    //                canvas.selectedGAAreas[existingIndex] = gaAreaData;
    //            } else {
    //                canvas.selectedGAAreas.push(gaAreaData);
    //                rectangle.set({
    //                    fill: rectangle.categoryId || rectangle.fill || "#f2fd58",
    //                    stroke: "",
    //                    strokeWidth: 2
    //                });
    //            }
    //            this.updateGASelectionIndicator(canvas, rectangle, ticketCount);
    //            this.updateRectangleLabelWithCount(canvas, rectangle, ticketCount);
    //        }

    //        canvas.renderAll();
    //        this.closeSeatPopup();
    //        this.sendGASelectionToParent(canvas);
    //    };

    //    // Cancel handler
    //    cancelBtn.onclick = (e) => {
    //        e.stopPropagation();
    //        this.updateRectangleLabelWithCount(canvas, rectangle, 0);
    //        canvas.selectedGAAreas = [];
    //        canvas.renderAll();
    //        this.closeSeatPopup();
    //        this.sendGASelectionToParent(canvas);
    //    };

    //    // Close on backdrop click (desktop only)
    //    popup.onclick = (e) => {
    //        if (e.target === popup && window.innerWidth > 480) {
    //            this.closeSeatPopup();
    //            canvas.renderAll();
    //        }
    //    };

    //    // Handle escape key
    //    const handleEscape = (e) => {
    //        if (e.key === 'Escape') {
    //            this.closeSeatPopup();
    //            canvas.renderAll();
    //        }
    //    };
    //    document.addEventListener('keydown', handleEscape);
    //    this._escapeHandler = handleEscape;

    //    // Show popup
    //    popup.style.display = "block";

    //    // Handle resize
    //    const handleResize = () => {
    //        const isMobile = window.innerWidth <= 480;
    //        if (isMobile) {
    //            modalContent.style.top = 'auto';
    //            modalContent.style.bottom = '0';
    //            modalContent.style.transform = 'none';
    //            modalContent.style.borderRadius = '20px 20px 0 0';
    //            modalContent.style.maxWidth = '100%';
    //            popup.style.alignItems = 'flex-end';
    //            popup.style.justifyContent = 'center';
    //            handle.style.display = 'block';
    //        } else {
    //            modalContent.style.top = '50%';
    //            modalContent.style.bottom = 'auto';
    //            modalContent.style.transform = 'translateY(-50%)';
    //            modalContent.style.borderRadius = '20px';
    //            modalContent.style.maxWidth = '420px';
    //            popup.style.alignItems = '';
    //            popup.style.justifyContent = '';
    //            handle.style.display = 'none';
    //        }
    //    };
    //    handleResize();
    //    window.addEventListener('resize', handleResize);
    //    this._resizeHandler = handleResize;
    //},

    async showGASelectionPopup(canvasId, rectangle, mouseEvent, chartId) {
        const canvas = this.canvases[canvasId];
        const rectangleId = rectangle.rectangleId || rectangle.get("rectangleId");
        const category = rectangle.categoryName || rectangle.get("categoryName") || "General";
        const label = rectangle.generalLabel || rectangle.get("generalLabel") || "General Area";
        // const capacity = rectangle.capacity || rectangle.get("capacity") || 0;
        debugger;
        const capacity = await getAvailableCount(chartId, label);
        //const capacity = 0;
        const currentCount = rectangle.currentCount || rectangle.get("currentCount") || 0;
        const maxAvailable = capacity;

        if (!canvas.selectedGAAreas) canvas.selectedGAAreas = [];
        const existingIndex = canvas.selectedGAAreas.findIndex(area => area.id === rectangleId);

        // Remove existing popup if any
        const existingPopup = document.getElementById("seatAdjustmentPopup");
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create the popup container
        const popup = document.createElement("div");
        popup.id = "seatAdjustmentPopup";
        popup.style.cssText = `
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        animation: fadeIn 0.3s ease;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
    `;

        // Create modal content
        const modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalContent.style.cssText = `
        background: white;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        animation: modalPopIn 0.3s ease;
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
    `;

        // Close button (X) at top right
        const closeBtn = document.createElement("button");
        closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
        transition: background-color 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        line-height: 1;
    `;
        closeBtn.textContent = "✕";
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeSeatPopup();
            canvas.renderAll();
        };

        // Title section
        const titleSection = document.createElement("div");
        titleSection.style.cssText = `
        margin-bottom: 16px;
        padding-right: 30px;
    `;

        const title = document.createElement("h3");
        title.style.cssText = `
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
    `;
        title.textContent = label || 'Select Tickets';

        const subtitle = document.createElement("p");
        subtitle.style.cssText = `
        margin: 0;
        font-size: 13px;
        color: #6b7280;
    `;
        subtitle.textContent = capacity > 0 ? `Available: ${capacity} tickets` : 'General Admission';

        titleSection.appendChild(title);
        titleSection.appendChild(subtitle);

        // Divider
        const divider = document.createElement("hr");
        divider.style.cssText = `
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 0 0 20px 0;
    `;

        // Counter section
        const counterSection = document.createElement("div");
        counterSection.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 30px;
        padding: 16px 0;
        margin-bottom: 24px;
        background: #f9fafb;
        border-radius: 12px;
    `;

        // Decrease button
        const decreaseBtn = document.createElement("button");
        decreaseBtn.id = "decreaseSeats";
        decreaseBtn.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid #d1d5db;
        background: white;
        color: #374151;
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    `;
        decreaseBtn.textContent = "−";

        // Seat count
        const seatCount = document.createElement("span");
        seatCount.id = "seatCount";
        seatCount.style.cssText = `
        font-size: 30px;
        font-weight: 700;
        color: #111827;
        min-width: 50px;
        text-align: center;
        font-variant-numeric: tabular-nums;
    `;
        seatCount.textContent = "0";

        // Increase button
        const increaseBtn = document.createElement("button");
        increaseBtn.id = "increaseSeats";
        increaseBtn.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        background: #3b82f6;
        color: white;
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    `;
        increaseBtn.textContent = "+";

        counterSection.appendChild(decreaseBtn);
        counterSection.appendChild(seatCount);
        counterSection.appendChild(increaseBtn);

        // Button container
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        margin-top: 4px;
    `;

        // Cancel button
        const cancelBtn = document.createElement("button");
        cancelBtn.id = "cancelBtn";
        cancelBtn.style.cssText = `
        flex: 1;
        padding: 12px 20px;
        border: 2px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    `;
        cancelBtn.textContent = "Cancel";

        // Confirm button
        const confirmBtn = document.createElement("button");
        confirmBtn.id = "confirmBtn";
        confirmBtn.style.cssText = `
        flex: 2;
        padding: 12px 20px;
        border: none;
        background: #3b82f6;
        color: white;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    `;
        confirmBtn.textContent = "Confirm";

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(confirmBtn);

        // Assemble popup
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(titleSection);
        modalContent.appendChild(divider);
        modalContent.appendChild(counterSection);
        modalContent.appendChild(buttonContainer);
        popup.appendChild(modalContent);
        document.body.appendChild(popup);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes modalPopIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        @media (max-width: 480px) {
            #seatAdjustmentPopup .modal-content {
                max-width: 95%;
                padding: 20px 16px;
                margin: 10px;
                border-radius: 16px;
            }
            #seatAdjustmentPopup .modal-content button {
                padding: 14px 16px;
                font-size: 16px;
                min-height: 48px;
            }
            #seatAdjustmentPopup .modal-content #decreaseSeats,
            #seatAdjustmentPopup .modal-content #increaseSeats {
                width: 52px;
                height: 52px;
                font-size: 24px;
            }
            #seatAdjustmentPopup .modal-content #seatCount {
                font-size: 32px;
                min-width: 55px;
            }
            #seatAdjustmentPopup .modal-content h3 {
                font-size: 17px;
            }
            #seatAdjustmentPopup .modal-content .counter-section {
                gap: 20px;
                padding: 12px 0;
            }
        }
        @media (max-width: 360px) {
            #seatAdjustmentPopup .modal-content {
                padding: 16px 12px;
            }
            #seatAdjustmentPopup .modal-content #decreaseSeats,
            #seatAdjustmentPopup .modal-content #increaseSeats {
                width: 44px;
                height: 44px;
                font-size: 20px;
            }
            #seatAdjustmentPopup .modal-content #seatCount {
                font-size: 28px;
                min-width: 45px;
            }
            #seatAdjustmentPopup .modal-content .button-container {
                gap: 8px;
            }
        }
        /* Touch feedback */
        #seatAdjustmentPopup .modal-content button:active {
            transform: scale(0.96);
        }
        #seatAdjustmentPopup .modal-content #decreaseSeats:active,
        #seatAdjustmentPopup .modal-content #increaseSeats:active {
            transform: scale(0.92);
        }
        /* Disabled state */
        #seatAdjustmentPopup .modal-content button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        /* Hover states for desktop */
        @media (hover: hover) {
            #seatAdjustmentPopup .modal-content .cancel-btn:hover {
                background: #f3f4f6;
            }
            #seatAdjustmentPopup .modal-content .confirm-btn:hover {
                background: #2563eb;
            }
            #seatAdjustmentPopup .modal-content #decreaseSeats:hover:not(:disabled) {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            #seatAdjustmentPopup .modal-content #increaseSeats:hover:not(:disabled) {
                background: #2563eb;
                border-color: #2563eb;
            }
            #seatAdjustmentPopup .modal-content .close-btn:hover {
                background: #f3f4f6;
            }
        }
    `;
        document.head.appendChild(style);

        // Add class names for styling
        modalContent.querySelector('#decreaseSeats').className = 'decrease-btn';
        modalContent.querySelector('#increaseSeats').className = 'increase-btn';
        modalContent.querySelector('#cancelBtn').className = 'cancel-btn';
        modalContent.querySelector('#confirmBtn').className = 'confirm-btn';
        closeBtn.className = 'close-btn';
        counterSection.className = 'counter-section';
        buttonContainer.className = 'button-container';

        // Set initial ticket count
        let ticketCount = parseInt(currentCount) || 0;
        seatCount.textContent = ticketCount;

        // Update button states
        const updateButtonStates = () => {
            const isMax = ticketCount >= maxAvailable || maxAvailable <= 0;
            const isMin = ticketCount <= 0 || maxAvailable <= 0;

            increaseBtn.disabled = isMax;
            decreaseBtn.disabled = isMin;

            increaseBtn.style.opacity = isMax ? '0.5' : '1';
            decreaseBtn.style.opacity = isMin ? '0.5' : '1';

            if (isMax) {
                increaseBtn.style.background = '#93c5fd';
                increaseBtn.style.borderColor = '#93c5fd';
            } else {
                increaseBtn.style.background = '#3b82f6';
                increaseBtn.style.borderColor = '#3b82f6';
            }

            if (isMin) {
                decreaseBtn.style.background = '#f3f4f6';
                decreaseBtn.style.borderColor = '#d1d5db';
                decreaseBtn.style.color = '#9ca3af';
            } else {
                decreaseBtn.style.background = 'white';
                decreaseBtn.style.borderColor = '#d1d5db';
                decreaseBtn.style.color = '#374151';
            }
        };
        updateButtonStates();

        // Increase handler
        const handleIncrease = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (ticketCount < maxAvailable && maxAvailable > 0) {
                ticketCount++;
                seatCount.textContent = ticketCount;
                updateButtonStates();
            }
        };

        // Decrease handler
        const handleDecrease = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (ticketCount > 0) {
                ticketCount--;
                seatCount.textContent = ticketCount;
                updateButtonStates();
            }
        };

        increaseBtn.onclick = handleIncrease;
        decreaseBtn.onclick = handleDecrease;
        increaseBtn.ontouchstart = handleIncrease;
        decreaseBtn.ontouchstart = handleDecrease;

        // Confirm handler
        confirmBtn.onclick = (e) => {
            e.stopPropagation();

            if (ticketCount === 0) {
                if (existingIndex >= 0) {
                    canvas.selectedGAAreas.splice(existingIndex, 1);
                }
                rectangle.set({
                    fill: rectangle.categoryId || rectangle.fill || "#f2fd58",
                    stroke: "black",
                    strokeWidth: 1
                });
                this.removeGASelectionIndicator(canvas, rectangle);
                this.updateRectangleLabelWithCount(canvas, rectangle, 0);
            } else {
                const categoryName = rectangle.categoryName || rectangle.get('categoryName') || 'General';
                const categoryId = rectangle.categoryId || rectangle.get('categoryId') || '';

                const gaAreaData = {
                    id: rectangleId,
                    label: label,
                    categoryId: categoryId,
                    categoryName: categoryName,
                    ticketCount: ticketCount,
                    capacity: capacity,
                    ticketType: "",
                    ticketTypeName: "",
                    x: rectangle.left,
                    y: rectangle.top,
                    width: rectangle.width,
                    height: rectangle.height,
                    pricing: rectangle.pricing || null,
                    selectedPrice: rectangle.selectedPrice || null,
                    rectangleRef: rectangle
                };

                if (existingIndex >= 0) {
                    canvas.selectedGAAreas[existingIndex] = gaAreaData;
                } else {
                    canvas.selectedGAAreas.push(gaAreaData);
                    rectangle.set({
                        fill: rectangle.categoryId || rectangle.fill || "#f2fd58",
                        stroke: "",
                        strokeWidth: 2
                    });
                }
                this.updateGASelectionIndicator(canvas, rectangle, ticketCount);
                this.updateRectangleLabelWithCount(canvas, rectangle, ticketCount);
            }

            canvas.renderAll();
            this.closeSeatPopup();
            this.sendGASelectionToParent(canvas);
        };

        // Cancel handler
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            this.updateRectangleLabelWithCount(canvas, rectangle, 0);
            canvas.selectedGAAreas = [];
            canvas.renderAll();
            this.closeSeatPopup();
            this.sendGASelectionToParent(canvas);
        };

        // Close on backdrop click
        popup.onclick = (e) => {
            if (e.target === popup) {
                this.closeSeatPopup();
                canvas.renderAll();
            }
        };

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeSeatPopup();
                canvas.renderAll();
            }
        };
        document.addEventListener('keydown', handleEscape);
        this._escapeHandler = handleEscape;

        // Show popup
        popup.style.display = "flex";

        // Handle window resize - ensure popup stays centered
        const handleResize = () => {
            // Just ensure the popup stays centered
            popup.style.display = "flex";
        };
        window.addEventListener('resize', handleResize);
        this._resizeHandler = handleResize;
    },
    // Helper method to close the popup

    //closeSeatPopup() {
    //    const popup = document.getElementById("seatAdjustmentPopup");
    //    if (popup) {
    //        popup.remove();
    //    }
    //    if (this._escapeHandler) {
    //        document.removeEventListener('keydown', this._escapeHandler);
    //        this._escapeHandler = null;
    //    }
    //    if (this._resizeHandler) {
    //        window.removeEventListener('resize', this._resizeHandler);
    //        this._resizeHandler = null;
    //    }
    //},

    closeSeatPopup() {
        const popup = document.getElementById("seatAdjustmentPopup");
        if (popup) {
            popup.remove();
        }
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    },
    showGAAdjustmentPopup(canvasId, rectangle, existingIndex, mouseEvent) {
        const canvas = this.canvases[canvasId];
        const rectangleId = rectangle.rectangleId || rectangle.get("rectangleId");
        const selectedArea = canvas.selectedGAAreas[existingIndex];
        const category = rectangle.categoryName || rectangle.get("categoryName") || "General";
        const label = rectangle.generalLabel || rectangle.get("generalLabel") || "General Area";
        const capacity = rectangle.capacity || rectangle.get("capacity") || 0;
        const availableForThisArea = capacity;
        document.getElementById("popupTitle").textContent = `Adjust ${label} Tickets`;
        document.getElementById("categoryInfo").innerHTML = `<strong>Area:</strong> ${label}<br><strong>Category:</strong> ${category}<br><strong>Currently Selected:</strong> ${selectedArea.ticketCount} tickets<br><strong>Maximum:</strong> ${availableForThisArea} tickets`;
        let ticketCount = selectedArea.ticketCount;
        const ticketCountElement = document.getElementById("seatCount");
        ticketCountElement.textContent = ticketCount;
        const maxSeatsMsg = document.getElementById("maxSeatsMsg");
        maxSeatsMsg.textContent = `Maximum: ${availableForThisArea} tickets`;
        maxSeatsMsg.style.color = "#666";
        const increaseBtn = document.getElementById("increaseSeats");
        const decreaseBtn = document.getElementById("decreaseSeats");
        const addBtn = document.getElementById("addSeatsBtn");
        increaseBtn.replaceWith(increaseBtn.cloneNode(true));
        decreaseBtn.replaceWith(decreaseBtn.cloneNode(true));
        addBtn.replaceWith(addBtn.cloneNode(true));
        const newIncreaseBtn = document.getElementById("increaseSeats");
        const newDecreaseBtn = document.getElementById("decreaseSeats");
        const newAddBtn = document.getElementById("addSeatsBtn");
        newAddBtn.textContent = "Update Selection";
        newIncreaseBtn.onclick = () => {
            if (ticketCount < availableForThisArea) {
                ticketCount++;
                ticketCountElement.textContent = ticketCount;
            }
        };
        newDecreaseBtn.onclick = () => {
            if (ticketCount > 0) {
                ticketCount--;
                ticketCountElement.textContent = ticketCount;
            }
        };
        newAddBtn.onclick = () => {
            if (ticketCount === 0) {
                canvas.selectedGAAreas.splice(existingIndex, 1);
                rectangle.set({ fill: rectangle.categoryId || "#f2fd58", stroke: "black", strokeWidth: 1 });
                this.removeGASelectionIndicator(canvas, rectangle);
                this.updateRectangleLabelWithCount(canvas, rectangle, 0);
            } else {
                selectedArea.ticketCount = ticketCount;
                this.updateGASelectionIndicator(canvas, rectangle, ticketCount);
                this.updateRectangleLabelWithCount(canvas, rectangle, ticketCount);
            }
            canvas.renderAll();
            closeSeatPopup();
            this.sendGASelectionToParent(canvas);
        };
        this.positionPopupNearMouse(mouseEvent);
        document.getElementById("seatAdjustmentPopup").style.display = "block";
    },

    lightenColor(color, factor) {
        if (!color || typeof color !== 'string') return color;
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            const r = Math.min(255, (num >> 16) + 255 * factor);
            const g = Math.min(255, ((num >> 8) & 0x00FF) + 255 * factor);
            const b = Math.min(255, (num & 0x0000FF) + 255 * factor);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        if (color.startsWith('rgb')) {
            const matches = color.match(/\d+/g);
            if (matches) {
                const r = Math.min(255, parseInt(matches[0]) + 255 * factor);
                const g = Math.min(255, parseInt(matches[1]) + 255 * factor);
                const b = Math.min(255, parseInt(matches[2]) + 255 * factor);
                const a = matches[3] ? parseFloat(matches[3]) : 1;
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
        }
        return color;
    },

    addGASelectionIndicator(canvas, rectangle, count) {
        this.removeGASelectionIndicator(canvas, rectangle);
        const rectBounds = rectangle.getBoundingRect();
        const indicatorId = `ga-indicator-${rectangle.rectangleId}`;
        const indicator = new fabric.Text(`${count}`, {
            left: rectBounds.left + rectBounds.width - 15, top: rectBounds.top + 5,
            fontSize: 12, fontWeight: 'bold', fill: '#4CAF50', backgroundColor: 'white',
            padding: 3, selectable: false, evented: false, id: indicatorId,
            originX: 'center', originY: 'center'
        });
        rectangle.selectionIndicatorId = indicatorId;
        canvas.add(indicator);
        canvas.bringToFront(indicator);
    },

    updateGASelectionIndicator(canvas, rectangle, count) {
        this.removeGASelectionIndicator(canvas, rectangle);
    },

    removeGASelectionIndicator(canvas, rectangle) {
        if (rectangle.selectionIndicatorId) {
            const indicator = canvas.getObjects().find(obj => obj.id === rectangle.selectionIndicatorId);
            if (indicator) canvas.remove(indicator);
            rectangle.selectionIndicatorId = null;
        }
    },

    positionPopupNearMouse(mouseEvent) {
        const popup = document.getElementById('seatAdjustmentPopup');
        const content = popup.querySelector('.modal-content');
        const x = mouseEvent.clientX;
        const y = mouseEvent.clientY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupWidth = 300;
        const popupHeight = 300;
        let left = x + 120;
        let top = y - popupHeight / 2;
        if (left + popupWidth > viewportWidth) left = x - popupWidth - 20;
        if (top < 20) top = 20;
        if (top + popupHeight > viewportHeight - 20) top = viewportHeight - popupHeight - 20;
        content.style.position = 'fixed';
        content.style.left = left + 'px';
        content.style.top = top + 'px';
        content.style.margin = '0';
    },

    //sendGASelectionToParent(canvas) {
    //    const allSelectedSeats = canvas.selectedSeats || [];
    //    const selectedGAAreas = canvas.selectedGAAreas || [];
    //    const allSelections = {
    //        seats: allSelectedSeats,
    //        gaAreas: selectedGAAreas,
    //        totalTickets: allSelectedSeats.length + selectedGAAreas.reduce((sum, area) => sum + area.ticketCount, 0)
    //    };
    //    window.parent.postMessage({ type: "GAseatsSelected", selections: allSelections }, "*");
    //},

    //sendGASelectionToParent(canvas) {
    //    debugger;
    //    const allSelectedSeats = canvas.selectedSeats || [];
    //    const selectedGAAreas = canvas.selectedGAAreas || [];
    //    const allSelections = {
    //        seats: allSelectedSeats,
    //        gaAreas: selectedGAAreas,
    //        totalTickets: allSelectedSeats.length + selectedGAAreas.reduce((sum, area) => sum + area.ticketCount, 0)
    //    };

    //    // Send to Blazor using the same callback
    //    if (window.receiveSelectedSeatsFromBlazor) {
    //        window.receiveSelectedSeatsFromBlazor(allSelections);
    //    }

    //    // Send to parent window
    //    window.parent.postMessage({ type: "GAseatsSelected", selections: allSelections }, "*");
    //},
    //sendGASelectionToParent(canvas) {
    //    debugger;
    //    const selectedGAAreas = canvas.selectedGAAreas || [];
    //    const allSelectedSeats = canvas.selectedSeats || [];

    //    // Create a flat array of all selections (seats + GA areas)
    //    let allSelections = [];

    //    // Add existing seats
    //    if (allSelectedSeats && allSelectedSeats.length > 0) {
    //        allSelections = allSelections.concat(allSelectedSeats);
    //    }

    //    // Add GA areas as individual entries based on ticketCount
    //    selectedGAAreas.forEach(area => {
    //        debugger;
    //        const ticketCount = area.ticketCount || 0;

    //        // Find the corresponding rectangle to get additional details
    //        const rectangle = canvas.getObjects().find(obj =>
    //            obj.rectangleId === area.id && obj.objectType === 'genrectangle'
    //        );
    //        let priceObj = window.globalPriceList.find(x => x.category === area.categoryName);
    //        // let price = priceObj ? priceObj.price : "Unknown";
    //        let price = "Unknown";
    //        if (priceObj.ticketTypes == null) {
    //            price = priceObj ? priceObj.price : "Unknown";
    //        }

    //        console.log('GA Area object:', area);
    //        console.log('Pricing:', area.pricing);
    //        console.log('Selected price:', area.selectedPrice);
    //        // Create multiple entries based on ticketCount (like seats)
    //        for (let i = 0; i < ticketCount; i++) {
    //            allSelections.push({
    //                id: area.categoryName || (rectangle ? rectangle.categoryName || rectangle.get('categoryName') : 'General'),
    //                label: area.label || area.categoryName || 'General Area',
    //                categoryId: rectangle ? rectangle.categoryId || rectangle.get('categoryId') || '' : '',
    //                categoryName: area.categoryName || (rectangle ? rectangle.categoryName || rectangle.get('categoryName') : 'General'),
    //                ticketType: "",
    //                ticketTypeName: "",
    //                ticketNumber: i + 1,
    //                x: rectangle ? rectangle.left : 0,
    //                y: rectangle ? rectangle.top : 0,
    //                width: rectangle ? rectangle.width : 0,
    //                height: rectangle ? rectangle.height : 0,
    //                pricing: priceObj || null,
    //                price: price || null,
    //                // Add any other properties that normal seats have
    //                seatType: area.seatType || 'GA',
    //                seatStatus: 'available'
    //            });
    //        }
    //    });
    //    debugger;
    //    // Send the flat array to Blazor (same format as seats)
    //    if (window.receiveSelectedSeatsFromBlazor) {
    //        window.receiveSelectedSeatsFromBlazor(allSelections);
    //    }

    //    // Also send to parent window if needed
    //    window.parent.postMessage({
    //        type: "GAseatsSelected",
    //        selections: allSelections
    //    }, "*");
    //},
    sendGASelectionToParent(canvas) {

        const allSelections = this.getAllSelections(canvas);

        if (window.receiveSelectedSeatsFromBlazor) {
            window.receiveSelectedSeatsFromBlazor(allSelections);
        }

        window.parent.postMessage({
            type: "GAseatsSelected",
            selections: allSelections
        }, "*");
    },
    //clearSelectedSeats(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    if (canvas && canvas.selectedSeats) canvas.selectedSeats = [];
    //    if (canvas && canvas.selectedGAAreas) {
    //        canvas.selectedGAAreas.forEach(area => {
    //            const rectangle = canvas.getObjects().find(obj => obj.rectangleId === area.id && obj.objectType === 'genrectangle');
    //            if (rectangle) {
    //                rectangle.set({ fill: rectangle.categoryId || "#f2fd58", stroke: "black", strokeWidth: 1 });
    //                this.removeGASelectionIndicator(canvas, rectangle);
    //            }
    //        });
    //        canvas.selectedGAAreas = [];
    //    }
    //    canvas.forEachObject(obj => {
    //        if (obj.type === 'group' && obj.textObj) {
    //            if (obj.textObj.text === "✔") {
    //                obj.textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
    //                obj.set("isSelected", false);
    //                obj.isSelected = false;
    //            }
    //        }
    //    });
    //    canvas.renderAll();
    //    this.sendGASelectionToParent(canvas);
    //},
    clearSelectedSeats(canvasId) {
        const canvas = this.canvases[canvasId];

        // Close ticket type popup if open
        const popup = document.getElementById('ticketTypePopup');
        if (popup) {
            popup.style.display = 'none';
        }
        this._pendingSeatSelection = null;

        // Clear selected seats
        if (canvas && canvas.selectedSeats) {
            canvas.selectedSeats = [];
        }

        // Clear GA areas
        if (canvas && canvas.selectedGAAreas) {
            canvas.selectedGAAreas.forEach(area => {
                const rectangle = canvas.getObjects().find(obj =>
                    obj.rectangleId === area.id && obj.objectType === 'genrectangle'
                );
                if (rectangle) {
                    rectangle.set({
                        fill: rectangle.categoryId || rectangle.fill || "#f2fd58",
                        stroke: "black",
                        strokeWidth: 1
                    });
                    this.removeGASelectionIndicator(canvas, rectangle);
                }
            });
            canvas.selectedGAAreas = [];
        }

        // Clear seat selection indicators
        canvas.forEachObject(obj => {
            if (obj.type === 'group' && obj.textObj) {
                if (obj.textObj.text === "✔") {
                    obj.textObj.set({ text: "", fontWeight: "normal", fontSize: 10 });
                    obj.set("isSelected", false);
                    obj.isSelected = false;
                }
            }
        });

        canvas.renderAll();

        // Send empty array to Blazor (clearing selection)
        if (window.receiveSelectedSeatsFromBlazor) {
            window.receiveSelectedSeatsFromBlazor([]);
        }
    },
    updateRectangleLabelWithCount(canvas, rectangle, count) {
        const existingLabel = canvas.getObjects().find(obj => (obj.id === rectangle.labelTextId && obj.type === 'text') || (obj.rectangleId === rectangle.rectangleId && obj.type === 'text'));
        if (existingLabel && existingLabel.type === 'text') {
            canvas.remove(existingLabel);
            rectangle.labelText = null;
            rectangle.labelTextId = null;
        }
        if (count === 0) {
            const baseLabel = rectangle.baseLabel || rectangle.generalLabel || rectangle.get('generalLabel') || '';
            if (baseLabel) {
                const fontSize = Math.min(rectangle.height * 0.3, rectangle.width * 0.2, 16);
                const finalFontSize = Math.max(fontSize, 12);
                const labelId = `label-${rectangle.rectangleId}-${Date.now()}`;
                const centerX = rectangle.left + rectangle.width / 2;
                const centerY = rectangle.top + rectangle.height / 2;
                const labelText = new fabric.Text(baseLabel, {
                    fontSize: finalFontSize, fontWeight: "bold",
                    fill: getContrastColor(rectangle.categoryId || rectangle.fill || "#000000"),
                    originX: "center", originY: "center", left: centerX, top: centerY,
                    selectable: false, evented: false, text: baseLabel,
                    rectangleId: rectangle.rectangleId, isRectangleLabel: true,
                    textAlign: 'center', id: labelId, baseText: baseLabel
                });
                rectangle.labelText = labelText;
                rectangle.labelTextId = labelId;
                rectangle.set('labelTextId', labelId);
                canvas.add(labelText);
                canvas.bringToFront(labelText);
            }
            rectangle.currentCount = 0;
            rectangle.set('currentCount', 0);
            return;
        }
        const fontSize = Math.min(rectangle.height * 0.4, rectangle.width * 0.3, 24);
        const finalFontSize = Math.max(fontSize, 12);
        const labelId = `label-${rectangle.rectangleId}-${Date.now()}`;
        const centerX = rectangle.left + rectangle.width / 2;
        const centerY = rectangle.top + rectangle.height / 2;
        const countText = count.toString();
        const labelText = new fabric.Text(countText, {
            fontSize: finalFontSize, fontWeight: "bold",
            fill: getContrastColor(rectangle.categoryId || rectangle.fill || "#000000"),
            originX: "center", originY: "center", left: centerX, top: centerY,
            selectable: false, evented: false, text: "✔ " + countText,
            rectangleId: rectangle.rectangleId, isRectangleLabel: true,
            textAlign: 'center', id: labelId, isCountLabel: true
        });
        rectangle.labelText = labelText;
        rectangle.labelTextId = labelId;
        rectangle.currentCount = count;
        rectangle.set('labelTextId', labelId);
        rectangle.set('currentCount', count);
        canvas.add(labelText);
        canvas.bringToFront(labelText);
    },

    updateAngledRowGuides(canvas, start, angle, count) {
        const spacing = this.seatSpacing || 20;
        const length = (count - 1) * spacing;
        const endX = start.x + Math.cos(angle * Math.PI / 180) * length;
        const endY = start.y + Math.sin(angle * Math.PI / 180) * length;
        this.clearAlignmentGuides(canvas);
        const perpAngle = angle + 90;
        const guideLength = canvas.height;
        const startGuideX1 = start.x + Math.cos(perpAngle * Math.PI / 180) * guideLength;
        const startGuideY1 = start.y + Math.sin(perpAngle * Math.PI / 180) * guideLength;
        const startGuideX2 = start.x - Math.cos(perpAngle * Math.PI / 180) * guideLength;
        const startGuideY2 = start.y - Math.sin(perpAngle * Math.PI / 180) * guideLength;
        const endGuideX1 = endX + Math.cos(perpAngle * Math.PI / 180) * guideLength;
        const endGuideY1 = endY + Math.sin(perpAngle * Math.PI / 180) * guideLength;
        const endGuideX2 = endX - Math.cos(perpAngle * Math.PI / 180) * guideLength;
        const endGuideY2 = endY - Math.sin(perpAngle * Math.PI / 180) * guideLength;
        this.alignmentGuides.start = this.createOrUpdateGuide(canvas, this.alignmentGuides.start, startGuideX1, startGuideY1, startGuideX2, startGuideY2);
        this.alignmentGuides.end = this.createOrUpdateGuide(canvas, this.alignmentGuides.end, endGuideX1, endGuideY1, endGuideX2, endGuideY2);
    },

    snapToStraightLine(angle) {
        let normalizedAngle = ((angle % 360) + 360) % 360;
        const snapZones = [
            { center: 0, target: 0 }, { center: 180, target: 180 },
            { center: 90, target: 90 }, { center: 270, target: 270 },
            { center: 45, target: 45 }, { center: 135, target: 135 },
            { center: 225, target: 225 }, { center: 315, target: 315 }
        ];
        for (const zone of snapZones) {
            let distance = Math.abs(normalizedAngle - zone.center);
            distance = Math.min(distance, 360 - distance);
            if (distance <= this.snapThreshold) return zone.target;
        }
        return angle;
    },

    showStraightLineGuide(canvas, start, angle) {
        if (this.straightLineGuide) {
            canvas.remove(this.straightLineGuide);
            this.straightLineGuide = null;
        }
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        if (angle === 0 || angle === 180) {
            this.straightLineGuide = new fabric.Line([0, start.y, canvasWidth, start.y], {
                stroke: "rgba(76, 175, 80, 0.3)", strokeWidth: 1, strokeDashArray: [3, 3],
                selectable: false, evented: false
            });
        } else if (angle === 90 || angle === 270) {
            this.straightLineGuide = new fabric.Line([start.x, 0, start.x, canvasHeight], {
                stroke: "rgba(76, 175, 80, 0.3)", strokeWidth: 1, strokeDashArray: [3, 3],
                selectable: false, evented: false
            });
        } else {
            const radians = angle * Math.PI / 180;
            let points = this.calculateLineCanvasIntersection(start, radians, canvasWidth, canvasHeight);
            if (points) {
                this.straightLineGuide = new fabric.Line([points.x1, points.y1, points.x2, points.y2], {
                    stroke: "rgba(76, 175, 80, 0.3)", strokeWidth: 1, strokeDashArray: [3, 3],
                    selectable: false, evented: false
                });
            }
        }
        if (this.straightLineGuide) {
            canvas.add(this.straightLineGuide);
            canvas.sendToBack(this.straightLineGuide);
        }
    },

    calculateLineCanvasIntersection(point, angleRad, canvasWidth, canvasHeight) {
        const m = Math.tan(angleRad);
        const b = point.y - m * point.x;
        const intersections = [];
        const yLeft = m * 0 + b;
        if (yLeft >= 0 && yLeft <= canvasHeight) intersections.push({ x: 0, y: yLeft });
        const yRight = m * canvasWidth + b;
        if (yRight >= 0 && yRight <= canvasHeight) intersections.push({ x: canvasWidth, y: yRight });
        if (m !== 0) {
            const xTop = (0 - b) / m;
            if (xTop >= 0 && xTop <= canvasWidth) intersections.push({ x: xTop, y: 0 });
        }
        if (m !== 0) {
            const xBottom = (canvasHeight - b) / m;
            if (xBottom >= 0 && xBottom <= canvasWidth) intersections.push({ x: xBottom, y: canvasHeight });
        }
        if (intersections.length >= 2) {
            return { x1: intersections[0].x, y1: intersections[0].y, x2: intersections[1].x, y2: intersections[1].y };
        }
        return null;
    },

    updateMultiRowFirstRowPreview(canvas, pointer, opt) {
        this.previewSeats.forEach(s => canvas.remove(s));
        this.previewSeats = [];
        if (this.previewLine) {
            canvas.remove(this.previewLine);
            this.previewLine = null;
        }
        if (this.straightLineGuide) {
            canvas.remove(this.straightLineGuide);
            this.straightLineGuide = null;
        }
        const dx = pointer.x - this.rowStart.x;
        const dy = pointer.y - this.rowStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const spacing = this.seatSpacing || 20;
        if (distance < 5) {
            canvas.renderAll();
            return;
        }
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const snappedAngle = this.snapToStraightLine(angle);
        const isSnapped = snappedAngle !== angle;
        if (isSnapped) {
            angle = snappedAngle;
            this.showStraightLineGuide(canvas, this.rowStart, angle);
        }
        this.rowAngle = angle;
        this.firstRowAngle = angle;
        const seatCount = Math.max(2, Math.floor(distance / spacing) + 1);
        const rowLength = (seatCount - 1) * spacing;
        const endX = this.rowStart.x + Math.cos(angle * Math.PI / 180) * rowLength;
        const endY = this.rowStart.y + Math.sin(angle * Math.PI / 180) * rowLength;
        const lineColor = isSnapped ? "#4CAF50" : "#2196F3";
        const lineDash = isSnapped ? [] : [5, 5];
        this.previewLine = new fabric.Line([this.rowStart.x, this.rowStart.y, endX, endY], {
            stroke: lineColor, strokeDashArray: lineDash, selectable: false, evented: false, strokeWidth: 2
        });
        canvas.add(this.previewLine);
        for (let i = 0; i < seatCount; i++) {
            const seatDistance = i * spacing;
            const x = this.rowStart.x + Math.cos(angle * Math.PI / 180) * seatDistance;
            const y = this.rowStart.y + Math.sin(angle * Math.PI / 180) * seatDistance;
            const seat = new fabric.Circle({
                left: x, top: y, radius: 8, fill: "white", originX: "center", originY: "center",
                selectable: false, evented: false, stroke: "black", strokeWidth: 1
            });
            seat.isPreview = true;
            this.previewSeats.push(seat);
            canvas.add(seat);
        }
        this.firstRowSeatCount = seatCount;
        this.updateAngledRowGuides(canvas, this.rowStart, angle, seatCount);
        const tooltip = document.getElementById("seatTooltip");
        if (tooltip) {
            setTimeout(() => {
                let directionText = "";
                if (Math.abs(angle) < 22.5 || Math.abs(angle - 180) < 22.5) directionText = "→ Horizontal";
                else if (Math.abs(angle - 90) < 22.5 || Math.abs(angle - 270) < 22.5) directionText = "↓ Vertical";
                else directionText = `↗ ${Math.round(angle)}°`;
                tooltip.textContent = `${seatCount} seats (${directionText})`;
                tooltip.style.left = (opt.e.clientX + 10) + "px";
                tooltip.style.top = (opt.e.clientY + 10) + "px";
                tooltip.style.display = "block";
            }, 0);
        }
        canvas.renderAll();
    },

    getAbsoluteSeatPosition(seat) {
        if (!seat) return { x: 0, y: 0 };
        try {
            const center = seat.getCenterPoint();
            return { x: center.x, y: center.y };
        } catch (e) { }
        try {
            const matrix = seat.calcTransformMatrix();
            const transformed = fabric.util.transformPoint(new fabric.Point(0, 0), matrix);
            return { x: transformed.x, y: transformed.y };
        } catch (e) { }
        return { x: seat.left || 0, y: seat.top || 0 };
    },

    updateDragGuides(canvas, firstCenterX, lastCenterX) {
        if (!this.dragGuides) this.dragGuides = {};
        const canvasTop = 0;
        const canvasBottom = canvas.getHeight();
        if (!this.dragGuides.start) {
            this.dragGuides.start = new fabric.Line([0, 0, 0, 0], {
                stroke: '#81D4FA', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [6, 4]
            });
            canvas.add(this.dragGuides.start);
        }
        this.dragGuides.start.set({ x1: firstCenterX, x2: firstCenterX, y1: canvasTop, y2: canvasBottom });
        if (!this.dragGuides.end) {
            this.dragGuides.end = new fabric.Line([0, 0, 0, 0], {
                stroke: '#81D4FA', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [6, 4]
            });
            canvas.add(this.dragGuides.end);
        }
        this.dragGuides.end.set({ x1: lastCenterX, x2: lastCenterX, y1: canvasTop, y2: canvasBottom });
        canvas.requestRenderAll();
    },

    clearDragGuides(canvas) {
        if (!this.dragGuides) return;
        if (this.dragGuides.start) {
            canvas.remove(this.dragGuides.start);
            this.dragGuides.start = null;
        }
        if (this.dragGuides.end) {
            canvas.remove(this.dragGuides.end);
            this.dragGuides.end = null;
        }
        canvas.requestRenderAll();
    },



    adjustRowSeats(canvasId) {
        const canvas = this.canvases[canvasId];
        const active = canvas.getActiveObject();

        if (!active) return;

        let seats = [];
        let isActiveSelection = false;

        if (active.type === "activeSelection") {
            isActiveSelection = true;
            // Get objects and their absolute positions BEFORE discarding selection
            seats = active.getObjects().filter(o => o.type === "group");
        } else if (active.type === "group") {
            seats = [active];
        } else {
            return;
        }

        const newSeatCount = parseInt(document.getElementById("txtseatcount").value);

        if (isNaN(newSeatCount) || newSeatCount <= 0) return;

        const direction = document.getElementById("ddldirection")?.value || "LTR";

        // If it's an active selection, we need to get absolute positions first
        // by calculating them from the group's transform matrix
        if (isActiveSelection) {
            // Store absolute positions for all seats
            seats.forEach(seat => {
                const matrix = seat.calcTransformMatrix();
                const point = fabric.util.transformPoint(
                    new fabric.Point(0, 0),
                    matrix
                );
                seat._absoluteLeft = point.x;
                seat._absoluteTop = point.y;
            });
        }

        // Discard active object BEFORE making changes
        canvas.discardActiveObject();

        // Now work with the seats using their absolute positions
        const rows = this.groupSeatsByRow(seats);

        isBulkAdding = true;

        Object.keys(rows).forEach(rowKey => {
            let rowSeats = rows[rowKey];

            // Sort by absolute position
            if (isActiveSelection) {
                rowSeats.sort((a, b) => a._absoluteLeft - b._absoluteLeft);
            } else {
                rowSeats.sort((a, b) => a.left - b.left);
            }

            const currentCount = rowSeats.length;

            // ==================================
            // REMOVE SEATS
            // ==================================
            if (newSeatCount < currentCount) {
                let seatsToRemove;

                if (direction === "RTL") {
                    seatsToRemove = rowSeats.slice(0, currentCount - newSeatCount);
                } else {
                    seatsToRemove = rowSeats.slice(newSeatCount);
                }

                seatsToRemove.forEach(seat => {
                    canvas.remove(seat);
                });

                return;
            }

            // ==================================
            // ADD SEATS
            // ==================================
            if (newSeatCount > currentCount) {
                const seatsNeeded = newSeatCount - currentCount;

                const firstSeat = rowSeats[0];
                const lastSeat = rowSeats[rowSeats.length - 1];

                const rowLabel = lastSeat.rowLabel || lastSeat.get("rowLabel") || "";
                const rowId = lastSeat.rowId || lastSeat.get("rowId") || "";

                // Calculate spacing from actual seat positions
                let spacing = this.seatSpacing || 22;

                if (rowSeats.length > 1) {
                    if (isActiveSelection) {
                        spacing = Math.abs(
                            rowSeats[1]._absoluteLeft - rowSeats[0]._absoluteLeft
                        );
                    } else {
                        spacing = Math.abs(rowSeats[1].left - rowSeats[0].left);
                    }
                }

                // Get the row's Y position (use absolute position if from selection)
                let rowY;
                if (isActiveSelection) {
                    rowY = firstSeat._absoluteTop;
                } else {
                    rowY = firstSeat.top;
                }

                // Determine starting X position based on direction
                let anchorX;
                if (direction === "RTL") {
                    anchorX = isActiveSelection ? firstSeat._absoluteLeft : firstSeat.left;
                } else {
                    anchorX = isActiveSelection ? lastSeat._absoluteLeft : lastSeat.left;
                }

                // Create new seats
                for (let i = 0; i < seatsNeeded; i++) {
                    let newX;

                    if (direction === "RTL") {
                        // Add seats to the left of the first seat
                        newX = anchorX - (spacing * (i + 1));
                    } else {
                        // Add seats to the right of the last seat
                        newX = anchorX + (spacing * (i + 1));
                    }

                    const seatNumber = currentCount + i + 1;
                    const seatLabel = seatNumber.toString();

                    const seatId =
                        rowLabel && rowLabel.trim() !== ""
                            ? rowLabel + seatLabel
                            : `Seat-${this.seatCounter++}`;

                    this.createSeat(
                        canvas,
                        newX,
                        rowY,
                        seatLabel,
                        seatId,
                        rowLabel,
                        rowId
                    );
                }
            }
        });

        isBulkAdding = false;

        // Clean up temporary properties
        seats.forEach(seat => {
            delete seat._absoluteLeft;
            delete seat._absoluteTop;
        });

        // Refresh canvas
        canvas.forEachObject(obj => {
            obj.setCoords();
        });

        canvas.calcOffset();
        canvas.requestRenderAll();

        saveState(canvas);
        this.showValidation(canvas);
    },

    renumberSeats(canvas, direction) {
        const allSeats = canvas.getObjects().filter(o => o.type === "group");
        const rows = this.groupSeatsByRow(allSeats);
        Object.keys(rows).forEach(rowKey => {
            let rowSeats = rows[rowKey];
            rowSeats.sort((a, b) => getSeatX(a) - getSeatX(b));
            const orderedSeats = (direction === "RTL") ? [...rowSeats].reverse() : rowSeats;
            orderedSeats.forEach((seat, index) => {
                const newLabel = (index + 1).toString();
                seat.set('seatLabel', newLabel);
                seat.seatLabel = newLabel;
                const rowLabel = seat.rowLabel || "";
                const seatId = rowLabel ? rowLabel + newLabel : newLabel;
                seat.set('seatId', seatId);
                seat.seatId = seatId;
            });
        });
    },

    fitAndCenterChart(canvas) {
        const objects = canvas.getObjects();
        if (!objects.length) return;
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const bounds = objects.reduce((acc, obj) => {
            const rect = obj.getBoundingRect(true, true);
            acc.left = Math.min(acc.left, rect.left);
            acc.top = Math.min(acc.top, rect.top);
            acc.right = Math.max(acc.right, rect.left + rect.width);
            acc.bottom = Math.max(acc.bottom, rect.top + rect.height);
            return acc;
        }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        const chartWidth = bounds.right - bounds.left;
        const chartHeight = bounds.bottom - bounds.top;
        const chartCenterX = bounds.left + chartWidth / 2;
        const chartCenterY = bounds.top + chartHeight / 2;
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        let zoom = 1;
        if (chartWidth > canvasWidth || chartHeight > canvasHeight) {
            const scaleX = canvasWidth / chartWidth;
            const scaleY = canvasHeight / chartHeight;
            zoom = Math.min(scaleX, scaleY) * 0.9;
        }
        canvas.setZoom(zoom);
        const vp = canvas.viewportTransform;
        vp[4] = canvasCenterX - chartCenterX * zoom;
        vp[5] = canvasCenterY - chartCenterY * zoom;
        canvas.requestRenderAll();
    },

    getSnappedRowStart(pointer) {
        const base = this.lastRowPosition;
        if (!base) return pointer;
        const angleRad = base.angle * Math.PI / 180;
        const perpX = -Math.sin(angleRad);
        const perpY = Math.cos(angleRad);
        const dirX = Math.cos(angleRad);
        const dirY = Math.sin(angleRad);
        const dx = pointer.x - base.x;
        const dy = pointer.y - base.y;
        const offset = dx * perpX + dy * perpY;
        const along = dx * dirX + dy * dirY;
        const horizontalLimit = this.seatSpacing * 10;
        if (Math.abs(along) > horizontalLimit) return pointer;
        const rowIndex = Math.round(offset / this.rowGap);
        return { x: base.x + perpX * rowIndex * this.rowGap, y: base.y + perpY * rowIndex * this.rowGap };
    },

    //showRowCustomizeOptions(canvasId) {
    //    debugger;
    //    const canvas = this.canvases[canvasId];
    //    const activeObject = canvas.getActiveObject();
    //    if (!activeObject) {
    //        showNotification("Please select rows first", "info");
    //        return;
    //    }
    //    const selectedRows = this.getSelectedRows(activeObject, canvas);
    //    if (selectedRows.length === 0) {
    //        showNotification("No rows selected. Please select seats that belong to rows.", "info");
    //        return;
    //    }
    //    // Restore last-used values (default to "up" / 50 on first use)
    //    const lastCurveType = this._lastCurveType || "up";
    //    const lastIntensity = this._lastIntensity != null ? this._lastIntensity : 50;
    //    let panel = document.getElementById("rowCustomizePanel");
    //    if (!panel) {
    //        panel = document.createElement("div");
    //        panel.id = "rowCustomizePanel";
    //        panel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10000; min-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;
    //        //panel.innerHTML = `<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: 500;">Curve Type:</label><select id="curveTypeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"><option value="up">Curve Up (U Shape) ⌣</option><option value="down">Curve Down (∩ Shape) ⌢</option><option value="wave">Wave Pattern ~</option><option value="none">None (Straighten)</option></select></div><div style="margin-bottom: 20px;"><label style="display: block; margin-bottom: 5px; font-weight: 500;">Curve Intensity: <span id="intensityValue" style="color: #4CAF50; font-weight: bold;">50</span></label><input type="range" id="curveIntensity" min="0" max="100" value="${lastIntensity}" style="width: 100%;"><div style="display: flex; justify-content: space-between; margin-top: 5px;"><span style="font-size: 12px; color: #666;">Gentle</span><span style="font-size: 12px; color: #666;">Extreme</span></div></div><div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: 500;">Preview:</label><div style="background: #f5f5f5; border-radius: 4px; padding: 10px; text-align: center;"><canvas id="curvePreviewCanvas" width="280" height="60" style="border: 1px solid #ddd; background: white;"></canvas></div></div><div style="display: flex; gap: 10px; justify-content: flex-end;"><button id="applyCurveBtn" style="padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Apply Curve</button><button id="cancelCurveBtn" style="padding: 8px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button></div>`;

    //        const optionsHtml = `
    //        <option value="up"   ${lastCurveType === "up" ? "selected" : ""}>Curve Up (U Shape) ⌣</option>
    //        <option value="down" ${lastCurveType === "down" ? "selected" : ""}>Curve Down (∩ Shape) ⌢</option>
    //        <option value="wave" ${lastCurveType === "wave" ? "selected" : ""}>Wave Pattern ~</option>
    //        <option value="none" ${lastCurveType === "none" ? "selected" : ""}>None (Straighten)</option>
    //    `;

    //        panel.innerHTML = `
    //        <div style="margin-bottom: 15px;">
    //            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Curve Type:</label>
    //            <select id="curveTypeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
    //                ${optionsHtml}
    //            </select>
    //        </div>
    //        <div style="margin-bottom: 20px;">
    //            <label style="display: block; margin-bottom: 5px; font-weight: 500;">
    //                Curve Intensity: <span id="intensityValue" style="color: #4CAF50; font-weight: bold;">${lastIntensity}</span>
    //            </label>
    //            <input type="range" id="curveIntensity" min="0" max="100" value="${lastIntensity}" style="width: 100%;">
    //            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
    //                <span style="font-size: 12px; color: #666;">Gentle</span>
    //                <span style="font-size: 12px; color: #666;">Extreme</span>
    //            </div>
    //        </div>
    //        <div style="margin-bottom: 15px;">
    //            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Preview:</label>
    //            <div style="background: #f5f5f5; border-radius: 4px; padding: 10px; text-align: center;">
    //                <canvas id="curvePreviewCanvas" width="280" height="60" style="border: 1px solid #ddd; background: white;"></canvas>
    //            </div>
    //        </div>
    //        <div style="display: flex; gap: 10px; justify-content: flex-end;">
    //            <button id="applyCurveBtn" style="padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Apply Curve</button>
    //            <button id="cancelCurveBtn" style="padding: 8px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
    //        </div>
    //    `;
    //        document.body.appendChild(panel);
    //        const previewCanvas = document.getElementById("curvePreviewCanvas");
    //        this.drawCurvePreview(previewCanvas, lastCurveType , lastIntensity);
    //        const intensitySlider = document.getElementById("curveIntensity");
    //        const intensityValue = document.getElementById("intensityValue");
    //        const curveTypeSelect = document.getElementById("curveTypeSelect");
    //        intensitySlider.addEventListener("input", (e) => {
    //            const value = e.target.value;
    //            intensityValue.textContent = value;
    //            const curveType = curveTypeSelect.value;
    //            this._lastIntensity = parseInt(value);
    //            this._lastCurveType = curveTypeSelect.value;
    //            if (curveType !== "none") this.drawCurvePreview(previewCanvas, curveType, parseInt(value));
    //        });
    //        curveTypeSelect.addEventListener("change", (e) => {
    //            const curveType = e.target.value;
    //            const intensity = parseInt(intensitySlider.value);
    //            this._lastCurveType = curveType;
    //            this._lastIntensity = intensity;
    //            if (curveType !== "none") this.drawCurvePreview(previewCanvas, curveType, intensity);
    //            else this.drawStraightPreview(previewCanvas);
    //        });
    //        document.getElementById("applyCurveBtn").addEventListener("click", () => {
    //            const curveType = document.getElementById("curveTypeSelect").value;
    //            const intensity = parseInt(intensitySlider.value);
    //            // Save final values
    //            this._lastCurveType = curveType;
    //            this._lastIntensity = intensity;
    //            const radius = (intensity / 100) * 80;
    //            if (curveType === "none") this.straightenSelectedRows(canvasId);
    //            else this.curveSelectedRows(canvasId, radius, curveType, intensity);
    //            panel.remove();
    //        });
    //        document.getElementById("cancelCurveBtn").addEventListener("click", () => panel.remove());
    //    }
    //    panel.style.display = "block";
    //},
    showRowCustomizeOptions(canvasId) {
        this._lastCurveType = null;
        this._lastIntensity = null;
        const canvas = this.canvases[canvasId];
        const activeObject = canvas.getActiveObject();
        if (!activeObject) {
            showNotification("Please select rows first", "info");
            return;
        }
        const selectedRows = this.getSelectedRows(activeObject, canvas);
        if (selectedRows.length === 0) {
            showNotification("No rows selected. Please select seats that belong to rows.", "info");
            return;
        }

        // --- Determine default values from the selection ---
        let defaultCurveType = "none";
        let defaultIntensity = 0;
        //const flatSeats = selectedRows.flat();
        const flatSeats = selectedRows.flatMap(row => row.seats);
        const seatWithCurve = flatSeats.find(s => s.curveType && s.curveType !== 'none');
        debugger;
        if (seatWithCurve) {
            defaultCurveType = seatWithCurve.curveType;
            defaultIntensity = seatWithCurve.curveIntensity != null
                ? seatWithCurve.curveIntensity
                : 50;
        } else if (this._lastCurveType) {
            defaultCurveType = this._lastCurveType;
            defaultIntensity = this._lastIntensity != null ? this._lastIntensity : 50;
        }

        // ✅ Always rebuild the panel — avoids stale-DOM issues entirely
        let panel = document.getElementById("rowCustomizePanel");
        if (panel) panel.remove();

        panel = document.createElement("div");
        panel.id = "rowCustomizePanel";
        panel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10000; min-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;

        const optionsHtml = `
        <option value="none" ${defaultCurveType === "none" ? "selected" : ""}>None (Straighten)</option>
        <option value="up"   ${defaultCurveType === "up" ? "selected" : ""}>Curve Up (∩ Shape) ⌢</option>
        <option value="down" ${defaultCurveType === "down" ? "selected" : ""}>Curve Down (U Shape)  ⌣</option>
        <option value="wave" ${defaultCurveType === "wave" ? "selected" : ""}>Wave Pattern ~</option>
    `;

        panel.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Curve Type:</label>
            <select id="curveTypeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                ${optionsHtml}
            </select>
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">
                Curve Intensity: <span id="intensityValue" style="color: #4CAF50; font-weight: bold;">${defaultIntensity}</span>
            </label>
            <input type="range" id="curveIntensity" min="0" max="100" value="${defaultIntensity}" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                <span style="font-size: 12px; color: #666;">Gentle</span>
                <span style="font-size: 12px; color: #666;">Extreme</span>
            </div>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Preview:</label>
            <div style="background: #f5f5f5; border-radius: 4px; padding: 10px; text-align: center;">
                <canvas id="curvePreviewCanvas" width="280" height="60" style="border: 1px solid #ddd; background: white;"></canvas>
            </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="applyCurveBtn" style="padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Apply Curve</button>
            <button id="cancelCurveBtn" style="padding: 8px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
        </div>
    `;

        document.body.appendChild(panel);

        // ✅ Query INSIDE the panel, and after appendChild
        const previewCanvas = panel.querySelector("#curvePreviewCanvas");
        const intensitySlider = panel.querySelector("#curveIntensity");
        const intensityValue = panel.querySelector("#intensityValue");
        const curveTypeSelect = panel.querySelector("#curveTypeSelect");

        // Guard: if the canvas somehow isn't there, bail without crashing
        if (!previewCanvas || !intensitySlider || !intensityValue || !curveTypeSelect) {
            console.error("Row customize panel: required elements missing");
            panel.remove();
            return;
        }

        // Initial preview using restored values
        if (defaultCurveType === "none") this.drawStraightPreview(previewCanvas);
        else this.drawCurvePreview(previewCanvas, defaultCurveType, defaultIntensity);

        intensitySlider.addEventListener("input", (e) => {
            const value = parseInt(e.target.value);
            intensityValue.textContent = value;
            this._lastIntensity = value;
            this._lastCurveType = curveTypeSelect.value;
            if (curveTypeSelect.value !== "none")
                this.drawCurvePreview(previewCanvas, curveTypeSelect.value, value);
            else
                this.drawStraightPreview(previewCanvas);
        });

        curveTypeSelect.addEventListener("change", (e) => {
            const curveType = e.target.value;
            const intensity = parseInt(intensitySlider.value);
            this._lastCurveType = curveType;
            this._lastIntensity = intensity;
            if (curveType !== "none") this.drawCurvePreview(previewCanvas, curveType, intensity);
            else this.drawStraightPreview(previewCanvas);
        });

        panel.querySelector("#applyCurveBtn").addEventListener("click", () => {
            const curveType = panel.querySelector("#curveTypeSelect").value;
            const intensity = parseInt(intensitySlider.value);
            this._lastCurveType = curveType;
            this._lastIntensity = intensity;
            const radius = (intensity / 100) * 80;
            if (curveType === "none") this.straightenSelectedRows(canvasId);
            else this.curveSelectedRows(canvasId, radius, curveType, intensity);
            panel.remove();
        });

        panel.querySelector("#cancelCurveBtn").addEventListener("click", () => {
            this._lastCurveType = panel.querySelector("#curveTypeSelect").value;
            this._lastIntensity = parseInt(intensitySlider.value);
            panel.remove();
        });
    },
    drawCurvePreview(canvas, curveType, intensity) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const radius = (intensity / 100) * 30;
        ctx.beginPath();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        if (curveType === "up") {
            for (let x = 0; x <= width; x++) {
                const t = (x / width) * 2 - 1;
                const y = centerY - radius * (1 - Math.pow(t, 2));
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        } else if (curveType === "down") {
            for (let x = 0; x <= width; x++) {
                const t = (x / width) * 2 - 1;
                const y = centerY + radius * (1 - Math.pow(t, 2));
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        } else if (curveType === "wave") {
            for (let x = 0; x <= width; x++) {
                const t = (x / width) * Math.PI * 2;
                const y = centerY + radius * Math.sin(t);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.fillStyle = '#2196F3';
        for (let x = 0; x <= width; x += width / 4) {
            const t = (x / width) * 2 - 1;
            let y;
            if (curveType === "up") y = centerY - radius * (1 - Math.pow(t, 2));
            else if (curveType === "down") y = centerY + radius * (1 - Math.pow(t, 2));
            else if (curveType === "wave") y = centerY + radius * Math.sin((x / width) * Math.PI * 2);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    },

    drawStraightPreview(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        ctx.beginPath();
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.fillStyle = '#999';
        for (let x = 0; x <= width; x += width / 4) {
            ctx.beginPath();
            ctx.arc(x, centerY, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    },

    getSelectedRows(activeObject, canvas) {
        let selectedSeats = [];
        if (activeObject.type === "activeSelection") selectedSeats = activeObject._objects.filter(o => o.type === "group");
        else if (activeObject.type === "group") selectedSeats = [activeObject];
        else return [];
        const rowsMap = new Map();
        selectedSeats.forEach(seat => {
            if (seat.rowId && seat.rowId !== "") {
                if (!rowsMap.has(seat.rowId)) rowsMap.set(seat.rowId, []);
                rowsMap.get(seat.rowId).push(seat);
            }
        });
        const rows = [];
        rowsMap.forEach((seats, rowId) => {
            seats.sort((a, b) => a.left - b.left);
            rows.push({ rowId: rowId, seats: seats, rowLabel: seats[0]?.rowLabel || "" });
        });
        return rows;
    },

    curveSelectedRows(canvasId, radius, curveDirection, intensity) {
        const canvas = this.canvases[canvasId];
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;
        const selectedRows = this.getSelectedRows(activeObject, canvas);
        if (selectedRows.length === 0) {
            showNotification("No valid rows selected", "info");
            return;
        }
        saveState(canvas);
        selectedRows.forEach(rowData => this.curveRow(canvas, rowData.seats, radius, curveDirection, intensity));
        canvas.renderAll();
        saveState(canvas);
        showNotification(`${selectedRows.length} row(s) curved successfully`, "success");
    },

    //curveRow(canvas, seats, radius, direction) {
    //    if (seats.length < 2) return;
    //    const originalPositions = seats.map(seat => ({ seat: seat, x: seat.left, y: seat.top, originalX: seat.left, originalY: seat.top }));
    //    const minX = Math.min(...originalPositions.map(p => p.x));
    //    const maxX = Math.max(...originalPositions.map(p => p.x));
    //    const centerX = (minX + maxX) / 2;
    //    const avgY = originalPositions.reduce((sum, p) => sum + p.y, 0) / seats.length;
    //    const rowWidth = maxX - minX;
    //    const halfWidth = rowWidth / 2;
    //    originalPositions.forEach(position => {
    //        const seat = position.seat;
    //        const relativeX = position.x - centerX;
    //        const normalizedX = relativeX / halfWidth;
    //        let yOffset = 0;
    //        switch (direction) {
    //            case "up": yOffset = -radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "down": yOffset = radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "wave": yOffset = radius * Math.sin(normalizedX * Math.PI); break;
    //            default: yOffset = -radius * (1 - Math.pow(normalizedX, 2));
    //        }
    //        const newY = avgY + yOffset;
    //        seat.set({ left: position.x, top: newY });
    //        if (!seat.originalPosition) seat.originalPosition = { x: position.originalX, y: position.originalY };
    //    });
    //},
    //curveRow(canvas, seats, radius, direction, intensity) {
    //    if (seats.length < 2) return;

    //    const originalPositions = seats.map(seat => ({
    //        seat: seat,
    //        x: seat.left,
    //        y: seat.top,
    //        originalX: seat.left,
    //        originalY: seat.top
    //    }));

    //    const minX = Math.min(...originalPositions.map(p => p.x));
    //    const maxX = Math.max(...originalPositions.map(p => p.x));
    //    const centerX = (minX + maxX) / 2;
    //    const avgY = originalPositions.reduce((sum, p) => sum + p.y, 0) / seats.length;
    //    const rowWidth = maxX - minX;
    //    const halfWidth = rowWidth / 2;

    //    originalPositions.forEach(position => {
    //        const seat = position.seat;
    //        const relativeX = position.x - centerX;
    //        const normalizedX = relativeX / halfWidth;
    //        let yOffset = 0;

    //        switch (direction) {
    //            case "up": yOffset = -radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "down": yOffset = radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "wave": yOffset = radius * Math.sin(normalizedX * Math.PI); break;
    //            default: yOffset = -radius * (1 - Math.pow(normalizedX, 2));
    //        }

    //        const newY = avgY + yOffset;
    //        seat.set({ left: position.x, top: newY });

    //        if (!seat.originalPosition) {
    //            seat.originalPosition = { x: position.originalX, y: position.originalY };
    //        }

    //        // ============================================================
    //        // ✅ STORE CURVE INFO ON THE SEAT (for save / reload)
    //        // ============================================================
    //        seat.set('curveType', direction);
    //        seat.set('curveIntensity', intensity);
    //        seat.set('curveRadius', radius);

    //        // also plain JS props (matches how you store rowLabelFormat etc.)
    //        seat.curveType = direction;
    //        seat.curveIntensity = intensity;
    //        seat.curveRadius = radius;
    //    });
    //},



    //curveRow(canvas, seats, radius, direction, intensity) {
    //    if (seats.length < 2) return;

    //    const originalPositions = seats.map(seat => ({
    //        seat: seat,
    //        x: seat.left,
    //        y: seat.top,
    //        originalX: seat.left,
    //        originalY: seat.top
    //    }));

    //    const minX = Math.min(...originalPositions.map(p => p.x));
    //    const maxX = Math.max(...originalPositions.map(p => p.x));
    //    const centerX = (minX + maxX) / 2;
    //    const avgY = originalPositions.reduce((sum, p) => sum + p.y, 0) / seats.length;
    //    const rowWidth = maxX - minX;
    //    const halfWidth = rowWidth / 2;

    //    // 1. Collect unique row labels for this row
    //    const rowLabels = new Set();
    //    seats.forEach(s => {
    //        if (s.rowLabelObject) rowLabels.add(s.rowLabelObject);
    //    });

    //    // 2. Curve the seats
    //    originalPositions.forEach(position => {
    //        const seat = position.seat;
    //        const relativeX = position.x - centerX;
    //        const normalizedX = relativeX / halfWidth;
    //        let yOffset = 0;

    //        switch (direction) {
    //            case "up": yOffset = -radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "down": yOffset = radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "wave": yOffset = radius * Math.sin(normalizedX * Math.PI); break;
    //            default: yOffset = -radius * (1 - Math.pow(normalizedX, 2));
    //        }

    //        const newY = avgY + yOffset;
    //        seat.set({ left: position.x, top: newY });

    //        if (!seat.originalPosition) {
    //            seat.originalPosition = { x: position.originalX, y: position.originalY };
    //        }

    //        // Store curve info on the seat
    //        seat.set('curveType', direction);
    //        seat.set('curveIntensity', intensity);
    //        seat.set('curveRadius', radius);
    //        seat.curveType = direction;
    //        seat.curveIntensity = intensity;
    //        seat.curveRadius = radius;
    //    });

    //    // 3. Curve the row labels
    //    rowLabels.forEach(labelObj => {
    //        if (!labelObj.originalPosition) {
    //            labelObj.originalPosition = { x: labelObj.left, y: labelObj.top };
    //        }

    //        // Preserve the label's X position
    //        const labelX = labelObj.originalPosition.x;

    //        // Compute the curve's Y at this X
    //        const relativeX = labelX - centerX;
    //        const normalizedX = relativeX / halfWidth;
    //        let yOffset = 0;

    //        switch (direction) {
    //            case "up": yOffset = -radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "down": yOffset = radius * (1 - Math.pow(normalizedX, 2)); break;
    //            case "wave": yOffset = radius * Math.sin(normalizedX * Math.PI); break;
    //            default: yOffset = -radius * (1 - Math.pow(normalizedX, 2));
    //        }

    //        const newLabelY = avgY + yOffset;
    //        labelObj.set({ left: labelX, top: newLabelY });
    //        labelObj.setCoords();
    //    });
    //},

    curveRow(canvas, seats, radius, direction, intensity) {
        if (seats.length < 2) return;

        const originalPositions = seats.map(seat => ({
            seat: seat,
            x: seat.left,
            y: seat.top,
            originalX: seat.left,
            originalY: seat.top
        }));

        const minX = Math.min(...originalPositions.map(p => p.x));
        const maxX = Math.max(...originalPositions.map(p => p.x));
        const centerX = (minX + maxX) / 2;
        const avgY = originalPositions.reduce((sum, p) => sum + p.y, 0) / seats.length;
        const rowWidth = maxX - minX;
        const halfWidth = rowWidth / 2;

        // 1. Curve the seats
        originalPositions.forEach(position => {
            const seat = position.seat;
            const relativeX = position.x - centerX;
            const normalizedX = relativeX / halfWidth;
            let yOffset = 0;

            switch (direction) {
                case "up": yOffset = -radius * (1 - Math.pow(normalizedX, 2)); break;
                case "down": yOffset = radius * (1 - Math.pow(normalizedX, 2)); break;
                case "wave": yOffset = radius * Math.sin(normalizedX * Math.PI); break;
                default: yOffset = -radius * (1 - Math.pow(normalizedX, 2));
            }

            const newY = avgY + yOffset;
            seat.set({ left: position.x, top: newY });

            if (!seat.originalPosition) {
                seat.originalPosition = { x: position.originalX, y: position.originalY };
            }

            seat.set('curveType', direction);
            seat.set('curveIntensity', intensity);
            seat.set('curveRadius', radius);
            seat.curveType = direction;
            seat.curveIntensity = intensity;
            seat.curveRadius = radius;
        });

        // 2. Reposition the Row Label dynamically based on Anchor Seat
        const rowLabels = new Set();
        seats.forEach(s => { if (s.rowLabelObject) rowLabels.add(s.rowLabelObject); });

        const directionText = document.getElementById("ddldirection")?.value || "LTR";
        const labelSpacing = 25;

        // Find the new anchor seat (Leftmost for LTR, Rightmost for RTL)
        seats.sort((a, b) => a.left - b.left);
        const anchorSeat = directionText === "RTL" ? seats[seats.length - 1] : seats[0];

        rowLabels.forEach(labelObj => {
            // Place the label next to the curved anchor seat
            const labelX = directionText === "RTL" ? anchorSeat.left + labelSpacing : anchorSeat.left - labelSpacing;
            const labelY = anchorSeat.top; // Follow the anchor seat's curved Y position

            labelObj.set({ left: labelX, top: labelY });
            labelObj.setCoords();
        });
    },

    //straightenSelectedRows(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    const activeObject = canvas.getActiveObject();
    //    if (!activeObject) return;
    //    const selectedRows = this.getSelectedRows(activeObject, canvas);
    //    if (selectedRows.length === 0) return;
    //    saveState(canvas);
    //    selectedRows.forEach(rowData => {
    //        rowData.seats.forEach(seat => {
    //            if (seat.originalPosition) seat.set({ left: seat.originalPosition.x, top: seat.originalPosition.y });
    //        });
    //    });
    //    canvas.renderAll();
    //    saveState(canvas);
    //    showNotification(`${selectedRows.length} row(s) straightened`, "success");
    //},
    //straightenSelectedRows(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    const activeObject = canvas.getActiveObject();
    //    if (!activeObject) return;
    //    const selectedRows = this.getSelectedRows(activeObject, canvas);
    //    if (selectedRows.length === 0) {
    //        showNotification("No valid rows selected", "info");
    //        return;
    //    }
    //    saveState(canvas);

    //    selectedRows.forEach(rowData => {
    //        rowData.seats.forEach(seat => {
    //            // Restore original Y if available, otherwise keep same Y
    //            if (seat.originalPosition) {
    //                seat.set({ top: seat.originalPosition.y });
    //            }
    //            // ============================================================
    //            // ✅ CLEAR CURVE INFO
    //            // ============================================================
    //            seat.set('curveType', 'none');
    //            seat.set('curveIntensity', 0);
    //            seat.set('curveRadius', 0);

    //            seat.curveType = 'none';
    //            seat.curveIntensity = 0;
    //            seat.curveRadius = 0;
    //        });
    //    });

    //    canvas.renderAll();
    //    saveState(canvas);
    //    showNotification(`${selectedRows.length} row(s) straightened`, "success");
    //},



    //straightenSelectedRows(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    const activeObject = canvas.getActiveObject();
    //    if (!activeObject) return;
    //    const selectedRows = this.getSelectedRows(activeObject, canvas);
    //    if (selectedRows.length === 0) {
    //        showNotification("No valid rows selected", "info");
    //        return;
    //    }
    //    saveState(canvas);

    //    selectedRows.forEach(rowData => {
    //        // Collect unique labels for this row
    //        const rowLabels = new Set();

    //        rowData.seats.forEach(seat => {
    //            // Restore seat original Y
    //            if (seat.originalPosition) {
    //                seat.set({ top: seat.originalPosition.y });
    //            }

    //            // Clear curve info on seat
    //            seat.set('curveType', 'none');
    //            seat.set('curveIntensity', 0);
    //            seat.set('curveRadius', 0);
    //            seat.curveType = 'none';
    //            seat.curveIntensity = 0;
    //            seat.curveRadius = 0;

    //            if (seat.rowLabelObject) {
    //                rowLabels.add(seat.rowLabelObject);
    //            }
    //        });

    //        // Restore labels to their original positions
    //        rowLabels.forEach(labelObj => {
    //            if (labelObj.originalPosition) {
    //                labelObj.set({
    //                    left: labelObj.originalPosition.x,
    //                    top: labelObj.originalPosition.y
    //                });
    //                labelObj.setCoords();
    //            }
    //        });
    //    });

    //    canvas.renderAll();
    //    saveState(canvas);
    //    showNotification(`${selectedRows.length} row(s) straightened`, "success");
    //},

    straightenSelectedRows(canvasId) {
        const canvas = this.canvases[canvasId];
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;
        const selectedRows = this.getSelectedRows(activeObject, canvas);
        if (selectedRows.length === 0) {
            showNotification("No valid rows selected", "info");
            return;
        }
        saveState(canvas);

        const directionText = document.getElementById("ddldirection")?.value || "LTR";
        const labelSpacing = 25;

        selectedRows.forEach(rowData => {
            const rowLabels = new Set();

            rowData.seats.forEach(seat => {
                // Restore seat Y
                if (seat.originalPosition) {
                    seat.set({ top: seat.originalPosition.y });
                }

                // Clear curve info
                seat.set('curveType', 'none');
                seat.set('curveIntensity', 0);
                seat.set('curveRadius', 0);
                seat.curveType = 'none';
                seat.curveIntensity = 0;
                seat.curveRadius = 0;

                if (seat.rowLabelObject) rowLabels.add(seat.rowLabelObject);
            });

            // Sort to find the straight anchor seat
            rowData.seats.sort((a, b) => a.left - b.left);
            const anchorSeat = directionText === "RTL" ? rowData.seats[rowData.seats.length - 1] : rowData.seats[0];

            // Snap labels back to straight positions
            rowLabels.forEach(labelObj => {
                const labelX = directionText === "RTL" ? anchorSeat.left + labelSpacing : anchorSeat.left - labelSpacing;
                const labelY = anchorSeat.top;

                labelObj.set({ left: labelX, top: labelY });
                labelObj.setCoords();

                // Reset originalPosition to match the new straight layout
                labelObj.originalPosition = { x: labelX, y: labelY };
            });
        });

        canvas.renderAll();
        saveState(canvas);
        showNotification(`${selectedRows.length} row(s) straightened`, "success");
    },
    updateCurvedRowPreview(canvas, start, pointer, curveRadius = 30) {
        const seats = this.previewSeats;
        if (seats.length < 3) return;
        const centerX = (start.x + pointer.x) / 2;
        const rowLength = Math.abs(pointer.x - start.x);
        const halfLength = rowLength / 2;
        seats.forEach((seat, index) => {
            const t = index / (seats.length - 1);
            const x = start.x + (pointer.x - start.x) * t;
            const relativeX = (x - centerX) / halfLength;
            const yOffset = -curveRadius * (1 - Math.pow(relativeX, 2));
            const y = start.y + yOffset;
            seat.set({ left: x, top: y });
        });
        canvas.renderAll();
    },

    updateMultiRowPreviewAllDirections(canvas, pointer, opt) {
        if (!this.multiRowStartPoint) return;
        const dx = pointer.x - this.multiRowStartPoint.x;
        const dy = pointer.y - this.multiRowStartPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 5) return;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        let currentDirection;
        if (absDx > absDy * 1.5) {
            currentDirection = dx > 0 ? "right" : "left";
        } else if (absDy > absDx * 1.5) {
            currentDirection = dy > 0 ? "down" : "up";
        } else {
            currentDirection = "angled";
            this.multiRowAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        }
        this.multiRowDirection = currentDirection;
        this.multiRowCurrentPoint = { x: pointer.x, y: pointer.y };
        this.clearGeneratedRows(canvas);
        const rowGap = this.rowGap || 30;
        let rowCount = 0;
        let rowPositions = [];
        const baseX = this.firstRowBaseX || this.firstRowStartX || this.rowStart.x;
        const baseY = this.firstRowBaseY || this.firstRowStartY || this.rowStart.y;
        switch (currentDirection) {
            case "down":
                rowCount = Math.floor(Math.abs(dy) / rowGap);
                for (let i = 1; i < rowCount; i++) rowPositions.push({ index: i, x: baseX, y: baseY + i * rowGap });
                break;
            case "up":
                rowCount = Math.floor(Math.abs(dy) / rowGap);
                for (let i = 1; i < rowCount; i++) rowPositions.push({ index: -i, x: baseX, y: baseY - i * rowGap });
                break;
            case "right":
                rowCount = Math.floor(Math.abs(dx) / rowGap);
                for (let i = 1; i < rowCount; i++) rowPositions.push({ index: i, x: baseX + i * rowGap, y: baseY });
                break;
            case "left":
                rowCount = Math.floor(Math.abs(dx) / rowGap);
                for (let i = 1; i < rowCount; i++) rowPositions.push({ index: -i, x: baseX - i * rowGap, y: baseY });
                break;
            case "angled":
                const angleRad = this.multiRowAngle * Math.PI / 180;
                const perpAngle = angleRad + Math.PI / 2;
                const maxDistance = Math.max(Math.abs(dx), Math.abs(dy));
                rowCount = Math.floor(maxDistance / rowGap);
                for (let i = 1; i < rowCount; i++) {
                    const offset = i * rowGap;
                    rowPositions.push({ index: i, x: baseX + Math.cos(perpAngle) * offset, y: baseY + Math.sin(perpAngle) * offset });
                }
                break;
        }
        rowPositions.forEach(pos => this.createPreviewRowAtPosition(canvas, pos.x, pos.y, pos.index, opt));
        const tooltip = document.getElementById("seatTooltip");
        if (tooltip && opt && opt.e) {
            let directionArrow = "";
            switch (currentDirection) {
                case "down": directionArrow = "↓"; break;
                case "up": directionArrow = "↑"; break;
                case "right": directionArrow = "→"; break;
                case "left": directionArrow = "←"; break;
                case "angled": directionArrow = "↗"; break;
            }
            tooltip.textContent = `${rowCount} row(s) ${directionArrow}`;
            tooltip.style.left = (opt.e.clientX + 10) + "px";
            tooltip.style.top = (opt.e.clientY + 10) + "px";
            tooltip.style.display = "block";
        }
        canvas.renderAll();
    },

    createPreviewRowAtPosition(canvas, startX, startY, rowIndex, opt) {
        const spacing = this.seatSpacing || 22;
        const seatCount = this.firstRowSeatCount;
        const angle = this.firstRowAngle || this.rowAngle || 0;
        if (seatCount === 0) return;
        for (let i = 0; i < seatCount; i++) {
            const seatDistance = i * spacing;
            const x = startX + Math.cos(angle * Math.PI / 180) * seatDistance;
            const y = startY + Math.sin(angle * Math.PI / 180) * seatDistance;
            const seat = new fabric.Circle({
                left: x, top: y, radius: 8, fill: "rgba(255, 255, 255, 0.7)",
                originX: "center", originY: "center", selectable: false, evented: false,
                stroke: "#4c7daf", strokeWidth: 1
            });
            seat.isPreviewRow = true;
            seat.rowIndex = rowIndex;
            seat.seatIndex = i;
            this.previewSeats.push(seat);
            canvas.add(seat);
        }
        const endX = startX + Math.cos(angle * Math.PI / 180) * ((seatCount - 1) * spacing);
        const endY = startY + Math.sin(angle * Math.PI / 180) * ((seatCount - 1) * spacing);
        const line = new fabric.Line([startX, startY, endX, endY], {
            stroke: "#4c7daf", strokeDashArray: [5, 5], strokeWidth: 1,
            selectable: false, evented: false, opacity: 0.7
        });
        line.isPreviewRow = true;
        line.rowIndex = rowIndex;
        this.previewSeats.push(line);
        canvas.add(line);
        if (!this.multiRowPreviewRows) this.multiRowPreviewRows = [];
        this.multiRowPreviewRows.push({ rowIndex: rowIndex, startX: startX, startY: startY, line: line });
    },

    createActualRowsFromPreviewsAllDirections(canvas) {
        if (this.firstRowSeatCount === 0) return;
        if (!this.multiRowPreviewRows || this.multiRowPreviewRows.length === 0) return;
        const spacing = this.seatSpacing || 22;
        const angle = this.firstRowAngle || 0;
        isBulkAdding = true;
        const sortedRows = [...this.multiRowPreviewRows].sort((a, b) => a.rowIndex - b.rowIndex);
        sortedRows.forEach(rowData => {
            const rowLabel = "";
            const rowId = `row-${rowLabel}-${Date.now()}-${rowData.rowIndex}`;
            for (let i = 0; i < this.firstRowSeatCount; i++) {
                const seatDistance = i * spacing;
                const x = rowData.startX + Math.cos(angle * Math.PI / 180) * seatDistance;
                const y = rowData.startY + Math.sin(angle * Math.PI / 180) * seatDistance;
                const seatLabel = (i + 1).toString();
                const seatId = rowLabel ? `${rowLabel}${seatLabel}` : `Seat-${this.seatCounter++}`;
                this.createSeat(canvas, x, y, seatLabel, seatId, rowLabel, rowId);
            }
            this.autoIncrementRowLabel();
        });
        isBulkAdding = false;
        const lastRow = sortedRows[sortedRows.length - 1];
        if (lastRow) this.lastRowPosition = { x: lastRow.startX, y: lastRow.startY, angle: angle };
        this.multiRowPreviewRows = [];
        saveState(canvas);
    },

    getDirectionFromAngle(angle) {
        const normalized = ((angle % 360) + 360) % 360;
        if (normalized >= 315 || normalized < 45) return "right";
        if (normalized >= 45 && normalized < 135) return "down";
        if (normalized >= 135 && normalized < 225) return "left";
        return "up";
    },

    getRowAngle(rowSeats) {
        if (rowSeats.length < 2) return 0;

        const p1 = getAbsolutePosition(rowSeats[0]);
        const p2 = getAbsolutePosition(rowSeats[rowSeats.length - 1]);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        return Math.atan2(dy, dx) * (180 / Math.PI);
    },

    getPerpendicularLabelPosition(anchorPos, angle, direction, spacing = 25) {
        const angleRad = angle * Math.PI / 180;

        // perpendicular vector
        let perpX = -Math.sin(angleRad);
        let perpY = Math.cos(angleRad);

        // flip side for RTL
        if (direction === "RTL") {
            perpX *= -1;
            perpY *= -1;
        }

        return {
            x: anchorPos.x + perpX * spacing,
            y: anchorPos.y + perpY * spacing
        };
    },


    handleRowLiveResize(canvas, activeSelection, opt) {
        const seats = activeSelection.getObjects().filter(obj => obj.rowId || obj.seatLabel || obj.type === 'group');
        if (seats.length < 2) return;

        // 1. Hide the natively scaled/distorted seats so they don't look stretched during the drag
        seats.forEach(seat => seat.set('opacity', 0));

        // 2. Compute ABSOLUTE canvas position for every seat using the selection's transform matrix.
        //    seat.left/top are LOCAL (relative to the selection center), so we MUST transform them.
        const matrix = activeSelection.calcTransformMatrix();
        seats.forEach(seat => {
            const abs = fabric.util.transformPoint(new fabric.Point(seat.left, seat.top), matrix);
            seat._absX = abs.x;
            seat._absY = abs.y;
        });

        // 3. Group seats by rowId so each row is resized independently
        const rowMap = {};
        seats.forEach(seat => {
            const rid = seat.rowId || '__ungrouped__';
            if (!rowMap[rid]) rowMap[rid] = [];
            rowMap[rid].push(seat);
        });

        // 4. Clean up any existing ghost seats
        if (!this.liveResizePreviews) {
            this.liveResizePreviews = [];
        } else {
            this.liveResizePreviews.forEach(p => canvas.remove(p));
            this.liveResizePreviews = [];
        }

        const spacing = this.seatSpacing || 22;

        // 5. For each row independently: sort by absolute position, compute span, draw ghosts
        Object.values(rowMap).forEach(rowSeats => {
            if (rowSeats.length < 1) return;

            // Sort by absolute X (or Y for vertical rows)
            rowSeats.sort((a, b) => a._absX - b._absX || a._absY - b._absY);

            const firstSeat = rowSeats[0];
            const lastSeat = rowSeats[rowSeats.length - 1];

            const startPoint = { x: firstSeat._absX, y: firstSeat._absY };
            const endPoint = { x: lastSeat._absX, y: lastSeat._absY };

            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const currentLength = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const newSeatCount = Math.max(2, Math.floor(currentLength / spacing) + 1);

            // Draw ghost seats for this row
            for (let i = 0; i < newSeatCount; i++) {
                const seatDistance = i * spacing;
                const x = startPoint.x + Math.cos(angle) * seatDistance;
                const y = startPoint.y + Math.sin(angle) * seatDistance;

                const ghost = new fabric.Circle({
                    left: x,
                    top: y,
                    radius: 8,
                    fill: "white",
                    stroke: "#2196F3",
                    strokeWidth: 1.5,
                    strokeDashArray: [3, 3],
                    originX: "center",
                    originY: "center",
                    selectable: false,
                    evented: false,
                    opacity: 0.9
                });
                const tooltip = document.getElementById("seatTooltip");
                if (tooltip) {
                    setTimeout(() => {
                        tooltip.textContent = `${i + 1} seats`;
                        tooltip.style.left = (opt.e.clientX + 10) + "px";
                        tooltip.style.top = (opt.e.clientY + 10) + "px";
                        tooltip.style.display = "block";
                    }, 0);
                }
                this.liveResizePreviews.push(ghost);

                canvas.add(ghost);
            }
        });

        canvas.requestRenderAll();
    },

    //finalizeRowResize(canvas, activeSelection) {
    //    // 1. Immediately dispose of the ghost/preview seats created during the drag phase
    //    if (this.liveResizePreviews) {
    //        this.liveResizePreviews.forEach(p => canvas.remove(p));
    //        this.liveResizePreviews = [];
    //    }

    //    // 2. Identify all seat objects/groups inside the selection
    //    const seats = activeSelection.getObjects().filter(obj => obj.rowId || obj.seatLabel || obj.type === 'group');
    //    if (seats.length < 2) return;

    //    // Restore original object opacity just before applying calculations
    //    seats.forEach(obj => obj.set('opacity', 1));

    //    // 3. Compute ABSOLUTE canvas position for every seat BEFORE discarding the selection.
    //    //    seat.left/top are LOCAL to the selection center — transform them first.
    //    const matrix = activeSelection.calcTransformMatrix();
    //    seats.forEach(seat => {
    //        const abs = fabric.util.transformPoint(new fabric.Point(seat.left, seat.top), matrix);
    //        seat._absX = abs.x;
    //        seat._absY = abs.y;
    //    });

    //    // 4. Group seats by their rowId so each row is processed independently
    //    const rowMap = {};
    //    seats.forEach(seat => {
    //        const rid = seat.rowId || '__ungrouped__';
    //        if (!rowMap[rid]) rowMap[rid] = [];
    //        rowMap[rid].push(seat);
    //    });

    //    // 5. Release the selection lock BEFORE mutating canvas objects
    //    canvas.discardActiveObject();

    //    const spacing = this.seatSpacing || 22;
    //    isBulkAdding = true;
    //    const newlyGeneratedSeats = [];

    //    // 6. For each row independently: compute span → remove old seats → create new seats
    //    Object.values(rowMap).forEach(rowSeats => {
    //        if (rowSeats.length < 1) return;

    //        const rowId = rowSeats[0].rowId || '';
    //        const rowLabel = rowSeats[0].rowLabel || '';

    //        // Sort by absolute X (or Y for vertical rows) using pre-computed values
    //        rowSeats.sort((a, b) => a._absX - b._absX || a._absY - b._absY);

    //        const firstSeat = rowSeats[0];
    //        const lastSeat = rowSeats[rowSeats.length - 1];

    //        const startPoint = { x: firstSeat._absX, y: firstSeat._absY };
    //        const endPoint = { x: lastSeat._absX, y: lastSeat._absY };

    //        const dx = endPoint.x - startPoint.x;
    //        const dy = endPoint.y - startPoint.y;
    //        const currentLength = Math.hypot(dx, dy);
    //        const angle = Math.atan2(dy, dx);
    //        const newSeatCount = Math.max(2, Math.floor(currentLength / spacing) + 1);

    //        // Remove the old seats for this row
    //        rowSeats.forEach(seat => {
    //            canvas.remove(seat);
    //            if (seat.seatText) canvas.remove(seat.seatText);
    //        });

    //        // Create the new, cleanly-spaced seats along the row's axis
    //        for (let i = 0; i < newSeatCount; i++) {
    //            const seatDistance = i * spacing;
    //            const x = startPoint.x + Math.cos(angle) * seatDistance;
    //            const y = startPoint.y + Math.sin(angle) * seatDistance;

    //            const seatLabelStr = (i + 1).toString();
    //            const seatId = rowLabel ? `${rowLabel}${seatLabelStr}` : `Seat-${this.seatCounter++}`;

    //            this.createSeat(canvas, x, y, seatLabelStr, seatId, rowLabel, rowId);

    //            const objAdded = canvas.getObjects()[canvas.getObjects().length - 1];
    //            if (objAdded) newlyGeneratedSeats.push(objAdded);
    //        }
    //    });

    //    // 7. Clean up temporary absolute-position properties
    //    seats.forEach(seat => {
    //        delete seat._absX;
    //        delete seat._absY;
    //    });

    //    // 8. Re-select all newly created seats so the user can keep working on them
    //    if (newlyGeneratedSeats.length > 0) {
    //        const newSelection = new fabric.ActiveSelection(newlyGeneratedSeats, { canvas: canvas });
    //        canvas.setActiveObject(newSelection);
    //    }

    //    // 9. Refresh the canvas
    //    canvas.renderAll();
    //    isBulkAdding = false;
    //    this.showValidation(canvas);

    //    // Save to history
    //    setTimeout(() => {
    //        if (typeof saveState === 'function') {
    //            saveState(canvas);
    //        } else {
    //            undoStack.push(JSON.stringify(canvas.toJSON()));
    //            redoStack = [];
    //        }
    //    }, 100);
    //},
    finalizeRowResize(canvas, activeSelection) {
        // Remove preview ghosts
        if (this.liveResizePreviews) {
            this.liveResizePreviews.forEach(p => canvas.remove(p));
            this.liveResizePreviews = [];
        }

        const seats = activeSelection.getObjects().filter(obj => obj.rowId || obj.seatLabel || obj.type === 'group');
        if (seats.length < 2) return;

        // Restore opacity
        seats.forEach(obj => obj.set('opacity', 1));

        // Compute absolute positions (the selection’s transform matrix)
        const matrix = activeSelection.calcTransformMatrix();
        seats.forEach(seat => {
            const abs = fabric.util.transformPoint(new fabric.Point(seat.left, seat.top), matrix);
            seat._absX = abs.x;
            seat._absY = abs.y;
        });

        // Group by rowId
        const rowMap = {};
        seats.forEach(seat => {
            const rid = seat.rowId || '__ungrouped__';
            if (!rowMap[rid]) rowMap[rid] = [];
            rowMap[rid].push(seat);
        });

        // Release the selection
        canvas.discardActiveObject();

        const spacing = this.seatSpacing || 22;

        Object.values(rowMap).forEach(rowSeats => {
            if (rowSeats.length < 1) return;
            const rowId = rowSeats[0].rowId || '';
            const rowLabel = rowSeats[0].rowLabel || '';

            // Sort by absolute X
            rowSeats.sort((a, b) => a._absX - b._absX || a._absY - b._absY);

            const firstSeat = rowSeats[0];
            const lastSeat = rowSeats[rowSeats.length - 1];
            const startPoint = { x: firstSeat._absX, y: firstSeat._absY };
            const endPoint = { x: lastSeat._absX, y: lastSeat._absY };
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const currentLength = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const newSeatCount = Math.max(2, Math.floor(currentLength / spacing) + 1);

            // Store original properties (first seat’s category, status, etc.)
            const firstProps = {
                categoryId: rowSeats[0].categoryId || rowSeats[0].get('categoryId') || '',
                categoryName: rowSeats[0].categoryName || rowSeats[0].get('categoryName') || '',
                seatType: rowSeats[0].seatType || rowSeats[0].get('seatType') || '',
                seatStatus: rowSeats[0].seatStatus || rowSeats[0].get('seatStatus') || 'available'
            };

            // Find the row label object (if any)
            let labelObj = null;
            // 1) Check if any seat already has a reference
            for (let s of rowSeats) {
                if (s.rowLabelObject && canvas.contains(s.rowLabelObject)) {
                    labelObj = s.rowLabelObject;
                    break;
                }
            }
            // 2) If not found, search by proximity
            if (!labelObj) {
                const pos = getAbsolutePosition(rowSeats[0]);
                const candidates = canvas.getObjects().filter(o => o.isRowLabel === true);
                let closest = null, closestDist = Infinity;
                candidates.forEach(cand => {
                    const candPos = getAbsolutePosition(cand);
                    const dist = Math.hypot(candPos.x - pos.x, candPos.y - pos.y);
                    if (dist < 50 && dist < closestDist) {
                        closestDist = dist;
                        closest = cand;
                    }
                });
                labelObj = closest;
            }

            // Remove old seats
            rowSeats.forEach(seat => {
                canvas.remove(seat);
                if (seat.seatText) canvas.remove(seat.seatText);
            });

            // Create new seats with preserved properties
            const newSeats = [];
            for (let i = 0; i < newSeatCount; i++) {
                const seatDistance = i * spacing;
                const x = startPoint.x + Math.cos(angle) * seatDistance;
                const y = startPoint.y + Math.sin(angle) * seatDistance;
                const seatLabelStr = (i + 1).toString();
                const seatId = rowLabel ? rowLabel + seatLabelStr : `Seat-${this.seatCounter++}`;

                const newSeat = this.createSeat(canvas, x, y, seatLabelStr, seatId, rowLabel, rowId, firstProps);
                if (labelObj) {
                    newSeat.rowLabelObject = labelObj;
                }
                newSeats.push(newSeat);
            }

            // Reposition the label object relative to the new first seat
            if (labelObj && newSeats.length > 0) {
                const newFirst = newSeats[0];
                const newAnchor = getAbsolutePosition(newFirst);
                // Compute offset from old first seat
                const oldFirstPos = getAbsolutePosition(rowSeats[0]);
                const offsetX = labelObj.left - oldFirstPos.x;
                const offsetY = labelObj.top - oldFirstPos.y;
                labelObj.set({
                    left: newAnchor.x + offsetX,
                    top: newAnchor.y + offsetY
                });
                labelObj.setCoords();
                canvas.bringToFront(labelObj);
            }
        });

        // Cleanup temporary properties
        seats.forEach(seat => {
            delete seat._absX;
            delete seat._absY;
        });

        canvas.renderAll();
        this.showValidation(canvas);
        saveState(canvas);
    },
    enablePreviewMode(canvasId, Seatdetails, ChartId) {
        debugger;
        const canvas = this.canvases[canvasId];
        var seats = "";
        this.mode = "user";
        this.isDrawingSeats = false;
        canvas.selection = false;
        canvas.off("mouse:move");
        canvas.off("mouse:down");
        canvas.off("mouse:up");
        if (!canvas.selectedSeats) {
            canvas.selectedSeats = [];
        } else {
            canvas.selectedSeats = [];
        }
        this.applyStatusColors(canvasId, Seatdetails);


        canvas.forEachObject(obj => {
            obj.selectable = false;
            obj.evented = true;
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.hasControls = false;
            obj.hoverCursor = 'default';
            if (typeof obj.isSelected === 'undefined') {
                obj.isSelected = false;
            }

            // --- Handle standalone row‑label text objects ---
            if ((obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') && obj.isRowLabel) {
                if (typeof obj.originalLabel === 'undefined') {
                    obj.originalLabel = obj.text || '';
                }
                obj.set('text', ''); // hide initially
                return; // skip further processing
            }

            // --- Handle seat groups (existing logic) ---
            if (obj.type === 'group') {
                let textChild = null;
                if (obj.textObj) textChild = obj.textObj;
                if (!textChild && obj._objects && obj._objects.length) {
                    textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
                }
                if (textChild) {
                    if (typeof obj.originalLabel === 'undefined') {
                        obj.originalLabel = textChild.text || '';
                    }
                    textChild.set('text', '');
                    obj.textObj = textChild;
                }
            }
        });
        var showRowLbl = document.getElementById("chkrow");
        var showSeatLbl = document.getElementById("chkseat");
        var showRow = showRowLbl ? showRowLbl.checked : true;   // default to true if missing
        var showSeat = showSeatLbl ? showSeatLbl.checked : true;
        applyLabelVisibility(canvas, showRow, showSeat);
        canvas.renderAll();
        canvas.on("mouse:over", function (opt) {
            if (!opt.target || opt.target.type !== "group") return;
            let seat = opt.target;
            const seatStatus = seat.seatStatus || seat.get('seatStatus') || 'available';
            if (seatStatus == "sold") return;
            let categoryId = seat.categoryName || seat.get("categoryName") || "";

            showTooltip(opt.e.clientX, opt.e.clientY,
                `Category : ${categoryId}<br>Seat : ${seat.seatId}`);
        });

        canvas.on("mouse:out", function () {
            hideTooltip();
        });
    },


    toggleRowLabels(canvasId) {
        const canvas = this.canvases[canvasId];
        if (!canvas) return;
        const chk = document.getElementById("chkrow");
        const show = chk ? chk.checked : false;
        canvas.showRowLabel = show;
        applyLabelVisibility(canvas, show, canvas.showSeatLabel);
    },

    toggleSeatLabels(canvasId) {
        const canvas = this.canvases[canvasId];
        if (!canvas) return;
        const chk = document.getElementById("chkseat");
        const show = chk ? chk.checked : false;
        canvas.showSeatLabel = show;
        applyLabelVisibility(canvas, canvas.showRowLabel, show);
    },

    updateRectangleLabel: function (obj) {
        if (!obj) return;
        if ((obj.objectType === 'rectangle' || obj.objectType === 'genrectangle') && obj.labelText) {
            const center = obj.getCenterPoint();
            obj.labelText.set({
                left: center.x,
                top: center.y
            });
            obj.labelText.setCoords();
        }
    },



    //populateRowProperties: function (canvasId) {
    //    debugger;
    //    const canvas = this.canvases[canvasId];
    //    if (!canvas) return;
    //    const active = canvas.getActiveObject();
    //    if (!active) {
    //        this.clearRowPropertiesUI();
    //        return;
    //    }

    //    // Get selected seat groups
    //    let seats = [];
    //    if (active.type === "activeSelection") {
    //        seats = active._objects.filter(o => o.type === "group");
    //    } else if (active.type === "group") {
    //        seats = [active];
    //    } else {
    //        this.clearRowPropertiesUI();
    //        return;
    //    }

    //    if (seats.length === 0) {
    //        this.clearRowPropertiesUI();
    //        return;
    //    }

    //    // 1. Try grouping by rowId
    //    const rows = {};
    //    seats.forEach(seat => {
    //        const rowId = seat.rowId || seat.get('rowId') || '';
    //        if (rowId) {
    //            if (!rows[rowId]) rows[rowId] = [];
    //            rows[rowId].push(seat);
    //        }
    //    });

    //    // 2. If no rowId, try grouping by rowLabel
    //    if (Object.keys(rows).length === 0) {
    //        seats.forEach(seat => {
    //            const rowLabel = seat.rowLabel || seat.get('rowLabel') || '';
    //            if (rowLabel) {
    //                if (!rows[rowLabel]) rows[rowLabel] = [];
    //                rows[rowLabel].push(seat);
    //            }
    //        });
    //    }

    //    const rowKeys = Object.keys(rows);
    //    if (rowKeys.length === 0) {
    //        // 3. Fallback: take the first seat's rowLabel (if any)
    //        const firstSeat = seats[0];
    //        const rowLabel = firstSeat.rowLabel || firstSeat.get('rowLabel') || '';
    //        if (rowLabel) {
    //            document.getElementById("txtrowlbl").value = rowLabel;
    //            document.getElementById("txtseatcount").value = seats.length;
    //            return;
    //        }
    //        this.clearRowPropertiesUI();
    //        return;
    //    }

    //    // Use the first row's data
    //    const firstRowKey = rowKeys[0];
    //    const rowSeats = rows[firstRowKey];
    //    const rowLabel = rowSeats[0].rowLabel || rowSeats[0].get('rowLabel') || '';
    //    const seatCount = rowSeats.length;

    //    const txtRowLbl = document.getElementById("txtrowlbl");
    //    if (txtRowLbl) txtRowLbl.value = rowLabel;

    //    const txtSeatCount = document.getElementById("txtseatcount");
    //    if (txtSeatCount) txtSeatCount.value = seatCount;

    //    // Get the first seat in the row
    //    const firstSeat = rowSeats[0];
    //    const format = firstSeat.seatLabelFormat || firstSeat.get('seatLabelFormat') || '';
    //    const customStart = firstSeat.customLabelStart || firstSeat.get('customLabelStart') || '';

    //    // Set the dropdown
    //    const ddlSeat = document.getElementById("ddlseat");
    //    if (ddlSeat) {
    //        ddlSeat.value = format;
    //    }

    //    // If custom, set the custom label textbox
    //    const txtCustomLbl = document.getElementById("txtcustomlbl");
    //    if (txtCustomLbl && format === "custom") {
    //        txtCustomLbl.value = customStart;
    //    } else if (txtCustomLbl) {
    //        txtCustomLbl.value = ''; // clear if not custom
    //    }
    //},
    populateRowProperties: function (canvasId) {
        const canvas = this.canvases[canvasId];
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) {
            this.clearRowPropertiesUI();
            return;
        }

        let seats = [];
        if (active.type === "activeSelection") {
            seats = active._objects.filter(o => o.type === "group");
        } else if (active.type === "group") {
            seats = [active];
        } else {
            this.clearRowPropertiesUI();
            return;
        }

        if (seats.length === 0) {
            this.clearRowPropertiesUI();
            return;
        }

        // Group by rowId
        const rows = {};
        seats.forEach(seat => {
            const rowId = seat.rowId || seat.get('rowId') || '';
            if (rowId) {
                if (!rows[rowId]) rows[rowId] = [];
                rows[rowId].push(seat);
            }
        });

        // If no rowId, fallback to rowLabel grouping
        if (Object.keys(rows).length === 0) {
            seats.forEach(seat => {
                const rowLabel = seat.rowLabel || seat.get('rowLabel') || '';
                if (rowLabel) {
                    if (!rows[rowLabel]) rows[rowLabel] = [];
                    rows[rowLabel].push(seat);
                }
            });
        }

        const rowKeys = Object.keys(rows);
        if (rowKeys.length === 0) {
            // No rows, clear UI
            this.clearRowPropertiesUI();
            return;
        }

        // Use the first row
        const firstRowKey = rowKeys[0];
        const rowSeats = rows[firstRowKey];
        const firstSeat = rowSeats[0];

        // Populate row label textbox and seat count
        const rowLabel = firstSeat.rowLabel || firstSeat.get('rowLabel') || '';
        const seatCount = rowSeats.length;

        const txtRowLbl = document.getElementById("txtrowlbl");
        if (txtRowLbl) txtRowLbl.value = rowLabel;

        const txtSeatCount = document.getElementById("txtseatcount");
        if (txtSeatCount) txtSeatCount.value = seatCount;

        // -------- Read Row Label Format ----------
        const rowFormat = firstSeat.get('rowLabelFormat') || '';
        const customStart = firstSeat.get('rowLabelCustomStart') || '';

        const ddlRow = document.getElementById("ddlrow");
        if (ddlRow) {
            ddlRow.value = rowFormat;  // set dropdown to stored format
        }

        // Show/hide custom row input based on format
        const divCustomRow = document.getElementById("divcustomrow");
        const txtCustomRowLabel = document.getElementById("txtCustomRowLabel");

        if (rowFormat === 'custom') {
            if (divCustomRow) divCustomRow.style.display = 'block';
            if (txtCustomRowLabel) txtCustomRowLabel.value = customStart || '';
            // Also hide the plain txtrowlbl if multiple rows? 
            // We'll keep both visible but you may choose to hide one.
            // For simplicity, we keep both.
        } else {
            if (divCustomRow) divCustomRow.style.display = 'none';
            if (txtCustomRowLabel) txtCustomRowLabel.value = '';
        }

        // Also populate seat label format (existing)
        const seatFormat = firstSeat.get('seatLabelFormat') || '';
        const ddlSeat = document.getElementById("ddlseat");
        if (ddlSeat) ddlSeat.value = seatFormat;

        const customSeatStart = firstSeat.get('customLabelStart') || '';
        const txtCustomSeat = document.getElementById("txtcustomlbl");
        if (txtCustomSeat) {
            if (seatFormat === 'custom') {
                txtCustomSeat.value = customSeatStart;
            } else {
                txtCustomSeat.value = '';
            }
        }

        // Note: You may also want to show/hide custom seat div
    },
    populateRectangleProperties: function (canvasId) {
        debugger;
        const canvas = this.canvases[canvasId];
        if (!canvas) return;
        const active = canvas.getActiveObject();

        // Only proceed if a rectangle is selected
        if (active && active.type === "activeSelection") {
            const ddlRect = document.getElementById("ddlrect");

            if (ddlRect) {
                // If the rectangle has a saved label, set it in the dropdown
                /* if (active.rectangleLabel) {*/
                ddlRect.value = active._objects[0].rectangleLabel;
                //} else {
                //    // If it has no label, reset the dropdown
                //    ddlRect.value = "";
                //}
            }
        }
    },
    clearRowPropertiesUI: function () {
        const txtRowLbl = document.getElementById("txtrowlbl");
        if (txtRowLbl) txtRowLbl.value = '';

        const txtSeatCount = document.getElementById("txtseatcount");
        if (txtSeatCount) txtSeatCount.value = '';

        const ddlRow = document.getElementById("ddlrow");
        if (ddlRow) ddlRow.value = '';

        const ddlSeat = document.getElementById("ddlseat");
        if (ddlSeat) ddlSeat.value = '';

        const txtCustomRow = document.getElementById("txtCustomRowLabel");
        if (txtCustomRow) txtCustomRow.value = '';

        const txtCustomSeat = document.getElementById("txtcustomlbl");
        if (txtCustomSeat) txtCustomSeat.value = '';

        const divCustomRow = document.getElementById("divcustomrow");
        if (divCustomRow) divCustomRow.style.display = 'none';
    },
    //enableTouchZoomEnhanced(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    if (!canvas) return;

    //    let lastTouchDistance = 0;
    //    let isPinching = false;
    //    let lastPinchTime = 0;
    //    let velocity = 0;
    //    let lastZoom = 1;

    //    // Smooth zoom animation
    //    let animationId = null;

    //    canvas.upperCanvasEl.addEventListener('touchstart', (e) => {
    //        if (e.touches.length === 2) {
    //            e.preventDefault();
    //            isPinching = true;
    //            lastPinchTime = Date.now();

    //            const touch1 = e.touches[0];
    //            const touch2 = e.touches[1];
    //            lastTouchDistance = Math.hypot(
    //                touch1.clientX - touch2.clientX,
    //                touch1.clientY - touch2.clientY
    //            );
    //            lastZoom = canvas.getZoom();
    //            velocity = 0;

    //            if (animationId) {
    //                cancelAnimationFrame(animationId);
    //                animationId = null;
    //            }
    //        }
    //    }, { passive: false });

    //    canvas.upperCanvasEl.addEventListener('touchmove', (e) => {
    //        if (e.touches.length === 2 && isPinching) {
    //            e.preventDefault();

    //            const touch1 = e.touches[0];
    //            const touch2 = e.touches[1];

    //            const currentDistance = Math.hypot(
    //                touch1.clientX - touch2.clientX,
    //                touch1.clientY - touch2.clientY
    //            );

    //            if (lastTouchDistance > 0) {
    //                const zoomFactor = currentDistance / lastTouchDistance;
    //                const currentZoom = canvas.getZoom();
    //                let newZoom = currentZoom * zoomFactor;
    //                newZoom = Math.min(Math.max(newZoom, 0.3), 4);

    //                const rect = canvas.upperCanvasEl.getBoundingClientRect();
    //                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
    //                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

    //                canvas.zoomToPoint(
    //                    new fabric.Point(centerX, centerY),
    //                    newZoom
    //                );

    //                // Calculate velocity for inertia
    //                const currentTime = Date.now();
    //                const deltaTime = currentTime - lastPinchTime;
    //                if (deltaTime > 0) {
    //                    velocity = (newZoom - lastZoom) / deltaTime * 100;
    //                }
    //                lastZoom = newZoom;
    //                lastPinchTime = currentTime;

    //                canvas.requestRenderAll();
    //            }

    //            lastTouchDistance = currentDistance;
    //        }
    //    }, { passive: false });

    //    canvas.upperCanvasEl.addEventListener('touchend', (e) => {
    //        if (isPinching) {
    //            isPinching = false;
    //            // Apply inertia if velocity is significant
    //            if (Math.abs(velocity) > 0.01) {
    //                this._applyZoomInertia(canvas, velocity);
    //            }
    //        }
    //        lastTouchDistance = 0;
    //    }, { passive: false });
    //},
    enableTouchZoomEnhanced(canvasId) {
        const canvas = this.canvases[canvasId];
        if (!canvas) return;

        let lastTouchDistance = 0;
        let isPinching = false;
        let lastPinchTime = 0;
        let velocity = 0;
        let lastZoom = 1;
        let animationId = null;

        // Panning variables
        let isPanning = false;
        let lastPanX = 0;
        let lastPanY = 0;
        let panVelocityX = 0;
        let panVelocityY = 0;
        let lastPanTime = 0;

        const el = canvas.upperCanvasEl;

        // Define handlers as local functions (not stored on 'this')
        const touchStartHandler = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                isPinching = true;
                isPanning = false;
                lastPinchTime = Date.now();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );
                lastZoom = canvas.getZoom();
                velocity = 0;

                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            } else if (e.touches.length === 1) {
                // Start panning
                isPanning = true;
                isPinching = false;
                const touch = e.touches[0];
                lastPanX = touch.clientX;
                lastPanY = touch.clientY;
                panVelocityX = 0;
                panVelocityY = 0;
                lastPanTime = Date.now();

                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
        };

        const touchMoveHandler = (e) => {
            e.preventDefault();

            if (e.touches.length === 2 && isPinching) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const currentDistance = Math.hypot(
                    touch1.clientX - touch2.clientX,
                    touch1.clientY - touch2.clientY
                );

                if (lastTouchDistance > 0) {
                    const zoomFactor = currentDistance / lastTouchDistance;
                    const currentZoom = canvas.getZoom();
                    let newZoom = currentZoom * zoomFactor;
                    newZoom = Math.min(Math.max(newZoom, 0.3), 4);

                    const rect = canvas.upperCanvasEl.getBoundingClientRect();
                    const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
                    const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

                    canvas.zoomToPoint(
                        new fabric.Point(centerX, centerY),
                        newZoom
                    );

                    const currentTime = Date.now();
                    const deltaTime = currentTime - lastPinchTime;
                    if (deltaTime > 0) {
                        velocity = (newZoom - lastZoom) / deltaTime * 100;
                    }
                    lastZoom = newZoom;
                    lastPinchTime = currentTime;

                    canvas.requestRenderAll();
                }

                lastTouchDistance = currentDistance;
            } else if (e.touches.length === 1 && isPanning) {
                // Handle panning
                const touch = e.touches[0];
                const dx = touch.clientX - lastPanX;
                const dy = touch.clientY - lastPanY;

                // Calculate velocity for inertia
                const currentTime = Date.now();
                const deltaTime = currentTime - lastPanTime;
                if (deltaTime > 0) {
                    panVelocityX = dx / deltaTime * 20;
                    panVelocityY = dy / deltaTime * 20;
                }
                lastPanTime = currentTime;

                // Apply pan with zoom factor
                const zoom = canvas.getZoom();
                if (canvas.viewportTransform) {
                    canvas.viewportTransform[4] += dx / zoom;
                    canvas.viewportTransform[5] += dy / zoom;
                } else {
                    // If viewportTransform doesn't exist, initialize it
                    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
                    canvas.viewportTransform[4] += dx / zoom;
                    canvas.viewportTransform[5] += dy / zoom;
                }

                lastPanX = touch.clientX;
                lastPanY = touch.clientY;

                canvas.requestRenderAll();
            }
        };

        const touchEndHandler = (e) => {
            if (isPinching) {
                isPinching = false;
                if (Math.abs(velocity) > 0.01) {
                    this._applyZoomInertia(canvas, velocity);
                }
            }
            if (isPanning) {
                isPanning = false;
                // Apply pan inertia if velocity is significant
                if (Math.abs(panVelocityX) > 0.5 || Math.abs(panVelocityY) > 0.5) {
                    this._applyPanInertia(canvas, panVelocityX, panVelocityY);
                }
            }
            lastTouchDistance = 0;
        };

        // Remove existing listeners to avoid duplicates
        // We'll store the handlers as properties so we can remove them
        if (this._touchStartHandler) {
            el.removeEventListener('touchstart', this._touchStartHandler);
        }
        if (this._touchMoveHandler) {
            el.removeEventListener('touchmove', this._touchMoveHandler);
        }
        if (this._touchEndHandler) {
            el.removeEventListener('touchend', this._touchEndHandler);
        }

        // Store handlers as properties for cleanup
        this._touchStartHandler = touchStartHandler;
        this._touchMoveHandler = touchMoveHandler;
        this._touchEndHandler = touchEndHandler;

        el.addEventListener('touchstart', touchStartHandler, { passive: false });
        el.addEventListener('touchmove', touchMoveHandler, { passive: false });
        el.addEventListener('touchend', touchEndHandler, { passive: false });

        // Double tap to reset zoom
        let lastTapTime = 0;
        let tapTimeout = null;

        // Remove any existing double-tap handler
        if (this._doubleTapHandler) {
            el.removeEventListener('touchstart', this._doubleTapHandler);
        }

        this._doubleTapHandler = (e) => {
            if (e.touches.length === 1) {
                const currentTime = Date.now();
                const tapDelay = 300;

                if (currentTime - lastTapTime < tapDelay && lastTapTime > 0) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const rect = canvas.upperCanvasEl.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    const y = touch.clientY - rect.top;

                    const targetZoom = 1;
                    const currentZoom = canvas.getZoom();
                    if (currentZoom !== targetZoom) {
                        canvas.zoomToPoint(new fabric.Point(x, y), targetZoom);
                        canvas.requestRenderAll();
                    }

                    if (tapTimeout) {
                        clearTimeout(tapTimeout);
                        tapTimeout = null;
                    }
                    lastTapTime = 0;
                } else {
                    lastTapTime = currentTime;
                    if (tapTimeout) {
                        clearTimeout(tapTimeout);
                    }
                    tapTimeout = setTimeout(() => {
                        lastTapTime = 0;
                        tapTimeout = null;
                    }, tapDelay);
                }
            }
        };

        el.addEventListener('touchstart', this._doubleTapHandler, { passive: false });
    },
    //enableTouchZoomEnhanced(canvasId) {
    //    const canvas = this.canvases[canvasId];
    //    if (!canvas) return;

    //    let lastTouchDistance = 0;
    //    let isPinching = false;
    //    let lastPinchTime = 0;
    //    let velocity = 0;
    //    let lastZoom = 1;
    //    let animationId = null;

    //    // Panning variables
    //    let isPanning = false;
    //    let lastPanX = 0;
    //    let lastPanY = 0;
    //    let panVelocityX = 0;
    //    let panVelocityY = 0;
    //    let lastPanTime = 0;

    //    const el = canvas.upperCanvasEl;

    //    const touchStartHandler = (e) => {
    //        if (e.touches.length === 2) {
    //            e.preventDefault();
    //            isPinching = true;
    //            isPanning = false;
    //            lastPinchTime = Date.now();

    //            const touch1 = e.touches[0];
    //            const touch2 = e.touches[1];
    //            lastTouchDistance = Math.hypot(
    //                touch1.clientX - touch2.clientX,
    //                touch1.clientY - touch2.clientY
    //            );
    //            lastZoom = canvas.getZoom();
    //            velocity = 0;

    //            if (animationId) {
    //                cancelAnimationFrame(animationId);
    //                animationId = null;
    //            }
    //        } else if (e.touches.length === 1) {
    //            // Start panning ONLY if zoomed in
    //            const currentZoom = canvas.getZoom();
    //            if (currentZoom > 1.05) { // Only allow panning when zoomed in
    //                isPanning = true;
    //                isPinching = false;
    //                const touch = e.touches[0];
    //                lastPanX = touch.clientX;
    //                lastPanY = touch.clientY;
    //                panVelocityX = 0;
    //                panVelocityY = 0;
    //                lastPanTime = Date.now();

    //                if (animationId) {
    //                    cancelAnimationFrame(animationId);
    //                    animationId = null;
    //                }
    //            } else {
    //                // Reset to normal behavior - don't start panning
    //                isPanning = false;
    //            }
    //        }
    //    };

    //    const touchMoveHandler = (e) => {
    //        e.preventDefault();

    //        if (e.touches.length === 2 && isPinching) {
    //            const touch1 = e.touches[0];
    //            const touch2 = e.touches[1];

    //            const currentDistance = Math.hypot(
    //                touch1.clientX - touch2.clientX,
    //                touch1.clientY - touch2.clientY
    //            );

    //            if (lastTouchDistance > 0) {
    //                const zoomFactor = currentDistance / lastTouchDistance;
    //                const currentZoom = canvas.getZoom();
    //                let newZoom = currentZoom * zoomFactor;
    //                newZoom = Math.min(Math.max(newZoom, 0.3), 4);

    //                const rect = canvas.upperCanvasEl.getBoundingClientRect();
    //                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
    //                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

    //                canvas.zoomToPoint(
    //                    new fabric.Point(centerX, centerY),
    //                    newZoom
    //                );

    //                const currentTime = Date.now();
    //                const deltaTime = currentTime - lastPinchTime;
    //                if (deltaTime > 0) {
    //                    velocity = (newZoom - lastZoom) / deltaTime * 100;
    //                }
    //                lastZoom = newZoom;
    //                lastPinchTime = currentTime;

    //                canvas.requestRenderAll();
    //            }

    //            lastTouchDistance = currentDistance;
    //        } else if (e.touches.length === 1 && isPanning) {
    //            // Handle panning - only when zoomed in
    //            const currentZoom = canvas.getZoom();
    //            if (currentZoom > 1.05) {
    //                const touch = e.touches[0];
    //                const dx = touch.clientX - lastPanX;
    //                const dy = touch.clientY - lastPanY;

    //                const currentTime = Date.now();
    //                const deltaTime = currentTime - lastPanTime;
    //                if (deltaTime > 0) {
    //                    panVelocityX = dx / deltaTime * 20;
    //                    panVelocityY = dy / deltaTime * 20;
    //                }
    //                lastPanTime = currentTime;

    //                const zoom = canvas.getZoom();
    //                if (canvas.viewportTransform) {
    //                    canvas.viewportTransform[4] += dx / zoom;
    //                    canvas.viewportTransform[5] += dy / zoom;
    //                } else {
    //                    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    //                    canvas.viewportTransform[4] += dx / zoom;
    //                    canvas.viewportTransform[5] += dy / zoom;
    //                }

    //                lastPanX = touch.clientX;
    //                lastPanY = touch.clientY;

    //                canvas.requestRenderAll();
    //            } else {
    //                // If zoomed back to 1 during pan, stop panning
    //                isPanning = false;
    //            }
    //        }
    //    };

    //    const touchEndHandler = (e) => {
    //        if (isPinching) {
    //            isPinching = false;
    //            if (Math.abs(velocity) > 0.01) {
    //                this._applyZoomInertia(canvas, velocity);
    //            }
    //        }
    //        if (isPanning) {
    //            isPanning = false;
    //            const currentZoom = canvas.getZoom();
    //            if (currentZoom > 1.05 && (Math.abs(panVelocityX) > 0.5 || Math.abs(panVelocityY) > 0.5)) {
    //                this._applyPanInertia(canvas, panVelocityX, panVelocityY);
    //            }
    //        }
    //        lastTouchDistance = 0;
    //    };

    //    // Remove existing listeners
    //    if (this._touchStartHandler) {
    //        el.removeEventListener('touchstart', this._touchStartHandler);
    //    }
    //    if (this._touchMoveHandler) {
    //        el.removeEventListener('touchmove', this._touchMoveHandler);
    //    }
    //    if (this._touchEndHandler) {
    //        el.removeEventListener('touchend', this._touchEndHandler);
    //    }

    //    // Store handlers
    //    this._touchStartHandler = touchStartHandler;
    //    this._touchMoveHandler = touchMoveHandler;
    //    this._touchEndHandler = touchEndHandler;

    //    el.addEventListener('touchstart', touchStartHandler, { passive: false });
    //    el.addEventListener('touchmove', touchMoveHandler, { passive: false });
    //    el.addEventListener('touchend', touchEndHandler, { passive: false });

    //    // Double tap to reset zoom
    //    let lastTapTime = 0;
    //    let tapTimeout = null;

    //    if (this._doubleTapHandler) {
    //        el.removeEventListener('touchstart', this._doubleTapHandler);
    //    }

    //    this._doubleTapHandler = (e) => {
    //        if (e.touches.length === 1) {
    //            const currentTime = Date.now();
    //            const tapDelay = 300;

    //            if (currentTime - lastTapTime < tapDelay && lastTapTime > 0) {
    //                e.preventDefault();
    //                const touch = e.touches[0];
    //                const rect = canvas.upperCanvasEl.getBoundingClientRect();
    //                const x = touch.clientX - rect.left;
    //                const y = touch.clientY - rect.top;

    //                const targetZoom = 1;
    //                const currentZoom = canvas.getZoom();
    //                if (currentZoom !== targetZoom) {
    //                    canvas.zoomToPoint(new fabric.Point(x, y), targetZoom);
    //                    canvas.requestRenderAll();
    //                }

    //                if (tapTimeout) {
    //                    clearTimeout(tapTimeout);
    //                    tapTimeout = null;
    //                }
    //                lastTapTime = 0;
    //            } else {
    //                lastTapTime = currentTime;
    //                if (tapTimeout) {
    //                    clearTimeout(tapTimeout);
    //                }
    //                tapTimeout = setTimeout(() => {
    //                    lastTapTime = 0;
    //                    tapTimeout = null;
    //                }, tapDelay);
    //            }
    //        }
    //    };

    //    el.addEventListener('touchstart', this._doubleTapHandler, { passive: false });
    //},
    _applyPanInertia(canvas, vx, vy) {
        let velocityX = vx * 0.85;
        let velocityY = vy * 0.85;
        let lastTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            if ((Math.abs(velocityX) < 0.01 && Math.abs(velocityY) < 0.01) || deltaTime > 50) {
                return;
            }

            const zoom = canvas.getZoom();
            if (canvas.viewportTransform) {
                canvas.viewportTransform[4] += velocityX * (deltaTime / 16) / zoom;
                canvas.viewportTransform[5] += velocityY * (deltaTime / 16) / zoom;
            }

            canvas.requestRenderAll();

            velocityX *= 0.92;
            velocityY *= 0.92;

            if (Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    _applyZoomInertia(canvas, initialVelocity) {
        let velocity = initialVelocity * 0.8;
        let lastTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            if (Math.abs(velocity) < 0.001 || deltaTime > 50) {
                return;
            }

            const currentZoom = canvas.getZoom();
            let newZoom = currentZoom + velocity * (deltaTime / 1000);
            newZoom = Math.min(Math.max(newZoom, 0.3), 4);

            const centerX = canvas.getWidth() / 2;
            const centerY = canvas.getHeight() / 2;
            canvas.zoomToPoint(new fabric.Point(centerX, centerY), newZoom);
            canvas.requestRenderAll();

            velocity *= 0.95;

            if (Math.abs(velocity) > 0.001) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    resetChartState: function (canvasId) {
        const canvas = this.canvases[canvasId];
        if (canvas) {
            canvas.clear();
            canvas.renderAll();
        }

        // Reset global arrays
        undoStack = [];
        redoStack = [];

        // Reset counters
        this.seatCounter = 1;

        // Push the blank state as the baseline
        if (canvas) {
            const json = canvas.toJSON();
            undoStack.push(JSON.stringify(json));
        }
    }




};
//function applyLabelVisibility(canvas, showRow, showSeat) {
//    debugger;
//    canvas.forEachObject(function (obj) {
//        // Handle standalone text objects (row labels)
//        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
//            if (obj.isRowLabel) {
//                obj.set('text', showRow ? obj.originalLabel : '');
//            }
//        }
//        // Handle groups (seats)
//        else if (obj.type === 'group') {
//            let textChild = null;
//            if (obj.textObj) textChild = obj.textObj;
//            else if (obj._objects) {
//                textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
//            }
//            if (textChild) {
//                if (typeof obj.originalLabel === 'undefined') {
//                    obj.originalLabel = textChild.text || '';
//                }
//                textChild.set('text', showSeat ? obj.originalLabel : '');
//                obj.textObj = textChild;
//            }
//        }
//    });
//    canvas.renderAll();
//}

function applyLabelVisibility(canvas, showRow, showSeat) {
    debugger;
    canvas.forEachObject(function (obj) {
        // Handle standalone text objects (row labels)
        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
            if (obj.isRowLabel) {
                var label = (obj.originalLabel != null) ? String(obj.originalLabel) : '';
                obj.set('text', showRow ? label : '');
            }
        }
        // Handle groups (seats)
        else if (obj.type === 'group') {
            let textChild = null;
            if (obj.textObj) textChild = obj.textObj;
            else if (obj._objects) {
                textChild = obj._objects.find(ch => (ch.type === 'text' || ch.type === 'i-text' || ch.type === 'textbox'));
            }
            if (textChild) {
                if (typeof obj.originalLabel === 'undefined') {
                    obj.originalLabel = textChild.text || '';
                }
                var label = (obj.originalLabel != null) ? String(obj.originalLabel) : '';
                textChild.set('text', showSeat ? label : '');
                obj.textObj = textChild;
            }
        }
    });
    canvas.renderAll();
}


window.loadUserChart = function (chartJson, seatsJson, chartId) {
    if (!chartJson) return;

    try {
        var layout = JSON.parse(chartJson);
        var seatsData = typeof seatsJson === "string" ? JSON.parse(seatsJson) : seatsJson;

        var seatRows = [];
        if (Array.isArray(seatsData)) {
            seatRows = seatsData;
        } else if (seatsData && seatsData.Tables && seatsData.Tables[0]) {
            seatRows = seatsData.Tables[0].Rows || seatsData.Tables[0];
        }

        const canvasId = "userCanvas";
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) {
            console.error("loadUserChart: canvas id 'userCanvas' not found in DOM.");
            return;
        }

        const chartHost = document.getElementById("chart-container");
        const width = chartHost ? (chartHost.clientWidth || 1200) : 1200;
        const height = chartHost ? (chartHost.clientHeight || 800) : 800;

        if (!window.fabricInterop || !window.fabricInterop.initCanvas || !window.fabricInterop.loadLayout) return;

        if (!window.fabricInterop.canvases || !window.fabricInterop.canvases[canvasId]) {
            window.fabricInterop.initCanvas(canvasId, width, height);
        } else {
            const existingCanvas = window.fabricInterop.canvases[canvasId];
            existingCanvas.clear();
            existingCanvas.setWidth(width);
            existingCanvas.setHeight(height);
        }

        window.fabricInterop.loadLayout(canvasId, chartJson);

        const hasObjects = layout && ((Array.isArray(layout.objects) && layout.objects.length) || (Array.isArray(layout.shapes) && layout.shapes.length));
        if (hasObjects && seatRows && seatRows.length > 0) {
            window.fabricInterop.enablePreviewMode(canvasId, seatRows, chartId);
        } else {
            window.fabricInterop.enablePreviewMode(canvasId, [], chartId);
        }

        const canvas = window.fabricInterop.canvases[canvasId];
        if (canvas) {
            canvas.renderAll();
            window.fabricInterop.fitAndCenterChart(canvas);
        }
    } catch (err) {
        console.error('loadUserChart failed:', err);
    }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Delete") {
        for (const id in window.fabricInterop.canvases) {
            const canvas = window.fabricInterop.canvases[id];
            if (canvas && canvas.getActiveObjects().length > 0) {
                window.fabricInterop.deleteSelected(id);
                fabricInterop.disableValidation();
            }
        }
    }
});

function generateHoldToken() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function sendSelectedSeatsToParent(selectedSeats) {
    window.parent.postMessage({ type: "seatsSelected", seats: selectedSeats }, "*");
}

window.setGlobalPriceList = function (priceList) {
    debugger;
    console.log("Price list received in Blazor:", priceList);
    window.globalPriceList = priceList;
};

function showTooltip(x, y, htmlContent) {
    let tip = document.getElementById("seatTooltip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "seatTooltip";
        tip.style.position = "fixed";
        tip.style.background = "#000";
        tip.style.color = "#fff";
        tip.style.padding = "6px 10px";
        tip.style.borderRadius = "4px";
        tip.style.fontSize = "12px";
        tip.style.pointerEvents = "none";
        tip.style.zIndex = "9999";
        tip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        tip.style.display = "none";
        document.body.appendChild(tip);
    }
    tip.innerHTML = htmlContent;
    tip.style.left = (x + 10) + "px";
    tip.style.top = (y + 10) + "px";
    tip.style.display = "block";
}

function hideTooltip() {
    const tip = document.getElementById("seatTooltip");
    if (tip) tip.style.display = "none";
}

function editCategoryName() {
    var txtcat = document.getElementById("txtcat");
    var lblcat = document.getElementById("lblcat");
    lblcat.style.display = "none";
    txtcat.style.display = "block";
}

function deleteCategory(id) {
    id.style.display = "none";
    var catname = id.querySelector(".cat-name");
    catname.innerText = "";
    catname.value = "";
}

function editCategory(id) {
    lblcat = document.getElementById("lblcat_" + id);
    lblcat.style.display = "none";
    lblcat.innerText = "";
    var txtcat = document.getElementById("txtcat_" + id);
    txtcat.style.display = "inline-flex";
}

//function GetCatname() {
//    debugger;
//    const rows = document.querySelectorAll(".category-row");
//    let list = [];
//    let colorlist = [];
//    rows.forEach(row => {
//        var name = "";
//        name = row.querySelector(".cat-name").innerText;
//        if (name == "" || name == undefined) {
//            name = row.querySelector(".cat-name").value;
//        }
//        const color = row.querySelector(".cat-color").value;
//        if (name !== "" && name != undefined) {
//            if (!colorlist.includes(color)) {
//                colorlist.push(color);
//                list.push({ category: name, color: color });
//            }
//            else {
//                showNotification("Please select different color");
//            }
//        }
//        else {
//            showNotification("Please enter category name");
//        }
//    });
//    if (list.length > 0) {
//        dotNetHelper.invokeMethodAsync("SaveCategory", JSON.stringify(list));
//    }
//}
function GetCatname() {

    const rows = document.querySelectorAll(".category-row");
    let list = [];
    let colorlist = [];

    for (const row of rows) {

        let name = "";

        // Existing category label
        const label = row.querySelector(".cat-name-label");
        if (label && label.style.display !== "none") {
            name = label.innerText.trim();
        }

        // Existing category edit textbox
        const editInput = row.querySelector(".cat-name-input");
        if ((!name || name === "") && editInput) {
            name = editInput.value.trim();
        }

        // Newly added category textbox
        const newInput = row.querySelector(".cat-name");
        if ((!name || name === "") && newInput) {
            name = newInput.value.trim();
        }

        const color = row.querySelector(".cat-color").value;

        if (!name) {
            showNotification("Please enter category name");
            return false;
        }

        if (colorlist.includes(color)) {
            showNotification("Please select different color");
            return false;
        }

        colorlist.push(color);
        list.push({
            category: name,
            color: color
        });
    }

    dotNetHelper.invokeMethodAsync("SaveCategory", JSON.stringify(list));
    return true;
}
function closeCategoryModal() {
    const modalElement = document.getElementById('savealert');

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
        modal.hide();
    }
}
function showSuccess() {
    var successmodal = document.getElementById("successModal");
    if (successmodal != undefined && successmodal != null) {
        document.getElementById("successModal").style.display = "flex";
    }
}

function closeSuccess() {
    document.getElementById("successModal").style.display = "none";
}

function saveState(canvas) {
    fabricInterop.clearPreviewLines(canvas);
    fabricInterop.clearAlignmentGuides(canvas);
    fabricInterop.clearRowGuide(canvas);
    if (this.hoverStartGuide) {
        canvas.remove(this.hoverStartGuide);
        this.hoverStartGuide = null;
    }
    if (isLoading) return;
    const objects = canvas.getObjects();
    if (objects.length === 0) return;
    const json = canvas.toJSON([
        'objectType', 'seatLabel', 'seatId', 'categoryId', 'categoryName', 'seatType', 'holdToken',
        'rowLabel', 'isRowLabel', 'seatStatus', 'createdBy', 'rectangleId', 'rectangleLabel', 'isRectangleLabel'
    ]);
    undoStack.push(JSON.stringify(json));
    redoStack = [];
}

function loadState(state) {
    if (!state) return;
    const canvas = window.fabricInterop.canvases["seatCanvas"];
    if (!canvas) return;
    isLoading = true;
    canvas.clear();
    try {
        const json = JSON.parse(state);
        if (json.objects && Array.isArray(json.objects)) {
            json.objects.forEach((objData) => {
                if (objData.objectType === 'rectangle') {
                    fabricInterop.recreateRectangleFromData(canvas, objData);
                } else if (objData.type === "group" && objData.seatId) {
                    fabricInterop.recreateSeatFromData(canvas, objData);
                } else if (objData.type === "text" || objData.type === "i-text") {
                    if (objData.isRowLabel === true) {
                        const textValue = objData.text || objData.rowLabel || "";
                        const rowText = new fabric.Text(textValue, {
                            left: objData.left || 0, top: objData.top || 0,
                            fontSize: objData.fontSize || 14, fontWeight: objData.fontWeight || "normal",
                            fill: objData.fill || "black", originX: objData.originX || "center",
                            originY: objData.originY || "center", hasControls: false,
                            selectable: false, evented: false, isRowLabel: true,
                            rowLabel: objData.rowLabel || textValue
                        });
                        rowText.set('isRowLabel', true);
                        rowText.set('rowLabel', rowText.rowLabel);
                        canvas.add(rowText);
                    } else {
                        const text = new fabric.Text(objData.text || "", {
                            left: objData.left || 0, top: objData.top || 0,
                            fontSize: objData.fontSize || 12, fill: objData.fill || "black",
                            selectable: true
                        });
                        canvas.add(text);
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error parsing state JSON:", error);
    }
    canvas.renderAll();
    isLoading = false;
}

function undo() {
    redoStack.push(undoStack.pop());
    const previous = undoStack[undoStack.length - 1];
    loadState(previous);
}

function redo() {
    if (redoStack.length === 0) return;
    const nextState = redoStack.pop();
    undoStack.push(nextState);
    loadState(nextState);
}

function getAbsolutePosition(obj) {
    const matrix = obj.calcTransformMatrix();
    const pos = new fabric.Point(0, 0);
    const transformed = fabric.util.transformPoint(pos, matrix);
    return transformed;
}

function getDirection(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx >= 0 ? "right" : "left";
    } else {
        return dy >= 0 ? "down" : "up";
    }
}

function previewHorizontalSegment(dx, dy) {
    const dir = dx >= 0 ? 1 : -1;
    const seatCount = Math.floor(Math.abs(dx) / (seatSize + seatGap));
    for (let i = 0; i < seatCount; i++) {
        const seat = createPreviewSeat(startX + dir * (i + 1) * (seatSize + seatGap), startY);
        previewseats.push(seat);
        canvas.add(seat);
    }
}

function previewVerticalSegment(dx, dy) {
    const dir = dy >= 0 ? 1 : -1;
    const seatCount = Math.floor(Math.abs(dy) / (seatSize + seatGap));
    for (let i = 0; i < seatCount; i++) {
        const seat = createPreviewSeat(startX, startY + dir * (i + 1) * (seatSize + seatGap));
        previewseats.push(seat);
        canvas.add(seat);
    }
}

function finalizeSegment() {
    if (previewseats.length === 0) return;
    previewseats.forEach(p => {
        const seat = new fabric.Circle({
            left: p.left, top: p.top, radius: 8, fill: "white",
            originX: "center", originY: "center", selectable: true, evented: true,
            stroke: "black", strokeWidth: 1, objectType: "seat"
        });
        canvas.add(seat);
        canvas.remove(p);
    });
    previewseats = [];
    canvas.renderAll();
}

function clearPreview() {
    if (window.fabricInterop.mode === "segmentRow" && segmentRowPreviewMode && previewseats.length > 0) {
        console.log("Skipping clear - preview mode active with seats");
        return;
    }
    previewseats.forEach(s => {
        if (s && s.canvas === canvas) canvas.remove(s);
    });
    previewseats = [];
}

function createPreviewSeat(x, y) {
    return new fabric.Circle({
        left: x, top: y, radius: 8, fill: "rgba(255, 255, 255, 0.7)",
        originX: "center", originY: "center", selectable: false, evented: false, stroke: "blue"
    });
}

function createDynamicPreview(dx, dy, isTemporary, direction) {
    if (!segmentActive) return;
    if (direction === "horizontal") {
        const dirX = dx > 0 ? 1 : -1;
        const seatCount = Math.max(1, Math.floor(Math.abs(dx) / (seatSize + seatGap)));
        for (let i = 0; i < seatCount; i++) {
            const seat = createPreviewSeat(startX + dirX * i * (seatSize + seatGap), startY);
            if (isTemporary) currentRowPreview.push(seat);
            else previewseats.push(seat);
            canvas.add(seat);
        }
    } else if (direction === "vertical") {
        const dirY = dy > 0 ? 1 : -1;
        const seatCount = Math.max(1, Math.floor(Math.abs(dy) / (seatSize + seatGap)));
        for (let i = 0; i < seatCount; i++) {
            const seat = createPreviewSeat(startX, startY + dirY * i * (seatSize + seatGap));
            if (isTemporary) currentRowPreview.push(seat);
            else previewseats.push(seat);
            canvas.add(seat);
        }
    }
    canvas.renderAll();
}

function clearSegmentRowPreviews() {
    if (window.fabricInterop.mode !== "segmentRow") {
        clearPreview();
        previewseats = [];
        segmentActive = false;
        segmentRowPreviewMode = false;
        segmentRowFinalized = false;
        direction = null;
    }
}

function resetSegmentRowState() {
    if (window.fabricInterop.mode !== "segmentRow") {
        clearPreview();
        previewseats = [];
        segmentActive = false;
        segmentRowPreviewMode = false;
        segmentRowFinalized = false;
        direction = null;
    }
}

function getContrastColor(hexColor) {
    if (hexColor == undefined || hexColor == "") return 'black';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'black' : 'white';
}

function closeSeatPopup() {
    document.getElementById("seatAdjustmentPopup").style.display = "none";
    if (window.fabricInterop) {
        window.fabricInterop.selectedRectangle = null;
        window.fabricInterop.selectedCanvasId = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && window.fabricInterop.mode === 'row' && window.fabricInterop.isDrawingRow) {
        window.fabricInterop.isRotatingRow = true;
        const canvas = document.getElementById('seatCanvas');
        if (canvas) canvas.style.cursor = 'crosshair';
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && window.fabricInterop.mode === 'row') {
        window.fabricInterop.isRotatingRow = false;
        const canvas = document.getElementById('seatCanvas');
        if (canvas) canvas.style.cursor = 'default';
    }
});

function zoomIn() {
    let zoom = canvas.getZoom();
    zoom *= 1.1;
    if (zoom > 3) zoom = 3;
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
}

function zoomOut() {
    let zoom = canvas.getZoom();
    zoom *= 0.9;
    if (zoom < 0.5) zoom = 0.5;
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
}

function resetZoom() {
    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    canvas.renderAll();
}
//function zoomIn() {
//    const canvas = window.fabricInterop.canvases["seatCanvas"] || window.fabricInterop.canvases["userCanvas"];
//    if (!canvas) return;
//    let zoom = canvas.getZoom();
//    zoom *= 1.1;
//    if (zoom > 3) zoom = 3;
//    canvas.setZoom(zoom);
//    canvas.requestRenderAll();
//}

//function zoomOut() {
//    const canvas = window.fabricInterop.canvases["seatCanvas"] || window.fabricInterop.canvases["userCanvas"];
//    if (!canvas) return;
//    let zoom = canvas.getZoom();
//    zoom *= 0.9;
//    if (zoom < 0.5) zoom = 0.5;
//    canvas.setZoom(zoom);
//    canvas.requestRenderAll();
//}

//function resetZoom() {
//    const canvas = window.fabricInterop.canvases["seatCanvas"] || window.fabricInterop.canvases["userCanvas"];
//    if (!canvas) return;
//    canvas.setZoom(1);
//    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
//    canvas.renderAll();
//}
function IncrementClick() {
    var txtcapacity = document.getElementById("txtcapacity");
    var count = txtcapacity.value;
    txtcapacity.value = parseInt(count) + 1;
}

function DecrementClick() {
    var txtcapacity = document.getElementById("txtcapacity");
    var count = txtcapacity.value;
    if (parseInt(count) > 0) txtcapacity.value = parseInt(count) - 1;
}

function drawGuideLines(direction, dx, dy) {
    if (guideLine && canvas.contains(guideLine)) canvas.remove(guideLine);
    if (crossGuideLine && canvas.contains(crossGuideLine)) canvas.remove(crossGuideLine);
    const endX = startX + dx;
    const endY = startY + dy;
    if (direction === "horizontal") {
        guideLine = new fabric.Line([startX, startY, endX, startY], {
            stroke: "#00AEEF", strokeDashArray: [5, 5], selectable: false, evented: false
        });
        crossGuideLine = new fabric.Line([startX, startY - 50, startX, startY + 50], {
            stroke: "#CCCCCC", strokeDashArray: [2, 4], selectable: false, evented: false
        });
    } else {
        guideLine = new fabric.Line([startX, startY, startX, endY], {
            stroke: "#00AEEF", strokeDashArray: [5, 5], selectable: false, evented: false
        });
        crossGuideLine = new fabric.Line([startX - 50, startY, startX + 50, startY], {
            stroke: "#CCCCCC", strokeDashArray: [2, 4], selectable: false, evented: false
        });
    }
    canvas.add(guideLine);
    canvas.add(crossGuideLine);
    canvas.bringToFront(guideLine);
    canvas.bringToFront(crossGuideLine);
}

function saveHoldToken(chartId, selectedSeats, holdToken) {
    debugger;
    const url = `http://localhost:5045/api/chart/Update?chartId=${chartId}&seats=${selectedSeats}&holdToken=${holdToken}`;

   // const url = `https://localhost:7203/api/chart/Update?chartId=${chartId}&seats=${selectedSeats}&holdToken=${holdToken}`;
    //const url = `http://dev.theticketworld.com/seating_api/api/chart/Update?chartId=${chartId}&seats=${selectedSeats}&holdToken=${holdToken}`;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: chartId, seats: selectedSeats, holdtoken: holdToken })
    }).then(res => res.json()).then(data => console.log("Saved:")).catch(err => console.error("Error:", err));
}

function showNotification(message, type = 'info', title = 'Notification') {
    const existingModal = document.getElementById('custom-notification-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'custom-notification-modal';
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 10001; animation: fadeIn 0.3s ease;`;
    const icons = { success: '✓', error: '✗', info: 'ℹ', warning: '⚠' };
    const icon = icons[type] || icons.info;
    const headerColors = { success: '#4caf50', error: '#f44336', info: '#2196f3', warning: '#ff9800' };
    const color = headerColors[type] || headerColors.info;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); width: 400px; max-width: 90%; animation: scaleIn 0.3s ease; overflow: hidden;`;
    modalContent.innerHTML = `<div style="padding: 24px 20px 20px; text-align: center;"><div style="width: 60px; height: 60px; background: ${color}20; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;"><span style="font-size: 32px; color: ${color}; font-weight: bold;">${icon}</span></div><p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">${message}</p><button id="modal-ok-btn" style="background: ${color}; color: white; border: none; padding: 10px 32px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: transform 0.2s, opacity 0.2s; min-width: 120px;">OK</button></div>`;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    addModalStyles();
    const okButton = modalContent.querySelector('#modal-ok-btn');
    okButton.onclick = () => closeModal();
    okButton.onmouseenter = () => { okButton.style.transform = 'scale(1.02)'; okButton.style.opacity = '0.9'; };
    okButton.onmouseleave = () => { okButton.style.transform = 'scale(1)'; okButton.style.opacity = '1'; };
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    const handleEsc = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEsc); } };
    document.addEventListener('keydown', handleEsc);
    function closeModal() {
        modal.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => { modal.remove(); document.removeEventListener('keydown', handleEsc); }, 200);
    }
}

function addModalStyles() {
    if (!document.querySelector('#modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } } @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`;
        document.head.appendChild(style);
    }
}

function safeExecute(fn, errorMessage) {
    try {
        return fn();
    } catch (error) {
        console.error(errorMessage, error);
        showNotification(errorMessage, 'error');
        if (window.errorTracking) window.errorTracking.captureException(error);
        return null;
    }
}

function getSeatX(seat) {
    return seat.getBoundingRect(true, true).left;
}

function setDotNetReference(ref) {
    dotNetHelper = ref;
}

function initCustomizeButton() {
    const customizeBtn = document.getElementById("btnCustomizeRows");
    if (customizeBtn) {
        customizeBtn.addEventListener("click", () => {
            if (window.fabricInterop && window.fabricInterop.mode === "select") {
                fabricInterop.showRowCustomizeOptions("seatCanvas");
            } else {
                showNotification("Please enter select mode first", "info");
            }
        });
    }
}

function saveCurrentChartWithNewId(newChartId) {
    const canvas = window.fabricInterop.canvases["seatCanvas"];
    if (!canvas) {
        showNotification("No chart loaded", "error");
        return;
    }

    // Get all objects
    const objects = canvas.getObjects();
    if (objects.length === 0) {
        showNotification("Chart is empty", "error");
        return;
    }

    // Serialize the current state
    const json = canvas.toJSON([
        'seatLabel', 'seatId', 'categoryId', 'categoryName', 'seatType', 'holdToken',
        'rowLabel', 'rowId', 'isRowLabel', 'seatStatus',
        'objectType', 'createdBy', 'rectangleId', 'rectangleLabel', 'rectangleIcon',
        'categoryId', 'categoryName', 'capacity', 'generalLabel',
        'seatLabelFormat', 'customLabelStart',
        'rowLabelFormat', 'rowLabelCustomStart'
    ]);


    const jsonStr = JSON.stringify(json);

    // Save with new chart ID
    DotNet.invokeMethodAsync("TTWSeating", "SaveSeatingLayout", jsonStr, "Copy", newChartId);
    showNotification(`Chart Copied"`, "success");

    //.then(response => {
    //    debugger;
    //    if (response.success) {
    //        showNotification(`Chart Copied"`, "success");
    //    } else {
    //        showNotification(response.message || "Failed to save", "error");
    //    }
    //})
    //.catch(err => {
    //    showNotification("Error saving as new chart", "error");
    //    console.error(err);
    //});
}
function saveChartAsNew() {
    // Show a prompt or dialog to get the new chart key
    const newChartId = prompt("Enter a new chart name:", "Chart_" + Date.now());
    if (newChartId) {
        saveCurrentChartWithNewId(newChartId);
    }
}
async function getAvailableCount(chartId, categoryName) {
    debugger;
   // const url = `https://localhost:7203/api/chart/GetCount?chartId=${chartId}&catname=${encodeURIComponent(categoryName)}`;
    const url = `http://localhost:5045/api/chart/GetCount?chartId=${chartId}&catname=${encodeURIComponent(categoryName)}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const count = await response.text(); // Since your API returns a string
        return count; // Returns the count as a string
    }
    catch (err) {
        console.error("Error fetching count:", err);
        return "0"; // Return "0" as default on error
    }
}
//function getAvailableCount(chartId, categoryName) {
//    const url = `https://localhost:7203/api/chart/GetCount?chartId=${chartId}&catname=${encodeURIComponent(categoryName)}`;

//    return fetch(url)
//        .then(response => {
//            if (!response.ok)
//                throw new Error(response.status);

//            return response.text();
//        })
//        .catch(err => {
//            console.error(err);
//            return "0";
//        });
//}








/* Shared SVG chart preview renderer */
/* Shared-coordinate SVG renderer for the saved SeatsQ chart. Uses the same chartJson.shapes,
   cats and geometry as chart-editor.js, so preview objects do not get repositioned via Fabric. */
(function (global) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg', R = 9, SP = 26;
    let lastRender = null, showRows = true, showSeats = true;
    const ICONS = {
        restroom: '<circle cx="6.5" cy="4" r="2.4" fill="currentColor"/><path d="M4 8h5v7H7.5v6h-2v-6H4z" fill="currentColor"/><circle cx="17.5" cy="4" r="2.4" fill="currentColor"/><path d="M17.5 8l3.5 8h-2v5h-3v-5h-2z" fill="currentColor"/><path d="M12 3v18" fill="none" stroke="currentColor" stroke-width="2"/>',
        man: '<circle cx="12" cy="4" r="2.4" fill="currentColor"/><path d="M8.5 8h7v7h-2v7h-3v-7h-2z" fill="currentColor"/>',
        woman: '<circle cx="12" cy="4" r="2.4" fill="currentColor"/><path d="M12 8l4.5 9H14v5h-4v-5H7.5z" fill="currentColor"/>',
        stage: '<path d="M8 4h8l3 11H5zM4 17h16v3H4z" fill="currentColor"/>',
        entrance: '<path d="M14 4h5v16h-5M4 12h10M10 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        exit: '<path d="M10 4H5v16h5M10 12h10M16 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        stairs: '<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
        dining: '<path d="M7 3v18M4 3v6a3 3 0 006 0V3M17 21V3c-2 1-3 4-3 8h3" fill="none" stroke="currentColor" stroke-width="2"/>',
        bar: '<path d="M4 4h16l-8 9zM12 13v7M8 20h8" fill="none" stroke="currentColor" stroke-width="2"/>',
        beer: '<path d="M6 6h9v14H6zM15 9h3a2 2 0 012 2v3a2 2 0 01-2 2h-3" fill="none" stroke="currentColor" stroke-width="2"/>',
        coffee: '<path d="M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4zM16 11h2a2 2 0 010 4h-2M8 3v3M12 3v3" fill="none" stroke="currentColor" stroke-width="2"/>',
        warning: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01" fill="none" stroke="currentColor" stroke-width="2"/>',
        wheelchair: '<circle cx="10" cy="4" r="2" fill="currentColor"/><path d="M10 8v6h5l2 5M7 11a5 5 0 105 8" fill="none" stroke="currentColor" stroke-width="2"/>',
        info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.01" fill="none" stroke="currentColor" stroke-width="2"/>',
        lift: '<path d="M5 3h14v18H5zM9 10l3-3 3 3M9 14l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2"/>'
    };
    const svgEl = (name, attrs, parent) => { const n = document.createElementNS(NS, name); Object.entries(attrs || {}).forEach(([k, v]) => { if (v !== undefined && v !== null) n.setAttribute(k, String(v)) }); if (parent) parent.appendChild(n); return n; };
    const text = (parent, x, y, str, attrs = {}) => { const n = svgEl('text', { x, y, 'dominant-baseline': 'auto', ...attrs }, parent); n.textContent = str == null ? '' : String(str); return n; };
    const catMap = (cats, id) => cats.find(c => String(c.id) === String(id)) || { color: '#888', name: '—' };
    const seatNo = (st, k) => { st = String(st == null ? '1' : st).trim() || '1'; const m = /^(.*?)(\d+)$/.exec(st); if (m) return m[1] + String(+m[2] + k).padStart(m[2].length > 1 && m[2][0] === '0' ? m[2].length : 0, '0'); return /^\d+$/.test(st) ? String(+st + k) : st.slice(0, -1) + String.fromCharCode(st.toUpperCase().charCodeAt(st.length - 1) + k); };
    function polySeats(pts, n) { const seg = [], lens = []; let total = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); total += l } const count = n ?? Math.floor(total / SP) + 1, out = []; let si = 0, acc = 0; for (let i = 0; i < count; i++) { const d = i * SP; while (si < seg.length - 1 && d > acc + seg[si]) { acc += seg[si]; si++ } const a = pts[si], b = pts[si + 1] || pts[si], l = seg[si] || 1, t = (d - acc) / l; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }) } return out; }
    function rowSeats(s) { if (s.pts) return { p: polySeats(s.pts, s.count).map((p, i) => ({ ...p, l: seatNo(s.start, s.dir === 'rtl' ? s.count - 1 - i : i) })), cx: 0, cy: 0 }; const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, mx = (s.x1 + s.x2) / 2 + (-dy / len) * (s.curve || 0) * 2, my = (s.y1 + s.y2) / 2 + (dx / len) * (s.curve || 0) * 2, p = []; for (let i = 0; i < s.count; i++) { const t = s.count > 1 ? i / (s.count - 1) : 0, u = 1 - t, k = s.dir === 'rtl' ? s.count - 1 - i : i; p.push({ x: u * u * s.x1 + 2 * u * t * mx + t * t * s.x2, y: u * u * s.y1 + 2 * u * t * my + t * t * s.y2, l: seatNo(s.start, k) }) } return { p, cx: mx, cy: my }; }
    function tableSeats(s) { const out = []; if (s.shape === 'rect') { const top = Math.ceil(s.count / 2), bot = s.count - top;[[top, -1], [bot, 1]].forEach(([n, dir]) => { for (let i = 0; i < n; i++)if (n) out.push({ x: s.x - s.w / 2 + (i + .5) * s.w / n, y: s.y + dir * (s.h / 2 + R + 4) }) }) } else for (let i = 0; i < s.count; i++) { const a = i / s.count * Math.PI * 2; out.push({ x: s.x + Math.cos(a) * (s.r + R + 4), y: s.y + Math.sin(a) * (s.r + R + 4) }) } return out; }
    function bounds(s) { if (s.type === 'row') { const p = rowSeats(s).p; const xs = p.map(q => q.x), ys = p.map(q => q.y); return { x: Math.min(...xs) - R - 24, y: Math.min(...ys) - R, w: Math.max(...xs) - Math.min(...xs) + 2 * R + 24, h: Math.max(...ys) - Math.min(...ys) + 2 * R } } if (s.type === 'table') return s.shape === 'rect' ? { x: s.x - s.w / 2 - R - 8, y: s.y - s.h / 2 - R - 8, w: s.w + 2 * R + 16, h: s.h + 2 * R + 16 } : { x: s.x - s.r - R - 8, y: s.y - s.r - R - 8, w: 2 * (s.r + R + 8), h: 2 * (s.r + R + 8) }; if (s.type === 'icon') return { x: s.x - s.size / 2, y: s.y - s.size / 2, w: s.size, h: s.size }; if (s.type === 'line') return { x: Math.min(s.x1, s.x2) - 6, y: Math.min(s.y1, s.y2) - 6, w: Math.abs(s.x2 - s.x1) + 12, h: Math.abs(s.y2 - s.y1) + 12 }; if (s.type === 'focal') return { x: s.x - 20, y: s.y - 20, w: 40, h: 40 }; if (s.type === 'text') return { x: s.x, y: s.y - s.size, w: (s.text || 'Text').length * s.size * .6, h: s.size * 1.3 }; if (s.pts) { const xs = s.pts.map(p => p.x), ys = s.pts.map(p => p.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } } return { x: s.x, y: s.y, w: s.w, h: s.h }; }
    function center(s) { const b = bounds(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
    function render(containerId, chartJson, seatsJson) {
        lastRender = { containerId, chartJson, seatsJson }; const host = document.getElementById(containerId); if (!host) return; let data; try { data = typeof chartJson === 'string' ? JSON.parse(chartJson) : chartJson } catch (e) { console.error('Invalid chart JSON', e); return } const shapes = data.shapes || [], cats = data.cats || []; let seatRows = []; try { seatRows = typeof seatsJson === 'string' ? JSON.parse(seatsJson || '[]') : (seatsJson || []) } catch { } if (!Array.isArray(seatRows)) seatRows = seatRows?.Tables?.[0]?.Rows || [];
        host.innerHTML = ''; host.style.position = 'relative'; host.style.minHeight = host.style.minHeight || '800px'; host.style.overflow = 'hidden'; host.style.backgroundColor = '#fff'; host.style.backgroundImage = 'radial-gradient(#d7e2f4 1px, transparent 1px)'; host.style.backgroundSize = '20px 20px';
        const all = []; shapes.forEach(s => { const b = bounds(s); all.push(b) }); if (!all.length) return; const minX = Math.min(...all.map(b => b.x)), minY = Math.min(...all.map(b => b.y)), maxX = Math.max(...all.map(b => b.x + b.w)), maxY = Math.max(...all.map(b => b.y + b.h)); const pad = 50, vw = Math.max(1, maxX - minX + pad * 2), vh = Math.max(1, maxY - minY + pad * 2); const svg = svgEl('svg', { viewBox: `${minX - pad} ${minY - pad} ${vw} ${vh}`, width: '100%', height: '800px', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Seating chart preview' }, host); svg.style.display = 'block'; svg.style.minHeight = '800px'; svg.style.overflow = 'visible';
        // index seat metadata by row+seat name; category assignments from saved chart data take precedence
        const seatLookup = new Map(); seatRows.forEach(r => seatLookup.set(String(r.seat_name || r.seat || ''), r));
        shapes.slice().sort((a, b) => (b.type === 'focal') - (a.type === 'focal')).forEach(s => {
            const c = catMap(cats, s.cat).color, cc = center(s), g = svgEl('g', { transform: `rotate(${s.rot || 0} ${cc.x} ${cc.y})` }, svg);
            if (s.type === 'row') { const q = rowSeats(s); q.p.forEach((p, i) => { const sd = (s.sd && s.sd[i]) || {}, seatName = (s.label || '') + '-' + (sd.label || p.l), db = seatLookup.get(seatName), cat = catMap(cats, sd.cat || s.cat), fill = cat.color; const circle = svgEl('circle', { cx: p.x, cy: p.y, r: R, fill, stroke: '#fff', 'stroke-width': 1.5, 'data-seat': seatName, tabindex: 0 }, g); const tip = [`Row: ${s.label || ''}`, `Seat: ${sd.label || p.l}`, `Category: ${cat.name}`, db?.status ? `Status: ${db.status}` : ''].filter(Boolean).join('\n'); circle.addEventListener('mouseenter', () => showTip(host, tip)); circle.addEventListener('mouseleave', hideTip); circle.addEventListener('focus', () => showTip(host, tip)); circle.addEventListener('blur', hideTip); if (showSeats) text(g, p.x, p.y + 3, sd.label || p.l, { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 600, fill: '#fff', 'pointer-events': 'none' }); }); const l = q.p[0].x <= q.p[q.p.length - 1].x ? q.p[0] : q.p[q.p.length - 1]; if (showRows && s.lblOn !== false) text(g, l.x - 22, l.y + 4, s.label, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#64708f' }); }
            else if (s.type === 'table') { const tableFill = c + '33', stroke = c; if (s.shape === 'rect') svgEl('rect', { x: s.x - s.w / 2, y: s.y - s.h / 2, width: s.w, height: s.h, rx: 8, fill: tableFill, stroke, 'stroke-width': 1.5 }, g); else svgEl('circle', { cx: s.x, cy: s.y, r: s.r, fill: tableFill, stroke, 'stroke-width': 1.5 }, g); tableSeats(s).forEach((p, i) => { const cat = catMap(cats, s.cat), seatName = (s.label || 'T') + '-' + (i + 1), tip = `Table: ${s.label || ''}\nSeat: ${i + 1}\nCategory: ${cat.name}`; const el = svgEl('circle', { cx: p.x, cy: p.y, r: R, fill: cat.color, stroke: '#fff', 'stroke-width': 1.5, tabindex: 0, 'data-seat': seatName }, g); el.addEventListener('mouseenter', () => showTip(host, tip)); el.addEventListener('mouseleave', hideTip); if (showSeats) text(g, p.x, p.y + 3, String(i + 1), { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 600, fill: '#fff', 'pointer-events': 'none' }); }); text(g, s.x, s.y + 4, s.label, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1e2540' }); }
            else if (s.type === 'icon') { const ig = svgEl('g', { transform: `translate(${s.x - s.size / 2} ${s.y - s.size / 2}) scale(${s.size / 24})`, style: `color:${s.color || '#1e2540'}` }, g); ig.innerHTML = ICONS[s.ic] || ''; }
            else if (s.type === 'line') { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, hs = 6 + (s.w || 3) * 2; svgEl('line', { x1: s.x1, y1: s.y1, x2: s.arrow ? s.x2 - ux * hs * .6 : s.x2, y2: s.arrow ? s.y2 - uy * hs * .6 : s.y2, stroke: s.color || '#1e2540', 'stroke-width': s.w || 3, 'stroke-dasharray': s.dash || '0' }, g); if (s.arrow) svgEl('polygon', { points: `${s.x2},${s.y2} ${s.x2 - ux * hs - uy * hs * .5},${s.y2 - uy * hs + ux * hs * .5} ${s.x2 - ux * hs + uy * hs * .5},${s.y2 - uy * hs - ux * hs * .5}`, fill: s.color || '#1e2540' }, g); }
            else if (s.type === 'text') text(g, s.x, s.y, s.text || 'Text', { 'font-size': s.size || 18, 'font-weight': 600, fill: s.color || '#1e2540' });
            else if (s.type === 'focal') { const R0 = s.r || 120, gid = 'chartFocal' + Math.random().toString(36).slice(2, 8), df = svgEl('defs', {}, g), gr = svgEl('radialGradient', { id: gid }, df);[[0, .5], [.45, .3], [.8, .1], [1, 0]].forEach(([o, a]) => svgEl('stop', { offset: o, 'stop-color': '#ef4444', 'stop-opacity': a }, gr)); svgEl('circle', { cx: s.x, cy: s.y, r: R0, fill: `url(#${gid})`, 'pointer-events': 'none' }, g); svgEl('circle', { cx: s.x, cy: s.y, r: 7, fill: '#ef4444', stroke: '#fff', 'stroke-width': 2, 'pointer-events': 'none' }, g); text(g, s.x + 14, s.y - 12, 'Focal point', { 'font-size': 11, 'font-weight': 700, fill: '#ef4444', 'pointer-events': 'none' }); }
            else { const isRect = s.type === 'rect', shape = s.shape || 'rect'; if (shape === 'poly' && s.pts) svgEl('polygon', { points: s.pts.map(p => `${p.x},${p.y}`).join(' '), fill: isRect ? '#e6e9f4' : c + '2a', stroke: isRect ? '#b9c1da' : c, 'stroke-width': 1.5, 'stroke-dasharray': s.type === 'general' ? '7 5' : '0' }, g); else if (shape === 'circle') svgEl('ellipse', { cx: s.x + s.w / 2, cy: s.y + s.h / 2, rx: s.w / 2, ry: s.h / 2, fill: isRect ? '#e6e9f4' : c + '2a', stroke: isRect ? '#b9c1da' : c, 'stroke-width': 1.5, 'stroke-dasharray': s.type === 'general' ? '7 5' : '0' }, g); else svgEl('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: 10, fill: isRect ? '#e6e9f4' : c + '2a', stroke: isRect ? '#b9c1da' : c, 'stroke-width': 1.5, 'stroke-dasharray': s.type === 'general' ? '7 5' : '0' }, g); text(g, s.x + s.w / 2, s.y + s.h / 2 + 5, s.label || '', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: '#1e2540' }); if (s.type === 'general') text(g, s.x + s.w / 2, s.y + s.h / 2 + 23, (s.cap || 0) + ' capacity', { 'text-anchor': 'middle', 'font-size': 11, fill: '#7a85a6' }); }
        });
        if (!document.getElementById('chartPreviewTooltipStyle')) { const style = document.createElement('style'); style.id = 'chartPreviewTooltipStyle'; style.textContent = '.chart-preview-tip{position:fixed;z-index:99999;display:none;pointer-events:none;white-space:pre-line;background:#202438;color:#fff;padding:7px 10px;border-radius:6px;font:12px/1.45 system-ui,sans-serif;box-shadow:0 4px 16px #0002}'; document.head.appendChild(style) }
    }
    function showTip(host, content) { let tip = document.getElementById('chartPreviewTooltip'); if (!tip) { tip = document.createElement('div'); tip.id = 'chartPreviewTooltip'; tip.className = 'chart-preview-tip'; document.body.appendChild(tip) } tip.textContent = content; tip.style.display = 'block'; const move = e => { tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY + 12) + 'px' }; host.onmousemove = move; }
    function showLoader(id) { const h = document.getElementById(id); if (!h) return; if (!document.getElementById('chartPreviewLoaderStyle')) { const st = document.createElement('style'); st.id = 'chartPreviewLoaderStyle'; st.textContent = '.cp-loader{position:absolute;inset:0;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#fff;font:600 13px system-ui,sans-serif;color:#6b7694}.cp-loader i{width:40px;height:40px;border:4px solid #e4e8f2;border-top-color:#4f46e5;border-radius:50%;animation:cpSpin .8s linear infinite}@keyframes cpSpin{to{transform:rotate(360deg)}}'; document.head.appendChild(st) } h.style.position = 'relative'; hideLoader(id); const l = document.createElement('div'); l.className = 'cp-loader'; l.innerHTML = '<i></i><span>Loading chart…</span>'; h.appendChild(l) }
    function hideLoader(id) { const h = document.getElementById(id); if (h) h.querySelectorAll('.cp-loader').forEach(x => x.remove()) }
    function hideTip() { const t = document.getElementById('chartPreviewTooltip'); if (t) t.style.display = 'none' }
    global.chartPreviewRenderer = { render, showLoader, hideLoader, toggleRowLabels() { showRows = !showRows; if (lastRender) render(lastRender.containerId, lastRender.chartJson, lastRender.seatsJson); return showRows; }, toggleSeatLabels() { showSeats = !showSeats; if (lastRender) render(lastRender.containerId, lastRender.chartJson, lastRender.seatsJson); return showSeats; } };
})(window);