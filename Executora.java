package trabalho;

import java.util.Scanner;

public class Executora {
    public static void main(String[] args) {
        CRUD crud = new CRUD();
        crud.ConnectionDB();
        Scanner scanner = new Scanner(System.in);
        boolean continuar = true;

        while (continuar) {
            System.out.println("\n--- Menu de Gerenciamento ---");
            System.out.println("1. Adicionar Carro");
            System.out.println("2. Adicionar Loja");
            System.out.println("3. Atualizar Carro");
            System.out.println("4. Atualizar Loja");
            System.out.println("5. Listar Carros");
            System.out.println("6. Listar Lojas");
            System.out.println("7. Listar Carros de uma Loja");
            System.out.println("8. Excluir Carro");
            System.out.println("9. Excluir Loja");
            System.out.println("0. Sair");
            System.out.print("Escolha uma opção: ");
            int opcao = scanner.nextInt();

            switch (opcao) {
                case 1:
                    System.out.print("Digite o código do carro: ");
                    int codigo = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite a marca do carro: ");
                    String marca = scanner.nextLine();

                    System.out.print("Digite o modelo do carro: ");
                    String modelo = scanner.nextLine();

                    System.out.print("Digite o ano do carro: ");
                    int ano = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o id da loja: ");
                    int idLoja = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o preço do carro: ");
                    float preco = scanner.nextFloat();
                    scanner.nextLine();

                    System.out.print("Digite o estado de conservação do carro (NOVO | SEMI_NOVO | USADO | BATIDO): ");
                    String estado = scanner.nextLine();

                    Veiculo veiculo = new Veiculo(codigo, marca, modelo, ano, idLoja, preco, estado);
                    crud.createVeiculo(veiculo);
                    break;

                case 2:
                    System.out.print("Digite o código da loja: ");
                    int codigoLoja = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o nome da loja: ");
                    String nome = scanner.nextLine();

                    System.out.print("Digite o endereço da loja: ");
                    String endereco = scanner.nextLine();

                    Loja loja = new Loja(codigoLoja, nome, endereco);
                    crud.createLoja(loja);
                    break;

                case 3:
                    System.out.print("Digite o código do veículo que deseja atualizar: ");
                    int codigoEditaVeiculo = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite a nova marca: ");
                    String novaMarca = scanner.nextLine();

                    System.out.print("Digite o novo modelo: ");
                    String novoModelo = scanner.nextLine();

                    System.out.print("Digite o novo ano: ");
                    int novoAno = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o novo id da loja: ");
                    int novoIdLoja = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o novo preço: ");
                    float novoPreco = scanner.nextFloat();
                    scanner.nextLine();

                    System.out.print("Digite o novo estado (NOVO | SEMI_NOVO | USADO | BATIDO): ");
                    String novoEstado = scanner.nextLine();

                    crud.updateVeiculo(codigoEditaVeiculo, novaMarca, novoModelo, novoAno, novoIdLoja, novoPreco, novoEstado);
                    break;

                case 4:
                    System.out.print("Digite o código da loja que deseja atualizar: ");
                    int codigoEditaLoja = scanner.nextInt();
                    scanner.nextLine();

                    System.out.print("Digite o novo nome: ");
                    String nomeNovo = scanner.nextLine();

                    System.out.print("Digite o novo endereço: ");
                    String enderecoNovo = scanner.nextLine();

                    crud.updateLoja(codigoEditaLoja, nomeNovo, enderecoNovo);
                    break;

                case 5:
                    crud.readVeiculo();
                    break;

                case 6:
                    crud.readLoja();
                    break;

                case 7:
                    System.out.print("Digite o id da loja para listar os carros: ");
                    int lojaId = scanner.nextInt();
                    crud.readVeiculoLoja(lojaId);
                    break;

                case 8:
                    System.out.print("Digite o código do veículo que deseja excluir: ");
                    int codigoDeleteVeiculo = scanner.nextInt();
                    crud.deleteVeiculo(codigoDeleteVeiculo);
                    break;

                case 9:
                    System.out.print("Digite o código da loja que deseja excluir (a loja não pode ter veículos cadastrados): ");
                    int codigoDeleteLoja = scanner.nextInt();
                    crud.deleteLoja(codigoDeleteLoja);
                    break;

                case 0:
                    continuar = false;
                    System.out.println("Saindo...");
                    break;

                default:
                    System.out.println("Opção inválida.");
            }
        }

        scanner.close();
    }
}
