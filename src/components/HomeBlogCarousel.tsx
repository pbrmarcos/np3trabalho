import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  published_at: string | null;
}

export default function HomeBlogCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    dragFree: true,
    containScroll: false,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["home-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, published_at, is_isolated_page")
        .eq("published", true)
        .or("is_isolated_page.is.null,is_isolated_page.eq.false")
        .order("published_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      return data as BlogPost[];
    },
  });

  if (isLoading || !posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30 overflow-hidden">
      {/* Header with title left and nav right */}
      <div className="container px-4 md:px-6 mb-8 md:mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Title - Left */}
          <div className="md:max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-display-md font-display text-foreground mb-2 md:mb-3 whitespace-nowrap">
              Muito conteúdo para te ajudar a{" "}
              <span className="block"><span className="text-gradient">criar e crescer</span> seu site</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Artigos, tutoriais e dicas para você dominar sua presença digital.
            </p>
          </div>

          {/* Navigation Buttons - Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Anterior"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollNext}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Próximo"
            >
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel - Extends to the right */}
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden -mr-4 md:-mr-6 lg:-mr-[calc((100vw-1280px)/2+1.5rem)]" ref={emblaRef}>
          <div className="flex gap-4 md:gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px]"
              >
                <Link to={`/blog/${post.slug}`} className="block group">
                  <article className="bg-card rounded-xl overflow-hidden h-full shadow-sm border border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {/* Image */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {post.cover_image ? (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Pencil className="h-10 w-10 text-orange-400/60" />
                        </div>
                      )}
                      {/* Badge */}
                      {post.category && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-[#1e3a5f] text-white text-xs font-medium px-3 py-1.5 rounded-md">
                            {post.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 pt-5">
                      <h3 className="font-semibold text-foreground text-base md:text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.published_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(post.published_at), "d 'de' MMM, yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              </div>
            ))}
            {/* Ver todos button */}
            <div className="flex-shrink-0 flex items-center px-4">
              <Link to="/blog" className="group">
                <Button
                  variant="outline"
                  className="rounded-full px-6 py-3 h-auto border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <span className="text-sm font-medium">Ver todos os artigos</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            {/* Spacer at the end for visual padding */}
            <div className="flex-shrink-0 w-4 md:w-8" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* View all link - Aligned left */}
      <div className="container px-4 md:px-6 mt-6 md:mt-8">
        <Button
          variant="link"
          className="text-foreground hover:text-primary font-medium text-base gap-2 p-0"
          asChild
        >
          <Link to="/blog">
            Ver todos os artigos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
