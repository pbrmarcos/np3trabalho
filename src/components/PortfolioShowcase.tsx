import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  image_url: string;
  website_url: string | null;
  display_order: number;
}

interface ColumnConfig {
  speed: number;
  direction: 'up' | 'down';
  offsetY: number;
}

interface ShowcaseConfig {
  showTitles: boolean;
  showBorders: boolean;
  columnGap: number;
  imageGap: number;
  columns: ColumnConfig[];
}

const defaultShowcaseConfig: ShowcaseConfig = {
  showTitles: true,
  showBorders: true,
  columnGap: 18,
  imageGap: 32,
  columns: [
    { speed: 20, direction: 'up', offsetY: -40 },
    { speed: 25, direction: 'down', offsetY: 60 },
    { speed: 22, direction: 'up', offsetY: -20 },
    { speed: 28, direction: 'down', offsetY: 80 },
  ],
};

export default function PortfolioShowcase() {
  const { data: items = [] } = useQuery({
    queryKey: ['portfolio-items-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  const { data: showcaseConfig } = useQuery({
    queryKey: ['portfolio-showcase-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'portfolio_showcase_config')
        .maybeSingle();
      
      if (error) throw error;
      return (data?.value as unknown as ShowcaseConfig) || defaultShowcaseConfig;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Merge saved config with defaults to ensure all fields exist
  const config: ShowcaseConfig = {
    ...defaultShowcaseConfig,
    ...showcaseConfig,
    columns: showcaseConfig?.columns || defaultShowcaseConfig.columns,
  };

  // Fallback to static image if no items
  if (items.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-50" />
        <img
          src="/images/coding-workspace.png"
          alt="Workspace de desenvolvimento"
          className="relative border border-border shadow-lg"
        />
      </div>
    );
  }

  // Distribute items across 4 columns
  const columns: PortfolioItem[][] = [[], [], [], []];
  items.forEach((item, index) => {
    columns[index % 4].push(item);
  });

  // Duplicate items for seamless loop
  const duplicatedColumns = columns.map(col => [...col, ...col, ...col]);

  return (
    <div className="relative">
      {/* Badge - Sites criados pela WebQ */}
      <div 
        className="absolute -top-2 -right-12 z-20 rotate-12 select-none opacity-0"
        style={{ 
          animation: 'badge-fade-in 0.5s ease-out forwards',
          animationDelay: '2s'
        }}
      >
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 px-4 py-1.5 rounded-full shadow-lg shadow-primary/25 border border-primary-foreground/10 backdrop-blur-sm transition-transform duration-200 hover:scale-110">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
          <span className="text-xs font-semibold text-primary-foreground tracking-wide whitespace-nowrap">
            Sites criados pela WebQ
          </span>
        </div>
      </div>

      {/* Badge - +120 projetos entregues */}
      <div 
        className="absolute -bottom-2 -left-10 z-20 -rotate-12 select-none opacity-0"
        style={{ 
          animation: 'badge-fade-in 0.5s ease-out forwards',
          animationDelay: '4s'
        }}
      >
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/90 px-4 py-1.5 rounded-full shadow-lg shadow-primary/25 border border-primary-foreground/10 backdrop-blur-sm transition-transform duration-200 hover:scale-110">
          <span className="text-sm font-bold text-primary-foreground">+120</span>
          <span className="text-sm font-medium text-primary-foreground/90 whitespace-nowrap">projetos entregues</span>
        </div>
      </div>

      <div 
        className="relative h-[650px] overflow-hidden rounded-lg"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      >
      {/* 4 columns grid */}
      <div className="grid grid-cols-4 h-full" style={{ gap: `${config.columnGap}px` }}>
        {duplicatedColumns.map((columnItems, colIndex) => {
          const columnConfig = config.columns[colIndex] || defaultShowcaseConfig.columns[colIndex];
          const isUp = columnConfig.direction === 'up';
          
          return (
            <div
              key={colIndex}
              className="relative h-full overflow-hidden"
            >
              <div
                className="flex flex-col"
                style={{ 
                  gap: `${config.imageGap}px`,
                  animation: `${isUp ? 'portfolio-scroll-up' : 'portfolio-scroll-down'} ${columnConfig.speed}s linear infinite`,
                  transform: `translateY(${columnConfig.offsetY}px)`
                }}
              >
                  {columnItems.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`relative flex-shrink-0 overflow-hidden bg-card rounded-lg shadow-sm ${
                        config.showBorders 
                          ? 'border border-border/30' 
                          : ''
                      }`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-auto object-cover object-top pointer-events-none select-none block"
                      />
                      {config.showTitles && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        </div>
                      )}
                    </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
