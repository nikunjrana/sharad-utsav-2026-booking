import { BookingWizard } from "@/components/BookingWizard";

export default function Home() {
  return (
    <main className="page">
      <BookingWizard />
      <footer className="page-footer">
        Sharad Utsav 2026 · Prices and stock validated server-side
      </footer>
    </main>
  );
}
