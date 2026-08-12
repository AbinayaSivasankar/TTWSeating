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
    public class cdlUser
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
                AddOrChangeUser(vAddMode, vncParams);
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
        private int AddOrChangeUser(Boolean vAddMode, NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand();

            if (vAddMode == true)
            {
                sqlcmd.CommandText = "hq_user_info_ins";
            }
            else
            {
                sqlcmd.CommandText = "hq_user_info_upd";
            }
            sqlcmd.Parameters.Add("@user_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["user_id"]);
            sqlcmd.Parameters.Add("@user_name", SqlDbType.VarChar).Value = vncParams["user_name"];
            sqlcmd.Parameters.Add("@user_email", SqlDbType.VarChar).Value = vncParams["user_email"];
            sqlcmd.Parameters.Add("@password", SqlDbType.VarChar).Value = vncParams["password"];
            sqlcmd.Parameters.Add("@public_key", SqlDbType.VarChar).Value = vncParams["public_key"];
            sqlcmd.Parameters.Add("@secret_key", SqlDbType.VarChar).Value = vncParams["secret_key"];
            sqlcmd.Parameters.Add("@rec_stat", SqlDbType.Char).Value = Convert.ToChar(vncParams["rec_stat"]);
            cdlBase.ExecuteNonQuery(sqlcmd);

            return 0;
        }


        public Boolean ValidateLogin(NameValueCollection vncParams, ref DataSet vdsOutput)
        {
            try
            {
                SqlCommand sqlcmd = new SqlCommand("hq_val_user");
                sqlcmd.Parameters.Add("@user_email", SqlDbType.VarChar).Value = vncParams["user_email"];
                sqlcmd.Parameters.Add("@password", SqlDbType.VarChar).Value = vncParams["password"];
                vdsOutput = cdlBase.ExecuteDataSet(sqlcmd);
                if (vdsOutput != null)
                {
                    if (vdsOutput.Tables.Count > 0)
                    {
                        if (vdsOutput.Tables[0].Rows.Count > 0)
                        {
                            return true;
                        }
                    }
                }
                return false;
            }
            catch (SqlException ex)
            {
                throw ex;
            }
            catch (System.Exception ex)
            {
                throw ex;
            }
        }

        public Boolean GetUser(NameValueCollection vncParams, ref DataSet vdsOutput)
        {
            try
            {
                SqlCommand sqlcmd = new SqlCommand("hq_user_info_sel");
                sqlcmd.Parameters.Add("@user_id", SqlDbType.Int).Value = Convert.ToInt32(vncParams["user_id"]);
                sqlcmd.Parameters.Add("@public_key", SqlDbType.VarChar).Value = vncParams["public_key"];
                sqlcmd.Parameters.Add("@secret_key", SqlDbType.VarChar).Value = vncParams["secret_key"];
                sqlcmd.Parameters.Add("@user_email", SqlDbType.VarChar).Value = vncParams["user_email"];
                sqlcmd.Parameters.Add("@option", SqlDbType.Char).Value = vncParams["option"];
                vdsOutput = cdlBase.ExecuteDataSet(sqlcmd);
                return true;
            }
            catch (System.Exception ex)
            {
                throw ex;
            }
        }

        public Boolean CheckEmailExists(string mail)
        {
            DataSet ds = new DataSet();
            NameValueCollection vncParams = new NameValueCollection();
            vncParams.Add("user_id", "0");
            vncParams.Add("public_key", "");
            vncParams.Add("secret_key", "");
            vncParams.Add("user_email", mail);
            vncParams.Add("option", "U");
            GetUser(vncParams, ref ds);
            if(ds != null)
            {
                if(ds.Tables.Count > 0)
                {
                    if(ds.Tables[0].Rows.Count > 0)
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        public int UpdatePassword(NameValueCollection vncParams)
        {
            SqlCommand sqlcmd = new SqlCommand();
            sqlcmd.CommandText = "hq_update_password";
            sqlcmd.Parameters.Add("@user_email", SqlDbType.VarChar).Value = vncParams["user_email"];
            sqlcmd.Parameters.Add("@password", SqlDbType.VarChar).Value = vncParams["password"];
            cdlBase.ExecuteNonQuery(sqlcmd);
            return 0;
        }
    }
}
