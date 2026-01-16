import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PaymentCancelled() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsAnimating(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-12 pb-8 px-8 text-center">
            {/* Animated X Icon */}
            <div
              className={`mx-auto mb-6 w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center transition-all duration-700 ease-out ${
                isAnimating ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            >
              <XCircle
                className={`w-12 h-12 text-amber-500 transition-all duration-500 delay-300 ${
                  isAnimating ? "scale-100" : "scale-0"
                }`}
              />
            </div>

            {/* Title */}
            <h1
              className={`text-2xl font-bold text-foreground mb-2 transition-all duration-500 delay-200 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Pagamento Não Concluído
            </h1>

            {/* Description */}
            <p
              className={`text-muted-foreground mb-8 transition-all duration-500 delay-300 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Sem problemas! O processo de pagamento foi cancelado. Você pode tentar novamente quando quiser.
            </p>

            {/* Action Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-3 mb-6 transition-all duration-500 delay-400 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <Button
                onClick={() => navigate("/cliente/dashboard")}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              <Button
                onClick={() => navigate("/cliente/dashboard")}
                size="lg"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>

            {/* Help Section */}
            <div
              className={`p-4 rounded-lg bg-muted/50 transition-all duration-500 delay-500 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <p className="text-sm">
                  Precisa de ajuda?{" "}
                  <a
                    href="mailto:suporte@webq.com.br"
                    className="text-primary hover:underline font-medium"
                  >
                    Entre em contato conosco
                  </a>
                </p>
              </div>
            </div>

            {/* Common Issues */}
            <div
              className={`mt-6 text-left transition-all duration-500 delay-600 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <p className="text-xs text-muted-foreground/70 mb-2">Possíveis motivos:</p>
              <ul className="text-xs text-muted-foreground/70 space-y-1">
                <li>• Você fechou a janela de pagamento</li>
                <li>• Houve um problema com o método de pagamento</li>
                <li>• A sessão expirou</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
