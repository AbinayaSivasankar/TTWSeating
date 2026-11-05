using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SeatingApi.Model;
using SeatingApi.Repository;

namespace SeatingApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowOrigin")]
    public class chartController : Controller
    {
        private readonly ChartRepository chartRepository;
        public chartController()
        {
            chartRepository = new ChartRepository();
        }
        [HttpGet]
        public ChartModel GetChartDetails(string chartId, string secretkey)
        {
           return chartRepository.GetChartInfo(chartId, secretkey);
        }
        //[HttpPost]
        //public string UpdateStatus(string chartId, string seats, string secretKey)
        //{
        //   return  chartRepository.UpdateSeatStauts(chartId,seats,secretKey);
        //}

        [HttpPost]
        public string UpdateStatus([FromBody] SeatRequest request)
        {
            // request.ChartId
            // request.SecretKey
            // request.SelectedSeats
            return  chartRepository.UpdateSeatStauts(request.ChartId,request.SelectedSeats,request.SecretKey);

        }
        [HttpGet("CatList")]
        public List<CategoryModel> GetCategoryList(string chartId)
        {
            return chartRepository.GetCategoryList(chartId);
        }
        [HttpPost("Save")]
        public string SaveChart(ChartModel chartmodel)
        {
            return chartRepository.SaveChart(chartmodel);
        }
        [HttpPost("Update")]
        public string UpdateHoldToken(string chartId, string seats, string HoldToken)
        {
            return chartRepository.UpdateSeatsHoldToken(chartId, seats, HoldToken);
        }
        [HttpGet("SeatList")]
        public IEnumerable<seatModal> GetSeatList(string chartId)
        {
            return chartRepository.GetSeatDetails(chartId);
        }
        [HttpGet("All")]
        public List<ChartModel> GetAllCharts(string chartkey)
        {
            return chartRepository.GetAllChartInfo(chartkey);
        }
        [HttpPost("Updatestatus")]
        public string UpdateSeatStatus(string chartId)
        {
            return chartRepository.UpdateHoldSeats(chartId);
        }
        [HttpPost("ReleaseSeats")]
        public string ReleaseSeats(string chartId, string seats)
        {
            return chartRepository.ReleaseSeats(chartId, seats);
        }
        [HttpGet("GetCount")]
        public string GetGaAvailCount(string chartId,string catname)
        {
            return chartRepository.GetGAAvailCount(chartId, catname);
        }

        [HttpGet("SeatSummary")]
        public SeatSummaryModal GetSeatSummary(string chartId)
        {
            return chartRepository.GetSeatSummary(chartId);
        }


        [HttpGet("SeatSummaryByCategory")]
        public ChartSeatSummaryModal GetSeatSummaryByCategory(string chartId)
        {
            return chartRepository.GetSeatSummaryByCategory(chartId);
        }
    }
    public class SeatRequest
    {
        public string ChartId { get; set; }
        public string SecretKey { get; set; }
        public string SelectedSeats { get; set; }
    }

    public class SeatSummaryModal
    {
        public string chart_id { get; set; }
        public int total_seats { get; set; }
        public int total_booked { get; set; }
        public int total_available { get; set; }
        public int total_hold { get; set; }   // optional, useful to have
    }

    public class CategorySeatSummaryModal
    {
        public string cat_name { get; set; }
        public int total_seats { get; set; }
        public int total_booked { get; set; }
        public int total_available { get; set; }
        public int total_hold { get; set; }   // optional
    }

    public class ChartSeatSummaryModal
    {
        public string chart_id { get; set; }
        public int total_seats { get; set; }
        public int total_booked { get; set; }
        public int total_available { get; set; }
        public int total_hold { get; set; }   // optional
        public List<CategorySeatSummaryModal> categories { get; set; } = new List<CategorySeatSummaryModal>();
    }
}

