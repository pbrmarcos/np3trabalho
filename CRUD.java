package trabalho;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class CRUD {
    Connection connect = null;

    public void ConnectionDB() {
        connect = ConectionMySQL.getConectionMySQL();
    }

    public void createVeiculo(Veiculo e) {
        // Calcula a depreciação antes de salvar no banco de dados
        e.calcularDepreciacao();

        String sql = "INSERT INTO veiculo VALUES (?, ?, ?, ?, ?, ?, ?)";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setInt(1, e.getCodigo());
            pst.setString(2, e.getMarca());
            pst.setString(3, e.getModelo());
            pst.setInt(4, e.getAnoFabricacao());
            pst.setInt(5, e.getLoja());
            pst.setFloat(6, e.getPreco());
            pst.setString(7, e.getEstado());
            pst.executeUpdate();
            System.out.println("Veículo cadastrado com sucesso!");
        } catch (SQLException ex) {
            System.out.println("Erro ao cadastrar veículo: " + ex.getMessage());
        }
    }

    public void createLoja(Loja e) {
        String sql = "INSERT INTO loja VALUES (?, ?, ?)";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setInt(1, e.getCodigo());
            pst.setString(2, e.getNome());
            pst.setString(3, e.getEndereco());
            pst.executeUpdate();
            System.out.println("Loja cadastrada com sucesso!");
        } catch (SQLException ex) {
            System.out.println("Erro ao cadastrar loja: " + ex.getMessage());
        }
    }

    public void readLoja() {
        String sql = "SELECT codigo, nome, endereco FROM loja";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            ResultSet rst = pst.executeQuery();
            while (rst.next()) {
                int codigo = rst.getInt("codigo");
                String nome = rst.getString(2);
                String endereco = rst.getString(3);
                System.out.printf("Código: %d \nNome: %s \nEndereço: %s\n", codigo, nome, endereco);
            }
        } catch (SQLException se) {
            System.out.println("Erro ao consultar a Loja: " + se.getMessage());
        }
    }

    public void readVeiculo() {
        String sql = "SELECT codigo, marca, modelo, ano, idLoja, preco, estado FROM veiculo";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            ResultSet rst = pst.executeQuery();
            while (rst.next()) {
                int codigo = rst.getInt("codigo");
                String marca = rst.getString(2);
                String modelo = rst.getString(3);
                int ano = rst.getInt(4);
                int idLoja = rst.getInt(5);
                float preco = rst.getFloat(6);
                String estado = rst.getString(7);
                System.out.printf("Código: %d\nMarca: %s\nModelo: %s\nAno: %d\nId da Loja: %d\nPreço: R$%.2f\nEstado: %s\n\n",
                        codigo, marca, modelo, ano, idLoja, preco, estado);
            }
        } catch (SQLException se) {
            System.out.println("Erro ao consultar a tabela Veículo: " + se.getMessage());
        }
    }

    public List<Veiculo> readVeiculoLoja(int idLoja) {
        String sql = "SELECT codigo, marca, modelo, ano, idLoja, preco, estado FROM veiculo WHERE idLoja = ?";
        List<Veiculo> veiculos = new ArrayList<>();

        try {
            PreparedStatement pst = connect.prepareStatement(sql);
            pst.setInt(1, idLoja);
            ResultSet rst = pst.executeQuery();

            while (rst.next()) {
                int codigo = rst.getInt("codigo");
                String marca = rst.getString("marca");
                String modelo = rst.getString("modelo");
                int ano = rst.getInt("ano");
                int idLojaRetornado = rst.getInt("idLoja");
                float preco = rst.getFloat("preco");
                String estado = rst.getString("estado");

                Veiculo veiculo = new Veiculo(codigo, marca, modelo, ano, idLojaRetornado, preco, estado);
                veiculos.add(veiculo);

                // Imprimindo as informações do veículo na tela
                System.out.printf("Código: %d\nMarca: %s\nModelo: %s\nAno: %d\nId da Loja: %d\nPreço: R$%.2f\nEstado: %s\n",
                        veiculo.getCodigo(), veiculo.getMarca(), veiculo.getModelo(),
                        veiculo.getAnoFabricacao(), veiculo.getLoja(), veiculo.getPreco(), veiculo.getEstado());
            }
        } catch (SQLException se) {
            System.out.println("Erro ao consultar os veículos da loja: " + se.getMessage());
        }
        return veiculos;
    }

    public void deleteVeiculo(int codigo) {
        String sql = "DELETE FROM veiculo WHERE codigo = ?";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setInt(1, codigo);
            int ret = pst.executeUpdate();
            if (ret > 0) {
                System.out.println("Veículo excluído com sucesso.");
            } else {
                System.out.println("Não foi possível excluir o registro do veículo.");
            }
        } catch (SQLException se) {
            System.out.println("Erro ao excluir registro de veículo: " + se.getMessage());
        }
    }

    public void deleteLoja(int codigo) {
        String sql = "DELETE FROM loja WHERE codigo = ?";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setInt(1, codigo);
            int ret = pst.executeUpdate();
            if (ret > 0) {
                System.out.println("Loja excluída com sucesso.");
            } else {
                System.out.println("Não foi possível excluir o registro da loja.");
            }
        } catch (SQLException se) {
            System.out.println("Erro ao excluir registro de loja: " + se.getMessage());
        }
    }

    public void updateVeiculo(int codigo, String marca, String modelo, int anoFabricacao, int idLoja, float preco, String estado) {
        String sql = "UPDATE veiculo SET marca = ?, modelo = ?, ano = ?, idLoja = ?, preco = ?, estado = ? WHERE codigo = ?";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setString(1, marca);
            pst.setString(2, modelo);
            pst.setInt(3, anoFabricacao);
            pst.setInt(4, idLoja);
            pst.setFloat(5, preco);
            pst.setString(6, estado);
            pst.setInt(7, codigo);

            int ret = pst.executeUpdate();
            if (ret > 0) {
                System.out.printf("Veículo atualizado: %s\n", modelo);
            } else {
                System.out.println("Não foi possível alterar o registro do veículo.");
            }
        } catch (SQLException se) {
            System.out.println("Erro ao atualizar o registro do veículo: " + se.getMessage());
        }
    }

    public void updateLoja(int codigo, String nome, String endereco) {
        String sql = "UPDATE loja SET nome = ?, endereco = ? WHERE codigo = ?";
        try {
            PreparedStatement pst;
            pst = connect.prepareStatement(sql);
            pst.setString(1, nome);
            pst.setString(2, endereco);
            pst.setInt(3, codigo);

            int ret = pst.executeUpdate();
            if (ret > 0) {
                System.out.printf("Loja atualizada: %s\n", nome);
            } else {
                System.out.println("Não foi possível alterar o registro da loja.");
            }
        } catch (SQLException se) {
            System.out.println("Erro ao atualizar o registro da loja: " + se.getMessage());
        }
    }
}
