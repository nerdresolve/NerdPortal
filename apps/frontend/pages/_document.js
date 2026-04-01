import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" href="/favicon.webp" type="image/webp" />
        <meta name="theme-color" content="#007B4E" />
        <meta name="description" content="Portal do TI - NerdResolve - Portal de Tecnologia da Informação" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
