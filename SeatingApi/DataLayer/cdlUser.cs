using System.Collections.Specialized;
using System.Data;
using System.Data.SqlClient;

namespace SeatingApi.DataLayer
{
    public class cdlUser
    {
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
    }
}
