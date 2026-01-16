import { ArrowRight, Server, Shield, Clock, Headphones, HelpCircle, CreditCard, FileUp, Rocket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const benefits = [
  {
    icon: Server,
    title: "Hospedagem Premium",
    description: "Infraestrutura otimizada com CDN e cache avançado",
  },
  {
    icon: Shield,
    title: "SSL e Segurança",
    description: "Certificado SSL gratuito, firewall e backups automáticos",
  },
  {
    icon: Clock,
    title: "Migração Sem Downtime",
    description: "Seu site continua funcionando durante todo o processo",
  },
  {
    icon: Headphones,
    title: "Suporte Contínuo",
    description: "Acompanhamento especializado após a migração",
  },
];

const steps = [
  { 
    step: "1", 
    title: "Contrate", 
    description: "Escolha seu plano de hospedagem",
    icon: CreditCard,
    tooltip: "Escolha entre nossos planos mensais ou anuais. Todos incluem migração gratuita, SSL e suporte técnico."
  },
  { 
    step: "2", 
    title: "Envie os dados", 
    description: "Preencha as informações do seu site atual",
    icon: FileUp,
    tooltip: "Você precisará informar o domínio atual, dados de acesso ao painel (se tiver) e tipo de site. Não se preocupe, orientamos em cada etapa."
  },
  { 
    step: "3", 
    title: "Migramos", 
    description: "Nossa equipe faz toda a migração",
    icon: Rocket,
    tooltip: "Nossa equipe técnica cuida de tudo: backup, transferência de arquivos, banco de dados e configuração do DNS. Zero dor de cabeça."
  },
  { 
    step: "4", 
    title: "Pronto!", 
    description: "Seu site rodando na WebQ",
    icon: PartyPopper,
    tooltip: "Seu site estará no ar com hospedagem premium, CDN, SSL e backups automáticos. Você recebe acesso ao painel de controle."
  },
];

// Curved arrow SVG component
const CurvedArrow = ({ direction, progress }: { direction: 'up' | 'down'; progress: number }) => {
  const pathLength = 80;
  const dashOffset = pathLength - (pathLength * Math.min(progress, 1));
  
  return (
    <svg 
      width="60" 
      height="40" 
      viewBox="0 0 60 40" 
      className={`absolute ${direction === 'up' ? '-top-6' : '-bottom-6'} left-1/2 -translate-x-1/2`}
      style={{ transform: `translateX(-50%) ${direction === 'down' ? 'scaleY(-1)' : ''}` }}
    >
      {/* Background path */}
      <path
        d="M 5 35 Q 30 5, 55 35"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.15"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Animated path */}
      <path
        d="M 5 35 Q 30 5, 55 35"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
      />
      {/* Arrow head */}
      <polygon
        points="55,35 48,30 50,38"
        fill="hsl(var(--primary))"
        opacity={progress > 0.8 ? 1 : 0}
        style={{ transition: 'opacity 0.3s ease-out' }}
      />
    </svg>
  );
};

export default function MigrationSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress - complete when section is in the middle of the viewport
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      
      // Start animation earlier and complete when section center reaches viewport center
      const startPoint = windowHeight * 0.9; // Start when section top is 90% down
      const endPoint = viewportCenter - (rect.height / 4); // Complete slightly before center
      
      if (rect.top < startPoint && rect.bottom > 0) {
        const progress = Math.max(0, Math.min(1, 
          (startPoint - rect.top) / (startPoint - endPoint)
        ));
        setScrollProgress(progress);
        
        // Calculate active step
        const stepProgress = progress * 4;
        setActiveStep(Math.min(3, Math.floor(stepProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left - Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Server className="h-4 w-4" />
              Migração de Sites
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-display-md font-display text-foreground">
              Traga seu site para a{" "}
              <span className="text-gradient">WebQ</span>
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-lg">
              Já tem um site? Migramos para nossa infraestrutura premium com 
              hospedagem otimizada, suporte contínuo e manutenção inclusa. 
              Você não precisa se preocupar com nada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/migracao')}
                className="font-semibold"
              >
                Solicitar Migração
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/planos')}
              >
                Ver Planos de Hospedagem
              </Button>
            </div>
            
            <button
              onClick={() => navigate('/planos#faq')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Dúvidas sobre migração? Veja o FAQ completo
            </button>
          </div>

          {/* Right - Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="p-5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom - How it works with animated steps */}
        <div ref={sectionRef} className="mt-16 pt-12 border-t border-border">
          <h3 className="text-2xl md:text-3xl font-display font-semibold text-foreground text-center mb-12">
            Como funciona a <span className="text-gradient">migração</span>?
          </h3>
          
          <TooltipProvider delayDuration={200}>
            <div className="relative max-w-4xl mx-auto">
              {/* Connection line - horizontal for desktop with gradient in dark mode */}
              <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${scrollProgress * 100}%`,
                    background: 'linear-gradient(90deg, #2563eb 0%, #2563eb 30%, #3B82F6 60%, #10B981 100%)'
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
                {steps.map((item, index) => {
                  const isActive = index <= activeStep;
                  const stepProgress = Math.max(0, Math.min(1, (scrollProgress * 4) - index));
                  
                  return (
                    <div 
                      key={index} 
                      className="relative text-center group"
                      style={{
                        opacity: 0.4 + (stepProgress * 0.6),
                        transform: `translateY(${(1 - stepProgress) * 20}px)`,
                        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
                      }}
                    >
                      {/* Curved arrows between steps - only on desktop */}
                      {index < steps.length - 1 && (
                        <div className="hidden md:block absolute top-6 -right-3 w-6">
                          <CurvedArrow 
                            direction={index % 2 === 0 ? 'up' : 'down'} 
                            progress={Math.max(0, Math.min(1, (scrollProgress * 4) - index - 0.5))}
                          />
                        </div>
                      )}

                      {/* Step circle with icon and tooltip */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="relative w-20 h-20 mx-auto mb-4 cursor-help rounded-full flex items-center justify-center transition-all duration-500 ease-out"
                            style={isActive ? {
                              backgroundColor: index === 0 ? '#2563eb' 
                                : index === 1 ? '#2563eb' 
                                : index === 2 ? '#3B82F6' 
                                : '#10B981',
                              boxShadow: index === 0 ? '0 10px 25px -5px rgba(37, 99, 235, 0.5)'
                                : index === 1 ? '0 10px 25px -5px rgba(37, 99, 235, 0.5)'
                                : index === 2 ? '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
                                : '0 10px 25px -5px rgba(16, 185, 129, 0.5)'
                            } : {
                              backgroundColor: 'hsl(var(--muted) / 0.3)',
                              border: '2px solid hsl(var(--muted))'
                            }}
                          >
                            {/* Pulse animation ring */}
                            {isActive && (
                              <div 
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ 
                                  backgroundColor: index === 0 ? '#2563eb' 
                                    : index === 1 ? '#2563eb' 
                                    : index === 2 ? '#3B82F6' 
                                    : '#10B981',
                                  animationDuration: '2s'
                                }}
                              />
                            )}

                            {/* Confetti particles for step 4 */}
                            {index === 3 && isActive && (
                              <>
                                <div className="absolute -top-2 left-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-confetti-1" />
                                <div className="absolute -top-1 right-1/4 w-1 h-1 bg-pink-400 rounded-full animate-confetti-2" />
                                <div className="absolute top-0 left-1/3 w-1 h-2 bg-emerald-300 rounded-full animate-confetti-3" />
                                <div className="absolute -top-3 right-1/3 w-1.5 h-1 bg-blue-400 rounded-full animate-confetti-4" />
                                <div className="absolute top-1 left-[15%] w-1 h-1 bg-purple-400 rounded-full animate-confetti-5" />
                                <div className="absolute -top-2 right-[15%] w-1 h-1.5 bg-orange-400 rounded-full animate-confetti-6" />
                              </>
                            )}
                            
                            {/* Icon or number */}
                            <div className="relative z-10">
                              {isActive ? (
                                <item.icon className="h-8 w-8 text-primary-foreground" />
                              ) : (
                                <span className="text-xl font-bold text-muted-foreground">{item.step}</span>
                              )}
                            </div>

                            {/* Step number badge */}
                            <div 
                              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 bg-background"
                              style={isActive ? {
                                color: index === 0 ? '#2563eb' 
                                  : index === 1 ? '#2563eb' 
                                  : index === 2 ? '#3B82F6' 
                                  : '#10B981',
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                borderColor: index === 0 ? '#2563eb' 
                                  : index === 1 ? '#2563eb' 
                                  : index === 2 ? '#3B82F6' 
                                  : '#10B981'
                              } : {
                                backgroundColor: 'hsl(var(--muted))',
                                color: 'hsl(var(--muted-foreground))'
                              }}
                            >
                              {item.step}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="max-w-xs text-center p-3"
                        >
                          <p className="text-sm">{item.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Title */}
                      <h4 
                        className={`
                          font-semibold text-lg mb-1 transition-colors duration-300
                          ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                        `}
                      >
                        {item.title}
                      </h4>

                      {/* Description */}
                      <p 
                        className={`
                          text-sm transition-colors duration-300
                          ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}
                        `}
                      >
                        {item.description}
                      </p>

                      {/* Mobile arrow connector */}
                      {index < steps.length - 1 && (
                        <div className="md:hidden flex justify-center my-4">
                          <svg 
                            width="24" 
                            height="40" 
                            viewBox="0 0 24 40" 
                            className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-30'}`}
                          >
                            <path
                              d="M12 0 L12 32 M6 26 L12 32 L18 26"
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </section>
  );
}