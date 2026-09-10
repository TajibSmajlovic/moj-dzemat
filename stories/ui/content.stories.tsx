import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

import { Alert, AlertDescription } from "#app/components/ui/alert";
import { BackButton, BackLink } from "#app/components/ui/back-link";
import { Badge } from "#app/components/ui/badge";
import { Button } from "#app/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "#app/components/ui/carousel";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "#app/components/ui/table";
const meta = { title: "UI/Content" } satisfies Meta;
export default meta;
export const Feedback: StoryObj = {
  render: () => (
    <div className="max-w-xl space-y-4">
      <Alert>
        <strong className="col-start-2">Informacija</strong>
        <AlertDescription>Objava je sačuvana kao nacrt.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <strong className="col-start-2">Čuvanje nije uspjelo</strong>
        <AlertDescription>Provjerite vezu i pokušajte ponovo.</AlertDescription>
      </Alert>
      <Button onClick={() => toast.success("Primjer je sačuvan.")}>Prikaži potvrdu</Button>
    </div>
  ),
};
export const Badges: StoryObj = {
  render: () => (
    <div className="flex gap-3">
      <Badge className="bg-primary/10 text-primary">Objavljeno</Badge>
      <Badge className="bg-muted text-muted-foreground">Nacrt</Badge>
    </div>
  ),
};
export const ReturnLink: StoryObj = {
  render: () => <BackLink to="/" label="Povratak na početnu" />,
};
export const DataTable: StoryObj = {
  render: () => (
    <Table>
      <caption>Izmišljene objave za primjer</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Naslov</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Susret zajednice</TableCell>
          <TableCell>Objavljeno</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Radionica za djecu</TableCell>
          <TableCell>Nacrt</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
export const CardsCarousel: StoryObj = {
  render: () => (
    <div className="px-12">
      <Carousel className="mx-auto max-w-lg" opts={{ loop: false }}>
        <CarouselContent>
          {["Druženje", "Učenje", "Zajednica"].map((title) => (
            <CarouselItem key={title}>
              <div className="bg-card border-border rounded-xl border p-12 text-center">
                <h2 className="font-display text-2xl">{title}</h2>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

export const ReturnButton: StoryObj = { render: () => <BackButton fallback="/" /> };
