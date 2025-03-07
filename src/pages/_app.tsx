import "../styles/globals.css";

interface MyAppProps {
  Component: React.ComponentType<any>;
  pageProps: Record<string, unknown>;
}

const MyApp: React.FC<MyAppProps> = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

export default MyApp;
