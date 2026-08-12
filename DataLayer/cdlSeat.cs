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
    public class cdlSeat
    {
        public Boolean Add(NameValueCollection vncParams)
        {
            return AddOrChange(true, vncParams);
        }
        public Boolean Change(NameValueCollection vncParams)
        {
            return AddOrChange(false, vncParams);
        }
        private Boolean AddOrChange(Boolean vAddMode, NameValueCollection vncParams)
        {
            try
            {
                AddOrChangeSeat(vAddMode, vncParams);
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
        private int AddOrChangeSeat(Boolean vAddMode, NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand();

            if (vAddMode == true)
            {
                sqlcmd.CommandText = "hq_seat_ins";
            }
            else
            {
                sqlcmd.CommandText = "hq_seat_upd";
            }
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@seat_name", SqlDbType.VarChar).Value = vncParams["seat_name"];
            sqlcmd.Parameters.Add("@row_name", SqlDbType.VarChar).Value = vncParams["row_name"];
            sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar).Value = vncParams["cat_name"];
            sqlcmd.Parameters.Add("@status", SqlDbType.VarChar).Value = (vncParams["status"]);
            sqlcmd.Parameters.Add("@hold_token", SqlDbType.VarChar).Value = (vncParams["hold_token"]);

            cdlBase.ExecuteNonQuery(sqlcmd);

            return 0;
        }
        public int Updateseat(NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand("hq_seat_upd");
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@seat_name", SqlDbType.VarChar).Value = vncParams["seat_name"];
            
            sqlcmd.Parameters.Add("@status", SqlDbType.VarChar).Value = (vncParams["status"]);
            return cdlBase.ExecuteNonQuery(sqlcmd); ;
        }
        public int UpdateHoldToken(NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand("hq_update_hold_token");
            sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
            sqlcmd.Parameters.Add("@seat_name", SqlDbType.VarChar).Value = vncParams["seat_name"];
            sqlcmd.Parameters.Add("@hold_token", SqlDbType.VarChar).Value = vncParams["hold_token"];
            sqlcmd.Parameters.Add("@status", SqlDbType.VarChar).Value = (vncParams["status"]);
            return cdlBase.ExecuteNonQuery(sqlcmd); ;
        }
        public Boolean Getseats(NameValueCollection vncParams, ref DataSet vdsOutput)
        {
            try
            {
                SqlCommand sqlcmd = new SqlCommand("hq_seat_sel");
                sqlcmd.Parameters.Add("@chart_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["chart_id"]);
                sqlcmd.Parameters.Add("@seat_name", SqlDbType.VarChar).Value = vncParams["seat_name"];
                sqlcmd.Parameters.Add("@row_name", SqlDbType.VarChar).Value = vncParams["row_name"];
                sqlcmd.Parameters.Add("@cat_name", SqlDbType.VarChar).Value = vncParams["cat_name"];
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
