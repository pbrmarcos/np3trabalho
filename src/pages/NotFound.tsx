import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("[404] Rota não encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-8xl font-bold text-primary/20">404</span>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Página não encontrada
        </h1>
        <p className="mb-6 text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Página Inicial
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <span className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </span>
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Precisa de ajuda?{" "}
          <Link to="/ajuda" className="text-primary hover:underline">
            Acesse nossa Central de Ajuda
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
