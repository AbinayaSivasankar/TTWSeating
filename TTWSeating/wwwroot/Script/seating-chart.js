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
            const baseUrl = "https://highqcare.com/seating_api/api/chart";
            window.fabricInterop.apiBase = baseUrl;
            const chartParams = new URLSearchParams({ chartId: this.chartId, secretkey: this.secretKey });
            const seatParams = new URLSearchParams({ chartId: this.chartId });

            fetch(`${baseUrl}/Updatestatus?${chartParams}`, { method: "POST" })
                .then(statusResponse => {
                    if (!statusResponse.ok) {
                        console.warn(`Seat status update failed: HTTP ${statusResponse.status}`);
                    }
                })
                .catch(error => console.warn("Seat status update failed:", error));

            const [response, seatDetailsResponse] = await Promise.all([
                fetch(`${baseUrl}?${chartParams}`),
                fetch(`${baseUrl}/SeatList?${seatParams}`)
            ]);
            if (!response.ok) throw new Error(`Chart request failed: HTTP ${response.status}`);
            if (!seatDetailsResponse.ok) throw new Error(`Seat list request failed: HTTP ${seatDetailsResponse.status}`);

            const data = await response.json();
            const seats = await seatDetailsResponse.json();
            if (!data || !data.chart_json) throw new Error("The API returned no chart data. Check the chart ID and secret key.");
            if (!Array.isArray(seats)) throw new Error("The API returned an invalid seat list.");

            // Initialize Fabric Canvas
            window.fabricInterop.initCanvas(
                this.canvasId,
                deviceWidth,
                deviceHeight
            );

            // Load JSON onto Canvas
            window.fabricInterop.loadLayout(this.canvasId, data.chart_json);

            // Prices for the seat tooltip: pass options.priceList ([{ category, price | ticketTypes:[{price}] }]) or call window.setGlobalPriceList yourself.
            if (Array.isArray(this.options.priceList) && typeof window.setGlobalPriceList === 'function') window.setGlobalPriceList(this.options.priceList);

            // The embedded ticketing chart is interactive by default; retain select mode as an explicit opt-in.
            if (this.options.mode === 'select') {
                window.fabricInterop.enableSelectMode(this.canvasId);
            } else {
                window.fabricInterop.enableUserMode(this.canvasId, seats, this.chartId);
            }

            return this;
        } catch (error) {
            console.error('Failed to load seating chart:', error);
            container.innerHTML = '<div role="alert">Unable to load the seating chart. Check the browser console and API configuration.</div>';
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