import "../styles/globals.css";
import BrandStyles from "../components/BrandStyles";

export default function App({ Component, pageProps }) {
  return (
    <>
      <BrandStyles />
      <Component {...pageProps} />
    </>
  );
}
