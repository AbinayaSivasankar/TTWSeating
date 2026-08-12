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
            return AddOrChange(false, vncParams,ref ChartId, UserId);
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
    }
}
