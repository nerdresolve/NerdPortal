import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" href="/favicon.webp" type="image/webp" />
        <meta name="theme-color" content="#007B4E" />
        <meta name="description" content="ITPortal - Grupo Bravante - Portal de Tecnologia da Informacao" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
