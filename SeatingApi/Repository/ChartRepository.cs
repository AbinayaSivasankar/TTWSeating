using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SeatingApi.DataLayer;
using SeatingApi.Model;
using System.Collections.Specialized;
using System.Data;
using System.Text.Json.Serialization;

namespace SeatingApi.Repository
{
    public class ChartRepository
    {
        public ChartModel GetChartInfo(string chartId, string secretkey)
        {
            ChartModel chart = new ChartModel();
            cdlChart objChart = new cdlChart();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("log_id", "0");
            vncParams.Add("option", "S");
            vncParams.Add("chart_key", "");
            objChart.GetChartCategory(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];
                    if (dr["secret_key"].ToString() != secretkey)
                    {
                        return null;
                    }
                    chart = new ChartModel
                    {
                        chart_id = Convert.ToInt32(dr["chart_id"]),
                        chart_json = dr["chart_json"].ToString(),
                        cat_name = dr["cat_name"].ToString(),
                        rec_stat = dr["rec_stat"].ToString()
                    };
                }
            }
            return chart;
        }
        public string UpdateSeatStauts(string chartId, string SelectedSeats, string secretKey)
        {
            ChartModel chart = new ChartModel();
            chart = GetChartInfo(chartId, secretKey);
            if (chart != null)
            {
                var chartjson = JsonConvert.DeserializeObject<dynamic>(chart.chart_json);
                // var seats = SelectedSeats.Split(',');
                var seats = JsonConvert.DeserializeObject<dynamic>(SelectedSeats);
                var objects = chartjson["objects"] as JArray;

                //if (objects == null)
                //    return;
                foreach (var seat in seats)
                {
                    if (seat.seatType == "")
                    {
                        foreach (var obj in objects)
                        {
                            string seatId = obj["seatId"]?.ToString();


                            if (seatId != null && seat.id.ToString().Trim() == seatId.Trim())
                            {

                                if (GetSeatHoldToken(seat.id.ToString(), chartId) == seat.holdtoken.ToString().Trim())
                                {
                                    obj["seatStatus"] = "sold";   // update status
                                    UpdateSeatStatus(chartId, seat.id.ToString());

                                }
                            }

                        }
                    }
                    else if (seat.seatType == "GA")
                    {
                       DataSet ds =  GetGASeats(chartId, seat.categoryName.ToString());
                        if (ds != null)
                        {
                            if (ds.Tables[0].Rows.Count > 0)
                            {
                                foreach (DataRow dr in ds.Tables[0].Rows)
                                {

                                    if (dr["status"].ToString() == "available")
                                    {
                                        UpdateGASeatStatus(chartId, dr["seat_name"].ToString());
                                        break;
                                    }

                                }
                            }
                        }

                    }

                }
                // chart.chart_json = chartjson.ToString();
                // var result= SaveChart(chart);
                return "";
            }
            return "";
        }
        public string SaveChart(ChartModel chart)
        {
            cdlChart objChart = new cdlChart();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chart.chart_id.ToString());
            vncParams.Add("chart_json", chart.chart_json.ToString());
            vncParams.Add("cat_name", chart.cat_name);
            vncParams.Add("rec_stat", chart.rec_stat.ToString());
            vncParams.Add("color", "");
            return objChart.SaveChart(vncParams).ToString();


        }
        public void UpdateSeatStatus(string chartId, string seatId)
        {
            cdlSeats objSeats = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("seat_name", seatId);
            vncParams.Add("status", "sold");
            objSeats.UpdateSeat(vncParams);
        }
        public void UpdateGASeatStatus(string chartId, string seatname)
        {
            cdlSeats objSeats = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("seat_name", seatname);
            vncParams.Add("status", "sold");
            objSeats.UpdateSeat(vncParams);
        }
        public DataSet GetGASeats(string chartId, string cat)
        {
            cdlSeats objseat = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            DataSet ds = new DataSet();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("row_name", "");
            vncParams.Add("seat_name", "");
            vncParams.Add("cat_name", cat);
            vncParams.Add("option", "S");
            objseat.Getseats(vncParams, ref ds);
            return ds;

        }
        public string UpdateSeatsHoldToken(string chartId, string seatId, string holdToken)
        {
            cdlSeats objSeats = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("seat_name", seatId);
            vncParams.Add("hold_token", holdToken);
            vncParams.Add("status", "Reserved");
            objSeats.UpdateHoldToken(vncParams);
            return "";
        }
        public List<CategoryModel> GetCategoryList(string chartId)
        {
            List<CategoryModel> CatList = new List<CategoryModel>();
            ChartModel chart = new ChartModel();
            chart = GetChartCat(chartId);
            CatList = JsonConvert.DeserializeObject<List<CategoryModel>>(chart.cat_name.ToString());
            return CatList;
        }
        public ChartModel GetChartCat(string chartId)
        {
            ChartModel chart = new ChartModel();
            cdlChart objChart = new cdlChart();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("log_id", "0");
            vncParams.Add("option", "S");
            vncParams.Add("chart_key", "");
            objChart.GetChartCategory(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];

                    chart = new ChartModel
                    {
                        chart_id = Convert.ToInt32(dr["chart_id"]),
                        chart_json = dr["chart_json"].ToString(),
                        cat_name = dr["cat_name"].ToString(),
                        rec_stat = dr["rec_stat"].ToString()
                    };
                }
            }
            return chart;
        }
        public string GetChartJson(string chartId)
        {
            ChartModel chart = new ChartModel();
            cdlChart objChart = new cdlChart();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("option", "A");
            vncParams.Add("log_id", "0");
            vncParams.Add("chart_key", "");
            objChart.GetChartCategory(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];
                    chart = new ChartModel
                    {
                        chart_json = dr["chart_json"].ToString(),
                    };
                }
            }
            return chart.chart_json;
        }

        public string GetSeatHoldToken(string Seat, string chartId)
        {
            cdlSeats objSeat = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            DataSet ds = new DataSet();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("row_name", "");
            vncParams.Add("cat_name", "");
            vncParams.Add("seat_name", Seat);
            vncParams.Add("option", "");
            objSeat.Getseats(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];
                    return dr["hold_token"].ToString();
                }
            }
            return "";
        }

        public IEnumerable<seatModal> GetSeatDetails(string chartId)
        {
            List<seatModal> seats = new List<seatModal>();
            cdlSeats objSeat = new cdlSeats();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("row_name", "");
            vncParams.Add("cat_name", "");
            vncParams.Add("seat_name", "");
            vncParams.Add("option", "C");
            objSeat.Getseats(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    foreach (DataRow dr in ds.Tables[0].Rows)

                        seats.Add(new seatModal
                        {
                            chart_id = dr["chart_id"].ToString(),
                            seat_name = dr["seat_name"].ToString(),
                            cat_name = dr["cat_name"].ToString(),
                            row_name = dr["row_name"].ToString(),
                            hold_token = dr["hold_token"].ToString(),
                            status = dr["status"].ToString()
                        });
                }
            }
            return seats;
        }


        public List<ChartModel> GetAllChartInfo(string key)
        {
            //var userid = GetUser(key);
            List<ChartModel> chart = new List<ChartModel>();
            cdlChart objChart = new cdlChart();
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", "0");
            vncParams.Add("option", "C");
            vncParams.Add("log_id", "0");
            vncParams.Add("chart_key", key);
            objChart.GetChartCategory(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    foreach (DataRow dr in ds.Tables[0].Rows)
                        chart.Add(new ChartModel
                        {
                            chart_id = Convert.ToInt32(dr["chart_id"]),
                            chart_json = dr["chart_json"].ToString(),
                            cat_name = dr["cat_name"].ToString(),
                            rec_stat = dr["rec_stat"].ToString(),
                            chart_title = dr["chart_title"].ToString(),
                            chart_key = dr["chart_key"].ToString(),
                            event_key = dr["event_key"].ToString(),
                        });
                }
            }
            return chart;
        }
        public string GetUser(string seckey)
        {
            cdlUser objUser = new cdlUser();
            NameValueCollection vncParams = new NameValueCollection();
            DataSet ds = new DataSet();
            vncParams.Add("user_id", "0");
            vncParams.Add("public_key", "");
            vncParams.Add("secret_key", seckey);
            vncParams.Add("user_email", "");
            vncParams.Add("option", "P");
            objUser.GetUser(vncParams, ref ds);
            if (ds != null)
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];
                    return dr["user_id"].ToString();
                }
            }
            return "0";
        }
        public string UpdateHoldSeats(string chartId)
        {
            cdlSeats objSeats = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("chart_id", chartId);
            vncParams.Add("seat_name", "");
            vncParams.Add("hold_token", "");
            vncParams.Add("status", "Free");
            objSeats.UpdateSeatStatus(vncParams);
            return "";
        }

        public string ReleaseSeats(string chartId, string seatId)
        {
            cdlSeats objSeats = new cdlSeats();
            NameValueCollection vncParams = new NameValueCollection();
            var seats = seatId.Split(',');
            foreach (var seat in seats)
            {
                vncParams.Add("chart_id", chartId);
                vncParams.Add("seat_name", seat);
                vncParams.Add("status", "available");
                objSeats.UpdateSeat(vncParams);
            }
            return "";
        }
        public string GetGAAvailCount(string chartId, string catname)
        {
            DataSet ds = GetGASeats(chartId, catname);
            int availableCount = ds.Tables[0].AsEnumerable()
                .Count(row => row["status"].ToString() == "available" || row["status"].ToString() == "Free");
            return availableCount.ToString();
        }
    }

    
}
