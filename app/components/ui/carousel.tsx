import * as React from "react";

import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "#app/components/ui/button";
import { cn } from "#app/lib/cn";

/**
 * shadcn/ui-style Carousel built on top of embla-carousel. Exposed as
 * composable primitives so a caller can mix and match `<CarouselPrevious>`,
 * `<CarouselNext>`, and custom controls. Uses `useEffect` because embla's
 * instance events fire outside React's render cycle; no other hook can
 * observe them without the subscribe/unsubscribe dance.
 */

type CarouselApi = EmblaCarouselType;
type CarouselOptions = EmblaOptionsType;
type CarouselPlugin = EmblaPluginType[];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextValue = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi | undefined;
  scrollPrev: VoidFunction;
  scrollNext: VoidFunction;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  orientation: "horizontal" | "vertical";
  opts?: CarouselOptions;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel(): CarouselContextValue {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

type CarouselRootProps = React.HTMLAttributes<HTMLDivElement> & CarouselProps;

const Carousel = React.forwardRef<HTMLDivElement, CarouselRootProps>(function Carousel(
  { orientation = "horizontal", opts, setApi, plugins, className, children, ...props },
  ref,
) {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" },
    plugins,
  );
  const [, setSelectionVersion] = React.useState(0);
  const canScrollPrev = api?.canScrollPrev() ?? false;
  const canScrollNext = api?.canScrollNext() ?? false;

  const handleSelect = React.useCallback(() => {
    setSelectionVersion((version) => version + 1);
  }, []);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    api.on("reInit", handleSelect);
    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api, handleSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        orientation,
        opts,
      }}
    >
      <div
        ref={ref}
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CarouselContent({ className, ...props }, ref) {
    const { carouselRef, orientation } = useCarousel();
    return (
      <div ref={carouselRef} className="overflow-hidden rounded-2xl">
        <div
          ref={ref}
          className={cn(
            "flex",
            orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CarouselItem({ className, ...props }, ref) {
    const { orientation } = useCarousel();
    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          orientation === "horizontal" ? "pl-4" : "pt-4",
          className,
        )}
        {...props}
      />
    );
  },
);

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  function CarouselPrevious({ className, variant = "outline", size = "icon", ...props }, ref) {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "top-1/2 -left-4 -translate-y-1/2 sm:-left-12"
            : "-top-12 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Prethodni slajd</span>
      </Button>
    );
  },
);

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  function CarouselNext({ className, variant = "outline", size = "icon", ...props }, ref) {
    const { orientation, scrollNext, canScrollNext } = useCarousel();
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "top-1/2 -right-4 -translate-y-1/2 sm:-right-12"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Sljedeći slajd</span>
      </Button>
    );
  },
);

export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious };
