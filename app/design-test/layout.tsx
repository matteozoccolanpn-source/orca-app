export default function DesignTestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body > nav.fixed {
              display: none !important;
            }
            body {
              padding-bottom: 0 !important;
            }
          `,
        }}
      />
      {children}
    </>
  );
}
