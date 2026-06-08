import { Helmet } from "react-helmet-async";

interface PageLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const PageLayout = ({ title, children }: PageLayoutProps) => {
  return (
    <>
      <Helmet>
        <title>{title ? `${title} | MyApp` : "MyApp"}</title>
        <meta name="description" content={`Page: ${title || "MyApp"}`} />
      </Helmet>

      <div className="page-container">{children}</div>
    </>
  );
};

export default PageLayout;
