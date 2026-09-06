export function ResultsLoading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6" aria-busy="true">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Checking programs…
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        We’re comparing your answers with the programs in our database.
      </p>
    </section>
  );
}
