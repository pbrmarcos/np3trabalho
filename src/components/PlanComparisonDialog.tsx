import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, Minus, Triangle, ChevronLeft, ChevronRight, Layout, Server, Mail, Shield, Search, Zap } from "lucide-react";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlanComparisonDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectPlan: (planId: string) => void;
  trigger?: ReactNode;
}

const comparisonCategories = [
  {
    name: "Estrutura do Site",
    icon: Layout,
    features: [
      { name: "Tipo de Site", essencial: "One-Page", profissional: "Multi até 5", performance: "Multi até 10" },
      { name: "Layout Responsivo", essencial: true, profissional: true, performance: true },
      { name: "Design Exclusivo", essencial: true, profissional: true, performance: true },
      { name: "Blog/Notícias Integrado", essencial: false, profissional: true, performance: true },
      { name: "Landing Pages Ilimitadas", essencial: false, profissional: false, performance: true },
    ],
  },
  {
    name: "Hospedagem",
    icon: Server,
    features: [
      { name: "Hospedagem Premium", essencial: false, profissional: true, performance: true },
      { name: "CDN Global", essencial: false, profissional: false, performance: true },
      { name: "Armazenamento NVMe", essencial: "10 GB", profissional: "20 GB", performance: "50 GB" },
    ],
  },
  {
    name: "E-mails",
    icon: Mail,
    features: [
      { name: "Contas de E-mail", essencial: "3", profissional: "5", performance: "Ilimitado" },
      { name: "Webmail + IMAP/SMTP", essencial: true, profissional: true, performance: true },
    ],
  },
  {
    name: "Segurança",
    icon: Shield,
    features: [
      { name: "Certificado SSL", essencial: true, profissional: true, performance: true },
      { name: "Firewall WAF", essencial: false, profissional: true, performance: true },
      { name: "Backups Automáticos", essencial: "Semanal", profissional: "Diário", performance: "Diário" },
    ],
  },
  {
    name: "SEO",
    icon: Search,
    features: [
      { name: "SEO Avançado", essencial: false, profissional: true, performance: true },
      { name: "SEO Técnico + Core Web Vitals", essencial: false, profissional: false, performance: true },
      { name: "Rich Snippets (Schema)", essencial: false, profissional: true, performance: true },
    ],
  },
  {
    name: "Integrações",
    icon: Zap,
    features: [
      { name: "Google Analytics", essencial: false, profissional: false, performance: true },
      { name: "Google Tag Manager", essencial: false, profissional: false, performance: true },
      { name: "Pixel Meta", essencial: false, profissional: "partial", performance: true },
    ],
  },
];

const plans = [
  { id: "essencial", name: "Essencial", price: 149 },
  { id: "profissional", name: "Profissional", price: 299, popular: true },
  { id: "performance", name: "Performance", price: 449 },
];

const renderFeatureValue = (value: boolean | string) => {
  if (value === true) {
    return <Check className="h-4 w-4 text-green-500 mx-auto" />;
  }
  if (value === false) {
    return <Minus className="h-4 w-4 text-muted-foreground mx-auto" />;
  }
  if (value === "partial") {
    return <Triangle className="h-3 w-3 text-amber-500 mx-auto fill-amber-500" />;
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
};

const getPlanValue = (feature: { essencial: boolean | string; profissional: boolean | string; performance: boolean | string }, planId: string) => {
  switch (planId) {
    case "essencial": return feature.essencial;
    case "profissional": return feature.profissional;
    case "performance": return feature.performance;
    default: return false;
  }
};

// Mobile version with swipe navigation
function MobileComparison({ 
  onSelectPlan, 
  onClose 
}: { 
  onSelectPlan: (planId: string) => void; 
  onClose: () => void;
}) {
  const [currentPlanIndex, setCurrentPlanIndex] = useState(1); // Start with "Profissional"
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPlanIndex < plans.length - 1) {
      setCurrentPlanIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentPlanIndex > 0) {
      setCurrentPlanIndex(prev => prev - 1);
    }
  };

  const currentPlan = plans[currentPlanIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Plan Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPlanIndex(prev => Math.max(0, prev - 1))}
          disabled={currentPlanIndex === 0}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
            {currentPlan.popular && (
              <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">R$ {currentPlan.price}/mês</p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPlanIndex(prev => Math.min(plans.length - 1, prev + 1))}
          disabled={currentPlanIndex === plans.length - 1}
          className="h-8 w-8"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Swipe Indicator */}
      <div className="flex justify-center gap-2 py-2 bg-muted/20">
        {plans.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPlanIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentPlanIndex 
                ? "w-6 bg-primary" 
                : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Features List with Swipe */}
      <ScrollArea 
        className="flex-1"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="p-4 space-y-4">
          {comparisonCategories.map((category) => (
            <div key={category.name} className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <category.icon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">{category.name}</span>
              </div>
              <div className="space-y-2 ml-6">
                {category.features.map((feature) => {
                  const value = getPlanValue(feature, currentPlan.id);
                  return (
                    <div 
                      key={feature.name} 
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">{feature.name}</span>
                      <div className="flex-shrink-0 ml-2">
                        {renderFeatureValue(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* CTA Button */}
      <div className="p-4 border-t bg-background">
        <Button
          variant="hero"
          className="w-full"
          onClick={() => {
            onSelectPlan(currentPlan.id);
            onClose();
          }}
        >
          Quero {currentPlan.name}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Deslize para ver outros planos
        </p>
      </div>
    </div>
  );
}

// Desktop version with full table
function DesktopComparison({ 
  onSelectPlan, 
  onClose 
}: { 
  onSelectPlan: (planId: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <ScrollArea className="max-h-[60vh] px-6">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-background z-10">
              <TableHead className="w-[40%]">Recurso</TableHead>
              {plans.map(plan => (
                <TableHead key={plan.id} className="text-center w-[20%]">
                  <div className="font-semibold text-foreground">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">R$ {plan.price}/mês</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonCategories.map((category) => (
              <>
                <TableRow key={category.name} className="bg-muted/30">
                  <TableCell colSpan={4} className="py-2">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <category.icon className="h-4 w-4 text-primary" />
                      {category.name}
                    </div>
                  </TableCell>
                </TableRow>
                {category.features.map((feature) => (
                  <TableRow key={feature.name}>
                    <TableCell className="text-sm text-muted-foreground py-2">
                      {feature.name}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {renderFeatureValue(feature.essencial)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {renderFeatureValue(feature.profissional)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {renderFeatureValue(feature.performance)}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="p-6 pt-4 border-t bg-muted/30">
        <div className="grid grid-cols-3 gap-4">
          {plans.map(plan => (
            <Button
              key={plan.id}
              variant={plan.id === "profissional" ? "hero" : "outline"}
              className="w-full"
              onClick={() => {
                onSelectPlan(plan.id);
                onClose();
              }}
            >
              Quero {plan.name}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

export function PlanComparisonDialog({ 
  open, 
  onOpenChange, 
  onSelectPlan,
  trigger 
}: PlanComparisonDialogProps) {
  const isMobile = useIsMobile();

  const handleClose = () => {
    onOpenChange?.(false);
  };

  // Mobile: Use Drawer for better UX
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-xl font-display">
              Comparar Planos
            </DrawerTitle>
          </DrawerHeader>
          <MobileComparison onSelectPlan={onSelectPlan} onClose={handleClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog with full table
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-display">
            Comparar Planos
          </DialogTitle>
        </DialogHeader>
        <DesktopComparison onSelectPlan={onSelectPlan} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}

export default PlanComparisonDialog;
