import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { List, ChevronRight } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface HelpTableOfContentsProps {
  content: string;
  className?: string;
}

export default function HelpTableOfContents({ content, className }: HelpTableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Parse headings from HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h2, h3");

    const tocItems: TocItem[] = [];
    headings.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      tocItems.push({
        id,
        text: heading.textContent || "",
        level: parseInt(heading.tagName[1]),
      });
    });

    setItems(tocItems);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -66%" }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 mb-4">
        <List className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm text-foreground">Neste artigo</h4>
      </div>
      <ul className="space-y-1 text-sm border-l-2 border-border">
        {items.map((item, index) => (
          <li 
            key={item.id}
            className="relative"
            style={{ 
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Active indicator bar */}
            <div 
              className={cn(
                "absolute left-[-2px] top-0 bottom-0 w-0.5 transition-all duration-300",
                activeId === item.id 
                  ? "bg-primary scale-y-100" 
                  : "bg-transparent scale-y-0"
              )}
            />
            <button
              onClick={() => scrollToHeading(item.id)}
              className={cn(
                "text-left w-full px-3 py-1.5 rounded-r transition-all duration-200 flex items-center gap-1.5 group",
                item.level === 3 && "pl-5",
                activeId === item.id
                  ? "text-primary font-medium bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <ChevronRight 
                className={cn(
                  "h-3 w-3 transition-all duration-200 shrink-0",
                  activeId === item.id 
                    ? "opacity-100 text-primary translate-x-0" 
                    : "opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0"
                )} 
              />
              <span className="line-clamp-2">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
