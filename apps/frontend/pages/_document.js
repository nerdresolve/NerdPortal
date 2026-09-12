import { Html, Head, Main, NextScript } from "next/document";
import brand from "../brand.config";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href={brand.favicon} type="image/svg+xml" />
        <meta name="theme-color" content={brand.colors.primary} />
        <meta name="description" content={brand.tagline} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
