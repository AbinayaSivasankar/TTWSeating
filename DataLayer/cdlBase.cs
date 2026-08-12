
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.Common;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace DataLayer
{
    public class cdlBase
    {
        public static SqlConnection Connection
        {
            get
            {
                DbConnection db = new DbConnection();
                return db.con;
            }
        }
        public static DataSet ExecuteDataSet(SqlCommand sqlcmd)
        {
            DataSet ds;
            try
            {
                sqlcmd.Connection = Connection;
                sqlcmd.CommandType = CommandType.StoredProcedure;
                SqlDataAdapter sqlda = new SqlDataAdapter(sqlcmd);
                ds = new DataSet();
                sqlda.Fill(ds);
                return ds;
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
                sqlcmd.Dispose();
            }
        }

        public static SqlConnection GetSqlConnection()
        {
            SqlConnection sqlcon = Connection;
            sqlcon.Open();
            return sqlcon;
        }
        public static int ExecuteNonQuery(SqlCommand sqlcmd)
        {
            try
            {
                sqlcmd.Connection = GetSqlConnection();
                sqlcmd.CommandType = CommandType.StoredProcedure;
                return sqlcmd.ExecuteNonQuery();
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
                sqlcmd.Dispose();
                sqlcmd.Connection.Close();
            }
        }

        public static int ExecuteNonQuery(SqlCommand sqlcmd, SqlConnection sqlcon, SqlTransaction sqltrx)
        {
            try
            {
                sqlcmd.Connection = sqlcon;
                sqlcmd.Transaction = sqltrx;
                sqlcmd.CommandType = CommandType.StoredProcedure;
                return sqlcmd.ExecuteNonQuery();
            }
            catch (SqlException ex)
            {
                throw ex;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
    }
}