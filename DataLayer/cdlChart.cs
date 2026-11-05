using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DataLayer
{
    public class cdlChart
    {
        public Boolean Add(NameValueCollection vncParams, ref Int64 ChartId, int UserId)
        {
            return AddOrChange(true, vncParams, ref ChartId, UserId);
        }
        public Boolean Change(NameValueCollection vncParams, ref Int64 ChartId, int UserId)
        {
            return AddOrChange(false, vncParams, ref ChartId, UserId);
        }
        private Boolean AddOrChange(Boolean vAddMode, NameValueCollection vncParams, ref Int64 ChartId, int UserId)
        {
            try
            {
                AddOrChangeChart(vAddMode, vncParams, ref ChartId, UserId);
                return true;
            }
            catch (SqlException ex)
            {
                throw ex;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
            }
        }
        private int AddOrChangeChart(Boolean vAddMode, NameValueCollection vncParams, ref Int64 ChartId, int UserId)
        {
            SqlCommand sqlcmd = new SqlCommand();

            if (vAddMode == true)
            {
                sqlcmd.CommandText = "hq_eventchart_ins";
            }
            else
            {
                sqlcmd.CommandText = "hq_eventchart_upd";
            }
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@chart_title", SqlDbType.VarChar).Value = vncParams["chart_title"];
            sqlcmd.Parameters.Add("@chart_key", SqlDbType.VarChar).Value = vncParams["chart_key"];
            sqlcmd.Parameters.Add("@event_key", SqlDbType.VarChar).Value = vncParams["event_key"];

            sqlcmd.Parameters.Add("@chart_json", SqlDbType.VarChar).Value = vncParams["chart_json"];
            sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar).Value = vncParams["cat_name"];
            sqlcmd.Parameters.Add("@rec_stat", SqlDbType.Char).Value = vncParams["rec_stat"];
            sqlcmd.Parameters.Add("@log_id", SqlDbType.Int).Value = UserId;

            var returnEventId = sqlcmd.Parameters.Add("@chart_id_ou", SqlDbType.Int);
            returnEventId.Direction = ParameterDirection.Output;
            cdlBase.ExecuteNonQuery(sqlcmd);
            if (returnEventId.Value != DBNull.Value)
            {
                ChartId = Convert.ToInt64(returnEventId.Value);
            }
            return 0;
        }
        public int UpdateCategory(NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand("hq_update_cat_info");
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar).Value = vncParams["cat_name"];
            return cdlBase.ExecuteNonQuery(sqlcmd); ;
        }

        public Boolean GetChartCategory(NameValueCollection vncParams, ref DataSet vdsOutput)
        {
            try
            {
                SqlCommand sqlcmd = new SqlCommand("hq_eventchart_sel");
                sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
                sqlcmd.Parameters.Add("@log_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["log_id"]);
                sqlcmd.Parameters.Add("@chart_key", SqlDbType.VarChar).Value = vncParams["chart_key"];
                sqlcmd.Parameters.Add("@option", SqlDbType.Char).Value = vncParams["option"];
                vdsOutput = cdlBase.ExecuteDataSet(sqlcmd);
                return true;
            }
            catch (System.Exception ex)
            {
                throw ex;
            }
        }

        public int SaveChart(NameValueCollection vncParams)
        {
            int chartId = string.IsNullOrEmpty(vncParams["chart_id"]) ? 0 : Convert.ToInt32(vncParams["chart_id"]);
            int logId = string.IsNullOrEmpty(vncParams["log_id"]) ? 0 : Convert.ToInt32(vncParams["log_id"]);
            string title = vncParams["chart_title"] ?? "";
            string chartKey = vncParams["chart_key"] ?? "";
            string eventKey = vncParams["event_key"] ?? "";
            string recStat = vncParams["rec_stat"] ?? "A";

            if (chartId > 0 && (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(chartKey) || string.IsNullOrEmpty(eventKey) || logId == 0 || string.IsNullOrEmpty(recStat)))
            {
                DataSet ds = null;
                NameValueCollection q = new NameValueCollection();
                q.Add("chart_id", chartId.ToString());
                q.Add("log_id", "0");
                q.Add("chart_key", "");
                q.Add("option", "");
                GetChartCategory(q, ref ds);
                if (ds != null && ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
                {
                    DataRow dr = ds.Tables[0].Rows[0];
                    if (string.IsNullOrEmpty(title)) title = dr["chart_title"].ToString();
                    if (string.IsNullOrEmpty(chartKey)) chartKey = dr["chart_key"].ToString();
                    if (string.IsNullOrEmpty(eventKey)) eventKey = dr["event_key"].ToString();
                    if (string.IsNullOrEmpty(recStat)) recStat = dr["rec_stat"].ToString();
                    if (logId == 0 && dr["created_by"] != DBNull.Value) logId = Convert.ToInt32(dr["created_by"]);
                }
            }

            if (chartId == 0 && string.IsNullOrEmpty(chartKey)) chartKey = Guid.NewGuid().ToString("N");
            if (chartId == 0 && string.IsNullOrEmpty(eventKey)) eventKey = Guid.NewGuid().ToString("N");

            if (string.IsNullOrEmpty(recStat)) recStat = "A";

            SqlConnection sqlcon = null;
            SqlTransaction sqltrx = null;
            try
            {
                sqlcon = cdlBase.GetSqlConnection();
                sqltrx = sqlcon.BeginTransaction();

                using (SqlCommand sqlcmd = new SqlCommand(chartId == 0 ? "hq_eventchart_ins" : "hq_eventchart_upd"))
                {
                    sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = chartId;
                    sqlcmd.Parameters.Add("@chart_title", SqlDbType.VarChar, 100).Value = title;
                    sqlcmd.Parameters.Add("@chart_key", SqlDbType.VarChar, -1).Value = chartKey;
                    sqlcmd.Parameters.Add("@event_key", SqlDbType.VarChar, -1).Value = eventKey;
                    sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar, -1).Value = vncParams["cat_name"] ?? "";
                    sqlcmd.Parameters.Add("@chart_json", SqlDbType.VarChar, -1).Value = vncParams["chart_json"] ?? "";
                    sqlcmd.Parameters.Add("@rec_stat", SqlDbType.Char, 1).Value = recStat;
                    sqlcmd.Parameters.Add("@log_id", SqlDbType.Int).Value = logId;

                    SqlParameter outId = sqlcmd.Parameters.Add("@chart_id_ou", SqlDbType.Int);
                    outId.Direction = ParameterDirection.Output;

                    cdlBase.ExecuteNonQuery(sqlcmd, sqlcon, sqltrx);
                    if (outId.Value != DBNull.Value && outId.Value != null)
                    {
                        chartId = Convert.ToInt32(outId.Value);
                    }
                }

                NameValueCollection seatParams = new NameValueCollection();
                seatParams.Add("chart_id", chartId.ToString());
                seatParams.Add("seats_json", vncParams["seats_json"] ?? "[]");
                new cdlSeat().SyncSeats(seatParams, sqlcon, sqltrx);

                sqltrx.Commit();
                return chartId;
            }
            catch
            {
                if (sqltrx != null) sqltrx.Rollback();
                throw;
            }
            finally
            {
                if (sqltrx != null) sqltrx.Dispose();
                if (sqlcon != null) sqlcon.Close();
                if (sqlcon != null) sqlcon.Dispose();
            }
        }
    }
}
