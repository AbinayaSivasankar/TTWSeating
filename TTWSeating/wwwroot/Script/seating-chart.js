// seating-chart.js
window.SeatingChart = class SeatingChart {
    

    constructor(containerId, chartId, secretkey, options = {}) {
        this.containerId = containerId;
        this.chartId = chartId;
        this.secretKey = secretkey;
        this.options = options;
        this.canvasId = `canvas-${chartId}-${Date.now()}`;
        //this.canvasId = containerId;
    }

    async render() {
        debugger;
        const container = document.getElementById(this.containerId);
        // Get available width of the container/device
        const deviceWidth = container.clientWidth || window.innerWidth;

        // Set height as needed
        const deviceHeight = window.innerHeight * 0.7;
        container.innerHTML = `<canvas id="${this.canvasId}"  width="${deviceWidth}"
                height="${deviceHeight}"></canvas>`;

        try {
            
            const response = await fetch(`https://localhost:7203/api/chart?chartId=${this.chartId}&secretkey=${this.secretKey}`);
            await fetch(`https://localhost:7203/api/chart/Updatestatus?chartId=${this.chartId}&secretkey=${this.secretKey}`, {
                method: "POST"
            });
            const SeatDetails = await fetch(`https://localhost:7203/api/chart/SeatList?chartId=${this.chartId}`);



            //const response = await fetch(`http://dev.theticketworld.com/seating_api/api/chart?chartId=${this.chartId}&secretkey=${this.secretKey}`);
            //await fetch(`http://dev.theticketworld.com/seating_api/api/chart/Updatestatus?chartId=${this.chartId}&secretkey=${this.secretKey}`, {
            //    method: "POST"
            //});
            //const SeatDetails = await fetch(`http://dev.theticketworld.com/seating_api/api/chart/SeatList?chartId=${this.chartId}`);


          
            const data = await response.json();
            const seats = await SeatDetails.json();
            
            // window.fabricInterop.initCanvas(this.canvasId);
            window.fabricInterop.initCanvas(
                this.canvasId,
                deviceWidth,
                deviceHeight
            );
            window.fabricInterop.loadLayout(this.canvasId, data.chart_json);
            

            if (this.options.mode === 'user') {
                window.fabricInterop.enableUserMode(this.canvasId, seats, this.chartId);
            } else {
                window.fabricInterop.enableSelectMode(this.canvasId);
            }

            return this;
        } catch (error) {
            console.error('Failed to load chart:', error);
        }
    }

    getSelectedSeats() {
        return window.fabricInterop.getSelectedItems(this.canvasId);
    }

    clearSelections() {
        window.fabricInterop.clearSelectedSeats(this.canvasId);
    }
}
