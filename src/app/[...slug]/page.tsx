type PlaceholderPageProps = {
  params: Promise<{ slug: string[] }>;
};

const PAGE_LABELS: Record<string, string> = {
  bookmarks: "Bookmarks",
  communities: "Communities",
  explore: "Explore",
  messages: "Messages",
  notifications: "Notifications",
  profile: "Profile",
  settings: "Settings",
};

export const generateStaticParams = () =>
  Object.keys(PAGE_LABELS).map((slug) => ({ slug: [slug] }));

const PlaceholderPage = async ({ params }: PlaceholderPageProps) => {
  const { slug } = await params;
  const title = PAGE_LABELS[slug[0]] ?? "Setim";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F1EA] px-6 text-[#302A25]">
      <section className="w-full max-w-lg rounded-2xl border border-[#302A25]/10 bg-[#E8DFD3]/40 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A8795D]">
          Setim
        </p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#776B60]">
          This section is ready for the next feature milestone.
        </p>
      </section>
    </main>
  );
};

export default PlaceholderPage;
