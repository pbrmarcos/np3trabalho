package trabalho;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
 
 
public class ConectionMySQL {
	public static String status = "Não conectado";
	
	public ConectionMySQL() {
		
	}
 
	public static java.sql.Connection getConectionMySQL(){
		Connection connection = null;
		String driverName = "com.mysql.cj.jdbc.Driver";
		
		
		try {
			Class.forName(driverName);
			
		} catch (ClassNotFoundException e ) {
			e.printStackTrace();
		}
		String serverName = "localhost";
		String mydatabase = "loja";
		String url = "jdbc:mysql://" + serverName + "/" + mydatabase;
		String username = "root";
		String password = "";
		
		
		try {
			connection = DriverManager.getConnection(url, username, password);
			connection = DriverManager.getConnection("jdbc:mysql://localhost/loja","root", "" );
			status = "Banco de dado: " + mydatabase + " Conectado";
			System.out.println(status);
		
		} catch (SQLException e){
			System.out.println(status);
			e.printStackTrace();
		}
		return connection;	
	}
}
