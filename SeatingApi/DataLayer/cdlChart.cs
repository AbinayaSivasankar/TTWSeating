using System.Collections.Specialized;
using System.Data;
using System.Data.SqlClient;

namespace SeatingApi.DataLayer
{
    public class cdlChart
    {
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
            SqlCommand sqlcmd = new SqlCommand();
            sqlcmd.CommandText = "hq_eventchart_upd";
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@chart_json", SqlDbType.VarChar).Value = vncParams["chart_json"];
            sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar).Value = vncParams["cat_name"];
            sqlcmd.Parameters.Add("@color", SqlDbType.VarChar).Value = (vncParams["color"]);
            sqlcmd.Parameters.Add("@rec_stat", SqlDbType.Char).Value = vncParams["rec_stat"];
            cdlBase.ExecuteNonQuery(sqlcmd);
            return 0;
        }
    }
}
