// seating-chart.js
window.SeatingChart = class SeatingChart {
   
    constructor(containerId, chartId, secretkey, options = {}) {
        debugger;
        this.containerId = containerId;
        this.chartId = chartId;
        this.secretKey = secretkey;
        this.options = options;
        this.canvasId = `canvas-${chartId}-${Date.now()}`;
    }

    async render() {
        debugger;
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container element with ID '${this.containerId}' not found.`);
            return;
        }

        // Get available width and height of the container/device
        const deviceWidth = container.clientWidth || window.innerWidth;
        const deviceHeight = window.innerHeight * 0.7; // Fixed multiplication

        container.innerHTML = `<canvas id="${this.canvasId}" width="${deviceWidth}" height="${deviceHeight}"></canvas>`;

        try {
            debugger;
            //{ apiBase: "https://highqcare.com/seating_api/api/chart" } 
            const baseUrl = this.options.apiBase || "http://localhost:5045/api/chart";

            const [response, seatDetailsResponse] = await Promise.all([
                fetch(`${baseUrl}?chartId=${this.chartId}&secretkey=${this.secretKey}`),
                fetch(`${baseUrl}/SeatList?chartId=${this.chartId}`),
                fetch(`${baseUrl}/Updatestatus?chartId=${this.chartId}&secretkey=${this.secretKey}`, {
                    method: "POST"
                })
            ]);

            const data = await response.json();
            const seats = await seatDetailsResponse.json();

            // Initialize Fabric Canvas
            window.fabricInterop.initCanvas(
                this.canvasId,
                deviceWidth,
                deviceHeight
            );

            // Load JSON onto Canvas
            window.fabricInterop.loadLayout(this.canvasId, data.chart_json);

            // Enable Interactive User or Select Mode
            if (this.options.mode === 'user') {
                window.fabricInterop.enableUserMode(this.canvasId, seats, this.chartId);
            } else {
                window.fabricInterop.enableSelectMode(this.canvasId);
            }

            return this;
        } catch (error) {
            console.error('Failed to load seating chart:', error);
        }
    }

    // Same list the page receives in receiveSelectedSeatsFromBlazor: seats plus expanded general-admission tickets.
    getSelectedSeats() {
        const canvas = window.fabricInterop.canvases[this.canvasId];
        return canvas ? window.fabricInterop.getAllSelections(canvas) : [];
    }

    clearSelections() {
        window.fabricInterop.clearSelectedSeats(this.canvasId);
    }
};